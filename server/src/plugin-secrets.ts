// Secrets crees par les plugins eux-memes (ex. le secret partage de la connexion externe) : tires au
// hasard a la premiere demande, gardes dans un fichier a part de la config (droits 600), dans le
// dossier des donnees. Jamais regeneres : desactiver puis reactiver un plugin garde le meme secret,
// sinon le site externe qui l'a recu cesserait de fonctionner.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dataDir } from "./config.js";

const FILE = "plugin-secrets.json";
const SECRET_BYTES = 32;

function readAll(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  const out: Record<string, string> = {};
  if (raw !== null && typeof raw === "object") for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v) out[k] = v;
  return out;
}

/** Le secret du plugin `id` : celui deja garde, sinon un nouveau, ecrit avant d'etre rendu. */
export function ensurePluginSecret(id: string, dir: string = dataDir()): string {
  const path = join(dir, FILE);
  const all = readAll(path);
  const existing = all[id];
  if (existing) return existing;
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify({ ...all, [id]: secret }, null, 2), { mode: 0o600 });
  chmodSync(path, 0o600);
  return secret;
}

/** Le secret deja garde pour `id`, sans en creer (null si le plugin n'a jamais ete active). */
export function storedPluginSecret(id: string, dir: string = dataDir()): string | null {
  return readAll(join(dir, FILE))[id] ?? null;
}
