// Point d'extension d'authentification (façon « hooks » WordPress). Le cœur public ne connaît QUE cette
// interface et un registre ; il embarque le provider LOCAL (comptes dans la base). Un harnais privé (dépôt
// séparé) s'enregistre au démarrage pour ajouter un provider (ex. un SSO), sans forker le cœur. Sans
// greffon, le portail gère ses utilisateurs NATIVEMENT : comptes locaux, créés par l'opérateur.
//
// resolveAccount parcourt les providers dans l'ordre d'enregistrement : le premier qui rend un compte gagne
// (session locale d'abord, SSO ensuite). externalLoginUrl donne l'URL de connexion externe d'un provider SSO.
import { readSession } from "./session.js";
import { ensureAccount } from "./store.js";
import { DEFAULT_CAP } from "./entitlement.js";

export interface AuthProvider {
  id: string;
  // Rend l'identifiant de compte pour ce cookie, ou null si ce provider ne reconnaît pas la requête.
  resolveAccount(cookie: string | undefined): Promise<string | null>;
  // URL de connexion externe (SSO) vers laquelle renvoyer un visiteur non connecté. null = formulaire local.
  loginUrl?(): string | null;
  // Cookies à effacer à la déconnexion (en-têtes Set-Cookie complets) : chaque provider connaît les siens.
  logoutCookies?(): string[];
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

/** Ce que le cœur met à disposition d'un greffon d'authentification (un greffon n'importe pas le cœur). */
export type HarnessApi = {
  registerAuthProvider: typeof registerAuthProvider;
  ensureAccount: (id: string, cap: number) => Promise<void>;   // provisionne un compte à sa 1re visite
  defaultCap: number;
};

// Branche les providers une fois : le local, puis un greffon optionnel (chargé façon plugin depuis
// HARNESS_MODULE ; il appelle registerAuthProvider lui-même).
let wired = false;
export async function wireAuth(): Promise<void> {
  if (wired) return;
  wired = true;
  registerAuthProvider(localProvider);
  const mod = process.env.HARNESS_MODULE;
  if (mod) {
    try {
      const h = (await import(/* @vite-ignore */ mod)) as { register?: (api: HarnessApi) => void | Promise<void> };
      if (typeof h.register === "function") await h.register({ registerAuthProvider, ensureAccount, defaultCap: DEFAULT_CAP });
    } catch (e) {
      console.error("[auth] harnais non chargé:", e instanceof Error ? e.message : e);
    }
  }
}
