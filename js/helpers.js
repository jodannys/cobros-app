window.genId = () => '_' + Math.random().toString(36).substr(2, 9);

window.hoyPeru = () => {
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return new Date(hoyStr + 'T00:00:00');
};

// Fecha de hoy en Lima ('AAAA-MM-DD'). Se pide miles de veces por pantalla y convertir
// la hora es costoso: se recuerda el resultado durante 1 segundo.
let _hoyValor = null, _hoyHasta = 0;
window.today = () => {
  const ahora = Date.now();
  if (ahora > _hoyHasta) {
    _hoyValor = new Date(ahora).toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    _hoyHasta = ahora + 1000;
  }
  return _hoyValor;
};
// ── DÍAS NO LABORABLES ───────────────────────────────────────
const _SIN_FERIADOS = Object.freeze([]);
window.getDiasNoLaborables = function() {
  const cfg = DB._cache['configuracion'] || [];
  const doc = cfg.find(c => c.id === 'dias_no_laborables');
  // Siempre la misma lista vacía (no una nueva cada vez): permite recordar cálculos de días
  return Array.isArray(doc?.fechas) ? doc.fechas : _SIN_FERIADOS;
};

window.esDiaLaboral = function(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  if (fecha.getDay() === 0) return false;
  return !getDiasNoLaborables().includes(fechaStr);
};
// ── DÍAS HÁBILES (sin domingos) ──────────────────────────────
window.sumarDiasHabiles = function(fechaStr, dias) {
  const diasNoLaborables = getDiasNoLaborables();
  const parts = fechaStr.split('-');
  const fecha = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  let contados = 0;
  while (contados < dias) {
    fecha.setDate(fecha.getDate() + 1);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    if (fecha.getDay() !== 0 && !diasNoLaborables.includes(`${y}-${m}-${d}`)) contados++;
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

window.contarDiasHabiles = function(fechaInicioStr, fechaFinStr) {
  const diasNoLaborables = getDiasNoLaborables();
  const p1 = fechaInicioStr.split('-');
  const p2 = fechaFinStr.split('-');
  const inicio = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
  const fin    = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
  let count = 0;
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= fin) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    if (cursor.getDay() !== 0 && !diasNoLaborables.includes(`${y}-${m}-${d}`)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

window.parseMonto = function(valor) {
  return Math.round((parseFloat(valor) || 0) * 100) / 100;
};

window.formatDate = (d) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
};

window.formatMoney = function (amount) {
    const num = Number(amount) || 0;
    return 'S/ ' + num.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

window.showToast = function (msg, type = 'success') {
    state.toast = { msg, type };
    render();
    setTimeout(() => { state.toast = null; render(); }, 2500);
};

window.calcularFechaFin = function(fechaInicio, dias) {
  if (!fechaInicio) return '—';
  const fechaFin = sumarDiasHabiles(fechaInicio, dias);
  return formatDate(fechaFin);
};

window.estaVencido = function(fechaInicio, dias) {
  if (!fechaInicio) return false;
  const finStr = sumarDiasHabiles(fechaInicio, dias);
  const fin = new Date(finStr + 'T00:00:00');
  return hoyPeru() > fin;
};

window.diasSinPagar = function(creditoId) {
  const pagos = DB._cache['pagos'] || [];
  const pagosCr = pagosDeCredito(creditoId, pagos).filter(p => !p.eliminado);
  if (pagosCr.length === 0) return null;
  const ultimo = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
  const hoyStr = today();
  return contarDiasHabiles(ultimo, hoyStr);
};

window.getAlertasCreditos = function() {
  if (!DB || !DB._cache) return [];

  // No filtrar por c.activo — puede estar obsoleto si se eliminó un pago.
  // La verificación saldoTotal <= 0.1 más adelante descarta los realmente cerrados.
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const users = DB._cache['users'] || [];
  const todosLosPagos = DB._cache['pagos'] || [];
  const alertas = [];
  const hoy = hoyPeru();
  const hoyStr = today();

  creditos.forEach(cr => {
    try {
      const cliente = clientes.find(c => c.id === cr.clienteId);
      if (!cliente) return;

      const cobrador = users.find(u => u.id === cliente.cobradorId) || { nombre: 'Sin Cobrador', id: 'n/a' };
      const pagosCr = pagosDeCredito(cr.id, todosLosPagos).filter(p => !p.eliminado);
      const saldoTotal = estadoCredito(cr, todosLosPagos).pendienteTotal; // saldo + mora pendiente

      if (saldoTotal <= 0.1) return;

      // Siempre recalcular fechaFin con feriados actuales (la guardada puede estar desactualizada)
      const finStr = sumarDiasHabiles(cr.fechaInicio, Number(cr.diasTotal || 0));
      const fFin = new Date(finStr + 'T00:00:00');

      if (hoy > fFin) {
        const diasVencido = contarDiasHabiles(finStr, hoyStr);
        alertas.push({ tipo: 'vencido', cr, cliente, cobrador, saldo: saldoTotal, dias: diasVencido });
      } else {
        // Atrasado — usa la función canónica
        const estado = calcularEstadoAtraso(cr, pagosCr, hoyStr);
        if (estado.atrasado) {
          alertas.push({
            tipo: 'moroso',
            cr, cliente, cobrador,
            saldo: saldoTotal,
            dias: estado.cuotasAtraso
          });
        }
      }
    } catch (e) {
      console.error("Error en alerta individual:", e);
    }
  });

  return alertas;
};


window.obtenerDatosMora = function(credito, pagos) {
  const listaPagos = pagos || (DB && DB._cache ? DB._cache['pagos'] : []) || [];
  const hoy = hoyPeru();

  if (!credito) return { esVencido: false, dias: 0, total: 0, diasInactivo: 0 };

  // Siempre recalcular con feriados actuales para consistencia con el calendario
  const finStr = sumarDiasHabiles(credito.fechaInicio, Number(credito.diasTotal || 0)); // 'AAAA-MM-DD'
  const fFin = new Date(finStr + 'T00:00:00');
  fFin.setHours(0, 0, 0, 0);

  const pagosCr = pagosDeCredito(credito.id, listaPagos).filter(p => !p.eliminado);
  let fechaRef = credito.fechaInicio;
  if (pagosCr.length > 0) {
    const fechas = pagosCr.map(p => p.fecha).filter(f => f);
    if (fechas.length > 0) fechaRef = fechas.sort((a, b) => b.localeCompare(a))[0];
  }

  // finStr ya es la fecha de fin. Antes se convertía fFin a hora de Lima: en celulares con
  // otra zona horaria (ej. España) quedaba un día antes y la mora salía con un día de más.
  const hoyStr = today();

  const esVencido = hoy > fFin;
  const diasDeMora = esVencido ? contarDiasHabiles(finStr, hoyStr) : 0;
  const diasInactividad = contarDiasHabiles(fechaRef, hoyStr);

  return {
    esVencido,
    dias: diasDeMora,
    diasVencido: diasDeMora,
    diasInactivo: diasInactividad,
    total: (credito.mora_activa && diasDeMora > 0) ? (diasDeMora * 5) : 0
  };
};

// ── Estado de cuenta de un crédito (ÚNICA fuente para saldo y mora) ──
// obtenerDatosMora().total es la mora GENERADA en total (días × 5), sin restar lo ya pagado.
// Antes, la mora pagada se volvía a mostrar como pendiente y además se restaba del saldo
// (el total a cobrar salía bien, pero el reparto saldo/mora no).
// Aquí: moraPagada = lo pagado a mora, nunca más que la mora generada (algunos pagos viejos
// registraron de más), así el TOTAL pendiente es idéntico al cálculo anterior en todos los casos.
window.estadoCredito = function (cr, pagos) {
  const lista = pagosDeCredito(cr.id, pagos).filter(p => !p.eliminado);
  const pagado = lista.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const moraGenerada = obtenerDatosMora(cr, pagos).total || 0;
  const moraRegistrada = lista.reduce((s, p) => s + (Number(p.aplicadoMora) || 0), 0);
  const moraPagada = Math.min(moraRegistrada, moraGenerada);
  const moraPendiente = Math.max(0, moraGenerada - moraPagada);
  const pagadoCapital = pagado - moraPagada;
  const saldo = Math.max(0, (Number(cr.total) || 0) - pagadoCapital);
  return {
    pagado,            // todo lo cobrado (capital + mora)
    pagadoCapital,     // lo que fue al préstamo
    saldo,             // lo que falta del préstamo
    moraGenerada,
    moraPagada,
    moraPendiente,
    pendienteTotal: saldo + moraPendiente, // lo que falta cobrar en total
    pagos: lista
  };
};

// Ajustes automáticos que solo reflejaban el cambio de un pago (eliminado o corregido).
// El pago eliminado/editado ya cambia la mochila por sí mismo: contarlos descontaba dos veces.
// Se conservan en la base, pero no suman ni restan en ningún cálculo.
window.esAjusteDePago = function (m) {
  if (m.tipo !== 'gasto_cobrador' && m.tipo !== 'cobro_ajuste') return false;
  const d = String(m.descripcion || '');
  return d === 'Baja pago' || d.startsWith('Corrección pago');
};

window.calcularMora = function (cr) {
    const info = obtenerDatosMora(cr);
    return info.total || 0;
};

window.mostrarPagoExitoso = function (titulo, subtitulo, esCierre) {
    if (document.querySelector('[data-overlay="pago"]')) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);
    z-index:99999;display:flex;align-items:center;
    justify-content:center;animation:fadeIn 0.2s ease`;

    overlay.innerHTML = `
    <div style="background:white;border-radius:24px;padding:32px 28px;
      text-align:center;max-width:300px;width:90%;
      animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="font-size:64px;margin-bottom:16px;animation:bounce 0.6s ease 0.2s both">
        ${esCierre ? '🎉' : '✅'}
      </div>
      <div style="font-size:20px;font-weight:800;color:#1e293b;margin-bottom:8px">${titulo}</div>
      <div style="font-size:14px;color:#64748b;margin-bottom:24px;line-height:1.5">${subtitulo}</div>
      <button onclick="this.closest('[data-overlay]').remove()"
        style="background:#1a56db;color:white;border:none;border-radius:12px;
        padding:13px 32px;font-size:15px;font-weight:700;cursor:pointer;width:100%">
        Aceptar
      </button>
      <div style="height:4px;background:#e2e8f0;border-radius:4px;margin-top:16px;overflow:hidden">
        <div style="height:100%;background:#1a56db;border-radius:4px;
          animation:progreso 3s linear forwards"></div>
      </div>
    </div>`;

    overlay.setAttribute('data-overlay', 'pago');
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    if (!document.getElementById('animaciones-pago')) {
        const style = document.createElement('style');
        style.id = 'animaciones-pago';
        style.textContent = `
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            @keyframes popIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
            @keyframes bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
            @keyframes progreso { from{width:100%} to{width:0%} }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.remove();
        }
    }, 3000);
};


// ══════════════════════════════════════════════════════════════
// FUNCIÓN CANÓNICA DE ATRASO
// Usada por: calcularMetaReal, getAlertasCreditos,
//            clienteEstaAtrasado, cuotaAtrasada, estaRealmenteAtrasado
// ══════════════════════════════════════════════════════════════
window.calcularEstadoAtraso = function (cr, pagos, fecha) {
  const TOLERANCIA = 0.5;

  if (!cr || !cr.activo) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante: 0 };
  }

  const fechaRef = fecha || today();
  const cuota    = Number(cr.cuotaDiaria) || 0;
  if (cuota <= 0) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante: 0 };
  }

  const pagosNoEliminados = pagosDeCredito(cr.id, pagos || []).filter(p => !p.eliminado);

  // Solo lo pagado al préstamo cubre cuotas (la mora pagada no)
  const estCr         = estadoCredito(cr, pagosNoEliminados);
  const totalPagado   = estCr.pagadoCapital;
  const saldoRestante = estCr.saldo;

  if (saldoRestante <= TOLERANCIA) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante: 0 };
  }

  const diasTranscurridos = Math.max(0, contarDiasHabiles(cr.fechaInicio, fechaRef) - 1);

  if (diasTranscurridos <= 0) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante };
  }

  const cuotasDebidas   = Math.min(diasTranscurridos, Number(cr.diasTotal));
  const cuotasCubiertas = Math.min(
    Math.floor((totalPagado + TOLERANCIA) / cuota),
    cuotasDebidas
  );

  const cuotasAtraso = Math.max(0, cuotasDebidas - cuotasCubiertas);
  const montoAtraso  = Math.round(cuotasAtraso * cuota * 100) / 100;
  const atrasado     = cuotasAtraso > 0;

  return { atrasado, cuotasDebidas, cuotasCubiertas, cuotasAtraso, montoAtraso, saldoRestante };
};

// Aliases para compatibilidad con llamadas existentes en clientes.js
window.clienteEstaAtrasado = function (cr, pagos) {
  return calcularEstadoAtraso(cr, pagos).atrasado;
};

window.cuotaAtrasada = function (cr, pagos) {
  return calcularEstadoAtraso(cr, pagos).cuotasAtraso;
};

window.estaRealmenteAtrasado = function (clienteId) {
  const creditos = DB._cache['creditos'] || [];
  const pagos    = DB._cache['pagos']    || [];
  const cr = creditos.find(c => c.clienteId === clienteId && c.activo);
  if (!cr) return false;
  return calcularEstadoAtraso(cr, pagos).atrasado;
};
// Evita guardar dos veces por doble toque: ignora clics mientras la función anterior sigue en curso
// y desactiva el botón pulsado hasta que termine.
window.unaVez = function (fn) {
  let ocupado = false;
  return async function (...args) {
    if (ocupado) return;
    ocupado = true;
    const btn = document.activeElement?.tagName === 'BUTTON' ? document.activeElement : null;
    if (btn) btn.disabled = true;
    try {
      return await fn.apply(this, args);
    } finally {
      ocupado = false;
      if (btn && btn.isConnected) btn.disabled = false;
    }
  };
};

// Escapa texto para meterlo en HTML/atributos (evita que comillas o < > rompan formularios)
window.esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Movimientos de cartera que cuentan en los cálculos. Los marcados "anulado" (desde
// Cartera → "Revisar ajustes viejos") se conservan en la base pero no suman ni restan.
window.movsCartera = () => (DB._cache['movimientos_cartera'] || []).filter(m => !m.anulado);

// Texto para buscar en la ayuda: sin tildes ni mayúsculas (ñ → n)
window._normAyuda = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Mensaje de error entendible para el usuario (Firebase devuelve textos técnicos en inglés)
window.mensajeError = function (e) {
  const codigo = String(e?.code || '').replace(/^(firestore|auth|functions|storage)\//, '');
  const textos = {
    'permission-denied': 'No tienes permiso para hacer esto. Si crees que es un error, avisa al administrador.',
    'unauthorized': 'No tienes permiso para hacer esto. Si crees que es un error, avisa al administrador.',
    'unauthenticated': 'Tu sesión venció. Cierra la app y vuelve a iniciar sesión.',
    'unavailable': 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
    'network-request-failed': 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
    'deadline-exceeded': 'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
    'not-found': 'Ese registro ya no existe (quizás otra persona lo eliminó). Cierra y vuelve a abrir la app.',
    'already-exists': 'Ese registro ya existe.',
    'resource-exhausted': 'Se alcanzó el límite de uso por hoy. Avisa al administrador.'
  };
  if (textos[codigo]) return textos[codigo];
  if (/insufficient permissions/i.test(e?.message || '')) return textos['permission-denied'];
  return e?.message || 'Ocurrió un error inesperado.';
};

// ── Toques que "no agarran a la primera" con el teclado abierto ─────────
// En el celular, al tocar un botón mientras se escribe, primero se cierra el teclado:
// la pantalla cambia de tamaño, el botón se mueve y el toque cae fuera (había que tocar
// dos veces, ej. "Ingresar" o "Registrar pago"). Evitamos que el toque quite el foco
// del campo: el teclado no se cierra antes del click y el botón responde a la primera.
// (Al guardar, la pantalla se vuelve a dibujar y el teclado se cierra solo.)
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return; // en computadora no hace falta
  if (e.target.closest('input, textarea, select, label')) return;
  // Solo botones de acción (no el calendario ni listas desplegables, que sí deben cerrar el teclado)
  const boton = e.target.closest('button, .btn');
  const activo = document.activeElement;
  if (boton && activo && /^(INPUT|TEXTAREA)$/.test(activo.tagName) && !boton.contains(activo)) {
    e.preventDefault();
  }
}, { passive: false });

// ══════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS (misma forma y comportamiento en toda la app)
// ══════════════════════════════════════════════════════════════

// Botón "‹ Volver". claro=true para fondos de color (ficha del cliente)
window.renderBtnVolver = function (onclick, claro = false) {
  return `
  <button type="button" class="btn-atras${claro ? ' btn-atras--claro' : ''}" aria-label="Volver" onclick="${onclick}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    Volver
  </button>`;
};

// Selector de día: ‹ [Hoy | dd/mm/aaaa] ›
// - Flechas: llaman a mover(-1 | 1)
// - Tocar la fecha: abre el calendario de la app y guarda en state[estado]
// - Nunca permite días futuros
window.renderSelectorFecha = function ({ fecha, mover, estado }) {
  const hoy = today();
  const esHoy = fecha >= hoy;
  const enc = (s) => encodeURIComponent(s).replace(/'/g, '%27');
  const alElegir = `state.${estado} = VALUE > today() ? today() : VALUE; render()`;
  return `
  <div class="selector-fecha">
    <button type="button" class="selector-fecha__flecha" aria-label="Día anterior" onclick="${mover}(-1)">‹</button>
    <button type="button" class="selector-fecha__dia" onclick="abrirDatePicker('${enc(fecha)}', '${enc(alElegir)}')">
      ${esHoy ? 'Hoy' : formatDate(fecha)}
    </button>
    <button type="button" class="selector-fecha__flecha" aria-label="Día siguiente"
      onclick="${mover}(1)" ${esHoy ? 'disabled' : ''}>›</button>
  </div>`;
};

// Flecha para desplegar/ocultar (⌄ abajo, ⌃ arriba), mismo trazo que las flechas ‹ › de la app
window.iconoFlecha = function (arriba, tam = 16) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
    style="vertical-align:middle; flex-shrink:0; margin-top:-2px"><path d="${arriba ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'}"/></svg>`;
};

// ── Índice de pagos por crédito (velocidad) ──────────────────────
// Calcular saldo/mora/atraso de cada crédito recorría TODOS los pagos cada vez:
// con 1.000 créditos y 20.000 pagos eran millones de operaciones por pantalla.
// Ahora se agrupan los pagos por crédito una sola vez y se reutiliza el grupo.
// El índice se rehace solo si la lista cambia (otra lista o distinta cantidad);
// los cambios dentro de un pago (monto, eliminado) se leen siempre del objeto real.
const _indicesPagos = new WeakMap();
window.pagosDeCredito = function (creditoId, pagos) {
  const lista = pagos || DB._cache['pagos'] || [];
  let idx = _indicesPagos.get(lista);
  if (!idx || idx.largo !== lista.length) {
    const mapa = new Map();
    for (const p of lista) {
      let grupo = mapa.get(p.creditoId);
      if (!grupo) { grupo = []; mapa.set(p.creditoId, grupo); }
      grupo.push(p);
    }
    idx = { largo: lista.length, mapa };
    _indicesPagos.set(lista, idx);
  }
  return idx.mapa.get(creditoId) || [];
};

// ── Recordar cálculos de días hábiles (velocidad) ────────────────
// sumarDiasHabiles / contarDiasHabiles recorren el calendario día por día y se piden
// miles de veces con los mismos datos. Se recuerda cada resultado mientras la lista de
// feriados sea la misma (si el admin agrega o quita un feriado, la lista cambia y se
// vuelve a calcular todo).
(function () {
  const memos = new WeakMap();
  const memoPara = (feriados) => {
    let m = memos.get(feriados);
    if (!m) { m = new Map(); memos.set(feriados, m); }
    return m;
  };
  const recordar = (nombre) => {
    const original = window[nombre];
    window[nombre] = function (a, b) {
      const memo = memoPara(getDiasNoLaborables());
      const clave = a + '|' + b;
      let r = memo.get(clave);
      if (r === undefined) { r = original(a, b); memo.set(clave, r); }
      return r;
    };
  };
  recordar('sumarDiasHabiles');
  recordar('contarDiasHabiles');
})();
