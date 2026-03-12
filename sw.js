const CACHE = 'cobrosapp-v1';
const ARCHIVOS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/firebase.js',
  '/js/helpers.js',
  '/js/state.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/clientes.js',
  '/js/creditos.js',
  '/js/pagos.js',
  '/js/cartera.js',
  '/js/cuadre.js',
  '/js/admin.js',
  '/js/modals.js',
  '/js/cajachica.js',
  '/js/cascade.js',
  '/js/app.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});