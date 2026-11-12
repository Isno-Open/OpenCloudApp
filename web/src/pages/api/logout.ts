// Deconnexion : efface les cookies de session de TOUS les providers (local, SSO...). Sinon un provider
// encore valide reconnecterait aussitot l'utilisateur, eventuellement sous un autre compte.
import type { APIRoute } from 'astro';
import { logoutCookies, externalLogoutUrl } from '@core/auth-provider.js';
import { plugins } from '../../server/auth.ts';

export const POST: APIRoute = async () => {
  await plugins();
  const headers = new Headers({ 'content-type': 'application/json' });
  for (const c of logoutCookies()) headers.append('Set-Cookie', c);
  // redirect : adresse de deconnexion du site externe (connexion unique), sinon null (accueil du portail)
  return new Response(JSON.stringify({ ok: true, redirect: externalLogoutUrl() }), { status: 200, headers });
};
