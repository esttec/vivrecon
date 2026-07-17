/* Vivrecon service worker — minimal, network-first.
   Its main job is to make the app installable (PWA / Play Store TWA).
   It never caches API responses, so your data is always fresh. */
const CACHE = 'vivrecon-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  // Never touch API or non-GET requests — always go to the network.
  if (request.method !== 'GET' || new URL(request.url).pathname.startsWith('/api/')) return

  // Network-first for everything else, falling back to cache when offline.
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('/index.html')))
  )
})
