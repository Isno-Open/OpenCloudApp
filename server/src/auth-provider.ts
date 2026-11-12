// Point d'extension d'authentification. Le cœur ne connaît QUE cette interface et un registre ; les
// modes de connexion sont apportés par des GREFFONS (plugins.ts) : « comptes locaux » (intégré, actif
// par défaut) fournit le provider local défini ici ; un greffon externe (ex. SSO ISNO) en ajoute d'autres.
//
// resolveAccount parcourt les providers dans l'ordre d'enregistrement : le premier qui rend un compte gagne
// (session locale d'abord, SSO ensuite). externalLoginUrl donne l'URL de connexion externe d'un provider SSO.
import { readSession } from "./session.js";

export interface AuthProvider {
  id: string;
  // Rend l'identifiant de compte pour ce cookie, ou null si ce provider ne reconnaît pas la requête.
  resolveAccount(cookie: string | undefined): Promise<string | null>;
  // URL de connexion externe (SSO) vers laquelle renvoyer un visiteur non connecté. null = formulaire local.
  loginUrl?(): string | null;
  // Cookies à effacer à la déconnexion (en-têtes Set-Cookie complets) : chaque provider connaît les siens.
  logoutCookies?(): string[];
  // Adresse où envoyer le navigateur après la déconnexion (fermer aussi la session du site externe).
  logoutUrl?(): string | null;
}

const providers: AuthProvider[] = [];
export function registerAuthProvider(p: AuthProvider): void {
  if (!providers.some((x) => x.id === p.id)) providers.push(p);
}
export function authProviders(): readonly AuthProvider[] { return providers; }
export function clearAuthProviders(): void { providers.length = 0; }   // tests

export async function resolveAccount(cookie: string | undefined): Promise<string | null> {
  for (const p of providers) { const a = await p.resolveAccount(cookie); if (a) return a; }
  return null;
}
/** Déconnexion : tous les cookies de session de tous les providers, à effacer ensemble (sinon un
 *  provider encore valide reconnecterait aussitôt l'utilisateur, sous un autre compte). */
export function logoutCookies(): string[] {
  return providers.flatMap((p) => p.logoutCookies?.() ?? []);
}
export function externalLogoutUrl(): string | null {
  for (const p of providers) { const u = p.logoutUrl?.(); if (u) return u; }
  return null;
}
export function externalLoginUrl(): string | null {
  for (const p of providers) { const u = p.loginUrl?.(); if (u) return u; }
  return null;
}

// Provider LOCAL : session self-host (cookie sid signé). Toujours présent dans le cœur.
export const localProvider: AuthProvider = {
  id: "local",
  resolveAccount: (cookie) => Promise.resolve(readSession(cookie) ?? null),
  logoutCookies: () => ["sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"],
};
