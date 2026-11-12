import type { APIRoute } from 'astro';
import { findDevice } from '@core/store.js';
import { publishCmd, type Action } from '@core/mqtt.js';
import { resolveAccountId } from '../../server/auth.ts';
import { readBody, json } from '../../server/http.ts';

const ACTIONS: Record<string, Action> = { UP: 'UP', STOP: 'STOP', DOWN: 'DOWN' };

export const POST: APIRoute = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const b = await readBody(request);
  const deviceId = String(b.device_id ?? ''), slug = String(b.slug ?? 'volet');
  const action = ACTIONS[String(b.action ?? '')];
  if (!action) return json(400, { error: 'action invalide' });
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  try { publishCmd(deviceId, slug, action); } catch { return json(503, { error: 'relais indisponible' }); }
  return json(200, { ok: true });
};
