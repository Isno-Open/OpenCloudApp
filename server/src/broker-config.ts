// Configuration du broker (mosquitto.conf + acl), ecrite par le serveur dans le volume que le broker
// monte en lecture seule. mosquitto.conf vient du dossier config/ du depot (un seul exemplaire), copie
// dans l'image du serveur. L'ACL, elle, se DEDUIT des familles de boitiers installees : une racine de
// topics par famille (docs/FAMILLES.md), le relais y a acces complet, chaque boitier seulement a la
// sienne (`<racine>/<son CN>/#`).
import { mkdirSync, copyFileSync, chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TOPIC_ROOT_RE } from "./device-families.js";

export const BROKER_CONFIG_DIR = process.env.BROKER_CONFIG_DIR ?? "/broker-config";
const TEMPLATE_DIR = process.env.BROKER_CONFIG_TEMPLATE ?? "/app/broker-config-template";

/** L'ACL du broker pour ces racines de familles. Fonction pure (testable). Une racine invalide est
 *  refusee : elle finirait telle quelle dans un fichier que le broker interprete. */
export function brokerAcl(roots: readonly string[]): string {
  const sorted = [...new Set(roots)].sort();
  for (const r of sorted) if (!TOPIC_ROOT_RE.test(r)) throw new Error(`racine de topics invalide « ${r} »`);
  return [
    "# Engendre par le portail depuis les familles de boitiers installees (broker-config.ts) : ne pas editer.",
    "# Relais backend : acces complet (propriete boitier<->compte verifiee cote app).",
    "user relay",
    ...sorted.map((r) => `topic readwrite ${r}/#`),
    "",
    "# Chaque boitier : sa racine seulement, sous son propre nom (CN de son certificat).",
    ...sorted.map((r) => `pattern readwrite ${r}/%u/#`),
    "",
  ].join("\n");
}

/** Ecrit la configuration. Rend true si l'ACL a change (le broker doit alors la relire). */
export function writeBrokerConfig(roots: readonly string[]): boolean {
  mkdirSync(BROKER_CONFIG_DIR, { recursive: true });
  const conf = join(BROKER_CONFIG_DIR, "mosquitto.conf");
  copyFileSync(join(TEMPLATE_DIR, "mosquitto.conf"), conf);
  chmodSync(conf, 0o644);
  const aclPath = join(BROKER_CONFIG_DIR, "acl");
  const acl = brokerAcl(roots);
  let before = "";
  try { before = readFileSync(aclPath, "utf8"); } catch { /* premiere ecriture */ }
  if (before === acl) return false;
  writeFileSync(aclPath, acl, { mode: 0o644 });
  chmodSync(aclPath, 0o644);
  return true;
}
