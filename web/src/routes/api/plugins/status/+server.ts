// Operateur : avancement de l'installation (ou du retrait) d'un plugin du catalogue.
import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/auth.ts';
import { json } from '#lib/server/http.ts';
import { catalogPlugin } from '#lib/server/supervisor.ts';

export const GET: RequestHandler = async ({ request, url }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const r = await catalogPlugin(url.searchParams.get('id') ?? '');
  return r.ok ? json(200, r.data) : json(502, { error: r.error });
};
