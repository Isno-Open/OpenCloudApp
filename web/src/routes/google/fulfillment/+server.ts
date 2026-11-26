// Endpoint de fulfillment Smart Home (appele par Google avec un jeton d'acces Bearer). Identifie le
// compte depuis le jeton, puis repond aux intentions SYNC / QUERY / EXECUTE / DISCONNECT.
import type { RequestHandler } from './$types';
import { json } from '#lib/server/http.ts';
import { googleHomeReady, readAccessToken } from '#lib/server/google-oauth.ts';
import { fulfill } from '#lib/server/google-smarthome.ts';
import { whenRelaySettled } from '@opencloudapp/core/mqtt.js';
import { getAccount } from '@opencloudapp/core/store.js';

// Google attend une reponse en quelques secondes : on laisse ce delai a l'etat pour se peupler apres un
// redemarrage, pas plus.
const SETTLE_WAIT_MS = 3000;

export const POST: RequestHandler = async ({ request }) => {
  if (!(await googleHomeReady())) return json(404, { error: 'google home inactif' });
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const account = readAccessToken(token);
  // 401 : Google rafraichit alors le jeton (echange refresh_token) et rejoue la requete.
  // un jeton reste signe apres le retrait du compte (il est sans etat) : le compte doit encore exister
  if (!account || !(await getAccount(account))) return new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401, headers: { 'content-type': 'application/json' } });
  // Etat des boitiers pas encore peuple (redemarrage) : repondre maintenant donnerait une liste vide ou
  // incomplete, et Google RETIRE les appareils absents d'un SYNC (pieces et routines perdues). Un echec,
  // lui, ne change rien chez Google, qui reessaiera.
  if (!(await whenRelaySettled(SETTLE_WAIT_MS))) return json(503, { error: 'etat des boitiers pas encore charge' });
  const body: unknown = await request.json().catch(() => ({}));
  return json(200, await fulfill(account, body));
};
