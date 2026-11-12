// Onboarding : installation du module requis par le choix de base (ex. MongoDB fourni), et suivi de
// son avancement. Memes gardes que le reste du setup : instance non configuree, fenetre ouverte.
import type { RequestHandler } from './$types';
import { isConfigured, setupWindowOpen, DB_MODULE, type DbKind } from '@opencloudapp/core/config.js';
import { getModule, installModule } from '#lib/server/supervisor.ts';
import { readBody, json } from '#lib/server/http.ts';

const guard = () => isConfigured() ? json(409, { error: 'instance déjà configurée' })
  : !setupWindowOpen() ? json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" }) : null;
const moduleFor = (kind: string): string | null => (DB_MODULE as Record<string, string | null>)[kind as DbKind] ?? null;

export const GET: RequestHandler = async ({ url }) => {
  const g = guard(); if (g) return g;
  const id = moduleFor(url.searchParams.get('kind') ?? '');
  if (!id) return json(400, { error: 'aucun module pour ce choix' });
  const r = await getModule(id);
  return r.ok ? json(200, r.module) : json(502, { error: r.error });
};

export const POST: RequestHandler = async ({ request }) => {
  const g = guard(); if (g) return g;
  const id = moduleFor(String((await readBody(request)).kind ?? ''));
  if (!id) return json(400, { error: 'aucun module pour ce choix' });
  const r = await installModule(id);
  return r.ok ? json(200, r.module) : json(502, { error: r.error });
};
