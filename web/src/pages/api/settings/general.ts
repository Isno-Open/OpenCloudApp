// Operateur : reglages generaux (nom du portail). Vide = marque par defaut.
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const appName = String((await readBody(request)).appName ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const { appName: _old, ...rest } = cfg;
  saveConfig(appName ? { ...rest, appName } : rest);
  return json(200, { ok: true });
};
