// Cookie de session SIGNE, partage avec un site externe (connexion unique) : le site externe le pose
// sur un domaine commun, le portail le verifie avec le MEME secret, sans appeler ce site.
// Format : base64url(e-mail) "." echeance en ms "." base64url(HMAC-SHA256(secret, "<b64>.<echeance>")).
// C'est le format du connecteur de la boutique isno.fr ; tout site peut le produire en quelques lignes.
import { createHmac, timingSafeEqual } from "node:crypto";

const sign = (payload: string, secret: string): string => createHmac("sha256", secret).update(payload).digest("base64url");

/** Fabrique la valeur du cookie (pour les tests, et pour qui voudrait l'emettre depuis ce portail). */
export function makeSignedSession(email: string, secret: string, expiresAtMs: number): string {
  const payload = `${Buffer.from(email, "utf8").toString("base64url")}.${expiresAtMs}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Valeur du cookie `name` dans l'en-tete Cookie, ou null. */
export function cookieValue(header: string | undefined, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** E-mail porte par une valeur signee intacte et non expiree, sinon null. Sans secret : toujours null. */
export function readSignedSession(value: string | null, secret: string, now: number = Date.now()): string | null {
  if (!secret || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, expStr, sig] = parts as [string, string, string];
  const want = sign(`${emailB64}.${expStr}`, secret);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || now > exp) return null;
  const email = Buffer.from(emailB64, "base64url").toString("utf8");
  return /^[^\s@]+@[^\s@]+$/.test(email) ? email : null;
}
