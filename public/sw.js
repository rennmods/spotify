self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Service worker pass-through (membiarkan PWA berjalan online)
    event.respondWith(fetch(event.request).catch(() => {
        return new Response('Aplikasi offline, harap periksa koneksi internet Anda.');
    }));
});
