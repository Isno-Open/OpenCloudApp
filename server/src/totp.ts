// Double authentification par code a usage unique base sur le temps (TOTP, RFC 6238 ; HOTP, RFC 4226).
// Ecrit avec node:crypto, sans dependance. Secret en base32 (format des applis d'authentification).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD_S = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

/** Nouveau secret (20 octets, comme le recommande la RFC 4226), en base32. */
export const newTotpSecret = (): string => base32Encode(randomBytes(20));

/** Code HOTP pour un compteur donne. */
export function hotp(secret: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const off = h[h.length - 1]! & 0x0f;
  const bin = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!;
  return String(bin % 10 ** digits).padStart(digits, "0");
}
export const totpStep = (nowMs: number): number => Math.floor(nowMs / 1000 / TOTP_PERIOD_S);

/** Verifie un code ; rend le pas de temps accepte (pour refuser un code deja utilise), ou null.
 *  Tolere un pas d'ecart (horloge du telephone un peu decalee). */
export function verifyTotp(secretB32: string, code: string, nowMs: number, lastUsedStep: number | null = null): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const secret = base32Decode(secretB32);
  const now = totpStep(nowMs);
  for (const step of [now, now - 1, now + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;   // pas de rejeu
    const want = hotp(secret, step);
    if (timingSafeEqual(Buffer.from(want), Buffer.from(c))) return step;
  }
  return null;
}

/** URI a encoder en QR pour l'appli d'authentification. */
export const otpauthUri = (issuer: string, account: string, secretB32: string): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_S}`;
