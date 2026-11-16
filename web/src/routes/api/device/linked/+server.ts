// Apres l'approbation (/lier) : le boitier est-il arrive ? L'ecran de confirmation interroge ici jusqu'a
// ce que le boitier, qui vient chercher son certificat de son cote, soit au compte, connecte, et ait
// annonce ses appareils ; il emmene alors l'utilisateur sur ses volets.
import type { RequestHandler } from './$types';
import { findDevice } from '@opencloudapp/core/store.js';
import { deviceOnline } from '@opencloudapp/core/mqtt.js';
import { boxState } from '@opencloudapp/core/device-families.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { json } from '#lib/server/http.ts';

export const GET: RequestHandler = async ({ request, url }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const deviceId = url.searchParams.get('device_id') ?? '';
  const dev = await findDevice(deviceId, acc);
  // pas encore au compte : le boitier n'a pas encore recupere son certificat (il interroge toutes les 5 s)
  if (!dev) return json(200, { paired: false, online: false, devices: 0 });
  return json(200, { paired: true, online: deviceOnline(dev.firmware, deviceId), devices: boxState(dev.firmware, deviceId)?.devices.size ?? 0 });
};
