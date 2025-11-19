
const CACHE_NAME = 'pdf-editor-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './types.ts',
  'https://cdn.tailwindcss.com'
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network first, then cache (Stale-While-Revalidate logic for CDN assets)
self.addEventListener('fetch', (event) => {
  // Skip non-http requests (e.g., chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache valid responses
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
               cache.put(event.request, networkResponse.clone());
            }
            // For CDN scripts (CORS/Opaque), we still want to cache them if possible, 
            // but we can't check status code easily on opaque responses.
            if (networkResponse && networkResponse.type === 'opaque') {
               cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
             // If network fails, return nothing (response will handle cache hit)
             // Ideally handle offline fallback here
          });

        return response || fetchPromise;
      });
    })
  );
});
