// Page de consentement OAuth (account linking Google Home). Google ouvre cette page dans le navigateur
// de l'utilisateur (first-party, donc le cookie de session est lu) ; l'utilisateur autorise, on rend un
// code d'autorisation a l'adresse de redirection de Google. Phase 1 : il faut etre deja connecte a
// app.isno.fr (le retour-apres-connexion sera un polish de phase 2).
import type { PageServerLoad, Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { resolveAccountId } from '#lib/server/auth.ts';
import { googleHomeReady, configuredClientId, validRedirect, makeAuthCode } from '#lib/server/google-oauth.ts';

const RESPONSE_TYPE = 'code';

/** Redirige vers Google avec un parametre (code ou error), en conservant l'etat. */
function toGoogle(redirectUri: string, params: Record<string, string>): never {
  const dest = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v) dest.searchParams.set(k, v);
  throw redirect(303, dest.toString());
}

export const load: PageServerLoad = async ({ request, url }) => {
  if (!(await googleHomeReady())) throw error(404, 'Google Home non activé sur ce portail.');
  const clientId = url.searchParams.get('client_id') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (clientId !== configuredClientId() || url.searchParams.get('response_type') !== RESPONSE_TYPE || !validRedirect(redirectUri)) {
    throw error(400, 'Requête de liaison Google invalide.');
  }
  return { account: await resolveAccountId(request), redirectUri, state };
};

export const actions: Actions = {
  allow: async ({ request }) => {
    if (!(await googleHomeReady())) throw error(404);
    const fd = await request.formData();
    const redirectUri = String(fd.get('redirect_uri') ?? ''), state = String(fd.get('state') ?? '');
    if (!validRedirect(redirectUri)) throw error(400);
    const account = await resolveAccountId(request);
    if (!account) throw error(401, 'Non connecté.');
    const code = makeAuthCode(account);
    if (!code) throw error(500, 'Signature indisponible.');
    toGoogle(redirectUri, { code, state });
  },
  deny: async ({ request }) => {
    const fd = await request.formData();
    const redirectUri = String(fd.get('redirect_uri') ?? ''), state = String(fd.get('state') ?? '');
    if (!validRedirect(redirectUri)) throw error(400);
    toGoogle(redirectUri, { error: 'access_denied', state });
  },
};
