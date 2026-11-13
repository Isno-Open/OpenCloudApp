// Vocabulaire des reglages de plugin, SANS aucune dependance : c'est le seul fichier du coeur qu'un
// plugin importe a l'execution (il est livre a cote de son index.js). Le reste du contrat
// (plugin-types.ts) n'est importe qu'en type, efface a la compilation.
/** Texte dans les langues de l'interface (le web indexe par sa propre liste de langues : une langue
 *  ajoutee d'un cote et pas de l'autre est une erreur de compilation). */
export type LocalizedText = { fr: string; en: string };

/** Categorie d'un plugin : l'ecran Plugins les range ainsi. Dans une categorie EXCLUSIVE, un seul
 *  plugin est actif : en activer un desactive les autres (deux modes de connexion a la fois n'ont pas
 *  de sens). Sans categorie declaree : « autre ». */
export const PLUGIN_CATEGORY = { login: "login", appearance: "appearance", devices: "devices", app: "app", other: "other" } as const;
export type PluginCategory = (typeof PLUGIN_CATEGORY)[keyof typeof PLUGIN_CATEGORY];
export const EXCLUSIVE_CATEGORIES: readonly PluginCategory[] = [PLUGIN_CATEGORY.login];
export const isPluginCategory = (v: unknown): v is PluginCategory => Object.values(PLUGIN_CATEGORY).some((c) => c === v);

/** Nature d'un reglage, donc du controle dessine par le coeur. */
export const SETTING_KIND = { toggle: "toggle", number: "number", choice: "choice", text: "text", secret: "secret", color: "color", image: "image" } as const;
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
  | (FieldBase & { kind: typeof SETTING_KIND.secret })
  // couleur : « #rrggbb » (selecteur du navigateur) ; image : fichier televerse, rendu en data: URL
  // (PNG, WebP ou SVG, IMAGE_MAX_CHARS au plus), vide si aucune ; square : une icone (carree, voir
  // themes.ts iconProblem). Le plugin revalide les deux.
  | (FieldBase & { kind: typeof SETTING_KIND.color })
  | (FieldBase & { kind: typeof SETTING_KIND.image; square?: boolean });
export type SettingValue = boolean | number | string;
/** Taille maximale d'une image (logo, icone) en data: URL : ~100 Ko de fichier. */
export const IMAGE_MAX_CHARS = 140_000;
/** Types d'image acceptes, dans un champ image comme dans un theme. */
export const IMAGE_TYPES = ["image/png", "image/webp", "image/svg+xml"] as const;
/** Plus petite icone acceptee (cote, en pixels) : en dessous, floue sur un ecran d'accueil. */
export const ICON_MIN_PX = 48;

/** Reglages d'un plugin : il les DECLARE, le coeur dessine l'ecran (meme cadre pour tous) et le plugin
 *  valide. Un plugin externe n'a donc pas a livrer d'interface. */
export type PluginSettings = {
  fields: readonly SettingField[];
  toForm(stored: unknown): Record<string, SettingValue>;      // valeurs affichees, depuis la config
  fromForm(input: Record<string, unknown>): unknown;           // valeur a enregistrer, bornee par le plugin
  // facultatif, pour un plugin de theme : le theme tel que ces valeurs (non enregistrees) le donneraient.
  // L'ecran le montre en direct pendant la saisie ; le coeur le verifie comme tout theme.
  preview?(input: Record<string, unknown>): ThemeDecl;
};


/** Les trois commandes d'un appareil, telles que l'app les envoie au relais (/api/cmd). Le relais les
 *  traduit pour le boitier (mqtt.ts) ; un type d'appareil n'en change que les libelles. */
export const DEVICE_ACTION = { up: "UP", stop: "STOP", down: "DOWN" } as const;
export type DeviceAction = (typeof DEVICE_ACTION)[keyof typeof DEVICE_ACTION];

/** Icone d'un type d'appareil : un caractere (emoji) ou un trace SVG (attribut d d'un path, 24x24,
 *  dessine au trait par le coeur). Jamais de balisage : un plugin ne peut pas injecter de HTML. */
export type Icon = { glyph: string } | { path: string } | { src: string };
export type DeviceIcon = Icon;

/** Type d'appareil DECLARE par un plugin. `id` est le type tel que le boitier le publie (attrs.type) ;
 *  le coeur dessine la carte (icone, nom, trois commandes UP/STOP/DOWN) avec ces libelles. Ce qui est
 *  positionnel ou non vient du boitier lui-meme, pas du type. */
export type DeviceTypeDecl = {
  id: string;
  label: LocalizedText;
  icon: DeviceIcon;
  actions: { up: LocalizedText; stop: LocalizedText; down: LocalizedText };
};

/** Jetons de couleur qu'un theme peut redefinir (variables CSS du portail, --<nom>). Leurs valeurs par
 *  defaut vivent dans web/src/lib/styles/tokens.css ; un banc verifie que chaque nom y existe. */
export const THEME_TOKENS = [
  "bg", "bg-elev", "bg-code", "text", "text-soft", "text-muted", "text-faint", "border", "border-soft",
  "accent", "accent-hover", "accent-soft", "accent2", "link", "link-hover", "ok", "ok-soft",
  "accent-fg", "accent-weak", "accent-line", "warn", "danger",
] as const;
export type ThemeToken = (typeof THEME_TOKENS)[number];
export type ThemePalette = Partial<Record<ThemeToken, string>>;

/** Mode d'affichage par defaut d'un theme (le visiteur peut toujours basculer, son choix est garde). */
export const THEME_MODE = { dark: "dark", light: "light", system: "system" } as const;
export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];
/** Forme des coins (cartes, champs, boutons). round : celle d'ISNO (tokens.css). */
export const THEME_SHAPE = { round: "round", medium: "medium", square: "square" } as const;
export type ThemeShape = (typeof THEME_SHAPE)[keyof typeof THEME_SHAPE];

/** Theme DECLARE par un plugin : couleurs (sombre et clair), polices (familles Google Fonts) et logo
 *  (image en data: URL, PNG, WebP ou SVG, montree comme une image). Rien de libre : ni CSS, ni
 *  balisage. Le pied « powered by » n'est pas thematisable. */
export type ThemeDecl = {
  id: string;
  label: LocalizedText;
  dark?: ThemePalette;
  light?: ThemePalette;
  fonts?: { sans?: string; mono?: string };
  // srcLight : logo du mode clair (un logo blanc disparait sur fond clair) ; sans lui, le meme partout
  logo?: { src: string; srcLight?: string; alt?: LocalizedText };
  mode?: ThemeMode;
  shape?: ThemeShape;
  // icone de l'application : onglet du navigateur, ecran d'accueil (PWA). Carree ; PNG de 512 px
  // conseille (un PNG non carre est refuse), ou SVG.
  icon?: { src: string };
};
