const CACHE_NAME = 'latvian-lang-b1-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/week1.html',
  '/app.js',
  '/src/render.js',
  '/src/state.js',
  '/src/match.js',
  '/src/forge.js',
  '/i18n/en.json',
  '/i18n/lv.json',
  '/styles.css',
  '/data/lv-en/forge.json',
  '/data/lv-en/units.json',
  '/data/lv-en/units/b1-paligdarbibas-vardi.json',
  '/data/lv-en/units/braukt-ar-priedekliem.json',
  '/data/lv-en/units/iet-ar-priedekliem.json',
  '/data/lv-en/units/kapt-ar-priedekliem.json',
  '/data/lv-en/units/lidot-ar-priedekliem.json',
  '/data/lv-en/units/mainit-mainities-gimene.json',
  '/data/lv-en/units/nakt-ar-priedekliem.json',
  '/data/lv-en/units/nest-ar-priedekliem.json',
  '/data/lv-en/units/refleksivie-un-dzives-notikumi.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
