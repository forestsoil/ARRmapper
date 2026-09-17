// ARR Project Suite — Service Worker v10
// OPFS intercept: applet HTML is read from OPFS and returned directly.
// Static files (index, launcher, css, icons) served normally from network/cache.
// bundle.bin always fetched fresh from network.

const CACHE_NAME = 'arrm-shell-5ed2688';

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

// Applet filenames served from OPFS
const OPFS_APPLETS = [
  'appARRmapper.html',
  'appPlantationMapper.html',
  'appSoilMapper.html',
  'appVectorTool.html',
  'appCCBSDG.html',
  'appDailyReport.html',
  'appDashboard.html',
  'appDocumentReport.html',
  'appHotspot.html',
  'appInventory.html',
  'appInventory_Arun_v1.html',
  'appMonitoringDashboard.html',
  'appNurseryDashboard.html',
  'appNurseryDashboard_Arun_v1.html',
  'appSurveyManager.html',
];

// OPFS assets (non-HTML files needed by applets)
const OPFS_ASSETS = [
  'asha_plantation.geojson',
  'inv_manifest.json',
  'staff_list_asha.json',
  'survey_schema_v7.json',
];

const ALL_OPFS = [...OPFS_APPLETS, ...OPFS_ASSETS];

// Never cache — always network
const NETWORK_ONLY_HOSTS = [
  'accounts.google.com',
  'script.google.com',
  'oauth2.googleapis.com',
  'maps.googleapis.com',
];

// ── Install ───────────────────────────────────────────────────────
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

// ── Activate ──────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── OPFS reader ───────────────────────────────────────────────────
async function readFromOPFS(filename) {
  const root = await navigator.storage.getDirectory();
  // Handle subdirectory paths like invasiveImages/xxx.jpg
  const parts = filename.split('/');
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }
  const fh   = await dir.getFileHandle(parts[parts.length - 1]);
  return fh.getFile();
}

function mimeType(filename) {
  if (filename.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.geojson')) return 'application/geo+json';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.css')) return 'text/css';
  return 'application/octet-stream';
}

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only for Google APIs
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h))) return;

  // bundle.bin — always fresh from network
  if (url.pathname.endsWith('/bundle.bin')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Check if this is an OPFS-served file
  const filename = url.pathname.split('/').pop();
  const pathEnd  = url.pathname.replace('/ARRmapper/', '');

  // invasiveImages assets
  const isInvasive = url.pathname.includes('/invasiveImages/');
  const invasiveFile = isInvasive ? 'invasiveImages/' + filename : null;

  if (ALL_OPFS.includes(filename) || isInvasive) {
    event.respondWith(
      readFromOPFS(invasiveFile || filename)
        .then(file => new Response(file, {
          status: 200,
          headers: {'Content-Type': mimeType(filename)}
        }))
        .catch(err => {
          console.warn('SW OPFS miss:', filename, err.message);
          // Fall through to network (will 404, but gracefully)
          return fetch(event.request).catch(() =>
            new Response('Bundle not loaded — please sign in again.', {
              status: 503,
              headers: {'Content-Type': 'text/plain'}
            })
          );
        })
    );
    return;
  }

  // Network-first for shell HTML
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

  // Cache-first for everything else
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
