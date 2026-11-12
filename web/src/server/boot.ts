// Demarrage idempotent du coeur isno-cloud dans le process de l'app : init du store, semis du mot de
// passe admin (self-host) depuis ADMIN_PASS, et relais MQTT. Appele avant tout acces aux donnees.
// Le relais se connecte au premier acces ; les singletons (store, covers map) vivent dans le bundle unique.
import { init, getAccount, setAccountPass } from '@core/store.js';
import { hashPass } from '@core/auth.js';
import { startRelay } from '@core/mqtt.js';

const ADMIN_PASS = process.env.ADMIN_PASS ?? '';

let started: Promise<void> | null = null;
export function boot(): Promise<void> {
  if (!started) started = (async () => {
    await init();
    if (ADMIN_PASS) {
      const a = await getAccount('admin');
      if (a && !a.passHash) await setAccountPass('admin', hashPass(ADMIN_PASS));
    }
    // Le relais (mTLS vers le broker) ne doit pas casser le rendu des pages : s'il ne peut pas
    // demarrer (certs absents, broker injoignable), on continue en lecture seule (pas d'etat live).
    try { startRelay(); } catch (e) { console.error('[boot] relais non demarre:', e instanceof Error ? e.message : e); }
  })();
  return started;
}
