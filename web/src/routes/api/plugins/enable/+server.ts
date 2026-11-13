// Operateur : active un plugin (integre, ou ajoute depuis le catalogue et deja copie), puis redemarre le
// portail pour le charger. Un plugin qui apporte un theme a appliquer (appliesTheme) le rend actif :
// activer un theme doit se voir. Dans une categorie a choix unique (connexion), activer un plugin
// eteint les autres de la categorie : la reponse les nomme.
import type { RequestHandler } from './$types';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig } from '@opencloudapp/core/config.js';
import { BUILTIN_PLUGINS, PLUGINS_DIR, PLUGIN_ID_RE, enabledPlugins, withPluginOnExclusive, pluginAppliedTheme } from '@opencloudapp/core/plugins.js';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';
import { restartSoon } from '#lib/server/restart.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const id = String((await readBody(request)).id ?? '');
  if (!PLUGIN_ID_RE.test(id)) return json(400, { error: 'identifiant invalide' });
  if (!BUILTIN_PLUGINS[id] && !existsSync(join(PLUGINS_DIR, id, 'index.js'))) return json(404, { error: 'plugin non installé' });
  const applied = await pluginAppliedTheme(id);
  const { cfg: on, turnedOff } = enabledPlugins().includes(id) ? { cfg, turnedOff: [] } : await withPluginOnExclusive(cfg, id);
  if (on !== cfg || applied) saveConfig(applied ? { ...on, theme: applied } : on);
  restartSoon();
  return json(200, { ok: true, restarting: true, turnedOff });
};
