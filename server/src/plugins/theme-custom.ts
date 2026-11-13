// Plugin integre « Theme personnalise », desactive par defaut. Un theme reglable depuis son ecrou, sans
// ecrire de plugin : nom, mode par defaut, fond, couleurs d'accent (sombre et clair), police, coins,
// logos (sombre et clair) et icone. Active, il devient le theme du portail ; un reglage enregistre
// s'applique a la page suivante (le theme se relit a chaque page), et l'ecran en montre un apercu en
// direct pendant la saisie. Ce qui n'est pas regle reste celui du theme ISNO.
import { loadConfig } from "../config.js";
import { iconProblem, isImageDataUrl } from "../themes.js";
import { PLUGIN_CATEGORY, SETTING_KIND, TEXT_FORMAT, THEME_MODE, THEME_SHAPE, type ThemeMode, type ThemeShape, type Plugin, type PluginSettings, type ThemeDecl, type ThemePalette, type LocalizedText } from "../plugin-types.js";

export const CUSTOM_THEME_PLUGIN_ID = "theme-custom";
export const CUSTOM_THEME_ID = "custom";
const NAME_MAX = 30;
const HEX_RE = /^#[0-9a-f]{6}$/;

// --- Fonds : des teintes DEFINIES (pas de couleur libre : un fond se choisit avec son texte et ses
// bordures, sinon on fabrique un portail illisible). « isno » : celles de tokens.css, rien a redefinir.
export const THEME_TONE = { isno: "isno", graphite: "graphite", black: "black", warm: "warm" } as const;
export type ThemeTone = (typeof THEME_TONE)[keyof typeof THEME_TONE];
type Tone = { label: LocalizedText; dark: ThemePalette; light: ThemePalette };
const TONES: Record<ThemeTone, Tone> = {
  [THEME_TONE.isno]: { label: { fr: "Bleu nuit (ISNO)", en: "Night blue (ISNO)" }, dark: {}, light: {} },
  [THEME_TONE.graphite]: {
    label: { fr: "Graphite", en: "Graphite" },
    dark: { bg: "#16181c", "bg-elev": "#1e2127", "bg-code": "#1a1d22", border: "#2c3038", "border-soft": "#23262d", text: "#eceef2", "text-soft": "#c3c7cf", "text-muted": "#8d939e", "text-faint": "#666c77" },
    light: { bg: "#f3f4f6", "bg-elev": "#ffffff", "bg-code": "#eceef1", border: "#d9dce1", "border-soft": "#e7e9ec", text: "#16181c", "text-soft": "#3a3f48", "text-muted": "#5f6571", "text-faint": "#8c919b" },
  },
  [THEME_TONE.black]: {
    label: { fr: "Noir", en: "Black" },
    dark: { bg: "#000000", "bg-elev": "#101010", "bg-code": "#0a0a0a", border: "#262626", "border-soft": "#1a1a1a", text: "#f2f2f2", "text-soft": "#c8c8c8", "text-muted": "#8f8f8f", "text-faint": "#6a6a6a" },
    light: { bg: "#ffffff", "bg-elev": "#ffffff", "bg-code": "#f2f2f2", border: "#dedede", "border-soft": "#ececec", text: "#0a0a0a", "text-soft": "#333333", "text-muted": "#5c5c5c", "text-faint": "#8a8a8a" },
  },
  [THEME_TONE.warm]: {
    label: { fr: "Chaud", en: "Warm" },
    dark: { bg: "#1c1712", "bg-elev": "#261f18", "bg-code": "#211b15", border: "#3a3027", "border-soft": "#2d251e", text: "#f3ece4", "text-soft": "#d2c6b8", "text-muted": "#a09282", "text-faint": "#7a6d5f" },
    light: { bg: "#faf6f0", "bg-elev": "#fffdf9", "bg-code": "#f3ece2", border: "#e4d9ca", "border-soft": "#efe7dc", text: "#2a2119", "text-soft": "#4d4034", "text-muted": "#7a6a5a", "text-faint": "#a29483" },
  },
};

// --- Polices proposees (familles Google Fonts). Vide : celle d'ISNO.
const FONTS = ["Source Sans 3", "IBM Plex Sans", "Nunito", "Manrope", "Lato"] as const;
const ISNO_FONT = "";

// --- Teintes derivees de l'accent, dans les proportions du theme ISNO (tokens.css) : survol plus clair
// sur fond sombre et plus fonce sur fond clair, fond doux, voile et trait translucides.
const MIX = { hoverDark: 0.2, hoverLight: 0.2, softDark: 0.7, softLight: 0.87, darkenForLight: 0.35 } as const;
const ALPHA = { weakDark: 0.14, lineDark: 0.34, weakLight: 0.1, lineLight: 0.3 } as const;
const WHITE = [255, 255, 255] as const, BLACK = [0, 0, 0] as const;
/** Au-dela de cette luminance, le texte pose sur l'accent passe en noir. */
const LIGHT_ACCENT_LUMINANCE = 0.6;
/** Au-dela de celle-ci, un accent est trop clair pour un fond blanc : le mode clair en prend une version
 *  foncee, sauf si un accent du mode clair est regle. */
const TOO_LIGHT_ON_WHITE = 0.55;

type Rgb = readonly [number, number, number];
const byte = (h: string, i: number): number => parseInt(h.slice(i, i + 2), 16);
const rgb = (h: string): Rgb => [byte(h, 1), byte(h, 3), byte(h, 5)];
const hex = (c: Rgb): string => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const mix = (c: Rgb, to: Rgb, k: number): string => hex([lerp(c[0], to[0], k), lerp(c[1], to[1], k), lerp(c[2], to[2], k)]);
const rgba = (c: Rgb, a: number): string => `rgba(${c.join(", ")}, ${a})`;
const luminance = (c: Rgb): number => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const fgOn = (c: Rgb): string => hex(luminance(c) > LIGHT_ACCENT_LUMINANCE ? BLACK : WHITE);

/** Palettes d'accent sombre et claire. Le mode clair prend `accentLight` s'il est regle, sinon l'accent
 *  lui-meme, fonce s'il est trop clair pour un fond blanc. */
export function accentPalettes(accent: string, accentLight = ""): { dark: ThemePalette; light: ThemePalette } {
  const d = rgb(accent);
  const lightHex = accentLight || (luminance(d) > TOO_LIGHT_ON_WHITE ? mix(d, BLACK, MIX.darkenForLight) : accent);
  const l = rgb(lightHex);
  const hoverDark = mix(d, WHITE, MIX.hoverDark), hoverLight = mix(l, BLACK, MIX.hoverLight);
  return {
    dark: { accent, link: accent, "accent-fg": fgOn(d), "accent-hover": hoverDark, "link-hover": hoverDark, "accent-soft": mix(d, BLACK, MIX.softDark), "accent-weak": rgba(d, ALPHA.weakDark), "accent-line": rgba(d, ALPHA.lineDark) },
    light: { accent: lightHex, link: lightHex, "accent-fg": fgOn(l), "accent-hover": hoverLight, "link-hover": hoverLight, "accent-soft": mix(l, WHITE, MIX.softLight), "accent-weak": rgba(l, ALPHA.weakLight), "accent-line": rgba(l, ALPHA.lineLight) },
  };
}

export type CustomThemeSettings = {
  name: string; mode: ThemeMode; tone: ThemeTone; accent: string; accentLight: string; font: string; shape: ThemeShape;
  logo: string; logoLight: string; icon: string;
};

const own = (raw: unknown, k: string): unknown => (raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, k)?.value : undefined);
const oneOf = <T extends string>(values: readonly T[], v: unknown, fallback: T): T => values.find((x) => x === v) ?? fallback;
const color = (v: unknown): string => { const c = typeof v === "string" ? v.trim().toLowerCase() : ""; return HEX_RE.test(c) ? c : ""; };

/** Reglages bornes : ce qui n'est pas valable retombe sur celui du theme ISNO. */
export function readCustomTheme(raw: unknown): CustomThemeSettings {
  const name = own(raw, "name"), logo = own(raw, "logo"), logoLight = own(raw, "logoLight"), icon = own(raw, "icon");
  return {
    name: typeof name === "string" ? name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX) : "",
    mode: oneOf(Object.values(THEME_MODE), own(raw, "mode"), THEME_MODE.dark),
    tone: oneOf(Object.values(THEME_TONE), own(raw, "tone"), THEME_TONE.isno),
    accent: color(own(raw, "accent")),
    accentLight: color(own(raw, "accentLight")),
    font: oneOf<string>([ISNO_FONT, ...FONTS], own(raw, "font"), ISNO_FONT),
    shape: oneOf(Object.values(THEME_SHAPE), own(raw, "shape"), THEME_SHAPE.round),
    logo: isImageDataUrl(logo) ? logo : "",
    logoLight: isImageDataUrl(logoLight) ? logoLight : "",
    icon: typeof icon === "string" && iconProblem(icon) === null ? icon : "",
  };
}
export const customThemeSettings = (): CustomThemeSettings => readCustomTheme(loadConfig()?.pluginSettings?.[CUSTOM_THEME_PLUGIN_ID]);

const DEFAULT_LABEL = { fr: "Personnalisé", en: "Custom" } as const;
/** Le theme tel que les reglages le decrivent. */
export function customTheme(v: CustomThemeSettings): ThemeDecl {
  const tone = TONES[v.tone];
  const accent = v.accent ? accentPalettes(v.accent, v.accentLight) : { dark: {}, light: {} };
  const t: ThemeDecl = {
    id: CUSTOM_THEME_ID, label: v.name ? { fr: v.name, en: v.name } : DEFAULT_LABEL,
    dark: { ...tone.dark, ...accent.dark }, light: { ...tone.light, ...accent.light },
    mode: v.mode, shape: v.shape,
  };
  if (v.font) t.fonts = { sans: v.font };
  if (v.logo) t.logo = v.logoLight ? { src: v.logo, srcLight: v.logoLight } : { src: v.logo };
  if (v.icon) t.icon = { src: v.icon };
  return t;
}

const L = (fr: string, en: string): LocalizedText => ({ fr, en });
const settings: PluginSettings = {
  fields: [
    { key: "name", kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: NAME_MAX,
      label: L("Nom du thème", "Theme name"), hint: L("Montré sur la carte du thème, page Plugins.", "Shown on the theme's card, Plugins page.") },
    { key: "mode", kind: SETTING_KIND.choice, label: L("Mode par défaut", "Default mode"),
      hint: L("Ce que voit un visiteur qui n'a pas encore choisi. Chacun garde le bouton jour/nuit.", "What a visitor who has not chosen yet sees. Everyone keeps the day/night button."),
      options: [
        { value: THEME_MODE.dark, label: L("Sombre", "Dark") },
        { value: THEME_MODE.light, label: L("Clair", "Light") },
        { value: THEME_MODE.system, label: L("Selon le système", "Follow the system") },
      ] },
    { key: "tone", kind: SETTING_KIND.choice, label: L("Fond", "Background"),
      hint: L("Teinte du fond, des cartes et du texte, en sombre comme en clair.", "Tone of the background, cards and text, in dark and light."),
      options: Object.values(THEME_TONE).map((t) => ({ value: t, label: TONES[t].label })) },
    { key: "accent", kind: SETTING_KIND.color, label: L("Couleur d'accent", "Accent color"),
      hint: L("Boutons, liens, sélection. Les nuances (survol, fonds) en sont tirées.", "Buttons, links, selection. Shades (hover, backgrounds) derive from it.") },
    { key: "accentLight", kind: SETTING_KIND.color, label: L("Couleur d'accent du mode clair", "Light-mode accent color"),
      hint: L("Facultative. Sans elle, l'accent est repris, foncé s'il est trop clair pour un fond blanc.", "Optional. Without it, the accent is reused, darkened if too light for a white background.") },
    { key: "font", kind: SETTING_KIND.choice, label: L("Police", "Typeface"),
      options: [{ value: ISNO_FONT, label: L("Inter (ISNO)", "Inter (ISNO)") }, ...FONTS.map((f) => ({ value: f, label: L(f, f) }))] },
    { key: "shape", kind: SETTING_KIND.choice, label: L("Coins", "Corners"),
      options: [
        { value: THEME_SHAPE.round, label: L("Arrondis (ISNO)", "Rounded (ISNO)") },
        { value: THEME_SHAPE.medium, label: L("Moyens", "Medium") },
        { value: THEME_SHAPE.square, label: L("Carrés", "Square") },
      ] },
    { key: "logo", kind: SETTING_KIND.image, label: L("Logo", "Logo"),
      hint: L("En haut à gauche. PNG, WebP ou SVG, 100 Ko au plus.", "Top left. PNG, WebP or SVG, 100 KB at most.") },
    { key: "logoLight", kind: SETTING_KIND.image, label: L("Logo du mode clair", "Light-mode logo"),
      hint: L("Facultatif : pour un logo clair, qui disparaîtrait sur fond blanc.", "Optional: for a light logo that would vanish on a white background.") },
    { key: "icon", kind: SETTING_KIND.image, square: true, label: L("Icône de l'application", "App icon"),
      hint: L("Onglet du navigateur. Elle sert aussi d'icône à l'application installable : on ne la règle qu'ici. Carrée : PNG de 512 px conseillé, ou SVG.", "Browser tab. It is also the installable app's icon: it is set here only. Square: 512 px PNG recommended, or SVG.") },
  ],
  toForm: (stored) => ({ ...readCustomTheme(stored) }),
  fromForm: (input) => readCustomTheme(input),
  preview: (input) => customTheme(readCustomTheme(input)),
};

export const customThemePlugin: Plugin = {
  id: CUSTOM_THEME_PLUGIN_ID,
  title: { fr: "Thème personnalisé", en: "Custom theme" },
  icon: { path: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6c0-1.4 1-2.4 2.4-2.4H18a3 3 0 0 0 3-3a9 9 0 0 0-9-9M7.5 11.5h.01M10 7.5h.01M15 7.5h.01" },
  category: PLUGIN_CATEGORY.appearance,
  description: {
    fr: "Votre nom, vos couleurs, votre fond, votre police, vos logos et votre icône, réglés depuis l'écrou avec un aperçu en direct. Le pied « Sponsorisé par » reste.",
    en: "Your name, colors, background, typeface, logos and icon, set from the gear with a live preview. The “Sponsored by” footer stays.",
  },
  settings,
  appliesTheme: CUSTOM_THEME_ID,
  register(api) { api.registerTheme(() => customTheme(customThemeSettings())); },
};
