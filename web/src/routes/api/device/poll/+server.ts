// Device authorization grant, etape 3 (appel de l'appareil). Tant que l'utilisateur n'a pas approuve :
// pending. Une fois approuve : le certificat est emis et rendu UNE seule fois (la demande est consommee).
import type { RequestHandler } from './$types';
import { pollDeviceAuth, consumeDeviceAuth, claimDevice } from '@opencloudapp/core/store.js';
import { issueDeviceCert } from '@opencloudapp/core/ca.js';
import { DEVICE_AUTH_STATE } from '@opencloudapp/core/types.js';
import { POLL_STATUS, DEVICE_AUTH_INTERVAL_S } from '@opencloudapp/core/device-code.js';
import { loadConfig } from '@opencloudapp/core/config.js';
import { boot } from '#lib/server/boot.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  await boot();
  const cfg = loadConfig();
  if (!cfg) return json(503, { error: 'not configured' });
  const deviceCode = String((await readBody(request)).device_code ?? '');
  const now = Date.now();
  const rec = await pollDeviceAuth(deviceCode);
  if (!rec || rec.expiresAt < now || rec.state === DEVICE_AUTH_STATE.consumed) return json(410, { status: POLL_STATUS.expired });
  if (rec.state === DEVICE_AUTH_STATE.pending) return json(200, { status: POLL_STATUS.pending, interval: DEVICE_AUTH_INTERVAL_S });
  const taken = await consumeDeviceAuth(deviceCode, now);
  if (!taken?.accountId) return json(410, { status: POLL_STATUS.expired });
  if (!(await claimDevice(taken.deviceId, taken.accountId, taken.name ?? taken.deviceId, taken.firmware)))
    return json(409, { status: POLL_STATUS.denied });
  const bundle = issueDeviceCert(taken.deviceId);
  return json(200, { status: POLL_STATUS.ready, device_id: taken.deviceId, broker_url: cfg.brokerPublicUrl, ...bundle });
};
