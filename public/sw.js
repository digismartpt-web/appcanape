const CACHE_NAME = 'pizzeria-image-cache-v1';

// Caching strategy: Stale-While-Revalidate for images
self.addEventListener('fetch', (event) => {
    if (event.request.destination === 'image') {
        event.respondWith(
            caches.open(CACHE_NAME).then((cache) => {
                return cache.match(event.request).then((cachedResponse) => {
                    const fetchedResponse = fetch(event.request).then((networkResponse) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                    return cachedResponse || fetchedResponse;
                });
            })
        );
    }
});

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Push notification handler (from push server with VAPID)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Nova Encomenda!';
    const options = {
        body: data.body || 'Uma nova encomenda foi recebida.',
        icon: data.icon || '/imagem.png',
        badge: '/imagem.png',
        vibrate: [300, 100, 300],
        requireInteraction: true,
        tag: 'nova-encomenda'
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// Message from the page to trigger a notification (works when tab is in background)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const options = {
            body: event.data.body || 'Uma nova encomenda foi recebida.',
            icon: event.data.icon || '/imagem.png',
            badge: '/imagem.png',
            vibrate: [300, 100, 300],
            requireInteraction: true,
            tag: 'nova-encomenda'
        };
        event.waitUntil(
            self.registration.showNotification(event.data.title || 'Nova Encomenda!', options)
        );
    }
});

// Notification click — focus or open the pizzaria orders page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes('/pizzaria') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/pizzaria/commandes');
            }
        })
    );
});
