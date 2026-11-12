// Icone de l'application tiree du logo du theme (image deja verifiee par le coeur).
import type { RequestHandler } from './$types';
import { installableEnabled, themeIcon } from '#lib/server/pwa.ts';

export const GET: RequestHandler = async () => {
  const icon = (await installableEnabled()) ? themeIcon() : null;
  if (!icon) return new Response(null, { status: 404 });
  return new Response(icon.bytes, { headers: { 'content-type': icon.type, 'cache-control': 'public, max-age=3600' } });
};
