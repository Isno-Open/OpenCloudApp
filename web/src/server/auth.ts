// Résolution du compte courant via le point d'extension d'auth : on parcourt les providers enregistrés
// (local, SSO, harnais privé). Le cœur ne code plus « session OU SSO » en dur : il délègue au registre.
import { wireAuth, resolveAccount, externalLoginUrl } from '@core/auth-provider.js';
import { boot } from './boot.ts';

export async function resolveAccountId(request: Request): Promise<string | null> {
  await boot();            // init du store (le provider SSO provisionne un compte)
  await wireAuth();        // branche les providers une fois
  return resolveAccount(request.headers.get('cookie') ?? undefined);
}

// URL de connexion externe (SSO) si un provider en fournit une, sinon null (formulaire local).
export async function loginRedirect(): Promise<string | null> {
  await wireAuth();
  return externalLoginUrl();
}
