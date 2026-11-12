// Garde d'onboarding : tant que le portail n'est pas configure, toute page est renvoyee vers /setup.
// On laisse passer /setup, ses API, les assets (/_astro, /_image) et tout chemin a extension (fichiers),
// pour que l'ecran de setup s'affiche avec son style. Lecture de config seule : aucune base requise.
import { isConfigured, ensureSetupToken } from '@core/config.js';
import { defineMiddleware } from 'astro:middleware';

let tokenLogged = false;

export const onRequest = defineMiddleware(async (context, next) => {
  const p = new URL(context.request.url).pathname;
  const bypass = p === '/setup' || p.startsWith('/api/setup') || p.startsWith('/_') || p.includes('.');
  if (!isConfigured()) {
    if (!tokenLogged) { tokenLogged = true; console.log(`[setup] onboarding requis. Jeton (à saisir sur /setup) : ${ensureSetupToken()}`); }
    if (!bypass) return context.redirect('/setup');
  }
  return next();
});
