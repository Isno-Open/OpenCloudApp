// Plugin integre « Connexion par un site externe » (connexion unique). Desactive par defaut. Un site
// externe (la boutique isno.fr, ou tout autre) pose un cookie de session SIGNE sur un domaine commun
// (format : signed-cookie.ts) ; le portail le verifie avec le meme secret et ouvre la session, en
// creant le compte a la premiere visite.
//
// Reglages (ecrou) : adresse de connexion, adresse de deconnexion, nom et domaine du cookie. Le SECRET
// n'est jamais un reglage : il vit dans l'environnement du serveur (SSO_SECRET), ni affiche ni en base.
import { loadConfig } from "../config.js";
import { SETTING_KIND, TEXT_FORMAT, type Plugin, type PluginSettings } from "../plugin-types.js";
import { cookieValue, readSignedSession } from "../signed-cookie.js";

export const EXTERNAL_AUTH_ID = "external-auth";
const SECRET = process.env.SSO_SECRET ?? "";

export type ExternalAuthSettings = { loginUrl: string; logoutUrl: string; cookieName: string; cookieDomain: string };
export const EXTERNAL_AUTH_DEFAULTS: ExternalAuthSettings = { loginUrl: "", logoutUrl: "", cookieName: "isno_account", cookieDomain: "" };

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
  };
}
const current = (): ExternalAuthSettings => normalizeExternalAuth(loadConfig()?.pluginSettings?.[EXTERNAL_AUTH_ID]);

const settings: PluginSettings = {
  fields: [
    { key: "loginUrl", kind: SETTING_KIND.text, format: TEXT_FORMAT.url, maxLength: URL_MAX, placeholder: "https://exemple.fr/compte?next=https://portail.exemple.fr/",
      label: { fr: "Adresse de connexion", en: "Sign-in address" },
      hint: { fr: "Où envoyer un visiteur non connecté. Le secret partagé avec ce site se règle dans l'environnement du serveur (SSO_SECRET), jamais ici.", en: "Where to send a visitor who is not signed in. The secret shared with that site is set in the server environment (SSO_SECRET), never here." } },
    { key: "logoutUrl", kind: SETTING_KIND.text, format: TEXT_FORMAT.url, maxLength: URL_MAX,
      label: { fr: "Adresse de déconnexion (facultative)", en: "Sign-out address (optional)" },
      hint: { fr: "Où envoyer le navigateur après la déconnexion, pour fermer aussi la session du site externe.", en: "Where to send the browser after signing out, to close the external site's session too." } },
    { key: "cookieName", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: 64, label: { fr: "Nom du cookie de session", en: "Session cookie name" } },
    { key: "cookieDomain", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: 253, placeholder: ".exemple.fr",
      label: { fr: "Domaine du cookie (facultatif)", en: "Cookie domain (optional)" },
      hint: { fr: "Domaine commun au site externe et au portail, pour effacer le cookie à la déconnexion.", en: "Domain shared by the external site and the portal, to clear the cookie on sign-out." } },
  ],
  toForm: (stored) => ({ ...normalizeExternalAuth(stored) }),
  fromForm: (input) => normalizeExternalAuth(input),
};

export const externalAuthPlugin: Plugin = {
  id: EXTERNAL_AUTH_ID,
  title: "Connexion par un site externe",
  description: {
    fr: "Connexion unique : un visiteur connecté à un site externe (ex. une boutique) arrive connecté sur le portail, son compte est créé à sa première visite.",
    en: "Single sign-on: a visitor signed in to an external site (e.g. a shop) arrives signed in on the portal, the account is created on first visit.",
  },
  settings,
  register(api) {
    if (!SECRET) { console.error(`[plugin ${EXTERNAL_AUTH_ID}] SSO_SECRET absent : connexion externe inactive`); return; }
    api.registerAuthProvider({
      id: EXTERNAL_AUTH_ID,
      resolveAccount: async (cookie) => {
        const email = readSignedSession(cookieValue(cookie, current().cookieName), SECRET);
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
