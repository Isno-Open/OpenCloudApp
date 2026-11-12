// Operateur : active un plugin (integre, ou ajoute depuis le catalogue et deja copie), puis redemarre le
// portail pour le charger.
import type { APIRoute } from 'astro';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig } from '@core/config.js';
import { BUILTIN_PLUGINS, PLUGINS_DIR, PLUGIN_ID_RE, enabledPlugins } from '@core/plugins.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';
import { restartSoon } from '../../../server/restart.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const id = String((await readBody(request)).id ?? '');
  if (!PLUGIN_ID_RE.test(id)) return json(400, { error: 'identifiant invalide' });
  if (!BUILTIN_PLUGINS[id] && !existsSync(join(PLUGINS_DIR, id, 'index.js'))) return json(404, { error: 'plugin non installé' });
  const list = enabledPlugins();
  if (!list.includes(id)) saveConfig({ ...cfg, plugins: [...list, id] });
  restartSoon();
  return json(200, { ok: true, restarting: true });
};
