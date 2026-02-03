/**
 * SERVICE WORKER - Eclipse Commander
 * Gestisce caching e funzionalità offline
 */

const CACHE_NAME = 'eclipse-commander-v3.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/storage.js',
    '/js/eclipse-database.js',
    '/js/camera-manager.js',
    '/data/eclipses.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone response
                    const responseToCache = response.clone();

                    // Cache new resources
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                });
            }).catch(error => {
                console.log('[SW] Fetch error:', error);
                // Return offline page if available
                return caches.match('/index.html');
            })
    );
});

// Message event - handle messages from app
self.addEventListener('message', event => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Sync event - background sync
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('[SW] Background sync');
    // Implement sync logic if needed
}

// Push event - notifications
self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Eclipse Commander';
    const options = {
        body: data.body || 'Notification',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});
