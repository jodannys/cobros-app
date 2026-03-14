// Modales con formulario — no re-renderizar mientras el usuario escribe
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
  _cache: {
    users: [],
    clientes: [],
    creditos: [],
    pagos: [],
    notas_cuadre: [],
    gastos: [],
    cajas: [],
    movimientos_cartera: []
  },

  async set(colName, id, data) {
    await fbSet(colName, id, { ...data, id });
    if (this._cache[colName]) {
      const idx = this._cache[colName].findIndex(x => x.id === id);
      if (idx !== -1) this._cache[colName][idx] = { ...data, id };
      else this._cache[colName].push({ ...data, id });
    }
  },

  async update(colName, id, data) {
    await fbUpdate(colName, id, data);
    if (this._cache[colName]) {
      const idx = this._cache[colName].findIndex(x => x.id === id);
      if (idx !== -1) {
        this._cache[colName][idx] = { ...this._cache[colName][idx], ...data };
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

  async query(colName, field, value) {
    return await fbQuery(colName, field, value);
  },

  async init() {
    console.log("🚀 Cargando datos...");

    const estaticas = ['users', 'clientes', 'creditos', 'configuracion'];
    const dinamicas = ['pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'];

    // 1. Cargar estáticas una sola vez
    await Promise.all(estaticas.map(async col => {
      try {
        this._cache[col] = await fbGetAll(col);
      } catch (e) {
        console.error(`Error cargando ${col}:`, e);
        this._cache[col] = [];
      }
    }));

    // 2. Limpiar listeners anteriores
    if (window._unsubscribes) {
      window._unsubscribes.forEach(unsub => unsub());
      console.log("🧹 Listeners anteriores eliminados");
    }
    window._unsubscribes = [];

    let _renderTimer = null;

    // 3. Crear listeners nuevos
    dinamicas.forEach(col => {
      fbGetAll(col).then(datos => {
        this._cache[col] = datos;
      });

      const unsub = fbEscuchar(col, (datos) => {
        this._cache[col] = datos;
        if (_renderTimer) clearTimeout(_renderTimer);
        _renderTimer = setTimeout(() => _renderSeguro(), 1500);
      });

      window._unsubscribes.push(unsub);
    });

    console.log("✅ Listo. Tiempo real activo en: " + dinamicas.join(', '));
  },

  // ── Pausar listeners (ahorra lecturas en segundo plano) ──
  pausarListeners() {
    if (window._unsubscribes && window._unsubscribes.length > 0) {
      window._unsubscribes.forEach(unsub => unsub());
      window._unsubscribes = [];
      console.log("⏸️ Listeners pausados (app en segundo plano)");
    }
  },

  // ── Reanudar listeners y refrescar datos ──
  async reanudarListeners() {
    console.log("▶️ Reanudando listeners...");
    const dinamicas = ['pagos', 'movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre'];

    // Refrescar estáticas que pudieron cambiar
    const estaticas = ['users', 'clientes', 'creditos'];
    await Promise.all(estaticas.map(async col => {
      try { this._cache[col] = await fbGetAll(col); } catch (e) {}
    }));

    if (window._unsubscribes) {
      window._unsubscribes.forEach(unsub => unsub());
    }
    window._unsubscribes = [];

    let _renderTimer = null;

    dinamicas.forEach(col => {
      const unsub = fbEscuchar(col, (datos) => {
        this._cache[col] = datos;
        if (_renderTimer) clearTimeout(_renderTimer);
        _renderTimer = setTimeout(() => _renderSeguro(), 1500);
      });
      window._unsubscribes.push(unsub);
    });

    _renderSeguro();
    console.log("✅ Listeners reanudados");
  },

  async ejecutarMantenimientoManual() {
    console.warn("⚠️ Ejecutando mantenimiento manual solicitado...");
    await this._corregirCreditosSaldados();
    await this._limpiarHuerfanos();
    alert("Mantenimiento completado satisfactoriamente.");
  },

  async _limpiarHuerfanos() {
    console.log("🧹 Limpiando datos huérfanos...");
    const users    = this._cache['users']    || [];
    const clientes = this._cache['clientes'] || [];
    const gastos   = this._cache['gastos']   || [];
    const pagos    = this._cache['pagos']    || [];
    const creditos = this._cache['creditos'] || [];

    gastos.forEach(g => {
      if (!users.find(u => u.id === g.cobradorId)) {
        window.fbDelete('gastos', g.id).catch(e => console.error(e));
        this._cache['gastos'] = this._cache['gastos'].filter(x => x.id !== g.id);
      }
    });

    pagos.forEach(p => {
      if (!clientes.find(c => c.id === p.clienteId)) {
        window.fbDelete('pagos', p.id).catch(e => console.error(e));
        this._cache['pagos'] = this._cache['pagos'].filter(x => x.id !== p.id);
      }
    });

    creditos.forEach(cr => {
      if (!clientes.find(c => c.id === cr.clienteId)) {
        window.fbDelete('creditos', cr.id).catch(e => console.error(e));
        this._cache['creditos'] = this._cache['creditos'].filter(x => x.id !== cr.id);
      }
    });

    console.log("✅ Limpieza completada.");
  },

  async _corregirCreditosSaldados() {
    const creditos = this._cache['creditos'] || [];
    const pagos = this._cache['pagos'] || [];

    console.log("🛠️ Mantenimiento de integridad...");

    creditos.forEach(cr => {
      if (cr.activo && (!cr.fechaFin || cr.fechaFin === 'undefined')) {
        const fInicio = new Date(cr.fechaInicio + 'T00:00:00');
        fInicio.setDate(fInicio.getDate() + Number(cr.diasTotal || 0));
        const nuevaFechaFin = fInicio.toISOString().split('T')[0];
        window.fbUpdate('creditos', cr.id, { fechaFin: nuevaFechaFin }).catch(e => console.error(e));
      }

      if (cr.activo === true) {
        const pagosCr = pagos.filter(p => p.creditoId === cr.id && !p.eliminado);
        const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
        const totalDeberia = Number(cr.total || 0);
        if (totalPagado >= totalDeberia && totalDeberia > 0) {
          window.fbUpdate('creditos', cr.id, { activo: false }).catch(e => console.error(e));
        }
      }
    });

    if (typeof render === 'function') render();
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