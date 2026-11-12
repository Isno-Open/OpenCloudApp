// Client du superviseur (installation des modules a la demande). Le secret est lu dans le volume de
// controle, ecrit par le superviseur lui-meme : rien a configurer. Sans superviseur joignable (ex. une
// installation sans lui), les fonctions rendent une erreur explicite au lieu de planter.
import { readFileSync } from 'node:fs';

const URL_BASE = (process.env.SUPERVISOR_URL ?? 'http://supervisor:8090').replace(/\/$/, '');
const TOKEN_FILE = process.env.SUPERVISOR_TOKEN_FILE ?? '/control/token';

/** Etat d'un module tel que rendu par le superviseur. ready / busy sont SES decisions : on ne
 *  reinterprete pas l'etat en texte de ce cote. */
export type ModuleStatus = { id: string; title: string; ready: boolean; busy: boolean; progress: number; error?: string; endpoint?: string };
export type SupervisorResult = { ok: true; module: ModuleStatus } | { ok: false; error: string };

async function call(method: string, path: string): Promise<SupervisorResult> {
  let token: string;
  try { token = readFileSync(TOKEN_FILE, 'utf8').trim(); }
  catch { return { ok: false, error: 'superviseur absent : secret introuvable' }; }
  try {
    const r = await fetch(URL_BASE + path, { method, headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
    const d = (await r.json()) as ModuleStatus & { error?: string };
    return r.ok ? { ok: true, module: d } : { ok: false, error: d.error ?? `superviseur : ${r.status}` };
  } catch (e) {
    return { ok: false, error: `superviseur injoignable (${e instanceof Error ? e.message : String(e)})` };
  }
}

export const getModule = (id: string): Promise<SupervisorResult> => call('GET', `/modules/${encodeURIComponent(id)}`);
export const installModule = (id: string): Promise<SupervisorResult> => call('POST', `/modules/${encodeURIComponent(id)}/install`);
export const restartModule = (id: string): Promise<SupervisorResult> => call('POST', `/modules/${encodeURIComponent(id)}/restart`);

/** Module obligatoire de la pile : le broker (identifiant du catalogue du superviseur). */
export const BROKER_MODULE = 'broker';
