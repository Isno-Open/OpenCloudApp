// Contrat des greffons (voir plugins.ts). Fichier a part : le registre et les greffons integres en
// dependent tous deux, sans dependre l'un de l'autre.
import type { AuthProvider } from "./auth-provider.js";

/** Ce qu'un greffon peut apporter a l'app. Enumere : l'app s'y refere par son nom. */
export const CAPABILITY = {
  localLogin: "localLogin",   // formulaire de connexion e-mail + mot de passe (fourni par le COEUR)
  userAdmin: "userAdmin",     // ecran Utilisateurs (creation, roles, suppression)
  installableApp: "installableApp",   // portail installable comme une application (manifeste, service worker)
} as const;
export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY];

/** Ce que le coeur met a disposition d'un greffon (un greffon n'importe pas le coeur). */
export type PluginApi = {
  registerAuthProvider: (p: AuthProvider) => void;
  provideCapability: (c: Capability) => void;
  ensureAccount: (id: string, cap: number, name?: string) => Promise<void>;   // provisionne un compte (1re visite, annuaire)
  registerDeviceType: (decl: DeviceTypeDecl) => void;          // apporte un type d'appareil (carte, commandes)
  registerTheme: (decl: ThemeDecl | (() => ThemeDecl)) => void;   // apporte un theme ; une fonction : relu a chaque page
  defaultCap: number;
  settings: () => unknown;   // ses reglages tels que ranges (a relire par sa fonction de lecture), relus a chaque appel
};
import type { LocalizedText, PluginSettings, DeviceTypeDecl, ThemeDecl } from "./plugin-contract.js";
export { SETTING_KIND, TEXT_FORMAT, IMAGE_MAX_CHARS, IMAGE_TYPES, ICON_MIN_PX, type SettingKind, type TextFormat, type SettingField, type SettingValue, type LocalizedText, type PluginSettings, type DeviceTypeDecl, type DeviceIcon, type ThemeDecl, type ThemeToken, type ThemePalette, THEME_TOKENS } from "./plugin-contract.js";

/** appliesTheme : theme que le plugin apporte et qui devient celui du portail quand on l'active (un
 *  plugin de theme qui ne changerait rien a son activation laisserait croire qu'il ne marche pas). */
export type Plugin = { id: string; title: string; description?: LocalizedText; settings?: PluginSettings; appliesTheme?: string; register(api: PluginApi): void | Promise<void> };
/** required : toujours actif, ne se desactive pas (le theme de base). */
export type PluginInfo = { id: string; title: string; description?: LocalizedText; builtin: boolean; configurable: boolean; required: boolean };

