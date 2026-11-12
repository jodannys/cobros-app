// v8: solo se guardan los archivos de la app. Las versiones anteriores guardaban también
// las conexiones con Firebase (datos en vivo): el almacenamiento crecía sin límite y sin
// señal podía devolver datos viejos. Al activarse, esta versión borra esas copias.
const CACHE = 'cobrosapp-v8';

// Archivos que vale la pena guardar para abrir la app sin señal:
// los de la propia app y las librerías (Firebase SDK, mapas). Nada de datos.
const HOSTS_PERMITIDOS = ['www.gstatic.com', 'unpkg.com'];
function esArchivoDeLaApp(url) {
  return url.origin === self.location.origin || HOSTS_PERMITIDOS.includes(url.hostname);
}

// Al instalar: esperar — no saltar automático (el usuario decide cuándo actualizar)
self.addEventListener('install', () => { /* esperar mensaje SKIP_WAITING */ });

// El app le dice al SW cuándo activarse
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Al activar: borrar cachés viejos y tomar control
self.addEventListener('activate', e => {
  // Borrar copias viejas y, al terminar, tomar el control de las pestañas abiertas
  // (esto dispara la recarga en la página cuando el usuario tocó "Actualizar")
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Estrategia: Network-first para HTML/JS/CSS — siempre intenta red primero
// Si no hay red, usa caché. Imágenes/íconos: cache-first.
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  // Firebase (Firestore, login, funciones, fotos) y demás servicios: no se tocan.
  // Firebase ya guarda sus datos sin señal por su cuenta, de forma correcta.
  if (!esArchivoDeLaApp(url)) return;

  const esAsset = /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/i.test(url.pathname);
  // Solo se guardan respuestas válidas (no errores 404/500)
  const guardar = (res) => {
    if (res && (res.ok || res.type === 'opaque')) {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
    }
    return res;
  };

  if (esAsset) {
    // Cache-first para imágenes e íconos
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(guardar)));
  } else {
    // Network-first para JS/CSS/HTML — siempre descarga lo nuevo; sin señal usa la copia
    e.respondWith(fetch(e.request).then(guardar).catch(() => caches.match(e.request)));
  }
});
