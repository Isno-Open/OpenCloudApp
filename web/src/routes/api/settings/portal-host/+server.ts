// Operateur : change l'adresse publique du portail (QR d'enrolement, liens des e-mails). Verifiee comme a
// l'installation : le nom doit resoudre ET mener a cette instance. Le broker n'est pas concerne : son
// adresse est inscrite dans les appareils deja lies, elle reste en lecture seule.
import type { RequestHandler } from './$types';
import { loadConfig, saveConfig } from '@opencloudapp/core/config.js';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { checkAppHost, requestScheme } from '#lib/server/hosts.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const scheme = requestScheme(request);
  const r = await checkAppHost(String((await readBody(request)).host ?? ''), scheme);
  if (!r.ok || !r.host) return json(400, { error: 'adresse non vérifiée', checks: r.checks });
  saveConfig({ ...cfg, publicAppUrl: `${scheme}://${r.host}` });
  return json(200, { ok: true, publicAppUrl: `${scheme}://${r.host}`, checks: r.checks });
};
