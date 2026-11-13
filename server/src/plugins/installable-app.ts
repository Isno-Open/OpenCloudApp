// Plugin integre « Application installable » (PWA), desactive par defaut. Active, le portail
// s'installe sur un telephone ou un ordinateur comme une application : manifeste (nom du portail,
// icones, ouverture en plein ecran) et service worker minimal (page « portail injoignable » hors
// connexion ; aucune donnee gardee en cache). L'icone est le logo du theme s'il en a un.
import { loadConfig } from "../config.js";
import { PLUGIN_CATEGORY, CAPABILITY, SETTING_KIND, TEXT_FORMAT, type Plugin, type PluginSettings } from "../plugin-types.js";

export const INSTALLABLE_APP_ID = "installable-app";
/** Longueur maximale du nom court (sous l'icone de l'ecran d'accueil). */
export const SHORT_NAME_MAX = 12;

export type InstallableAppSettings = { shortName: string };
const read = (raw: unknown): InstallableAppSettings => {
  const v = raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, "shortName")?.value : undefined;
  return { shortName: typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, SHORT_NAME_MAX) : "" };
};
/** Reglages courants (nom court vide : le nom du portail, raccourci). */
export const installableAppSettings = (): InstallableAppSettings => read(loadConfig()?.pluginSettings?.[INSTALLABLE_APP_ID]);

const settings: PluginSettings = {
  fields: [
    { key: "shortName", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: SHORT_NAME_MAX,
      label: { fr: "Nom sous l'icône", en: "Name under the icon" },
      hint: { fr: `${SHORT_NAME_MAX} caractères au plus. Vide : le nom du portail.`, en: `${SHORT_NAME_MAX} characters at most. Empty: the portal name.` } },
  ],
  toForm: (stored) => ({ ...read(stored) }),
  fromForm: (input) => read(input),
};

export const installableAppPlugin: Plugin = {
  id: INSTALLABLE_APP_ID,
  title: { fr: "Application installable", en: "Installable app" },
  icon: { path: "M7 2h10v20H7zM11 18h2M12 6v6M9.5 9.5L12 12l2.5-2.5" },
  category: PLUGIN_CATEGORY.app,
  description: {
    fr: "Le portail s'installe sur un téléphone ou un ordinateur comme une application. Son icône est celle du thème en cours (Apparence).",
    en: "The portal installs on a phone or computer like an app. Its icon is the current theme's (Appearance).",
  },
  settings,
  register(api) { api.provideCapability(CAPABILITY.installableApp); },
};
