function renderLogin() {
  return `
  <div class="login-screen"><div class="login-card">
    <div class="login-logo"><h1>💰 CobrosApp</h1><p>Sistema de gestión de préstamos</p></div>
    ${state.loginError ? `<div class="alert alert-danger">${state.loginError}</div>` : ''}
    <div class="form-group"><label>Usuario</label><input class="form-control" id="loginUser" placeholder="Ingresa tu usuario" autocomplete="off"></div>
    <div class="form-group">
      <label>Contraseña</label>
      <div style="position:relative">
        <input class="form-control" id="loginPass" type="password" placeholder="••••••••" style="padding-right:40px">
        <button type="button" onclick="togglePass('loginPass')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:18px;cursor:pointer">👁️</button>
      </div>
    </div>
    <button class="btn btn-primary" id="btnLogin">Ingresar</button>
    <p style="text-align:center;margin-top:16px;font-size:12px;color:#718096;">admin/1234 · carlos/1234 · maria/1234</p>
  </div></div>`;
}

function bindLogin() {
  document.getElementById('btnLogin').onclick = async () => {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    
    // Usar cache de DB que ya se cargó al init
    const users = DB._cache['users'] || [];
    const found = users.find(u => u.user === user && u.pass === pass);
    
    if (found) {
      state.currentUser = found;
      state.screen = 'main';
      state.loginError = '';
      render();
      if (found.role === 'admin') {
        const alertas = getAlertasCreditos();
        if (alertas.length > 0) {
          setTimeout(() => { state.modal = 'banner-alertas'; render(); }, 500);
        }
      }
    } else {
      state.loginError = 'Usuario o contraseña incorrectos';
      render();
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