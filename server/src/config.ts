// Configuration du portail, UN seul fichier (regle « une config, un seul fichier »). Ecrit par l'onboarding
// web (/setup) ou seme depuis l'environnement pour le deploiement automatise ISNO. Lu par requete : aucune
// valeur de deploiement n'est figee a l'import d'un module. Ce module ne charge AUCUN store (il sert aussi
// a decider le mode setup sans base), donc il ne depend que de fs + crypto.
import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";

// Choix de base : enumere, le code s'y refere par son nom.
export const DB_KIND = { sqlite: "sqlite", mongoBundled: "mongo-bundled", mongoExternal: "mongo-external" } as const;
export type DbKind = (typeof DB_KIND)[keyof typeof DB_KIND];

export type DbConfig = { kind: DbKind; mongoUrl?: string; sqlitePath?: string };
export type PortalConfig = {
  configured: true;
  db: DbConfig;
  publicAppUrl: string;    // URL publique du portail (sert au QR d'enrolement)
  brokerPublicUrl: string; // URL publique du broker MQTT (donnee a la box enrolee)
  adminPassHash: string | null;
};

const CONFIG_PATH = process.env.PORTAL_CONFIG ?? "/data/portal.config.json";
const TOKEN_PATH = process.env.PORTAL_SETUP_TOKEN_PATH ?? "/data/setup-token.txt";

let cache: PortalConfig | null | undefined;   // undefined = pas encore lu ; null = non configure

export function loadConfig(): PortalConfig | null {
  if (cache !== undefined) return cache;
  cache = seedFromEnv();                        // tente un semis env au premier chargement
  if (cache) return cache;
  try { if (existsSync(CONFIG_PATH)) cache = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as PortalConfig; }
  catch { cache = null; }
  if (cache === undefined) cache = null;
  return cache;
}
export function isConfigured(): boolean { return loadConfig() !== null; }

export function saveConfig(c: PortalConfig): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
  chmodSync(CONFIG_PATH, 0o600);
  cache = c;
}

// Pose les variables d'environnement que les implementations de store lisent a leur import. A appeler
// AVANT store.init() (dont l'import des impls est dynamique), jamais les URLs publiques (lues par requete).
export function applyStoreEnv(c: PortalConfig): void {
  if (c.db.kind === DB_KIND.sqlite) {
    delete process.env.MONGO_URL;
    if (c.db.sqlitePath) process.env.DB_PATH = c.db.sqlitePath;
  } else if (c.db.mongoUrl) {
    process.env.MONGO_URL = c.db.mongoUrl;
  }
}

// Deploiement automatise (instance ISNO) : si aucun fichier mais PORTAL_SEED=1, construit la config depuis
// l'environnement et l'ecrit, pour que l'instance ne passe PAS en mode setup. Sinon null (-> onboarding web).
function seedFromEnv(): PortalConfig | null {
  if (process.env.PORTAL_SEED !== "1" || existsSync(CONFIG_PATH)) return null;
  const mongo = process.env.MONGO_URL;
  const c: PortalConfig = {
    configured: true,
    db: mongo ? { kind: DB_KIND.mongoExternal, mongoUrl: mongo } : { kind: DB_KIND.sqlite, sqlitePath: process.env.DB_PATH },
    publicAppUrl: process.env.PUBLIC_APP_URL ?? "https://app.isno.fr",
    brokerPublicUrl: process.env.BROKER_URL_PUBLIC ?? "mqtts://mqtt.isno.fr:8883",
    adminPassHash: null,
  };
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
  try { chmodSync(CONFIG_PATH, 0o600); } catch { /* best effort */ }
  return c;
}

// Jeton de setup : secret imprime dans les logs au demarrage quand l'instance n'est pas configuree.
// Persiste (fichier) pour survivre a un redemarrage du conteneur pendant l'onboarding.
export function ensureSetupToken(): string {
  try { if (existsSync(TOKEN_PATH)) return readFileSync(TOKEN_PATH, "utf8").trim(); } catch { /* regenere */ }
  const tok = randomBytes(18).toString("base64url");
  try { mkdirSync(dirname(TOKEN_PATH), { recursive: true }); writeFileSync(TOKEN_PATH, tok, { mode: 0o600 }); } catch { /* ephemere */ }
  return tok;
}
export function verifySetupToken(given: string): boolean {
  const want = ensureSetupToken();
  const a = Buffer.from(given); const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
