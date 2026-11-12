// Service worker du portail installable (plugin « Application installable »). Minimal : une page
// « portail injoignable » quand la navigation echoue hors connexion. Aucune donnee du portail n'est
// gardee en cache : un portail de pilotage doit montrer l'etat reel ou rien.
const OFFLINE_URL = '/pwa/offline.html';
const CACHE = 'portal-offline-v1';

const isServiceWorker = (g: unknown): g is ServiceWorkerGlobalScope =>
  typeof g === 'object' && g !== null && 'registration' in g && 'clients' in g;

// les proprietes on* portent le type exact de chaque evenement (installation, activation, requete)
if (isServiceWorker(self)) {
  const sw = self;
  sw.oninstall = (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)).then(() => sw.skipWaiting()));
  };
  sw.onactivate = (e) => {
    e.waitUntil(caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => sw.clients.claim()));
  };
  sw.onfetch = (e) => {
    if (e.request.mode !== 'navigate') return;   // tout le reste passe tel quel, sans cache
    e.respondWith(fetch(e.request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()));
  };
}
