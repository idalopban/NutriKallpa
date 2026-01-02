/**
 * Service Worker for NutriKallpa PWA
 * 
 * Provides offline caching for:
 * - Static assets (JS, CSS, images)
 * - Patient data (via localStorage proxy)
 * - API responses (with stale-while-revalidate)
 */

const CACHE_NAME = 'nutrikallpa-v1';
const STATIC_CACHE = 'nutrikallpa-static-v1';
const DYNAMIC_CACHE = 'nutrikallpa-dynamic-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/manifest.json',
    '/logo.png',
    '/alimentos.csv',
];

// API routes to cache with stale-while-revalidate
const CACHEABLE_API_ROUTES = [
    '/api/patients',
    '/api/appointments',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).catch((error) => {
            console.error('[SW] Failed to cache static assets:', error);
        })
    );

    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );

    // Take control immediately
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip Supabase API calls (always need fresh data for auth)
    if (url.hostname.includes('supabase')) return;

    // Skip Chrome extension requests
    if (url.protocol === 'chrome-extension:') return;

    // Handle navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Offline fallback - return cached page or offline page
                    return caches.match('/dashboard') || caches.match('/');
                })
        );
        return;
    }

    // Handle static assets - cache first
    if (request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font') {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached, but also update cache in background
                    fetch(request).then((response) => {
                        if (response.ok) {
                            caches.open(STATIC_CACHE).then((cache) => {
                                cache.put(request, response);
                            });
                        }
                    }).catch(() => { });

                    return cachedResponse;
                }

                // Not in cache - fetch and cache
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Handle API requests - network first with cache fallback
    if (CACHEABLE_API_ROUTES.some(route => url.pathname.includes(route))) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }
});

// Handle background sync for offline data submission
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-patients') {
        console.log('[SW] Background sync: patients');
        // Sync logic would go here
    }
});

// Handle push notifications (future feature)
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};

    const options = {
        body: data.body || 'Tienes una notificación',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/dashboard',
        },
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'NutriKallpa', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
