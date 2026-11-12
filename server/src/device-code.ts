// Codes du device authorization grant (RFC 8628).
// - device_code : secret long détenu par l'appareil, sert au polling.
// - user_code   : code court montré par l'appareil (et encodé dans le QR), saisi ou scanné par
//   l'utilisateur. Alphabet sans caractères ambigus (pas de 0/O, 1/I/L), 8 caractères, stocké sous
//   forme canonique (sans tiret) et affiché « XXXX-XXXX ».
import { randomBytes, randomInt } from "node:crypto";

export const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const USER_CODE_LENGTH = 8;
export const DEVICE_AUTH_TTL_S = 600;       // 10 min pour approuver
export const DEVICE_AUTH_INTERVAL_S = 5;    // cadence de polling demandée à l'appareil

export const newDeviceCode = (): string => randomBytes(32).toString("hex");

export function newUserCode(): string {
  let c = "";
  for (let i = 0; i < USER_CODE_LENGTH; i++) c += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return c;
}

/** Saisie utilisateur -> forme canonique (majuscules, hors alphabet retiré). Rend null si invalide. */
export function normalizeUserCode(input: string): string | null {
  const c = input.toUpperCase().split("").filter((ch) => USER_CODE_ALPHABET.includes(ch)).join("");
  return c.length === USER_CODE_LENGTH ? c : null;
}

/** Forme d'affichage « XXXX-XXXX ». */
export const displayUserCode = (c: string): string => `${c.slice(0, 4)}-${c.slice(4)}`;

/** Statut rendu à l'appareil qui interroge (valeur sur le fil, lue par le firmware). */
export const POLL_STATUS = {
  pending: "pending",   // pas encore approuvé : réinterroger après `interval` secondes
  ready: "ready",       // approuvé : la réponse porte device_id, broker_url, ca, cert, key
  expired: "expired",   // inconnu, expiré ou déjà délivré : recommencer l'appairage
  denied: "denied",     // appareil déjà rattaché à un autre compte
} as const;
export type PollStatus = (typeof POLL_STATUS)[keyof typeof POLL_STATUS];
