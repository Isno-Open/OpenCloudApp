// Résolution du compte courant via le point d'extension d'auth : on parcourt les providers enregistrés
// (local, SSO, harnais privé). Le cœur ne code plus « session OU SSO » en dur : il délègue au registre.
import { wireAuth, resolveAccount, externalLoginUrl } from '@core/auth-provider.js';
import { getAccount } from '@core/store.js';
import { boot } from './boot.ts';

export async function resolveAccountId(request: Request): Promise<string | null> {
  await boot();            // init du store (le provider SSO provisionne un compte)
  await wireAuth();        // branche les providers une fois
  return resolveAccount(request.headers.get('cookie') ?? undefined);
}

/** Compte courant avec son role (id + admin), ou null. Sert au nav et aux ecrans operateur. */
export async function currentAccount(request: Request): Promise<{ id: string; admin: boolean } | null> {
  const id = await resolveAccountId(request);
  if (!id) return null;
  const a = await getAccount(id);
  return { id, admin: !!a?.admin };
}

/** Garde operateur : rend l'id si le compte courant est admin, sinon null (ecran a rediriger). */
export async function requireAdmin(request: Request): Promise<string | null> {
  const a = await currentAccount(request);
  return a?.admin ? a.id : null;
}

// URL de connexion externe (SSO) si un provider en fournit une, sinon null (formulaire local).
export async function loginRedirect(): Promise<string | null> {
  await wireAuth();
  return externalLoginUrl();
}
