const CACHE_NAME = "waselni-taif-shell-v2";
const APP_SHELL = ["./", "./manifest.webmanifest", "./icons/app-icon.svg", "./icons/app-icon-192.png", "./icons/app-icon-512.png", "./icons/app-icon-maskable-512.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/")) return;
  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok && (request.mode === "navigate" || url.pathname.includes("/assets/") || url.pathname.endsWith(".webmanifest") || url.pathname.includes("/icons/"))) {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached || (request.mode === "navigate" ? caches.match("./") : undefined))),
  );
});
