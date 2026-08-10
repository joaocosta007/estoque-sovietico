const CACHE = "estoque-public-v4";
const SHELL = [
  "/manifest.webmanifest",
  "/icons/app-icon-192.png",
  "/icons/notification-icon.png",
  "/icons/notification-badge.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname === "/" ||
    url.pathname === "/login"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "Novo comunicado disponível." };
  }
  const title = data.title || "ESTOQUE SOVIÉTICO";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Novo comunicado disponível.",
      icon: "/icons/notification-icon.png",
      badge: "/icons/notification-badge.png",
      tag: data.campaignId || "estoque-sovietico",
      renotify: true,
      data: { url: data.url || "/catalogo" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested = event.notification.data?.url || "/catalogo";
  const target = new URL(requested, self.location.origin);
  if (target.origin !== self.location.origin) target.href = `${self.location.origin}/catalogo`;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target.href);
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
