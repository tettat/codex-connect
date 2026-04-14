const CACHE_NAME = "codex-connect-edge-v25"
const VERSION = "2026.04.13-28"
const CORE_ASSETS = [
  "/",
  `/styles.css?v=${VERSION}`,
  `/app.js?v=${VERSION}`,
  `/manifest.webmanifest?v=${VERSION}`,
  `/icon.svg?v=${VERSION}`
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname === "/ws" || url.pathname.startsWith("/v1/") || url.pathname.startsWith("/api/")) return

  event.respondWith(networkFirst(event.request))
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok && request.method === "GET") {
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch (error) {
    const cached = (await cache.match(request)) || (await caches.match(request))
    if (cached) return cached
    throw error
  }
}
