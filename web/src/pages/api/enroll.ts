import type { APIRoute } from 'astro';
import { takePairing, addDevice } from '@core/store.js';
import { issueDeviceCert } from '@core/ca.js';
import { boot } from '../../server/boot.ts';
import { readBody, json } from '../../server/http.ts';

const BROKER_URL = process.env.BROKER_URL_PUBLIC ?? 'mqtts://mqtt.example.com:8883';

export const POST: APIRoute = async ({ request }) => {
  await boot();
  const b = await readBody(request);
  const p = await takePairing(String(b.code ?? ''));
  if (!p) return json(400, { error: 'code invalide ou déjà utilisé' });
  const bundle = issueDeviceCert(p.deviceId);
  await addDevice({ deviceId: p.deviceId, accountId: p.accountId, name: p.name, firmware: String(b.firmware ?? 'openprofalux') });
  return json(200, { device_id: p.deviceId, broker_url: BROKER_URL, ...bundle });
};
