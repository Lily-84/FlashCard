/* =========================================================
   Flashcards — Service Worker
   Provides full offline support for the flashcard web app.
   Place this file next to index.html at the site root.
   ========================================================= */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `flashcards-${CACHE_VERSION}`;

/* Files to precache during install.
   Adjust if your host serves the app from a sub-folder. */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js'
];

/* -------- INSTALL -------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Use allSettled so a missing optional file doesn't break install
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );
      // Activate immediately instead of waiting for old tabs to close
      await self.skipWaiting();
    })()
  );
});

/* -------- ACTIVATE -------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      // Take control of any open pages immediately
      await self.clients.claim();
    })()
  );
});

/* -------- FETCH -------- */
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests (fonts, CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip non-http(s) schemes (e.g. chrome-extension://)
  if (!/^https?:$/.test(url.protocol)) return;

  // Navigation requests → network-first, fall back to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone());
          return fresh;
        } catch (err) {
          const cached =
            (await caches.match(request)) ||
            (await caches.match('./index.html')) ||
            (await caches.match('./'));
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets → cache-first, then network with background update
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) {
        // Refresh in the background so the cache stays up to date
        fetch(request)
          .then((res) => {
            if (res && res.ok) {
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(request, res.clone())
              );
            }
          })
          .catch(() => {});
        return cached;
      }

      try {
        const res = await fetch(request);
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      } catch (err) {
        // Last resort: try index.html for HTML-ish requests
        if (request.headers.get('accept')?.includes('text/html')) {
          return (await caches.match('./index.html')) || Response.error();
        }
        return Response.error();
      }
    })()
  );
});

/* -------- MESSAGE -------- */
/* Allows the page to trigger SW updates or skipWaiting. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.map((key) => caches.delete(key)))
      )
    );
  }
});