// ============================================================
// DB.JS — Capa de datos con polling inteligente
// Reemplaza onSnapshot permanente por polling cada 45s.
// Lecturas estimadas: ~200-400/día vs ~5000-15000/día anterior.
//
// Estrategia:
//   • Estáticas (users, clientes, creditos, configuracion):
//     carga al init + recarga al volver de segundo plano
//   • Dinámicas (pagos, movimientos_cartera, gastos, cajas, notas_cuadre):
//     polling cada 45s mientras la app está visible
//   • Escrituras propias: actualizan el cache local al instante
//     sin necesitar releer Firebase
// ============================================================

const _MODALES_CON_FORMULARIO = [
  'nuevo-cliente', 'editar-cliente', 'nuevo-credito',
  'nuevo-usuario', 'editar-usuario', 'editar-admin',
  'nuevo-gasto', 'editar-gasto', 'registrar-pago'
];

function _renderSeguro() {
  if (typeof render !== 'function') return;
  if (state.modal && _MODALES_CON_FORMULARIO.includes(state.modal)) return;
  render();
}

window.DB = {
  _isLoading: false,
  _pollingTimer: null,
  _INTERVALO_POLLING: 45000, // 45 segundos
  _ultimaSync: null,

  _cache: {
    users: [],
    clientes: [],
    creditos: [],
    pagos: [],
    notas_cuadre: [],
    gastos: [],
    cajas: [],
    movimientos_cartera: [],
    configuracion: []
  },

  // ── Escritura ────────────────────────────────────────────
  async set(colName, id, data) {
    const dataConTs = { ...data, updatedAt: new Date() };
    await fbSet(colName, id, { ...dataConTs, id });
    if (this._cache[colName]) {
      const idx = this._cache[colName].findIndex(x => x.id === id);
      if (idx !== -1) this._cache[colName][idx] = { ...dataConTs, id };
      else this._cache[colName].push({ ...dataConTs, id });
    }
  },

  async update(colName, id, data) {
    const dataConTs = { ...data, updatedAt: new Date() };
    await fbUpdate(colName, id, dataConTs);
    if (this._cache[colName]) {
      const idx = this._cache[colName].findIndex(x => x.id === id);
      if (idx !== -1) {
        this._cache[colName][idx] = { ...this._cache[colName][idx], ...dataConTs };
      }
    }
  },

  async delete(colName, id) {
    await fbDelete(colName, id);
    if (this._cache[colName]) {
      this._cache[colName] = this._cache[colName].filter(x => x.id !== id);
    }
  },

  async getAll(colName) {
    if (this._cache[colName] && this._cache[colName].length > 0) {
      return this._cache[colName];
    }
    this._cache[colName] = await fbGetAll(colName);
    return this._cache[colName];
  },

  query(colName, field, value) {
    if (this._cache[colName]) {
      return this._cache[colName].filter(x => x[field] === value);
    }
    return fbQuery(colName, field, value);
  },

  // ── Persistencia de cache en localStorage ────────────────
  _CACHE_KEY: 'cobrosapp_cache_v1',
  _CACHE_TTL: 5 * 60 * 1000, // 5 minutos

  _guardarCacheLocal() {
    try {
      localStorage.setItem(this._CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data: this._cache
      }));
    } catch (e) { /* localStorage lleno — ignorar */ }
  },

  _cargarCacheLocal() {
    try {
      const raw = localStorage.getItem(this._CACHE_KEY);
      if (!raw) return false;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > this._CACHE_TTL) return false;
      this._cache = { ...this._cache, ...data };
      this._ultimaSync = new Date(ts);
      return true;
    } catch (e) { return false; }
  },

  // ── Init: carga todo una vez, arranca polling ────────────
  async init() {
    console.log('🚀 Cargando datos...');

    const todas = [
      'users', 'clientes', 'creditos', 'configuracion',
      'pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'
    ];

    // Si el cache local es reciente (< 5 min), usarlo y solo hacer polling
    if (this._cargarCacheLocal()) {
      console.log('⚡ Cache local válido — sin lecturas a Firebase');
      this._arrancarPolling();
      return;
    }

    await Promise.all(todas.map(async col => {
      try {
        this._cache[col] = await fbGetAll(col);
      } catch (e) {
        console.error(`Error cargando ${col}:`, e);
        this._cache[col] = [];
      }
    }));

    this._ultimaSync = new Date();
    this._guardarCacheLocal();
    console.log('✅ Datos cargados. Iniciando polling cada 45s...');
    this._arrancarPolling();
  },

  // ── Polling: refresca solo las colecciones dinámicas ─────
  _arrancarPolling() {
    this._detenerPolling();
    const dinamicas = ['pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'];

    this._pollingTimer = setInterval(async () => {
      // No actualizar si hay un modal de formulario abierto
      if (state.modal && _MODALES_CON_FORMULARIO.includes(state.modal)) return;
      // No actualizar si la app está en segundo plano
      if (document.visibilityState === 'hidden') return;

      try {
        let huboCambios = false;
        const desde = this._ultimaSync || new Date(0);
        const ahora = new Date();

        await Promise.all(dinamicas.map(async col => {
          try {
            const nuevos = await fbGetSince(col, desde);
            if (nuevos.length > 0) {
              // Merge: actualizar docs existentes o agregar nuevos
              nuevos.forEach(doc => {
                const idx = (this._cache[col] || []).findIndex(x => x.id === doc.id);
                if (idx !== -1) this._cache[col][idx] = doc;
                else this._cache[col].push(doc);
              });
              huboCambios = true;
            }
          } catch (e) {
            console.warn(`Polling error en ${col}:`, e);
          }
        }));

        this._ultimaSync = ahora;
        this._guardarCacheLocal();

        if (huboCambios) {
          console.log('🔄 Datos actualizados (polling)');
          _renderSeguro();
        }
      } catch (e) {
        console.warn('Error en polling general:', e);
      }
    }, this._INTERVALO_POLLING);
  },

  _detenerPolling() {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  },

  // ── Refresco manual: al volver de segundo plano ──────────
  // Solo recarga las colecciones dinámicas — las estáticas
  // (users, clientes, creditos, configuracion) no cambian
  // mientras la app está en segundo plano.
  async refrescarTodo() {
    const dinamicas = ['pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'];

    try {
      const desde = this._ultimaSync || new Date(0);
      const ahora = new Date();

      await Promise.all(dinamicas.map(async col => {
        try {
          const nuevos = await fbGetSince(col, desde);
          if (nuevos.length > 0) {
            nuevos.forEach(doc => {
              const idx = (this._cache[col] || []).findIndex(x => x.id === doc.id);
              if (idx !== -1) this._cache[col][idx] = doc;
              else this._cache[col].push(doc);
            });
          }
        } catch (e) {}
      }));

      this._ultimaSync = ahora;
      _renderSeguro();
      console.log('✅ Datos dinámicos refrescados al volver');
    } catch (e) {
      console.warn('Error al refrescar:', e);
    }
  },

  // ── Pausar polling (segundo plano) ───────────────────────
  pausarListeners() {
    this._detenerPolling();
    console.log('⏸️ Polling pausado (app en segundo plano)');
  },

  // ── Reanudar polling + refresco inmediato ────────────────
  async reanudarListeners() {
    console.log('▶️ Reanudando...');
    await this.refrescarTodo();
    this._arrancarPolling();
    console.log('✅ Listeners reanudados');
  },

  async ejecutarMantenimientoManual() {
    console.warn('⚠️ Ejecutando mantenimiento manual...');
    await this._corregirCreditosSaldados();
    await this._limpiarHuerfanos();
    alert('Mantenimiento completado satisfactoriamente.');
  },

  async _corregirCreditosSaldados() {
    const creditos = this._cache['creditos'] || [];
    const pagos    = this._cache['pagos']    || [];

    console.log('🛠️ Mantenimiento de integridad...');

    creditos.forEach(cr => {
      if (cr.activo && (!cr.fechaFin || cr.fechaFin === 'undefined')) {
        const fInicio = new Date(cr.fechaInicio + 'T00:00:00');
        fInicio.setDate(fInicio.getDate() + Number(cr.diasTotal || 0));
        const nuevaFechaFin = fInicio.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        DB.update('creditos', cr.id, { fechaFin: nuevaFechaFin }).catch(e => console.error(e));
      }

      if (cr.activo === true) {
        const pagosCr = pagos.filter(p => p.creditoId === cr.id && !p.eliminado);
        const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
        const totalDeberia = Number(cr.total || 0);
        if (totalPagado >= totalDeberia && totalDeberia > 0) {
          DB.update('creditos', cr.id, { activo: false }).catch(e => console.error(e));
        }
      }
    });

    if (typeof render === 'function') render();
  },

  async _limpiarHuerfanos() {
    console.log('🧹 Limpiando datos huérfanos...');
    const users    = this._cache['users']    || [];
    const clientes = this._cache['clientes'] || [];
    const gastos   = this._cache['gastos']   || [];
    const pagos    = this._cache['pagos']    || [];
    const creditos = this._cache['creditos'] || [];

    gastos.forEach(g => {
      if (!users.find(u => u.id === g.cobradorId)) {
        DB.delete('gastos', g.id).catch(e => console.error(e));
      }
    });

    pagos.forEach(p => {
      if (!clientes.find(c => c.id === p.clienteId)) {
        DB.delete('pagos', p.id).catch(e => console.error(e));
      }
    });

    creditos.forEach(cr => {
      if (!clientes.find(c => c.id === cr.clienteId)) {
        DB.delete('creditos', cr.id).catch(e => console.error(e));
      }
    });

    console.log('✅ Limpieza completada.');
  }
};

// ── Pausar/reanudar según visibilidad de la pestaña ──────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    DB.pausarListeners();
  } else {
    DB.reanudarListeners();
  }
});

// ── Indicador visual "En vivo" ────────────────────────────────
window.renderIndicadorVivo = function () {
  return `
  <div id="indicador-vivo" style="
    display:flex; align-items:center; gap:6px;
    background:rgba(34,197,94,0.1);
    border:1px solid rgba(34,197,94,0.3);
    border-radius:20px; padding:4px 10px;
    font-size:11px; font-weight:700; color:#16a34a">
    <span style="
      width:7px; height:7px; border-radius:50%;
      background:#22c55e;
      box-shadow:0 0 0 0 rgba(34,197,94,0.4);
      animation:pulso-vivo 1.5s infinite">
    </span>
    Activo
  </div>

  <style>
    @keyframes pulso-vivo {
      0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
      100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
    }
  </style>`;
};