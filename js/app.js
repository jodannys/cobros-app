function render() {
  const root = document.getElementById('root');
  if (state.screen === 'login') { root.innerHTML = renderLogin(); bindLogin(); return; }

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
      state.nav === 'clientes'            ? renderClientes() :
      state.nav === 'cuadre'              ? renderCuadre()   :
state.nav === 'admin' && isAdmin      ? renderAdmin()    :
state.nav === 'historial' && isAdmin  ? renderHistorial(): renderClientes()}
    ${!state.selectedClient ? `
    <nav class="bottom-nav">
      <div class="nav-item ${state.nav === 'clientes' ? 'active' : ''}" onclick="navigate('clientes')">
        <span class="nav-icon">👥</span><span>Clientes</span>
      </div>
      <div class="nav-item ${state.nav === 'cuadre' ? 'active' : ''}" onclick="navigate('cuadre')">
        <span class="nav-icon">📊</span><span>Cuadre</span>
      </div>
      ${isAdmin ? `
<div class="nav-item ${state.nav === 'admin' ? 'active' : ''}" onclick="navigate('admin')">
  <span class="nav-icon">🛡️</span><span>Admin</span>
</div>
<div class="nav-item ${state.nav === 'historial' ? 'active' : ''}" onclick="navigate('historial')">
  <span class="nav-icon">🔍</span><span>Historial</span>
</div>` : ''}
      <div class="nav-item" onclick="if(confirm('¿Desea salir?')) logout()">
        <span class="nav-icon">🚪</span><span>Salir</span>
      </div>
    </nav>` : ''}
  </div>`;
}
function renderHistorial() {
  const usuarios  = DB._cache['users']    || [];
  const clientes  = DB._cache['clientes'] || [];
  const creditos  = DB._cache['creditos'] || [];
  const pagos     = DB._cache['pagos']    || [];
  const gastos    = DB._cache['gastos']   || [];
  const cobradores = usuarios.filter(u => u.role === 'cobrador');

  const filtroFecha     = state._hFecha     || today();
  const filtroCobradorId = state._hCobrador || 'todos';
  const filtroVista     = state._hVista     || 'pagos';

  // ── Pagos del día filtrado ──
  const pagosFiltrados = pagos.filter(p => {
    const matchFecha    = p.fecha === filtroFecha;
    const matchCobrador = filtroCobradorId === 'todos' || p.cobradorId === filtroCobradorId;
    return matchFecha && matchCobrador;
  });

  // ── Gastos del día filtrado ──
  const gastosFiltrados = gastos.filter(g => {
    const matchFecha    = g.fecha === filtroFecha;
    const matchCobrador = filtroCobradorId === 'todos' || g.cobradorId === filtroCobradorId;
    return matchFecha && matchCobrador;
  });

  // ── Créditos (todos o filtrados por cobrador) ──
  const creditosFiltrados = creditos.filter(cr => {
    if (filtroCobradorId === 'todos') return true;
    const cliente = clientes.find(c => c.id === cr.clienteId);
    return cliente && cliente.cobradorId === filtroCobradorId;
  });

  const totalPagos  = pagosFiltrados.reduce((s, p) => s + p.monto, 0);
  const totalGastos = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);

  return `
  <div class="topbar">
    <h2>🔍 Historial</h2>
    <div class="topbar-user"><strong>Admin</strong></div>
  </div>
  <div class="page">

    <!-- FILTROS -->
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:4px">FECHA</div>
          <input type="date" class="form-control" value="${filtroFecha}"
            onchange="state._hFecha=this.value;render()">
        </div>
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:4px">COBRADOR</div>
          <select class="form-control" onchange="state._hCobrador=this.value;render()">
            <option value="todos" ${filtroCobradorId==='todos'?'selected':''}>Todos</option>
            ${cobradores.map(u => `
              <option value="${u.id}" ${filtroCobradorId===u.id?'selected':''}>${u.nombre}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- TABS DE VISTA -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
        ${[['pagos','💰 Pagos'],['gastos','💸 Gastos'],['cuadre','📊 Cuadre'],['creditos','📋 Créditos']].map(([v,l]) => `
          <button onclick="state._hVista='${v}';render()"
            style="padding:8px 4px;border-radius:8px;font-size:12px;font-weight:700;border:2px solid ${filtroVista===v?'var(--primary)':'#e2e8f0'};background:${filtroVista===v?'#eff6ff':'white'};color:${filtroVista===v?'var(--primary)':'var(--muted)'}">
            ${l}
          </button>`).join('')}
      </div>
    </div>

    <!-- VISTA: PAGOS -->
    ${filtroVista === 'pagos' ? `
    <div class="card" style="padding:14px">
      <div class="flex-between" style="margin-bottom:12px">
        <div style="font-weight:700">Pagos del ${formatDate(filtroFecha)}</div>
        <div style="font-weight:800;color:var(--success)"></div>
      </div>
      ${pagosFiltrados.length === 0
        ? `<p style="text-align:center;color:var(--muted);font-size:14px;padding:16px">Sin pagos este día</p>`
        : pagosFiltrados.map(p => {
            const cl = clientes.find(c => c.id === p.clienteId);
            const cb = usuarios.find(u => u.id === p.cobradorId);
            return `
            <div style="padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div class="flex-between">
                <div>
                  <div style="font-weight:700;font-size:14px">${cl?.nombre || '—'}</div>
                  <div style="font-size:12px;color:var(--muted)">${cb?.nombre || '—'} · ${p.tipo}</div>
                </div>
                <div style="font-weight:800;color:var(--success)">${formatMoney(p.monto)}</div>
              </div>
            </div>`;
          }).join('')}
    </div>` : ''}

    <!-- VISTA: GASTOS -->
    ${filtroVista === 'gastos' ? `
    <div class="card" style="padding:14px">
      <div class="flex-between" style="margin-bottom:12px">
        <div style="font-weight:700">Gastos del ${formatDate(filtroFecha)}</div>
        <div style="font-weight:800;color:var(--danger)"></div>
      </div>
      ${gastosFiltrados.length === 0
        ? `<p style="text-align:center;color:var(--muted);font-size:14px;padding:16px">Sin gastos este día</p>`
        : gastosFiltrados.map(g => {
            const cb = usuarios.find(u => u.id === g.cobradorId);
            return `
            <div style="padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div class="flex-between">
                <div>
                  <div style="font-weight:700;font-size:14px">${g.descripcion || 'Sin descripción'}</div>
                  <div style="font-size:12px;color:var(--muted)">${cb?.nombre || '—'}</div>
                </div>
                <div style="font-weight:800;color:var(--danger)">${formatMoney(g.monto)}</div>
              </div>
            </div>`;
          }).join('')}
    </div>` : ''}

    <!-- VISTA: CUADRE -->
    ${filtroVista === 'cuadre' ? `
    <div>
      ${(filtroCobradorId === 'todos' ? cobradores : cobradores.filter(u => u.id === filtroCobradorId)).map(u => {
        const c = getCuadreDelDia(u.id, filtroFecha);
        return `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <div class="flex-between" style="margin-bottom:10px">
            <div style="font-weight:700;font-size:15px">${u.nombre}</div>
            <div style="font-weight:800;color:var(--success)">${formatMoney(c.total)}</div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
            <div style="background:var(--bg);border-radius:8px;padding:8px">
              <div style="font-size:11px;color:var(--muted)">📱 Yape</div>
              <div style="font-weight:800">${formatMoney(c.yape)}</div>
            </div>
            <div style="background:var(--bg);border-radius:8px;padding:8px">
              <div style="font-size:11px;color:var(--muted)">💵 Efectivo</div>
              <div style="font-weight:800">${formatMoney(c.efectivo)}</div>
            </div>
            <div style="background:var(--bg);border-radius:8px;padding:8px">
              <div style="font-size:11px;color:var(--muted)">🏦 Transf.</div>
              <div style="font-weight:800">${formatMoney(c.transferencia)}</div>
            </div>
          </div>
          ${c.nota ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);font-style:italic">📝 ${c.nota}</div>` : ''}
        </div>`;
      }).join('')}
    </div>` : ''}

    <!-- VISTA: CRÉDITOS -->
    ${filtroVista === 'creditos' ? `
    <div class="card" style="padding:14px">
      <div style="font-weight:700;margin-bottom:12px">
        ${creditosFiltrados.length} crédito${creditosFiltrados.length !== 1 ? 's' : ''}
        (${creditosFiltrados.filter(c=>c.activo).length} activos,
         ${creditosFiltrados.filter(c=>!c.activo).length} cerrados)
      </div>
      ${creditosFiltrados.length === 0
        ? `<p style="text-align:center;color:var(--muted);font-size:14px;padding:16px">Sin créditos</p>`
        : creditosFiltrados.map(cr => {
            const cl = clientes.find(c => c.id === cr.clienteId);
            const pagosCredito = pagos.filter(p => p.creditoId === cr.id);
            const totalPagado  = pagosCredito.reduce((s, p) => s + p.monto, 0);
            const saldo        = cr.total - totalPagado;
            return `
            <div style="padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div class="flex-between">
                <div>
                  <div style="font-weight:700;font-size:14px">${cl?.nombre || '—'}</div>
                  <div style="font-size:12px;color:var(--muted)">
                    Prestado: ${formatMoney(cr.monto)} · Inicio: ${formatDate(cr.fechaInicio)}
                  </div>
                </div>
                <div style="text-align:right">
                  <span style="background:${cr.activo?'#eff6ff':'#f0fff4'};color:${cr.activo?'var(--primary)':'#276749'};
                    padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">
                    ${cr.activo ? 'Activo' : '✓ Cerrado'}
                  </span>
                  <div style="font-size:13px;font-weight:800;color:${saldo>0?'var(--danger)':'#276749'};margin-top:4px">
                    ${saldo > 0 ? 'Saldo: ' + formatMoney(saldo) : '✓ Saldado'}
                  </div>
                </div>
              </div>
            </div>`;
          }).join('')}
    </div>` : ''}

  </div>`;
}
function navigate(nav) {
  state.nav = nav;
  state.selectedClient  = null;
  state.selectedCobrador = null;
  // Actualizar historial para que el botón atrás funcione (P9)
  history.pushState({ nav }, '', '#' + nav);
  render();
}

// CORRECCIÓN P9: Manejo del botón "atrás" del dispositivo
window.addEventListener('popstate', (e) => {
  // Si hay un modal abierto, cerrarlo
  if (state.modal) {
    state.modal = null;
    state.selectedCredito = null;
    render();
    return;
  }
  // Si estamos viendo un cliente, volver a la lista
  if (state.selectedClient) {
    state.selectedClient = null;
    render();
    return;
  }
  // Si estamos dentro de un cobrador en admin, volver a admin
  if (state.selectedCobrador) {
    state.selectedCobrador = null;
    render();
    return;
  }
  // Si no hay pantalla anterior (estamos en raíz), preguntar si salir
  const confirmSalir = confirm('¿Deseas salir de CobrosApp?');
  if (confirmSalir) {
    // Dejar que el navegador/SO maneje el cierre
    history.back();
  } else {
    // Volver a empujar el estado para que no salga
    history.pushState({ nav: state.nav }, '', '#' + state.nav);
  }
});

// CORRECCIÓN P9: Evitar cierre accidental al recargar/cerrar
window.addEventListener('beforeunload', (e) => {
  if (state.screen === 'main' && state.currentUser) {
    e.preventDefault();
    e.returnValue = '¿Salir de CobrosApp?';
  }
});

// INIT ASYNC
(async () => {
  try {
    await DB.init();

    // Escuchar cambios en tiempo real — CORRECCIÓN P1:
    // onSnapshot actualiza el caché Y re-renderiza sin cerrar la app
    fbEscuchar('pagos',         (datos) => { DB._cache['pagos']         = datos; render(); });
    fbEscuchar('creditos',      (datos) => { DB._cache['creditos']      = datos; render(); });
    fbEscuchar('clientes',      (datos) => { DB._cache['clientes']      = datos; render(); });
    fbEscuchar('users',         (datos) => { DB._cache['users']         = datos; render(); });
    fbEscuchar('notas_cuadre',  (datos) => { DB._cache['notas_cuadre']  = datos; render(); });
    fbEscuchar('gastos',         (datos) => { DB._cache['gastos']         = datos; render(); });

    // Pushear estado inicial en el historial
    history.replaceState({ nav: 'clientes' }, '', '#clientes');

    render();
  } catch(e) {
    console.error('Error iniciando app:', e);
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