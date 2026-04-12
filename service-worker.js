// FitVAL Service Worker — network-first
const CACHE = 'fitval-v5'; // <-- ВАЖНО: Мы повысили версию кэша, чтобы приложение обновилось

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([
      './',
      './index.html',
      './manifest.json'
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
  
  // Исключаем сторонние API из кэширования
  if (e.request.url.includes('api.anthropic.com')) return;
  if (e.request.url.includes('fonts.googleapis.com')) return;
  
  // ВАЖНО: Исключаем служебные запросы Firebase, чтобы не сломать авторизацию и базу
  if (e.request.url.includes('firestore.googleapis.com')) return; 
  if (e.request.url.includes('identitytoolkit.googleapis.com')) return;
  if (e.request.url.includes('firebase')) return;

  if (!e.request.url.startsWith('https://')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
