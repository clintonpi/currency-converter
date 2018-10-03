const staticCacheName = 'cc-v4';

self.addEventListener('install', (event) => {
  const urlsToCache = [
    './',
    './?hs=true',
    './index.html',
    './css/reset.min.css',
    './css/style.css',
    './images/favicon.ico',
    './images/apple-60.png',
    './images/apple-76.png',
    './images/apple-120.png',
    './images/apple-152.png',
    './images/apple-167.png',
    './images/apple-180.png',
    './images/icon-48.png',
    './images/icon-96.png',
    './images/icon-128.png',
    './images/icon-144.png',
    './images/icon-192.png',
    './images/icon-256.png',
    './images/icon-384.png',
    './images/icon-512.png',
    './images/select-icon.png',
    './dist/js/script.js',
    './manifest.json',
    'https://fonts.googleapis.com/css?family=Signika',
    'https://free.currencyconverterapi.com/api/v5/currencies'
  ];

  event.waitUntil(
    caches
      .open(staticCacheName)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Offline-first
  event.respondWith(
    caches
      .match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// To update (delete old) cache if present sw is new
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys() // Gets the name of existing caches, returns a promise
      .then(cacheNames => Promise.all(cacheNames
        // Promise.all waits for all fulfillments (or the first rejection).
        // Use Promise.all() to wait on the completion of all the delete promises.
        .filter(cacheName => cacheName.startsWith('cc-') && cacheName !== staticCacheName)
        .map(cacheName => caches.delete(cacheName))))
  );
});

self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') self.skipWaiting();
});
