/*
 * Service worker de ODEPLAC PRO
 *
 * Objetivo: que la app instalada en la tablet abra sin cobertura y muestre
 * los últimos datos cargados (obras, planos, mediciones...). Las escrituras
 * sin conexión se gestionan en la app con una cola local (lib/offline/queue).
 */
const VERSION = 'odeplac-v4'
const SHELL = `${VERSION}-shell`
const PAGES = `${VERSION}-pages`
const DATA = `${VERSION}-data`
const MEDIA = `${VERSION}-media`

const PRECACHE = [
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('odeplac-') && ![SHELL, PAGES, DATA, MEDIA].includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', event => {
  const data = event.data

  if (data === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  // La app avisa tras iniciar sesión para guardar la portada autenticada.
  // Así el icono de la tablet abre el dashboard aunque no haya cobertura.
  if (data && data.type === 'CACHE_START_URL') {
    event.waitUntil(
      caches.open(PAGES).then(cache => cache.add('/')).catch(() => {})
    )
  }
})

/* ── Estrategias ─────────────────────────────────────────────────────────── */

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(request, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 504, statusText: 'Sin conexión' })
  }
}

async function networkFirst(request, cacheName, timeoutMs = 6000, fallbackUrl = null) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetchWithTimeout(request, timeoutMs)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    if (fallbackUrl) {
      const offline = await caches.match(fallbackUrl)
      if (offline) return offline
    }
    return new Response(JSON.stringify({ message: 'Sin conexión' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/* ── Enrutado ────────────────────────────────────────────────────────────── */

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  const sameOrigin = url.origin === self.location.origin

  if (sameOrigin) {
    // Estáticos de Next, iconos, fuentes e imágenes: cache-first
    if (
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/_next/image') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.json' ||
      /\.(?:png|jpe?g|webp|svg|ico|woff2?|css|js|map)$/i.test(url.pathname)
    ) {
      event.respondWith(cacheFirst(request, SHELL))
      return
    }

    // Navegación: red primero y, si no hay, última copia guardada
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request, PAGES, 6000, '/offline.html'))
      return
    }

    // Navegación interna de Next (RSC)
    if (request.headers.get('RSC') === '1' || url.searchParams.has('_rsc')) {
      event.respondWith(networkFirst(request, PAGES, 6000))
      return
    }

    // APIs propias (auth, IA): siempre red
    return
  }

  // Supabase: lecturas REST desde la última copia; storage cache-first
  if (url.hostname.endsWith('.supabase.co')) {
    if (url.pathname.startsWith('/rest/v1/')) {
      event.respondWith(networkFirst(request, DATA, 6000))
      return
    }
    if (url.pathname.startsWith('/storage/v1/object/')) {
      event.respondWith(cacheFirst(request, MEDIA))
      return
    }
  }
})
