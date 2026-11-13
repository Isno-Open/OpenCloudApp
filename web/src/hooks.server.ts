// Garde de toutes les requetes, et langue de la page.
// - Tant que le portail n'est pas configure, toute page est renvoyee vers /setup (on laisse passer
//   /setup, ses API et les fichiers). Lecture de config seule : aucune base requise.
// - Double authentification EXIGEE (politique du plugin) mais pas encore activee : renvoi vers Compte.
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { isConfigured, setupWindowRemaining, SETUP_WINDOW_S } from '@opencloudapp/core/config.js';
import { getAccount } from '@opencloudapp/core/store.js';
import { localAccountsSettings, totpRequiredFor } from '@opencloudapp/core/plugins/local-accounts-settings.js';
import { resolveAccountId, plugins } from '#lib/server/auth.ts';
import { loadConfig } from '@opencloudapp/core/config.js';
import { activeTheme } from '@opencloudapp/core/themes.js';
import { THEME_MODE, type ThemeMode } from '@opencloudapp/core/plugin-contract.js';
import { ROUTES, langOfPath } from '#lib/i18n.ts';

// Pages toujours accessibles a un compte qui doit encore activer sa double authentification.
const TOTP_FREE = new Set<string>([...Object.values(ROUTES.compte), ...Object.values(ROUTES.connexion)]);
const SETUP_PATH = '/setup';

let announced = false;

/** Mode par defaut du theme en cours (le visiteur qui a deja choisi garde son choix : app.html). Avant
 *  l'installation : sombre, comme le theme de base. */
async function defaultMode(): Promise<ThemeMode> {
  if (!isConfigured()) return THEME_MODE.dark;
  await plugins();
  return activeTheme(loadConfig()?.theme)?.mode ?? THEME_MODE.dark;
}

export const handle: Handle = async ({ event, resolve }) => {
  const p = event.url.pathname;
  event.locals.lang = langOfPath(p);
  const bypass = p === SETUP_PATH || p.startsWith('/api/setup') || p.startsWith('/_app') || p.includes('.');
  if (!isConfigured()) {
    if (!announced) {
      announced = true;
      const left = setupWindowRemaining();
      console.log(left > 0
        ? `[setup] installation ouverte sur /setup pendant encore ${left} s (fenetre de ${SETUP_WINDOW_S} s apres le demarrage).`
        : '[setup] fenetre d\'installation expiree : redemarrer le serveur pour la rouvrir.');
    }
    if (!bypass) redirect(302, SETUP_PATH);
  } else if (!bypass && !p.startsWith('/api/') && !TOTP_FREE.has(p)) {
    const id = await resolveAccountId(event.request);
    const a = id ? await getAccount(id) : null;
    if (a && !a.totpEnabled && totpRequiredFor(localAccountsSettings(), a.admin))
      redirect(302, `${ROUTES.compte[event.locals.lang]}?totp=required`);
  }
  const mode = await defaultMode();
  return resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.lang).replace('%theme-mode%', mode) });
};
