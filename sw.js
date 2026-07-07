// ARRMapper Field Tool — Service Worker
// Caches the app shell (HTML + CDN scripts) on install so the tool
// loads offline. Network-first for all API calls (Google Maps, Apps Script,
// Google Identity) so live data always comes from the network when available.

const CACHE_NAME = 'arrm-shell-v2';

const SHELL_URLS = [
  '/ARRmapper/app.html',
  '/ARRmapper/manifest.json',
  '/ARRmapper/logo.png',
  // Leaflet
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  // Turf
  'https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js',
  // JSZip
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  // Google Identity (cache the loader; actual auth still needs network)
  'https://accounts.google.com/gsi/client',
];

// ── Install: pre-cache app shell ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can — ignore failures for CDN resources that may
      // have CORS restrictions on cache storage
      return Promise.allSettled(
        SHELL_URLS.map(url =>
          cache.add(url).catch(e => console.warn('SW cache skip:', url, e.message))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: remove old caches ──────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network-first for:
  // - Google APIs (Maps Static, Identity, Apps Script)
  // - Drive uploads
  const networkFirst = [
    'maps.googleapis.com',
    'accounts.google.com',
    'script.google.com',
    'oauth2.googleapis.com',
  ].some(host => url.hostname.includes(host));

  if (networkFirst) {
    // Network only — don't cache API responses
    return;
  }

  // Cache-first for app shell assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GET responses for shell assets
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
            .catch(() => {}); // ignore cache write failures
        }
        return response;
      }).catch(() => {
        // Offline and not cached — for navigation requests return app.html
        if (event.request.mode === 'navigate') {
          return caches.match('/ARRmapper/app.html');
        }
      });
    })
  );
});
