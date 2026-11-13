// Registre des themes. Chaque theme est DECLARE par un plugin (le theme ISNO par un plugin integre,
// actif d'office) et VERIFIE piece par piece : couleurs, familles de polices et logo ont une forme
// stricte, pour que rien de ce qu'un plugin declare ne devienne du CSS ou du HTML arbitraire.
import { THEME_MODE, THEME_SHAPE, type ThemeShape, THEME_TOKENS, IMAGE_MAX_CHARS, IMAGE_TYPES, ICON_MIN_PX, type ThemeDecl, type ThemePalette, type ThemeToken, type LocalizedText } from "./plugin-contract.js";

export const THEME_ID_RE = /^[a-z0-9_-]{1,40}$/;
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[0-9.]+%?\s*,\s*[0-9.]+%?\s*,\s*[0-9.]+%?\s*(,\s*[0-9.]+%?\s*)?\)|hsla?\(\s*[0-9.]+(deg)?\s*,\s*[0-9.]+%\s*,\s*[0-9.]+%\s*(,\s*[0-9.]+%?\s*)?\))$/;
const FONT_RE = /^[A-Za-z0-9 ]{1,40}$/;
const IMAGE_RE = new RegExp(`^data:(${IMAGE_TYPES.map((t) => t.replace(/[/+]/g, "\\$&")).join("|")});base64,[A-Za-z0-9+/]+={0,2}$`);
const PNG_TYPE = IMAGE_TYPES[0];

/** Image en data: URL d'un type accepte et de taille bornee, ou null. */
export const isImageDataUrl = (v: unknown): v is string => typeof v === "string" && v.length <= IMAGE_MAX_CHARS && IMAGE_RE.test(v);
/** Type et octets d'une image deja verifiee. */
export function decodeImage(src: string): { type: string; bytes: Uint8Array<ArrayBuffer> } {
  const comma = src.indexOf(",");
  return { type: src.slice("data:".length, src.indexOf(";")), bytes: new Uint8Array(Buffer.from(src.slice(comma + 1), "base64")) };
}
/** Largeur et hauteur d'un PNG (en-tete IHDR), ou null si ce n'est pas un PNG lisible. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || SIG.some((b, i) => bytes[i] !== b)) return null;
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: v.getUint32(16), height: v.getUint32(20) };
}
/** Pourquoi une image ne peut pas servir d'icone (null : elle peut). Un PNG doit etre carre et assez
 *  grand ; WebP et SVG passent (le SVG est vectoriel, le WebP n'est pas mesure). */
export function iconProblem(src: string): string | null {
  if (!isImageDataUrl(src)) return "image PNG, WebP ou SVG attendue, 100 Ko au plus";
  const img = decodeImage(src);
  if (img.type !== PNG_TYPE) return null;
  const size = pngSize(img.bytes);
  if (!size) return "PNG illisible";
  if (size.width !== size.height) return `icone carree attendue (${size.width}x${size.height})`;
  if (size.width < ICON_MIN_PX) return `icone trop petite (${ICON_MIN_PX} px au moins)`;
  return null;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const isText = (v: unknown): v is LocalizedText => isObj(v) && typeof v.fr === "string" && !!v.fr && typeof v.en === "string" && !!v.en;
const isToken = (k: string): k is ThemeToken => (THEME_TOKENS as readonly string[]).includes(k);

function palette(v: unknown, id: string, which: string): ThemePalette | undefined {
  if (v === undefined) return undefined;
  if (!isObj(v)) throw new Error(`theme ${id} : palette ${which} invalide`);
  const out: ThemePalette = {};
  for (const [k, c] of Object.entries(v)) {
    if (!isToken(k)) throw new Error(`theme ${id} : jeton inconnu « ${k} »`);
    if (typeof c !== "string" || !COLOR_RE.test(c.trim())) throw new Error(`theme ${id} : couleur invalide pour ${k}`);
    out[k] = c.trim();
  }
  return out;
}

/** Declaration verifiee (elle peut venir d'un plugin tiers), ou une erreur qui dit quoi. */
export function asTheme(v: unknown): ThemeDecl {
  if (!isObj(v)) throw new Error("theme : objet attendu");
  const id = v.id;
  if (typeof id !== "string" || !THEME_ID_RE.test(id)) throw new Error(`theme : identifiant invalide « ${String(id)} »`);
  if (!isText(v.label)) throw new Error(`theme ${id} : nom fr et en requis`);
  const out: ThemeDecl = { id, label: v.label };
  const dark = palette(v.dark, id, "sombre"), light = palette(v.light, id, "claire");
  if (dark) out.dark = dark;
  if (light) out.light = light;
  if (v.fonts !== undefined) {
    if (!isObj(v.fonts)) throw new Error(`theme ${id} : polices invalides`);
    const fonts: NonNullable<ThemeDecl["fonts"]> = {};
    for (const k of ["sans", "mono"] as const) {
      const f = v.fonts[k];
      if (f === undefined) continue;
      if (typeof f !== "string" || !FONT_RE.test(f)) throw new Error(`theme ${id} : famille de police invalide (${k})`);
      fonts[k] = f;
    }
    out.fonts = fonts;
  }
  if (v.logo !== undefined) {
    const l = v.logo;
    if (!isObj(l) || !isImageDataUrl(l.src)) throw new Error(`theme ${id} : logo invalide (image PNG, WebP ou SVG en data: URL, 100 Ko au plus)`);
    if (l.srcLight !== undefined && !isImageDataUrl(l.srcLight)) throw new Error(`theme ${id} : logo du mode clair invalide`);
    out.logo = { src: l.src, ...(typeof l.srcLight === "string" ? { srcLight: l.srcLight } : {}), ...(isText(l.alt) ? { alt: l.alt } : {}) };
  }
  if (v.mode !== undefined) {
    const mode = Object.values(THEME_MODE).find((m) => m === v.mode);
    if (!mode) throw new Error(`theme ${id} : mode inconnu « ${String(v.mode)} »`);
    out.mode = mode;
  }
  if (v.shape !== undefined) {
    const shape = Object.values(THEME_SHAPE).find((m) => m === v.shape);
    if (!shape) throw new Error(`theme ${id} : forme inconnue « ${String(v.shape)} »`);
    out.shape = shape;
  }
  if (v.icon !== undefined) {
    const src = isObj(v.icon) ? v.icon.src : undefined;
    const why = typeof src === "string" ? iconProblem(src) : "image attendue";
    if (why !== null || typeof src !== "string") throw new Error(`theme ${id} : icone invalide (${why})`);
    out.icon = { src };
  }
  return out;
}

// Un theme est une declaration fixe, ou une fonction qui la rend : un theme reglable (theme
// personnalise) se relit alors a chaque page, et un reglage enregistre s'applique sans redemarrer.
// La declaration est reverifiee a chaque lecture : ce qu'une fonction rend n'est pas pris sur parole.
const themes = new Map<string, () => unknown>();

/** Theme de BASE, au coeur (pas un plugin : il ne se desactive jamais) : l'identite ISNO, valeurs de
 *  tokens.css, donc rien a redefinir. Le portail y retombe quand le theme choisi n'existe pas ou plus. */
export const BASE_THEME_ID = "isno";
export const BASE_THEME: ThemeDecl = { id: BASE_THEME_ID, label: { fr: "ISNO", en: "ISNO" } };
/** Theme en cours : celui choisi s'il existe, sinon le theme de base. Une seule definition, lue par le
 *  gabarit, l'application installable et la page Plugins. */
export function activeTheme(chosen: string | undefined): ThemeDecl | null {
  return theme(chosen ?? BASE_THEME_ID) ?? theme(BASE_THEME_ID);
}
export function registerTheme(v: unknown): void {
  let source = (): unknown => v;
  if (typeof v === "function") { const fn: Function = v; source = (): unknown => fn(); }
  const t = asTheme(source());
  if (themes.has(t.id)) throw new Error(`theme « ${t.id} » deja declare`);
  themes.set(t.id, source);
}
function read(id: string, source: () => unknown): ThemeDecl | null {
  try {
    const t = asTheme(source());
    if (t.id !== id) throw new Error(`le theme « ${id} » se declare maintenant « ${t.id} »`);
    return t;
  } catch (e) {
    console.error(`[themes] ${id} :`, e instanceof Error ? e.message : e);
    return null;
  }
}
export function theme(id: string): ThemeDecl | null {
  const source = themes.get(id);
  return source ? read(id, source) : null;
}
export const listThemes = (): readonly ThemeDecl[] => [...themes].map(([id, source]) => read(id, source)).filter((t): t is ThemeDecl => t !== null);
export const clearThemes = (): void => { themes.clear(); };   // tests

/** Feuille de style d'un theme : seulement des variables CSS, depuis des valeurs deja verifiees.
 *  Ses selecteurs sont PLUS precis que ceux de tokens.css (:root, :root[data-theme="light"]) : le theme
 *  l'emporte quel que soit l'ordre des feuilles. Une feuille inseree par le navigateur apres un
 *  reglage peut arriver avant celle du portail, et a egalite c'est l'ordre qui deciderait. La palette
 *  sombre ne vaut que hors du mode clair, comme dans tokens.css ; les polices valent dans les deux. */
export const THEME_SELECTOR = { all: ":root:root", dark: ':root:not([data-theme="light"])', light: ':root:root[data-theme="light"]' } as const;
/** Rayons des coins par forme : grand et petit (jetons --radius et --radius-sm de tokens.css). La forme
 *  « round » est celle de tokens.css : rien a redefinir. */
export const SHAPE_RADII: Record<Exclude<ThemeShape, typeof THEME_SHAPE.round>, { radius: string; small: string }> = {
  [THEME_SHAPE.medium]: { radius: "8px", small: "6px" },
  [THEME_SHAPE.square]: { radius: "3px", small: "2px" },
};
export function themeCss(t: ThemeDecl): string {
  const vars = (p: ThemePalette | undefined): string => Object.entries(p ?? {}).map(([k, c]) => `--${k}:${c};`).join("");
  // la police du theme, puis les replis declares une fois dans tokens.css (--font-*-stack)
  const fonts = (t.fonts?.sans ? `--font-sans:'${t.fonts.sans}',var(--font-sans-stack);` : "") + (t.fonts?.mono ? `--font-mono:'${t.fonts.mono}',var(--font-mono-stack);` : "");
  const radii = t.shape && t.shape !== THEME_SHAPE.round ? SHAPE_RADII[t.shape] : null;
  const shape = radii ? `--radius:${radii.radius};--radius-sm:${radii.small};` : "";
  const block = (sel: string, body: string): string => (body ? `${sel}{${body}}` : "");
  return block(THEME_SELECTOR.all, fonts + shape) + block(THEME_SELECTOR.dark, vars(t.dark)) + block(THEME_SELECTOR.light, vars(t.light));
}

/** Feuille Google Fonts des polices du theme, ou null. */
export function themeFontsHref(t: ThemeDecl): string | null {
  const fams = [t.fonts?.sans, t.fonts?.mono].filter((f): f is string => !!f);
  if (!fams.length) return null;
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`).join("&")}&display=swap`;
}
