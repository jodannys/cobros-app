import { fbGetAll, fbGet, fbSet, fbUpdate, fbDelete, fbQuery, fbInit } from './firebase.js';

// Hacer disponibles globalmente
window.fbGetAll  = fbGetAll;
window.fbGet     = fbGet;
window.fbSet     = fbSet;
window.fbUpdate  = fbUpdate;
window.fbDelete  = fbDelete;
window.fbQuery   = fbQuery;
window.fbInit    = fbInit;

// Cargar scripts en orden
const scripts = [
  './helpers.js',
  './state.js',
  './db.js',
  './auth.js',
  './clientes.js',
  './creditos.js',
  './pagos.js',
  './cuadre.js',
  './admin.js',
  './modals.js',
  './app.js'
];

for (const src of scripts) {
  const mod = await import(src);
}