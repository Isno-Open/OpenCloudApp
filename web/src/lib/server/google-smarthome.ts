// Fulfillment « Smart Home » de Google Home (cloud-to-cloud) : repond aux intentions SYNC / QUERY /
// EXECUTE / DISCONNECT pour un compte deja identifie (jeton d'acces, voir google-oauth.ts).
//
// Mapping des types ISNO -> Google, guide par la CAPACITE (pas par le nom du type, pour ne pas cabler de
// chaine metier) : un appareil qui a un controle de POSITION est un volet pilotable en pourcentage
// (BLINDS, trait OpenClose avec openPercent) ; sans position, c'est un ouvrant tout-ou-rien (GATE,
// OpenClose en commande seule). La position du portail est un % de FERMETURE (0 = ouvert, 100 = ferme),
// l'inverse du openPercent de Google (% d'OUVERTURE), d'ou la conversion 100 - p.
//
// Ouvrir un GATE demande un code PIN (verification secondaire exigee par Google) : voir commandFor et
// google-pin.ts. Rien a declarer dans SYNC, c'est la reponse EXECUTE qui reclame le code.
import { listAppareils } from '#lib/server/cloud-data.ts';
import { findDevice } from '@opencloudapp/core/store.js';
import { familyById, buildCommand } from '@opencloudapp/core/device-families.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { CONTROL, KIND_PLACE } from '@opencloudapp/core/family-contract.js';
import { homeGraphReady, reportState } from '#lib/server/google-homegraph.ts';
import { forgetReportedStates } from '#lib/server/google-push-memory.ts';
import { judgeOpenPins } from '#lib/server/google-pin.ts';
import { PIN_VERDICT, type PinVerdict } from '@opencloudapp/core/plugins/google-pin-rule.js';
import type { Appareil } from '#lib/types.ts';

/** Vocabulaire du protocole Smart Home de Google (chaines fixees par Google : declarees une fois ici). */
export const GOOGLE = {
  intent: { sync: 'action.devices.SYNC', query: 'action.devices.QUERY', execute: 'action.devices.EXECUTE', disconnect: 'action.devices.DISCONNECT' },
  type: { blinds: 'action.devices.types.BLINDS', gate: 'action.devices.types.GATE' },
  trait: { openClose: 'action.devices.traits.OpenClose' },
  command: { openClose: 'action.devices.commands.OpenClose' },
  status: { success: 'SUCCESS', error: 'ERROR', pending: 'PENDING', offline: 'OFFLINE' },
  error: { notFound: 'deviceNotFound', offline: 'deviceOffline', notSupported: 'functionNotSupported', relayDown: 'transientError', challengeNeeded: 'challengeNeeded', tooManyAttempts: 'tooManyFailedAttempts' },
  // verification secondaire : le code est demande (pinNeeded), ou redemande apres un code faux
  challenge: { pinNeeded: 'pinNeeded', pinFailed: 'challengeFailedPinNeeded' },
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

// Etat OPTIMISTE : juste apres une commande (fenetre courte), on renvoie le % COMMANDE plutot que la
// position firmware. Deux raisons : un portail sans retour n'a pas de position a lire ; et un volet a
// course chronometree rapporte a ~1 % pres (Google teste au % exact). Passee la fenetre, on rend la
// vraie position si l'appareil la remonte.
const OPTIMISTIC_MS = 90_000;
const lastCommanded = new Map<string, { pct: number; at: number }>();

/** Etat d'un appareil au format Google. `openPercent` TOUJOURS present (le trait OpenClose l'exige). */
function applianceState(a: Appareil): Record<string, unknown> {
  const real = openPercentOf(a);
  const c = lastCommanded.get(a.id);
  let op = real;
  if (c && Date.now() - c.at < OPTIMISTIC_MS) op = c.pct;   // juste apres une commande : valeur commandee
  else if (op === null) op = c?.pct ?? 0;                   // pas de position reelle : derniere commandee, sinon ferme
  return { online: a.online, openPercent: op };
}

/** Les appareils du compte dont l'OUVERTURE par Google demande un code : ceux declares GATE. La meme
 *  regle que SYNC (type) et EXECUTE (commandFor), pour que la page Compte liste exactement ceux-la. */
export async function securedAppliances(accountId: string): Promise<{ id: string; name: string }[]> {
  return (await listAppareils(accountId)).filter((a) => exposable(a) && !withPosition(a)).map((a) => ({ id: a.id, name: a.name }));
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
      willReportState: homeGraphReady(),   // true : on pousse l'etat (Report State) ; sinon Google interroge (QUERY)
      attributes: positional ? { discreteOnlyOpenClose: false } : { discreteOnlyOpenClose: true },
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
    out[id] = { status: GOOGLE.status.success, ...applianceState(a) };
  }
  return out;
}

/** Etats a pousser a Google (Report State), par id d'appareil ; optionnellement pour un seul boitier. */
export async function reportableStates(accountId: string, boxId?: string): Promise<Record<string, object>> {
  const out: Record<string, object> = {};
  for (const a of (await listAppareils(accountId)).filter(exposable)) {
    if (boxId !== undefined && a.boitierId !== boxId) continue;
    out[a.id] = applianceState(a);
  }
  return out;
}

/** La commande famille (controle + valeur) qui realise un openPercent Google pour cet appareil.
 *  Positionnel : on ecrit la position (% de fermeture). Sinon : l'action extreme (ouverture si >= 50 %,
 *  fermeture sinon). L'ordre des actions suit la declaration de la famille (ouverture d'abord, fermeture
 *  en dernier : up, stop, down).
 *  `secured` : la commande OUVRE un appareil declare GATE a Google. Google exige alors un code PIN
 *  (verification secondaire) ; la fermeture et les volets n'en demandent pas. */
function commandFor(a: Appareil, openPercent: number): { control: string; value: number | null; secured: boolean } | null {
  if (!a.kind) return null;
  if (withPosition(a)) {
    const p = posControl(a.kind);
    return p ? { control: p.id, value: clamp(100 - openPercent, 0, 100), secured: false } : null;
  }
  const acts = actionControls(a.kind);
  if (acts.length === 0) return null;
  const open = acts[0], close = acts[acts.length - 1];
  const opening = openPercent >= 50;
  const ctl = opening ? open : close;
  return ctl ? { control: ctl.id, value: null, secured: opening } : null;
}

/** EXECUTE : applique les commandes OpenClose. Rend les groupes de resultats attendus par Google. */
export async function onExecute(accountId: string, commands: readonly unknown[]): Promise<object[]> {
  const byId = new Map((await listAppareils(accountId)).filter(exposable).map((a) => [a.id, a]));
  const ok: { id: string; openPercent: number }[] = [];
  const offline: string[] = [];
  const notFound: string[] = [];
  const failed: string[] = [];
  // ouvertures retenues par la verification secondaire, par issue
  const held: Record<Exclude<PinVerdict, typeof PIN_VERDICT.granted>, string[]> = { [PIN_VERDICT.needed]: [], [PIN_VERDICT.failed]: [], [PIN_VERDICT.locked]: [] };

  for (const group of commands) {
    const ids = arr(field(group, 'devices')).map((d) => String(field(d, 'id') ?? '')).filter(Boolean);
    for (const exec of arr(field(group, 'execution'))) {
      if (field(exec, 'command') !== GOOGLE.command.openClose) { for (const id of ids) failed.push(id); continue; }
      const raw = field(field(exec, 'params'), 'openPercent');
      const openPercent = typeof raw === 'number' ? clamp(raw, 0, 100) : 100;   // « ouvre » sans valeur = 100
      const pin = field(field(exec, 'challenge'), 'pin');
      // D'abord ce que chaque appareil doit recevoir, puis UN jugement du code pour toutes les ouvertures
      // a proteger de l'ordre (un code faux compte pour un essai, quel que soit le nombre de portails),
      // enfin l'envoi de ce qui est permis.
      const ready: { id: string; topic: string; payload: string; retain: boolean; secured: boolean }[] = [];
      for (const id of ids) {
        const a = byId.get(id);
        if (!a) { notFound.push(id); continue; }
        const dev = await findDevice(a.boitierId, accountId);
        const fam = dev ? familyById(dev.firmware) : null;
        const cmd = fam ? commandFor(a, openPercent) : null;
        if (!dev || !fam || !cmd) { failed.push(id); continue; }
        const r = buildCommand(fam, { box: a.boitierId, device: a.slug }, cmd.control, cmd.value);
        if ('error' in r) { failed.push(id); continue; }
        ready.push({ id, topic: r.topic, payload: r.payload, retain: r.retain, secured: cmd.secured });
      }
      const secured = ready.filter((x) => x.secured).map((x) => x.id);
      const verdicts = secured.length ? await judgeOpenPins(accountId, secured, pin) : new Map<string, PinVerdict>();
      for (const { id, secured: needsPin, ...r } of ready) {
        if (needsPin) {
          // sans issue connue (ne devrait pas arriver), l'ouverture reste refusee
          const verdict = verdicts.get(id) ?? PIN_VERDICT.failed;
          if (verdict !== PIN_VERDICT.granted) { held[verdict].push(id); continue; }
        }
        try { publishCommand(r.topic, r.payload, r.retain); lastCommanded.set(id, { pct: openPercent, at: Date.now() }); ok.push({ id, openPercent }); }
        catch { offline.push(id); }
      }
    }
  }

  const groups: object[] = [];
  // Succes groupes par openPercent : la reponse EXECUTE porte le nouvel etat (commande), que le QUERY
  // suivant retrouvera (etat optimiste). On pousse aussi un Report State pour tenir Google a jour.
  const byPct = new Map<number, string[]>();
  for (const x of ok) { const l = byPct.get(x.openPercent) ?? []; l.push(x.id); byPct.set(x.openPercent, l); }
  for (const [pct, pids] of byPct) groups.push({ ids: pids, status: GOOGLE.status.success, states: { online: true, openPercent: pct } });
  if (ok.length) {
    // Google recoit ici un etat que le Report State sur message MQTT n'a pas envoye : sa memoire ne vaut
    // plus pour ces boitiers. Sans cela, un volet revenu a sa position d'avant serait juge « inchange »
    // et Google garderait la valeur commandee.
    for (const b of new Set(ok.map((x) => byId.get(x.id)?.boitierId).filter((b): b is string => b !== undefined))) forgetReportedStates(b);
    void reportState(accountId, Object.fromEntries(ok.map((x) => [x.id, { online: true, openPercent: x.openPercent }])));
  }
  if (held[PIN_VERDICT.needed].length) groups.push({ ids: held[PIN_VERDICT.needed], status: GOOGLE.status.error, errorCode: GOOGLE.error.challengeNeeded, challengeNeeded: { type: GOOGLE.challenge.pinNeeded } });
  if (held[PIN_VERDICT.failed].length) groups.push({ ids: held[PIN_VERDICT.failed], status: GOOGLE.status.error, errorCode: GOOGLE.error.challengeNeeded, challengeNeeded: { type: GOOGLE.challenge.pinFailed } });
  if (held[PIN_VERDICT.locked].length) groups.push({ ids: held[PIN_VERDICT.locked], status: GOOGLE.status.error, errorCode: GOOGLE.error.tooManyAttempts });
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
