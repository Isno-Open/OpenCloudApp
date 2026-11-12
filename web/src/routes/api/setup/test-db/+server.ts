// Teste le choix de base avant de l'enregistrer. SQLite : rien a tester. Mongo (fourni ou externe) :
// on tente une connexion courte + ping, pour que l'operateur ne valide pas une URL morte.
import type { RequestHandler } from './$types';
import { isConfigured, setupWindowOpen, DB_KIND, DB_MODULE } from '@opencloudapp/core/config.js';
import { getModule } from '#lib/server/supervisor.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  // l'onboarding ne se rejoue pas : une instance configuree ferme ces routes
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  if (!setupWindowOpen()) return json(403, { error: 'fenêtre d\'installation expirée : redémarrez le serveur' });
  const b = await readBody(request);
  const kind = String(b.kind ?? '');
  if (kind === DB_KIND.sqlite) return json(200, { ok: true });
  let url = String(b.mongoUrl ?? '').trim();
  if (kind === DB_KIND.mongoBundled) {
    // l'adresse du Mongo fourni vient du superviseur (catalogue), jamais ecrite ici
    const r = await getModule(DB_MODULE[DB_KIND.mongoBundled]);
    if (!r.ok) return json(200, { ok: false, error: r.error });
    if (!r.module.ready || !r.module.endpoint) return json(200, { ok: false, error: 'MongoDB pas encore installé' });
    url = r.module.endpoint;
  }
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
