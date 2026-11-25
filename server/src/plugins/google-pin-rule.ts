// Code PIN Google Home : la regle, sans aucune dependance serveur, pour que la page Compte (navigateur)
// et le fulfillment (serveur) lisent la MEME definition de la forme du code.
//
// Verification secondaire. Google exige un code PIN pour OUVRIR un ouvrant qui donne acces au logement
// (porte, portail, garage, fenetre) : sans lui, l'integration n'est pas certifiee. Le code est choisi par
// l'utilisateur sur sa page Compte et garde hache ; il ne protege que le chemin Google (le portail web et
// le boitier ne le connaissent pas). Sans code choisi, l'ouverture par Google est refusee.
// Un appareil peut avoir un code PROPRE, qui remplace alors pour lui le code du compte.
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
/** Essais faux en cours contre UN code, et fin du blocage (0 = pas bloque). */
export type PinAttempts = { failed: number; lockedUntil: number };
/** Fonction pure (testable) : juge UN code presente pour PLUSIEURS appareils d'un meme ordre, chacun
 *  avec le hache du code qui le protege (le sien, sinon celui du compte ; null = aucun code choisi).
 *  Rend une issue par appareil, dans l'ordre recu, et les compteurs d'essais a retenir.
 *
 *  Les essais se comptent PAR CODE PROTEGE (cle = son hache), jamais pour le compte entier : ouvrir un
 *  portail avec son bon code ne doit pas effacer les essais faux contre le code d'un autre, sinon on
 *  devinerait ce dernier sans jamais etre bloque, en alternant avec une ouverture reussie. Un code faux
 *  compte pour UN essai par code vise, quel que soit le nombre d'appareils qu'il protege. Un code bloque
 *  n'est meme pas compare.
 *
 *  `verify` compare le code au hache garde (verifyPass) : il est passe par l'appelant pour que ce
 *  module reste lisible par le navigateur. */
export function judgeGooglePins(
  pinHashes: readonly (string | null)[], given: unknown, attempts: ReadonlyMap<string, PinAttempts>, now: number,
  verify: (pin: string, stored: string) => boolean,
): { verdicts: PinVerdict[]; attempts: Map<string, PinAttempts> } {
  const next = new Map(attempts);
  const absent = given === undefined || given === null || given === "";
  const pin = normalizeGooglePin(given);
  const judged = new Map<string, PinVerdict>();   // un meme code (celui du compte) n'est juge qu'une fois
  const judge = (hash: string): PinVerdict => {
    const known = next.get(hash);
    if (known && known.lockedUntil > now) return PIN_VERDICT.locked;
    if (absent) return PIN_VERDICT.needed;
    if (pin !== null && verify(pin, hash)) { next.delete(hash); return PIN_VERDICT.granted; }
    const failed = (known?.failed ?? 0) + 1;
    next.set(hash, failed >= GOOGLE_PIN.maxFailures ? { failed: 0, lockedUntil: now + GOOGLE_PIN.lockMinutes * 60_000 } : { failed, lockedUntil: 0 });
    return PIN_VERDICT.failed;
  };
  const verdicts = pinHashes.map((hash) => {
    // aucun code choisi : rien a deviner, donc rien a compter ; l'ouverture reste refusee
    if (hash === null) return absent ? PIN_VERDICT.needed : PIN_VERDICT.failed;
    let v = judged.get(hash);
    if (v === undefined) { v = judge(hash); judged.set(hash, v); }
    return v;
  });
  return { verdicts, attempts: next };
}
