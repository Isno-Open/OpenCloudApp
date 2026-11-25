// Retirer un code PIN Google Home. Sans `appliance`, le code du compte : les portails sans code propre
// ne s'ouvrent alors plus par Google. Avec, le code propre de ce portail, qui revient au code du compte.
import type { RequestHandler } from './$types';
import { setGooglePinHash, setGoogleDevicePin } from '@opencloudapp/core/store.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { forgetPinAttempts } from '#lib/server/google-pin.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  const body = await readBody(request);
  const appliance = typeof body.appliance === 'string' ? body.appliance : '';
  // un portail disparu du boitier doit pouvoir perdre son code : pas de controle d'existence ici
  if (appliance === '') await setGooglePinHash(id, null); else await setGoogleDevicePin(id, appliance, null);
  forgetPinAttempts(id);
  return json(200, { ok: true });
};
