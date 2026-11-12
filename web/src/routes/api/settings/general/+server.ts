// Operateur : reglages generaux, enregistres d'un seul geste. Chaque bloc present dans la requete est
// mis a jour, un bloc absent reste tel quel :
// - appName : nom du portail (vide = marque par defaut) ;
// - smtp : messagerie. Serveur vide = messagerie retiree ; mot de passe vide = garder l'enregistre
//   (il n'est jamais renvoye a la page).
import type { RequestHandler } from './$types';
import { loadConfig, saveConfig, type PortalConfig } from '@opencloudapp/core/config.js';
import { normalizeSmtp, smtpConfig } from '@opencloudapp/core/mail.js';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const b = await readBody(request);
  let next: PortalConfig = cfg;
  if ('appName' in b) {
    const appName = String(b.appName ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const { appName: _old, ...rest } = next;
    next = appName ? { ...rest, appName } : rest;
  }
  if ('smtp' in b) {
    const raw = (b.smtp && typeof b.smtp === 'object' ? b.smtp : {}) as Record<string, unknown>;
    const { smtp: _old, ...rest } = next;
    if (String(raw.host ?? '').trim() === '') next = rest;
    else {
      const smtp = normalizeSmtp({ ...raw, pass: String(raw.pass ?? '') || smtpConfig()?.pass || '' });
      if (!smtp) return json(400, { error: 'messagerie : serveur, port et adresse d’expédition requis' });
      next = { ...rest, smtp };
    }
  }
  saveConfig(next);
  return json(200, { ok: true });
};
