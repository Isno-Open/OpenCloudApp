// Operateur : met a jour les URLs publiques de la config (la base reste celle de l'installation).
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const b = await readBody(request);
  const publicAppUrl = String(b.publicAppUrl ?? '').trim();
  const brokerPublicUrl = String(b.brokerPublicUrl ?? '').trim();
  if (!/^https?:\/\//.test(publicAppUrl) || !/^mqtts?:\/\//.test(brokerPublicUrl)) return json(400, { error: 'URL invalide' });
  saveConfig({ ...cfg, publicAppUrl, brokerPublicUrl });
  return json(200, { ok: true });
};
