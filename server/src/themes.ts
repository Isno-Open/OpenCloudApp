// Registre des themes. Chaque theme est DECLARE par un plugin (le theme ISNO par un plugin integre,
// actif d'office) et VERIFIE piece par piece : couleurs, familles de polices et logo ont une forme
// stricte, pour que rien de ce qu'un plugin declare ne devienne du CSS ou du HTML arbitraire.
import { THEME_TOKENS, type ThemeDecl, type ThemePalette, type ThemeToken, type LocalizedText } from "./plugin-contract.js";

export const THEME_ID_RE = /^[a-z0-9_-]{1,40}$/;
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[0-9.]+%?\s*,\s*[0-9.]+%?\s*,\s*[0-9.]+%?\s*(,\s*[0-9.]+%?\s*)?\)|hsla?\(\s*[0-9.]+(deg)?\s*,\s*[0-9.]+%\s*,\s*[0-9.]+%\s*(,\s*[0-9.]+%?\s*)?\))$/;
const FONT_RE = /^[A-Za-z0-9 ]{1,40}$/;
const LOGO_RE = /^data:image\/(png|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;
export const LOGO_MAX_CHARS = 140_000;   // ~100 Ko d'image

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
    if (!isObj(l) || typeof l.src !== "string" || l.src.length > LOGO_MAX_CHARS || !LOGO_RE.test(l.src)) throw new Error(`theme ${id} : logo invalide (image PNG, WebP ou SVG en data: URL, 100 Ko au plus)`);
    out.logo = isText(l.alt) ? { src: l.src, alt: l.alt } : { src: l.src };
  }
  return out;
}

const themes = new Map<string, ThemeDecl>();
export function registerTheme(v: unknown): void {
  const t = asTheme(v);
  if (themes.has(t.id)) throw new Error(`theme « ${t.id} » deja declare`);
  themes.set(t.id, t);
}
export const theme = (id: string): ThemeDecl | null => themes.get(id) ?? null;
export const listThemes = (): readonly ThemeDecl[] => [...themes.values()];
export const clearThemes = (): void => { themes.clear(); };   // tests

/** Feuille de style d'un theme : seulement des variables CSS, depuis des valeurs deja verifiees. */
export function themeCss(t: ThemeDecl): string {
  const vars = (p: ThemePalette | undefined): string => Object.entries(p ?? {}).map(([k, c]) => `--${k}:${c};`).join("");
  // la police du theme, puis les replis declares une fois dans tokens.css (--font-*-stack)
  const fonts = (t.fonts?.sans ? `--font-sans:'${t.fonts.sans}',var(--font-sans-stack);` : "") + (t.fonts?.mono ? `--font-mono:'${t.fonts.mono}',var(--font-mono-stack);` : "");
  const dark = vars(t.dark) + fonts, light = vars(t.light);
  return (dark ? `:root{${dark}}` : "") + (light ? `:root[data-theme="light"]{${light}}` : "");
}

/** Feuille Google Fonts des polices du theme, ou null. */
export function themeFontsHref(t: ThemeDecl): string | null {
  const fams = [t.fonts?.sans, t.fonts?.mono].filter((f): f is string => !!f);
  if (!fams.length) return null;
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`).join("&")}&display=swap`;
}
