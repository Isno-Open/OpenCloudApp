// Report State : quand un boitier bouge (message MQTT applique, hook onBoxUpdated du coeur), on pousse
// l'etat de ses appareils a Google. Debounce par boitier : une rafale de messages ne declenche qu'un
// envoi, apres un court silence. Inactif tant que la cle HomeGraph n'est pas configuree.
import { onBoxUpdated, relaySettled } from '@opencloudapp/core/mqtt.js';
import { planGooglePush, settleGooglePush } from '@opencloudapp/core/plugins/google-home.js';
import { pushMemory, rememberPush, forgetBox } from '#lib/server/google-push-memory.ts';
import { deviceAccount } from '@opencloudapp/core/store.js';
import { reportableStates } from '#lib/server/google-smarthome.ts';
import { reportState, requestSync, homeGraphReady } from '#lib/server/google-homegraph.ts';

const DEBOUNCE_MS = 1500;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Si la liste des appareils d'un boitier change (ajout/retrait d'un volet), on demande a Google de
// resynchroniser, sinon le nouvel appareil ne lui apparaitrait jamais (Report State ne fait que mettre a
// jour l'etat d'appareils deja connus). Si l'etat n'a pas change, on n'envoie rien : un boitier publie sa
// sante chaque minute (memoire dans google-push-memory.ts).

// Un seul envoi a la fois par boitier. Un appel a Google peut durer plus que le delai de regroupement :
// un second passage, lance pendant le premier, comparerait le nouvel etat a une memoire pas encore mise
// a jour, le jugerait inchange, puis le premier retiendrait son etat perime (un boitier tombe resterait
// « en ligne » chez Google). Le passage qui arrive pendant un envoi est note, et rejoue a la fin.
const inFlight = new Set<string>();
const dirty = new Set<string>();

async function push(family: string, box: string): Promise<void> {
  // Etat pas encore peuple (redemarrage : les messages retenus arrivent) : la liste lue maintenant serait
  // incomplete, et un Request Sync ferait retirer a Google les appareils qui manquent. On repasse plus tard.
  if (!relaySettled()) { schedule(family, box); return; }
  if (inFlight.has(box)) { dirty.add(box); return; }
  inFlight.add(box);
  try {
    const account = await deviceAccount(box);   // le message MQTT ne porte pas le compte
    if (!account) { forgetBox(box); return; }
    const states = await reportableStates(account, box);
    const memory = pushMemory(box, account);
    const plan = planGooglePush(memory, states);
    // la liste a change : Google re-synchronise (le nouveau volet apparait). On ne retient que ce qui
    // est reellement parti : un echec se rejoue au message suivant.
    const sync = plan.sync && await requestSync(account);
    const report = plan.report && await reportState(account, states);
    rememberPush(box, account, settleGooglePush(memory, plan, { sync, report }));
  } catch (e) { console.error('[google-report]', e instanceof Error ? e.message : e); }
  finally {
    inFlight.delete(box);
    if (dirty.delete(box)) schedule(family, box);   // le boitier a bouge pendant l'envoi : on relit son etat
  }
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
