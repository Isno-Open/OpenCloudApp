// Fichier d'un boitier (ex. sa sauvegarde), demande a la volee : le portail publie la demande que la
// famille traduit, attend la reponse du boitier, et la remet au navigateur. Il n'en garde AUCUNE copie
// (device-families.ts awaitBoxFile : remise a qui l'attend, puis oubliee). Propriete verifiee ici.
import type { RequestHandler } from './$types';
import { findDevice } from '@opencloudapp/core/store.js';
import { publishCommand, deviceOnline } from '@opencloudapp/core/mqtt.js';
import { familyById, buildFileRequest, awaitBoxFile } from '@opencloudapp/core/device-families.js';
import { BOX_FILE_TYPE, type BoxFileType } from '@opencloudapp/core/family-contract.js';
import { resolveAccountId, plugins } from '#lib/server/auth.ts';
import { json } from '#lib/server/http.ts';

/** Attente de la reponse du boitier : une sauvegarde de 24 appareils traverse un Wi-Fi qui perd des
 *  paquets (mesure du 2026-11-15 : jusqu'a 20 % au ping) ; au-dela, le boitier est tenu pour muet. */
const FILE_WAIT_MS = 20_000;
const MEDIA: Readonly<Record<BoxFileType, { ext: string; mime: string }>> = {
  [BOX_FILE_TYPE.json]: { ext: 'json', mime: 'application/json' },
};
/** Nom du fichier telecharge : nom du boitier rendu sur, le fichier, la date du jour. */
const fileName = (box: string, file: string, ext: string): string =>
  `${box.normalize('NFD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'carte'}-${file}-${new Date().toISOString().slice(0, 10)}.${ext}`;

export const GET: RequestHandler = async ({ request, url }) => {
  const acc = await resolveAccountId(request);
  if (!acc) return json(401, { error: 'auth' });
  const deviceId = url.searchParams.get('device_id') ?? '', file = url.searchParams.get('file') ?? '';
  const dev = await findDevice(deviceId, acc);
  if (!dev) return json(403, { error: 'device non possédé' });
  await plugins();
  const fam = familyById(dev.firmware);
  if (!fam) return json(409, { error: 'famille de cartes non installée' });
  const decl = (fam.boxFiles ?? []).find((d) => d.id === file);
  if (!decl) return json(404, { error: 'fichier de la carte inconnu' });
  if (!deviceOnline(dev.firmware, deviceId)) return json(409, { error: 'carte hors ligne' });
  const r = buildFileRequest(fam, deviceId, file);
  if ('error' in r) return json(400, { error: r.error });
  // s'inscrire AVANT de publier : la reponse peut arriver aussitot
  const answer = awaitBoxFile(fam.id, deviceId, file, FILE_WAIT_MS);
  try { publishCommand(r.topic, r.payload, r.retain); } catch { return json(503, { error: 'relais indisponible' }); }
  const content = await answer;
  if (content === null) return json(504, { error: 'la carte n’a pas répondu' });
  const m = MEDIA[decl.type];
  return new Response(content, { status: 200, headers: {
    'content-type': `${m.mime}; charset=utf-8`,
    'content-disposition': `attachment; filename="${fileName(dev.name, file, m.ext)}"`,
    'cache-control': 'no-store',
  } });
};
