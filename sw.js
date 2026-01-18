const CACHE_VERSION = 'v10';
const CACHE_NAME = `llb1-cache-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './theme.js',
  './scripts/page-init.js',
  './app.js',
  './manifest.json',
  './favicon.ico',
  './src/lib/constants.js',
  './src/lib/dom.js',
  './src/lib/errors.js',
  './src/lib/paths.js',
  './src/lib/safeHtml.js',
  './src/lib/state.js',
  './src/lib/storage.js',
  './src/lib/utils.js',
  './src/lib/render.js',
  './src/lib/match.js',
  './src/lib/forge.js',
  './conjugation-sprint.html',
  './src/games/conjugation-sprint/index.js',
  './data/words.json',
  './data/words.offline.js',
  './i18n/lv.json',
  './i18n/en.json',
  './i18n/ru.json',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('llb1-cache-') && key !== CACHE_NAME)
            .map(key => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('./index.html')),
        ),
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request)
            .then(response => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => cached);
          if (cached) {
            event.waitUntil(fetchPromise.catch(() => {}));
            return cached;
          }
          return fetchPromise;
        }),
      ),
    );
    return;
  }

  if (url.origin === self.location.origin && ['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        });
      }),
    );
    return;
  }
});
