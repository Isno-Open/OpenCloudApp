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
import { loadPluginCatalog, PLUGIN_ACTION } from "./plugin-catalog.js";
import { pluginStatus, startPluginJob } from "./plugin-install.js";

const PORT = Number(process.env.PORT ?? 8090);
const CATALOG = process.env.CATALOG_PATH ?? new URL("../modules.json", import.meta.url).pathname;
const TOKEN_FILE = process.env.SUPERVISOR_TOKEN_FILE ?? "/control/token";
const NETWORK = process.env.STACK_NETWORK ?? "";
if (!NETWORK) throw new Error("STACK_NETWORK requis (reseau de la pile auquel rattacher les modules)");

const catalog = loadCatalog(CATALOG);
const plugins = loadPluginCatalog(process.env.PLUGIN_CATALOG_PATH ?? new URL("../plugins.json", import.meta.url).pathname);

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
    if (req.method === "GET" && url.pathname === "/plugins")
      return send(res, 200, Object.keys(plugins).map((id) => pluginStatus(plugins, id)));
    const pm = /^\/plugins\/([a-z0-9-]+)(\/install|\/remove)?$/.exec(url.pathname);
    if (pm && pm[1] && plugins[pm[1]]) {
      const id = pm[1];
      if (req.method === "POST" && pm[2] === "/install") startPluginJob(plugins, id, PLUGIN_ACTION.install);
      else if (req.method === "POST" && pm[2] === "/remove") startPluginJob(plugins, id, PLUGIN_ACTION.remove);
      else if (!(req.method === "GET" && !pm[2])) return send(res, 405, { error: "method" });
      return send(res, 200, pluginStatus(plugins, id));
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
}).listen(PORT, "0.0.0.0", () => console.log(`[supervisor] pret sur :${PORT}, modules : ${Object.keys(catalog).join(", ")}, plugins : ${Object.keys(plugins).join(", ") || "aucun"}, reseau ${NETWORK}`));
