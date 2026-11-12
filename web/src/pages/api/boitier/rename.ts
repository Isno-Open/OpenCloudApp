import type { APIRoute } from 'astro';
import { findDevice, renameDevice } from '@core/store.js';
import { resolveAccountId } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const b = await readBody(request);
  const deviceId = String(b.device_id ?? ''), name = String(b.name ?? '').trim();
  if (!name) return json(400, { error: 'nom vide' });
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  await renameDevice(deviceId, acc, name);
  return json(200, { ok: true });
};
