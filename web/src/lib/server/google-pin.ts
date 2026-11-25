// Code PIN Google Home d'un compte : jugement d'un code presente par Google, et garde contre les essais
// en serie. La regle est au coeur (judgeGooglePin, eprouvee la-bas) ; ici, la lecture du compte et le
// compteur d'essais. Le compteur vit en memoire : un redemarrage le remet a zero, ce qu'un appelant ne
// peut pas provoquer.
import { getAccount } from '@opencloudapp/core/store.js';
import { verifyPass } from '@opencloudapp/core/auth.js';
import { judgeGooglePin, type PinAttempts, type PinVerdict } from '@opencloudapp/core/plugins/google-pin-rule.js';

const attempts = new Map<string, PinAttempts>();

/** Juge le code presente pour ce compte, et retient l'essai. */
export async function judgeOpenPin(accountId: string, given: unknown): Promise<PinVerdict> {
  const account = await getAccount(accountId);
  const r = judgeGooglePin(account?.googlePinHash ?? null, given, attempts.get(accountId), Date.now(), verifyPass);
  if (r.attempts) attempts.set(accountId, r.attempts); else attempts.delete(accountId);
  return r.verdict;
}

/** Le titulaire vient de choisir ou de retirer son code depuis sa session : les essais faux d'avant ne
 *  valent plus (c'est aussi sa sortie d'un blocage). */
export const forgetPinAttempts = (accountId: string): void => { attempts.delete(accountId); };
