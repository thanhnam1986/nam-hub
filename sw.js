// Service Worker cho Nam Hub PWA (Phiên bản nam-hub-v2)
const CACHE_NAME = "nam-hub-v2";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/style.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/parser.js",
  "./js/voice.js",
  "./js/tasks.js",
  "./js/family.js",
  "./js/children.js",
  "./js/shopping.js",
  "./js/finance.js",
  "./js/calendar.js"
];

// Cài đặt an toàn: Từng file độc lập, không để 1 lỗi làm fail toàn bộ Service Worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const assetUrl of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(assetUrl, { cache: "no-cache" });
          if (response && (response.status === 200 || response.type === "opaque")) {
            await cache.put(assetUrl, response);
          }
        } catch (err) {
          console.warn("[SW] Không thể tải trước asset:", assetUrl, err);
        }
      }
    })
  );
});

// Kích hoạt: Xóa triệt để cache phiên bản cũ (nam-hub-v1) và claim clients ngay
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Đang dọn dẹp cache cũ:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Phục vụ cache khi offline, cập nhật ngầm khi có mạng
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // Chỉ cache các tài nguyên cùng origin
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
