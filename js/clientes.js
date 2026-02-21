function renderClientes() {
  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users = DB._cache['users'] || [];
  const isAdmin = state.currentUser.role === 'admin';
  let lista = isAdmin ? clientes : clientes.filter(c => c.cobradorId === state.currentUser.id);
  if (state.search) {
    const q = state.search.toLowerCase();
    lista = lista.filter(c => c.nombre.toLowerCase().includes(q) || c.dni.includes(q));
  }
  return `
  <div>
    <div class="topbar"><h2>Clientes</h2>
      <div class="topbar-user"><strong>${state.currentUser.nombre}</strong><span>${isAdmin ? 'Administrador' : 'Cobrador'}</span></div>
    </div>
    <div class="page">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input class="form-control" placeholder="Buscar por nombre o DNI..." value="${state.search}" oninput="updateSearch(this.value)">
      </div>
      ${lista.length === 0 ? `<div class="empty-state"><div class="icon">👤</div><p>No se encontraron clientes</p></div>` :
        lista.map(c => {
          const crs = creditos.filter(cr => cr.clienteId === c.id && cr.activo);
          const cob = users.find(u => u.id === c.cobradorId);
          return `
          <div class="client-item" onclick="selectClient('${c.id}')">
            <div class="client-avatar">${c.nombre.charAt(0)}</div>
            <div class="client-info">
              <div class="client-name">${c.nombre}</div>
              <div class="client-dni">DNI: ${c.dni}${isAdmin && cob ? ` · ${cob.nombre}` : ''}</div>
            </div>
            <span class="client-badge ${crs.length > 0 ? 'badge-active' : 'badge-done'}">${crs.length > 0 ? `${crs.length} activo${crs.length > 1 ? 's' : ''}` : 'Sin crédito'}</span>
          </div>`;
        }).join('')}
    </div>
    <button class="fab" onclick="openModal('nuevo-cliente')">+</button>
  </div>`;
}

function renderClientDetail() {
  const c = state.selectedClient;
  const creditos = (DB._cache['creditos'] || []).filter(cr => cr.clienteId === c.id);
  const users = DB._cache['users'] || [];
  const cobrador = users.find(u => u.id === c.cobradorId);
  const isAdmin = state.currentUser.role === 'admin';
  return `
  <div>
    <div style="background:linear-gradient(135deg,#1a56db,#0ea96d)">
      <div style="padding:16px 20px;display:flex;align-items:center;gap:12px">
        <button class="back-btn" style="color:white" onclick="backFromClient()">←</button>
        <h2 style="color:white;font-size:18px">Ficha del Cliente</h2>
        <button class="btn btn-sm" style="margin-left:auto;background:rgba(255,255,255,0.2);color:white;border:none" onclick="openModal('editar-cliente')">✏️ Editar</button>
      </div>
      <div style="padding:0 20px 24px">
        <div style="font-size:24px;font-weight:800;color:white">${c.nombre}</div>
        <div style="color:rgba(255,255,255,0.85);font-size:14px;margin-top:4px">DNI: ${c.dni}</div>
        ${cobrador ? `<div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px">Cobrador: ${cobrador.nombre}</div>` : ''}
      </div>
    </div>
    <div class="page">
      <div class="card">
        <div class="card-title">📋 Información</div>
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Teléfono</div><div class="info-value">${c.telefono || '—'}</div></div>
          <div class="info-item"><div class="info-label">Desde</div><div class="info-value">${formatDate(c.creado)}</div></div>
        </div>
        <div class="info-item" style="margin-bottom:10px"><div class="info-label">Dirección</div><div class="info-value" style="font-size:14px">${c.direccion || '—'}</div></div>
        ${c.ubicacion ? `<a href="${c.ubicacion}" target="_blank" style="display:flex;align-items:center;gap:6px;color:var(--primary);font-size:14px;font-weight:600;text-decoration:none;margin-bottom:8px">📍 Ver ubicación en mapa</a>` : ''}
        ${c.foto ? `<img src="${c.foto}" class="uploaded-img">` : ''}
      </div>
      <div class="flex-between mb-2">
        <div class="card-title" style="margin:0">💳 Créditos</div>
        <button class="btn btn-primary btn-sm" onclick="openModal('nuevo-credito')">+ Nuevo crédito</button>
      </div>
      ${creditos.length === 0 ? `<div class="empty-state"><div class="icon">💳</div><p>Sin créditos registrados</p></div>` : creditos.map(cr => renderCreditoCard(cr)).join('')}
    </div>
    <nav class="bottom-nav">
      <div class="nav-item" onclick="backFromClient()" style="flex:none;padding:0 24px;font-size:14px">← Volver a clientes</div>
    </nav>
  </div>`;
}

function selectClient(id) {
  state.selectedClient = (DB._cache['clientes'] || []).find(x => x.id === id);
  render();
}

function backFromClient() {
  state.selectedClient = null;
  render();
}

function updateSearch(v) {
  state.search = v;
  render();
}

async function guardarCliente() {
  const dni = document.getElementById('nDNI').value.trim();
  const nombre = document.getElementById('nNombre').value.trim();
  if (!dni || !nombre) { alert('DNI y nombre son obligatorios'); return; }
  const clientes = DB._cache['clientes'] || [];
  if (clientes.find(c => c.dni === dni)) { alert('Ya existe un cliente con ese DNI'); return; }
  const isAdmin = state.currentUser.role === 'admin';
  const cobradorId = isAdmin ? document.getElementById('nCobrador').value : state.currentUser.id;
  const fotoEl = document.getElementById('previewNFoto');
  const foto = fotoEl.style.display !== 'none' ? fotoEl.src : '';
  const id = genId();
  await DB.set('clientes', id, {
    id, dni, nombre,
    telefono: document.getElementById('nTelefono').value.trim(),
    direccion: document.getElementById('nDireccion').value.trim(),
    ubicacion: document.getElementById('nUbicacion').value.trim(),
    cobradorId, foto, creado: today()
  });
  state.modal = null;
  showToast('Cliente guardado exitosamente');
}

async function actualizarCliente() {
  const c = state.selectedClient;
  const fotoEl = document.getElementById('previewEFoto');
  const foto = fotoEl && fotoEl.style.display !== 'none' ? fotoEl.src : c.foto;
  const updated = {
    ...c,
    dni: document.getElementById('eDNI').value.trim(),
    nombre: document.getElementById('eNombre').value.trim(),
    telefono: document.getElementById('eTelefono').value.trim(),
    direccion: document.getElementById('eDireccion').value.trim(),
    ubicacion: document.getElementById('eUbicacion').value.trim(),
    cobradorId: document.getElementById('eCobrador').value,
    foto
  };
  await DB.set('clientes', c.id, updated);
  state.selectedClient = updated;
  state.modal = null;
  showToast('Cliente actualizado');
}

async function eliminarCliente() {
  if (!confirm('¿Eliminar este cliente? Se borrarán también sus créditos y pagos.')) return;
  const c = state.selectedClient;
  await DB.delete('clientes', c.id);
  const creditos = DB._cache['creditos'] || [];
  for (const cr of creditos.filter(x => x.clienteId === c.id)) {
    await DB.delete('creditos', cr.id);
  }
  const pagos = DB._cache['pagos'] || [];
  for (const p of pagos.filter(x => x.clienteId === c.id)) {
    await DB.delete('pagos', p.id);
  }
  state.selectedClient = null;
  state.modal = null;
  showToast('Cliente eliminado');
}