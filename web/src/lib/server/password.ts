// Liens de mot de passe (invitation ou reinitialisation), partages par la page /mot-de-passe et l'API.
import { getAccount } from '@opencloudapp/core/store.js';
import { readAccountToken, peekAccountToken, ACCOUNT_TOKEN } from '@opencloudapp/core/account-token.js';
import { signingKey } from '@opencloudapp/core/session.js';
import { boot } from '#lib/server/boot.ts';

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

