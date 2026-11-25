// Choisir ou changer son code PIN Google Home (exige par Google pour ouvrir un portail). Garde hache.
import type { RequestHandler } from './$types';
import { setGooglePinHash } from '@opencloudapp/core/store.js';
import { hashPass } from '@opencloudapp/core/auth.js';
import { normalizeGooglePin } from '@opencloudapp/core/plugins/google-pin-rule.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { googleHomeReady } from '#lib/server/google-oauth.ts';
import { forgetPinAttempts } from '#lib/server/google-pin.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  if (!(await googleHomeReady())) return json(404, { error: 'google home inactif' });
  const pin = normalizeGooglePin((await readBody(request)).pin);
  if (pin === null) return json(400, { error: 'code invalide' });
  await setGooglePinHash(id, hashPass(pin));
  forgetPinAttempts(id);
  return json(200, { ok: true });
};
