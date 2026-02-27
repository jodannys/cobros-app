window.renderClientes = function () {
  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users = DB._cache['users'] || [];
  const pagos = DB._cache['pagos'] || [];
  const isAdmin = state.currentUser.role === 'admin';
  const filtro = state.filtroClientes || 'todos';

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
    { key: 'todos', label: 'Todos' },
    { key: 'activos', label: '✅ Activos' },
    { key: 'sin_credito', label: '🆕 Sin crédito' },
    { key: 'atrasados', label: '🔴 Atrasados' },
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

      <div style="position:relative; display:flex; align-items:center; margin-bottom:4px">
       <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
</span>
        <input id="search-clientes"
  style="
    width: 100%;
    border: none;
    background: #ffffff;
    border-radius: 20px;
    padding: 9px 36px 9px 40px;
    font-size: 13.5px;
    color: #2d3748;
    font-weight: 500;
    outline: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: background 0.2s;
  "
  placeholder="Buscar por nombre, DNI o negocio..."
  value="${state.search || ''}"
  oninput="updateSearch(this.value)">

        ${state.search ? `
          <span onclick="updateSearch(''); render()"
            style="position:absolute; right:14px; cursor:pointer; color:#a0aec0; font-size:13px; font-weight:700; line-height:1">
            ✕
          </span>` : ''}
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

window._renderClienteItem = function (c, creditos, users, pagos, isAdmin) {
  const crs = creditos.filter(cr => cr.clienteId === c.id);
  const creditoActivo = crs.find(cr => cr.activo);
  const cob = users.find(u => u.id === c.cobradorId);
  const atrasado = creditoActivo ? clienteEstaAtrasado(creditoActivo, pagos) : false;
  const numCuotaAtrasada = atrasado ? cuotaAtrasada(creditoActivo, pagos) : null;

  let badge, badgeStyle;
  if (atrasado) {
    badge = numCuotaAtrasada ? `⚠️ Atrasado ${numCuotaAtrasada}` : '⚠️ Atrasado';
    badgeStyle = 'background:#fff1f2; color:#9f1239;';
  } else if (creditoActivo) {
    badge = '● Activo';
    badgeStyle = 'background:#f0fdf4; color:#166534;';
  } else {
    badge = 'Sin crédito';
    badgeStyle = 'background:#f8fafc; color:#64748b;';
  }

  const tieneTelefono = c.telefono && c.telefono.trim() !== "";

  return `
  <div class="client-item" onclick="selectClient('${c.id}')"
    style="position:relative; background:white">

    <div class="client-avatar" style="flex-shrink:0; width:42px; height:42px; font-size:16px">
      ${c.nombre.charAt(0)}
    </div>

    <div class="client-info" style="flex:1; min-width:0">
      <div class="client-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
        ${c.nombre}
      </div>
      <div style="font-size:11.5px; color:var(--muted); display:flex; align-items:center; gap:4px; margin-top:2px">
        <span>DNI: ${c.dni}</span>
        
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-right:44px">

      <div style="width:36px; display:flex; justify-content:center">
        ${creditoActivo ? `
          <button onclick="event.stopPropagation(); pagoRapido('${creditoActivo.id}')"
            style="width:36px; height:36px; border-radius:8px; border:none;
                   background:#f0fdf4; color:#166534; font-size:18px; cursor:pointer;
                   display:flex; align-items:center; justify-content:center">
            💰
          </button>` : `
          <button onclick="event.stopPropagation(); nuevoCreditoRapido('${c.id}')"
            style="width:36px; height:36px; border-radius:8px; border:none;
                   background:#eff6ff; color:var(--primary); font-size:20px; cursor:pointer;
                   font-weight:700; display:flex; align-items:center; justify-content:center">
            +
          </button>`}
      </div>

      <div style="width:80px; display:flex; justify-content:center">
        <span style="font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;
                     white-space:nowrap; text-align:center; ${badgeStyle}">
          ${badge}
        </span>
      </div>

    </div>
    <div onclick="event.stopPropagation(); ${tieneTelefono ? `abrirChatWhatsApp('${c.telefono}', '${c.nombre}')` : `alert('Sin teléfono')`}"
         style="position:absolute; right:0; top:0; bottom:0; width:44px;
                display:flex; align-items:center; justify-content:center;
                cursor:pointer; border-left:1px solid #f1f5f9">
      <div style="width:28px; height:28px; border-radius:50%;
                  background:${tieneTelefono ? '#25d366' : '#e2e8f0'};
                  display:flex; align-items:center; justify-content:center;
                  box-shadow:0 1px 4px rgba(0,0,0,0.08)">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </div>
    </div>

  </div>`;
}
// ============================================================
// HELPERS DE ESTADO DE CUOTAS
// ============================================================
window.clienteEstaAtrasado = function (cr, pagos) {
  if (!cr || !cr.activo) return false;
  const totalPagado = pagos.filter(p => p.creditoId === cr.id).reduce((s, p) => s + Number(p.monto), 0);
  const saldo = cr.total - totalPagado;
  if (saldo <= 0) return false;
  const inicio = new Date(cr.fechaInicio + 'T00:00:00');
  const hoy = new Date(today() + 'T00:00:00');
  const diasTranscurridos = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
  if (diasTranscurridos <= 0) return false;
  const cuotasDebidas = Math.min(diasTranscurridos, cr.diasTotal);
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);
  return cuotasCubiertas < cuotasDebidas;
}

window.cuotaAtrasada = function (cr, pagos) {
  const totalPagado = pagos.filter(p => p.creditoId === cr.id).reduce((s, p) => s + Number(p.monto), 0);
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);
  return cuotasCubiertas + 1;
}

// ============================================================
// ESQUEMA VISUAL DE CUOTAS
// ============================================================
window.renderEsquemaCuotas = function (cr) {
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const cuotaDiaria = Number(cr.cuotaDiaria);
  const cuotasCubiertas = Math.floor(totalPagado / cuotaDiaria);

  // 1. Obtener "Hoy" basándonos en el string de tu DB (YYYY-MM-DD)
  const hoyStr = today(); // Ejemplo: "2026-02-26"
  const hoy = new Date(hoyStr + 'T00:00:00');

  // 2. Calcular "Mañana" sumando 1 día al objeto local
  const fechaManana = new Date(hoy);
  fechaManana.setDate(fechaManana.getDate() + 1);

  // 3. Extraer Año, Mes y Día MANUALMENTE (Esto ignora zonas horarias)
  const yyyy = fechaManana.getFullYear();
  const mm = String(fechaManana.getMonth() + 1).padStart(2, '0');
  const dd = String(fechaManana.getDate()).padStart(2, '0');

  const proximaFechaISO = `${yyyy}-${mm}-${dd}`; // Siempre será "2026-02-27"
  const fechaFormateada = formatDate(proximaFechaISO);

  // 4. Lógica de burbujas (Atraso)
  const inicio = new Date(cr.fechaInicio + 'T00:00:00');
  const diasTranscurridos = Math.max(0, Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24)));

  const cuotas = [];
  for (let i = 1; i <= cr.diasTotal; i++) {
    let estado;
    if (i <= cuotasCubiertas) estado = 'pagada';
    else if (i <= diasTranscurridos) estado = 'atrasada';
    else estado = 'pendiente';
    cuotas.push({ num: i, estado });
  }

  const pagadas = cuotas.filter(c => c.estado === 'pagada').length;
  const atrasadas = cuotas.filter(c => c.estado === 'atrasada').length;
  const pendientes = cuotas.filter(c => c.estado === 'pendiente').length;

  return `
  <div style="margin-top:14px">

    <div style="font-size:10.5px; font-weight:700; color:var(--muted); text-transform:uppercase;
                letter-spacing:0.6px; margin-bottom:10px">
      Esquema de Cuotas
    </div>

    <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap">
      <span style="font-size:10.5px; background:#f0fdf4; color:#166534;
                   padding:3px 10px; border-radius:6px; font-weight:700">
        ✅ ${pagadas} pagadas
      </span>
      ${atrasadas > 0 ? `
        <span style="font-size:10.5px; background:#fff1f2; color:#9f1239;
                     padding:3px 10px; border-radius:6px; font-weight:700">
          ⚠️ ${atrasadas} atrasadas
        </span>` : ''}
      <span style="font-size:10.5px; background:var(--bg); color:var(--muted);
                   padding:3px 10px; border-radius:6px; font-weight:700">
        🔘 ${pendientes} pendientes
      </span>
    </div>

    <div class="cuotas-grid" style="gap:5px">
      ${cuotas.map(c => `
        <div title="Cuota ${c.num}" class="cuota-burbuja cuota-${c.estado}">
          ${c.num}
        </div>`).join('')}
    </div>

  </div>`;
};

// ============================================================
// FILTROS Y BÚSQUEDA
// ============================================================
window.setFiltroClientes = function (f) {
  state.filtroClientes = f;

  // Mantenemos lo que el usuario ya escribió en el input
  const searchInput = document.getElementById('search-clientes');
  if (searchInput) {
    state.search = searchInput.value;
  }

  render(); // Renderiza todo con el nuevo filtro + el texto de búsqueda actual

  // Después del render, si había texto, devolvemos el foco al final
  const nuevoInput = document.getElementById('search-clientes');
  if (nuevoInput && state.search) {
    nuevoInput.focus();
    nuevoInput.setSelectionRange(state.search.length, state.search.length);
  }
}

window.updateSearch = function (v) {
  state.search = v;
  _renderListaClientes();
}

window._renderListaClientes = function () {
  const contenedor = document.getElementById('lista-clientes');
  const contador = document.getElementById('contador-clientes');
  if (!contenedor) { render(); return; }

  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users = DB._cache['users'] || [];
  const pagos = DB._cache['pagos'] || [];
  const isAdmin = state.currentUser.role === 'admin';
  const filtro = state.filtroClientes || 'todos';
  const hoy = today();

  let lista = isAdmin
    ? clientes
    : clientes.filter(c => c.cobradorId === state.currentUser.id);
  // --- FILTRO PARA OCULTAR PRÉSTAMOS DE HOY ---
  if (!isAdmin) {
    lista = lista.filter(c => {
      const crActivo = creditos.find(cr => cr.clienteId === c.id && cr.activo);
      // SI EL CRÉDITO ES DE HOY, NO LO MUESTRES EN LA RUTA
      if (crActivo && crActivo.fechaInicio === today()) return false;
      return true;
    });
  }

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
window.renderClientDetail = function () {
  const c = state.selectedClient;
  const todosLosCreditos = (DB._cache['creditos'] || []).filter(cr => cr.clienteId === c.id);
  const creditoActivo = todosLosCreditos.find(cr => cr.activo);
  const users = DB._cache['users'] || [];
  const cobrador = users.find(u => u.id === c.cobradorId);
  const isAdmin = state.currentUser.role === 'admin';

  return `
  <div>
    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#1a56db,#0ea96d); padding-bottom:16px;">
      <div style="padding:14px 20px; display:flex; align-items:center; gap:12px">
        <button class="back-btn" style="color:rgba(255,255,255,0.8); font-size:20px" onclick="backFromClient()">←</button>
        <h2 style="color:white; font-size:16px; font-weight:600; flex:1; margin:0; letter-spacing:-0.2px; opacity:0.9">Ficha del Cliente</h2>
        <button
          style="background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.2);
                 font-size:12px; font-weight:600; padding:6px 12px; border-radius:8px; cursor:pointer;
                 backdrop-filter:blur(4px)"
          onclick="openModal('editar-cliente')">Editar</button>
      </div>
      <div style="padding:0 20px">
        <div style="font-size:20px; font-weight:800; color:white; letter-spacing:-0.5px; line-height:1.2">
          ${c.nombre}
        </div>
        ${c.negocio ? `
          <div style="color:rgba(255,255,255,0.75); font-size:12.5px; margin-top:3px">
            🏪 ${c.negocio}
          </div>` : ''}
        <div style="color:rgba(255,255,255,0.5); font-size:11.5px; margin-top:3px">
          DNI: ${c.dni}
        </div>
      </div>
    </div>

    <!-- CONTENIDO -->
    <div class="page" style="padding-top:12px">

      <!-- DATOS GENERALES -->
      <div class="card">
        <div class="card-title">📋 Datos Generales</div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Teléfono</div>
            <div class="info-value" style="color:var(--primary); font-size:14px; font-weight:600">${c.telefono || '—'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Registro</div>
            <div class="info-value" style="font-size:14px">${formatDate(c.creado)}</div>
          </div>
        </div>

        <div class="info-item" style="margin-top:8px">
          <div class="info-label">Dirección</div>
          <div class="info-value" style="font-size:14px; font-weight:500; line-height:1.4">${c.direccion || '—'}</div>
        </div>

        ${c.lat ? renderMapaCliente(c.lat, c.lng, c.nombre) : ''}
        ${c.foto ? `<img src="${c.foto}" class="uploaded-img" style="margin-top:10px">` : ''}
      </div>

      <!-- BOTÓN WHATSAPP -->
      ${todosLosCreditos.length > 0 ? `
        <button onclick="enviarEstadoWhatsApp('${c.id}')"
          style="width:100%; padding:13px; background:white; border:1px solid var(--border);
                 border-radius:10px; font-size:13.5px; font-weight:600; cursor:pointer;
                 margin-bottom:14px; display:flex; align-items:center;
                 justify-content:center; gap:10px; color:#25d366; box-shadow:var(--shadow)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>Enviar estado de cuenta</span>
        </button>` : ''}

      <!-- SECCIÓN CRÉDITOS -->
      <div class="flex-between mb-2">
        <div class="card-title" style="margin:0">💳 Créditos</div>
        ${!creditoActivo
          ? `<button class="btn btn-primary btn-sm" onclick="openModal('nuevo-credito')">+ Nuevo crédito</button>`
          : `<span style="font-size:11.5px; color:var(--muted); font-style:italic">Crédito activo en curso</span>`}
      </div>

      ${todosLosCreditos.length === 0
        ? `<div class="empty-state"><div class="icon">💳</div><p>Sin créditos registrados</p></div>`
        : todosLosCreditos
            .sort((a, b) => (b.activo ? 1 : 0) - (a.activo ? 1 : 0))
            .map(cr => renderCreditoCard(cr)).join('')}

    </div>

    <nav class="bottom-nav">
  <div class="nav-item" onclick="backFromClient()"
    style="width:100%; text-align:center; font-size:13.5px; font-weight:600;
           display:flex; align-items:center; justify-content:center; gap:8px;
           color:var(--text); padding:10px 0">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
    Volver
  </div>
</nav>
  </div>`;
}
// ============================================================
// ENVIAR ESTADO POR WHATSAPP
// ============================================================
window.enviarEstadoWhatsApp = function (clienteId) {
  const c = (DB._cache['clientes'] || []).find(x => x.id === clienteId);
  if (!c) return;

  // Filtrar solo el crédito activo
  const creditosActivos = (DB._cache['creditos'] || []).filter(cr => cr.clienteId === c.id && cr.activo);

  if (creditosActivos.length === 0) {
    alert("📲 El cliente no tiene créditos activos para enviar.");
    return;
  }

  const cr = creditosActivos[creditosActivos.length - 1];
  const pagosCr = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagadoCr = pagosCr.reduce((s, p) => s + p.monto, 0);
  const saldoCapital = Math.max(0, cr.total - totalPagadoCr);

  // Lógica de Mora
  const infoMora = obtenerDatosMora(cr);
  const montoMora = infoMora.total;
  const totalCobrar = saldoCapital + montoMora;

  // 1. Confirmar o editar número
  const numeroRegistrado = c.telefono ? c.telefono.replace(/\D/g, '') : '';
  const numeroInput = prompt(
    `📲 Enviar historial a ${c.nombre}:\n(Confirma o edita el número)`,
    numeroRegistrado
  );

  if (numeroInput === null) return;
  const numero = numeroInput.replace(/\D/g, '').trim();
  if (!numero) { alert('⚠️ Número inválido'); return; }

  // 2. Construcción del mensaje (Sin nombres externos)
  let texto = `*ESTADO DE CUENTA* 📋\n`;
  texto += `━━━━━━━━━━━━━━━━━━\n`;
  texto += `👤 *Cliente:* ${c.nombre}\n`;
  if (c.negocio) texto += `🏪 *Negocio:* ${c.negocio}\n`;
  texto += `📅 *Fecha de consulta:* ${today()}\n\n`;

  texto += `*DETALLE DEL CRÉDITO* 💳\n`;
  texto += `• Monto total: S/ ${cr.total.toFixed(2)}\n`;
  texto += `• Total pagado: S/ ${totalPagadoCr.toFixed(2)}\n`;
  texto += `• Saldo pendiente: S/ ${saldoCapital.toFixed(2)}\n`;

  if (montoMora > 0) {
    texto += `• Mora acumulada (${infoMora.dias} días): S/ ${montoMora.toFixed(2)} ⚠️\n`;
  }

  texto += `━━━━━━━━━━━━━━━━━━\n`;
  texto += `💰 *TOTAL A COBRAR: S/ ${totalCobrar.toFixed(2)}*\n`;
  texto += `━━━━━━━━━━━━━━━━━━\n\n`;

  // 3. HISTORIAL COMPLETO
  if (pagosCr.length > 0) {
    texto += `*HISTORIAL DE ABONOS:* 📝\n`;
    pagosCr.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach((p, index) => {
      texto += `${index + 1}. ${formatDate(p.fecha)} → S/ ${p.monto.toFixed(2)}\n`;
    });
  } else {
    texto += `_No se registran abonos a la fecha._\n`;
  }

  texto += `\n_Si tiene alguna duda sobre sus pagos, por favor contacte con su asesor._\n`;

  // 4. Envío
  const numeroFinal = numero.startsWith('51') ? numero : `51${numero}`;
  const url = /Android|iPhone|iPad/i.test(navigator.userAgent)
    ? `whatsapp://send?phone=${numeroFinal}&text=${encodeURIComponent(texto)}`
    : `https://wa.me/${numeroFinal}?text=${encodeURIComponent(texto)}`;

  window.location.href = url;
};

window.selectClient = function (id) {
  state.selectedClient = (DB._cache['clientes'] || []).find(x => x.id === id);
  render();
  const c = state.selectedClient;
  if (c?.lat && c?.lng) {
    iniciarMapaCliente(c.lat, c.lng, c.nombre);
  }
}

window.backFromClient = function () {
  state.selectedClient = null;
  state.search = "";
  render();
}

// ============================================================
// GUARDAR CLIENTE
// ============================================================
window.guardarCliente = async function () {
  try {
    const dni = document.getElementById('nDNI').value.trim();
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

    const isAdmin = state.currentUser.role === 'admin';
    const cobradorId = isAdmin ? document.getElementById('nCobrador').value : state.currentUser.id;

    const fotoEl = document.getElementById('previewNFoto');
    let foto = '';
    if (fotoEl && fotoEl.style.display !== 'none' && fotoEl.src && fotoEl.src !== window.location.href) {
      foto = await comprimirImagen(fotoEl.src, 600, 0.6);
    }

    const negocio = document.getElementById('nNegocio').value.trim();
    const telefono = document.getElementById('nTelefono').value.trim();
    const direccion = document.getElementById('nDireccion').value.trim();
    const id = genId();

    const nuevoCliente = {
      id, dni, nombre,
      negocio,
      telefono,
      direccion,
      lat: _coordsSeleccionadas?.lat || null,
      lng: _coordsSeleccionadas?.lng || null,
      cobradorId,
      foto,
      creado: today()
    };

    // Guardar en la base de datos
    await DB.set('clientes', id, nuevoCliente);

    _coordsSeleccionadas = null;
    showToast('Cliente guardado exitosamente');

    // LÓGICA DE REDIRECCIÓN
    if (state.abrirCreditoAlGuardar) {
      // Si el botón "+ Con crédito" estaba activo:
      state.selectedClient = nuevoCliente;
      state.modal = 'nuevo-credito';
      state.abrirCreditoAlGuardar = false; // Resetear para la próxima vez
    } else {
      // Si no, solo cerrar el modal
      state.modal = null;
    }

    render();

  } catch (err) {
    console.error('❌ Error en guardarCliente:', err);
    alert('Ocurrió un error al guardar el cliente.');
  }
}
// ============================================================
// ACTUALIZAR CLIENTE
// ============================================================
window.actualizarCliente = async function () {
  const c = state.selectedClient;
  const isAdmin = state.currentUser.role === 'admin';
  const cobradorEl = document.getElementById('eCobrador');

  const fotoEl = document.getElementById('previewEFoto');
  let foto = c.foto;
  if (fotoEl && fotoEl.style.display !== 'none' && fotoEl.src && fotoEl.src !== window.location.href) {
    if (fotoEl.src !== c.foto) {
      foto = await comprimirImagen(fotoEl.src, 600, 0.6);
    }
  }

  const updated = {
    ...c,
    dni: document.getElementById('eDNI').value.trim(),
    nombre: document.getElementById('eNombre').value.trim(),
    negocio: document.getElementById('eNegocio').value.trim(),
    telefono: document.getElementById('eTelefono').value.trim(),
    direccion: document.getElementById('eDireccion').value.trim(),
    lat: _coordsSeleccionadas?.lat ?? c.lat ?? null,
    lng: _coordsSeleccionadas?.lng ?? c.lng ?? null,
    cobradorId: isAdmin && cobradorEl ? cobradorEl.value : c.cobradorId,
    foto
  };

  await DB.set('clientes', c.id, updated);
  state.selectedClient = updated;
  state.modal = null;
  showToast('Cliente actualizado');
}

// ── EN clientes.js: reemplaza window.eliminarCliente ─────────
window.eliminarCliente = async function () {
  if (!confirm('¿Eliminar este cliente? Se borrarán también sus créditos y pagos. Esta acción no se puede deshacer.')) return;
  const c = state.selectedClient;
  await eliminarClienteCascade(c.id);   // 👈 usa cascade
  state.selectedClient = null;
  state.modal = null;
  showToast('Cliente eliminado');
  render();
};

// ── EN admin.js: reemplaza window.eliminarCobrador ───────────
window.eliminarCobrador = async function (id) {
  const users = DB._cache['users'] || [];
  const u = users.find(x => x.id === id);
  if (!u || u.role === 'admin') {
    alert('No se puede eliminar un administrador desde esta opción.');
    return;
  }
  if (!confirm('¿Eliminar este cobrador? Sus clientes quedarán sin cobrador asignado. Esta acción no se puede deshacer.')) return;
  await eliminarCobradorCascade(id);    // 👈 usa cascade
  state.selectedCobrador = null;
  state.modal = null;
  showToast('Cobrador eliminado');
  render();
};