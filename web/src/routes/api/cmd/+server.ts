// Commande d'un utilisateur vers un appareil de l'un de SES boitiers. La propriete est verifiee ici ;
// la famille du boitier traduit la commande, et le coeur la verifie et la borne a ce boitier
// (device-families.ts buildCommand) avant que le relais ne la publie.
import type { RequestHandler } from './$types';
import { findDevice } from '@opencloudapp/core/store.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { familyById, buildCommand } from '@opencloudapp/core/device-families.js';
import { resolveAccountId, plugins } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const b = await readBody(request);
  const deviceId = String(b.device_id ?? ''), slug = String(b.slug ?? ''), control = String(b.control ?? '');
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  await plugins();
  const fam = familyById(dev.firmware);
  if (!fam) return json(409, { error: 'famille de boîtiers non installée' });
  const r = buildCommand(fam, slug ? { box: deviceId, device: slug } : { box: deviceId }, control, b.value ?? null);
  if ('error' in r) return json(400, { error: r.error });
  try { publishCommand(r.topic, r.payload, r.retain); } catch { return json(503, { error: 'relais indisponible' }); }
  return json(200, { ok: true });
};
