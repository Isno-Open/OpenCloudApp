// Retirer son code PIN Google Home : l'ouverture d'un portail par Google est alors refusee.
import type { RequestHandler } from './$types';
import { setGooglePinHash } from '@opencloudapp/core/store.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { forgetPinAttempts } from '#lib/server/google-pin.ts';
import { json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  await setGooglePinHash(id, null);
  forgetPinAttempts(id);
  return json(200, { ok: true });
};
