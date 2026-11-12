// Device authorization grant, etape 2 (l'utilisateur connecte approuve le code montre par son appareil).
import type { RequestHandler } from './$types';
import { getAccount, countDevices, approveDeviceAuth } from '@opencloudapp/core/store.js';
import { overCap } from '@opencloudapp/core/entitlement.js';
import { normalizeUserCode } from '@opencloudapp/core/device-code.js';
import { resolveAccountId } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { LINK_ERROR } from '#lib/link.ts';

export const POST: RequestHandler = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: LINK_ERROR.auth });
  const b = await readBody(request);
  const code = normalizeUserCode(String(b.code ?? ''));
  if (!code) return json(400, { error: LINK_ERROR.invalid });
  const a = await getAccount(acc);
  if (!a) return json(401, { error: LINK_ERROR.auth });
  if (overCap(await countDevices(acc), a.deviceCap)) return json(403, { error: LINK_ERROR.cap, cap: a.deviceCap });
  const rec = await approveDeviceAuth(code, acc, String(b.name ?? '').slice(0, 60), Date.now());
  if (!rec) return json(400, { error: LINK_ERROR.invalid });
  return json(200, { ok: true, device_id: rec.deviceId });
};
