// Résolution du compte courant via le point d'extension d'auth : on parcourt les providers enregistrés
// (le local, et ceux d'un greffon s'il y en a un). Le cœur délègue au registre.
import { resolveAccount, externalLoginUrl } from '@opencloudapp/core/auth-provider.js';
import { loadPlugins, hasCapability, CAPABILITY, enabledPlugins } from '@opencloudapp/core/plugins.js';
import { getAccount } from '@opencloudapp/core/store.js';
import { boot } from '#lib/server/boot.ts';

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

/** Garde de la CREATION de comptes (nouvel utilisateur, invitation) : admin ET un mode de connexion
 *  qui cree ses comptes dans le portail (connexion par mot de passe). L'ecran Utilisateurs lui-meme
 *  (liste, role, plafond, suppression) ne demande que d'etre admin : il est au coeur. */
export async function requireAccountCreator(request: Request): Promise<string | null> {
  const id = await requireAdmin(request);
  if (!id) return null;
  await plugins();
  return hasCapability(CAPABILITY.accountCreation) ? id : null;
}
/** Le portail cree-t-il ses comptes lui-meme (sinon ils viennent d'une source, ex. un site externe) ? */
export async function accountCreationEnabled(): Promise<boolean> {
  await plugins();
  return hasCapability(CAPABILITY.accountCreation);
}

/** Un greffon fournit-il la connexion locale (e-mail + mot de passe) ? */
export async function localLoginEnabled(): Promise<boolean> {
  await plugins();
  return hasCapability(CAPABILITY.localLogin);
}
