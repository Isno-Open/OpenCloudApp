// Plugin integre « Google Home » (cloud-to-cloud), desactive par defaut. Active, l'operateur peut lier
// son compte a Google Home : « OK Google, ouvre le volet ». Le plugin ne porte QUE l'activation (une
// capability) et ses reglages/secrets ; toute la logique HTTP (serveur OAuth + fulfillment Smart Home)
// vit dans le coeur web (web/src/routes/google/...), car un plugin ne peut pas contribuer de route.
//
// Reglages : le client_id / client_secret OAuth que Google presente a notre endpoint de jetons (les
// memes que dans la console Google Home), et la cle de service HomeGraph (pour pousser l'etat, phase 2).
// Le secret de SIGNATURE de nos propres jetons (codes d'autorisation, jetons d'acces) n'est jamais saisi :
// il est CREE a la premiere activation et garde (plugin-secrets.ts), comme le secret du SSO externe.
import { loadConfig } from "../config.js";
import { PLUGIN_CATEGORY, CAPABILITY, SETTING_KIND, TEXT_FORMAT, type Plugin, type PluginSettings } from "../plugin-types.js";
import { ensurePluginSecret } from "../plugin-secrets.js";

export const GOOGLE_HOME_ID = "google-home";

export type GoogleHomeSettings = { clientId: string; clientSecret: string; homeGraphKey: string };
const CLIENT_ID_MAX = 128, CLIENT_SECRET_MAX = 256, HOMEGRAPH_KEY_MAX = 8000;

/** Valeur de chaine d'un reglage, bornee ; vide si absente ou d'un autre type. */
const str = (raw: unknown, key: string): string => {
  const v = raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, key)?.value : undefined;
  return typeof v === "string" ? v.trim() : "";
};
/** La cle HomeGraph peut arriver en texte (JSON colle) ou deja en objet : on la garde toujours en texte. */
const jsonStr = (raw: unknown, key: string): string => {
  const v = raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, key)?.value : undefined;
  if (typeof v === "string") return v.trim();
  if (v !== null && typeof v === "object") { try { return JSON.stringify(v); } catch { return ""; } }
  return "";
};

/** Reglages bornes : une valeur hors forme est remplacee par du vide, jamais gardee telle quelle. */
export function normalizeGoogleHome(raw: unknown): GoogleHomeSettings {
  return {
    clientId: str(raw, "clientId").slice(0, CLIENT_ID_MAX),
    clientSecret: str(raw, "clientSecret").slice(0, CLIENT_SECRET_MAX),
    homeGraphKey: jsonStr(raw, "homeGraphKey").slice(0, HOMEGRAPH_KEY_MAX),
  };
}
/** Reglages courants du plugin (depuis la config du portail). */
export const googleHomeSettings = (): GoogleHomeSettings => normalizeGoogleHome(loadConfig()?.pluginSettings?.[GOOGLE_HOME_ID]);

// Ce qu'un boitier a deja fait savoir a Google : la liste de ses appareils et leur dernier etat pousse.
// Un boitier publie sa sante chaque minute ; sans cette memoire, le meme etat repartait chez Google a
// chaque message. On ne retient une valeur qu'APRES un envoi reussi : un echec se rejoue au message suivant.
export type GooglePushMemory = { ids?: string; states?: string };
export type GooglePushPlan = { ids: string; states: string; sync: boolean; report: boolean };
/** Fonction pure (testable) : que faut-il envoyer a Google pour ces etats, vu ce qu'il sait deja ?
 *  `sync` : la liste des appareils a change (Request Sync). `report` : un etat a change, ou la liste
 *  (Report State). */
export function planGooglePush(known: GooglePushMemory, states: Readonly<Record<string, object>>): GooglePushPlan {
  const sorted = Object.keys(states).sort();
  const ids = sorted.join(",");
  const key = JSON.stringify(sorted.map((id) => [id, states[id]]));
  const sync = known.ids !== ids;
  // Une liste qui change emporte aussi l'etat : un appareil (re)cree chez Google par le SYNC n'a pas
  // d'etat tant qu'on ne le lui pousse pas, meme si le sien n'a pas bouge depuis le dernier envoi.
  return { ids, states: key, sync, report: sorted.length > 0 && (sync || known.states !== key) };
}

/** Fonction pure (testable) : la memoire apres une tentative. `sent` dit ce qui est reellement parti.
 *  Une liste qui a change annule l'etat retenu, que le Request Sync soit parti ou non : tant que le
 *  Report State qui l'accompagne n'a pas reussi, il doit etre rejoue, meme si l'etat n'a pas bouge. */
export function settleGooglePush(known: GooglePushMemory, plan: GooglePushPlan, sent: { sync: boolean; report: boolean }): GooglePushMemory {
  const next: GooglePushMemory = { ...known };
  if (plan.sync) { delete next.states; if (sent.sync) next.ids = plan.ids; }
  if (plan.report && sent.report) next.states = plan.states;
  return next;
}

const settings: PluginSettings = {
  fields: [
    { key: "clientId", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: CLIENT_ID_MAX,
      label: { fr: "Client ID OAuth", en: "OAuth Client ID" },
      hint: { fr: "L'identifiant que Google présente à notre endpoint de jetons (le même que dans la console Google Home Developer).", en: "The ID Google presents to our token endpoint (same as in the Google Home Developer console)." } },
    { key: "clientSecret", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: CLIENT_SECRET_MAX,
      label: { fr: "Client secret OAuth", en: "OAuth Client secret" },
      hint: { fr: "Le secret associé, vérifié à l'échange de jetons (en-tête Authorization Basic).", en: "The matching secret, checked at token exchange (Basic Authorization header)." } },
    { key: "homeGraphKey", kind: SETTING_KIND.json, rows: 6,
      label: { fr: "Clé de service HomeGraph (JSON)", en: "HomeGraph service account key (JSON)" },
      hint: { fr: "Compte de service Google (rôle Service Account Token Creator) pour pousser l'état des appareils (Report State). Facultatif au départ.", en: "Google service account (Service Account Token Creator role) to push device state (Report State). Optional at first." } },
  ],
  toForm: (stored) => ({ ...normalizeGoogleHome(stored) }),
  fromForm: (input) => normalizeGoogleHome(input),
};

export const googleHomePlugin: Plugin = {
  id: GOOGLE_HOME_ID,
  title: { fr: "Google Home", en: "Google Home" },
  // maison stylisee (un seul trace)
  icon: { path: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  category: PLUGIN_CATEGORY.app,
  description: {
    fr: "Pilotez vos volets et portails avec l'app Google Home et l'Assistant Google (« OK Google, ouvre le volet »). Le compte se lie depuis l'app Google Home.",
    en: "Control your shutters and gates with the Google Home app and Google Assistant (\"OK Google, open the shutter\"). The account is linked from the Google Home app.",
  },
  settings,
  register(api) {
    ensurePluginSecret(GOOGLE_HOME_ID);   // secret de signature de nos jetons OAuth, cree a la 1re activation
    api.provideCapability(CAPABILITY.googleHome);
  },
};
