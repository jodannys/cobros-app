let renderTimer;

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

  // --- MÉTODOS DE ESCRITURA ---
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

  // --- MÉTODOS DE LECTURA ---
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

  // --- INICIALIZACIÓN EN TIEMPO REAL OPTIMIZADA ---
  async init() {
    console.log("🚀 Iniciando sincronización optimizada...");
    
    const colecciones = [
      'users', 'clientes', 'creditos', 'pagos', 
      'notas_cuadre', 'gastos', 'cajas', 'movimientos_cartera'
    ];

    let cargadasInicialmente = 0;
    const totalColecciones = colecciones.length;

    colecciones.forEach(col => {
      window.fbEscuchar(col, (datos) => {
        // 1. Actualizamos el cache
        this._cache[col] = datos;
        
        // 2. Control de carga inicial
        if (cargadasInicialmente < totalColecciones) {
          cargadasInicialmente++;
          if (cargadasInicialmente === totalColecciones) {
            console.log("✅ Carga inicial completa. Renderizando...");
            if (typeof render === 'function') render();
          }
        } else {
          // 3. DEBOUNCE: Evita bucles infinitos y ahorra lecturas
          clearTimeout(renderTimer);
          renderTimer = setTimeout(() => {
            console.log(`📡 Sincronización en tiempo real: [${col}]`);
            if (typeof render === 'function') render();
          }, 150);
        }
      });
    });

    console.log("💎 Sistema de ahorro de cuota (Spark) activado.");
  },

  // --- MANTENIMIENTO MANUAL (Para evitar cuotas excedidas) ---
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
        const pagosCr = pagos.filter(p => p.creditoId === cr.id);
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