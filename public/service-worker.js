const CACHE_NAME = "tourmic-cache-v1";
const urlsToCache = [
    // ...add any files or routes that should be cached...
    "/",
    "/sender",
    "/_not-found",
    "chunks/240-87a5dd09ca9b35c7.js",
    "chunks/8bc8d761-cd80ce728d90ea1c.js",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            )
        )
    );
});

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            return fetch(event.request).catch(() => caches.match("/"));
        })
    );
});
