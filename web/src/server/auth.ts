// Résolution du compte courant via le point d'extension d'auth : on parcourt les providers enregistrés
// (le local, et ceux d'un greffon s'il y en a un). Le cœur délègue au registre.
import { resolveAccount, externalLoginUrl } from '@core/auth-provider.js';
import { loadPlugins, hasCapability, CAPABILITY, enabledPlugins } from '@core/plugins.js';
import { getAccount } from '@core/store.js';
import { boot } from './boot.ts';

/** Charge les greffons actifs (config, sinon « comptes locaux » par defaut) ; une seule fois. */
export const plugins = (): Promise<void> => loadPlugins(enabledPlugins());

export async function resolveAccountId(request: Request): Promise<string | null> {
  await boot();            // init du store (un provider de greffon peut provisionner un compte)
  await plugins();         // les greffons apportent les modes de connexion
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
  await plugins();
  return externalLoginUrl();
}

/** Garde de l'ecran Utilisateurs : operateur ET un greffon qui fournit la gestion des comptes. */
export async function requireUserAdmin(request: Request): Promise<string | null> {
  const id = await requireAdmin(request);
  return id && hasCapability(CAPABILITY.userAdmin) ? id : null;
}

/** Un greffon fournit-il la connexion locale (e-mail + mot de passe) ? */
export async function localLoginEnabled(): Promise<boolean> {
  await plugins();
  return hasCapability(CAPABILITY.localLogin);
}
