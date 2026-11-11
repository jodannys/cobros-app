const _MODALES_CON_FORMULARIO = [
  'nuevo-cliente', 'editar-cliente', 'nuevo-credito',
  'nuevo-usuario', 'editar-usuario', 'editar-admin',
  'nuevo-gasto', 'editar-gasto', 'registrar-pago'
];

let _renderTimer = null;
function _renderSeguro() {
  if (typeof render !== 'function') return;
  if (state.modal && _MODALES_CON_FORMULARIO.includes(state.modal)) return;
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(render, 50);
}

window.DB = {
  _listeners: {},
  _cacheVersion: 0,
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

  _CACHE_KEY: 'cobrosapp_cache_v2',

  _borrarCacheLocal() {
    clearTimeout(this._saveTimer);
    try { localStorage.removeItem(this._CACHE_KEY); } catch (e) { }
    try {
      // pagos se guarda por modo (cobrosapp_pagos_v1_todos, cobrosapp_pagos_v1_<uid>, ...)
      Object.keys(localStorage)
        .filter(k => k.startsWith(this._PAGOS_KEY))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) { }
    this._soloMios = null;
    Object.keys(this._cache).forEach(k => { this._cache[k] = []; });
  },
  _CACHE_TTL: 15 * 60 * 1000,
  _saveTimer: null,

  _guardarCacheLocal() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        // Nunca guardar contraseñas en el celular
        // pagos va en su propia clave (_PAGOS_KEY) con su propia vigencia
        const users = (this._cache.users || []).map(({ pass, ...u }) => u);
        const { pagos, ...resto } = this._cache;
        localStorage.setItem(this._CACHE_KEY, JSON.stringify({
          ts: Date.now(),
          data: { ...resto, users }
        }));
      } catch (e) { }
    }, 800);
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

  async init() {
  console.log('🚀 Iniciando CobrosApp...');
  try { localStorage.removeItem('cobrosapp_cache_v1'); } catch (e) { } // caché vieja con contraseñas

  const estaticas = ['users', 'configuracion'];
  const dinamicas = ['movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre', 'creditos', 'clientes'];

  const cacheValido = this._cargarCacheLocal();
  if (cacheValido) {
    console.log('⚡ Cache local válido — mostrando datos guardados');
  }

  // users siempre fresco
  await fbGetAll('users').then(data => {
    this._cache['users'] = data;
  }).catch(() => {});

  if (!cacheValido) {
    await Promise.all(estaticas.map(async col => {
      if (col === 'users') return;
      try {
        this._cache[col] = await fbGetAll(col);
      } catch (e) {
        console.error(`Error cargando ${col}:`, e);
        this._cache[col] = [];
      }
    }));
  }

  // Decidir ANTES de descargar si este usuario baja todo (admin) o solo lo suyo (cobrador)
  this._soloMios = this._calcularSoloMios();
  console.log(this._soloMios ? '🎯 Modo cobrador: solo datos propios' : '🌐 Descargando todos los datos');

  await this._sincronizarPagos();
  this._arrancarListeners(dinamicas);

  if (this._cache['users'].length > 0) this._guardarCacheLocal();
  this._repararCarteraDiaria();
  console.log('✅ App lista');
},

  // ── Descarga filtrada por cobrador ───────────────────────────
  // El cobrador solo necesita: sus clientes; créditos y pagos de sus clientes (campo `cartera`)
  // o registrados por él (`cobradorId`); y sus gastos, cajas, notas y movimientos.
  // Así sus cálculos (mochila, cuadre, caja chica) dan exactamente lo mismo que con todo.
  _soloMios: null, // uid del cobrador en modo filtrado; null = descarga todo
  _FILTROS_COBRADOR: {
    clientes: ['cobradorId'],
    creditos: ['cartera', 'cobradorId'],
    pagos: ['cartera', 'cobradorId'],
    gastos: ['cobradorId'],
    cajas: ['cobradorId'],
    notas_cuadre: ['cobradorId'],
    movimientos_cartera: ['cobradorId']
  },

  _calcularSoloMios() {
    const uid = firebase.auth().currentUser?.uid;
    const yo = (this._cache['users'] || []).find(u => u.id === uid);
    const mig = (this._cache['configuracion'] || []).find(c => c.id === 'migraciones');
    // Solo se activa cuando el servidor ya marcó `cartera` en todos los créditos y pagos
    return yo && yo.role === 'cobrador' && mig?.cartera === true ? uid : null;
  },

  // Cada día, el primer ingreso de un admin corrige el campo `cartera` de créditos/pagos
  // (p. ej. datos creados desde un celular con la versión anterior de la app).
  _repararCarteraDiaria() {
    const uid = firebase.auth().currentUser?.uid;
    const yo = (this._cache['users'] || []).find(u => u.id === uid);
    if (!yo || yo.role !== 'admin') return;
    const mig = (this._cache['configuracion'] || []).find(c => c.id === 'migraciones');
    if (mig?.carteraFecha === today()) return;
    fbFuncion('asignarCartera', {})
      .then(r => {
        console.log(`🧭 Cartera revisada: ${r.creditos} créditos y ${r.pagos} pagos corregidos`);
        const cfg = this._cache['configuracion'] || (this._cache['configuracion'] = []);
        const idx = cfg.findIndex(c => c.id === 'migraciones');
        const doc = { ...(idx !== -1 ? cfg[idx] : {}), id: 'migraciones', cartera: true, carteraFecha: r.fecha };
        if (idx !== -1) cfg[idx] = doc; else cfg.push(doc);
        this._guardarCacheLocal();
      })
      .catch(e => console.warn('No se pudo revisar cartera:', e));
  },

  // Une varias listas por id (sin duplicar)
  _unir(listas) {
    const porId = new Map();
    listas.forEach(l => (l || []).forEach(x => porId.set(x.id, x)));
    return [...porId.values()];
  },
  // ── Pagos: descarga completa 1 vez al día; el resto del tiempo solo los cambios ──
  // Todas las escrituras de pagos llevan updatedAt y nunca se borran (se marcan eliminado),
  // así que traer "updatedAt > última sincronización" es suficiente.
  _PAGOS_KEY: 'cobrosapp_pagos_v1',
  _PAGOS_TTL: 24 * 60 * 60 * 1000,   // descarga completa como máximo cada 24 h
  _PAGOS_MARGEN: 30 * 60 * 1000,     // margen por diferencia de reloj entre celulares

  // Une pagos al caché por id (sin duplicar)
  _mezclarPagos(lista) {
    const porId = new Map((this._cache['pagos'] || []).map(p => [p.id, p]));
    lista.forEach(p => porId.set(p.id, p));
    this._cache['pagos'] = [...porId.values()];
  },

  // Carga los pagos (completo 1 vez al día, si no desde lo guardado) y deja un listener EN VIVO
  // que solo trae pagos nuevos/editados: el admin ve al instante lo que cobra cada cobrador.
  // Clave de pagos guardados por modo (todo vs. cobrador X), para no mezclar conjuntos distintos
  _pagosKey() {
    return `${this._PAGOS_KEY}_${this._soloMios || 'todos'}`;
  },

  async _sincronizarPagos() {
    if (this._listeners['pagos']) return; // ya está en vivo
    const uid = this._soloMios;
    const campos = uid ? this._FILTROS_COBRADOR.pagos : [null];
    let guardado = null;
    try { guardado = JSON.parse(localStorage.getItem(this._pagosKey())); } catch (e) { }
    const ahora = Date.now();
    let completo, desde;
    try {
      if (guardado && Array.isArray(guardado.data) && ahora - guardado.completo < this._PAGOS_TTL) {
        this._mezclarPagos(guardado.data);
        completo = guardado.completo;
        desde = guardado.sync - this._PAGOS_MARGEN;
      } else {
        this._cache['pagos'] = uid
          ? this._unir(await Promise.all(campos.map(c => fbQuery('pagos', c, uid))))
          : await fbGetAll('pagos');
        console.log(`💰 Pagos cargados completos: ${this._cache['pagos'].length}`);
        completo = ahora;
        desde = ahora - this._PAGOS_MARGEN;
      }
    } catch (e) {
      console.error('Error cargando pagos:', e);
      if (guardado?.data) this._mezclarPagos(guardado.data);
      completo = 0; // forzar descarga completa la próxima vez
      desde = ahora - this._PAGOS_MARGEN;
    }

    // Un listener por filtro (admin: 1 sin filtro; cobrador: cartera + cobradorId).
    // Se espera la primera respuesta de todos (máx. 8 s para no trabar el arranque sin red).
    const unsubs = [];
    this._listeners['pagos'] = () => unsubs.forEach(u => typeof u === 'function' && u());
    let listos = 0;
    await new Promise(resolve => {
      let resuelto = false;
      const fin = () => { if (!resuelto) { resuelto = true; resolve(); } };
      const unoListo = () => { if (++listos >= campos.length) fin(); };

      campos.forEach(campo => {
        let primero = true;
        const alCambiar = (cambios, desdeCache) => {
          if (cambios.length) {
            this._mezclarPagos(cambios);
            this._cacheVersion++;
            console.log(`💰 Pagos en vivo${campo ? ` (${campo})` : ''}: ${cambios.length} cambios`);
          }
          if (!desdeCache) this._guardarPagosLocal(completo, Date.now());
          if (!primero && cambios.length) _renderSeguro();
          if (primero) { primero = false; unoListo(); }
        };
        unsubs.push(fbEscucharDesde('pagos', new Date(desde), alCambiar, (error) => {
          // Si falta el índice compuesto (recién desplegado), escuchar sin filtro de fecha
          if (campo && error?.code === 'failed-precondition') {
            unsubs.push(fbEscucharDonde('pagos', campo, uid, datos => alCambiar(datos, false)));
            return;
          }
          delete this._listeners['pagos']; // permitir reintentar al volver a la app
          if (primero) { primero = false; unoListo(); }
        }, campo, uid));
      });
      setTimeout(fin, 8000);
    });
  },

  _guardarPagosLocal(completo, sync) {
    const key = this._pagosKey();
    try {
      localStorage.setItem(key, JSON.stringify({ completo, sync, data: this._cache['pagos'] }));
    } catch (e) {
      // Sin espacio en el celular: la próxima vez se hará descarga completa
      try { localStorage.removeItem(key); } catch (_) { }
    }
  },

  _arrancarListeners(colecciones) {
    const uid = this._soloMios;
    colecciones.forEach(col => {
      if (this._listeners[col]) return;
      const alActualizar = () => {
        this._cacheVersion++;
        this._guardarCacheLocal();
        console.log(`🔄 ${col} actualizado en tiempo real`);
        _renderSeguro();
      };

      if (!uid) {
        this._listeners[col] = fbEscuchar(col, (datos) => {
          this._cache[col] = datos;
          alActualizar();
        });
        return;
      }

      // Cobrador: un listener por campo; el caché es la unión (se reemplaza entero en cada
      // actualización, así los borrados también se reflejan)
      const campos = this._FILTROS_COBRADOR[col] || ['cobradorId'];
      const partes = {};
      const unsubs = campos.map(campo => fbEscucharDonde(col, campo, uid, (datos) => {
        partes[campo] = datos;
        this._cache[col] = this._unir(Object.values(partes));
        alActualizar();
      }));
      this._listeners[col] = () => unsubs.forEach(u => typeof u === 'function' && u());
    });
  },

  _detenerListeners() {
    Object.values(this._listeners).forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this._listeners = {};
    console.log('⏸️ Listeners detenidos');
  },

  pausarListeners() {
    this._detenerListeners();
  },

 async reanudarListeners() {
  if (!firebase.auth().currentUser) return; // sin sesión las reglas rechazan la lectura
  if (Object.keys(this._listeners).length > 0) {
    console.log('⚠️ Listeners ya activos, no se rearrancan');
    return;
  }
  const dinamicas = ['movimientos_cartera', 'gastos', 'cajas', 'notas_cuadre', 'creditos', 'clientes'];
  this._arrancarListeners(dinamicas);
  console.log('▶️ Listeners reanudados');
},

  async ejecutarMantenimientoManual() {
    console.warn('⚠️ Ejecutando mantenimiento manual...');
    await this._corregirCreditosSaldados();
    await this._limpiarHuerfanos();
    alert('Mantenimiento completado satisfactoriamente.');
  },

  async _corregirCreditosSaldados() {
    const creditos = this._cache['creditos'] || [];
    const pagos = this._cache['pagos'] || [];
    for (const cr of creditos) {
      if (cr.activo && (!cr.fechaFin || cr.fechaFin === 'undefined')) {
        const nuevaFechaFin = sumarDiasHabiles(cr.fechaInicio, Number(cr.diasTotal || 0));
        await DB.update('creditos', cr.id, { fechaFin: nuevaFechaFin }).catch(e => console.error(e));
      }
      if (cr.activo === true) {
        const pagosCr = pagos.filter(p => p.creditoId === cr.id && !p.eliminado);
        const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
        if (totalPagado >= Number(cr.total || 0) && cr.total > 0) {
          await DB.update('creditos', cr.id, { activo: false }).catch(e => console.error(e));
        }
      }
    }
    if (typeof render === 'function') render();
  },

  async _limpiarHuerfanos() {
    const users = this._cache['users'] || [];
    const clientes = this._cache['clientes'] || [];
    const gastos = this._cache['gastos'] || [];
    const pagos = this._cache['pagos'] || [];
    const creditos = this._cache['creditos'] || [];

    if (clientes.length === 0 || users.length === 0) {
      console.warn('⚠️ _limpiarHuerfanos cancelado: cache incompleto, abortando para evitar borrados falsos.');
      return;
    }

    // NO se borra nada: solo se marca huerfano:true para revisarlo a mano.
    // Así, si un día la caché carga incompleta, no se pierden datos reales.
    const marcar = (col, lista, esHuerfano) => lista
      .filter(x => !x.huerfano && esHuerfano(x))
      .map(x => {
        console.warn(`⚠️ ${col} huérfano: ${x.id}`);
        return DB.update(col, x.id, { huerfano: true }).catch(e => console.error(e));
      });
    const tareas = [
      ...marcar('gastos', gastos, g => !users.find(u => u.id === g.cobradorId)),
      ...marcar('pagos', pagos, p => !clientes.find(c => c.id === p.clienteId)),
      ...marcar('creditos', creditos, cr => !clientes.find(c => c.id === cr.clienteId))
    ];
    await Promise.all(tareas);
    console.log(`🔎 Huérfanos marcados: ${tareas.length}`);
  }
};

if (!window._visibilityListenerAdded) {
  window._visibilityListenerAdded = true;
  // Pausar solo tras 5 min en segundo plano: reanudar vuelve a leer todas las colecciones,
  // y los cobradores cambian de app (WhatsApp, cámara) muchas veces al día.
  const PAUSA_MS = 5 * 60 * 1000;
  let _visTimer = null;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(_visTimer);
    if (document.visibilityState === 'hidden') {
      _visTimer = setTimeout(() => DB.pausarListeners(), PAUSA_MS);
    } else if (Object.keys(DB._listeners).length === 0 && firebase.auth().currentUser) {
      DB.reanudarListeners();
      DB._sincronizarPagos().then(() => _renderSeguro()); // traer pagos de otros celulares
    }
  });
}

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