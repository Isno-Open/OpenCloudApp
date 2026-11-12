import type { RequestHandler } from './$types';
import { findDevice, removeDevice } from '@opencloudapp/core/store.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const b = await readBody(request);
  const deviceId = String(b.device_id ?? '');
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  await removeDevice(deviceId, acc);
  return json(200, { ok: true });
};
