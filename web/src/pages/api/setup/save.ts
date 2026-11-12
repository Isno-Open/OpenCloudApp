// Ecrit la config du portail (fichier unique) puis provoque un redemarrage du process pour l'appliquer :
// au boot, le store choisi s'initialise et l'instance sort du mode setup (Docker: restart: unless-stopped).
import type { APIRoute } from 'astro';
import { isConfigured, verifySetupToken, clearSetupToken, saveConfig, DB_KIND, type PortalConfig, type DbKind, type DbConfig } from '@core/config.js';
import { hashPass } from '@core/auth.js';
import { readBody, json } from '../../../server/http.ts';

const KINDS: readonly DbKind[] = [DB_KIND.sqlite, DB_KIND.mongoBundled, DB_KIND.mongoExternal];

export const POST: APIRoute = async ({ request }) => {
  // l'onboarding ne se rejoue pas : une instance configuree ferme ces routes
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  const b = await readBody(request);
  if (!verifySetupToken(String(b.token ?? ''))) return json(401, { error: 'jeton invalide' });
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
    db = { kind, mongoUrl: 'mongodb://mongo:27017' };
  } else {
    db = { kind };
  }

  const cfg: PortalConfig = { configured: true, db, publicAppUrl, brokerPublicUrl, adminPassHash: hashPass(adminPassword) };
  saveConfig(cfg);
  clearSetupToken();
  setTimeout(() => process.exit(0), 400);   // redemarrage pour appliquer le store choisi
  return json(200, { ok: true });
};
