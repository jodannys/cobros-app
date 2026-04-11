const CACHE = 'cobrosapp-v7';

// Al instalar: esperar — no saltar automático (el usuario decide cuándo actualizar)
self.addEventListener('install', () => { /* esperar mensaje SKIP_WAITING */ });

// El app le dice al SW cuándo activarse
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Al activar: borrar cachés viejos y tomar control
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: Network-first para HTML/JS/CSS — siempre intenta red primero
// Si no hay red, usa caché. Imágenes/íconos: cache-first.
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const esAsset = /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/i.test(url.pathname);

  if (esAsset) {
    // Cache-first para imágenes e íconos
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  } else {
    // Network-first para JS/CSS/HTML — siempre descarga lo nuevo
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
