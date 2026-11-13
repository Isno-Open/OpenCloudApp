// Plugin integre « Theme personnalise », desactive par defaut. Un theme reglable depuis son ecrou, sans
// ecrire de plugin : nom, couleur d'accent, logo et icone televerses. Active, il devient le theme du
// portail ; un reglage enregistre s'applique a la page suivante (le theme se relit a chaque page).
// Ce qui n'est pas regle reste celui du theme ISNO (couleurs de fond, polices, logo, icone).
import { loadConfig } from "../config.js";
import { iconProblem, isImageDataUrl } from "../themes.js";
import { SETTING_KIND, TEXT_FORMAT, type Plugin, type PluginSettings, type ThemeDecl, type ThemePalette } from "../plugin-types.js";

export const CUSTOM_THEME_PLUGIN_ID = "theme-custom";
export const CUSTOM_THEME_ID = "custom";
const NAME_MAX = 30;
const HEX_RE = /^#[0-9a-f]{6}$/;

export type CustomThemeSettings = { name: string; accent: string; logo: string; icon: string };

// Teintes derivees de l'accent, dans les proportions du theme ISNO (tokens.css) : survol plus clair sur
// fond sombre et plus fonce sur fond clair, fond doux, voile et trait translucides.
const MIX = { hoverDark: 0.2, hoverLight: 0.2, softDark: 0.7, softLight: 0.87 } as const;
const ALPHA = { weakDark: 0.14, lineDark: 0.34, weakLight: 0.1, lineLight: 0.3 } as const;
const WHITE = [255, 255, 255] as const, BLACK = [0, 0, 0] as const;
/** Au-dela de cette luminance, le texte pose sur l'accent passe en noir. */
const LIGHT_ACCENT_LUMINANCE = 0.6;

type Rgb = readonly [number, number, number];
const byte = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16);
const rgb = (h: string): Rgb => [byte(h, 1), byte(h, 3), byte(h, 5)];
const hex = (c: Rgb): string => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const mix = (c: Rgb, to: Rgb, k: number): string => hex([lerp(c[0], to[0], k), lerp(c[1], to[1], k), lerp(c[2], to[2], k)]);
const rgba = (c: Rgb, a: number): string => `rgba(${c.join(", ")}, ${a})`;
const luminance = (c: Rgb): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;

/** Palettes sombre et claire tirees d'une seule couleur d'accent. */
export function accentPalettes(accent: string): { dark: ThemePalette; light: ThemePalette } {
  const c = rgb(accent);
  const fg = hex(luminance(c) > LIGHT_ACCENT_LUMINANCE ? BLACK : WHITE);
  const common: ThemePalette = { accent, link: accent, "accent-fg": fg };
  const hoverDark = mix(c, WHITE, MIX.hoverDark), hoverLight = mix(c, BLACK, MIX.hoverLight);
  return {
    dark: { ...common, "accent-hover": hoverDark, "link-hover": hoverDark, "accent-soft": mix(c, BLACK, MIX.softDark), "accent-weak": rgba(c, ALPHA.weakDark), "accent-line": rgba(c, ALPHA.lineDark) },
    light: { ...common, "accent-hover": hoverLight, "link-hover": hoverLight, "accent-soft": mix(c, WHITE, MIX.softLight), "accent-weak": rgba(c, ALPHA.weakLight), "accent-line": rgba(c, ALPHA.lineLight) },
  };
}

const own = (raw: unknown, k: string): unknown => (raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, k)?.value : undefined);
/** Reglages bornes : ce qui n'est pas valable est vide (donc celui du theme ISNO). */
function read(raw: unknown): CustomThemeSettings {
  const name = own(raw, "name"), accent = own(raw, "accent"), logo = own(raw, "logo"), icon = own(raw, "icon");
  const color = typeof accent === "string" ? accent.trim().toLowerCase() : "";
  return {
    name: typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX) : "",
    accent: HEX_RE.test(color) ? color : "",
    logo: isImageDataUrl(logo) ? logo : "",
    icon: typeof icon === "string" && iconProblem(icon) === null ? icon : "",
  };
}
export const customThemeSettings = (): CustomThemeSettings => read(loadConfig()?.pluginSettings?.[CUSTOM_THEME_PLUGIN_ID]);

const DEFAULT_LABEL = { fr: "Personnalisé", en: "Custom" } as const;
/** Le theme tel que les reglages le decrivent. */
export function customTheme(v: CustomThemeSettings): ThemeDecl {
  const t: ThemeDecl = { id: CUSTOM_THEME_ID, label: v.name ? { fr: v.name, en: v.name } : DEFAULT_LABEL };
  if (v.accent) Object.assign(t, accentPalettes(v.accent));
  if (v.logo) t.logo = { src: v.logo };
  if (v.icon) t.icon = { src: v.icon };
  return t;
}

const settings: PluginSettings = {
  fields: [
    { key: "name", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: NAME_MAX,
      label: { fr: "Nom du thème", en: "Theme name" }, hint: { fr: "Tel qu'il apparaît dans Paramètres.", en: "As shown in Settings." } },
    { key: "accent", kind: SETTING_KIND.color, label: { fr: "Couleur d'accent", en: "Accent color" },
      hint: { fr: "Boutons, liens, sélection. Les nuances (survol, fonds) en sont tirées.", en: "Buttons, links, selection. Shades (hover, backgrounds) derive from it." } },
    { key: "logo", kind: SETTING_KIND.image, label: { fr: "Logo", en: "Logo" },
      hint: { fr: "En haut à gauche. PNG, WebP ou SVG, 100 Ko au plus.", en: "Top left. PNG, WebP or SVG, 100 KB at most." } },
    { key: "icon", kind: SETTING_KIND.image, square: true, label: { fr: "Icône de l'application", en: "App icon" },
      hint: { fr: "Onglet du navigateur et écran d'accueil. Carrée : PNG de 512 px conseillé, ou SVG.", en: "Browser tab and home screen. Square: 512 px PNG recommended, or SVG." } },
  ],
  toForm: (stored) => ({ ...read(stored) }),
  fromForm: (input) => read(input),
};

export const customThemePlugin: Plugin = {
  id: CUSTOM_THEME_PLUGIN_ID,
  title: "Thème personnalisé",
  description: {
    fr: "Votre nom, votre couleur, votre logo et votre icône, réglés depuis l'écrou. Le pied « powered by » reste.",
    en: "Your name, color, logo and icon, set from the gear. The “powered by” footer stays.",
  },
  settings,
  appliesTheme: CUSTOM_THEME_ID,
  register(api) { api.registerTheme(() => customTheme(customThemeSettings())); },
};
