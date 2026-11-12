// Noms d'hote proposes a l'installation : le portail tel qu'on y accede ; le broker deduit du portail
// (ou repris de son certificat si l'installation est rejouee). Tout reste modifiable.
import type { APIRoute } from 'astro';
import { isConfigured } from '@core/config.js';
import { suggestBrokerHost, BROKER_PUBLIC_PORT } from '../../../server/hosts.ts';
import { json } from '../../../server/http.ts';

export const GET: APIRoute = ({ request }) => {
  if (isConfigured()) return json(409, { error: 'instance déjà configurée' });
  const appHost = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '').split(',')[0]!.trim();
  return json(200, { appHost, brokerHost: suggestBrokerHost(appHost), brokerPort: BROKER_PUBLIC_PORT });
};
