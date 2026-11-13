// Contrat des greffons (voir plugins.ts). Fichier a part : le registre et les greffons integres en
// dependent tous deux, sans dependre l'un de l'autre.
import type { AuthProvider } from "./auth-provider.js";

/** Ce qu'un greffon peut apporter a l'app. Enumere : l'app s'y refere par son nom. */
export const CAPABILITY = {
  localLogin: "localLogin",   // formulaire de connexion e-mail + mot de passe (fourni par le COEUR)
  // creer des comptes DANS le portail (onglet « Nouvel utilisateur », invitations) ; l'ecran Utilisateurs
  // lui-meme (liste, role, plafond, suppression) est au coeur, toujours la
  accountCreation: "accountCreation",
  installableApp: "installableApp",   // portail installable comme une application (manifeste, service worker)
} as const;
export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY];

/** Ce que le coeur met a disposition d'un greffon (un greffon n'importe pas le coeur). */
export type PluginApi = {
  registerAuthProvider: (p: AuthProvider) => void;
  provideCapability: (c: Capability) => void;
  ensureAccount: (id: string, cap: number, name?: string) => Promise<void>;   // provisionne un compte (1re visite, annuaire) ; le plugin en devient la source
  reconcileAccounts: (present: readonly string[]) => Promise<number>;         // ses comptes absents de cette liste sont marques (jamais supprimes)
  registerDeviceType: (decl: DeviceTypeDecl) => void;          // apporte un type d'appareil (carte, commandes)
  registerTheme: (decl: ThemeDecl | (() => ThemeDecl)) => void;   // apporte un theme ; une fonction : relu a chaque page
  defaultCap: number;
  settings: () => unknown;   // ses reglages tels que ranges (a relire par sa fonction de lecture), relus a chaque appel
};
import type { LocalizedText, PluginSettings, DeviceTypeDecl, ThemeDecl, PluginCategory } from "./plugin-contract.js";
export { THEME_MODE, THEME_SHAPE, type ThemeMode, type ThemeShape, PLUGIN_CATEGORY, EXCLUSIVE_CATEGORIES, isPluginCategory, type PluginCategory, SETTING_KIND, TEXT_FORMAT, IMAGE_MAX_CHARS, IMAGE_TYPES, ICON_MIN_PX, type SettingKind, type TextFormat, type SettingField, type SettingValue, type LocalizedText, type PluginSettings, type DeviceTypeDecl, type DeviceIcon, type ThemeDecl, type ThemeToken, type ThemePalette, THEME_TOKENS } from "./plugin-contract.js";

/** appliesTheme : theme que le plugin apporte et qui devient celui du portail quand on l'active (un
 *  plugin de theme qui ne changerait rien a son activation laisserait croire qu'il ne marche pas). */
/** category : sa place sur l'ecran Plugins (voir PLUGIN_CATEGORY). accountSource : nom court de
 *  l'origine des comptes qu'il cree (ex. « www.isno.fr »), montre dans Utilisateurs. */
export type Plugin = {
  id: string; title: LocalizedText; description?: LocalizedText; category?: PluginCategory; settings?: PluginSettings; appliesTheme?: string;
  accountSource?: () => string;
  register(api: PluginApi): void | Promise<void>;
};
export type PluginInfo = { id: string; title: LocalizedText; description?: LocalizedText; category: PluginCategory; builtin: boolean; configurable: boolean; appliesTheme?: string };

