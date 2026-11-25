// Code PIN Google Home : la regle, sans aucune dependance serveur, pour que la page Compte (navigateur)
// et le fulfillment (serveur) lisent la MEME definition de la forme du code.
//
// Verification secondaire. Google exige un code PIN pour OUVRIR un ouvrant qui donne acces au logement
// (porte, portail, garage, fenetre) : sans lui, l'integration n'est pas certifiee. Le code est choisi par
// l'utilisateur sur sa page Compte et garde hache ; il ne protege que le chemin Google (le portail web et
// le boitier ne le connaissent pas). Sans code choisi, l'ouverture par Google est refusee.
/** Forme du code et garde contre les essais en serie. */
export const GOOGLE_PIN = { minLength: 4, maxLength: 8, maxFailures: 5, lockMinutes: 15 } as const;
/** Le code tel que saisi ou dicte, s'il a la forme attendue (chiffres seuls, longueur bornee) ; sinon null. */
export function normalizeGooglePin(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const pin = raw.trim();
  if (pin.length < GOOGLE_PIN.minLength || pin.length > GOOGLE_PIN.maxLength) return null;
  return /^[0-9]+$/.test(pin) ? pin : null;
}
/** Issue d'une demande d'ouverture soumise au code. */
export const PIN_VERDICT = {
  granted: "granted",   // code juste : la commande part
  needed: "needed",     // aucun code presente : Google doit le demander
  failed: "failed",     // code presente mais faux (ou aucun code choisi sur le compte)
  locked: "locked",     // trop d'essais faux : plus aucun essai jusqu'a la fin du blocage
} as const;
export type PinVerdict = (typeof PIN_VERDICT)[keyof typeof PIN_VERDICT];
/** Essais faux en cours d'un compte, et fin du blocage (0 = pas bloque). */
export type PinAttempts = { failed: number; lockedUntil: number };
/** Fonction pure (testable) : juge un code presente, et rend le compteur d'essais a retenir
 *  (undefined = rien a retenir). Un blocage en cours ne regarde meme pas le code. `verify` compare le
 *  code au hache garde (verifyPass) : il est passe par l'appelant pour que ce module reste lisible par
 *  le navigateur. */
export function judgeGooglePin(
  pinHash: string | null, given: unknown, attempts: PinAttempts | undefined, now: number,
  verify: (pin: string, stored: string) => boolean,
): { verdict: PinVerdict; attempts: PinAttempts | undefined } {
  if (attempts && attempts.lockedUntil > now) return { verdict: PIN_VERDICT.locked, attempts };
  if (given === undefined || given === null || given === "") return { verdict: PIN_VERDICT.needed, attempts };
  const pin = normalizeGooglePin(given);
  if (pinHash !== null && pin !== null && verify(pin, pinHash)) return { verdict: PIN_VERDICT.granted, attempts: undefined };
  const failed = (attempts?.failed ?? 0) + 1;
  return {
    verdict: PIN_VERDICT.failed,
    attempts: failed >= GOOGLE_PIN.maxFailures ? { failed: 0, lockedUntil: now + GOOGLE_PIN.lockMinutes * 60_000 } : { failed, lockedUntil: 0 },
  };
}
