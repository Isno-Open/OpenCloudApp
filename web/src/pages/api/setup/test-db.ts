// Teste le choix de base avant de l'enregistrer. SQLite : rien a tester. Mongo (fourni ou externe) :
// on tente une connexion courte + ping, pour que l'operateur ne valide pas une URL morte.
import type { APIRoute } from 'astro';
import { verifySetupToken, DB_KIND } from '@core/config.js';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  const b = await readBody(request);
  if (!verifySetupToken(String(b.token ?? ''))) return json(401, { error: 'jeton invalide' });
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
