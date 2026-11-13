// Icone du theme (image deja verifiee par le coeur) : onglet du navigateur, et application installable.
// Servie que le plugin d'application soit actif ou non. L'adresse porte une empreinte (?v=) : une
// icone changee change d'adresse, celle-ci peut donc rester longtemps en cache.
import type { RequestHandler } from './$types';
import { isConfigured } from '@opencloudapp/core/config.js';
import { plugins } from '#lib/server/auth.ts';
import { themeIcon } from '#lib/server/pwa.ts';

const CACHE = 'public, max-age=86400';

export const GET: RequestHandler = async () => {
  if (!isConfigured()) return new Response(null, { status: 404 });
  await plugins();   // les themes viennent des plugins
  const icon = themeIcon();
  if (!icon) return new Response(null, { status: 404 });
  return new Response(icon.bytes, { headers: { 'content-type': icon.type, 'cache-control': CACHE } });
};
