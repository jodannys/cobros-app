window.DB = {
  _cache: {},

  // --- MÉTODOS DE ESCRITURA (Envían a Firebase y actualizan el caché local) ---
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

  // --- MÉTODOS DE LECTURA Y TIEMPO REAL ---
  async getAll(colName) {
    // Si ya tenemos el listener de init(), devolvemos el cache
    if (this._cache[colName] && this._cache[colName].length > 0) {
      return this._cache[colName];
    }
    this._cache[colName] = await fbGetAll(colName);
    return this._cache[colName];
  },

  async query(colName, field, value) {
    return await fbQuery(colName, field, value);
  },

  // INICIALIZACIÓN EN TIEMPO REAL
  async init() {
    console.log("🚀 Iniciando sincronización en tiempo real...");

    const colecciones = [
      'users',
      'clientes',
      'creditos',
      'pagos',
      'notas_cuadre',
      'gastos',
      'cajas',
      'movimientos_cartera'
    ];

    // Activamos los "oídos" de Firebase para cada tabla
    colecciones.forEach(col => {
      window.fbEscuchar(col, (datos) => {
        this._cache[col] = datos;
        console.log(`📡 Datos de [${col}] sincronizados.`);

        // CADA VEZ que alguien cambie algo en la nube, la pantalla se refresca sola
        if (typeof render === 'function') render();
      });
    });

    // Ejecutamos limpieza de créditos en segundo plano después de 3 segundos
    // para dar tiempo a que los datos carguen bien sin frenar la app
    setTimeout(() => {
      this._corregirCreditosSaldados();
    }, 3000);

    console.log("✅ Sistema vinculado a la nube y listo.");
  },

  // Lógica de mantenimiento optimizada (No bloqueante)
  // Lógica de mantenimiento optimizada (Repara saldos y FECHAS)
  async _corregirCreditosSaldados() {
    const creditos = this._cache['creditos'] || [];
    const pagos = this._cache['pagos'] || [];

    console.log("🛠️ Iniciando mantenimiento de integridad de datos...");

    creditos.forEach(cr => {
      // 1. REPARACIÓN DE FECHAS (Para que Ronald y otros no salgan con undefined)
      if (cr.activo && (!cr.fechaFin || cr.fechaFin === 'undefined')) {
        const fInicio = new Date(cr.fechaInicio + 'T00:00:00');
        fInicio.setDate(fInicio.getDate() + Number(cr.diasTotal || 0));
        const nuevaFechaFin = fInicio.toISOString().split('T')[0];

        console.log(`🔧 Reparando fechaFin para: ${cr.id} (${nuevaFechaFin})`);

        // Actualizamos en la nube y en local
        cr.fechaFin = nuevaFechaFin;
        window.fbUpdate('creditos', cr.id, { fechaFin: nuevaFechaFin }).catch(e => console.error(e));
      }

      // 2. CIERRE DE CRÉDITOS COMPLETADOS (Lo que ya tenías)
      if (cr.activo === true) {
        const pagosCr = pagos.filter(p => p.creditoId === cr.id);
        const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
        const totalDeberia = Number(cr.total || 0);

        if (totalPagado >= totalDeberia && totalDeberia > 0) {
          console.log('✅ Cerrando crédito completado:', cr.id);
          cr.activo = false;
          window.fbUpdate('creditos', cr.id, { activo: false }).catch(e => console.error(e));
        }
      }
    });

    // Forzamos un render para que los cambios visuales se apliquen
    if (typeof render === 'function') render();
  }
};