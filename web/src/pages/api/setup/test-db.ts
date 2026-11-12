// Teste le choix de base avant de l'enregistrer. SQLite : rien a tester. Mongo (fourni ou externe) :
// on tente une connexion courte + ping, pour que l'operateur ne valide pas une URL morte.
import type { APIRoute } from 'astro';
import { isConfigured, setupWindowOpen, DB_KIND } from '@core/config.js';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  // l'onboarding ne se rejoue pas : une instance configuree ferme ces routes
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  if (!setupWindowOpen()) return json(403, { error: 'fenêtre d\'installation expirée : redémarrez le serveur' });
  const b = await readBody(request);
  const kind = String(b.kind ?? '');
  if (kind === DB_KIND.sqlite) return json(200, { ok: true });
  const url = String(b.mongoUrl ?? '').trim() || (kind === DB_KIND.mongoBundled ? 'mongodb://mongo:27017' : '');
  if (!url) return json(400, { ok: false, error: 'URL Mongo requise' });
  try {
    const { MongoClient } = await import('mongodb');
    const c = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });
    await c.connect();
    await c.db().command({ ping: 1 });
    await c.close();
    return json(200, { ok: true });
  } catch (e) {
    return json(200, { ok: false, error: e instanceof Error ? e.message : 'connexion impossible' });
  }
};
