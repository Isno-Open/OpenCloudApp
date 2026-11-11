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
