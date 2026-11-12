// Manifeste de l'application installable : seulement si le plugin est actif.
import type { RequestHandler } from './$types';
import { installableEnabled, manifest } from '#lib/server/pwa.ts';

export const GET: RequestHandler = async () => {
  if (!(await installableEnabled())) return new Response(null, { status: 404 });
  return new Response(JSON.stringify(manifest()), { headers: { 'content-type': 'application/manifest+json' } });
};
