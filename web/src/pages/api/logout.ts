// Deconnexion : efface les cookies de session de TOUS les providers (local, SSO...). Sinon un provider
// encore valide reconnecterait aussitot l'utilisateur, eventuellement sous un autre compte.
import type { APIRoute } from 'astro';
import { wireAuth, logoutCookies } from '@core/auth-provider.js';

export const POST: APIRoute = async () => {
  await wireAuth();
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const c of logoutCookies()) headers.append('Set-Cookie', c);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
