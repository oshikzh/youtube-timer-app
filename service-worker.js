const CACHE_NAME = 'app-cache-v3'; // バージョンを上げるときはここを更新
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// インストール時にプリキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ戦略
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // HTML ナビゲーション要求はネットワーク優先、失敗時にキャッシュの index.html を返す
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((resp) => {
        return resp;
      }).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // それ以外はキャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((resp) => {
        return resp;
      }).catch(() => {
        return new Response(null, { status: 404 });
      });
    })
  );
});
