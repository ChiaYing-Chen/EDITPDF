
const CACHE_NAME = 'pdf-editor-v3'; // Increment version to force update
const BASE_PATH = '/EDITPDF/';
const ASSETS_TO_CACHE = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  'https://cdn.tailwindcss.com',
  'https://cdn-icons-png.flaticon.com/512/337/337946.png'
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

// Fetch event: Network first, then cache, with navigation fallback
self.addEventListener('fetch', (event) => {
  // Skip non-http requests (e.g., chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    (async () => {
      try {
        // 1. Try Network first
        const networkResponse = await fetch(event.request);
        
        // If network fetch works, cache the response (if valid)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        // Also cache opaque responses (like CDN scripts)
        if (networkResponse && networkResponse.type === 'opaque') {
           const cache = await caches.open(CACHE_NAME);
           cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;

      } catch (error) {
        // 2. If Network fails (Offline), try Cache
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // 3. Fallback for Navigation requests (e.g. opening the app via URL)
        // If the user navigates to /EDITPDF/ but we only have /EDITPDF/index.html cached
        if (event.request.mode === 'navigate') {
          return cache.match(`${BASE_PATH}index.html`);
        }

        // Return simple error or let browser handle it
        throw error;
      }
    })()
  );
});
