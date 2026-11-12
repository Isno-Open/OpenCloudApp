import type { RequestHandler } from './$types';
import { takePairing, claimDevice } from '@opencloudapp/core/store.js';
import { issueDeviceCert } from '@opencloudapp/core/ca.js';
import { loadConfig } from '@opencloudapp/core/config.js';
import { boot } from '#lib/server/boot.ts';
import { readBody, json } from '#lib/server/http.ts';


export const POST: RequestHandler = async ({ request }) => {
  await boot();
  const b = await readBody(request);
  const p = await takePairing(String(b.code ?? ''));
  if (!p) return json(400, { error: 'code invalide ou déjà utilisé' });
  if (!(await claimDevice(p.deviceId, p.accountId, p.name, String(b.firmware ?? 'openprofalux'))))
    return json(409, { error: 'appareil rattaché à un autre compte' });
  const bundle = issueDeviceCert(p.deviceId);
  return json(200, { device_id: p.deviceId, broker_url: loadConfig()?.brokerPublicUrl ?? '', ...bundle });
};
