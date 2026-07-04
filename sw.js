const CACHE_NAME = "flashcard-cache-v1";

// Quan trọng: phải cache đúng theo cấu trúc bạn đang có
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",

  "./script.js",
  "./types.js",

  "./localization.js",
  "./localization.csv",

  "./study-base.js",
  "./study-board.js",
  "./study-flashcard.js",
  "./study-manager.js",
  "./study-quiz.js",
  "./study-typing.js",

  "./manifest.json",

  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-1024.png",

  "./favicon.ico"
];

// Install: cache toàn bộ app
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: xoá cache cũ nếu update version
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: offline-first
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // cache động thêm file mới
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });

          return response;
        })
        .catch(() => {
          // fallback offline
          return caches.match("./index.html");
        });
    })
  );
});