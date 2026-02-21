function renderLogin() {
  return `
  <div class="login-screen"><div class="login-card">
    <div class="login-logo"><h1>💰 CobrosApp</h1><p>Sistema de gestión de préstamos</p></div>
    ${state.loginError ? `<div class="alert alert-danger">${state.loginError}</div>` : ''}
    <div class="form-group"><label>Usuario</label><input class="form-control" id="loginUser" placeholder="Ingresa tu usuario" autocomplete="off"></div>
    <div class="form-group"><label>Contraseña</label><input class="form-control" id="loginPass" type="password" placeholder="••••••••"></div>
    <button class="btn btn-primary" id="btnLogin">Ingresar</button>
    <p style="text-align:center;margin-top:16px;font-size:12px;color:#718096;">Demo: admin/1234 · carlos/1234 · maria/1234</p>
  </div></div>`;
}

function bindLogin() {
  document.getElementById('btnLogin').onclick = () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const found = DB.get('users').find(u => u.user === user && u.pass === pass);
    if (found) {
  state.currentUser = found;
  state.screen = 'main';
  state.loginError = '';
  render();
  // Mostrar banner de alertas al admin al entrar
  if (found.role === 'admin') {
    const alertas = getAlertasCreditos();
    if (alertas.length > 0) {
      setTimeout(() => {
        state.modal = 'banner-alertas';
        render();
      }, 500);
    }
  }
}
};
  document.getElementById('loginPass').onkeydown = (e) => {
    if (e.key === 'Enter') document.getElementById('btnLogin').click();
  };
}

function logout() {
  state.screen = 'login';
  state.currentUser = null;
  state.nav = 'clientes';
  state.selectedClient = null;
  render();
}