// Verification des noms d'hote publics pendant l'installation (memes gardes que le reste du setup).
import type { APIRoute } from 'astro';
import { isConfigured, setupWindowOpen } from '@core/config.js';
import { checkHosts, requestScheme } from '../../../server/hosts.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  if (!setupWindowOpen()) return json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" });
  const b = await readBody(request);
  return json(200, await checkHosts(String(b.appHost ?? ''), String(b.brokerHost ?? ''), requestScheme(request)));
};
