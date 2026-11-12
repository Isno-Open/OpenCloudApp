// Operateur : messagerie (SMTP). Le mot de passe n'est jamais renvoye a la page : vide = garder celui
// enregistre. « disable » retire la messagerie (invitation et mot de passe oublie redeviennent masques).
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { normalizeSmtp, smtpConfig } from '@core/mail.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const b = await readBody(request);
  if (b.disable === true) { const { smtp: _drop, ...rest } = cfg; saveConfig(rest); return json(200, { ok: true }); }
  const prev = smtpConfig();
  const smtp = normalizeSmtp({ ...b, pass: String(b.pass ?? '') || prev?.pass || '' });
  if (!smtp) return json(400, { error: 'hôte, port et expéditeur requis' });
  saveConfig({ ...cfg, smtp });
  return json(200, { ok: true });
};
