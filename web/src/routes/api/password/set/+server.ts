// Choix du mot de passe depuis un lien signe (invitation ou reinitialisation). Le lien perime des que le
// mot de passe change (empreinte dans le jeton) : il ne sert qu'une fois.
import type { RequestHandler } from './$types';
import { setAccountPass, resetLoginFailures } from '@opencloudapp/core/store.js';
import { accountFromLink } from '#lib/server/password.ts';
import { hashPass } from '@opencloudapp/core/auth.js';
import { localAccountsSettings } from '@opencloudapp/core/plugins/local-accounts-settings.js';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const b = await readBody(request);
  const id = await accountFromLink(String(b.token ?? ''));
  if (!id) return json(400, { error: 'lien expiré ou déjà utilisé' });
  const password = String(b.password ?? '');
  const min = localAccountsSettings().passwordMinLength;
  if (password.length < min) return json(400, { error: `mot de passe trop court (${min} caractères minimum)` });
  await setAccountPass(id, hashPass(password));
  await resetLoginFailures(id);
  return json(200, { ok: true });
};
