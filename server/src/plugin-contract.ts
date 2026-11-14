// Contrat des plugins du portail, a l'execution. Le vocabulaire COMMUN (textes, icones, reglages
// declares) appartient au moteur partage OpenPluginHost (@isno-open/plugin-host/contract) : il est
// reexporte ici, jamais recopie. Ce fichier n'ajoute que ce qui est propre au portail (categories,
// commandes d'appareil, themes). Un plugin du catalogue l'importe a l'execution : l'image du plugin
// livre ce fichier ET le contrat du moteur a cote de son index.js, l'import reecrit vers le voisin
// (voir plugins/example/Dockerfile). Le reste du contrat (plugin-types.ts) n'est importe qu'en type.
import type { PluginSettings as HostPluginSettings, LocalizedText, Icon } from "@isno-open/plugin-host/contract";
export {
  SETTING_KIND, TEXT_FORMAT, IMAGE_MAX_CHARS, IMAGE_TYPES, ICON_MIN_PX,
  type LocalizedText, type Icon, type SettingKind, type TextFormat, type SettingField, type SettingValue,
} from "@isno-open/plugin-host/contract";

/** Categorie d'un plugin : l'ecran Plugins les range ainsi. Dans une categorie EXCLUSIVE, un seul
 *  plugin est actif : en activer un desactive les autres (deux modes de connexion a la fois n'ont pas
 *  de sens). Sans categorie declaree : « autre ». */
export const PLUGIN_CATEGORY = { login: "login", appearance: "appearance", devices: "devices", app: "app", other: "other" } as const;
export type PluginCategory = (typeof PLUGIN_CATEGORY)[keyof typeof PLUGIN_CATEGORY];
export const EXCLUSIVE_CATEGORIES: readonly PluginCategory[] = [PLUGIN_CATEGORY.login];
export const isPluginCategory = (v: unknown): v is PluginCategory => Object.values(PLUGIN_CATEGORY).some((c) => c === v);

/** Reglages d'un plugin (contrat du moteur). Pour un plugin de theme, l'apercu en direct rend un
 *  theme : l'ecran le montre pendant la saisie, et le coeur le verifie comme tout theme. */
export type PluginSettings = Omit<HostPluginSettings, "preview"> & { preview?(input: Record<string, unknown>): ThemeDecl };

/** Les trois commandes d'un appareil, telles que l'app les envoie au relais (/api/cmd). Le relais les
 *  traduit pour le boitier (mqtt.ts) ; un type d'appareil n'en change que les libelles. */
export const DEVICE_ACTION = { up: "UP", stop: "STOP", down: "DOWN" } as const;
export type DeviceAction = (typeof DEVICE_ACTION)[keyof typeof DEVICE_ACTION];

/** Icone d'un type d'appareil : celle du moteur (caractere, trace SVG ou petite image). */
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
