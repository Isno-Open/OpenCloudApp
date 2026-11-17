// Report State : quand un boitier bouge (message MQTT applique, hook onBoxUpdated du coeur), on pousse
// l'etat de ses appareils a Google. Debounce par boitier : une rafale de messages ne declenche qu'un
// envoi, apres un court silence. Inactif tant que la cle HomeGraph n'est pas configuree.
import { onBoxUpdated } from '@opencloudapp/core/mqtt.js';
import { deviceAccount } from '@opencloudapp/core/store.js';
import { reportableStates } from '#lib/server/google-smarthome.ts';
import { reportState, homeGraphReady } from '#lib/server/google-homegraph.ts';

const DEBOUNCE_MS = 1500;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

async function push(box: string): Promise<void> {
  try {
    const account = await deviceAccount(box);   // le message MQTT ne porte pas le compte
    if (!account) return;
    await reportState(account, await reportableStates(account, box));
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
