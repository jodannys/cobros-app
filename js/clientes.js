// ============================================================
// RENDER LISTA DE CLIENTES
// ============================================================
function renderClientes() {
  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users    = DB._cache['users']    || [];
  const pagos    = DB._cache['pagos']    || [];
  const isAdmin  = state.currentUser.role === 'admin';
  const filtro   = state.filtroClientes || 'todos';

  let lista = isAdmin
    ? clientes
    : clientes.filter(c => c.cobradorId === state.currentUser.id);

  if (filtro === 'activos') {
    lista = lista.filter(c => creditos.some(cr => cr.clienteId === c.id && cr.activo));
  } else if (filtro === 'sin_credito') {
    lista = lista.filter(c => {
      const crs = creditos.filter(cr => cr.clienteId === c.id);
      return crs.length === 0 || !crs.some(cr => cr.activo);
    });
  } else if (filtro === 'atrasados') {
    lista = lista.filter(c => {
      const cr = creditos.find(cr => cr.clienteId === c.id && cr.activo);
      if (!cr) return false;
      return clienteEstaAtrasado(cr, pagos);
    });
  } else if (filtro === 'cerrados' && isAdmin) {
    lista = lista.filter(c => {
      const crs = creditos.filter(cr => cr.clienteId === c.id);
      return crs.length > 0 && !crs.some(cr => cr.activo) && crs.some(cr => !cr.activo);
    });
  }

  if (state.search) {
    const q = state.search.toLowerCase();
    lista = lista.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.dni.includes(q) ||
      (c.negocio || '').toLowerCase().includes(q)
    );
  }

  const filtros = [
    { key: 'todos',       label: 'Todos' },
    { key: 'activos',     label: '✅ Activos' },
    { key: 'sin_credito', label: '🆕 Sin crédito' },
    { key: 'atrasados',   label: '🔴 Atrasados' },
    ...(isAdmin ? [{ key: 'cerrados', label: '🔒 Cerrados' }] : [])
  ];

  return `
  <div>
    <div class="topbar">
      <h2>Clientes</h2>
      <div class="topbar-user">
        <strong>${state.currentUser.nombre}</strong>
        <span>${isAdmin ? 'Administrador' : 'Cobrador'}</span>
      </div>
    </div>
    <div class="page">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input class="form-control" id="search-clientes" placeholder="Buscar por nombre, DNI o negocio..."
          value="${state.search}" oninput="updateSearch(this.value)">
      </div>

      <div class="filtros-scroll">
        ${filtros.map(f => `
          <button onclick="setFiltroClientes('${f.key}')"
            class="filtro-btn ${filtro === f.key ? 'active' : ''}">
            ${f.label}
          </button>`).join('')}
      </div>

      <div id="contador-clientes" style="font-size:12px;color:var(--muted);margin-bottom:8px">${lista.length} cliente${lista.length !== 1 ? 's' : ''}</div>

      <div id="lista-clientes">
        ${lista.length === 0
          ? `<div class="empty-state"><div class="icon">👤</div><p>No se encontraron clientes</p></div>`
          : lista.map(c => _renderClienteItem(c, creditos, users, pagos, isAdmin)).join('')}
      </div>
    </div>
    <button class="fab" onclick="openModal('nuevo-cliente')">+</button>
  </div>`;
}

// Helper para renderizar una fila de cliente (evita duplicar código)
function _renderClienteItem(c, creditos, users, pagos, isAdmin) {
  const crs           = creditos.filter(cr => cr.clienteId === c.id);
  const creditoActivo = crs.find(cr => cr.activo);
  const cob           = users.find(u => u.id === c.cobradorId);
  const atrasado      = creditoActivo ? clienteEstaAtrasado(creditoActivo, pagos) : false;
  const numCuotaAtrasada = atrasado ? cuotaAtrasada(creditoActivo, pagos) : null;

  let badge, badgeStyle;
  if (atrasado) {
    badge = numCuotaAtrasada ? `⚠️ Atrasado cuota ${numCuotaAtrasada}` : '⚠️ Atrasado';
    badgeStyle = 'background:#fff5f5;color:var(--danger);border:1px solid #fed7d7';
  } else if (creditoActivo) {
    badge = '● Activo';
    badgeStyle = 'background:#f0fff4;color:#276749;border:1px solid #c6f6d5';
  } else if (crs.length > 0) {
    badge = '🔒 Cerrado';
    badgeStyle = 'background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0';
  } else {
    badge = 'Sin crédito';
    badgeStyle = 'background:#fffbeb;color:#b7791f;border:1px solid #fde68a';
  }

  return `
  <div class="client-item" onclick="selectClient('${c.id}')">
    <div class="client-avatar">${c.nombre.charAt(0)}</div>
    <div class="client-info" style="flex:1">
      <div class="client-name">${c.nombre}</div>
      <div class="client-dni" style="font-size:12px;color:var(--muted)">
        DNI: ${c.dni}${c.negocio ? ` · 🏪 ${c.negocio}` : ''}${isAdmin && cob ? ` · ${cob.nombre}` : ''}
      </div>
    </div>
    <span style="font-size:11px;font-weight:700;padding:4px 8px;border-radius:20px;white-space:nowrap;${badgeStyle}">${badge}</span>
  </div>`;
}

// ============================================================
// HELPERS DE ESTADO DE CUOTAS
// ============================================================
function clienteEstaAtrasado(cr, pagos) {
  if (!cr || !cr.activo) return false;
  const totalPagado = pagos.filter(p => p.creditoId === cr.id).reduce((s, p) => s + Number(p.monto), 0);
  const saldo = cr.total - totalPagado;
  if (saldo <= 0) return false;
  const inicio = new Date(cr.fechaInicio + 'T00:00:00');
  const hoy    = new Date(today() + 'T00:00:00');
  const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
  if (diasTranscurridos <= 0) return false;
  const cuotasDebidas   = Math.min(diasTranscurridos, cr.diasTotal);
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);
  return cuotasCubiertas < cuotasDebidas;
}

function cuotaAtrasada(cr, pagos) {
  const totalPagado     = pagos.filter(p => p.creditoId === cr.id).reduce((s, p) => s + Number(p.monto), 0);
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);
  return cuotasCubiertas + 1;
}

// ============================================================
// ESQUEMA VISUAL DE CUOTAS
// ============================================================
function renderEsquemaCuotas(cr) {
  const pagos           = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado     = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);

  const inicio = new Date(cr.fechaInicio + 'T00:00:00');
  const hoy    = new Date(today() + 'T00:00:00');
  const diasTranscurridos = Math.max(0, Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24)));

  const cuotas = [];
  for (let i = 1; i <= cr.diasTotal; i++) {
    let estado;
    if (i <= cuotasCubiertas)    estado = 'pagada';
    else if (i <= diasTranscurridos) estado = 'atrasada';
    else                          estado = 'pendiente';
    cuotas.push({ num: i, estado });
  }

  const pagadas    = cuotas.filter(c => c.estado === 'pagada').length;
  const atrasadas  = cuotas.filter(c => c.estado === 'atrasada').length;
  const pendientes = cuotas.filter(c => c.estado === 'pendiente').length;

  return `
  <div style="margin-top:14px">
    <div style="font-size:14px;font-weight:700;color:var(--muted);margin-bottom:10px;text-transform:uppercase">
      📊 Esquema de Cuotas
    </div>
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;justify-content:center">
      <span style="font-size:11px;background:#dcfce7;color:#166534;padding:3px 8px;border-radius:20px;font-weight:700">✅ ${pagadas} pagadas</span>
      ${atrasadas > 0 ? `<span style="font-size:11px;background:#fee2e2;color:#991b1b;padding:3px 8px;border-radius:20px;font-weight:700">⚠️ ${atrasadas} atrasadas</span>` : ''}
      <span style="font-size:11px;background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:20px;font-weight:700">🔘 ${pendientes} pendientes</span>
    </div>
<div class="cuotas-grid" style="gap:6px">
      ${cuotas.map(c => `
        <div title="Cuota ${c.num}" class="cuota-burbuja cuota-${c.estado}">
          ${c.num}
        </div>`).join('')}
    </div>
  </div>`;
}

// ============================================================
// FILTROS Y BÚSQUEDA
// ============================================================
function setFiltroClientes(f) {
  state.filtroClientes = f;
  const searchVal = document.getElementById('search-clientes')?.value || state.search;
  render();
  const inp = document.getElementById('search-clientes');
  if (inp && searchVal) {
    inp.value = searchVal;
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function updateSearch(v) {
  state.search = v;
  _renderListaClientes();
}

function _renderListaClientes() {
  const contenedor = document.getElementById('lista-clientes');
  const contador   = document.getElementById('contador-clientes');
  if (!contenedor) { render(); return; }

  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users    = DB._cache['users']    || [];
  const pagos    = DB._cache['pagos']    || [];
  const isAdmin  = state.currentUser.role === 'admin';
  const filtro   = state.filtroClientes || 'todos';

  let lista = isAdmin
    ? clientes
    : clientes.filter(c => c.cobradorId === state.currentUser.id);

  if (filtro === 'activos') {
    lista = lista.filter(c => creditos.some(cr => cr.clienteId === c.id && cr.activo));
  } else if (filtro === 'sin_credito') {
    lista = lista.filter(c => {
      const crs = creditos.filter(cr => cr.clienteId === c.id);
      return crs.length === 0 || !crs.some(cr => cr.activo);
    });
  } else if (filtro === 'atrasados') {
    lista = lista.filter(c => {
      const cr = creditos.find(cr => cr.clienteId === c.id && cr.activo);
      if (!cr) return false;
      return clienteEstaAtrasado(cr, pagos);
    });
  } else if (filtro === 'cerrados' && isAdmin) {
    lista = lista.filter(c => {
      const crs = creditos.filter(cr => cr.clienteId === c.id);
      return crs.length > 0 && !crs.some(cr => cr.activo) && crs.some(cr => !cr.activo);
    });
  }

  if (state.search) {
    const q = state.search.toLowerCase();
    lista = lista.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.dni.includes(q) ||
      (c.negocio || '').toLowerCase().includes(q)
    );
  }

  if (contador) contador.textContent = `${lista.length} cliente${lista.length !== 1 ? 's' : ''}`;

  contenedor.innerHTML = lista.length === 0
    ? '<div class="empty-state"><div class="icon">👤</div><p>No se encontraron clientes</p></div>'
    : lista.map(c => _renderClienteItem(c, creditos, users, pagos, isAdmin)).join('');
}

// ============================================================
// DETALLE DE CLIENTE
// ============================================================
function renderClientDetail() {
  const c = state.selectedClient;
  const todosLosCreditos = (DB._cache['creditos'] || []).filter(cr => cr.clienteId === c.id);
  const creditoActivo    = todosLosCreditos.find(cr => cr.activo);
  const users    = DB._cache['users'] || [];
  const cobrador = users.find(u => u.id === c.cobradorId);
  const isAdmin  = state.currentUser.role === 'admin';

  return `
  <div>
    <div style="background:linear-gradient(135deg,#1a56db,#0ea96d)">
      <div style="padding:16px 20px;display:flex;align-items:center;gap:12px">
        <button class="back-btn" style="color:white" onclick="backFromClient()">←</button>
        <h2 style="color:white;font-size:18px;flex:1">Ficha del Cliente</h2>
        <button class="btn btn-sm"
          style="background:rgba(255,255,255,0.2);color:white;border:none"
          onclick="openModal('editar-cliente')">✏️ Editar</button>
      </div>
      <div style="padding:0 20px 24px">
        <div style="font-size:24px;font-weight:800;color:white">${c.nombre}</div>
        ${c.negocio ? `<div style="color:rgba(255,255,255,0.9);font-size:14px;margin-top:2px">🏪 ${c.negocio}</div>` : ''}
        <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px">DNI: ${c.dni}</div>
        ${cobrador ? `<div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px">Cobrador: ${cobrador.nombre}</div>` : ''}
      </div>
    </div>

    <div class="page">
      <div class="card" style="margin-bottom:14px">
        <div class="card-title">📋 Información</div>
        <div class="info-grid" style="margin-bottom:8px">
          <div class="info-item">
            <div class="info-label">Teléfono</div>
            <div class="info-value">${c.telefono || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Cliente desde</div>
            <div class="info-value">${formatDate(c.creado)}</div>
          </div>
        </div>
        <div class="info-item" style="margin-bottom:10px">
          <div class="info-label">Dirección</div>
          <div class="info-value" style="font-size:14px">${c.direccion || '—'}</div>
        </div>
        ${c.lat ? renderMapaCliente(c.lat, c.lng, c.nombre) : ''}
        ${c.foto ? `<img src="${c.foto}" class="uploaded-img">` : ''}
      </div>

      <div class="flex-between mb-2">
        <div class="card-title" style="margin:0">💳 Créditos</div>
        ${!creditoActivo
          ? `<button class="btn btn-primary btn-sm" onclick="openModal('nuevo-credito')">+ Nuevo crédito</button>`
          : `<span style="font-size:12px;color:var(--muted);font-style:italic">Crédito activo en curso</span>`}
      </div>

      ${todosLosCreditos.length === 0
        ? `<div class="empty-state"><div class="icon">💳</div><p>Sin créditos registrados</p></div>`
        : todosLosCreditos
            .sort((a, b) => (b.activo ? 1 : 0) - (a.activo ? 1 : 0))
            .map(cr => renderCreditoCard(cr)).join('')}
    </div>

    <nav class="bottom-nav">
<div class="nav-item" onclick="backFromClient()"
  style="width:100%;text-align:center;font-size:14px;font-weight:600">← Volver</div>
    </nav>
  </div>`;
}

function selectClient(id) {
  state.selectedClient = (DB._cache['clientes'] || []).find(x => x.id === id);
  render();
  const c = state.selectedClient;
  if (c?.lat && c?.lng) {
    iniciarMapaCliente(c.lat, c.lng, c.nombre);
  }
}

function backFromClient() {
  state.selectedClient = null;
  render();
}

// ============================================================
// GUARDAR CLIENTE ✅ CON COMPRESIÓN DE IMAGEN
// ============================================================
async function guardarCliente() {
  try {
    console.log('💡 Iniciando guardarCliente');

    const dni    = document.getElementById('nDNI').value.trim();
    const nombre = document.getElementById('nNombre').value.trim();

    if (!dni || !nombre) {
      alert('DNI y nombre son obligatorios');
      return;
    }

    const clientes = DB._cache['clientes'] || [];
    if (clientes.find(c => c.dni === dni)) {
      alert('Ya existe un cliente con ese DNI');
      return;
    }

    const isAdmin    = state.currentUser.role === 'admin';
    const cobradorId = isAdmin ? document.getElementById('nCobrador').value : state.currentUser.id;

    // ✅ CORRECCIÓN: comprimir imagen antes de guardar para evitar error en móvil
    const fotoEl = document.getElementById('previewNFoto');
    let foto = '';
    if (fotoEl && fotoEl.style.display !== 'none' && fotoEl.src && fotoEl.src !== window.location.href) {
      console.log('📌 Comprimiendo imagen...');
      foto = await comprimirImagen(fotoEl.src, 600, 0.6);
      console.log('✅ Imagen comprimida. Tamaño aprox:', Math.round(foto.length / 1024), 'KB');
    }

    const negocio   = document.getElementById('nNegocio').value.trim();
    const telefono  = document.getElementById('nTelefono').value.trim();
    const direccion = document.getElementById('nDireccion').value.trim();
    const id = genId();

    await DB.set('clientes', id, {
      id, dni, nombre,
      negocio,
      telefono,
      direccion,
      lat: _coordsSeleccionadas?.lat || null,
      lng: _coordsSeleccionadas?.lng || null,
      cobradorId,
      foto,
      creado: today()
    });

    console.log('✅ Cliente guardado correctamente');
    _coordsSeleccionadas = null;
    state.modal = null;
    showToast('Cliente guardado exitosamente');

  } catch (err) {
    console.error('❌ Error en guardarCliente:', err);
    alert('Ocurrió un error al guardar el cliente. Revisa la consola.');
  }
}

// ============================================================
// ACTUALIZAR CLIENTE ✅ CON COMPRESIÓN DE IMAGEN
// ============================================================
async function actualizarCliente() {
  const c          = state.selectedClient;
  const isAdmin    = state.currentUser.role === 'admin';
  const cobradorEl = document.getElementById('eCobrador');

  // ✅ CORRECCIÓN: comprimir imagen solo si cambió
  const fotoEl = document.getElementById('previewEFoto');
  let foto = c.foto; // mantener foto anterior por defecto
  if (fotoEl && fotoEl.style.display !== 'none' && fotoEl.src && fotoEl.src !== window.location.href) {
    if (fotoEl.src !== c.foto) {
      console.log('📌 Comprimiendo imagen actualizada...');
      foto = await comprimirImagen(fotoEl.src, 600, 0.6);
      console.log('✅ Imagen comprimida. Tamaño aprox:', Math.round(foto.length / 1024), 'KB');
    }
  }

  const updated = {
    ...c,
    dni:        document.getElementById('eDNI').value.trim(),
    nombre:     document.getElementById('eNombre').value.trim(),
    negocio:    document.getElementById('eNegocio').value.trim(),
    telefono:   document.getElementById('eTelefono').value.trim(),
    direccion:  document.getElementById('eDireccion').value.trim(),
    lat:        _coordsSeleccionadas?.lat ?? c.lat ?? null,
    lng:        _coordsSeleccionadas?.lng ?? c.lng ?? null,
    cobradorId: isAdmin && cobradorEl ? cobradorEl.value : c.cobradorId,
    foto
  };

  await DB.set('clientes', c.id, updated);
  state.selectedClient = updated;
  state.modal = null;
  showToast('Cliente actualizado');
}

// ============================================================
// ELIMINAR CLIENTE
// ============================================================
async function eliminarCliente() {
  if (!confirm('¿Eliminar este cliente? Se borrarán también sus créditos y pagos. Esta acción no se puede deshacer.')) return;
  const c = state.selectedClient;

  await DB.delete('clientes', c.id);
  DB._cache['clientes'] = (DB._cache['clientes'] || []).filter(x => x.id !== c.id);

  const creditos = DB._cache['creditos'] || [];
  for (const cr of creditos.filter(x => x.clienteId === c.id)) {
    await DB.delete('creditos', cr.id);
  }
  DB._cache['creditos'] = (DB._cache['creditos'] || []).filter(x => x.clienteId !== c.id);

  const pagos = DB._cache['pagos'] || [];
  for (const p of pagos.filter(x => x.clienteId === c.id)) {
    await DB.delete('pagos', p.id);
  }
  DB._cache['pagos'] = (DB._cache['pagos'] || []).filter(x => x.clienteId !== c.id);

  state.selectedClient = null;
  state.modal = null;
  showToast('Cliente eliminado');
  render();
}