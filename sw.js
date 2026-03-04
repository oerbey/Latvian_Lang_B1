/**
 * sw.js — Service Worker for the Latvian Language B1 PWA.
 * =======================================================
 * Implements an offline-first caching strategy so all 14 games work
 * without a network connection once visited.
 *
 * Caching strategies per resource type:
 *   • Navigation (HTML pages)  — network-first, falls back to cache (then index.html).
 *   • JSON data files          — stale-while-revalidate (serve cached, refresh in background).
 *   • Scripts, styles, images  — cache-first (immutable assets with versioned filenames).
 *
 * CACHE_VERSION must be bumped on every release so the activate event
 * can purge stale caches.
 */
const CACHE_VERSION = 'v16';
const CACHE_NAME = `llb1-cache-${CACHE_VERSION}`;

/**
 * CORE_ASSETS — the full set of URLs pre-cached during the `install` event.
 * Includes every HTML page, JS module, CSS file, JSON data file, and icon
 * needed for offline play.
 */
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './theme.js',
  './scripts/page-init.js',
  './app.js',
  './manifest.json',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './src/lib/constants.js',
  './src/lib/dom.js',
  './src/lib/errors.js',
  './src/lib/paths.js',
  './src/lib/safeHtml.js',
  './src/lib/state.js',
  './src/lib/storage.js',
  './src/lib/utils.js',
  './src/lib/render.js',
  './src/lib/reward.js',
  './src/lib/match.js',
  './src/lib/forge.js',
  './character-traits.html',
  './conjugation-sprint.html',
  './darbibas-vards.html',
  './decl6-detective.html',
  './duty-dispatcher.html',
  './english-latvian-arcade.html',
  './endings-builder.html',
  './maini-vai-mainies.html',
  './passive-lab.html',
  './sentence-surgery-passive.html',
  './rakstura-ipasibas-expansion.html',
  './rakstura-ipasibas-match.html',
  './travel-tracker.html',
  './week1.html',
  './src/games/conjugation-sprint/index.js',
  './src/games/character-traits/index.js',
  './src/games/character-traits-expansion/index.js',
  './src/games/character-traits-match/index.js',
  './src/games/decl6-detective/index.js',
  './src/games/duty-dispatcher/index.js',
  './src/games/english-latvian-arcade/index.js',
  './src/games/english-latvian-arcade/logic.js',
  './src/games/english-latvian-arcade/styles.css',
  './src/games/endings-builder/index.js',
  './src/games/maini-vai-mainies/index.js',
  './src/games/passive-lab/index.js',
  './src/games/sentence-surgery-passive/index.js',
  './src/games/sentence-surgery-passive/data.js',
  './src/games/sentence-surgery-passive/progress.js',
  './src/games/sentence-surgery-passive/tokenize.js',
  './src/games/sentence-surgery-passive/styles.css',
  './src/games/travel-tracker/index.js',
  './data/words.json',
  './data/words/index.json',
  './data/words/chunk-01.json',
  './data/words/chunk-02.json',
  './data/words/chunk-03.json',
  './data/words/chunk-04.json',
  './data/words.offline.js',
  './data/decl6-detective/items.json',
  './data/duty-dispatcher/tasks.json',
  './data/duty-dispatcher/roles.json',
  './data/endings-builder/items.json',
  './data/endings-builder/tables.json',
  './data/maini-vai-mainies/items.json',
  './data/passive-lab/items.json',
  './sentence_surgery_pack/sentence_surgery_passive_dataset.json',
  './data/travel-tracker/routes.json',
  './data/personality/words.json',
  './data/lv-en/units.json',
  './data/lv-en/forge.json',
  './data/lv-en/units/mainit-mainities-gimene.json',
  './data/lv-en/units/braukt-ar-priedekliem.json',
  './data/lv-en/units/iet-ar-priedekliem.json',
  './data/lv-en/units/nakt-ar-priedekliem.json',
  './data/lv-en/units/kapt-ar-priedekliem.json',
  './data/lv-en/units/lidot-ar-priedekliem.json',
  './data/lv-en/units/nest-ar-priedekliem.json',
  './data/lv-en/units/refleksivie-un-dzives-notikumi.json',
  './data/lv-en/units/b1-paligdarbibas-vardi.json',
  './data/lv-en/units/week1-movements.json',
  './data/lv-ru/units.json',
  './data/lv-ru/forge.json',
  './data/lv-ru/units/mainit-mainities-gimene.json',
  './data/lv-ru/units/braukt-ar-priedekliem.json',
  './data/lv-ru/units/iet-ar-priedekliem.json',
  './data/lv-ru/units/nakt-ar-priedekliem.json',
  './data/lv-ru/units/kapt-ar-priedekliem.json',
  './data/lv-ru/units/lidot-ar-priedekliem.json',
  './data/lv-ru/units/nest-ar-priedekliem.json',
  './data/lv-ru/units/refleksivie-un-dzives-notikumi.json',
  './data/lv-ru/units/b1-paligdarbibas-vardi.json',
  './data/lv-ru/units/week1-movements.json',
  './i18n/lv.json',
  './i18n/en.json',
  './i18n/ru.json',
];

/**
 * install — Pre-cache all core assets when the worker is first registered.
 * The browser waits until every URL in CORE_ASSETS is cached before
 * activating this version.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

/**
 * activate — Delete old caches whose names no longer match CACHE_NAME.
 * Then claim all open clients so the new worker takes effect immediately.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('llb1-cache-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

/**
 * message — Listen for SKIP_WAITING messages from the main thread.
 * When the UI detects a new worker is waiting, it sends this message
 * to force the waiting worker to activate immediately (instant update).
 */
self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * fetch — Intercept every outgoing GET request and apply the appropriate
 * caching strategy based on request type:
 *
 *   1. Navigation requests (HTML pages) → Network-first with cache fallback.
 *      If both fail, serve cached index.html as an app-shell fallback.
 *
 *   2. Same-origin JSON files → Stale-while-revalidate: serve cached data
 *      instantly while fetching a fresh copy in the background.
 *
 *   3. Same-origin static assets (script, style, image, font) → Cache-first:
 *      serve from cache if available, otherwise fetch and cache.
 *
 * Non-GET requests and cross-origin requests are passed through unmodified.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // --- Strategy 1: Navigation — network-first with offline fallback ---
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./index.html')),
        ),
    );
    return;
  }

  // --- Strategy 2: JSON data — stale-while-revalidate ---
  if (url.origin === self.location.origin && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
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

  // --- Strategy 3: Static assets — cache-first ---
  if (
    url.origin === self.location.origin &&
    ['script', 'style', 'image', 'font'].includes(request.destination)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      }),
    );
    return;
  }
});
