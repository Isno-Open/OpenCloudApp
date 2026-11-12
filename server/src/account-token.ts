// Liens d'invitation et de reinitialisation du mot de passe : jetons signes, dates, et lies a
// l'empreinte du mot de passe ACTUEL du compte. Des que le mot de passe change, le lien ne vaut plus
// rien : usage unique sans rien stocker en base.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ACCOUNT_TOKEN = { invite: "invite", reset: "reset" } as const;
export type AccountTokenPurpose = (typeof ACCOUNT_TOKEN)[keyof typeof ACCOUNT_TOKEN];
export const ACCOUNT_TOKEN_TTL_MS: Record<AccountTokenPurpose, number> = {
  [ACCOUNT_TOKEN.invite]: 7 * 24 * 3600_000,   // une invitation : une semaine
  [ACCOUNT_TOKEN.reset]: 3600_000,             // une reinitialisation : une heure
};

const fingerprint = (passHash: string | null): string => createHash("sha256").update(passHash ?? "none").digest("hex").slice(0, 16);
const sign = (key: string, body: string): string => createHmac("sha256", key).update(`account-token\0${body}`).digest("base64url");

export function makeAccountToken(key: string, purpose: AccountTokenPurpose, accountId: string, passHash: string | null, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ p: purpose, id: accountId, exp: now + ACCOUNT_TOKEN_TTL_MS[purpose], f: fingerprint(passHash) })).toString("base64url");
  return `${body}.${sign(key, body)}`;
}

/** Compte vise si la signature, l'usage et la date sont bons (SANS l'empreinte du mot de passe : on lit
 *  ensuite ce compte en base, puis readAccountToken tranche). */
export function peekAccountToken(key: string, token: string, purpose: AccountTokenPurpose, now = Date.now()): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1), want = sign(key, body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const d = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    if (!d || typeof d !== "object") return null;
    const r = d as Record<string, unknown>;
    return r.p === purpose && typeof r.id === "string" && Number(r.exp) > now ? r.id : null;
  } catch { return null; }
}

/** Compte vise par un jeton valide pour cet usage, ou null. currentPassHash : celui du compte en base. */
export function readAccountToken(key: string, token: string, purpose: AccountTokenPurpose, currentPassHash: (id: string) => string | null | undefined, now = Date.now()): string | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1), want = sign(key, body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  let d: { p?: string; id?: string; exp?: number; f?: string };
  try { d = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { return null; }
  if (d.p !== purpose || typeof d.id !== "string" || !(Number(d.exp) > now)) return null;
  const cur = currentPassHash(d.id);
  if (cur === undefined) return null;                 // compte inconnu
  return d.f === fingerprint(cur) ? d.id : null;      // mot de passe change depuis : lien perime
}

/** Pour les tests et la decision « le jeton n'est-il pas deja consomme ? » sans requete en base. */
export const passFingerprint = fingerprint;
