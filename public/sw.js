// Service Worker لطرود - يدعم العمل دون اتصال والتثبيت كـ PWA
const CACHE_NAME = 'taroud-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.webmanifest'
];

// تثبيت Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Taroud] فتح الكاش');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// تفعيل Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Taroud] حذف الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// اعتراض الطلبات
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // لو الطلب في الكاش، أرجعه
        if (response) {
          return response;
        }
        
        // لو مش في الكاش، اجلبه من الشبكة
        return fetch(event.request).then(
          response => {
            // تحقق إن الرد صالح
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // انسخ الرد
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
