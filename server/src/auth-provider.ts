// Point d'extension d'authentification (façon « hooks » WordPress). Le cœur public ne connaît QUE cette
// interface et un registre ; il embarque le provider LOCAL (comptes dans la base). Un harnais privé (dépôt
// séparé) s'enregistre au démarrage pour ajouter un provider (ex. SSO isno.fr), sans forker le cœur.
//
// resolveAccount parcourt les providers dans l'ordre d'enregistrement : le premier qui rend un compte gagne
// (session locale d'abord, SSO ensuite). externalLoginUrl donne l'URL de connexion externe d'un provider SSO.
import { readSession, readSsoSession } from "./session.js";
import { ensureAccount } from "./store.js";
import { DEFAULT_CAP } from "./entitlement.js";

export interface AuthProvider {
  id: string;
  // Rend l'identifiant de compte pour ce cookie, ou null si ce provider ne reconnaît pas la requête.
  resolveAccount(cookie: string | undefined): Promise<string | null>;
  // URL de connexion externe (SSO) vers laquelle renvoyer un visiteur non connecté. null = formulaire local.
  loginUrl?(): string | null;
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
export function externalLoginUrl(): string | null {
  for (const p of providers) { const u = p.loginUrl?.(); if (u) return u; }
  return null;
}

// Provider LOCAL : session self-host (cookie sid signé). Toujours présent dans le cœur.
export const localProvider: AuthProvider = {
  id: "local",
  resolveAccount: (cookie) => Promise.resolve(readSession(cookie) ?? null),
};

// Provider SSO isno.fr : PROVISOIRE dans le cœur, gardé par SSO_SECRET, destiné à migrer dans le harnais
// privé (dépôt séparé). Un cookie SSO valide provisionne le compte au plafond par défaut.
const CLOUD_LOGIN_URL = process.env.CLOUD_LOGIN_URL ?? "";
export const ssoProvider: AuthProvider = {
  id: "sso",
  resolveAccount: async (cookie) => {
    const sso = readSsoSession(cookie);
    if (!sso) return null;
    await ensureAccount(sso, DEFAULT_CAP);
    return sso;
  },
  loginUrl: () => CLOUD_LOGIN_URL || null,
};

// Branche les providers une fois : le local, puis le SSO si configuré, puis un harnais privé optionnel
// (chargé façon plugin depuis HARNESS_MODULE ; il appelle registerAuthProvider lui-même).
let wired = false;
export async function wireAuth(): Promise<void> {
  if (wired) return;
  wired = true;
  registerAuthProvider(localProvider);
  if (process.env.SSO_SECRET) registerAuthProvider(ssoProvider);
  const mod = process.env.HARNESS_MODULE;
  if (mod) {
    try {
      const h = (await import(/* @vite-ignore */ mod)) as { register?: (api: { registerAuthProvider: typeof registerAuthProvider }) => void | Promise<void> };
      if (typeof h.register === "function") await h.register({ registerAuthProvider });
    } catch (e) {
      console.error("[auth] harnais non chargé:", e instanceof Error ? e.message : e);
    }
  }
}
