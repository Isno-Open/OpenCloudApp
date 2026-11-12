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
/** Texte dans les langues de l'interface (le web indexe par sa propre liste de langues : une langue
 *  ajoutee d'un cote et pas de l'autre est une erreur de compilation). */
export type LocalizedText = { fr: string; en: string };

/** Nature d'un reglage, donc du controle dessine par le coeur. */
export const SETTING_KIND = { toggle: "toggle", number: "number", choice: "choice" } as const;
export type SettingKind = (typeof SETTING_KIND)[keyof typeof SETTING_KIND];
type FieldBase = { key: string; label: LocalizedText; hint?: LocalizedText; under?: string };   // under : case dont il depend
export type SettingField =
  | (FieldBase & { kind: typeof SETTING_KIND.toggle })
  | (FieldBase & { kind: typeof SETTING_KIND.number; min: number; max: number })
  | (FieldBase & { kind: typeof SETTING_KIND.choice; options: readonly { value: string; label: LocalizedText }[] });
export type SettingValue = boolean | number | string;

/** Reglages d'un plugin : il les DECLARE, le coeur dessine l'ecran (meme cadre pour tous) et le plugin
 *  valide. Un plugin externe n'a donc pas a livrer d'interface. */
export type PluginSettings = {
  fields: readonly SettingField[];
  toForm(stored: unknown): Record<string, SettingValue>;      // valeurs affichees, depuis la config
  fromForm(input: Record<string, unknown>): unknown;           // valeur a enregistrer, bornee par le plugin
};

export type Plugin = { id: string; title: string; settings?: PluginSettings; register(api: PluginApi): void | Promise<void> };
export type PluginInfo = { id: string; title: string; builtin: boolean; configurable: boolean };

