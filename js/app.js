function render() {
  const root = document.getElementById('root');
  if (state.screen === 'login') { root.innerHTML = renderLogin(); bindLogin(); return; }
  const isAdmin = state.currentUser.role === 'admin';
  root.innerHTML = `
  <div class="app">
    ${state.toast ? `<div style="position:fixed;top:16px;left:50%;transform:translateX(-50%);background:${state.toast.type === 'success' ? '#276749' : '#c53030'};color:white;padding:12px 20px;border-radius:10px;z-index:9999;font-weight:600;font-size:14px;max-width:300px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.2)">${state.toast.msg}</div>` : ''}
    ${state.modal ? renderModal() : ''}
    ${state.selectedClient ? renderClientDetail() :
      state.nav === 'clientes' ? renderClientes() :
      state.nav === 'cuadre' ? renderCuadre() :
      state.nav === 'admin' && isAdmin ? renderAdmin() : renderClientes()}
    ${!state.selectedClient ? `
    <nav class="bottom-nav">
      <div class="nav-item ${state.nav === 'clientes' ? 'active' : ''}" onclick="navigate('clientes')"><span class="nav-icon">👥</span><span>Clientes</span></div>
      <div class="nav-item ${state.nav === 'cuadre' ? 'active' : ''}" onclick="navigate('cuadre')"><span class="nav-icon">📊</span><span>Cuadre</span></div>
      ${isAdmin ? `<div class="nav-item ${state.nav === 'admin' ? 'active' : ''}" onclick="navigate('admin')"><span class="nav-icon">🛡️</span><span>Admin</span></div>` : ''}
      <div class="nav-item" onclick="logout()"><span class="nav-icon">🚪</span><span>Salir</span></div>
    </nav>` : ''}
  </div>`;
}

function navigate(nav) {
  state.nav = nav;
  state.selectedClient = null;
  state.selectedCobrador = null;
  render();
}

// INIT
DB.init();
render();


