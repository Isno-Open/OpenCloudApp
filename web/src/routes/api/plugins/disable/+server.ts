// Operateur : desactive un plugin (et retire son code s'il vient du catalogue), puis redemarre le portail.
// La connexion est native : retirer un plugin ne ferme jamais le portail a son operateur.
import type { RequestHandler } from './$types';
import { loadConfig, saveConfig } from '@opencloudapp/core/config.js';
import { BUILTIN_PLUGINS, enabledPlugins, withPluginOff, isRequiredPlugin } from '@opencloudapp/core/plugins.js';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { removeCatalogPlugin } from '#lib/server/supervisor.ts';
import { restartSoon } from '#lib/server/restart.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const id = String((await readBody(request)).id ?? '');
  if (!enabledPlugins().includes(id)) return json(404, { error: 'plugin non actif' });
  if (isRequiredPlugin(id)) return json(409, { error: 'plugin toujours actif' });
  saveConfig(withPluginOff(cfg, id));
  if (!BUILTIN_PLUGINS[id]) {
    const r = await removeCatalogPlugin(id);
    if (!r.ok) console.error(`[plugins] retrait du code de ${id} :`, r.error);   // desactive quand meme : il ne sera plus charge
  }
  restartSoon();
  return json(200, { ok: true, restarting: true });
};
