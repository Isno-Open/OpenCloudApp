import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import { fileURLToPath } from 'node:url';

// App cloud ISNO (app.isno.fr), SSR comme le site isno.fr (Astro 5 + adaptateur node).
// Backend partage : on importe le coeur isno-cloud compile (../server/dist) via l'alias @core.
// Les deps natives (better-sqlite3, mqtt, mongodb) restent externes (resolues au runtime).
const core = fileURLToPath(new URL('../server/dist', import.meta.url));
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Ecrans interactifs en composants Svelte (TypeScript strict), rendus d'abord par le serveur.
  integrations: [svelte()],
  // CSRF assuree par le cookie de session SameSite=Lax (non envoye sur un POST cross-site) ; le
  // checkOrigin d'Astro casse derriere le reverse-proxy (origine derivee != hote reel).
  security: { checkOrigin: false },
  server: { host: '0.0.0.0', port: 4321 },
  devToolbar: { enabled: false },
  vite: {
    resolve: { alias: { '@core': core } },
    server: { fs: { allow: [repoRoot] } },
    ssr: { external: ['better-sqlite3', 'mqtt', 'mongodb'] },
  },
});
