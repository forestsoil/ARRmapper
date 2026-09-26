/**
 * arr-loader.js v1 — ARR Suite root loader (NOT bundled)
 * Used by index.html and launcher.html.
 *   - timed fetches (never hang)
 *   - staff lookup: network → localStorage cache → bundle copy → provisional
 *   - bundle install (stall-timeout download, transferable unzip, OPFS / IDB)
 *   - version check against bundle_ver.json (7-day stale ceiling, min_built force)
 */

const ARR_BUNDLE_URL  = './bundle.bin';
const ARR_VER_URL     = './bundle_ver.json';
const ARR_STAFF_URL   = './staff_list_asha.json';
const ARR_AES_KEY_HEX = '94e9c442ac66d419e895949425e55f787052d1dfe3fbe522c868fdec22302d84';
const ARR_STALE_MAX_S = 7 * 86400;

const ARR_K = {
  email: 'arr_user_email', name: 'arr_user_name', ts: 'arr_auth_ts',
  prov: 'arr_auth_provisional',
  ready: 'arr_opfs_ready', store: 'arr_bundle_store',
  ver: 'arr_bundle_ver', built: 'arr_bundle_built', installed: 'arr_bundle_installed_ts',
  staff: 'arr_staff_cache', checked: 'arr_update_checked_ts',
};

const ARR_IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ── Timed fetch (headers + body inside the timeout) ───────────────
async function arrFetchJSON(url, opts = {}, ms = 6000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

// ── JWT (UTF-8 safe, padded) ──────────────────────────────────────
function arrDecodeJwt(tok) {
  const b = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '==='.slice((b.length + 3) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
}

// ── Auth (no expiry) ──────────────────────────────────────────────
function arrLoaderAuthSet(email, name, provisional) {
  localStorage.setItem(ARR_K.email, email);
  localStorage.setItem(ARR_K.name, name || '');
  localStorage.setItem(ARR_K.ts, String(Date.now()));
  if (provisional) localStorage.setItem(ARR_K.prov, '1');
  else localStorage.removeItem(ARR_K.prov);
}
function arrLoaderAuthClear() {
  [ARR_K.email, ARR_K.name, ARR_K.ts, ARR_K.prov].forEach(k => localStorage.removeItem(k));
}

// ── Staff list ────────────────────────────────────────────────────
const arrValidList = l => Array.isArray(l) && l.length >= 10;

function arrStaffCacheGet() {
  for (const k of [ARR_K.staff, 'drt_staff_list_cache']) {
    try { const l = JSON.parse(localStorage.getItem(k) || 'null'); if (arrValidList(l)) return l; } catch (e) {}
  }
  return null;
}
function arrStaffCacheSet(l) {
  if (!arrValidList(l)) return;
  try { localStorage.setItem(ARR_K.staff, JSON.stringify(l)); } catch (e) {}
}

/** Fresh network list only (for revalidation). null on any failure. */
async function arrStaffFetchFresh(ms = 6000) {
  try {
    const l = await arrFetchJSON(ARR_STAFF_URL + '?net=1', { cache: 'no-store' }, ms);
    if (arrValidList(l)) { arrStaffCacheSet(l); return l; }
  } catch (e) {}
  return null;
}

/** {list, fresh} — network → cache → bundle copy. */
async function arrStaffLoad() {
  const fresh = await arrStaffFetchFresh();
  if (fresh) return { list: fresh, fresh: true };
  const cached = arrStaffCacheGet();
  if (cached) return { list: cached, fresh: false };
  try {
    const l = await arrFetchJSON(ARR_STAFF_URL, {}, 3000); // SW serves bundle copy
    if (arrValidList(l)) { arrStaffCacheSet(l); return { list: l, fresh: false }; }
  } catch (e) {}
  return { list: null, fresh: false };
}

function arrStaffFind(list, email) {
  const e = (email || '').trim().toLowerCase();
  return (list || []).find(s => s.email && s.email.trim().toLowerCase() === e) || null;
}

/**
 * Decide access. Deny only when a FRESH list says the email is absent.
 * Returns {ok, provisional, name}.
 */
async function arrVerifyEmail(email, googleName) {
  const { list, fresh } = await arrStaffLoad();
  if (list) {
    const s = arrStaffFind(list, email);
    if (s) return { ok: true, provisional: false, name: (s.name && s.name !== '--') ? s.name : (googleName || '') };
    if (fresh) return { ok: false };
  }
  return { ok: true, provisional: true, name: googleName || '' };
}

// ── Bundle state ──────────────────────────────────────────────────
function arrBundleInstalled() {
  const ready = localStorage.getItem(ARR_K.ready) === '1';
  const store = localStorage.getItem(ARR_K.store);
  if (!ready || !store) return false;
  if (ARR_IS_IOS && store === 'opfs') return false;
  return true;
}

function arrPersist() {
  try { navigator.storage?.persist?.().catch(() => {}); } catch (e) {}
}

// ── Download with stall timeout + progress ────────────────────────
async function arrDownload(url, onProgress, stallMs = 20000) {
  const c = new AbortController();
  let timer;
  const kick = () => { clearTimeout(timer); timer = setTimeout(() => c.abort(), stallMs); };
  kick();
  try {
    const r = await fetch(url, { cache: 'no-store', signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    if (!r.body) return await r.arrayBuffer();
    const total = +r.headers.get('content-length') || 0;
    const rd = r.body.getReader();
    const chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      chunks.push(value); got += value.length; kick();
      if (onProgress) onProgress(got, total);
    }
    const out = new Uint8Array(got); let o = 0;
    for (const ch of chunks) { out.set(ch, o); o += ch.length; }
    return out.buffer;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('download stalled — check connection');
    throw e;
  } finally { clearTimeout(timer); }
}

// ── Decrypt ───────────────────────────────────────────────────────
async function arrDecrypt(encrypted) {
  const buf = new Uint8Array(encrypted);
  const raw = new Uint8Array(ARR_AES_KEY_HEX.match(/../g).map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
}

// ── Unzip in worker (transferable buffers, errors + timeout handled) ─
function arrUnzip(zipBuf, ms = 60000) {
  return new Promise((res, rej) => {
    const src = `
      try { importScripts('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js'); }
      catch (e) { self.postMessage({error: 'unzip library failed to load'}); }
      self.onmessage = function (e) {
        fflate.unzip(new Uint8Array(e.data), function (err, files) {
          if (err) { self.postMessage({error: String(err.message || err)}); return; }
          const bufs = [...new Set(Object.values(files).map(u => u.buffer))];
          self.postMessage({entries: files}, bufs);
        });
      };`;
    const url = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }));
    const w = new Worker(url);
    const done = () => { clearTimeout(t); w.terminate(); URL.revokeObjectURL(url); };
    const t = setTimeout(() => { done(); rej(new Error('unzip timed out')); }, ms);
    w.onerror = e => { done(); rej(new Error('unzip worker: ' + (e.message || 'error'))); };
    w.onmessage = e => { done(); e.data.error ? rej(new Error(e.data.error)) : res(e.data.entries); };
    w.postMessage(zipBuf, [zipBuf]);
  });
}

// ── Store writers ─────────────────────────────────────────────────
async function arrWriteOPFS(entries) {
  const root = await navigator.storage.getDirectory();
  let n = 0;
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('/')) continue;
    const parts = name.split('/');
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) dir = await dir.getDirectoryHandle(parts[i], { create: true });
    const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const w = await fh.createWritable();   // per-file atomic swap on close
    await w.write(data);
    await w.close();
    n++;
  }
  return n;
}

function arrWriteIDB(entries) {
  return new Promise((res, rej) => {
    // v2: repairs any empty v1 DB created by the old SW reader
    const req = indexedDB.open('arr_bundle', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    };
    req.onerror = () => rej(new Error('IDB open failed'));
    req.onsuccess = e => {
      const db = e.target.result;
      let tx;
      try { tx = db.transaction('files', 'readwrite'); }
      catch (err) { db.close(); rej(err); return; }
      const store = tx.objectStore('files');
      let n = 0;
      for (const [name, data] of Object.entries(entries)) {
        if (name.endsWith('/')) continue;
        store.put(data, name); n++;
      }
      tx.oncomplete = () => { db.close(); res(n); };
      tx.onerror = ev => { db.close(); rej(new Error('IDB write: ' + ev.target.error)); };
    };
  });
}

// ── Install ───────────────────────────────────────────────────────
let _arrInstalling = null;

/** Download → decrypt → unzip → write. Version keys written only on success. */
function arrInstallBundle(onStage = () => {}) {
  if (_arrInstalling) return _arrInstalling;
  _arrInstalling = (async () => {
    onStage('Downloading…');
    const enc = await arrDownload(ARR_BUNDLE_URL, (g, t) =>
      onStage('Downloading… ' + (t ? Math.min(99, Math.round(g * 100 / t)) + '%' : Math.round(g / 1024) + ' KB')));
    onStage('Decrypting…');
    const zip = await arrDecrypt(enc);
    onStage('Installing to device…');
    const entries = await arrUnzip(zip);

    const dec = new TextDecoder();
    let ver = null;
    try { ver = JSON.parse(dec.decode(entries['bundle_ver.json'])); } catch (e) {}
    if (!arrStaffCacheGet() && entries['staff_list_asha.json']) {
      try { arrStaffCacheSet(JSON.parse(dec.decode(entries['staff_list_asha.json']))); } catch (e) {}
    }

    const n = ARR_IS_IOS ? await arrWriteIDB(entries) : await arrWriteOPFS(entries);
    localStorage.setItem(ARR_K.store, ARR_IS_IOS ? 'idb' : 'opfs');
    localStorage.setItem(ARR_K.ready, '1');
    if (ver && ver.version) {
      localStorage.setItem(ARR_K.ver, ver.version);
      localStorage.setItem(ARR_K.built, String(ver.built || 0));
    }
    localStorage.setItem(ARR_K.installed, String(Date.now()));
    arrPersist();
    return n;
  })().finally(() => { _arrInstalling = null; });
  return _arrInstalling;
}

// ── Version check ─────────────────────────────────────────────────
/**
 * {status: 'current'|'update'|'forced'|'offline', remote}
 * forced = local older than remote.min_built, or > 7 days behind remote.
 * Legacy installs (no built stamp) are never forced — they update in background.
 */
async function arrCheckUpdate() {
  let remote;
  try { remote = await arrFetchJSON(ARR_VER_URL + '?t=' + Date.now(), { cache: 'no-store' }, 6000); }
  catch (e) { return { status: 'offline' }; }
  if (!remote || !remote.version) return { status: 'offline' };
  localStorage.setItem(ARR_K.checked, String(Date.now()));
  if (localStorage.getItem(ARR_K.ver) === remote.version) return { status: 'current', remote };
  const localBuilt = +localStorage.getItem(ARR_K.built) || 0;
  const forced = localBuilt > 0 && (
    (remote.min_built && localBuilt < remote.min_built) ||
    ((remote.built || 0) - localBuilt > ARR_STALE_MAX_S));
  return { status: forced ? 'forced' : 'update', remote };
}
