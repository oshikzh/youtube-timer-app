const CACHE_NAME = 'app-cache-v2'; // バージョンを上げるときはここを更新
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/otera_kane.mp3'
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
  const url = new URL(req.url);

  // 音声ファイルはキャッシュ優先（オフラインで再生できるように）
  if (url.pathname.endsWith('/otera_kane.mp3') || url.pathname.endsWith('otera_kane.mp3')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          // 取得に成功したらキャッシュに保存して返す
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resp.clone());
            return resp;
          });
        }).catch(() => {
          // オフライン時は 404 ではなく空レスポンスを返す（必要なら別の音声を返す）
          return new Response(null, { status: 404 });
        });
      })
    );
    return;
  }

  // HTML ナビゲーション要求はネットワーク優先、失敗時にキャッシュの index.html を返す
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((resp) => {
        // ネットワーク成功ならそのまま返す（必要ならキャッシュ更新も可能）
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
        // 動的にキャッシュしたくない場合はここでそのまま返す
        return resp;
      }).catch(() => {
        // フォールバック: キャッシュに該当がなければ何もしない（ブラウザがエラー扱い）
        return new Response(null, { status: 404 });
      });
    })
  );
});
