/**
 * Wasla — Custom Service Worker v2
 *
 * Strategy:
 *  - Navigation requests → serve cached shell (/) so the app works offline
 *  - /_next/static/ → cache-first (hashed assets, immutable)
 *  - /api/sync      → network-only (let the app handle offline gracefully)
 *  - /api/*         → network-first with a 503 JSON fallback (app reads IndexedDB)
 *  - Everything else → network-first, cache as fallback
 */

const CACHE_NAME = 'wasla-v4';

// The minimal set of URLs required to render the app shell offline.
// /_next/static/ assets are added dynamically on first fetch.
const PRECACHE_URLS = ['/'];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests — let them pass through normally
  if (request.method !== 'GET') return;

  // 1. Navigation (page loads) → network-first (for now), fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/').then((fallback) => {
              if (fallback) return fallback;
              return new Response(
                '<html><body><h1>Offline</h1><p>Verify your connection.</p></body></html>',
                { status: 503, headers: { 'Content-Type': 'text/html' } }
              );
            });
          });
        })
    );
    return;
  }

  // 2. Next.js static assets → cache-first (they use content hashes, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 3. Sync endpoint → network-only (app handles offline, no SW interference)
  if (url.pathname === '/api/sync') {
    // Pass through — if fetch throws, let the app's useSync hook deal with it
    return;
  }

  // 4. Other API routes → network-first with JSON offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // 5. Public assets (icons, images) → cache-first
  if (
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => new Response(null, { status: 503 }));
      })
    );
    return;
  }

  // 6. Locale JSON files → network-first with cache fallback
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || new Response('{}', { status: 503 }))
        )
    );
    return;
  }

  // 7. Everything else → network-first, cache as fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || new Response('', { status: 503 }))
      )
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'wasla-offline-sync' || event.tag === 'sync-pending-leads') {
    // Notify all open clients to trigger the sync flush (app has IndexedDB access)
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'TRIGGER_SYNC' })
        );
      })
    );
  }
});

// ─── Message handler (from app → SW) ─────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
