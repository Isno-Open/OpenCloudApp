// Choisir ou changer un code PIN Google Home (exige par Google pour ouvrir un portail). Sans `appliance`,
// c'est le code du compte ; avec, le code PROPRE a ce portail, qui remplace pour lui le code du compte.
// Garde hache.
import type { RequestHandler } from './$types';
import { setGooglePinHash, setGoogleDevicePin } from '@opencloudapp/core/store.js';
import { hashPass } from '@opencloudapp/core/auth.js';
import { normalizeGooglePin } from '@opencloudapp/core/plugins/google-pin-rule.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { googleHomeReady } from '#lib/server/google-oauth.ts';
import { securedAppliances } from '#lib/server/google-smarthome.ts';
import { forgetPinAttempts } from '#lib/server/google-pin.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  if (!(await googleHomeReady())) return json(404, { error: 'google home inactif' });
  const body = await readBody(request);
  const pin = normalizeGooglePin(body.pin);
  if (pin === null) return json(400, { error: 'code invalide' });
  const appliance = typeof body.appliance === 'string' ? body.appliance : '';
  if (appliance === '') await setGooglePinHash(id, hashPass(pin));
  else {
    // seulement un portail de CE compte, et de ceux dont l'ouverture demande un code
    if (!(await securedAppliances(id)).some((g) => g.id === appliance)) return json(404, { error: 'portail inconnu' });
    await setGoogleDevicePin(id, appliance, hashPass(pin));
  }
  forgetPinAttempts(id);
  return json(200, { ok: true });
};
