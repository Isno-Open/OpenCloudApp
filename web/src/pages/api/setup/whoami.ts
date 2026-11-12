// Identifiant aleatoire de ce process : sert a prouver qu'une URL publique mene bien a CETTE instance.
import type { APIRoute } from 'astro';
import { INSTANCE_NONCE } from '../../../server/hosts.ts';
import { json } from '../../../server/http.ts';

export const GET: APIRoute = () => json(200, { nonce: INSTANCE_NONCE });
