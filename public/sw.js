const CACHE_NAME = 'falcon-erp-v4';

// Core routes to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/sales/pos',
  '/items',
  '/reports/sales',
  '/purchases/invoices',
  '/accounts/expenses',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache routes gracefully
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
        } catch (e) {
          // Ignore individual fetch errors during pre-cache
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Exclude Supabase Cloud API calls (handled by cloud_read_gate & Dexie fallback)
  if (url.origin.includes('supabase.co')) return;

  // Strategy 1: Static Next.js Chunks & Assets (/_next/static/*) -> Cache First
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(js|css|woff2|png|jpg|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch update in background if online
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(async () => {
          // Offline and nothing cached -> valid empty response instead of an unhandled rejection
          const cachedRoute = await caches.match(event.request);
          return cachedRoute || new Response('', { status: 504, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Strategy 2: HTML Page Navigations -> Network First with Offline Fallback
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline -> Try cached route/shell, never throw (a throw here kills the navigation)
          try {
            const cachedRoute = await caches.match(event.request);
            if (cachedRoute) return cachedRoute;

            const cachedPos = await caches.match('/sales/pos');
            if (cachedPos) return cachedPos;

            const cachedHome = await caches.match('/');
            if (cachedHome) return cachedHome;
          } catch (_) {
            // Cache storage failed - fall through to the offline page
          }

          // Ultimate offline HTML response
          return new Response(
            `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>Falcon ERP - أوفلاين</title><style>body{background:#090d16;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}button{background:#059669;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-weight:bold;cursor:pointer;margin-top:16px}</style></head><body><div><h2>المنظومة تعمل بدون إنترنت (Offline)</h2><p>يمكنك العودة إلى الشاشة الرئيسية أو نقطة البيع لتقديم الفواتير.</p><button onclick="window.location.href='/sales/pos'">فتح نقطة البيع</button></div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
    );
    return;
  }

  // Strategy 3: Default Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Never resolve with undefined - always a valid Response
      return cachedResponse || fetchPromise.then(
        (res) => res || new Response('', { status: 504, statusText: 'Offline' })
      );
    })
  );
});
