// Deplacer un appareil de l'un de SES boitiers au rang donne (glisser sa carte). La propriete est
// verifiee ici ; le rang, l'appareil et la traduction par la famille le sont par le coeur
// (device-families.ts buildReorder), qui borne le message a ce boitier avant que le relais ne le publie.
import type { RequestHandler } from './$types';
import { findDevice } from '@opencloudapp/core/store.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { familyById, buildReorder } from '@opencloudapp/core/device-families.js';
import { resolveAccountId, plugins } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const b = await readBody(request);
  const deviceId = String(b.device_id ?? ''), slug = String(b.slug ?? '');
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  await plugins();
  const fam = familyById(dev.firmware);
  if (!fam) return json(409, { error: 'famille de boîtiers non installée' });
  const r = buildReorder(fam, { box: deviceId, device: slug }, b.rank);
  if ('error' in r) return json(400, { error: r.error });
  try { publishCommand(r.topic, r.payload, r.retain); } catch { return json(503, { error: 'relais indisponible' }); }
  return json(200, { ok: true });
};
