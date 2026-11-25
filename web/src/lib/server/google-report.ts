// Report State : quand un boitier bouge (message MQTT applique, hook onBoxUpdated du coeur), on pousse
// l'etat de ses appareils a Google. Debounce par boitier : une rafale de messages ne declenche qu'un
// envoi, apres un court silence. Inactif tant que la cle HomeGraph n'est pas configuree.
import { onBoxUpdated, relaySettled } from '@opencloudapp/core/mqtt.js';
import { planGooglePush, type GooglePushMemory } from '@opencloudapp/core/plugins/google-home.js';
import { deviceAccount } from '@opencloudapp/core/store.js';
import { reportableStates } from '#lib/server/google-smarthome.ts';
import { reportState, requestSync, homeGraphReady } from '#lib/server/google-homegraph.ts';

const DEBOUNCE_MS = 1500;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Ce que Google sait deja de chaque boitier (liste de ses appareils, dernier etat pousse). Si la liste
// change (ajout/retrait d'un volet), on demande a Google de resynchroniser, sinon le nouvel appareil ne
// lui apparaitrait jamais (Report State ne fait que mettre a jour l'etat d'appareils deja connus). Si
// l'etat n'a pas change, on n'envoie rien : un boitier publie sa sante chaque minute.
const known = new Map<string, GooglePushMemory>();

async function push(family: string, box: string): Promise<void> {
  // Etat pas encore peuple (redemarrage : les messages retenus arrivent) : la liste lue maintenant serait
  // incomplete, et un Request Sync ferait retirer a Google les appareils qui manquent. On repasse plus tard.
  if (!relaySettled()) { schedule(family, box); return; }
  try {
    const account = await deviceAccount(box);   // le message MQTT ne porte pas le compte
    if (!account) return;
    const states = await reportableStates(account, box);
    const memory = known.get(box) ?? {};
    const plan = planGooglePush(memory, states);
    // la liste a change : Google re-synchronise (le nouveau volet apparait). Retenu seulement si parti.
    if (plan.sync && await requestSync(account)) memory.ids = plan.ids;
    if (plan.report && await reportState(account, states)) memory.states = plan.states;
    known.set(box, memory);
  } catch (e) { console.error('[google-report]', e instanceof Error ? e.message : e); }
}

function schedule(family: string, box: string): void {
  if (!homeGraphReady()) return;
  const existing = timers.get(box);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => { timers.delete(box); void push(family, box); }, DEBOUNCE_MS);
  t.unref?.();   // ne pas retenir le process pour un envoi en attente
  timers.set(box, t);
}

let started = false;
/** Branche le Report State sur les mises a jour de boitiers (une seule fois). */
export function startGoogleReporting(): void {
  if (started) return;
  started = true;
  onBoxUpdated(schedule);
}
