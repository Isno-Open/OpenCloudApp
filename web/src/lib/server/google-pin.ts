// Code PIN Google Home : jugement d'un code presente par Google, et garde contre les essais en serie.
// La regle est au coeur (judgeGooglePins, eprouvee la-bas) ; ici, la lecture des codes et le compteur
// d'essais. Un appareil est protege par SON code s'il en a un, sinon par le code du compte. Le compteur
// vit en memoire, par compte : un redemarrage le remet a zero, ce qu'un appelant ne peut pas provoquer.
import { getAccount, listGoogleDevicePins } from '@opencloudapp/core/store.js';
import { verifyPass } from '@opencloudapp/core/auth.js';
import { judgeGooglePins, type PinAttempts, type PinVerdict } from '@opencloudapp/core/plugins/google-pin-rule.js';

const attempts = new Map<string, PinAttempts>();

/** Juge le code presente pour ces appareils du compte (un seul essai retenu pour tout l'ordre), et rend
 *  l'issue de chacun, par identifiant. */
export async function judgeOpenPins(accountId: string, applianceIds: readonly string[], given: unknown): Promise<Map<string, PinVerdict>> {
  const accountHash = (await getAccount(accountId))?.googlePinHash ?? null;
  const own = await listGoogleDevicePins(accountId);
  const r = judgeGooglePins(applianceIds.map((id) => own[id] ?? accountHash), given, attempts.get(accountId), Date.now(), verifyPass);
  if (r.attempts) attempts.set(accountId, r.attempts); else attempts.delete(accountId);
  const out = new Map<string, PinVerdict>();
  applianceIds.forEach((id, i) => { const v = r.verdicts[i]; if (v !== undefined) out.set(id, v); });
  return out;
}

/** Le titulaire vient de choisir ou de retirer un code depuis sa session : les essais faux d'avant ne
 *  valent plus (c'est aussi sa sortie d'un blocage). */
export const forgetPinAttempts = (accountId: string): void => { attempts.delete(accountId); };
