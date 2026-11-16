// Retirer un boitier de son compte. Le boitier est PREVENU (ordre d'oubli retenu, si sa famille sait le
// dire) : sinon il gardait son certificat et restait connecte au cloud, sans compte, en se croyant
// appaire (constate le 2026-11-16).
import type { RequestHandler } from './$types';
import { findDevice, removeDevice } from '@opencloudapp/core/store.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { familyById, buildUnpair } from '@opencloudapp/core/device-families.js';
import { resolveAccountId, plugins } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const b = await readBody(request);
  const deviceId = String(b.device_id ?? '');
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  await removeDevice(deviceId, acc);
  await plugins();
  const fam = familyById(dev.firmware);
  const order = fam ? buildUnpair(fam, deviceId) : null;
  if (order && 'error' in order) console.error(`[boitier] ${deviceId} retire, ordre d'oubli refuse : ${order.error}`);
  else if (order) {
    try { publishCommand(order.topic, order.payload, order.retain); }
    catch (e) { console.error(`[boitier] ${deviceId} retire, ordre d'oubli non publie :`, e instanceof Error ? e.message : e); }
  }
  return json(200, { ok: true });
};
