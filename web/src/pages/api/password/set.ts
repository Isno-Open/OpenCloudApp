// Choix du mot de passe depuis un lien signe (invitation ou reinitialisation). Le lien perime des que le
// mot de passe change (empreinte dans le jeton) : il ne sert qu'une fois.
import type { APIRoute } from 'astro';
import { getAccount, setAccountPass, resetLoginFailures } from '@core/store.js';
import { hashPass } from '@core/auth.js';
import { readAccountToken, peekAccountToken, ACCOUNT_TOKEN } from '@core/account-token.js';
import { signingKey } from '@core/session.js';
import { localAccountsSettings } from '@core/plugins/local-accounts-settings.js';
import { boot } from '../../../server/boot.ts';
import { readBody, json } from '../../../server/http.ts';

/** Compte vise par un lien d'invitation OU de reinitialisation encore valable. */
export async function accountFromLink(token: string): Promise<string | null> {
  await boot();
  for (const purpose of Object.values(ACCOUNT_TOKEN)) {
    const candidate = peekAccountToken(signingKey(), token, purpose);
    if (!candidate) continue;
    const a = await getAccount(candidate);
    if (!a) return null;
    return readAccountToken(signingKey(), token, purpose, (id) => (id === a.id ? a.passHash : undefined));
  }
  return null;
}

export const POST: APIRoute = async ({ request }) => {
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
