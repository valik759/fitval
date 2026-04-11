// FitVAL Service Worker — network-first
// Обновления применяются сразу при открытии приложения
const CACHE = 'fitval-v3';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      '/index.html',
      '/manifest.json',
      '/icons/fitval-icon-192x192.png',
      '/icons/fitval-icon-512x512.png'
    ])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('fitval-') && k !== CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.anthropic.com')) return;
  if (e.request.url.includes('fonts.googleapis.com')) return;
  if (!e.request.url.startsWith('https://')) return;

  // NETWORK-FIRST: сначала сеть, при ошибке — кеш
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Сохраняем свежую версию в кеш
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // офлайн — берём из кеша
  );
});

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(self.registration.showNotification(d.title || 'FitVAL', {
    body: d.body || '',
    icon: '/icons/fitval-icon-192x192.png',
    badge: '/icons/fitval-icon-48x48.png',
    vibrate: [100, 50, 100]
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/index.html'));
});
