// SocialFlow Service Worker — enables PWA installability
// Chrome requires a service worker + manifest for the "Install app" prompt
//
// CACHE_NAME is bumped on every release that ships new static assets or
// wants to invalidate previously-cached authenticated HTML. When the
// SW activates it deletes every cache whose name !== CACHE_NAME, so a
// bump is the single source of truth for "throw away old caches".
//
// v2 → v3 (P3-10): the v2 cache contained authenticated HTML snapshots
// captured while a user was logged in. After logout the browser would
// still serve those snapshots on offline navigation. v3 starts a fresh
// cache; the v2 cache (and any older) is purged on next SW activation
// by the activate handler below, and the /api/auth/logout route also
// returns `Clear-Site-Data: "cache", "cookies"` to clear the HTTP cache
// + cookies immediately.

const CACHE_NAME = "socialflow-v3";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png"];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate — clean old caches.
//
// On activation we walk every existing cache and delete any whose name
// is not the current CACHE_NAME. This is what makes a cache-key bump
// (e.g. v2 → v3) actually invalidate stale authenticated HTML: the old
// `socialflow-v2` cache is removed on the next activation after the
// new SW is fetched.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          // Delete every cache that is not the current version. This
          // covers both older versions (v2, v1) and any one-off cache
          // names a future release might have created.
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      );
    })
  );
  // Take control of uncontrolled clients immediately so the cache
  // purge above affects the page that triggered the SW update, not
  // only future navigations.
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
