// Endpoint de fulfillment Smart Home (appele par Google avec un jeton d'acces Bearer). Identifie le
// compte depuis le jeton, puis repond aux intentions SYNC / QUERY / EXECUTE / DISCONNECT.
import type { RequestHandler } from './$types';
import { json } from '#lib/server/http.ts';
import { googleHomeReady, readAccessToken } from '#lib/server/google-oauth.ts';
import { fulfill } from '#lib/server/google-smarthome.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await googleHomeReady())) return json(404, { error: 'google home inactif' });
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const account = readAccessToken(token);
  // 401 : Google rafraichit alors le jeton (echange refresh_token) et rejoue la requete.
  if (!account) return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const body: unknown = await request.json().catch(() => ({}));
  return json(200, await fulfill(account, body));
};
