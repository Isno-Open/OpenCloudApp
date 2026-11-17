// Report State : quand un boitier bouge (message MQTT applique, hook onBoxUpdated du coeur), on pousse
// l'etat de ses appareils a Google. Debounce par boitier : une rafale de messages ne declenche qu'un
// envoi, apres un court silence. Inactif tant que la cle HomeGraph n'est pas configuree.
import { onBoxUpdated } from '@opencloudapp/core/mqtt.js';
import { deviceAccount } from '@opencloudapp/core/store.js';
import { reportableStates } from '#lib/server/google-smarthome.ts';
import { reportState, requestSync, homeGraphReady } from '#lib/server/google-homegraph.ts';

const DEBOUNCE_MS = 1500;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
// Derniere liste d'appareils connue par boitier : si elle change (ajout/retrait d'un volet), on demande
// a Google de resynchroniser, sinon le nouvel appareil ne lui apparaitrait jamais (Report State ne fait
// que mettre a jour l'etat d'appareils deja connus).
const lastIds = new Map<string, string>();

async function push(box: string): Promise<void> {
  try {
    const account = await deviceAccount(box);   // le message MQTT ne porte pas le compte
    if (!account) return;
    const states = await reportableStates(account, box);
    const ids = Object.keys(states).sort().join(',');
    if (lastIds.get(box) !== ids) {
      lastIds.set(box, ids);
      await requestSync(account);   // la liste a change : Google re-synchronise (le nouveau volet apparait)
    }
    await reportState(account, states);
  } catch (e) { console.error('[google-report]', e instanceof Error ? e.message : e); }
}

function schedule(_family: string, box: string): void {
  if (!homeGraphReady()) return;
  const existing = timers.get(box);
  if (existing) clearTimeout(existing);
  const t = setTimeout(() => { timers.delete(box); void push(box); }, DEBOUNCE_MS);
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
