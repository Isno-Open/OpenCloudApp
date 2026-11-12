// Demarrage idempotent du coeur isno-cloud dans le process de l'app.
// - Toujours (meme avant l'installation) : CA et certificat du relais crees s'ils manquent.
// - Une fois l'instance configuree : store choisi initialise, admin seme, puis RECONCILIATION du broker
//   (certificat au nom de la config, broker installe et demarre par le superviseur) et relais branche sur
//   l'adresse interne du broker. Rien de tout cela ne doit casser le rendu des pages : on journalise.
import { init, getAccount, setAccountPass } from '@core/store.js';
import { hashPass } from '@core/auth.js';
import { startRelay } from '@core/mqtt.js';
import { loadConfig, applyStoreEnv } from '@core/config.js';
import { ensureCA, ensureRelayCert } from '@core/pki.js';
import { prepareBroker, brokerInternal } from './broker.ts';

const ADMIN_PASS = process.env.ADMIN_PASS ?? '';
const log = (what: string, e: unknown) => console.error(`[boot] ${what} :`, e instanceof Error ? e.message : e);

let started: Promise<void> | null = null;
export function boot(): Promise<void> {
  if (!started) started = (async () => {
    try { ensureCA(); ensureRelayCert(); } catch (e) { log('PKI', e); }
    const cfg = loadConfig();
    if (!cfg) return;                     // mode setup : pas de base tant que l'onboarding n'est pas fait
    applyStoreEnv(cfg);                   // pose MONGO_URL / DB_PATH avant l'import dynamique du store
    await init();
    // Semis du mot de passe admin (self-host) : depuis la config (onboarding) ou, a defaut, ADMIN_PASS.
    const seedHash = cfg.adminPassHash ?? (ADMIN_PASS ? hashPass(ADMIN_PASS) : null);
    if (seedHash) {
      const a = await getAccount('admin');
      if (a && !a.passHash) await setAccountPass('admin', seedHash);
    }
    try {
      const r = await prepareBroker(new URL(cfg.brokerPublicUrl).hostname);
      if (!r.ok) log('broker', r.error);
      const internal = await brokerInternal();
      if ('error' in internal) log('relais', internal.error); else startRelay(internal.url);
    } catch (e) { log('broker/relais', e); }
  })();
  return started;
}
