// Report State : quand un boitier bouge (message MQTT applique, hook onBoxUpdated du coeur), on pousse
// l'etat de ses appareils a Google. Debounce par boitier : une rafale de messages ne declenche qu'un
// envoi, apres un court silence. Inactif tant que la cle HomeGraph n'est pas configuree.
import { onBoxUpdated, relaySettled } from '@opencloudapp/core/mqtt.js';
import { planGooglePush, settleGooglePush } from '@opencloudapp/core/plugins/google-home.js';
import { pushMemory, rememberPush, forgetBox } from '#lib/server/google-push-memory.ts';
import { deviceAccount, getAccount, onAccountRemoved } from '@opencloudapp/core/store.js';
import { reportable } from '#lib/server/google-smarthome.ts';
import { reportState, requestSync, unlinkAgentUser, homeGraphReady } from '#lib/server/google-homegraph.ts';

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
    const { states, declared } = await reportable(account, box);
    const memory = pushMemory(box, account);
    const plan = planGooglePush(memory, states, declared);
    // la liste, ou ce qu'elle declare d'un appareil (son nom), a change : Google re-synchronise. On ne retient que ce qui
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

// Une rupture qui echoue (Google injoignable) est RETENTEE : apres le retrait du compte, plus rien d'autre
// ne la redemanderait, et Google garderait l'utilisateur et ses appareils. Delais croissants, puis on le
// dit au journal. Limite connue : les tentatives en attente sont en memoire, un redemarrage les perd.
const UNLINK_RETRY_MS = [30_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 12 * 3_600_000] as const;
async function unlinkWithRetry(account: string, attempt: number): Promise<void> {
  // le compte existe de nouveau (rouvert, peut-etre relie a Google) : cette rupture ne le concerne plus,
  // et Google le designerait par le meme identifiant
  if (await getAccount(account)) return;
  if (!homeGraphReady() || await unlinkAgentUser(account)) return;
  const wait = UNLINK_RETRY_MS[attempt];
  if (wait === undefined) { console.error('[google-report] liaison Google non rompue apres plusieurs essais, a retirer a la main chez Google'); return; }
  setTimeout(() => { void unlinkWithRetry(account, attempt + 1); }, wait).unref?.();
}

let unlinking = false;
/** Un compte retire du portail (ferme par son titulaire, supprime par l'operateur) : sa liaison Google
 *  s'en va. A poser AVANT le chargement des plugins : l'annuaire d'un site externe est lu des leur
 *  enregistrement, et un compte ferme pendant l'arret du portail est retire a ce moment-la. */
export function startGoogleUnlinking(): void {
  if (unlinking) return;
  unlinking = true;
  onAccountRemoved((account) => { void unlinkWithRetry(account, 0); });
}
