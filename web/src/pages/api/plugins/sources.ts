// Operateur : sources de plugins (catalogues tiers, adresses https), en plus du catalogue ISNO.
// Ajouter une source, c'est faire confiance a son auteur : ses plugins tourneront dans le portail.
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';
import { listCatalogPlugins } from '../../../server/supervisor.ts';

const MAX_SOURCES = 20;

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const b = await readBody(request);
  const current = cfg.pluginSources ?? [];
  let next = current;
  if (typeof b.add === 'string') {
    const url = b.add.trim();
    if (current.includes(url)) return json(409, { error: 'source déjà ajoutée' });
    if (current.length >= MAX_SOURCES) return json(409, { error: `${MAX_SOURCES} sources au plus` });
    // la source doit se lire et se valider AVANT d'etre gardee (regles : superviseur, https compris)
    const r = await listCatalogPlugins([url]);
    if (!r.ok) return json(502, { error: r.error });
    const err = r.errors.find((e) => e.source === url && e.unreadable);
    if (err) return json(400, { error: `source illisible : ${err.error}` });
    next = [...current, url];
  } else if (typeof b.remove === 'string') {
    next = current.filter((u) => u !== b.remove);
  } else return json(400, { error: 'add ou remove attendu' });
  const { pluginSources: _old, ...rest } = cfg;
  saveConfig(next.length ? { ...rest, pluginSources: next } : rest);
  return json(200, { ok: true, sources: next });
};
