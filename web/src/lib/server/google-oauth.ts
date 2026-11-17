// Serveur OAuth 2.0 (nous sommes le serveur d'AUTORISATION, Google est le client) pour l'account linking
// de Google Home. Jetons SANS ETAT : signes HMAC avec le secret du plugin « google-home »
// (plugin-secrets.ts), dans des contextes distincts (un code n'est jamais un jeton d'acces, etc.), comme
// la session du portail (server/src/session.ts). Le code d'autorisation est a courte duree ; l'usage
// unique n'est pas encore imose (durcissement de phase 2).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { hasCapability, CAPABILITY } from '@opencloudapp/core/plugins.js';
import { storedPluginSecret } from '@opencloudapp/core/plugin-secrets.js';
import { googleHomeSettings, GOOGLE_HOME_ID } from '@opencloudapp/core/plugins/google-home.js';
import { plugins } from '#lib/server/auth.ts';

/** Hotes de redirection OAuth de Google (account linking) : seules destinations acceptees pour un code.
 *  Production ET bac a sable (mode test / [test] dans l'app Google Home), les deux listes par la doc. */
export const GOOGLE_REDIRECT_HOSTS = ['oauth-redirect.googleusercontent.com', 'oauth-redirect-sandbox.googleusercontent.com'] as const;

const AUTH_CODE_TTL_MS = 10 * 60_000;
const ACCESS_TTL_MS = 60 * 60_000;
const REFRESH_TTL_MS = 365 * 24 * 60 * 60_000;   // ~1 an
/** Duree de vie du jeton d'acces annoncee a Google (secondes). */
export const ACCESS_TTL_S = Math.floor(ACCESS_TTL_MS / 1000);

const TOKEN = { code: 'code', access: 'access', refresh: 'refresh' } as const;
type TokenKind = (typeof TOKEN)[keyof typeof TOKEN];

const key = (): string | null => storedPluginSecret(GOOGLE_HOME_ID);
const mac = (secret: string, ctx: TokenKind, body: string): string =>
  createHmac('sha256', secret).update(`${ctx}\0${body}`).digest('hex');

function sign(ctx: TokenKind, payload: object): string | null {
  const secret = key();
  if (!secret) return null;
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${mac(secret, ctx, body)}`;
}
/** Verifie la signature et rend le corps decode (objet), ou null si la signature ou le JSON ne tient pas. */
function verify(ctx: TokenKind, token: string | undefined): object | null {
  const secret = key();
  if (!secret || !token) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1), want = mac(secret, ctx, body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const o: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return o !== null && typeof o === 'object' ? o : null;
  } catch { return null; }
}
const field = (o: object, k: string): unknown => Object.getOwnPropertyDescriptor(o, k)?.value;
const strOf = (o: object, k: string): string => { const v = field(o, k); return typeof v === 'string' ? v : ''; };
const numOf = (o: object, k: string): number | null => { const v = field(o, k); return typeof v === 'number' ? v : null; };

// ── Codes et jetons : « a » = identifiant de compte (e-mail), « exp » = echeance (ms). ──
export const makeAuthCode = (accountId: string, now = Date.now()): string | null => sign(TOKEN.code, { a: accountId, exp: now + AUTH_CODE_TTL_MS });
export function readAuthCode(code: string | undefined, now = Date.now()): string | null {
  const o = verify(TOKEN.code, code); if (!o) return null;
  const a = strOf(o, 'a'), exp = numOf(o, 'exp');
  return a && exp !== null && exp > now ? a : null;
}
export const makeAccessToken = (accountId: string, now = Date.now()): string | null => sign(TOKEN.access, { a: accountId, exp: now + ACCESS_TTL_MS });
export function readAccessToken(token: string | undefined, now = Date.now()): string | null {
  const o = verify(TOKEN.access, token); if (!o) return null;
  const a = strOf(o, 'a'), exp = numOf(o, 'exp');
  return a && exp !== null && exp > now ? a : null;
}
export const makeRefreshToken = (accountId: string, now = Date.now()): string | null => sign(TOKEN.refresh, { a: accountId, exp: now + REFRESH_TTL_MS });
export function readRefreshToken(token: string | undefined, now = Date.now()): string | null {
  const o = verify(TOKEN.refresh, token); if (!o) return null;
  const a = strOf(o, 'a'), exp = numOf(o, 'exp');
  return a && exp !== null && exp > now ? a : null;
}

/** Comparaison a temps constant de deux chaines. */
function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Le client (Google) presente-t-il le bon client_id/secret ? En-tete Basic (coche dans la console), ou
 *  a defaut dans le corps du formulaire. */
export function clientOk(request: Request, body: Record<string, unknown>): boolean {
  const { clientId, clientSecret } = googleHomeSettings();
  if (!clientId || !clientSecret) return false;
  let id = '', secret = '';
  const auth = request.headers.get('authorization') ?? '';
  if (auth.startsWith('Basic ')) {
    try {
      const dec = Buffer.from(auth.slice(6), 'base64').toString('utf8');
      const j = dec.indexOf(':');
      if (j >= 0) { id = decodeURIComponent(dec.slice(0, j)); secret = decodeURIComponent(dec.slice(j + 1)); }
    } catch { /* en-tete illisible : on tombe sur le corps */ }
  }
  if (!id) { id = String(body.client_id ?? ''); secret = String(body.client_secret ?? ''); }
  return safeEq(id, clientId) && safeEq(secret, clientSecret);
}

/** L'adresse de redirection est-elle bien celle de Google (production ou bac a sable) ? */
export function validRedirect(uri: string): boolean {
  try { const u = new URL(uri); return u.protocol === 'https:' && GOOGLE_REDIRECT_HOSTS.some((h) => h === u.host); }
  catch { return false; }
}

/** Le `client_id` configure (pour l'ecran de consentement : verifier la demande de Google). */
export const configuredClientId = (): string => googleHomeSettings().clientId;

/** Le plugin est-il actif ET configure (client_id/secret + secret de signature present) ? */
export async function googleHomeReady(): Promise<boolean> {
  await plugins();
  if (!hasCapability(CAPABILITY.googleHome)) return false;
  const s = googleHomeSettings();
  return !!s.clientId && !!s.clientSecret && !!storedPluginSecret(GOOGLE_HOME_ID);
}
