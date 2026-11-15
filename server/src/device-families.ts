// Registre des FAMILLES de boitiers (contrat : family-contract.ts, docs/FAMILLES.md) et etat vu des
// boitiers. Le coeur ne connait aucune famille en dur : chacune est declaree par un plugin. Tout ce
// qu'un plugin declare ou rend (famille, faits, commandes) est VERIFIE ici avant d'etre pris : c'est du
// code venu d'ailleurs, et c'est le coeur qui garde l'isolation des boitiers.
import { SETTING_KIND, TEXT_FORMAT, type LocalizedText, type SettingValue } from "./plugin-contract.js";
import { asIcon } from "./icons.js";
import {
  FAMILY_CONTRACT, CONTROL, FACT, EVENT_LEVEL, DEVICE_SETTING, KIND_PLACE,
  type ControlDecl, type ControlValue, type CommandTarget, type EventLevel, type Fact, type FamilyDecl, type KindDecl, type BoxHealth, type BoxNetwork, type BoxControlDecl, type DeviceSettingField, type DevicesField,
} from "./family-contract.js";

/** Identifiant de famille = champ `firmware` d'un boitier ; racine de topics ; identifiants internes. */
export const FAMILY_ID_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/;
export const TOPIC_ROOT_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
/** Identifiant d'un boitier (CN de son certificat), d'un appareil, d'un type, d'un controle. */
export const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
/** Un chemin de commande : segments simples, sans joker MQTT ni remontee. */
const PATH_RE = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+){0,7}$/;
const PATH_MAX = 128;
const PAYLOAD_MAX = 512;
const TEXT_MAX = 200;
const EVENTS_MAX = 50;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const isText = (v: unknown): v is LocalizedText =>
  isObj(v) && typeof v.fr === "string" && !!v.fr && v.fr.length <= TEXT_MAX && typeof v.en === "string" && !!v.en && v.en.length <= TEXT_MAX;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function asControl(v: unknown, where: string): ControlDecl {
  if (!isObj(v) || typeof v.id !== "string" || !NAME_RE.test(v.id)) throw new Error(`${where} : controle sans identifiant valable`);
  const id = v.id, at = `${where}/${id}`;
  if (!isText(v.label)) throw new Error(`${at} : libelle fr et en requis`);
  const label = v.label;
  switch (v.kind) {
    case CONTROL.action: {
      const icon = v.icon === undefined ? null : asIcon(v.icon);
      if (v.icon !== undefined && !icon) throw new Error(`${at} : icone invalide`);
      if (v.confirm !== undefined && !isText(v.confirm)) throw new Error(`${at} : confirmation fr et en`);
      return { kind: CONTROL.action, id, label, ...(icon ? { icon } : {}), ...(v.confirm !== undefined ? { confirm: v.confirm } : {}) };
    }
    case CONTROL.toggle: return { kind: CONTROL.toggle, id, label };
    case CONTROL.setpoint:
      if (!isNum(v.min) || !isNum(v.max) || !isNum(v.step) || v.step <= 0 || v.min >= v.max || typeof v.unit !== "string" || v.unit.length > 16)
        throw new Error(`${at} : consigne mal bornee (min < max, pas > 0, unite)`);
      return { kind: CONTROL.setpoint, id, label, min: v.min, max: v.max, step: v.step, unit: v.unit };
    case CONTROL.position:
      if (typeof v.settable !== "boolean") throw new Error(`${at} : position reglable ou non (settable)`);
      return { kind: CONTROL.position, id, label, settable: v.settable };
    case CONTROL.reading: {
      if (v.unit !== undefined && (typeof v.unit !== "string" || v.unit.length > 16)) throw new Error(`${at} : unite invalide`);
      if ((v.alertBelow !== undefined && !isNum(v.alertBelow)) || (v.alertAbove !== undefined && !isNum(v.alertAbove))) throw new Error(`${at} : seuil invalide`);
      return { kind: CONTROL.reading, id, label,
        ...(typeof v.unit === "string" ? { unit: v.unit } : {}),
        ...(isNum(v.alertBelow) ? { alertBelow: v.alertBelow } : {}),
        ...(isNum(v.alertAbove) ? { alertAbove: v.alertAbove } : {}) };
    }
    default: throw new Error(`${at} : controle inconnu « ${String(v.kind)} »`);
  }
}

/** Natures de reglage permises sur un appareil : pas de secret, d'image ni de JSON libre sur un boitier. */
const DEVICE_SETTING_KINDS: readonly string[] = [SETTING_KIND.number, SETTING_KIND.toggle, SETTING_KIND.choice, SETTING_KIND.text, DEVICE_SETTING.devices];
/** Plus longue liste d'appareils choisis (borne de taille, le boitier a ses propres limites). */
const PICKED_DEVICES_MAX = 64;
const TEXT_SETTING_MAX = 200;

function asSetting(v: unknown, where: string): DeviceSettingField {
  if (!isObj(v) || typeof v.key !== "string" || !NAME_RE.test(v.key)) throw new Error(`${where} : reglage sans cle valable`);
  const key = v.key, at = `${where}/reglage ${key}`;
  if (!isText(v.label)) throw new Error(`${at} : libelle fr et en requis`);
  if (typeof v.kind !== "string" || !DEVICE_SETTING_KINDS.includes(v.kind)) throw new Error(`${at} : nature « ${String(v.kind)} » non permise sur un appareil`);
  const base = { key, label: v.label, ...(isText(v.hint) ? { hint: v.hint } : {}) };
  switch (v.kind) {
    case SETTING_KIND.number:
      if (!isNum(v.min) || !isNum(v.max) || v.min >= v.max) throw new Error(`${at} : bornes min < max requises`);
      return { ...base, kind: SETTING_KIND.number, min: v.min, max: v.max };
    case SETTING_KIND.toggle: return { ...base, kind: SETTING_KIND.toggle };
    case SETTING_KIND.choice: {
      const opts = Array.isArray(v.options) ? v.options : [];
      if (opts.length === 0 || !opts.every((o) => isObj(o) && typeof o.value === "string" && o.value.length <= 64 && isText(o.label))) throw new Error(`${at} : options valeur et libelle requises`);
      return { ...base, kind: SETTING_KIND.choice, options: opts as { value: string; label: LocalizedText }[] };
    }
    case DEVICE_SETTING.devices: {
      const kinds = Array.isArray(v.kinds) ? v.kinds : [];
      if (kinds.length === 0 || !kinds.every((k) => typeof k === "string" && NAME_RE.test(k))) throw new Error(`${at} : types choisissables requis`);
      return { ...base, kind: DEVICE_SETTING.devices, kinds: kinds as string[] };
    }
    default:
      if (!isNum(v.maxLength) || v.maxLength < 1 || v.maxLength > TEXT_SETTING_MAX) throw new Error(`${at} : longueur maximale de 1 a ${TEXT_SETTING_MAX}`);
      return { ...base, kind: SETTING_KIND.text, format: TEXT_FORMAT.plain, maxLength: v.maxLength };
  }
}

/** Valeur acceptable pour ce reglage ? */
function settingFits(f: DeviceSettingField, v: unknown): v is SettingValue {
  switch (f.kind) {
    case SETTING_KIND.number: return isNum(v) && v >= f.min && v <= f.max;
    case SETTING_KIND.toggle: return typeof v === "boolean";
    case SETTING_KIND.choice: return typeof v === "string" && f.options.some((o) => o.value === v);
    case SETTING_KIND.text: return typeof v === "string" && v.length <= f.maxLength;
    // forme seulement : l'existence des appareils se verifie a l'enregistrement (pickedDevicesOk), un
    // boitier pouvant annoncer une centrale avant ses membres
    case DEVICE_SETTING.devices: return Array.isArray(v) && v.length <= PICKED_DEVICES_MAX && v.every((x) => typeof x === "string" && NAME_RE.test(x)) && new Set(v).size === v.length;
    default: return false;
  }
}

function asKind(v: unknown, family: string): KindDecl {
  if (!isObj(v) || typeof v.id !== "string" || !NAME_RE.test(v.id)) throw new Error(`famille ${family} : type sans identifiant valable`);
  const at = `famille ${family}, type ${v.id}`;
  if (!isText(v.label)) throw new Error(`${at} : nom fr et en requis`);
  const icon = asIcon(v.icon);
  if (!icon) throw new Error(`${at} : icone invalide`);
  if (!Array.isArray(v.controls) || v.controls.length === 0) throw new Error(`${at} : au moins un controle`);
  const controls = v.controls.map((c) => asControl(c, at));
  if (new Set(controls.map((c) => c.id)).size !== controls.length) throw new Error(`${at} : deux controles ont le meme identifiant`);
  const settings = v.settings === undefined ? [] : Array.isArray(v.settings) ? v.settings.map((x) => asSetting(x, at)) : null;
  if (!settings) throw new Error(`${at} : reglages en liste`);
  if (new Set(settings.map((x) => x.key)).size !== settings.length) throw new Error(`${at} : deux reglages ont la meme cle`);
  if (v.place !== undefined && v.place !== KIND_PLACE.home && v.place !== KIND_PLACE.box) throw new Error(`${at} : emplacement « ${String(v.place)} » inconnu`);
  if (v.place === KIND_PLACE.box && !isText(v.group)) throw new Error(`${at} : sur la page du boitier, un onglet (group fr et en) requis`);
  const place = v.place === KIND_PLACE.box && isText(v.group) ? { place: KIND_PLACE.box, group: v.group } : {};
  return { id: v.id, label: v.label, icon, controls, ...(settings.length ? { settings } : {}), ...place };
}

function asBoxControl(v: unknown, family: string): BoxControlDecl {
  if (!isObj(v) || typeof v.id !== "string" || !NAME_RE.test(v.id)) throw new Error(`famille ${family} : action du boitier sans identifiant valable`);
  if (!isText(v.label)) throw new Error(`famille ${family}, action ${v.id} : libelle fr et en requis`);
  if (v.confirm !== undefined && !isText(v.confirm)) throw new Error(`famille ${family}, action ${v.id} : confirmation fr et en`);
  return { id: v.id, label: v.label, ...(isText(v.confirm) ? { confirm: v.confirm } : {}) };
}

/** Declaration verifiee piece par piece (elle vient d'un plugin), ou une erreur qui dit quoi. */
export function asFamily(v: unknown): FamilyDecl {
  if (!isObj(v)) throw new Error("famille : objet attendu");
  const id = v.id;
  if (typeof id !== "string" || !FAMILY_ID_RE.test(id)) throw new Error(`famille : identifiant invalide « ${String(id)} »`);
  if (v.contract !== FAMILY_CONTRACT) throw new Error(`famille ${id} : contrat ${String(v.contract)}, ce portail suit le contrat ${FAMILY_CONTRACT}`);
  if (!isText(v.label)) throw new Error(`famille ${id} : nom fr et en requis`);
  const icon = asIcon(v.icon);
  if (!icon) throw new Error(`famille ${id} : icone invalide`);
  if (typeof v.topicRoot !== "string" || !TOPIC_ROOT_RE.test(v.topicRoot)) throw new Error(`famille ${id} : racine de topics invalide`);
  if (!Array.isArray(v.kinds) || v.kinds.length === 0) throw new Error(`famille ${id} : au moins un type d'appareil`);
  const kinds = v.kinds.map((k) => asKind(k, id));
  if (new Set(kinds.map((k) => k.id)).size !== kinds.length) throw new Error(`famille ${id} : deux types ont le meme identifiant`);
  const boxControls = v.boxControls === undefined ? [] : Array.isArray(v.boxControls) ? v.boxControls.map((c) => asBoxControl(c, id)) : null;
  if (!boxControls) throw new Error(`famille ${id} : actions du boitier en liste`);
  if (new Set(boxControls.map((c) => c.id)).size !== boxControls.length) throw new Error(`famille ${id} : deux actions du boitier ont le meme identifiant`);
  const read = v.read, command = v.command, configure = v.configure, reorder = v.reorder;
  if (reorder !== undefined && typeof reorder !== "function") throw new Error(`famille ${id} : reorder() doit etre une fonction`);
  if (typeof read !== "function" || typeof command !== "function") throw new Error(`famille ${id} : read() et command() requis`);
  if (configure !== undefined && typeof configure !== "function") throw new Error(`famille ${id} : configure() doit etre une fonction`);
  if (configure === undefined && kinds.some((k) => k.settings?.length)) throw new Error(`famille ${id} : des reglages sans configure()`);
  // un choix d'appareils ne nomme que des types de la famille
  for (const k of kinds) for (const st of k.settings ?? []) if (st.kind === DEVICE_SETTING.devices)
    for (const t of st.kinds) if (!kinds.some((x) => x.id === t)) throw new Error(`famille ${id}, type ${k.id}/reglage ${st.key} : type « ${t} » inconnu`);
  return {
    id, label: v.label, icon, contract: FAMILY_CONTRACT, topicRoot: v.topicRoot, kinds, ...(boxControls.length ? { boxControls } : {}),
    read: (msg) => read.call(v, msg) as readonly Fact[],
    command: (target, control, value) => command.call(v, target, control, value) as ReturnType<FamilyDecl["command"]>,
    ...(typeof configure === "function" ? { configure: (target: Required<CommandTarget>, values: Readonly<Record<string, SettingValue>>) => configure.call(v, target, values) as ReturnType<NonNullable<FamilyDecl["configure"]>> } : {}),
    ...(typeof reorder === "function" ? { reorder: (target: Required<CommandTarget>, rank: number) => reorder.call(v, target, rank) as ReturnType<NonNullable<FamilyDecl["reorder"]>> } : {}),
  };
}

// ── Registre ──
const families = new Map<string, FamilyDecl>();
const listeners: ((f: FamilyDecl) => void)[] = [];
/** Enregistre une famille. Deux plugins ne declarent ni le meme identifiant, ni la meme racine. */
export function registerDeviceFamily(v: unknown): void {
  const f = asFamily(v);
  if (families.has(f.id)) throw new Error(`famille « ${f.id} » deja declaree`);
  if ([...families.values()].some((o) => o.topicRoot === f.topicRoot)) throw new Error(`racine de topics « ${f.topicRoot} » deja prise`);
  families.set(f.id, f);
  for (const l of listeners) l(f);
}
/** Le relais s'abonne a la racine de chaque famille, y compris celles enregistrees apres lui. */
export function onFamilyRegistered(l: (f: FamilyDecl) => void): void {
  listeners.push(l);
  for (const f of families.values()) l(f);
}
export const familyById = (id: string): FamilyDecl | null => families.get(id) ?? null;
export const deviceFamilies = (): readonly FamilyDecl[] => [...families.values()];
export const familyByRoot = (root: string): FamilyDecl | null => [...families.values()].find((f) => f.topicRoot === root) ?? null;
export const clearDeviceFamilies = (): void => { families.clear(); boxes.clear(); };   // tests

// ── Etat vu des boitiers, cle `<famille>/<boitier>` ──
/** kind : le type tel que le boitier le declare ; known : la famille le connait (sinon l'appareil est
 *  montre « inconnu », sans commandes : un firmware plus recent que son plugin, par exemple). */
export type DeviceState = { kind: string; known: boolean; name: string; hidden: ReadonlySet<string>; values: Map<string, ControlValue>; settings: Map<string, SettingValue>; rank: number | null };
export type BoxEvent = { at: number; level: EventLevel; code: string; text: LocalizedText; device?: string };
export type BoxState = { online: boolean | null; firmware: string | null; latest: string | null; trial: boolean | null; previous: string | null;
  actions: Map<string, boolean>; health: BoxHealth; network: BoxNetwork; devices: Map<string, DeviceState>; events: BoxEvent[] };
const boxes = new Map<string, BoxState>();
const key = (family: string, box: string): string => `${family}/${box}`;
export const boxState = (family: string, box: string): BoxState | null => boxes.get(key(family, box)) ?? null;

/** Valeur acceptable pour ce controle (celle qu'un boitier publie, ou qu'un utilisateur envoie). */
function valueFits(c: ControlDecl, v: unknown): v is ControlValue {
  switch (c.kind) {
    case CONTROL.action: return false;                          // un bouton n'a pas d'etat
    case CONTROL.toggle: return typeof v === "boolean";
    case CONTROL.position: return isNum(v) && v >= 0 && v <= 100;
    case CONTROL.setpoint: return isNum(v) && v >= c.min && v <= c.max;
    case CONTROL.reading: return isNum(v) || (typeof v === "string" && v.length <= TEXT_MAX);
  }
}

/** Sante verifiee champ par champ (bornes plausibles), ou null si un champ est faux. */
function asHealth(v: unknown): BoxHealth | null {
  if (!isObj(v)) return null;
  const out: BoxHealth = {};
  const num = (k: "rssiDbm" | "uptimeS" | "freeHeap" | "minFreeHeap", min: number, max: number): boolean => {
    const x = v[k];
    if (x === undefined) return true;
    if (!isNum(x) || x < min || x > max) return false;
    out[k] = x;
    return true;
  };
  if (!num("rssiDbm", -127, 0) || !num("uptimeS", 0, 10 * 365 * 86400) || !num("freeHeap", 0, 64 * 1024 * 1024) || !num("minFreeHeap", 0, 64 * 1024 * 1024)) return null;
  if (v.lastReset !== undefined) { if (!isText(v.lastReset)) return null; out.lastReset = v.lastReset; }
  return out;
}
/** Reseau verifie (textes courts), ou null. */
function asNetwork(v: unknown): BoxNetwork | null {
  if (!isObj(v)) return null;
  const out: BoxNetwork = {};
  for (const k of ["ssid", "ip", "broker"] as const) {
    const x = v[k];
    if (x === undefined) continue;
    if (typeof x !== "string" || x.length > 160) return null;
    out[k] = x;
  }
  return out;
}

/** Applique les faits rendus par une famille pour un boitier. Un fait mal forme est ecarte seul, et
 *  rendu dans la liste des refus (journal) : il ne casse ni les autres faits, ni le relais. */
export function applyFacts(f: FamilyDecl, box: string, facts: unknown, now: number): string[] {
  const refused: string[] = [];
  if (!Array.isArray(facts)) return ["read() n'a pas rendu une liste"];
  let s = boxes.get(key(f.id, box));
  if (!s) { s = { online: null, firmware: null, latest: null, trial: null, previous: null, actions: new Map(), health: {}, network: {}, devices: new Map(), events: [] }; boxes.set(key(f.id, box), s); }
  for (const x of facts) {
    if (!isObj(x)) { refused.push("fait : objet attendu"); continue; }
    switch (x.fact) {
      case FACT.presence:
        if (typeof x.online === "boolean") s.online = x.online; else refused.push("presence : online booleen");
        break;
      case FACT.device: {
        // type vide : le boitier n'en declare aucun (appareil montre inconnu, et dit tel quel)
        if (typeof x.device !== "string" || !NAME_RE.test(x.device) || typeof x.kind !== "string" || (x.kind !== "" && !NAME_RE.test(x.kind))) { refused.push(`appareil : identifiant ou type invalide (${String(x.kind)})`); break; }
        const kind = f.kinds.find((k) => k.id === x.kind);
        const hidden = kind && Array.isArray(x.hidden) ? x.hidden.filter((h): h is string => typeof h === "string" && kind.controls.some((c) => c.id === h)) : [];
        const name = typeof x.name === "string" && x.name.length > 0 && x.name.length <= 64 ? x.name : s.devices.get(x.device)?.name ?? x.device;
        const prev = s.devices.get(x.device);
        // un appareil qui change de type repart d'un etat vide (les valeurs d'avant ne veulent plus rien dire)
        // reglages : seulement ceux que le type declare, chacun dans ses bornes ; un reglage absent garde sa valeur
        const settings = prev && prev.kind === x.kind ? prev.settings : new Map<string, SettingValue>();
        if (kind && isObj(x.settings)) for (const field of kind.settings ?? []) {
          const sv = x.settings[field.key];
          if (sv !== undefined) { if (settingFits(field, sv)) settings.set(field.key, sv); else refused.push(`reglage refuse (${x.device}/${field.key})`); }
        }
        const rank = isNum(x.rank) && Number.isInteger(x.rank) && x.rank >= 1 && x.rank <= 999 ? x.rank : x.rank === undefined ? prev?.rank ?? null : null;
        if (x.rank !== undefined && rank === null) refused.push(`rang refuse (${x.device})`);
        s.devices.set(x.device, { kind: x.kind, known: !!kind, name, hidden: new Set(hidden), values: prev && prev.kind === x.kind ? prev.values : new Map(), settings, rank });
        break;
      }
      case FACT.gone:
        if (typeof x.device === "string" && NAME_RE.test(x.device)) s.devices.delete(x.device); else refused.push("disparu : identifiant invalide");
        break;
      case FACT.state: {
        const d = typeof x.device === "string" ? s.devices.get(x.device) : undefined;
        const c = d?.known ? f.kinds.find((k) => k.id === d.kind)?.controls.find((k) => k.id === x.control) : undefined;
        if (!d || !c || !valueFits(c, x.value)) { refused.push(`etat : appareil, controle ou valeur refuses (${String(x.device)}/${String(x.control)})`); break; }
        d.values.set(c.id, x.value);
        break;
      }
      case FACT.box:
        if (x.firmware !== undefined) { if (typeof x.firmware === "string" && x.firmware.length <= 64) s.firmware = x.firmware; else refused.push("boitier : version invalide"); }
        if (x.latest !== undefined) { if (typeof x.latest === "string" && x.latest.length <= 64) s.latest = x.latest; else refused.push("boitier : derniere version invalide"); }
        if (x.health !== undefined) { const h = asHealth(x.health); if (h) s.health = { ...s.health, ...h }; else refused.push("boitier : sante invalide"); }
        if (x.network !== undefined) { const n = asNetwork(x.network); if (n) s.network = { ...s.network, ...n }; else refused.push("boitier : reseau invalide"); }
        if (x.trial !== undefined) { if (typeof x.trial === "boolean") s.trial = x.trial; else refused.push("boitier : essai booleen"); }
        if (x.previous !== undefined) { if (typeof x.previous === "string" && x.previous.length <= 64) s.previous = x.previous || null; else refused.push("boitier : version precedente invalide"); }
        if (x.actions !== undefined) {
          if (!isObj(x.actions)) refused.push("boitier : actions en objet");
          else for (const [id, on] of Object.entries(x.actions)) {
            if (typeof on === "boolean" && (f.boxControls ?? []).some((c) => c.id === id)) s.actions.set(id, on);
            else refused.push(`boitier : action « ${id} » non declaree`);
          }
        }
        break;
      case FACT.event: {
        const levelOk = Object.values(EVENT_LEVEL).some((l) => l === x.level);
        if (!levelOk || typeof x.code !== "string" || !NAME_RE.test(x.code) || !isText(x.text)) { refused.push("evenement : niveau, code ou texte invalides"); break; }
        const device = typeof x.device === "string" && s.devices.has(x.device) ? x.device : undefined;
        s.events.unshift({ at: now, level: x.level as EventLevel, code: x.code, text: x.text, ...(device ? { device } : {}) });
        s.events.length = Math.min(s.events.length, EVENTS_MAX);
        break;
      }
      default: refused.push(`fait inconnu « ${String(x.fact)} »`);
    }
  }
  return refused;
}

/** Un message du broker : `<racine>/<boitier>/<chemin>`. Rend la famille et le boitier concernes (ou
 *  null) et applique ce que la famille en lit. Une famille qui leve une erreur est journalisee, rien de
 *  plus. */
export function applyMessage(topic: string, payload: string, retained: boolean, now: number): { family: FamilyDecl; box: string; refused: string[] } | null {
  const m = /^([^/]+)\/([^/]+)\/(.+)$/.exec(topic);
  if (!m) return null;
  const f = familyByRoot(m[1]!);
  const box = m[2]!;
  if (!f || !NAME_RE.test(box)) return null;
  let facts: unknown;
  try { facts = f.read({ box, path: m[3]!, payload, retained }); }
  catch (e) { return { family: f, box, refused: [`read() a echoue : ${e instanceof Error ? e.message : String(e)}`] }; }
  return { family: f, box, refused: applyFacts(f, box, facts, now) };
}

/** Commande d'un utilisateur vers un appareil (ou le boitier entier) : verifiee contre ce que la famille
 *  declare et ce que le boitier a montre, traduite par la famille, puis verifiee encore. Rend le topic et
 *  la charge a publier, ou une erreur qui dit quoi. Le topic est TOUJOURS sous `<racine>/<boitier>/`. */
export function buildCommand(f: FamilyDecl, target: CommandTarget, control: string, value: unknown): { topic: string; payload: string; retain: boolean } | { error: string } {
  if (!NAME_RE.test(target.box)) return { error: "boitier invalide" };
  let v: ControlValue | null = null;
  if (target.device === undefined) {
    if (!(f.boxControls ?? []).some((c) => c.id === control)) return { error: "action du boitier inconnue" };
    if (boxState(f.id, target.box)?.actions.get(control) !== true) return { error: "action du boitier impossible maintenant" };
  } else {
    const d = boxState(f.id, target.box)?.devices.get(target.device);
    if (!d || !d.known) return { error: "appareil inconnu" };
    const c = f.kinds.find((k) => k.id === d.kind)?.controls.find((k) => k.id === control);
    if (!c || d.hidden.has(c.id)) return { error: "controle inconnu" };
    if (c.kind === CONTROL.reading || (c.kind === CONTROL.position && !c.settable)) return { error: "controle en lecture seule" };
    if (c.kind !== CONTROL.action) {
      if (!valueFits(c, value)) return { error: "valeur hors bornes" };
      v = value;
    }
  }
  let cmd: unknown;
  try { cmd = f.command(target, control, v); }
  catch (e) { return { error: `la famille a refuse : ${e instanceof Error ? e.message : String(e)}` }; }
  return checkCommand(f, target.box, cmd);
}

/** Commande traduite par une famille : bornee a `<racine>/<boitier>/` avant d'etre publiee. */
function checkCommand(f: FamilyDecl, box: string, cmd: unknown): { topic: string; payload: string; retain: boolean } | { error: string } {
  if (!isObj(cmd)) return { error: "commande non prise en charge" };
  // segments simples, et aucun fait seulement de points (`..` remonterait vers un autre boitier)
  if (typeof cmd.path !== "string" || cmd.path.length > PATH_MAX || !PATH_RE.test(cmd.path) || cmd.path.split("/").some((s) => /^\.+$/.test(s)))
    return { error: "chemin de commande refuse" };
  if (typeof cmd.payload !== "string" || cmd.payload.length > PAYLOAD_MAX) return { error: "charge refusee" };
  return { topic: `${f.topicRoot}/${box}/${cmd.path}`, payload: cmd.payload, retain: cmd.retain === true };
}

/** Deplacer un appareil (glisser sa carte) : appareil de CE boitier, rang entier de 1 au nombre de ses
 *  appareils, traduit par la famille puis borne au boitier comme une commande. */
export function buildReorder(f: FamilyDecl, target: Required<CommandTarget>, rank: unknown): { topic: string; payload: string; retain: boolean } | { error: string } {
  if (!f.reorder) return { error: "cette famille ne reorganise pas ses appareils" };
  if (!NAME_RE.test(target.box)) return { error: "boitier invalide" };
  const devices = boxState(f.id, target.box)?.devices;
  if (!devices?.has(target.device)) return { error: "appareil inconnu" };
  if (!isNum(rank) || !Number.isInteger(rank) || rank < 1 || rank > devices.size) return { error: "rang hors bornes" };
  let cmd: unknown;
  try { cmd = f.reorder(target, rank); }
  catch (e) { return { error: `la famille a refuse : ${e instanceof Error ? e.message : String(e)}` }; }
  return checkCommand(f, target.box, cmd);
}

/** Ordre d'affichage des appareils d'un boitier : par rang (1 = premier), ceux sans rang a la suite dans
 *  l'ordre des types que la famille declare (ex. les centrales d'abord), puis par nom. */
export function compareDevices(f: FamilyDecl, a: DeviceState, b: DeviceState): number {
  const kindAt = (d: DeviceState): number => { const i = f.kinds.findIndex((k) => k.id === d.kind); return i < 0 ? f.kinds.length : i; };
  return (a.rank ?? Infinity) - (b.rank ?? Infinity) || kindAt(a) - kindAt(b) || a.name.localeCompare(b.name);
}

/** Appareils choisis : chacun existe sur CE boitier, d'un type permis, et n'est pas l'appareil lui-meme. */
function pickedDevicesOk(f: FamilyDecl, target: Required<CommandTarget>, field: DevicesField, v: SettingValue): boolean {
  const devices = boxState(f.id, target.box)?.devices;
  return Array.isArray(v) && !!devices && v.every((id) => {
    const d = id === target.device ? undefined : devices.get(id);
    return !!d && field.kinds.includes(d.kind);
  });
}

/** Reglages d'un utilisateur pour un appareil : chaque valeur verifiee contre les champs de son type
 *  (cle connue, dans ses bornes), traduits par la famille, puis bornes au boitier comme une commande. */
export function buildConfigure(f: FamilyDecl, target: Required<CommandTarget>, values: unknown): { topic: string; payload: string; retain: boolean } | { error: string } {
  if (!NAME_RE.test(target.box)) return { error: "boitier invalide" };
  const d = boxState(f.id, target.box)?.devices.get(target.device);
  if (!d || !d.known) return { error: "appareil inconnu" };
  const fields = f.kinds.find((k) => k.id === d.kind)?.settings ?? [];
  if (!fields.length || !f.configure) return { error: "cet appareil n'a pas de reglages" };
  if (!isObj(values)) return { error: "valeurs attendues" };
  const out: Record<string, SettingValue> = {};
  for (const [k, val] of Object.entries(values)) {
    const field = fields.find((x) => x.key === k);
    if (!field) return { error: `reglage inconnu « ${k} »` };
    if (!settingFits(field, val)) return { error: `valeur hors bornes pour « ${k} »` };
    if (field.kind === DEVICE_SETTING.devices && !pickedDevicesOk(f, target, field, val)) return { error: `appareil non permis dans « ${k} »` };
    out[k] = val;
  }
  if (!Object.keys(out).length) return { error: "aucun reglage" };
  let cmd: unknown;
  try { cmd = f.configure(target, out); }
  catch (e) { return { error: `la famille a refuse : ${e instanceof Error ? e.message : String(e)}` }; }
  return checkCommand(f, target.box, cmd);
}
