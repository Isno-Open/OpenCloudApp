// Session locale en cookie signé HMAC (HttpOnly). Un fournisseur d'identité externe (SSO) ne vit pas
// ici : il se branche par le point d'extension (auth-provider.ts), depuis un greffon.
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

// Connexion EN ATTENTE du code de double authentification : compte + echeance, signes dans un contexte
// distinct de la session (un jeton « pending » ne vaut jamais session, et inversement).
export const PENDING_TTL_MS = 5 * 60_000;
const macCtx = (ctx: string, v: string): string => createHmac("sha256", SECRET).update(`${ctx}\0${v}`).digest("hex");
export function makePending(accountId: string, now = Date.now()): string {
  const body = `${accountId}.${now + PENDING_TTL_MS}`;
  return `${body}.${macCtx("pending", body)}`;
}
export function readPending(cookie: string | undefined, now = Date.now()): string | null {
  if (!cookie) return null;
  const m = /(?:^|;\s*)pending=([^;]+)/.exec(cookie);
  if (!m || !m[1]) return null;
  const val = decodeURIComponent(m[1]);
  const i = val.lastIndexOf(".");
  if (i < 0) return null;
  const body = val.slice(0, i), sig = val.slice(i + 1), want = macCtx("pending", body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  const j = body.lastIndexOf(".");
  const id = body.slice(0, j), exp = Number(body.slice(j + 1));
  return exp > now ? id : null;
}
/** Cle de signature du portail (sert aussi au captcha). */
export const signingKey = (): string => SECRET;
