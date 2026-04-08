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
  _listeners: {},   // onSnapshot activos
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

  query(colName, field, value) {
    return (this._cache[colName] || []).filter(x => x[field] === value);
  },

  // ── Cache local ──────────────────────────────────────────
  _CACHE_KEY: 'cobrosapp_cache_v1',
  _CACHE_TTL: 60 * 60 * 1000, // 60 minutos

  _guardarCacheLocal() {
    try {
      localStorage.setItem(this._CACHE_KEY, JSON.stringify({
        ts: Date.now(),
        data: this._cache
      }));
    } catch (e) {}
  },

  _cargarCacheLocal() {
    try {
      const raw = localStorage.getItem(this._CACHE_KEY);
      if (!raw) return false;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > this._CACHE_TTL) return false;
      this._cache = { ...this._cache, ...data };
      return true;
    } catch (e) { return false; }
  },

  // ── Init ─────────────────────────────────────────────────
  async init() {
    console.log('🚀 Iniciando CobrosApp...');

    // Colecciones estáticas — solo se cargan una vez
    const estaticas = ['users', 'clientes', 'creditos', 'configuracion'];
    // Colecciones dinámicas — se escuchan en tiempo real
    const dinamicas = ['pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'];

    // Cargar cache local para mostrar datos inmediatamente
    const cacheValido = this._cargarCacheLocal();
    if (cacheValido) {
      console.log('⚡ Cache local válido — mostrando datos guardados');
    }

    // Cargar estáticas desde Firebase (solo si cache expiró)
    if (!cacheValido) {
      await Promise.all(estaticas.map(async col => {
        try {
          this._cache[col] = await fbGetAll(col);
        } catch (e) {
          console.error(`Error cargando ${col}:`, e);
          this._cache[col] = [];
        }
      }));
    }

    // Escuchar dinámicas en tiempo real con onSnapshot
    this._arrancarListeners(dinamicas);

    this._guardarCacheLocal();
    console.log('✅ App lista');
  },

  // ── onSnapshot listeners ──────────────────────────────────
  _arrancarListeners(colecciones) {
    colecciones.forEach(col => {
      // Evitar listeners duplicados
      if (this._listeners[col]) return;

      this._listeners[col] = fbEscuchar(col, (datos) => {
        this._cache[col] = datos;
        this._guardarCacheLocal();
        console.log(`🔄 ${col} actualizado en tiempo real`);
        _renderSeguro();
      });
    });
  },

  _detenerListeners() {
    Object.values(this._listeners).forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this._listeners = {};
    console.log('⏸️ Listeners detenidos');
  },

  // ── Pausar/reanudar ───────────────────────────────────────
  pausarListeners() {
    this._detenerListeners();
  },

  async reanudarListeners() {
    const dinamicas = ['pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'];
    this._arrancarListeners(dinamicas);
    console.log('▶️ Listeners reanudados');
  },

  // ── Mantenimiento ─────────────────────────────────────────
  async ejecutarMantenimientoManual() {
    console.warn('⚠️ Ejecutando mantenimiento manual...');
    await this._corregirCreditosSaldados();
    await this._limpiarHuerfanos();
    alert('Mantenimiento completado satisfactoriamente.');
  },

  async _corregirCreditosSaldados() {
    const creditos = this._cache['creditos'] || [];
    const pagos    = this._cache['pagos']    || [];
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
        if (totalPagado >= Number(cr.total || 0) && cr.total > 0) {
          DB.update('creditos', cr.id, { activo: false }).catch(e => console.error(e));
        }
      }
    });
    if (typeof render === 'function') render();
  },

  async _limpiarHuerfanos() {
    const users    = this._cache['users']    || [];
    const clientes = this._cache['clientes'] || [];
    const gastos   = this._cache['gastos']   || [];
    const pagos    = this._cache['pagos']    || [];
    const creditos = this._cache['creditos'] || [];
    gastos.forEach(g => {
      if (!users.find(u => u.id === g.cobradorId)) DB.delete('gastos', g.id).catch(() => {});
    });
    pagos.forEach(p => {
      if (!clientes.find(c => c.id === p.clienteId)) DB.delete('pagos', p.id).catch(() => {});
    });
    creditos.forEach(cr => {
      if (!clientes.find(c => c.id === cr.clienteId)) DB.delete('creditos', cr.id).catch(() => {});
    });
  }
};

// ── Pausar/reanudar según visibilidad ────────────────────────
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
    En vivo
  </div>
  <style>
    @keyframes pulso-vivo {
      0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
      70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
      100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
    }
  </style>`;
};