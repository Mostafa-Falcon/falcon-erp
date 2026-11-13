const CACHE_NAME = 'falcon-erp-v1';
const STATIC_ASSETS = [
  '/',
  '/sales/pos',
  '/items',
  '/reports/sales',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
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
  // Skip non-GET or chrome-extension or supabase REST API requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Network failed (Offline mode) -> serve from cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback to offline app shell / start url
        const cachedHome = await caches.match('/');
        if (cachedHome) {
          return cachedHome;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});
