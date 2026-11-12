// Vocabulaire des reglages de plugin, SANS aucune dependance : c'est le seul fichier du coeur qu'un
// plugin importe a l'execution (il est livre a cote de son index.js). Le reste du contrat
// (plugin-types.ts) n'est importe qu'en type, efface a la compilation.
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

