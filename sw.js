'use strict';

const CACHE = 'weather-v2';
const SHELL = ['./'];

/* ── INSTALL: cache the app shell ─────────────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

/* ── ACTIVATE: remove old caches ──────────────────────────────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── FETCH strategy ───────────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Open-Meteo API: network-first, fall back to cache ─────────────── */
  if (url.hostname === 'api.open-meteo.com') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Flag images (flagcdn.com): cache-first ────────────────────────── */
  if (url.hostname === 'flagcdn.com') {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  /* App shell: cache-first ─────────────────────────────────────────── */
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
