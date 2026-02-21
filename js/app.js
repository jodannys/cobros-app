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
      state.nav === 'admin' && isAdmin    ? renderAdmin()    : renderClientes()}
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
      </div>` : ''}
      <div class="nav-item" onclick="logout()">
        <span class="nav-icon">🚪</span><span>Salir</span>
      </div>
    </nav>` : ''}
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