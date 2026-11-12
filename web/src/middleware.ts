// Garde d'onboarding : tant que le portail n'est pas configure, toute page est renvoyee vers /setup.
// On laisse passer /setup, ses API, les assets (/_astro, /_image) et tout chemin a extension (fichiers),
// pour que l'ecran de setup s'affiche avec son style. Lecture de config seule : aucune base requise.
import { isConfigured, setupWindowRemaining, SETUP_WINDOW_S } from '@core/config.js';
import { defineMiddleware } from 'astro:middleware';

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
  }
  return next();
});
