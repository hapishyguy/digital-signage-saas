// Digital Signage Service Worker
// Provides offline caching for media files

const CACHE_NAME = 'signage-cache-v1';
const MEDIA_CACHE = 'signage-media-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== MEDIA_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle media files (images and videos)
  if (url.pathname.includes('/api/media/file/')) {
    event.respondWith(handleMediaRequest(event.request));
    return;
  }

  // Handle API requests - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(event.request));
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Media caching strategy: Cache first, fallback to network
async function handleMediaRequest(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    console.log('[Service Worker] Serving media from cache:', request.url);
    return cached;
  }

  try {
    console.log('[Service Worker] Fetching media from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[Service Worker] Media fetch failed:', error);
    // Return a placeholder or error response
    return new Response('Media unavailable offline', { status: 503 });
  }
}

// API caching strategy: Network first, fallback to cache for offline support
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses for offline use
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[Service Worker] API request failed, checking cache:', request.url);
    const cached = await caches.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Offline - cached data unavailable' }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MEDIA') {
    // Client can request to cache specific media
    const urls = event.data.urls || [];
    cacheMediaFiles(urls);
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear all caches
    clearAllCaches();
  }
});

// Cache multiple media files
async function cacheMediaFiles(urls) {
  const cache = await caches.open(MEDIA_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        console.log('[Service Worker] Cached media:', url);
      }
    } catch (error) {
      console.error('[Service Worker] Failed to cache media:', url, error);
    }
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[Service Worker] All caches cleared');
}
