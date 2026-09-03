const CACHE = "stopwatch-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./enhancements.js",
  "./fonts/SF-Pro-Display-Thin.woff",
  "./icons/icon-180.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      for (const asset of ASSETS) {
        try { await cache.add(asset); } catch (_) {}
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE ? caches.delete(key) : undefined)
    ))
  );
  self.clients.claim();
});

async function getResponse(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && new URL(request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (_) {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    const response = await getResponse(request);
    if (request.mode === "navigate" && response && response.ok) {
      try {
        const type = response.headers.get("content-type") || "";
        if (type.includes("text/html")) {
          const html = await response.text();
          const injected = html.replace(/<\/body>/i, '<script src="./enhancements.js"></script></body>');
          return new Response(injected, {
            status: response.status,
            statusText: response.statusText,
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        }
      } catch (_) {}
    }
    return response;
  })());
});
