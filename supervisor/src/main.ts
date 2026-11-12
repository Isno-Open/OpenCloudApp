// Superviseur isno-cloud : installe a la demande les modules du catalogue (facon Supervisor de Home
// Assistant). Jamais expose a Internet : il ecoute sur le reseau interne de la pile et ne parle a Docker
// qu'a travers le filtre socket-proxy. Les appels exigent un secret partage, genere ici au premier
// demarrage et ecrit dans le volume de controle (que l'app monte en lecture seule).
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { loadCatalog } from "./catalog.js";
import { moduleStatus, startInstall, restartModule } from "./install.js";
import { loadPluginCatalog, mergeCatalogs, readLocalCatalog, isSourceUrl, PLUGIN_ACTION, ISNO_SOURCE, LOCAL_SOURCE, type MergedCatalog, type SourceError } from "./plugin-catalog.js";
import { pluginStatus, startPluginJob } from "./plugin-install.js";

const PORT = Number(process.env.PORT ?? 8090);
const CATALOG = process.env.CATALOG_PATH ?? new URL("../modules.json", import.meta.url).pathname;
const TOKEN_FILE = process.env.SUPERVISOR_TOKEN_FILE ?? "/control/token";
const NETWORK = process.env.STACK_NETWORK ?? "";
if (!NETWORK) throw new Error("STACK_NETWORK requis (reseau de la pile auquel rattacher les modules)");

const catalog = loadCatalog(CATALOG);
const isnoPlugins = loadPluginCatalog(process.env.PLUGIN_CATALOG_PATH ?? new URL("../plugins.json", import.meta.url).pathname);
// Catalogue de CETTE instance (facultatif) : fichier monte par l'administrateur de la machine, pour un
// plugin qui ne regarde qu'elle (ex. plugin prive, image construite sur place). RELU a chaque demande.
const LOCAL_CATALOG = process.env.PLUGIN_LOCAL_CATALOG_PATH ?? "";
// Sources ajoutees par l'operateur : relues a chaque ouverture de la page Plugins, gardees entre-temps.
let extraSources: { source: string; raw: unknown }[] = [];
let sourceErrors: SourceError[] = [];
/** Catalogue courant : ISNO, puis local (relu ici), puis sources ajoutees. Un identifiant deja pris
 *  n'est jamais remplace. */
function currentCatalog(): MergedCatalog {
  const local = readLocalCatalog(LOCAL_CATALOG);
  const m = mergeCatalogs(isnoPlugins, [...local.raws, ...extraSources]);
  return { ...m, errors: [...local.errors, ...sourceErrors, ...m.errors] };
}

async function readBodyJson(req: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of req) { raw += chunk; if (raw.length > 64_000) throw new Error("requete trop grande"); }
  return raw ? JSON.parse(raw) : {};
}
/** Relit les sources ajoutees (https, 8 s, 256 Ko chacune) et refait le catalogue. */
async function refreshSources(urls: string[]): Promise<void> {
  const extra: { source: string; raw: unknown }[] = [];
  const errors: SourceError[] = [];
  for (const url of urls.slice(0, 20)) {
    if (!isSourceUrl(url)) { errors.push({ source: url, error: "adresse https requise", unreadable: true }); continue; }
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "error" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      if (text.length > 256_000) throw new Error("catalogue trop grand");
      extra.push({ source: url, raw: JSON.parse(text) });
    } catch (e) { errors.push({ source: url, error: e instanceof Error ? e.message : String(e), unreadable: true }); }
  }
  extraSources = extra;
  sourceErrors = errors;
}
// official : la DECISION « catalogue ISNO » est prise ici, l'app ne compare pas le nom de la source
const describe = (merged: MergedCatalog, id: string) => ({ ...pluginStatus(merged.plugins, id), source: merged.sourceOf[id], official: merged.sourceOf[id] === ISNO_SOURCE, local: merged.sourceOf[id] === LOCAL_SOURCE });
const pluginList = (merged: MergedCatalog) => Object.keys(merged.plugins).map((id) => describe(merged, id));

function ensureToken(): string {
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, "utf8").trim();
  const t = randomBytes(32).toString("hex");
  mkdirSync(dirname(TOKEN_FILE), { recursive: true });
  writeFileSync(TOKEN_FILE, t, { mode: 0o644 });   // lisible par l'app (volume partage, monte en lecture seule)
  return t;
}
const TOKEN = ensureToken();
const authorized = (req: IncomingMessage): boolean => {
  const got = Buffer.from(String(req.headers.authorization ?? "").replace(/^Bearer /, ""));
  const want = Buffer.from(TOKEN);
  return got.length === want.length && timingSafeEqual(got, want);
};
const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/health") return send(res, 200, { ok: true });
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
    if (req.method === "GET" && url.pathname === "/modules")
      return send(res, 200, await Promise.all(Object.keys(catalog).map((id) => moduleStatus(catalog, id))));
    const merged = currentCatalog();
    if (req.method === "GET" && url.pathname === "/plugins") return send(res, 200, { plugins: pluginList(merged), errors: merged.errors });
    if (req.method === "POST" && url.pathname === "/plugins/sources") {
      const b = await readBodyJson(req);
      const urls = b && typeof b === "object" && Array.isArray((b as { urls?: unknown }).urls) ? (b as { urls: unknown[] }).urls.map(String) : [];
      await refreshSources(urls);
      const fresh = currentCatalog();
      return send(res, 200, { plugins: pluginList(fresh), errors: fresh.errors });
    }
    const pm = /^\/plugins\/([a-z0-9-]+)(\/install|\/remove)?$/.exec(url.pathname);
    if (pm && pm[1] && merged.plugins[pm[1]]) {
      const id = pm[1];
      if (req.method === "POST" && pm[2] === "/install") startPluginJob(merged.plugins, id, PLUGIN_ACTION.install);
      else if (req.method === "POST" && pm[2] === "/remove") startPluginJob(merged.plugins, id, PLUGIN_ACTION.remove);
      else if (!(req.method === "GET" && !pm[2])) return send(res, 405, { error: "method" });
      return send(res, 200, describe(merged, id));
    }
    const m = /^\/modules\/([a-z0-9_.-]+)(\/install|\/restart)?$/.exec(url.pathname);
    if (m && m[1] && catalog[m[1]]) {
      const id = m[1];
      if (req.method === "POST" && m[2] === "/install") startInstall(catalog, id, NETWORK, process.env);
      else if (req.method === "POST" && m[2] === "/restart") await restartModule(catalog, id);
      else if (!(req.method === "GET" && !m[2])) return send(res, 405, { error: "method" });
      return send(res, 200, await moduleStatus(catalog, id));
    }
    return send(res, 404, { error: "unknown module" });
  } catch (e) {
    return send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(PORT, "0.0.0.0", () => console.log(`[supervisor] pret sur :${PORT}, modules : ${Object.keys(catalog).join(", ")}, plugins ISNO : ${Object.keys(isnoPlugins).join(", ") || "aucun"}, locaux : ${((c) => Object.keys(c.plugins).filter((id) => c.sourceOf[id] === LOCAL_SOURCE))(currentCatalog()).join(", ") || "aucun"}, reseau ${NETWORK}`));
