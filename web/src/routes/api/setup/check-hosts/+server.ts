// Verification des noms d'hote publics pendant l'installation (memes gardes que le reste du setup).
import type { RequestHandler } from './$types';
import { isConfigured, setupWindowOpen } from '@opencloudapp/core/config.js';
import { checkHosts, requestScheme } from '#lib/server/hosts.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  if (!setupWindowOpen()) return json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" });
  const b = await readBody(request);
  return json(200, await checkHosts(String(b.appHost ?? ''), String(b.brokerHost ?? ''), requestScheme(request)));
};
