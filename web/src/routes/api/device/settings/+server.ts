// Reglages d'un appareil de l'un de SES boitiers (ex. temps de course d'un volet). La propriete est
// verifiee ici ; chaque valeur est verifiee contre les champs que le type declare, la famille traduit,
// et le coeur borne le message a ce boitier (device-families.ts buildConfigure) avant que le relais ne
// le publie.
import type { RequestHandler } from './$types';
import { findDevice } from '@opencloudapp/core/store.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { familyById, buildConfigure } from '@opencloudapp/core/device-families.js';
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
  const r = buildConfigure(fam, { box: deviceId, device: slug }, b.values);
  if ('error' in r) return json(400, { error: r.error });
  try { publishCommand(r.topic, r.payload, r.retain); } catch { return json(503, { error: 'relais indisponible' }); }
  return json(200, { ok: true });
};
