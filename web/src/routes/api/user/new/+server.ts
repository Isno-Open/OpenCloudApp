// Operateur : cree un compte local (e-mail + nom + plafond, operateur ou non). Avec un mot de passe, le
// compte est pret ; sans, et si la messagerie est configuree, l'utilisateur recoit une invitation et
// choisit le sien (l'operateur ne connait jamais le mot de passe d'un autre).
import type { RequestHandler } from './$types';
import { createAccount, getAccount } from '@opencloudapp/core/store.js';
import { hashPass } from '@opencloudapp/core/auth.js';
import { requireAccountCreator } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { normalizeEmail, normalizeName } from '#lib/validate.ts';
import { localAccountsSettings } from '@opencloudapp/core/plugins/local-accounts-settings.js';
import { mailEnabled } from '@opencloudapp/core/mail.js';
import { sendInvitation } from '#lib/server/mailer.ts';
import { LANG } from '#lib/i18n.ts';


export const POST: RequestHandler = async ({ request }) => {
  const me = await requireAccountCreator(request);
  if (!me) return json(403, { error: 'forbidden' });
  const b = await readBody(request);
  const login = normalizeEmail(b.email), name = normalizeName(b.name);
  const password = String(b.password ?? '');
  const cap = Number(b.cap ?? 5);
  if (!login) return json(400, { error: 'e-mail invalide' });
  if (!name) return json(400, { error: 'nom requis' });
  const invite = password === '';
  if (invite && !mailEnabled()) return json(400, { error: 'mot de passe requis (messagerie non configurée)' });
  const min = localAccountsSettings().passwordMinLength;
  if (!invite && password.length < min) return json(400, { error: `mot de passe trop court (${min} caractères minimum)` });
  if (!Number.isInteger(cap) || cap < 1) return json(400, { error: 'plafond invalide' });
  if (await getAccount(login)) return json(409, { error: 'e-mail déjà utilisé' });
  await createAccount(login, name, invite ? null : hashPass(password), cap, b.admin === true);
  if (!invite) return json(200, { ok: true });
  const r = await sendInvitation(b.lang === LANG.en ? LANG.en : LANG.fr, { id: login, name, passHash: null }, (await getAccount(me))?.name ?? null);
  // le compte reste cree : l'operateur pourra renvoyer l'invitation une fois la messagerie reparee
  return r.ok ? json(200, { ok: true, invited: true }) : json(502, { error: `compte créé, invitation non envoyée : ${r.error}` });
};
