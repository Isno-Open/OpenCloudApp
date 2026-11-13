// Icone declaree par un plugin (type d'appareil, carte de plugin) : un caractere, un trace SVG (attribut
// d d'un path, 24x24, dessine au trait par le coeur) ou une petite image en data: URL. UNE seule
// verification pour toutes : rien de ce qu'un plugin declare ne devient du balisage.
import type { Icon } from "./plugin-contract.js";
import { isImageDataUrl } from "./themes.js";

const GLYPH_MAX = 4;
const PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]{1,2000}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

/** Icone verifiee, ou null si elle n'a aucune des trois formes permises. */
export function asIcon(v: unknown): Icon | null {
  if (!isObj(v)) return null;
  if (typeof v.glyph === "string" && v.glyph.length > 0 && [...v.glyph].length <= GLYPH_MAX) return { glyph: v.glyph };
  if (typeof v.path === "string" && PATH_RE.test(v.path)) return { path: v.path };
  if (isImageDataUrl(v.src)) return { src: v.src };
  return null;
}
