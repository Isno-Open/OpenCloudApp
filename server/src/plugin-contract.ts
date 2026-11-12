// Vocabulaire des reglages de plugin, SANS aucune dependance : c'est le seul fichier du coeur qu'un
// plugin importe a l'execution (il est livre a cote de son index.js). Le reste du contrat
// (plugin-types.ts) n'est importe qu'en type, efface a la compilation.
/** Texte dans les langues de l'interface (le web indexe par sa propre liste de langues : une langue
 *  ajoutee d'un cote et pas de l'autre est une erreur de compilation). */
export type LocalizedText = { fr: string; en: string };

/** Nature d'un reglage, donc du controle dessine par le coeur. */
export const SETTING_KIND = { toggle: "toggle", number: "number", choice: "choice", text: "text", secret: "secret" } as const;
export type SettingKind = (typeof SETTING_KIND)[keyof typeof SETTING_KIND];
/** Forme d'un reglage texte : libre, ou adresse web (le navigateur aide a la saisie ; le plugin valide). */
export const TEXT_FORMAT = { plain: "plain", url: "url" } as const;
export type TextFormat = (typeof TEXT_FORMAT)[keyof typeof TEXT_FORMAT];
type FieldBase = { key: string; label: LocalizedText; hint?: LocalizedText; under?: string };   // under : case dont il depend
export type SettingField =
  | (FieldBase & { kind: typeof SETTING_KIND.toggle })
  | (FieldBase & { kind: typeof SETTING_KIND.number; min: number; max: number })
  | (FieldBase & { kind: typeof SETTING_KIND.choice; options: readonly { value: string; label: LocalizedText }[] })
  | (FieldBase & { kind: typeof SETTING_KIND.text; format: TextFormat; maxLength: number; placeholder?: string })
  // secret : valeur cree et gardee par le plugin, MONTREE (masquee, a copier) mais jamais saisie ni renvoyee
  | (FieldBase & { kind: typeof SETTING_KIND.secret });
export type SettingValue = boolean | number | string;

/** Reglages d'un plugin : il les DECLARE, le coeur dessine l'ecran (meme cadre pour tous) et le plugin
 *  valide. Un plugin externe n'a donc pas a livrer d'interface. */
export type PluginSettings = {
  fields: readonly SettingField[];
  toForm(stored: unknown): Record<string, SettingValue>;      // valeurs affichees, depuis la config
  fromForm(input: Record<string, unknown>): unknown;           // valeur a enregistrer, bornee par le plugin
};


/** Les trois commandes d'un appareil, telles que l'app les envoie au relais (/api/cmd). Le relais les
 *  traduit pour le boitier (mqtt.ts) ; un type d'appareil n'en change que les libelles. */
export const DEVICE_ACTION = { up: "UP", stop: "STOP", down: "DOWN" } as const;
export type DeviceAction = (typeof DEVICE_ACTION)[keyof typeof DEVICE_ACTION];

/** Icone d'un type d'appareil : un caractere (emoji) ou un trace SVG (attribut d d'un path, 24x24,
 *  dessine au trait par le coeur). Jamais de balisage : un plugin ne peut pas injecter de HTML. */
export type DeviceIcon = { glyph: string } | { path: string };

/** Type d'appareil DECLARE par un plugin. `id` est le type tel que le boitier le publie (attrs.type) ;
 *  le coeur dessine la carte (icone, nom, trois commandes UP/STOP/DOWN) avec ces libelles. Ce qui est
 *  positionnel ou non vient du boitier lui-meme, pas du type. */
export type DeviceTypeDecl = {
  id: string;
  label: LocalizedText;
  icon: DeviceIcon;
  actions: { up: LocalizedText; stop: LocalizedText; down: LocalizedText };
};
