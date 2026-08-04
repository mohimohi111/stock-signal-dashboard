const CACHE_NAME = "stock-signal-v3-fresh";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 常にネットワーク優先。オフライン時のみキャッシュにフォールバック(更新の反映漏れを防ぐ)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// scan.pyからのWeb Pushを受け取って通知表示する
self.addEventListener("push", (event) => {
  let payload = { title: "レッツ脳筋", body: "更新があります", url: "./" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    // JSONでなければ本文だけ使う
    if (event.data) payload.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: { url: payload.url || "./" },
    })
  );
});

// 通知タップでアプリを開く(既に開いていればそのタブにフォーカス)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
