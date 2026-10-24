/* Epsilon Soft PWA Service Worker — static-only, network-first; no private payload caching, no removed library folders. */
'use strict';
const CACHE_NAME = 'epsilon-soft-materials-shared-20261023-02';
const ESSENTIAL = [
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./icon-152.png",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/js/app.js",
  "./assets/images/epsilon-mark.png",
  "./assets/images/epsilon-logo.png",
  "./assets/images/epsilon-logo-white.png",
  "./assets/images/hero-laptop.webp",
  "./assets/images/portable-laptop.webp"
];
const OPTIONAL = [
  "./assets/data/code39-patterns.json",
  "./assets/data/materials.json",
  "./assets/js/tools/area.js",
  "./assets/js/tools/barcode.js",
  "./assets/js/tools/beam.js",
  "./assets/js/tools/calculator.js",
  "./assets/js/tools/calendar.js",
  "./assets/js/tools/converter.js",
  "./assets/js/tools/interest.js",
  "./assets/js/tools/mass.js",
  "./assets/js/tools/materials.js",
  "./assets/js/tools/nesting.js",
  "./assets/js/tools/notes.js",
  "./assets/js/tools/paint.js",
  "./assets/js/tools/qr.js",
  "./assets/js/tools/pdf-studio.js",
];
const ALLOWED = new Set([...ESSENTIAL, ...OPTIONAL, './'].map(path => new URL(path, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // A service worker should not activate an incomplete essential shell.
    await cache.addAll(ESSENTIAL.map(path => new Request(new URL(path, self.registration.scope), {cache:'reload'})));
    // The optional public tools are cached opportunistically; failures do not break site loading.
    await Promise.allSettled(OPTIONAL.map(path => cache.add(new Request(new URL(path, self.registration.scope), {cache:'reload'}))));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('epsilon-soft-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  // No user files, other endpoints, or unknown third-party resources are cached.
  const navigation = req.mode === 'navigate';
  if (!navigation && !ALLOWED.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const fresh = await fetch(new Request(req, {cache:'no-store'}));
      if (fresh.ok && fresh.type === 'basic') {
        const copy = fresh.clone();
        event.waitUntil(cache.put(req, copy).catch(() => {}));
      }
      return fresh;
    } catch {
      if (navigation) return (await cache.match(new URL('./index.html', self.registration.scope))) || Response.error();
      return (await cache.match(req, {ignoreSearch:true})) || Response.error();
    }
  })());
});
