const CACHE = 'cobrosapp-v4';
const ARCHIVOS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/firebase.js',
  '/js/helpers.js',
  '/js/state.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/mapa_patch.js',
  '/js/cascade.js',
  '/js/clientes.js',
  '/js/creditos.js',
  '/js/pagos.js',
  '/js/cartera.js',
  '/js/cuadre.js',
  '/js/cajachica.js',
  '/js/admin.js',
  '/js/modals.js',
  '/js/infoCobrador.js',
  '/js/infoAdmin.js',
  '/js/customSelect.js',
  '/js/datePicker.js',
  '/js/botonFab.js',
  '/js/dialogs.js',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith('http')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});