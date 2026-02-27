// ============================================================
// MAIN.JS — Punto de entrada de Vite
// Orden importa: firebase → helpers → state → db → resto → app
// ============================================================

import { fbGetAll, fbGet, fbSet, fbUpdate, fbDelete, fbQuery, fbEscuchar } from './firebase.js';

// Exponer firebase al scope global (otros archivos lo usan via window.fbXxx)
window.fbGetAll   = fbGetAll;
window.fbGet      = fbGet;
window.fbSet      = fbSet;
window.fbUpdate   = fbUpdate;
window.fbDelete   = fbDelete;
window.fbQuery    = fbQuery;
window.fbEscuchar = fbEscuchar;

// Importar módulos en orden (todos asignan a window.* como efecto lateral)
import './helpers.js';
import './state.js';
import './db.js';
import './auth.js';
import './mapa_patch.js'; 
import './cascade.js'; 
import './clientes.js';
import './creditos.js';
import './pagos.js';
import './cuadre.js';
import './cajachica.js';
import './cartera.js';
import './admin.js';
import './modals.js';
import './app.js';         // último: llama a todo lo anterior en su INIT