// S.Z. Dairy Farm — offline app-shell service worker.
//
// This app is a single self-contained index.html (all data lives in
// IndexedDB/localStorage on the device, not on a server), so "offline
// support" here just means: make sure the app itself can still open with
// no signal. Google Fonts requests are deliberately left untouched — if
// they fail offline the page falls back to its system-font stack.
//
// IMPORTANT: bump CACHE_NAME (e.g. v1 -> v2) whenever index.html changes
// and you want returning users to pick up the new version promptly. Old
// cache versions are deleted automatically on activate.
const CACHE_NAME = "szdairy-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve instantly from cache (works with zero
// signal), and quietly refresh the cache from the network in the
// background so the next launch has whatever changed.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // leave Google Fonts etc. alone

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
