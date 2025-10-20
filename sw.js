const CACHE_VERSION = 'v8';
const CACHE_NAME = `ll-b1-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './travel-tracker.html',
  './darbibas-vards.html',
  './conjugation-sprint.html',
  './endings-builder.html',
  './assets/styles.css',
  './assets/app.js',
  './assets/img/travel-tracker/latvia.svg',
  './assets/img/travel-tracker/bus.svg',
  './data/words.json',
  './data/words.offline.js',
  './data/week1.offline.js',
  './data/travel-tracker/routes.json',
  './manifest.json',
  './src/css/endings-builder.css',
  './src/js/endings-builder.js',
  './src/js/game-shell.js',
  './src/js/dnd.js',
  './src/js/endings-resolver.js',
  './src/js/norm.js',
  './src/data/endings.json',
  './src/data/endings-items.json',
  './src/data/endings.offline.js',
  './src/games/travel-tracker/index.js',
  './src/games/travel-tracker/utils.js',
  './src/games/travel-tracker/styles.css',
  './i18n/en.json',
  './i18n/lv.json',
  './i18n/ru.json',
  './i18n/offline.js',
  './i18n/travel-tracker.en.json',
  './i18n/travel-tracker.lv.json',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(key => key.startsWith('ll-b1-') && key !== CACHE_NAME).map(key => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (request.url.endsWith('/data/words.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        if (request.destination === 'document') {
          return new Response(
            `<!doctype html><html lang="lv"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="font-family: system-ui, sans-serif; padding:1rem"><h1>Bezsaistes režīms</h1><p>Saturs nav pieejams bezsaistē. Atgriezies tiešsaistē un mēģini vēlreiz.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          );
        }
        return undefined;
      });
    }),
  );
});
