// ARR Project Suite — Service Worker v9
// Bundle+OPFS architecture: applets no longer served as static files
// Only shell files (index.html, launcher.html, arr-shared.css, logos, icons) are cached
// bundle.bin is fetched by index.html and written to OPFS — not SW-cached

const CACHE_NAME = 'arrm-shell-68d2175';

const SHELL_URLS = [
  '/ARRmapper/index.html',
  '/ARRmapper/launcher.html',
  '/ARRmapper/arr-shared.css',
  '/ARRmapper/manifest.json',
  '/ARRmapper/logo_dark.png',
  '/ARRmapper/logo_light.png',
  '/ARRmapper/pwa_icon_dark.png',
  '/ARRmapper/pwa_icon_light.png',
  '/ARRmapper/privacy_policy.html',
  '/ARRmapper/terms_of_service.html',
];

// Never cache — always network
const NETWORK_ONLY_HOSTS = [
  'accounts.google.com',
  'script.google.com',
  'oauth2.googleapis.com',
  'maps.googleapis.com',
];

// ── Install: pre-cache shell ──────────────────────────────────────────
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

// ── Activate: remove old caches ───────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch strategy ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only for Google APIs
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h))) return;

  // bundle.bin — always network-first (must be fresh for updates)
  if (url.pathname.endsWith('/bundle.bin')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for shell HTML files
  if (url.pathname.endsWith('index.html') ||
      url.pathname.endsWith('launcher.html') ||
      url.pathname === '/ARRmapper/' ||
      url.pathname === '/ARRmapper') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, response.clone()))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else (CSS, images, icons)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, response.clone()))
            .catch(() => {});
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/ARRmapper/index.html');
        }
      });
    })
  );
});
