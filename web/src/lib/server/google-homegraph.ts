// Client HomeGraph de Google (phase 2 de l'integration Google Home) : pousse l'etat des appareils
// (Report State) et demande une resynchronisation (Request Sync). S'authentifie avec la CLE DE SERVICE
// (compte de service du projet Google), rangee dans les reglages du plugin « google-home ».
//
// Flux d'auth : on signe un JWT (RS256) avec la cle privee du compte de service, on l'echange contre un
// jeton d'acces de portee « homegraph », qu'on garde en cache ~1 h. Si aucune cle n'est configuree, tout
// est silencieusement inactif (Google interroge alors l'etat par QUERY, ce qui suffit).
import { createSign } from 'node:crypto';
import { googleHomeSettings } from '@opencloudapp/core/plugins/google-home.js';
import { agentUserIdOf } from '#lib/server/google-oauth.ts';

const SCOPE = 'https://www.googleapis.com/auth/homegraph';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';
const REPORT_URL = 'https://homegraph.googleapis.com/v1/devices:reportStateAndNotification';
const REQUEST_SYNC_URL = 'https://homegraph.googleapis.com/v1/devices:requestSync';
const AGENT_USERS_URL = 'https://homegraph.googleapis.com/v1/agentUsers';
const JWT_TTL_S = 3600;
const HTTP_TIMEOUT_MS = 8000;

type ServiceKey = { clientEmail: string; privateKey: string; tokenUri: string };

const field = (o: object, k: string): unknown => Object.getOwnPropertyDescriptor(o, k)?.value;

/** La cle de service parsee depuis les reglages du plugin, ou null si absente/illisible. */
function serviceKey(): ServiceKey | null {
  const raw = googleHomeSettings().homeGraphKey;
  if (!raw) return null;
  try {
    const o: unknown = JSON.parse(raw);
    if (o === null || typeof o !== 'object') return null;
    const clientEmail = field(o, 'client_email'), privateKey = field(o, 'private_key'), tokenUri = field(o, 'token_uri');
    if (typeof clientEmail !== 'string' || typeof privateKey !== 'string' || !clientEmail || !privateKey) return null;
    return { clientEmail, privateKey, tokenUri: typeof tokenUri === 'string' && tokenUri ? tokenUri : DEFAULT_TOKEN_URI };
  } catch { return null; }
}

/** Le Report State est-il configure (cle de service presente et valide) ? */
export const homeGraphReady = (): boolean => serviceKey() !== null;

const b64url = (b: Buffer | string): string => Buffer.from(b).toString('base64url');

/** JWT signe (RS256) pour l'echange contre un jeton d'acces HomeGraph. */
function signJwt(key: ServiceKey, now: number): string {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.clientEmail, scope: SCOPE, aud: key.tokenUri, iat, exp: iat + JWT_TTL_S }));
  const data = `${header}.${claims}`;
  const sig = createSign('RSA-SHA256').update(data).sign(key.privateKey);
  return `${data}.${b64url(sig)}`;
}

let cached: { token: string; exp: number } | null = null;
// Apres un refus du jeton, on ne redemande pas avant ce delai : un compte de service supprime ou une cle
// revoquee ne se repare pas tout seul, et chaque message de boitier relancerait sinon la demande.
const TOKEN_RETRY_MS = 15 * 60_000;
let refusedUntil = 0;

/** Jeton d'acces HomeGraph (cache tant qu'il est valide), ou null si l'auth echoue. */
async function accessToken(now = Date.now()): Promise<string | null> {
  if (cached && cached.exp > now + 60_000) return cached.token;
  if (now < refusedUntil) return null;
  const key = serviceKey();
  if (!key) return null;
  try {
    const body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signJwt(key, now) });
    const r = await fetch(key.tokenUri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (!r.ok) {
      // la raison donnee par Google (« account not found », « invalid signature »...) : sans elle, le
      // journal ne dit pas si c'est la cle, le compte de service ou le projet qui manque
      const why: unknown = await r.json().catch(() => null);
      const reason = why !== null && typeof why === 'object' ? field(why, 'error_description') ?? field(why, 'error') : undefined;
      refusedUntil = now + TOKEN_RETRY_MS;
      console.error(`[homegraph] jeton refuse : HTTP ${r.status}${typeof reason === 'string' ? ` (${reason})` : ''} ; nouvel essai dans ${TOKEN_RETRY_MS / 60_000} min`);
      return null;
    }
    const d: unknown = await r.json();
    const tok = d !== null && typeof d === 'object' ? field(d, 'access_token') : undefined;
    const ttl = d !== null && typeof d === 'object' ? field(d, 'expires_in') : undefined;
    if (typeof tok !== 'string' || !tok) return null;
    cached = { token: tok, exp: now + (typeof ttl === 'number' ? ttl * 1000 : JWT_TTL_S * 1000) };
    return tok;
  } catch (e) { console.error('[homegraph] jeton :', e instanceof Error ? e.message : e); return null; }
}

const reqId = (): string => `isno-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function post(url: string, payload: object): Promise<boolean> {
  const token = await accessToken();
  if (!token) return false;
  try {
    const r = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (!r.ok) {
      if (r.status === 401) cached = null;   // jeton rejete : le prochain appel en redemande un
      console.error(`[homegraph] ${url.split(':').pop()} : HTTP ${r.status}`);
      return false;
    }
    return true;
  } catch (e) { console.error('[homegraph] appel :', e instanceof Error ? e.message : e); return false; }
}

/** Pousse l'etat des appareils d'un compte a Google (Report State). `states` : par id d'appareil Google.
 *  Rend true si Google l'a recu (ou s'il n'y avait rien a dire), false sinon. */
export async function reportState(accountId: string, states: Record<string, object>): Promise<boolean> {
  if (!homeGraphReady()) return false;
  if (Object.keys(states).length === 0) return true;
  // Google connait le compte par son identifiant opaque, jamais par son adresse
  const agentUserId = agentUserIdOf(accountId);
  if (!agentUserId) return false;
  return post(REPORT_URL, { requestId: reqId(), agentUserId, payload: { devices: { states } } });
}

/** Demande a Google de resynchroniser la liste des appareils d'un compte (Request Sync). Rend true si
 *  la demande est partie. */
export async function requestSync(accountId: string): Promise<boolean> {
  if (!homeGraphReady()) return false;
  const agentUserId = agentUserIdOf(accountId);
  if (!agentUserId) return false;
  return post(REQUEST_SYNC_URL, { agentUserId, async: true });
}

/** Rompt la liaison d'un compte chez Google : Google oublie cet utilisateur et ses appareils (appele
 *  quand le compte est retire du portail). Rend true si Google l'a pris en compte, ou s'il ne
 *  connaissait deja plus cet utilisateur. */
export async function unlinkAgentUser(accountId: string): Promise<boolean> {
  if (!homeGraphReady()) return false;
  const agentUserId = agentUserIdOf(accountId), token = await accessToken();
  if (!agentUserId || !token) return false;
  try {
    const r = await fetch(`${AGENT_USERS_URL}/${encodeURIComponent(agentUserId)}?requestId=${encodeURIComponent(reqId())}`,
      { method: 'DELETE', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (r.ok || r.status === 404) return true;   // 404 : Google ne le connait pas (jamais lie, ou deja delie)
    if (r.status === 401) cached = null;
    console.error(`[homegraph] agentUsers.delete : HTTP ${r.status}`);
    return false;
  } catch (e) { console.error('[homegraph] appel :', e instanceof Error ? e.message : e); return false; }
}
