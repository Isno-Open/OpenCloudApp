// Appels du navigateur vers l'API du portail, partages par tous les ecrans interactifs (composants
// Svelte). Un seul endroit pour le format des reponses, les erreurs reseau et l'attente du redemarrage.

/** Reponse d'un appel : les donnees, ou un message d'erreur pret a afficher. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const errorOf = (body: unknown, fallback: string): string => {
  const e = field(body, 'error');
  return typeof e === 'string' && e ? e : fallback;
};

/** Lit le corps d'une reponse reussie : rend la valeur typee, ou null si la forme n'est pas celle
 *  attendue. Une reponse n'est jamais « supposee » du bon type (pas d'assertion) : elle est verifiee. */
export type Parse<T> = (body: unknown) => T | null;
/** Pour les appels dont seul le succes compte (le corps est ignore). */
export const ignoreBody: Parse<true> = () => true;

async function call<T>(url: string, init: RequestInit, fallback: string, parse: Parse<T>): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, { cache: 'no-store', ...init });
    const body: unknown = await r.json().catch(() => null);
    if (!r.ok) return { ok: false, error: errorOf(body, fallback) };
    const data = parse(body);
    return data === null ? { ok: false, error: fallback } : { ok: true, data };
  } catch {
    return { ok: false, error: fallback };
  }
}

/** POST JSON. `fallback` : le message montre si le serveur n'en donne pas (ou ne repond pas). */
export const postJson = <T>(url: string, body: unknown, fallback: string, parse: Parse<T>): Promise<ApiResult<T>> =>
  call(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, fallback, parse);

export const getJson = <T>(url: string, fallback: string, parse: Parse<T>): Promise<ApiResult<T>> => call(url, { method: 'GET' }, fallback, parse);

/** Lecture sure d'un champ d'objet venu du reseau. */
export const field = (body: unknown, key: string): unknown =>
  body !== null && typeof body === 'object' ? Object.getOwnPropertyDescriptor(body, key)?.value : undefined;

const RESTART_POLL_MS = 800;
const RESTART_MIN_TRIES = 4;   // sans avoir vu le portail tomber, on attend quand meme un peu
const STATUS_URL = '/api/setup/status';

/** Le portail redemarre (plugin active ou retire) : attend qu'il soit tombe puis revenu, puis recharge. */
export function reloadAfterRestart(): void {
  let seenDown = false, tries = 0;
  const poll = (): void => {
    fetch(STATUS_URL, { cache: 'no-store' })
      .then((r) => { if (r.ok && (seenDown || tries > RESTART_MIN_TRIES)) location.reload(); else { tries++; setTimeout(poll, RESTART_POLL_MS); } })
      .catch(() => { seenDown = true; tries++; setTimeout(poll, RESTART_POLL_MS); });
  };
  poll();
}
