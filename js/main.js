// ============================================================
// MAIN.JS — Punto de entrada de Vite
// El orden de imports aquí define el orden de ejecución
// firebase.js usa window.* — no tiene exports nombrados
// ============================================================

// Nota: firebase.js se carga como script normal en index.html
// antes de este módulo, por eso no se importa aquí

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
import './app.js';