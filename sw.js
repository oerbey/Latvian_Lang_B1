const CACHE_VERSION = "v5";
const CACHE_NAME = `ll-b1-${CACHE_VERSION}`;
const CORE_ASSETS = [
"./",
"./index.html",
"./darbibas-vards.html",
"./assets/styles.css",
"./assets/app.js",
"./data/words.json",
"./manifest.json"
];

self.addEventListener("install", (event) => {
event.waitUntil(
caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
);
self.skipWaiting();
});

self.addEventListener("activate", (event) => {
event.waitUntil(
caches.keys().then((keys) =>
Promise.all(
keys.filter(k => k.startsWith("ll-b1-") && k !== CACHE_NAME)
.map(k => caches.delete(k))
)
)
);
self.clients.claim();
});

self.addEventListener("fetch", (event) => {
const req = event.request;

// Network-first for JSON data; cache-first for static assets
if (req.url.endsWith("/data/words.json")) {
event.respondWith(
fetch(req).then((res) => {
const copy = res.clone();
caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
return res;
}).catch(() => caches.match(req))
);
return;
}

event.respondWith(
caches.match(req).then((cached) => {
if (cached) return cached;
return fetch(req).catch(() => {
if (req.destination === "document") {
return new Response(
`<html lang="lv"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><body style="font-family: system-ui, sans-serif; padding:1rem"><h1>Bezsaistes režīms</h1><p>Saturs nav pieejams bezsaistē. Atgriezies tiešsaistē un mēģini vēlreiz.</p></body></html>`,
{ headers: { "Content-Type": "text/html; charset=utf-8" } }
);
}
});
})
);
});

