// Plugin integre « Connexion par un site externe » (connexion unique). Desactive par defaut. Un site
// externe (la boutique isno.fr, ou tout autre) pose un cookie de session SIGNE sur un domaine commun
// (format : signed-cookie.ts) ; le portail le verifie avec le meme secret et ouvre la session, en
// creant le compte a la premiere visite.
//
// Reglages (ecrou) : adresse de connexion, adresse de deconnexion, nom et domaine du cookie. Le SECRET
// partage n'est jamais saisi : le plugin le CREE a sa premiere activation et le garde (plugin-secrets.ts),
// meme desactive ; l'ecrou le montre pour qu'on le donne au site externe. SSO_SECRET dans
// l'environnement, s'il est pose (installation existante), a priorite.
import { loadConfig } from "../config.js";
import { SETTING_KIND, TEXT_FORMAT, type Plugin, type PluginSettings } from "../plugin-types.js";
import { cookieValue, readSignedSession } from "../signed-cookie.js";
import { ensurePluginSecret, storedPluginSecret } from "../plugin-secrets.js";
import { signDirectory, DIRECTORY_HEADER } from "../directory-auth.js";
import type { PluginApi } from "../plugin-types.js";

export const EXTERNAL_AUTH_ID = "external-auth";
const ENV_SECRET = process.env.SSO_SECRET ?? "";
/** Secret en vigueur : celui de l'environnement, sinon celui du plugin (cree a la premiere activation). */
const secret = (): string => ENV_SECRET || storedPluginSecret(EXTERNAL_AUTH_ID) || "";

export type ExternalAuthSettings = { loginUrl: string; logoutUrl: string; cookieName: string; cookieDomain: string; directoryUrl: string };
export const EXTERNAL_AUTH_DEFAULTS: ExternalAuthSettings = { loginUrl: "", logoutUrl: "", cookieName: "isno_account", cookieDomain: "", directoryUrl: "" };

const URL_MAX = 500;
const COOKIE_NAME_RE = /^[A-Za-z0-9_-]{1,64}$/;
const COOKIE_DOMAIN_RE = /^\.?[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const str = (raw: unknown, key: string): string => {
  const v = raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, key)?.value : undefined;
  return typeof v === "string" ? v.trim() : "";
};
/** Adresse https valide, sinon vide (le reglage est alors ignore). */
const httpsUrl = (v: string): string => {
  if (!v || v.length > URL_MAX) return "";
  try { return new URL(v).protocol === "https:" ? v : ""; } catch { return ""; }
};

/** Reglages bornes : une valeur hors forme est remplacee par celle par defaut, jamais gardee. */
export function normalizeExternalAuth(raw: unknown): ExternalAuthSettings {
  const name = str(raw, "cookieName"), domain = str(raw, "cookieDomain").toLowerCase();
  return {
    loginUrl: httpsUrl(str(raw, "loginUrl")),
    logoutUrl: httpsUrl(str(raw, "logoutUrl")),
    cookieName: COOKIE_NAME_RE.test(name) ? name : EXTERNAL_AUTH_DEFAULTS.cookieName,
    cookieDomain: COOKIE_DOMAIN_RE.test(domain) ? domain : "",
    directoryUrl: httpsUrl(str(raw, "directoryUrl")),
  };
}
const current = (): ExternalAuthSettings => normalizeExternalAuth(loadConfig()?.pluginSettings?.[EXTERNAL_AUTH_ID]);

const settings: PluginSettings = {
  fields: [
    { key: "secret", kind: SETTING_KIND.secret, label: { fr: "Secret partagé", en: "Shared secret" },
      hint: { fr: "À donner au site externe : il signe son cookie de session avec. Créé à la première activation, gardé même si le plugin est désactivé. S'il est défini, SSO_SECRET dans l'environnement du serveur a priorité.", en: "Give it to the external site: it signs its session cookie with it. Created on first activation, kept even if the plugin is disabled. If set, SSO_SECRET in the server environment takes precedence." } },
    { key: "loginUrl", kind: SETTING_KIND.text, format: TEXT_FORMAT.url, maxLength: URL_MAX, placeholder: "https://exemple.fr/compte?next=https://portail.exemple.fr/",
      label: { fr: "Adresse de connexion", en: "Sign-in address" },
      hint: { fr: "Où envoyer un visiteur non connecté.", en: "Where to send a visitor who is not signed in." } },
    { key: "logoutUrl", kind: SETTING_KIND.text, format: TEXT_FORMAT.url, maxLength: URL_MAX,
      label: { fr: "Adresse de déconnexion (facultative)", en: "Sign-out address (optional)" },
      hint: { fr: "Où envoyer le navigateur après la déconnexion, pour fermer aussi la session du site externe.", en: "Where to send the browser after signing out, to close the external site's session too." } },
    { key: "cookieName", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: 64, label: { fr: "Nom du cookie de session", en: "Session cookie name" } },
    { key: "cookieDomain", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: 253, placeholder: ".exemple.fr",
      label: { fr: "Domaine du cookie (facultatif)", en: "Cookie domain (optional)" },
      hint: { fr: "Domaine commun au site externe et au portail, pour effacer le cookie à la déconnexion.", en: "Domain shared by the external site and the portal, to clear the cookie on sign-out." } },
    { key: "directoryUrl", kind: SETTING_KIND.text, format: TEXT_FORMAT.url, maxLength: URL_MAX, placeholder: "https://exemple.fr/shop/account/directory",
      label: { fr: "Adresse de l'annuaire des comptes (facultative)", en: "Account directory address (optional)" },
      hint: { fr: "Le portail y lit les comptes du site externe (requête signée par le secret partagé) et les crée d'avance : ils apparaissent dans Utilisateurs avant leur première visite.", en: "The portal reads the external site's accounts there (request signed with the shared secret) and creates them in advance: they appear in Users before their first visit." } },
  ],
  toForm: (stored) => ({ ...normalizeExternalAuth(stored), secret: secret() }),
  fromForm: (input) => normalizeExternalAuth(input),
};

// ── Annuaire du site externe : comptes crees d'avance ──
const DIRECTORY_TIMEOUT_MS = 8000;
const DIRECTORY_MAX = 10_000;
const DIRECTORY_EVERY_MS = 15 * 60_000;   // relecture periodique
const DIRECTORY_MIN_GAP_MS = 60_000;      // jamais plus d'une lecture par minute
const EMAIL_RE = /^[^\s@]+@[^\s@]+$/;
let directoryApi: PluginApi | null = null;
let lastSync = 0;
let inflight: Promise<number | null> | null = null;   // lecture en cours : on l'attend plutot que de la sauter

type DirectoryEntry = { email: string; name?: string };
function parseDirectory(body: unknown): DirectoryEntry[] {
  const list = body !== null && typeof body === "object" ? Object.getOwnPropertyDescriptor(body, "accounts")?.value : undefined;
  if (!Array.isArray(list)) return [];
  const out: DirectoryEntry[] = [];
  for (const a of list.slice(0, DIRECTORY_MAX)) {
    const email = str(a, "email").toLowerCase(), name = str(a, "name").slice(0, 80);
    if (EMAIL_RE.test(email)) out.push(name ? { email, name } : { email });
  }
  return out;
}

/** Lit l'annuaire du site externe et cree les comptes manquants. Rend le nombre de comptes lus, ou
 *  null si rien a faire (plugin inactif, pas d'adresse, lecture trop recente) ou si la lecture echoue. */
export function syncExternalDirectory(now: number = Date.now()): Promise<number | null> {
  if (inflight) return inflight;   // ex. ecran Utilisateurs ouvert pendant la lecture du demarrage
  const api = directoryApi, url = current().directoryUrl, key = secret();
  if (!api || !url || !key || now - lastSync < DIRECTORY_MIN_GAP_MS) return Promise.resolve(null);
  lastSync = now;
  inflight = readDirectory(api, url, key, now).finally(() => { inflight = null; });
  return inflight;
}

async function readDirectory(api: PluginApi, url: string, key: string, now: number): Promise<number | null> {
  try {
    const r = await fetch(url, { headers: { [DIRECTORY_HEADER]: signDirectory(key, now) }, signal: AbortSignal.timeout(DIRECTORY_TIMEOUT_MS) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const entries = parseDirectory(await r.json());
    for (const e of entries) await api.ensureAccount(e.email, api.defaultCap, e.name);
    return entries.length;
  } catch (e) {
    console.error(`[plugin ${EXTERNAL_AUTH_ID}] annuaire illisible :`, e instanceof Error ? e.message : e);
    return null;
  }
}

export const externalAuthPlugin: Plugin = {
  id: EXTERNAL_AUTH_ID,
  title: "Connexion par un site externe",
  description: {
    fr: "Connexion unique : un visiteur connecté à un site externe (ex. une boutique) arrive connecté sur le portail, son compte est créé à sa première visite.",
    en: "Single sign-on: a visitor signed in to an external site (e.g. a shop) arrives signed in on the portal, the account is created on first visit.",
  },
  settings,
  register(api) {
    // Premiere activation : le secret partage est cree ici, une fois pour toutes.
    if (!ENV_SECRET) ensurePluginSecret(EXTERNAL_AUTH_ID);
    // annuaire : lu au demarrage puis regulierement (et a l'ouverture de l'ecran Utilisateurs)
    directoryApi = api;
    void syncExternalDirectory();
    setInterval(() => { void syncExternalDirectory(); }, DIRECTORY_EVERY_MS).unref();
    api.registerAuthProvider({
      id: EXTERNAL_AUTH_ID,
      resolveAccount: async (cookie) => {
        const email = readSignedSession(cookieValue(cookie, current().cookieName), secret());
        if (!email) return null;
        await api.ensureAccount(email, api.defaultCap);   // compte cree a la premiere visite
        return email;
      },
      loginUrl: () => current().loginUrl || null,
      logoutUrl: () => current().logoutUrl || null,
      logoutCookies: () => {
        const c = current();
        return [`${c.cookieName}=; ${c.cookieDomain ? `Domain=${c.cookieDomain}; ` : ""}Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`];
      },
    });
  },
};
