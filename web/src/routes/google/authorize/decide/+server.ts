// Decision de consentement (Autoriser / Refuser) de l'account linking Google Home. Endpoint SEPARE de la
// page : la reponse redirige vers l'adresse de redirection de Google, qui est EXTERNE, ce que le helper
// redirect() de SvelteKit refuse depuis une page/action (redirect_external_not_allowed). Un endpoint, lui,
// rend une Response libre, donc une redirection externe.
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { resolveAccountId } from '#lib/server/auth.ts';
import { googleHomeReady, validRedirect, makeAuthCode } from '#lib/server/google-oauth.ts';
import { readBody } from '#lib/server/http.ts';

const DECISION = { allow: 'allow', deny: 'deny' } as const;

/** Redirige (303) vers Google avec un parametre (code ou error), en conservant l'etat. */
function toGoogle(redirectUri: string, params: Record<string, string>): Response {
  const dest = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) dest.searchParams.set(k, v);
  return new Response(null, { status: 303, headers: { location: dest.toString() } });
}

export const POST: RequestHandler = async ({ request }) => {
  if (!(await googleHomeReady())) throw error(404);
  const b = await readBody(request);
  const redirectUri = String(b.redirect_uri ?? ''), state = String(b.state ?? ''), decision = String(b.decision ?? '');
  if (!validRedirect(redirectUri)) throw error(400, 'Redirection invalide.');
  if (decision === DECISION.deny) return toGoogle(redirectUri, { error: 'access_denied', state });
  const account = await resolveAccountId(request);   // cookie de session (first-party)
  console.error(`[gh/decide] account=${account ?? 'NONE'} out state=${JSON.stringify(state)} redirect=${redirectUri}`);
  if (!account) throw error(401, 'Non connecté.');
  const code = makeAuthCode(account);
  if (!code) throw error(500, 'Signature indisponible.');
  return toGoogle(redirectUri, { code, state });
};
