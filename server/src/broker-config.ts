// Configuration du broker (mosquitto.conf + acl), ecrite par le serveur dans le volume que le broker
// monte en lecture seule. La source est le dossier config/ du depot (un seul exemplaire), copie dans
// l'image du serveur : on ne la reecrit pas ici.
import { mkdirSync, copyFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

export const BROKER_CONFIG_DIR = process.env.BROKER_CONFIG_DIR ?? "/broker-config";
const TEMPLATE_DIR = process.env.BROKER_CONFIG_TEMPLATE ?? "/app/broker-config-template";
const FILES = ["mosquitto.conf", "acl"] as const;

export function writeBrokerConfig(): void {
  mkdirSync(BROKER_CONFIG_DIR, { recursive: true });
  for (const f of FILES) {
    copyFileSync(join(TEMPLATE_DIR, f), join(BROKER_CONFIG_DIR, f));
    chmodSync(join(BROKER_CONFIG_DIR, f), 0o644);
  }
}
