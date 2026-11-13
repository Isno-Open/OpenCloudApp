// Operateur : renvoie l'invitation d'un compte qui n'a pas encore choisi son mot de passe.
import type { RequestHandler } from './$types';
import { getAccount } from '@opencloudapp/core/store.js';
import { requireAccountCreator } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { sendInvitation } from '#lib/server/mailer.ts';
import { LANG } from '#lib/i18n.ts';

export const POST: RequestHandler = async ({ request }) => {
  const me = await requireAccountCreator(request);
  if (!me) return json(403, { error: 'forbidden' });
  const b = await readBody(request);
  const a = await getAccount(String(b.id ?? ''));
  if (!a) return json(404, { error: 'compte inconnu' });
  if (a.passHash) return json(409, { error: 'mot de passe déjà choisi' });
  const inviter = (await getAccount(me))?.name ?? null;
  const r = await sendInvitation(b.lang === LANG.en ? LANG.en : LANG.fr, a, inviter);
  return r.ok ? json(200, { ok: true }) : json(502, { error: r.error });
};
