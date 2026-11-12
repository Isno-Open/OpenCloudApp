// Operateur : ajoute un plugin du catalogue ISNO. Le superviseur telecharge l'image et copie le code dans
// le volume des plugins ; la page suit l'avancement (status), puis demande l'activation (enable).
import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { installCatalogPlugin, listCatalogPlugins } from '#lib/server/supervisor.ts';
import { loadConfig } from '@opencloudapp/core/config.js';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  await listCatalogPlugins(loadConfig()?.pluginSources ?? []);
  const r = await installCatalogPlugin(String((await readBody(request)).id ?? ''));
  return r.ok ? json(200, r.data) : json(502, { error: r.error });
};
