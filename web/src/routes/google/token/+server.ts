// Endpoint de jetons OAuth 2.0 (appele par Google, pas par un navigateur). Deux types d'echange :
// authorization_code (code -> jeton d'acces + jeton de rafraichissement) et refresh_token (-> nouveau
// jeton d'acces). Client authentifie en Basic (coche dans la console Google), a defaut dans le corps.
import type { RequestHandler } from './$types';
import { readBody } from '#lib/server/http.ts';
import { googleHomeReady, clientOk, readAuthCode, readRefreshToken, makeAccessToken, makeRefreshToken, ACCESS_TTL_S } from '#lib/server/google-oauth.ts';

const GRANT = { code: 'authorization_code', refresh: 'refresh_token' } as const;
const TOKEN_TYPE = 'Bearer';
const reply = (status: number, body: object): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export const POST: RequestHandler = async ({ request }) => {
  if (!(await googleHomeReady())) { console.error('[gh/token] 404 not ready'); return reply(404, { error: 'invalid_client' }); }
  const b = await readBody(request);
  const ok = clientOk(request, b);
  console.error(`[gh/token] grant=${String(b.grant_type ?? '')} clientOk=${ok} auth=${(request.headers.get('authorization') ?? 'none').slice(0, 6)} bodyKeys=${Object.keys(b).join(',')}`);
  if (!ok) return reply(401, { error: 'invalid_client' });

  const grant = String(b.grant_type ?? '');
  if (grant === GRANT.code) {
    const acc = readAuthCode(String(b.code ?? ''));
    console.error(`[gh/token] code grant -> account=${acc ?? 'INVALID'}`);
    if (!acc) return reply(400, { error: 'invalid_grant' });
    const access = makeAccessToken(acc), refresh = makeRefreshToken(acc);
    if (!access || !refresh) return reply(500, { error: 'server_error' });
    return reply(200, { token_type: TOKEN_TYPE, access_token: access, refresh_token: refresh, expires_in: ACCESS_TTL_S });
  }
  if (grant === GRANT.refresh) {
    const acc = readRefreshToken(String(b.refresh_token ?? ''));
    if (!acc) return reply(400, { error: 'invalid_grant' });
    const access = makeAccessToken(acc);
    if (!access) return reply(500, { error: 'server_error' });
    return reply(200, { token_type: TOKEN_TYPE, access_token: access, expires_in: ACCESS_TTL_S });
  }
  return reply(400, { error: 'unsupported_grant_type' });
};
