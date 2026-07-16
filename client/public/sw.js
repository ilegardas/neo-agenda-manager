const CACHE = "migestion-v1";

// userId set when user is viewing a landing page
let landingUserId = null;

self.addEventListener("message", (e) => {
  if (e.data?.type === "SET_LANDING_USER") {
    landingUserId = e.data.userId;
  } else if (e.data?.type === "CLEAR_LANDING_USER") {
    landingUserId = null;
  }
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Intercept manifest.json — return user-specific manifest when on landing page
  if (url.pathname === "/manifest.json" && landingUserId) {
    e.respondWith(
      fetch(`/api/users/${landingUserId}/pwa-manifest.json`, { cache: "no-store" })
        .catch(() => fetch(e.request))
    );
    return;
  }

  if (url.pathname.startsWith("/api")) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
