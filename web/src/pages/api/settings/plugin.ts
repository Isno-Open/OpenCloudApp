// Operateur : reglages d'un plugin installe. Le plugin valide et borne lui-meme (fromForm) : le coeur
// ne connait pas le sens des valeurs, il les range sous l'identifiant du plugin.
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { pluginSettingsFromForm } from '@core/plugins.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const b = await readBody(request);
  const id = String(b.id ?? '');
  const values = (b.values && typeof b.values === 'object' ? b.values : {}) as Record<string, unknown>;
  const settings = pluginSettingsFromForm(id, values);
  if (settings === null) return json(404, { error: 'plugin absent ou sans réglages' });
  saveConfig({ ...cfg, pluginSettings: { ...(cfg.pluginSettings ?? {}), [id]: settings } });
  return json(200, { ok: true });
};
