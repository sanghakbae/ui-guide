/* UI 용어 사전 · Service Worker */
const CACHE = 'ui-guide-v3';
const SHELL = ['./', './index.html', './privacy.html', './admin.html', './manifest.json', './i18n/en.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon.svg'];
const CDN = /(^https:\/\/www\.gstatic\.com\/firebasejs\/)|(^https:\/\/cdn\.jsdelivr\.net\/)/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function cacheFirst(req, allowOpaque) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || (allowOpaque && res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 다른 출처: SDK·폰트만 캐시, 인증·분석 요청은 그대로 통과
  if (url.origin !== self.location.origin) {
    if (CDN.test(req.url)) e.respondWith(cacheFirst(req, true));
    return;
  }

  // 페이지 이동: 네트워크 우선, 실패하면 캐시(오프라인)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
    return;
  }

  // 그 외 정적 파일: 캐시 우선
  e.respondWith(cacheFirst(req, false));
});
