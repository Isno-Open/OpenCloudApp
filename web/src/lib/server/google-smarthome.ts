// Fulfillment « Smart Home » de Google Home (cloud-to-cloud) : repond aux intentions SYNC / QUERY /
// EXECUTE / DISCONNECT pour un compte deja identifie (jeton d'acces, voir google-oauth.ts).
//
// Mapping des types ISNO -> Google, guide par la CAPACITE (pas par le nom du type, pour ne pas cabler de
// chaine metier) : un appareil qui a un controle de POSITION est un volet pilotable en pourcentage
// (BLINDS, trait OpenClose avec openPercent) ; sans position, c'est un ouvrant tout-ou-rien (GATE,
// OpenClose en commande seule). La position du portail est un % de FERMETURE (0 = ouvert, 100 = ferme),
// l'inverse du openPercent de Google (% d'OUVERTURE), d'ou la conversion 100 - p.
import { listAppareils } from '#lib/server/cloud-data.ts';
import { findDevice } from '@opencloudapp/core/store.js';
import { familyById, buildCommand } from '@opencloudapp/core/device-families.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { CONTROL, KIND_PLACE } from '@opencloudapp/core/family-contract.js';
import type { Appareil } from '#lib/types.ts';

/** Vocabulaire du protocole Smart Home de Google (chaines fixees par Google : declarees une fois ici). */
export const GOOGLE = {
  intent: { sync: 'action.devices.SYNC', query: 'action.devices.QUERY', execute: 'action.devices.EXECUTE', disconnect: 'action.devices.DISCONNECT' },
  type: { blinds: 'action.devices.types.BLINDS', gate: 'action.devices.types.GATE' },
  trait: { openClose: 'action.devices.traits.OpenClose' },
  command: { openClose: 'action.devices.commands.OpenClose' },
  status: { success: 'SUCCESS', error: 'ERROR', pending: 'PENDING', offline: 'OFFLINE' },
  error: { notFound: 'deviceNotFound', offline: 'deviceOffline', notSupported: 'functionNotSupported', relayDown: 'transientError' },
} as const;

const field = (o: unknown, k: string): unknown => (o !== null && typeof o === 'object' ? Object.getOwnPropertyDescriptor(o, k)?.value : undefined);
const arr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

type Kind = NonNullable<Appareil['kind']>;
const posControl = (kind: Kind) => kind.controls.find((c) => c.kind === CONTROL.position);
const actionControls = (kind: Kind) => kind.controls.filter((c) => c.kind === CONTROL.action);

/** Un appareil pilotable depuis Google : type connu, range sur l'accueil (pas une telecommande), nomme. */
const exposable = (a: Appareil): boolean => a.kind !== null && a.kind.place !== KIND_PLACE.box && a.name.trim() !== '';
/** L'appareil expose-t-il une position reglable ? (controle de position present et non masque). */
function withPosition(a: Appareil): boolean {
  if (!a.kind) return false;
  const p = posControl(a.kind);
  return !!p && !a.hidden.includes(p.id);
}
/** openPercent de Google (% d'ouverture) depuis la valeur de position du portail (% de fermeture). */
function openPercentOf(a: Appareil): number | null {
  if (!a.kind) return null;
  const p = posControl(a.kind);
  const v = p ? a.values[p.id] : undefined;
  return typeof v === 'number' ? clamp(100 - v, 0, 100) : null;
}

/** SYNC : la liste des appareils du compte, en appareils Google. */
export async function onSync(accountId: string): Promise<{ agentUserId: string; devices: object[] }> {
  const devices = (await listAppareils(accountId)).filter(exposable).map((a) => {
    const positional = withPosition(a);
    return {
      id: a.id,
      type: positional ? GOOGLE.type.blinds : GOOGLE.type.gate,
      traits: [GOOGLE.trait.openClose],
      name: { name: a.name },
      willReportState: false,   // phase 1 : Google interroge l'etat (QUERY), pas de Report State
      attributes: positional ? { discreteOnlyOpenClose: false } : { discreteOnlyOpenClose: true, commandOnlyOpenClose: true },
      deviceInfo: { manufacturer: 'ISNO', model: a.kind ? a.kind.id : a.declaredType },
    };
  });
  return { agentUserId: accountId, devices };
}

/** QUERY : l'etat des appareils demandes (position + en ligne). */
export async function onQuery(accountId: string, ids: readonly string[]): Promise<Record<string, object>> {
  const byId = new Map((await listAppareils(accountId)).filter(exposable).map((a) => [a.id, a]));
  const out: Record<string, object> = {};
  for (const id of ids) {
    const a = byId.get(id);
    if (!a) { out[id] = { status: GOOGLE.status.error, errorCode: GOOGLE.error.notFound }; continue; }
    const op = openPercentOf(a);
    out[id] = { status: GOOGLE.status.success, online: a.online, ...(op !== null ? { openPercent: op } : {}) };
  }
  return out;
}

/** La commande famille (controle + valeur) qui realise un openPercent Google pour cet appareil.
 *  Positionnel : on ecrit la position (% de fermeture). Sinon : l'action extreme (ouverture si >= 50 %,
 *  fermeture sinon). L'ordre des actions suit la declaration de la famille (ouverture d'abord, fermeture
 *  en dernier : up, stop, down). */
function commandFor(a: Appareil, openPercent: number): { control: string; value: number | null } | null {
  if (!a.kind) return null;
  if (withPosition(a)) {
    const p = posControl(a.kind);
    return p ? { control: p.id, value: clamp(100 - openPercent, 0, 100) } : null;
  }
  const acts = actionControls(a.kind);
  if (acts.length === 0) return null;
  const open = acts[0], close = acts[acts.length - 1];
  const ctl = openPercent >= 50 ? open : close;
  return ctl ? { control: ctl.id, value: null } : null;
}

/** EXECUTE : applique les commandes OpenClose. Rend les groupes de resultats attendus par Google. */
export async function onExecute(accountId: string, commands: readonly unknown[]): Promise<object[]> {
  const byId = new Map((await listAppareils(accountId)).filter(exposable).map((a) => [a.id, a]));
  const ok: { id: string; openPercent: number }[] = [];
  const offline: string[] = [];
  const notFound: string[] = [];
  const failed: string[] = [];

  for (const group of commands) {
    const ids = arr(field(group, 'devices')).map((d) => String(field(d, 'id') ?? '')).filter(Boolean);
    for (const exec of arr(field(group, 'execution'))) {
      if (field(exec, 'command') !== GOOGLE.command.openClose) { for (const id of ids) failed.push(id); continue; }
      const raw = field(field(exec, 'params'), 'openPercent');
      const openPercent = typeof raw === 'number' ? clamp(raw, 0, 100) : 100;   // « ouvre » sans valeur = 100
      for (const id of ids) {
        const a = byId.get(id);
        if (!a) { notFound.push(id); continue; }
        const dev = await findDevice(a.boitierId, accountId);
        const fam = dev ? familyById(dev.firmware) : null;
        const cmd = fam ? commandFor(a, openPercent) : null;
        if (!dev || !fam || !cmd) { failed.push(id); continue; }
        const r = buildCommand(fam, { box: a.boitierId, device: a.slug }, cmd.control, cmd.value);
        if ('error' in r) { failed.push(id); continue; }
        try { publishCommand(r.topic, r.payload, r.retain); ok.push({ id, openPercent }); }
        catch { offline.push(id); }
      }
    }
  }

  const groups: object[] = [];
  if (ok.length) groups.push({ ids: ok.map((x) => x.id), status: GOOGLE.status.success, states: { online: true } });
  if (offline.length) groups.push({ ids: offline, status: GOOGLE.status.offline, errorCode: GOOGLE.error.offline });
  if (notFound.length) groups.push({ ids: notFound, status: GOOGLE.status.error, errorCode: GOOGLE.error.notFound });
  if (failed.length) groups.push({ ids: failed, status: GOOGLE.status.error, errorCode: GOOGLE.error.notSupported });
  return groups;
}

/** Point d'entree : traite une requete de fulfillment deja authentifiee et rend l'objet reponse. */
export async function fulfill(accountId: string, body: unknown): Promise<object> {
  const requestId = String(field(body, 'requestId') ?? '');
  const input = arr(field(body, 'inputs'))[0];
  const intent = String(field(input, 'intent') ?? '');
  const payload = field(input, 'payload');

  if (intent === GOOGLE.intent.sync) return { requestId, payload: await onSync(accountId) };
  if (intent === GOOGLE.intent.query) {
    const ids = arr(field(payload, 'devices')).map((d) => String(field(d, 'id') ?? '')).filter(Boolean);
    return { requestId, payload: { devices: await onQuery(accountId, ids) } };
  }
  if (intent === GOOGLE.intent.execute) {
    return { requestId, payload: { commands: await onExecute(accountId, arr(field(payload, 'commands'))) } };
  }
  if (intent === GOOGLE.intent.disconnect) return { requestId, payload: {} };
  return { requestId, payload: { errorCode: GOOGLE.error.notSupported } };
}
