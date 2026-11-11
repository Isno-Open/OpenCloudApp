// Relais + ingestion d'état. Le backend parle au broker avec son cert "relay" (mTLS) ; le broker
// donne à "relay" un accès complet (ACL), la propriété device<->compte est vérifiée AVANT au niveau
// applicatif. Le navigateur ne parle jamais au broker.
// Ingestion : on s'abonne à l'état des covers publié par les devices (retained) pour afficher, PAR
// TYPE, ce que le device DÉCLARE (type/positional/labels viennent de profiles.json côté firmware ;
// le cloud ne recode rien, il reflète).
import mqtt, { type MqttClient } from "mqtt";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const CERTS_DIR = process.env.CERTS_DIR ?? "/certs";
const BROKER = process.env.BROKER_URL ?? "mqtts://127.0.0.1:8883";

export const ACTIONS = { UP: "OPEN", STOP: "STOP", DOWN: "CLOSE" } as const;
export type Action = keyof typeof ACTIONS;
export const cmdTopic = (deviceId: string, slug: string): string => `openprofalux/${deviceId}/cover/${slug}/set`;
export const cmdPayload = (action: Action): string => ACTIONS[action];

/** Un cover tel que le device le déclare. Labels/positional viennent de ses attrs (profiles.json). */
export type Cover = {
  slug: string; type: string; positional: boolean;
  up: string; stop: string; down: string;
  state: string | null; position: number | null;
};
const newCover = (slug: string): Cover => ({ slug, type: "", positional: false, up: "▲", stop: "■", down: "▼", state: null, position: null });

/** Applique un message d'état de cover à la carte. Fonction pure (testable sans broker). */
export function applyCoverMessage(covers: Map<string, Map<string, Cover>>, topic: string, payload: string): void {
  const m = /^openprofalux\/([^/]+)\/cover\/([^/]+)\/(attrs|state|position)$/.exec(topic);
  if (!m) return;
  const dev = m[1]!, slug = m[2]!, leaf = m[3]!;
  let byDev = covers.get(dev);
  if (!byDev) { byDev = new Map(); covers.set(dev, byDev); }
  let c = byDev.get(slug);
  if (!c) { c = newCover(slug); byDev.set(slug, c); }
  if (leaf === "attrs") {
    try {
      const a = JSON.parse(payload) as Record<string, unknown>;
      if (typeof a["type"] === "string") c.type = a["type"];
      if (typeof a["positional"] === "boolean") c.positional = a["positional"];
      if (typeof a["up"] === "string") c.up = a["up"];
      if (typeof a["stop"] === "string") c.stop = a["stop"];
      if (typeof a["down"] === "string") c.down = a["down"];
    } catch { /* payload non-JSON : ignoré */ }
  } else if (leaf === "state") {
    c.state = payload;
  } else {
    const n = Number(payload);
    if (Number.isFinite(n)) c.position = n;
  }
}

const covers = new Map<string, Map<string, Cover>>();
export const coversOf = (deviceId: string): Cover[] => [...(covers.get(deviceId)?.values() ?? [])];

let client: MqttClient | null = null;
function get(): MqttClient {
  if (client) return client;
  client = mqtt.connect(BROKER, {
    ca: readFileSync(join(CERTS_DIR, "ca.crt")),
    cert: readFileSync(join(CERTS_DIR, "relay.crt")),
    key: readFileSync(join(CERTS_DIR, "relay.key")),
    rejectUnauthorized: true,
  });
  client.on("error", (e: Error) => console.error("[mqtt relay]", e.message));
  client.on("message", (t: string, p: Buffer) => applyCoverMessage(covers, t, p.toString("utf8")));
  return client;
}
/** Démarre le relais et l'abonnement à l'état des covers (retained => peuplé au branchement). */
export function startRelay(): void {
  const c = get();
  const sub = (): void => { for (const leaf of ["attrs", "state", "position"]) c.subscribe(`openprofalux/+/cover/+/${leaf}`, { qos: 0 }); };
  c.on("connect", sub);
  if (c.connected) sub();
}
export function publishCmd(deviceId: string, slug: string, action: Action): void {
  get().publish(cmdTopic(deviceId, slug), cmdPayload(action), { qos: 1 });
}
