import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { getAccount, countDevices, addPairing } from '@core/store.js';
import { overCap } from '@core/entitlement.js';
import { resolveAccountId } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
const code6 = (): string => randomBytes(4).toString('hex').slice(0, 6).toUpperCase();

export const POST: APIRoute = async ({ request }) => {
  const b = await readBody(request);
  let accountId = await resolveAccountId(request);
  if (!accountId) {   // pas de session : chemin operateur par jeton admin
    if (!ADMIN_TOKEN || request.headers.get('authorization') !== `Bearer ${ADMIN_TOKEN}`)
      return json(401, { error: 'unauthorized' });
    accountId = String(b.accountId ?? 'admin');
  }
  const deviceId = String(b.deviceId ?? ('opf-' + randomBytes(5).toString('hex')));
  const acc = await getAccount(accountId);
  if (!acc) return json(404, { error: 'account inconnu' });
  if (overCap(await countDevices(accountId), acc.deviceCap))
    return json(403, { error: 'plafond atteint', cap: acc.deviceCap });
  const p = { code: code6(), accountId, deviceId, name: String(b.name ?? deviceId) };
  await addPairing(p);
  return json(200, { code: p.code, deviceId });
};
