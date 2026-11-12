// Contrat des greffons (voir plugins.ts). Fichier a part : le registre et les greffons integres en
// dependent tous deux, sans dependre l'un de l'autre.
import type { AuthProvider } from "./auth-provider.js";

/** Ce qu'un greffon peut apporter a l'app. Enumere : l'app s'y refere par son nom. */
export const CAPABILITY = {
  localLogin: "localLogin",   // formulaire de connexion e-mail + mot de passe
  userAdmin: "userAdmin",     // ecran Utilisateurs (creation, roles, suppression)
} as const;
export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY];

/** Ce que le coeur met a disposition d'un greffon (un greffon n'importe pas le coeur). */
export type PluginApi = {
  registerAuthProvider: (p: AuthProvider) => void;
  provideCapability: (c: Capability) => void;
  ensureAccount: (id: string, cap: number) => Promise<void>;   // provisionne un compte a sa 1re visite
  defaultCap: number;
};
import type { LocalizedText, PluginSettings } from "./plugin-contract.js";
export { SETTING_KIND, type SettingKind, type SettingField, type SettingValue, type LocalizedText, type PluginSettings } from "./plugin-contract.js";

export type Plugin = { id: string; title: string; description?: LocalizedText; settings?: PluginSettings; register(api: PluginApi): void | Promise<void> };
/** Plugin charge. signIn : il fournit un moyen de se connecter (on ne retire jamais le dernier). */
export type PluginInfo = { id: string; title: string; description?: LocalizedText; builtin: boolean; configurable: boolean; signIn: boolean };

