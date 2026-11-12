// Operateur : avancement de l'installation (ou du retrait) d'un plugin du catalogue.
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../server/auth.ts';
import { json } from '../../../server/http.ts';
import { catalogPlugin } from '../../../server/supervisor.ts';

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const r = await catalogPlugin(url.searchParams.get('id') ?? '');
  return r.ok ? json(200, r.data) : json(502, { error: r.error });
};
