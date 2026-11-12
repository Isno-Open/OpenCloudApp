// Ecrit la config du portail (fichier unique) puis provoque un redemarrage du process pour l'appliquer :
// au boot, le store choisi s'initialise et l'instance sort du mode setup (Docker: restart: unless-stopped).
import type { APIRoute } from 'astro';
import { isConfigured, setupWindowOpen, saveConfig, DB_KIND, type PortalConfig, type DbKind, type DbConfig } from '@core/config.js';
import { hashPass } from '@core/auth.js';
import { DB_MODULE } from '@core/config.js';
import { getModule } from '../../../server/supervisor.ts';
import { readBody, json } from '../../../server/http.ts';

const KINDS: readonly DbKind[] = [DB_KIND.sqlite, DB_KIND.mongoBundled, DB_KIND.mongoExternal];

export const POST: APIRoute = async ({ request }) => {
  // l'onboarding ne se rejoue pas : une instance configuree ferme ces routes
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  if (!setupWindowOpen()) return json(403, { error: 'fenêtre d\'installation expirée : redémarrez le serveur' });
  const b = await readBody(request);
  const kind = String(b.kind ?? '') as DbKind;
  if (!KINDS.includes(kind)) return json(400, { error: 'base de données inconnue' });
  const publicAppUrl = String(b.publicAppUrl ?? '').trim();
  const brokerPublicUrl = String(b.brokerPublicUrl ?? '').trim();
  const adminPassword = String(b.adminPassword ?? '');
  if (!publicAppUrl || !brokerPublicUrl) return json(400, { error: 'URL publique et URL broker requises' });
  if (adminPassword.length < 8) return json(400, { error: 'mot de passe admin trop court (8 caractères minimum)' });

  let db: DbConfig;
  if (kind === DB_KIND.mongoExternal) {
    const mongoUrl = String(b.mongoUrl ?? '').trim();
    if (!mongoUrl) return json(400, { error: 'URL Mongo requise' });
    db = { kind, mongoUrl };
  } else if (kind === DB_KIND.mongoBundled) {
    const r = await getModule(DB_MODULE[DB_KIND.mongoBundled]);
    if (!r.ok) return json(502, { error: r.error });
    if (!r.module.ready || !r.module.endpoint) return json(409, { error: "MongoDB n'est pas encore installé" });
    db = { kind, mongoUrl: r.module.endpoint };
  } else {
    db = { kind };
  }

  const cfg: PortalConfig = { configured: true, db, publicAppUrl, brokerPublicUrl, adminPassHash: hashPass(adminPassword) };
  saveConfig(cfg);
  setTimeout(() => process.exit(0), 400);   // redemarrage pour appliquer le store choisi
  return json(200, { ok: true });
};
