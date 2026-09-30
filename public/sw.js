// SocialFlow Service Worker — enables PWA installability
// Chrome requires a service worker + manifest for the "Install app" prompt

const CACHE_NAME = "socialflow-v2";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png"];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== "GET") return;
  
  // Skip Chrome extension requests
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  
  // Network-first for API + page navigations (always get fresh data)
  if (url.pathname.startsWith("/api/") || event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful page navigations
          if (event.request.mode === "navigate" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if offline
          return caches.match(event.request).then((cached) => cached || caches.match("/"));
        })
    );
    return;
  }
  
  // Cache-first for static assets (images, CSS, JS, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
