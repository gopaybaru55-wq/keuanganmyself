const CACHE_NAME = 'dimerla-cache-v2';
const OFFLINE_URLS = [
  '/',
  './index.html',
  './manifest.json'
];

// Install: simpan file inti ke cache sejak awal
self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(OFFLINE_URLS);
    })
  );
});

// Activate: bersihkan cache versi lama
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: strategi NETWORK FIRST, FALLBACK KE CACHE
self.addEventListener('fetch', function (event) {
  const req = event.request;

  // Hanya proses GET request yang benar-benar http/https dari origin sendiri.
  // Ini mencegah error "chrome-extension scheme unsupported" dari ekstensi browser,
  // dan mencegah SW ikut campur ke request pihak ketiga (Google Fonts, Chart.js CDN, dll).
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(req)
      .then(function (networkResponse) {
        // Hanya cache response yang valid (status 200, tipe basic = same-origin)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, responseClone).catch(function (err) {
              console.warn('SW: gagal simpan cache untuk', req.url, err);
            });
          });
        }
        return networkResponse;
      })
      .catch(function () {
        // Kalau offline / network gagal, ambil dari cache.
        // Fallback ke halaman utama pakai request URL asli root ('/'), bukan './index.html',
        // supaya cocok dengan cara Vercel menyajikan halaman (clean URL tanpa akhiran .html).
        return caches.match(req).then(function (cachedResponse) {
          return cachedResponse || caches.match('/') || caches.match('./index.html');
        });
      })
  );
});
