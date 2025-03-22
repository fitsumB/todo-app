const CACHE_NAME = 'mic-stream-v1';
const urlsToCache = [
    '/Mic-Stream-PWA/',
    '/Mic-Stream-PWA/index.html',
    '/Mic-Stream-PWA/manifest.json',
    '/Mic-Stream-PWA/icon-192.png',
    '/Mic-Stream-PWA/icon-512.png'
];

// Install service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting()) // Force activation
    );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim()) // Take control of all clients
    );
});

// Serve from cache, fall back to network
self.addEventListener('fetch', event => {
    // Handle navigation requests specifically
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // If can't fetch from network, serve index from cache
                    return caches.match('/Mic-Stream-PWA/index.html');
                })
        );
        return;
    }

    // Handle other requests
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return the response
                if (response) {
                    return response;
                }

                // Clone the request because it's a stream and can only be consumed once
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then(response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it's a stream and can only be consumed once
                        const responseToCache = response.clone();

                        // Store in cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // For non-navigation requests that fail, try to return something sensible
                        if (event.request.url.match(/\.(png|jpg|jpeg|svg|gif)$/)) {
                            return caches.match('/Mic-Stream-PWA/icon-192.png');
                        }
                        return new Response('Network error occurred', {
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});
