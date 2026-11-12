// App cloud (OpenCloudApp) : SvelteKit, rendu par le serveur (adaptateur node), un seul process avec le
// coeur backend (paquet @opencloudapp/core, ../server, compile dans dist). Depuis SvelteKit 3, la configuration
// passe par le plugin (plus de svelte.config.js).
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [sveltekit({
    adapter: adapter(),
    // CSRF assure par le cookie de session SameSite=Lax (non envoye sur un POST d'un autre site). La
    // verification d'origine casse derriere un reverse-proxy (origine deduite != hote reel) : levee,
    // comme avant (Astro, checkOrigin: false).
    csrf: { trustedOrigins: ['*'] },
    // service worker enregistre par la page SEULEMENT si le plugin « Application installable » est actif
    serviceWorker: { register: false },
  })],
  server: { host: '0.0.0.0', port: 4321, fs: { allow: [repoRoot] } },
  ssr: {
    // le coeur est EMPAQUETE dans le serveur (une seule copie de ses registres, et ses dependances se
    // resolvent depuis l'app, ou better-sqlite3 est compile) ; ses dependances natives restent externes
    noExternal: ['@opencloudapp/core'],
    external: ['better-sqlite3', 'mqtt', 'mongodb'],
  },
});
