/**
 * Wasla — Custom Service Worker v3
 *
 * Root-cause fix: Next.js adds `Vary: RSC, Next-Router-State-Tree, ...`
 * headers to every response. Standard caches.match() respects Vary and
 * NEVER finds a match → pages appear uncached → dinosaur screen offline.
 *
 * Solution: cache responses WITHOUT the Vary header so they always match.
 *
 * Strategies:
 *  - /offline.html         → Cache-only (always pre-cached, static file)
 *  - Navigation requests   → Stale-While-Revalidate (serve cache, update in BG)
 *  - /_next/static/        → Cache-first (immutable hashed assets)
 *  - /api/sync             → Network-only
 *  - /api/*                → Network-first with 503 JSON fallback
 *  - Images / fonts        → Cache-first
 *  - /locales/             → Network-first with cache fallback
 *  - Everything else       → Network-first, cache as fallback
 */

const CACHE_NAME = 'wasla-v8';

// Only pre-cache the static fallback. Everything else is cached on first visit.
const PRECACHE_URLS = ['/offline.html'];

// ─── Helper: clone a response and strip Vary so caches.match() always works ──
function stripVary(response) {
  const headers = new Headers(response.headers);
  headers.delete('vary');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// ─── Helper: match ignoring Vary ─────────────────────────────────────────────
function matchCache(cache, request) {
  return cache.match(request, { ignoreVary: true });
}

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add('/offline.html'))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Intercept Fetch to handle Partial Content (206) ─────────────────────────
async function fetchWith206Fix(request) {
  const response = await fetch(request);
  // 🛡️ Guard: 206 Partial Content (Videos/Media) should NOT be cached by sw logic
  // but must be returned to the browser to work correctly.
  return response;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-HTTP(s) requests (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  // 1. Navigation (page loads) → Stale-While-Revalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await matchCache(cache, request);

        const networkFetch = fetch(request)
          .then((networkRes) => {
            if (networkRes.ok && networkRes.status !== 206) {
              cache.put(request, stripVary(networkRes.clone()));
            }
            return networkRes;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }

        const networkRes = await networkFetch;
        if (networkRes && networkRes.ok) return networkRes;

        const offline = await matchCache(cache, new Request('/offline.html'));
        return offline || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // 2. Next.js static assets → Cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await matchCache(cache, request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok && res.status !== 206) {
            cache.put(request, stripVary(res.clone()));
          }
          return res;
        } catch {
          return new Response(null, { status: 503 });
        }
      })
    );
    return;
  }

  // 3. Sync endpoint → Network-only
  if (url.pathname === '/api/sync') return;

  // 4. API routes → Network-first with JSON fallback
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

  // 5. Images / icons → Cache-first with explicit logging
  if (
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await matchCache(cache, request);
        if (cached) return cached;
        
        try {
          const res = await fetch(request);
          
          // Never cache 206
          if (res.status === 206) return res;

          if (res.ok) {
            cache.put(request, stripVary(res.clone()));
            return res;
          }
          
          // Debugging: why is the image failing?
          if (res.status === 404) {
            console.warn(`[SW] Image 404: ${url.pathname}`);
          }
          return res;
        } catch (err) {
          console.error(`[SW] Network error for image: ${url.pathname}`, err);
          return new Response(null, { status: 503 });
        }
      })
    );
    return;
  }

  // 6. Locale JSON → Network-first
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, stripVary(res.clone()));
          return res;
        } catch {
          return await matchCache(cache, request) || new Response('{}', { status: 503 });
        }
      })
    );
    return;
  }

  // 7. Everything else → Network-first
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const res = await fetch(request);
        if (res.ok && res.status !== 206) {
          cache.put(request, stripVary(res.clone()));
        }
        return res;
      } catch {
        return await matchCache(cache, request) || new Response('', { status: 503 });
      }
    })
  );
});

// ─── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'wasla-offline-sync' || event.tag === 'sync-pending-leads') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: 'TRIGGER_SYNC' })
        );
      })
    );
  }
});

// ─── Message handler ──────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
