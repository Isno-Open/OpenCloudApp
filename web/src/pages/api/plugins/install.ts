// Operateur : ajoute un plugin du catalogue ISNO. Le superviseur telecharge l'image et copie le code dans
// le volume des plugins ; la page suit l'avancement (status), puis demande l'activation (enable).
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';
import { installCatalogPlugin } from '../../../server/supervisor.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const r = await installCatalogPlugin(String((await readBody(request)).id ?? ''));
  return r.ok ? json(200, r.data) : json(502, { error: r.error });
};
