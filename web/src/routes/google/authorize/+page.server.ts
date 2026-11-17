// Page de consentement OAuth (account linking Google Home). Google ouvre cette page dans le navigateur
// de l'utilisateur (first-party, donc le cookie de session est lu) ; l'utilisateur autorise, on rend un
// code d'autorisation a l'adresse de redirection de Google. Phase 1 : il faut etre deja connecte a
// app.isno.fr (le retour-apres-connexion sera un polish de phase 2).
// La page NE FAIT QUE valider la requete OAuth et afficher le consentement. La decision (Autoriser /
// Refuser) est postee a l'endpoint voisin decide/+server.ts, car elle redirige vers Google (externe).
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { resolveAccountId, loginRedirect } from '#lib/server/auth.ts';
import { googleHomeReady, configuredClientId, validRedirect } from '#lib/server/google-oauth.ts';

const RESPONSE_TYPE = 'code';

/** Adresse de l'auth normale (SSO) a laquelle revenir sur CETTE page apres connexion (next dynamique),
 *  ou null si aucune auth externe n'est configuree. La fenetre de Google n'a pas forcement de session :
 *  on l'y envoie, le SSO pose le cookie (.isno.fr) et renvoie ici, ou la session est alors lue. */
async function ssoReturn(current: URL): Promise<string | null> {
  const base = await loginRedirect();
  if (!base) return null;
  try { const u = new URL(base); u.searchParams.set('next', current.toString()); return u.toString(); }
  catch { return null; }
}

export const load: PageServerLoad = async ({ request, url }) => {
  if (!(await googleHomeReady())) throw error(404, 'Google Home non activé sur ce portail.');
  const clientId = url.searchParams.get('client_id') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (clientId !== configuredClientId() || url.searchParams.get('response_type') !== RESPONSE_TYPE || !validRedirect(redirectUri)) {
    throw error(400, 'Requête de liaison Google invalide.');
  }
  const account = await resolveAccountId(request);
  return { account, redirectUri, state, ssoUrl: account ? null : await ssoReturn(url) };
};
