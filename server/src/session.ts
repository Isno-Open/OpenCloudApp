// Session en cookie signé HMAC (HttpOnly). MVP self-host ; l'hébergé ISNO branchera le SSO www.
import { createHmac, timingSafeEqual } from "node:crypto";
const SECRET = process.env.SESSION_SECRET ?? "";
const mac = (v: string): string => createHmac("sha256", SECRET).update(v).digest("hex");
export const makeSession = (accountId: string): string => `${accountId}.${mac(accountId)}`;
export function readSession(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const m = /(?:^|;\s*)sid=([^;]+)/.exec(cookie);
  if (!m || !m[1]) return null;
  const val = decodeURIComponent(m[1]);
  const i = val.lastIndexOf(".");
  if (i < 0) return null;
  const id = val.slice(0, i), sig = val.slice(i + 1), want = mac(id);
  if (sig.length !== want.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? id : null;
}

// SSO : le site (www.isno.fr) émet un cookie `sso=<accountId>.<hmac(SSO_SECRET, accountId)>` scopé
// `.isno.fr`. Le cloud le valide avec le MÊME secret partagé, sans connaître les internes du site.
// Inerte tant que SSO_SECRET n'est pas défini (aucun changement de comportement).
const SSO_SECRET = process.env.SSO_SECRET ?? "";
const ssoMac = (v: string): string => createHmac("sha256", SSO_SECRET).update(v).digest("hex");
export function readSsoSession(cookie: string | undefined): string | null {
  if (!SSO_SECRET || !cookie) return null;
  const m = /(?:^|;\s*)sso=([^;]+)/.exec(cookie);
  if (!m || !m[1]) return null;
  const val = decodeURIComponent(m[1]);
  const i = val.lastIndexOf(".");
  if (i < 0) return null;
  const id = val.slice(0, i), sig = val.slice(i + 1), want = ssoMac(id);
  if (sig.length !== want.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? id : null;
}
/** Jeton SSO (côté site, ou tests). Vide si SSO_SECRET non défini. */
export const makeSsoToken = (accountId: string): string => SSO_SECRET ? `${accountId}.${ssoMac(accountId)}` : "";
