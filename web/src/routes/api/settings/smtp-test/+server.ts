// Operateur : envoie un e-mail de test a sa propre adresse, avec la messagerie enregistree.
import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { sendTemplated } from '#lib/server/mailer.ts';
import { MAIL_KIND } from '#lib/server/mail-templates.ts';
import { LANG } from '#lib/i18n.ts';

export const POST: RequestHandler = async ({ request }) => {
  const me = await requireAdmin(request);
  if (!me) return json(403, { error: 'forbidden' });
  const lang = (await readBody(request)).lang === LANG.en ? LANG.en : LANG.fr;
  const r = await sendTemplated(MAIL_KIND.test, lang, me);
  return r.ok ? json(200, { ok: true, to: me }) : json(502, { error: r.error });
};
