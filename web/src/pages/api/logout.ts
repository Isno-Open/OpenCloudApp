// Deconnexion : efface les cookies de session de TOUS les providers (local, SSO...). Sinon un provider
// encore valide reconnecterait aussitot l'utilisateur, eventuellement sous un autre compte.
import type { APIRoute } from 'astro';
import { logoutCookies } from '@core/auth-provider.js';
import { plugins } from '../../server/auth.ts';

export const POST: APIRoute = async () => {
  await plugins();
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const c of logoutCookies()) headers.append('Set-Cookie', c);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
