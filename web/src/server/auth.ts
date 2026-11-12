// Resolution du compte courant : session locale (self-host) OU cookie SSO .isno.fr (compte commun au
// site). Le compte est le MEME que celui du www : un cookie SSO provisionne le compte au plafond par defaut.
import { readSession, readSsoSession } from '@core/session.js';
import { ensureAccount } from '@core/store.js';
import { DEFAULT_CAP } from '@core/entitlement.js';
import { boot } from './boot.ts';

export async function resolveAccountId(request: Request): Promise<string | null> {
  await boot();
  const cookie = request.headers.get('cookie') ?? undefined;
  const sid = readSession(cookie);
  if (sid) return sid;
  const sso = readSsoSession(cookie);
  if (sso) { await ensureAccount(sso, DEFAULT_CAP); return sso; }
  return null;
}
