// Serveur cloud ISNO — brique 1a : ENRÔLEMENT. Le boîtier envoie son code de pairing, reçoit
// son bundle (CA + cert + clé) signé par la CA du broker, et l'URL du broker. Rien à coller.
import http from "node:http";
import { randomBytes } from "node:crypto";
import { loadDb, saveDb, type Pairing } from "./store.js";
import { issueDeviceCert } from "./ca.js";

const PORT = Number(process.env.PORT ?? 8080);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
const BROKER_URL = process.env.BROKER_URL_PUBLIC ?? "mqtts://mqtt.example.com:8883";

function json(res: http.ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}
const str = (o: Record<string, unknown>, k: string): string | undefined =>
  typeof o[k] === "string" ? (o[k] as string) : undefined;
const code6 = (): string => randomBytes(4).toString("hex").slice(0, 6).toUpperCase();

const server = http.createServer((req, res) => {
  void (async () => {
    try {
      const path = new URL(req.url ?? "/", "http://x").pathname;
      if (req.method === "GET" && path === "/health") return json(res, 200, { ok: true });

      // Crée un code de pairing (admin) : lie un device_id à un compte, usage unique, sous le plafond.
      if (req.method === "POST" && path === "/api/device/new") {
        if (!ADMIN_TOKEN || req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`)
          return json(res, 401, { error: "unauthorized" });
        const b = await readBody(req);
        const accountId = str(b, "accountId") ?? "admin";
        const deviceId = str(b, "deviceId") ?? "opf-" + randomBytes(5).toString("hex");
        const db = loadDb();
        const acc = db.accounts.find((a) => a.id === accountId);
        if (!acc) return json(res, 404, { error: "account inconnu" });
        if (db.devices.filter((d) => d.accountId === accountId).length >= acc.deviceCap)
          return json(res, 403, { error: "plafond atteint", cap: acc.deviceCap });
        const p: Pairing = { code: code6(), accountId, deviceId, name: str(b, "name") ?? deviceId, used: false };
        db.pairings.push(p);
        saveDb(db);
        return json(res, 200, { code: p.code, deviceId });
      }

      // Enrôlement : code de pairing -> bundle (CA+cert+clé) + URL broker.
      if (req.method === "POST" && path === "/api/enroll") {
        const b = await readBody(req);
        const db = loadDb();
        const p = db.pairings.find((x) => x.code === (str(b, "code") ?? "") && !x.used);
        if (!p) return json(res, 400, { error: "code invalide ou déjà utilisé" });
        const bundle = issueDeviceCert(p.deviceId);
        p.used = true;
        db.devices.push({ deviceId: p.deviceId, accountId: p.accountId, name: p.name, firmware: str(b, "firmware") ?? "openprofalux" });
        saveDb(db);
        return json(res, 200, { device_id: p.deviceId, broker_url: BROKER_URL, ...bundle });
      }

      json(res, 404, { error: "not found" });
    } catch (e) {
      json(res, 500, { error: e instanceof Error ? e.message : "err" });
    }
  })();
});
server.listen(PORT, () => console.log(`[isno-cloud] enrolement sur :${PORT}`));
