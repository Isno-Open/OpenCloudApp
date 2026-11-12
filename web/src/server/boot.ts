// Demarrage idempotent du coeur isno-cloud dans le process de l'app. Pilote par la config du portail
// (@core/config) : tant que l'instance n'est pas configuree (onboarding /setup non fait), on n'initialise
// AUCUN store. Une fois configuree : on pose l'env du store choisi, on init, on seme l'admin, on lance le relais.
import { init, getAccount, setAccountPass } from '@core/store.js';
import { hashPass } from '@core/auth.js';
import { startRelay } from '@core/mqtt.js';
import { loadConfig, applyStoreEnv } from '@core/config.js';

const ADMIN_PASS = process.env.ADMIN_PASS ?? '';

let started: Promise<void> | null = null;
export function boot(): Promise<void> {
  if (!started) started = (async () => {
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
    // Le relais (mTLS vers le broker) ne doit pas casser le rendu des pages : s'il ne peut pas demarrer
    // (certs absents, broker injoignable), on continue en lecture seule (pas d'etat live).
    try { startRelay(); } catch (e) { console.error('[boot] relais non demarre:', e instanceof Error ? e.message : e); }
  })();
  return started;
}
