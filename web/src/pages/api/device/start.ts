// Device authorization grant, etape 1 (appel de l'appareil, sans session). Cree une demande en attente
// et rend le code a afficher (et a encoder dans le QR). L'identifiant d'appareil est TOUJOURS genere ici :
// accepter celui de l'appelant permettrait de demander un certificat au nom d'un appareil existant.
import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { startDeviceAuth, purgeExpiredDeviceAuth } from '@core/store.js';
import { DEVICE_AUTH_STATE } from '@core/types.js';
import { newDeviceCode, newUserCode, displayUserCode, DEVICE_AUTH_TTL_S, DEVICE_AUTH_INTERVAL_S } from '@core/device-code.js';
import { loadConfig } from '@core/config.js';
import { boot } from '../../../server/boot.ts';
import { readBody, json } from '../../../server/http.ts';
import { ROUTES, LANG } from '../../../lib/i18n.ts';

const FIRMWARE_RE = /^[a-z0-9._-]{1,40}$/;

export const POST: APIRoute = async ({ request }) => {
  await boot();
  const cfg = loadConfig();
  if (!cfg) return json(503, { error: 'not configured' });
  const b = await readBody(request);
  const fw = String(b.firmware ?? 'openprofalux');
  const firmware = FIRMWARE_RE.test(fw) ? fw : 'openprofalux';
  const now = Date.now();
  await purgeExpiredDeviceAuth(now);
  const deviceCode = newDeviceCode();
  const deviceId = 'opf-' + randomBytes(5).toString('hex');
  // user_code unique : collision tres improbable (31^8), on retente quelques fois au cas ou.
  for (let i = 0; i < 3; i++) {
    const userCode = newUserCode();
    try {
      await startDeviceAuth({ deviceCode, userCode, deviceId, firmware, state: DEVICE_AUTH_STATE.pending, accountId: null, name: null, expiresAt: now + DEVICE_AUTH_TTL_S * 1000 });
      const uri = cfg.publicAppUrl.replace(/\/$/, '') + ROUTES.lier[LANG.fr];
      return json(200, {
        device_code: deviceCode, user_code: displayUserCode(userCode),
        verification_uri: uri, verification_uri_complete: `${uri}?code=${userCode}`,
        interval: DEVICE_AUTH_INTERVAL_S, expires_in: DEVICE_AUTH_TTL_S,
      });
    } catch { /* collision : nouveau code */ }
  }
  return json(500, { error: 'retry' });
};
