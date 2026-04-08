// ============================================================
// APP.JS — Render principal e inicialización
// ============================================================
window.abrirChatWhatsApp = function (telefono, nombre) {
  if (!telefono) return alert("El cliente no tiene teléfono");

  const numero = telefono.replace(/\D/g, '');
  const numeroFinal = numero.startsWith('51') ? numero : `51${numero}`;
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  const url = isMobile
    ? `whatsapp://send?phone=${numeroFinal}`
    : `https://wa.me/${numeroFinal}`;

  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank');
  }
};

// ── RENDER PRINCIPAL ─────────────────────────────────────────
window.render = function render() {
  const root = document.getElementById('root');

  if (!state.currentUser && state.screen !== 'login') {
    state.screen = 'login';
  }

  if (state.screen === 'login') { root.innerHTML = renderLogin(); bindLogin(); return; }

  if (state._cargando) {
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;
        height:100vh;flex-direction:column;gap:16px">
        <div style="font-size:36px">💰</div>
        <div style="font-size:15px;font-weight:700;color:#1e293b">Cargando CobrosApp...</div>
        <div style="width:40px;height:40px;border:4px solid #e2e8f0;
          border-top-color:#1a56db;border-radius:50%;
          animation:spin 0.8s linear infinite"></div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      </div>`;
    return;
  }

  const scrollAntes = window.scrollY; // ← NUEVO

  const isAdmin = state.currentUser.role === 'admin';
  root.innerHTML = `
  <div class="app">
    ${state.toast ? `
    <div style="position:fixed;top:16px;left:50%;transform:translateX(-50%);
      background:${state.toast.type === 'success' ? '#276749' : '#c53030'};
      color:white;padding:12px 20px;border-radius:10px;z-index:9999;
      font-weight:600;font-size:14px;max-width:300px;text-align:center;
      box-shadow:0 4px 12px rgba(0,0,0,0.2)">${state.toast.msg}</div>` : ''}
    ${state.modal ? renderModal() : ''}
    ${state.selectedClient ? renderClientDetail() :
      state.nav === 'clientes' ? renderClientes() :
        state.nav === 'cuadre' ? renderCuadre() :
          state.nav === 'admin' && isAdmin ? renderAdmin() :
            state.nav === 'historial' && isAdmin ? renderHistorial() : renderClientes()}
    ${!state.selectedClient ? `
    <nav class="bottom-nav">
      <div class="nav-item ${state.nav === 'clientes' ? 'active' : ''}" onclick="navigate('clientes')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Clientes</span>
      </div>

      <div class="nav-item ${state.nav === 'cuadre' ? 'active' : ''}" onclick="navigate('cuadre')">
  <div style="position:relative; display:inline-flex">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
    ${isAdmin && getDepositosPendientes().length > 0 ? `
      <span style="position:absolute; top:-4px; right:-6px;
                   background:#ef4444; color:white; font-size:9px; font-weight:800;
                   min-width:16px; height:16px; border-radius:8px;
                   display:flex; align-items:center; justify-content:center;
                   padding:0 3px; border:2px solid white">
        ${getDepositosPendientes().length}
      </span>` : ''}
  </div>
  <span>Cuadre</span>
</div>

      ${isAdmin ? `
      <div class="nav-item ${state.nav === 'admin' ? 'active' : ''}" onclick="navigate('admin')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L3 7v5c0 5 4 9.3 9 10.3C17 21.3 21 17 21 12V7z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <span>Admin</span>
      </div>

      <div class="nav-item ${state.nav === 'historial' ? 'active' : ''}" onclick="navigate('historial')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>Historial</span>
      </div>` : ''}

      <div class="nav-item" onclick="confirmarSalida()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Salir</span>
      </div>
    </nav>
    ` : ''}
  </div>`;

  window.scrollTo({ top: scrollAntes, behavior: 'instant' }); // ← NUEVO
};
// ── CONFIRMAR SALIDA (overlay custom) ────────────────────────
window.confirmarSalida = function () {
  if (document.querySelector('[data-overlay="salida"]')) return;

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
      <div style="font-size:52px;margin-bottom:16px">👋</div>
      <div style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:8px">¿Cerrar sesión?</div>
      <div style="font-size:13.5px;color:#64748b;margin-bottom:24px;line-height:1.5">
        Tu sesión quedará guardada para la próxima vez.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button onclick="this.closest('[data-overlay]').remove()"
          style="padding:13px;border-radius:12px;border:1.5px solid #e2e8f0;
          background:white;font-size:14px;font-weight:700;cursor:pointer;color:#64748b">
          Cancelar
        </button>
        <button onclick="this.closest('[data-overlay]').remove(); logout()"
          style="padding:13px;border-radius:12px;border:none;
          background:linear-gradient(135deg,#0f172a,#1a56db);
          color:white;font-size:14px;font-weight:700;cursor:pointer">
          Salir
        </button>
      </div>
    </div>`;

  overlay.setAttribute('data-overlay', 'salida');
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
};

// ── HISTORIAL ─────────────────────────────────────────────────
window.renderHistorial = function renderHistorial() {
  const usuarios = DB._cache['users'] || [];
  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const pagos = DB._cache['pagos'] || [];
  const gastos = DB._cache['gastos'] || [];
  const cobradores = usuarios.filter(u => u.role === 'cobrador');

  const filtroFecha = state._hFecha || today();
  const filtroCobradorId = state._hCobrador || 'todos';
  const filtroVista = state._hVista || 'pagos';
  const filtroBusqueda = state._hBusqueda || '';

  const pagosFiltrados = pagos.filter(p => {
    const matchFecha = p.fecha === filtroFecha;
    const matchCobrador = filtroCobradorId === 'todos' || p.cobradorId === filtroCobradorId;
    return matchFecha && matchCobrador;
  });

  const gastosFiltrados = gastos.filter(g => {
    const matchFecha = g.fecha === filtroFecha;
    const matchCobrador = filtroCobradorId === 'todos' || g.cobradorId === filtroCobradorId;
    return matchFecha && matchCobrador;
  });

  const creditosFiltrados = creditos.filter(cr => {
    const matchFecha = cr.fechaInicio === filtroFecha;
    let matchCobrador = true;
    if (filtroCobradorId !== 'todos') {
      const cliente = clientes.find(c => c.id === cr.clienteId);
      matchCobrador = cliente && cliente.cobradorId === filtroCobradorId;
    }
    return matchFecha && matchCobrador;
  });

  const totalPagos = pagosFiltrados.reduce((s, p) => s + p.monto, 0);
  const totalGastos = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);

  return `
  <div class="topbar">
    <h2>Historial</h2>
    <div style="display:flex; align-items:center; gap:8px;">
      <div class="topbar-user"><strong>Admin</strong></div>
      ${renderBtnAyudaAdmin()}
    </div>
  </div>
  <div class="page">

    <div style="position:relative; display:flex; align-items:center; margin-bottom:14px">
      <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
      <input
        style="width:100%; border:none; background:#ffffff; border-radius:20px;
               padding:9px 36px 9px 40px; font-size:13.5px; color:#2d3748;
               font-weight:500; outline:none; box-shadow:0 2px 8px rgba(0,0,0,0.08)"
        placeholder="Buscar cliente por nombre..."
        value="${filtroBusqueda}"
        oninput="state._hBusqueda=this.value; renderBusquedaClientes()">
      ${filtroBusqueda ? `
        <span onclick="state._hBusqueda=''; render()"
          style="position:absolute; right:14px; cursor:pointer; color:#a0aec0;
                 font-size:13px; font-weight:700; line-height:1">✕</span>` : ''}
    </div>
    <div id="busquedaResultados" style="margin-bottom:${filtroBusqueda ? '14px' : '0'}"></div>

    <div class="card" style="padding:14px; margin-bottom:14px">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px">
        <div>
          <div style="font-size:11px; color:var(--muted); font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px">Fecha</div>
          <input type="date" class="form-control" value="${filtroFecha}"
            onchange="state._hFecha=this.value; render()">
        </div>
        <div>
          <div style="font-size:11px; color:var(--muted); font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px">Cobrador</div>
          <select class="form-control" onchange="state._hCobrador=this.value; render()">
            <option value="todos" ${filtroCobradorId === 'todos' ? 'selected' : ''}>Todos</option>
            ${cobradores.map(u => `
              <option value="${u.id}" ${filtroCobradorId === u.id ? 'selected' : ''}>${u.nombre}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px">
        ${[['pagos', '💰 Pagos'], ['gastos', '💸 Gastos'], ['creditos', '📋 Créditos']].map(([v, l]) => `
          <button onclick="state._hVista='${v}'; render()"
            style="padding:9px 4px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;
                   border:2px solid ${filtroVista === v ? 'var(--primary)' : '#e2e8f0'};
                   background:${filtroVista === v ? '#eff6ff' : 'white'};
                   color:${filtroVista === v ? 'var(--primary)' : 'var(--muted)'}">
            ${l}
          </button>`).join('')}
      </div>
    </div>

    ${filtroVista === 'pagos' ? `
    <div class="card" style="padding:14px; border-left:4px solid var(--success)">
      <div class="flex-between" style="margin-bottom:12px">
        <div style="font-weight:700; font-size:14px">Pagos del ${formatDate(filtroFecha)}</div>
        <div style="font-weight:800; color:var(--success); font-size:16px">${formatMoney(totalPagos)}</div>
      </div>
      <div style="border-top:1px solid var(--border); margin-bottom:8px"></div>
      ${pagosFiltrados.length === 0
        ? `<div style="text-align:center; color:var(--muted); font-size:13.5px; padding:20px 0">Sin pagos este día</div>`
        : pagosFiltrados.map(p => {
          const cl = clientes.find(c => c.id === p.clienteId);
          const cb = usuarios.find(u => u.id === p.cobradorId);
          return `
          <div style="padding:10px 0; border-bottom:1px solid var(--border); cursor:pointer"
            onclick="verHistorialCliente('${p.clienteId}')">
            <div class="flex-between">
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text)">${cl?.nombre || '—'}</div>
                <div style="font-size:11.5px; color:var(--muted); margin-top:2px">${cb?.nombre || '—'} · ${p.tipo}</div>
              </div>
              <div style="font-weight:800; color:var(--success); font-size:14px">${formatMoney(p.monto)}</div>
            </div>
          </div>`;
        }).join('')}
    </div>` : ''}

    ${filtroVista === 'gastos' ? `
    <div class="card" style="padding:14px; border-left:4px solid var(--danger)">
      <div class="flex-between" style="margin-bottom:12px">
        <div style="font-weight:700; font-size:14px">Gastos del ${formatDate(filtroFecha)}</div>
        <div style="font-weight:800; color:var(--danger); font-size:16px">${formatMoney(totalGastos)}</div>
      </div>
      <div style="border-top:1px solid var(--border); margin-bottom:8px"></div>
      ${gastosFiltrados.length === 0
        ? `<div style="text-align:center; color:var(--muted); font-size:13.5px; padding:20px 0">Sin gastos este día</div>`
        : gastosFiltrados.map(g => {
          const cb = usuarios.find(u => u.id === g.cobradorId);
          return `
          <div style="padding:10px 0; border-bottom:1px solid var(--border)">
            <div class="flex-between">
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text)">${g.descripcion || 'Sin descripción'}</div>
                <div style="font-size:11.5px; color:var(--muted); margin-top:2px">${cb?.nombre || '—'}</div>
              </div>
              <div style="font-weight:800; color:var(--danger); font-size:14px">${formatMoney(g.monto)}</div>
            </div>
          </div>`;
        }).join('')}
    </div>` : ''}

    ${filtroVista === 'creditos' ? `
    <div class="card" style="padding:14px; border-left:4px solid var(--primary)">
      <div style="font-weight:700; font-size:14px; margin-bottom:12px">
        Créditos del ${formatDate(filtroFecha)}
        <span style="font-weight:400; color:var(--muted); font-size:12px; display:block; margin-top:2px">
          (${creditosFiltrados.length} préstamo${creditosFiltrados.length !== 1 ? 's' : ''} entregado${creditosFiltrados.length !== 1 ? 's' : ''})
        </span>
      </div>
      <div style="border-top:1px solid var(--border); margin-bottom:8px"></div>
      ${creditosFiltrados.length === 0
        ? `<div style="text-align:center; color:var(--muted); font-size:13.5px; padding:20px 0">Sin créditos</div>`
        : creditosFiltrados.map(cr => {
          const cl = clientes.find(c => c.id === cr.clienteId);
          const pagosCredito = pagos.filter(p => p.creditoId === cr.id && !p.eliminado);
          const totalPagado = pagosCredito.reduce((s, p) => s + p.monto, 0);
          const saldo = cr.total - totalPagado;
          const porcentaje = cr.total > 0 ? Math.min(100, Math.round((totalPagado / cr.total) * 100)) : 0;
          return `
          <div style="padding:12px 0; border-bottom:1px solid var(--border); cursor:pointer"
            onclick="verHistorialCliente('${cr.clienteId}')">
            <div class="flex-between" style="margin-bottom:6px">
              <div style="font-weight:700; font-size:14px; color:var(--text)">${cl?.nombre || '—'}</div>
              <span style="background:${cr.activo ? '#eff6ff' : '#f0fff4'};
                           color:${cr.activo ? 'var(--primary)' : '#276749'};
                           padding:3px 8px; border-radius:20px; font-size:11px; font-weight:700">
                ${cr.activo ? 'Activo' : '✓ Cerrado'}
              </span>
            </div>
            <div style="font-size:11.5px; color:var(--muted); margin-bottom:8px">
              Prestado: ${formatMoney(cr.monto)} · ${cr.diasTotal} días · Inicio: ${formatDate(cr.fechaInicio)}
            </div>
            <div style="background:var(--bg); border-radius:4px; height:5px; margin-bottom:8px;
                        border:1px solid var(--border); overflow:hidden">
              <div style="width:${porcentaje}%; background:${porcentaje === 100 ? '#22c55e' : 'var(--primary)'};
                          height:100%; border-radius:4px"></div>
            </div>
            <div class="flex-between">
              <div style="font-size:12px; color:var(--muted)">
                Pagado: <strong style="color:var(--success)">${formatMoney(totalPagado)}</strong>
              </div>
              <div style="font-size:12px; color:var(--muted)">
                Saldo: <strong style="color:${saldo > 0 ? 'var(--danger)' : '#276749'}">
                  ${saldo > 0 ? formatMoney(saldo) : '✓ Saldado'}
                </strong>
              </div>
              <div style="font-size:12px; color:var(--muted)">${porcentaje}%</div>
            </div>
          </div>`;
        }).join('')}
    </div>` : ''}

  </div>`;
};
window.verImagen = function (src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.9);
    z-index:99999; display:flex; align-items:center;
    justify-content:center; padding:20px; cursor:zoom-out`;
  overlay.innerHTML = `
    <img src="${src}" style="max-width:100%; max-height:100%;
      border-radius:10px; object-fit:contain">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
};
// ── BÚSQUEDA EN VIVO ──────────────────────────────────────────
window.renderBusquedaClientes = function renderBusquedaClientes() {
  const filtroBusqueda = state._hBusqueda || '';
  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const pagos = DB._cache['pagos'] || [];

  const contenedor = document.getElementById('busquedaResultados');
  if (!contenedor) return;

  if (filtroBusqueda.length < 1) { contenedor.innerHTML = ''; return; }

  const clientesBuscados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  if (clientesBuscados.length === 0) {
    contenedor.innerHTML = `<p style="text-align:center;color:var(--muted);font-size:13px;padding:8px">No se encontró ningún cliente</p>`;
    return;
  }

  contenedor.innerHTML = clientesBuscados.map(c => {
    const pagosCliente = pagos.filter(p => p.clienteId === c.id && !p.eliminado);
    const totalPagado = pagosCliente.reduce((s, p) => s + p.monto, 0);
    const creditoActivo = creditos.filter(cr => cr.clienteId === c.id).find(cr => cr.activo);
    const saldo = creditoActivo
      ? Math.max(0, creditoActivo.total - pagosCliente
        .filter(p => p.creditoId === creditoActivo.id && !p.eliminado)
        .reduce((s, p) => s + p.monto, 0))
      : 0;
    return `
    <div style="padding:12px;background:#f8fafc;border-radius:10px;margin-bottom:8px;cursor:pointer"
      onclick="verHistorialCliente('${c.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;font-size:15px">${c.nombre}</div>
          <div style="font-size:12px;color:var(--muted)">DNI: ${c.dni} · ${pagosCliente.length} pagos</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:800;color:var(--success);font-size:14px">${formatMoney(totalPagado)}</div>
          ${creditoActivo ? `<div style="font-size:11px;color:var(--danger)">Saldo: ${formatMoney(saldo)}</div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
};

// ── VER HISTORIAL DE CLIENTE ──────────────────────────────────
window.verHistorialCliente = function verHistorialCliente(clienteId) {
  state._hBusqueda = '';
  const c = (DB._cache['clientes'] || []).find(x => x.id === clienteId);
  if (!c) return;
  const creditos = (DB._cache['creditos'] || []).filter(cr => cr.clienteId === clienteId);
  const pagos = (DB._cache['pagos'] || []).filter(p => p.clienteId === clienteId && !p.eliminado);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const cobrador = (DB._cache['users'] || []).find(u => u.id === c.cobradorId);

  let texto = `📋 *HISTORIAL DE CLIENTE*\n`;
  texto += `👤 *${c.nombre}*\n`;
  texto += `DNI: ${c.dni}\n`;
  if (c.negocio) texto += `🏪 ${c.negocio}\n`;
  if (cobrador) texto += `Cobrador: ${cobrador.nombre}\n`;
  texto += `\n`;

  creditos.forEach(cr => {
    const pagosCr = pagos.filter(p => p.creditoId === cr.id && !p.eliminado);
    const pagadoCr = pagosCr.reduce((s, p) => s + p.monto, 0);
    const saldoCr = Math.max(0, cr.total - pagadoCr);
    texto += `💳 *Crédito ${formatDate(cr.fechaInicio)}*\n`;
    texto += `Prestado: S/${cr.monto} | Total: S/${cr.total}\n`;
    texto += `Pagado: S/${pagadoCr.toFixed(2)} | Saldo: S/${saldoCr.toFixed(2)}\n`;
    texto += `Estado: ${cr.activo ? 'Activo' : '✓ Cerrado'}\n`;
    texto += `\n📝 Pagos:\n`;
    pagosCr.slice().reverse().forEach(p => {
      texto += `  ${formatDate(p.fecha)} · ${p.tipo} · S/${p.monto}\n`;
    });
    texto += `\n`;
  });

  texto += `💰 *TOTAL PAGADO: S/${totalPagado.toFixed(2)}*`;

  state._historialCliente = { c, creditos, pagos, texto, cobrador };
  state.modal = 'historial-cliente';
  render();
};

// ── NAVEGACIÓN ────────────────────────────────────────────────
window.navigate = function navigate(nav) {
  state.nav = nav;
  state.selectedClient = null;
  state.selectedCobrador = null;
  state.filtroClientes = 'todos';
  history.pushState({ nav }, '', '#' + nav);
  render();
};

// ── BOTÓN ATRÁS DEL DISPOSITIVO ──────────────────────────────
window.addEventListener('popstate', () => {
  if (state.modal) {
    state.modal = null;
    state.selectedCredito = null;
    render();
    return;
  }
  if (state.selectedClient) {
    state.selectedClient = null;
    render();
    return;
  }
  if (state.selectedCobrador) {
    state.selectedCobrador = null;
    render();
    return;
  }
  history.pushState({ nav: state.nav }, '', '#' + state.nav);
});

// ── INIT ASYNC ────────────────────────────────────────────────
(async () => {
  try {
    // Restaurar sesión PRIMERO, antes de init
    try {
      const saved = localStorage.getItem('sessionUser');
      if (saved) {
        const savedUser = JSON.parse(saved);
        state.currentUser = savedUser;
        state.screen = 'main';
      }
    } catch (_) {
      localStorage.removeItem('sessionUser');
    }

    state._cargando = true;
    await DB.init();

    // Verificar que el usuario aún existe en DB
    if (state.currentUser) {
      const users = DB._cache['users'] || [];
      if (users.length > 0) {
        const userActual = users.find(u => u.id === state.currentUser.id);
        if (!userActual) {
          localStorage.removeItem('sessionUser');
          state.currentUser = null;
          state.screen = 'login';
        } else {
          state.currentUser = userActual; // datos frescos de DB
        }
      }
    }

    state._cargando = false;
    history.replaceState({ nav: 'clientes' }, '', '#clientes');
    render();
  } catch (e) {
    console.error('Error iniciando app:', e);
    state._cargando = false;
    document.getElementById('root').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;
        flex-direction:column;gap:12px;padding:20px;text-align:center">
        <div style="font-size:40px">⚠️</div>
        <div style="font-size:16px;color:#e53e3e;font-family:sans-serif">Error conectando con la base de datos</div>
        <div style="font-size:13px;color:#718096;font-family:sans-serif">${e.message}</div>
        <button onclick="location.reload()"
          style="margin-top:12px;padding:10px 20px;background:#1a56db;color:white;
          border:none;border-radius:10px;cursor:pointer;font-size:14px">Reintentar</button>
      </div>`;
  }
})();