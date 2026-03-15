// ============================================================
// MAIN.JS — Punto de entrada de Vite
// Orden importa: firebase → helpers → state → db → resto → app
// firebase.js expone todo via window.* — no usar import destructurado
// ============================================================

import './firebase.js';
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