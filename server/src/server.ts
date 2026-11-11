// Serveur cloud ISNO (cœur auto-hébergeable). Briques : 1a enrôlement, 1b auth, 1c relais, 4 app.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { init, getAccount, setAccountPass, countDevices, listDevices, findDevice, addDevice, addPairing, takePairing, type Pairing } from "./store.js";
import { issueDeviceCert } from "./ca.js";
import { hashPass, verifyPass } from "./auth.js";
import { makeSession, readSession } from "./session.js";
import { publishCmd, coversOf, startRelay, type Action } from "./mqtt.js";
import { loginPage, devicesPage } from "./app.js";

const PORT = Number(process.env.PORT ?? 8080);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "";
const BROKER_URL = process.env.BROKER_URL_PUBLIC ?? "mqtts://mqtt.example.com:8883";

const json = (res: http.ServerResponse, code: number, body: unknown): void => {
  res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body));
};
const htmlOut = (res: http.ServerResponse, code: number, body: string): void => {
  res.writeHead(code, { "content-type": "text/html; charset=utf-8" }); res.end(body);
};
async function readRaw(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
function parseBody(raw: string, ctype: string | undefined): Record<string, string> {
  if (!raw) return {};
  const r: Record<string, string> = {};
  if (ctype && ctype.includes("application/json")) {
    const o = JSON.parse(raw) as Record<string, unknown>;
    for (const k of Object.keys(o)) if (typeof o[k] === "string") r[k] = o[k] as string;
    return r;
  }
  for (const kv of raw.split("&")) {
    const i = kv.indexOf("=");
    if (i < 0) continue;
    r[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, " "));
  }
  return r;
}
const code6 = (): string => randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
const account = (req: http.IncomingMessage): string | null => readSession(req.headers.cookie);

const server = http.createServer((req, res) => {
  void (async () => {
    try {
      const path = new URL(req.url ?? "/", "http://x").pathname;
      const m = req.method ?? "GET";
      if (m === "GET" && path === "/health") return json(res, 200, { ok: true });

      // ── 1a Enrôlement ──
      if (m === "POST" && path === "/api/device/new") {
        if (!ADMIN_TOKEN || req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`)
          return json(res, 401, { error: "unauthorized" });
        const b = parseBody(await readRaw(req), req.headers["content-type"]);
        const accountId = b.accountId ?? "admin";
        const deviceId = b.deviceId ?? "opf-" + randomBytes(5).toString("hex");
        const acc = await getAccount(accountId);
        if (!acc) return json(res, 404, { error: "account inconnu" });
        if ((await countDevices(accountId)) >= acc.deviceCap)
          return json(res, 403, { error: "plafond atteint", cap: acc.deviceCap });
        const p: Pairing = { code: code6(), accountId, deviceId, name: b.name ?? deviceId };
        await addPairing(p);
        return json(res, 200, { code: p.code, deviceId });
      }
      if (m === "POST" && path === "/api/enroll") {
        const b = parseBody(await readRaw(req), req.headers["content-type"]);
        const p = await takePairing(b.code ?? "");
        if (!p) return json(res, 400, { error: "code invalide ou déjà utilisé" });
        const bundle = issueDeviceCert(p.deviceId);
        await addDevice({ deviceId: p.deviceId, accountId: p.accountId, name: p.name, firmware: b.firmware ?? "openprofalux" });
        return json(res, 200, { device_id: p.deviceId, broker_url: BROKER_URL, ...bundle });
      }

      // ── 1b Auth ──
      if (m === "POST" && path === "/login") {
        const b = parseBody(await readRaw(req), req.headers["content-type"]);
        const a = await getAccount(b.user ?? "");
        if (!a || !a.passHash || !verifyPass(b.pass ?? "", a.passHash)) {
          res.writeHead(401, { "content-type": "text/html; charset=utf-8" });
          return res.end(loginPage());
        }
        res.writeHead(302, {
          "set-cookie": `sid=${encodeURIComponent(makeSession(a.id))}; HttpOnly; Path=/; SameSite=Lax`,
          location: "/",
        });
        return res.end();
      }
      if (m === "POST" && path === "/logout") {
        res.writeHead(200, { "set-cookie": "sid=; HttpOnly; Path=/; Max-Age=0" });
        return res.end();
      }

      // ── 4 App (SSR) ──
      if (m === "GET" && path === "/") {
        const acc = account(req);
        if (!acc) return htmlOut(res, 200, loginPage());
        const list = (await listDevices(acc)).map((d) => ({ ...d, covers: coversOf(d.deviceId) }));
        return htmlOut(res, 200, devicesPage(acc, list));
      }

      // ── 1c Relais : liste + commande (propriété vérifiée) ──
      if (m === "GET" && path === "/api/devices") {
        const acc = account(req);
        if (!acc) return json(res, 401, { error: "auth" });
        return json(res, 200, { devices: await listDevices(acc) });
      }
      if (m === "POST" && path === "/api/cmd") {
        const acc = account(req);
        if (!acc) return json(res, 401, { error: "auth" });
        const b = parseBody(await readRaw(req), req.headers["content-type"]);
        const deviceId = b.device_id ?? "", action = b.action ?? "", slug = b.slug ?? "volet";
        const dev = await findDevice(deviceId, acc);
        if (!dev) return json(res, 403, { error: "device non possédé" });
        if (action !== "UP" && action !== "STOP" && action !== "DOWN")
          return json(res, 400, { error: "action invalide" });
        publishCmd(deviceId, slug, action as Action);
        return json(res, 200, { ok: true });
      }

      json(res, 404, { error: "not found" });
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : "err" });
    }
  })();
});

(async () => {
  await init();
  if (ADMIN_PASS) {
    const a = await getAccount("admin");
    if (a && !a.passHash) await setAccountPass("admin", hashPass(ADMIN_PASS));
  }
  startRelay();
  server.listen(PORT, () => console.log(`[isno-cloud] serveur sur :${PORT}`));
})().catch((e: unknown) => { console.error("fatal:", e); process.exit(1); });
