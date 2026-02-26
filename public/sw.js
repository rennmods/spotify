// sw.js - App shell + audio offline cache
const APP_CACHE = "app-shell-v1";
const AUDIO_CACHE = "audio-cache-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/ren.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function isAudioRequest(req) {
  const url = new URL(req.url);
  return (
    req.destination === "audio" ||
    /\.(mp3|ogg|wav|m4a|aac)$/i.test(url.pathname) ||
    url.pathname.startsWith("/songs/")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // App shell: cache-first
  if (APP_SHELL.includes(url.pathname) || url.pathname === "/") {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Audio: cache-first (offline playback)
  if (isAudioRequest(req)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        // Only cache success
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Default: network-first, fallback cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

self.addEventListener("message", async (event) => {
  const data = event.data || {};
  if (data.type === "CACHE_AUDIO" && data.url) {
    try {
      const cache = await caches.open(AUDIO_CACHE);
      await cache.add(data.url);
      event.ports?.[0]?.postMessage({ ok: true });
    } catch (e) {
      event.ports?.[0]?.postMessage({ ok: false, error: String(e) });
    }
  }
});
