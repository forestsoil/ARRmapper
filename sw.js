// ARR Project Suite — Service Worker v12
// OPFS intercept: applet HTML is read from OPFS (desktop/Android) or IDB (iOS) and returned directly.
// Static files (index, launcher, css, icons) served normally from network/cache.
// bundle.bin, bundle_ver.json and ?net=1 requests always go to network (not intercepted).
// v12: safe IDB reader (no empty-DB creation / hang), bundle-read timeout,
//      network-first shell with timeout, appARRMapper.html name fix,
//      bundle miss on navigation → index reinstall (no 404).

const CACHE_NAME = 'arrm-shell-fe8e2e7';

const SHELL_URLS = [
  '/ARRmapper/index.html',
  '/ARRmapper/launcher.html',
  '/ARRmapper/arr-loader.js',
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
  'appARRMapper.html',
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

// ── IDB reader (iOS fallback) ─────────────────────────────────────
// Opens at current version; never creates the DB (aborts upgrade) and
// rejects if the 'files' store is missing — the old reader hung here.
function readFromIDB(filename) {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open('arr_bundle'); } catch (e) { reject(e); return; }
    req.onupgradeneeded = e => { e.target.transaction.abort(); };
    req.onerror = () => reject(new Error('IDB not installed'));
    req.onblocked = () => reject(new Error('IDB blocked'));
    req.onsuccess = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) { db.close(); reject(new Error('IDB empty')); return; }
      try {
        const get = db.transaction('files', 'readonly').objectStore('files').get(filename);
        get.onsuccess = ev => {
          db.close();
          if (ev.target.result) resolve(new Blob([ev.target.result], {type: mimeType(filename)}));
          else reject(new Error('IDB miss: ' + filename));
        };
        get.onerror = () => { db.close(); reject(new Error('IDB get error')); };
      } catch (err) { db.close(); reject(err); }
    };
  });
}

// ── OPFS reader ───────────────────────────────────────────────────
async function readFromOPFS(filename) {
  const root = await navigator.storage.getDirectory();
  // Handle subdirectory paths like invasiveImages/xxx.jpg
  const parts = filename.split('/');
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }
  const fh = await dir.getFileHandle(parts[parts.length - 1]);
  return fh.getFile();
}

function withTimeout(p, ms, label) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timeout')), ms))]);
}

// Try OPFS first; fall back to IDB (iOS path). Never hangs.
async function readFromBundle(filename) {
  try {
    return await withTimeout(readFromOPFS(filename), 15000, 'OPFS');
  } catch (opfsErr) {
    return withTimeout(readFromIDB(filename), 15000, 'IDB');
  }
}

// Network-first with timeout → cache; if no cache, keep waiting on network.
function networkFirst(request, ms = 4000) {
  const fromCache = () => caches.match(request, {ignoreSearch: true});
  const net = fetch(request).then(response => {
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(() => {});
    }
    return response;
  });
  return new Promise(resolve => {
    let settled = false;
    const done = r => { if (!settled) { settled = true; clearTimeout(t); resolve(r); } };
    const t = setTimeout(() => { fromCache().then(c => { if (c) done(c); }); }, ms);
    net.then(done).catch(() => fromCache().then(c => done(c || Response.error())));
  });
}

// ── Fetch ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only for Google APIs
  if (NETWORK_ONLY_HOSTS.some(h => url.hostname.includes(h))) return;

  // Network-only, not intercepted: bundle, version file, explicit ?net=1
  if (url.pathname.endsWith('/bundle.bin') ||
      url.pathname.endsWith('/bundle_ver.json') ||
      url.searchParams.has('net')) return;

  // Check if this is an OPFS-served file
  const filename = url.pathname.split('/').pop();
  const pathEnd  = url.pathname.replace('/ARRmapper/', '');

  // invasiveImages assets
  const isInvasive = url.pathname.includes('/invasiveImages/');
  const invasiveFile = isInvasive ? 'invasiveImages/' + filename : null;

  if (ALL_OPFS.includes(filename) || isInvasive) {
    event.respondWith(
      readFromBundle(invasiveFile || filename)
        .then(file => new Response(file, {
          status: 200,
          headers: {'Content-Type': mimeType(filename)}
        }))
        .catch(err => {
          console.warn('SW OPFS miss:', filename, err.message);
          // Applets don't exist on the network — send navigations to index to reinstall
          if (event.request.mode === 'navigate') {
            return Response.redirect('/ARRmapper/index.html?reinstall=1&redirect=' +
                                     encodeURIComponent(event.request.url), 302);
          }
          return fetch(event.request).catch(() =>
            new Response('Bundle not loaded', {status: 503, headers: {'Content-Type': 'text/plain'}})
          );
        })
    );
    return;
  }

  // Network-first (timed) for shell HTML + loader
  if (url.pathname.endsWith('index.html') ||
      url.pathname.endsWith('launcher.html') ||
      url.pathname.endsWith('arr-loader.js') ||
      url.pathname === '/ARRmapper/' ||
      url.pathname === '/ARRmapper') {
    event.respondWith(networkFirst(event.request));
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
