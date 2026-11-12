// Registre des types d'appareils. Le coeur n'en connait AUCUN en dur : chacun est declare par un
// plugin (volet et portail par des plugins integres, actives d'office). Un type que le boitier publie
// et qu'aucun plugin ne declare est montre comme « appareil inconnu », sans commandes.
import type { DeviceTypeDecl, LocalizedText } from "./plugin-contract.js";

export const DEVICE_TYPE_ID_RE = /^[a-z0-9_-]{1,40}$/;
const GLYPH_MAX = 4;
const PATH_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9 .,-]{1,2000}$/;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const isText = (v: unknown): v is LocalizedText => isObj(v) && typeof v.fr === "string" && !!v.fr && typeof v.en === "string" && !!v.en;

/** Declaration verifiee piece par piece (elle peut venir d'un plugin tiers), ou une erreur qui dit quoi. */
export function asDeviceType(v: unknown): DeviceTypeDecl {
  if (!isObj(v)) throw new Error("type d'appareil : objet attendu");
  const id = v.id;
  if (typeof id !== "string" || !DEVICE_TYPE_ID_RE.test(id)) throw new Error(`type d'appareil : identifiant invalide « ${String(id)} »`);
  if (!isText(v.label)) throw new Error(`type ${id} : nom fr et en requis`);
  const icon = v.icon, actions = v.actions;
  let checkedIcon: DeviceTypeDecl["icon"];
  if (isObj(icon) && typeof icon.glyph === "string" && icon.glyph.length > 0 && [...icon.glyph].length <= GLYPH_MAX) checkedIcon = { glyph: icon.glyph };
  else if (isObj(icon) && typeof icon.path === "string" && PATH_RE.test(icon.path)) checkedIcon = { path: icon.path };
  else throw new Error(`type ${id} : icone invalide (un caractere, ou un trace SVG)`);
  if (!isObj(actions) || !isText(actions.up) || !isText(actions.stop) || !isText(actions.down)) throw new Error(`type ${id} : libelles des commandes up, stop, down requis`);
  return { id, label: v.label, icon: checkedIcon, actions: { up: actions.up, stop: actions.stop, down: actions.down } };
}

const types = new Map<string, DeviceTypeDecl>();
/** Enregistre un type. Deux plugins ne declarent pas le meme : le premier garde la main. */
export function registerDeviceType(v: unknown): void {
  const d = asDeviceType(v);
  if (types.has(d.id)) throw new Error(`type d'appareil « ${d.id} » deja declare`);
  types.set(d.id, d);
}
export const deviceType = (id: string): DeviceTypeDecl | null => types.get(id) ?? null;
export const deviceTypes = (): readonly DeviceTypeDecl[] => [...types.values()];
export const clearDeviceTypes = (): void => { types.clear(); };   // tests
