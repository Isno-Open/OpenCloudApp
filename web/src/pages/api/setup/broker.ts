// Onboarding : mise en place du broker au nom choisi (public ou reseau local). Le nom doit se resoudre ;
// la pile emet alors son certificat, ecrit sa config, et le superviseur l'installe ou le redemarre.
// GET : etat du module broker (pour suivre l'installation).
import type { APIRoute } from 'astro';
import { lookup } from 'node:dns/promises';
import { isConfigured, setupWindowOpen } from '@core/config.js';
import { ensureCA, ensureRelayCert } from '@core/pki.js';
import { normalizeHost } from '../../../server/hosts.ts';
import { prepareBroker } from '../../../server/broker.ts';
import { getModule, BROKER_MODULE } from '../../../server/supervisor.ts';
import { readBody, json } from '../../../server/http.ts';

const guard = () => isConfigured() ? json(409, { error: 'instance déjà configurée' })
  : !setupWindowOpen() ? json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" }) : null;

export const GET: APIRoute = async () => {
  const g = guard(); if (g) return g;
  const r = await getModule(BROKER_MODULE);
  return r.ok ? json(200, r.module) : json(502, { error: r.error });
};

export const POST: APIRoute = async ({ request }) => {
  const g = guard(); if (g) return g;
  const host = normalizeHost(String((await readBody(request)).brokerHost ?? ''))?.replace(/:\d+$/, '') ?? null;
  if (!host) return json(400, { error: "nom d'hôte du broker invalide" });
  try { await lookup(host.replace(/:\d+$/, '')); }
  catch { return json(400, { error: `« ${host} » ne se résout pas (DNS) : créez d'abord l'enregistrement` }); }
  ensureCA(); ensureRelayCert();
  const r = await prepareBroker(host);
  return r.ok ? json(200, r.module) : json(502, { error: r.error });
};
