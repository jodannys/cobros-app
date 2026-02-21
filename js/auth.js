function renderLogin() {
  return `
  <div class="login-screen"><div class="login-card">
    <div class="login-logo"><h1>💰 CobrosApp</h1><p>Sistema de gestión de préstamos</p></div>
    ${state.loginError ? `<div class="alert alert-danger">${state.loginError}</div>` : ''}
    
    <div class="form-group">
      <label>Usuario</label>
      <input class="form-control" id="loginUser" placeholder="Usuario" 
             value="${state.loginUserField || ''}" autocomplete="off">
    </div>
    
    <div class="form-group">
      <label>Contraseña</label>
      <div style="position:relative">
        <input class="form-control" id="loginPass" type="password" placeholder="••••••••" 
               value="${state.loginPassField || ''}" style="padding-right:40px">
        <button type="button" onclick="togglePass('loginPass')" 
                style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:18px;cursor:pointer">👁️</button>
      </div>
    </div>
    
    <button class="btn btn-primary" id="btnLogin">Ingresar</button>
  </div></div>`;
}
function bindLogin() {
  document.getElementById('btnLogin').onclick = async () => {
    const userVal = document.getElementById('loginUser').value.trim();
    const passVal = document.getElementById('loginPass').value.trim();
    const users = DB._cache['users'] || [];
    
    const userExists = users.find(u => u.user === userVal);
    const found = users.find(u => u.user === userVal && u.pass === passVal);
    
    if (found) {
      // 1. ÉXITO: Guardamos el usuario para la próxima vez
      localStorage.setItem('lastUser', found.user);
      
      state.currentUser = found;
      state.screen = 'main';
      state.loginError = '';
      state.loginUserField = found.user; 
      state.loginPassField = '';
      render();
      
      if (found.role === 'admin') {
        const alertas = getAlertasCreditos();
        if (alertas.length > 0) {
          setTimeout(() => { state.modal = 'banner-alertas'; render(); }, 500);
        }
      }
    } else {
      // 2. ERROR: Lógica inteligente
      state.loginUserField = userVal;
      if (!userExists) {
        state.loginError = 'El usuario no existe';
        state.loginPassField = passVal;
      } else {
        state.loginError = 'Contraseña incorrecta';
        state.loginPassField = ''; // Borra pass si el user es correcto
      }
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
  state.loginPassField = '';
  state.nav = 'clientes';
  state.selectedClient = null;
  render();
}