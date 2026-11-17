// Page de consentement OAuth (account linking Google Home). Google ouvre cette page dans le navigateur
// de l'utilisateur (first-party, donc le cookie de session est lu) ; l'utilisateur autorise, on rend un
// code d'autorisation a l'adresse de redirection de Google. Phase 1 : il faut etre deja connecte a
// app.isno.fr (le retour-apres-connexion sera un polish de phase 2).
// La page NE FAIT QUE valider la requete OAuth et afficher le consentement. La decision (Autoriser /
// Refuser) est postee a l'endpoint voisin decide/+server.ts, car elle redirige vers Google (externe).
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { resolveAccountId } from '#lib/server/auth.ts';
import { googleHomeReady, configuredClientId, validRedirect } from '#lib/server/google-oauth.ts';

const RESPONSE_TYPE = 'code';

export const load: PageServerLoad = async ({ request, url }) => {
  if (!(await googleHomeReady())) throw error(404, 'Google Home non activé sur ce portail.');
  const clientId = url.searchParams.get('client_id') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (clientId !== configuredClientId() || url.searchParams.get('response_type') !== RESPONSE_TYPE || !validRedirect(redirectUri)) {
    throw error(400, 'Requête de liaison Google invalide.');
  }
  console.error(`[gh/authorize] in state=${JSON.stringify(state)} redirect=${redirectUri} scope=${url.searchParams.get('scope') ?? ''}`);
  return { account: await resolveAccountId(request), redirectUri, state };
};
