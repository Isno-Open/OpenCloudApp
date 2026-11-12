// Identifiant aleatoire de ce process : sert a prouver qu'une URL publique mene bien a CETTE instance.
import type { RequestHandler } from './$types';
import { INSTANCE_NONCE } from '#lib/server/hosts.ts';
import { json } from '#lib/server/http.ts';

export const GET: RequestHandler = () => json(200, { nonce: INSTANCE_NONCE });
