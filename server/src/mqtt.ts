// Relais : le backend publie les commandes au broker avec son cert "relay" (mTLS). Le broker
// donne à l'identité "relay" un accès complet (ACL) ; la propriété device<->compte est vérifiée
// AVANT, au niveau applicatif. Le navigateur ne parle jamais au broker.
import mqtt, { type MqttClient } from "mqtt";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const CERTS_DIR = process.env.CERTS_DIR ?? "/certs";
const BROKER = process.env.BROKER_URL ?? "mqtts://127.0.0.1:8883";
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
  return client;
}
const ACTIONS = { UP: "OPEN", STOP: "STOP", DOWN: "CLOSE" } as const;
export type Action = keyof typeof ACTIONS;
export function publishCmd(deviceId: string, slug: string, action: Action): void {
  get().publish(`openprofalux/${deviceId}/cover/${slug}/set`, ACTIONS[action], { qos: 1 });
}
