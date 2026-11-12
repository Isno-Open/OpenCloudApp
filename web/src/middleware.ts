// Garde d'onboarding : tant que le portail n'est pas configure, toute page est renvoyee vers /setup.
// On laisse passer /setup, ses API, les assets (/_astro, /_image) et tout chemin a extension (fichiers),
// pour que l'ecran de setup s'affiche avec son style. Lecture de config seule : aucune base requise.
import { isConfigured, setupWindowRemaining, SETUP_WINDOW_S } from '@core/config.js';
import { defineMiddleware } from 'astro:middleware';
import { getAccount } from '@core/store.js';
import { localAccountsSettings, totpRequiredFor } from '@core/plugins/local-accounts-settings.js';
import { resolveAccountId } from './server/auth.ts';
import { ROUTES } from './lib/i18n.ts';

// Pages toujours accessibles a un compte qui doit encore activer sa double authentification.
const TOTP_FREE = new Set<string>([...Object.values(ROUTES.compte), ...Object.values(ROUTES.connexion)]);

let announced = false;

export const onRequest = defineMiddleware(async (context, next) => {
  const p = new URL(context.request.url).pathname;
  const bypass = p === '/setup' || p.startsWith('/api/setup') || p.startsWith('/_') || p.includes('.');
  if (!isConfigured()) {
    if (!announced) {
      announced = true;
      const left = setupWindowRemaining();
      console.log(left > 0
        ? `[setup] installation ouverte sur /setup pendant encore ${left} s (fenetre de ${SETUP_WINDOW_S} s apres le demarrage).`
        : '[setup] fenetre d\'installation expiree : redemarrer le serveur pour la rouvrir.');
    }
    if (!bypass) return context.redirect('/setup');
    return next();
  }
  // Double authentification EXIGEE (politique du greffon) mais pas encore activee : renvoi vers Compte.
  if (!bypass && !p.startsWith('/api/') && !TOTP_FREE.has(p)) {
    const id = await resolveAccountId(context.request);
    const a = id ? await getAccount(id) : null;
    if (a && !a.totpEnabled && totpRequiredFor(localAccountsSettings(), a.admin))
      return context.redirect(`${p.startsWith('/en') ? ROUTES.compte.en : ROUTES.compte.fr}?totp=required`);
  }
  return next();
});
