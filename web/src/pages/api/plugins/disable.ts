// Operateur : desactive un plugin (et retire son code s'il vient du catalogue), puis redemarre le portail.
// La connexion est native : retirer un plugin ne ferme jamais le portail a son operateur.
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { BUILTIN_PLUGINS, enabledPlugins } from '@core/plugins.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';
import { removeCatalogPlugin } from '../../../server/supervisor.ts';
import { restartSoon } from '../../../server/restart.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const id = String((await readBody(request)).id ?? '');
  if (!enabledPlugins().includes(id)) return json(404, { error: 'plugin non actif' });
  saveConfig({ ...cfg, plugins: enabledPlugins().filter((p) => p !== id) });
  if (!BUILTIN_PLUGINS[id]) {
    const r = await removeCatalogPlugin(id);
    if (!r.ok) console.error(`[plugins] retrait du code de ${id} :`, r.error);   // desactive quand meme : il ne sera plus charge
  }
  restartSoon();
  return json(200, { ok: true, restarting: true });
};
