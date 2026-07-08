// Strategi: Cache-First (dengan fallback ke network jika file belum ada di cache)

const CACHE_NAME = "my-self-cache-v1"; // Ubah angka versi ini setiap kali Anda update file utama, agar cache lama otomatis dibersihkan

// Daftar file inti yang WAJIB tersedia offline
// Sesuaikan path ini jika struktur folder Anda berbeda
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png"
];

// 1. INSTALL: Simpan file inti ke cache saat service worker pertama kali dipasang
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting(); // Aktifkan service worker baru tanpa menunggu tab lama ditutup
});

// 2. ACTIVATE: Bersihkan cache versi lama
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Ambil alih kontrol tab yang sedang terbuka
});

// 3. FETCH: Strategi Cache-First
self.addEventListener("fetch", (event) => {
  // Hanya tangani request GET (hindari intercept POST, dll)
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Jika ada di cache, langsung kembalikan (offline & cepat)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Jika tidak ada di cache, coba ambil dari network
      return fetch(event.request)
        .then((networkResponse) => {
          // Simpan salinan response baru ke cache untuk penggunaan berikutnya
          return caches.open(CACHE_NAME).then((cache) => {
            // Hanya cache response yang valid (status 200, tipe basic)
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        })
        .catch(() => {
          // Jika offline dan file tidak ada di cache (misal: request halaman baru),
          // kembalikan index.html sebagai fallback (opsional, cocok untuk SPA)
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
