// Service Worker for CAVB Visa Application
const CACHE_NAME = 'cavb-visa-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  '/robots.txt',
  '/sitemap.xml'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.error('Error caching static assets:', error);
      })
  );
  
  // Force activation
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - Network first for API, Cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Skip unsupported schemes or extension resources
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }
  // Skip Vite dev/HMR/internal requests
  if (url.pathname.startsWith('/@vite') || url.pathname.startsWith('/@react-refresh') || url.pathname.includes('__vite')) {
    return;
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // API requests - Network first with fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();
          
          // Cache successful responses
          if (response.ok) {
            // Only cache http(s) GET requests
            if (request.url.startsWith(self.location.origin)) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone).catch(()=>{});
              });
            }
          }
          
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page or error response
            return new Response(
              JSON.stringify({ error: 'Network unavailable' }),
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }
  
  // Static assets - Cache first
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response.ok) {
              return response;
            }
            
            // Clone response for caching
            const responseClone = response.clone();
            
            // Cache the new resource
            if (request.url.startsWith(self.location.origin)) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone).catch(()=>{});
              });
            }
            
            return response;
          });
      })
  );
});

// Push event - Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let notificationData = {
    title: 'CAVB Visa Update',
    body: 'You have a new update in your visa application',
    icon: '/favicon-32x32.png',
    badge: '/favicon-16x16.png',
    tag: 'cavb-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Application',
        icon: '/favicon-16x16.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon-16x16.png'
      }
    ],
    data: {
      url: '/#/dashboard'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  
  if (action === 'dismiss') {
    return;
  }
  
  // Default action or 'view' action
  const urlToOpen = notificationData.url || '/#/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync event (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Process any queued requests here
      syncQueuedRequests()
    );
  }
});

// Sync queued requests when back online
async function syncQueuedRequests() {
  try {
    // Get queued requests from IndexedDB or localStorage
    const queuedRequests = await getQueuedRequests();
    
    for (const request of queuedRequests) {
      try {
        await fetch(request.url, request.options);
        // Remove from queue after successful sync
        await removeFromQueue(request.id);
      } catch (error) {
        console.error('Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('Error syncing queued requests:', error);
  }
}

// Helper functions for request queue management
async function getQueuedRequests() {
  // Implementation would depend on your storage choice
  return [];
}

async function removeFromQueue(requestId) {
  // Implementation would depend on your storage choice
  console.log('Remove request from queue:', requestId);
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync event:', event.tag);
  
  if (event.tag === 'background-data-sync') {
    event.waitUntil(
      // Sync application data periodically
      syncApplicationData()
    );
  }
});

async function syncApplicationData() {
  try {
    // Fetch latest application data
    const response = await fetch('/api/applications');
    if (response.ok) {
      const data = await response.json();
      // Store in cache for offline access
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/applications', new Response(JSON.stringify(data)));
    }
  } catch (error) {
    console.error('Error syncing application data:', error);
  }
}

console.log('CAVB Visa Service Worker loaded');