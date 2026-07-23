// ARRMapper Field Tool — Service Worker v3
// Caching strategy:
//   index.html        → network-first (always serve fresh launcher)
//   appDashboard.html → network-first (data-dependent, stale is misleading)
//   appARRmapper.html → stale-while-revalidate (serve cached for speed,
//                       update in background — preserves offline capability)
//   CDN assets        → cache-first (immutable versioned URLs)
//   Google APIs       → network-only (auth, Maps, Apps Script)

const CACHE_NAME = 'arrm-shell-v3';

const SHELL_URLS = [
  '/ARRmapper/appARRmapper.html',
  '/ARRmapper/manifest.json',
  '/ARRmapper/logo.png',
  '/ARRmapper/logo2.png',
  // Leaflet
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  // Turf
  'https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js',
  // JSZip
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  // Google Identity
  'https://accounts.google.com/gsi/client',
];

// Never cache these — always network
const NETWORK_ONLY_HOSTS = [
  'maps.googleapis.com',
  'accounts.google.com',
  'script.google.com',
  'oauth2.googleapis.com',
];

// Always fetch fresh from network (fall back to cache if offline)
const NETWORK_FIRST_PATHS = [
  '/ARRmapper/index.html',
  '/ARRmapper/',
  '/ARRmapper/appDashboard.html',
];

// ── Install: pre-cache app shell ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        SHELL_URLS.map(url =>
          cache.add(url).catch(e => console.warn('SW cache skip:', url, e.message))
        )
      )
    ).then(() => self.skipWaiting())
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

  // Network-only for Google APIs
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h))) return;

  // Network-first for index + dashboard
  if (NETWORK_FIRST_PATHS.some(p => url.pathname === p || url.pathname.endsWith(p))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for appARRmapper.html
  if (url.pathname.includes('appARRmapper.html')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const networkFetch = fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Cache-first for everything else (CDN assets, images, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
            .catch(() => {});
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/ARRmapper/appARRmapper.html');
        }
      });
    })
  );
});
