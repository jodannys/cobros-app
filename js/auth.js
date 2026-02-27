// ══════════════════════════════════════════════════════════════
// AUTENTICACIÓN (Compatibles con Vite/Modules)
// ══════════════════════════════════════════════════════════════

window.renderLogin = function() {
  return `
  <div class="login-screen">
    <div class="login-card">
      <div class="login-logo">
        <h1>💰 CobrosApp</h1>
        <p>Sistema de gestión de préstamos</p>
      </div>
      
      ${state.loginError ? `
        <div class="alert alert-danger" style="margin-bottom:15px; text-align:center; padding:10px; border-radius:8px; font-size:13px">
          ⚠️ ${state.loginError}
        </div>` : ''}
      
      <div class="form-group">
        <label>Usuario</label>
        <input class="form-control" id="loginUser" placeholder="Ingresa tu usuario" 
               value="${state.loginUserField || ''}" autocomplete="username">
      </div>
      
      <div class="form-group">
        <label>Contraseña</label>
        <div style="position:relative">
          <input class="form-control" id="loginPass" type="password" placeholder="••••••••" 
                 value="${state.loginPassField || ''}" style="padding-right:45px"
                 autocomplete="current-password">
          <button type="button" onclick="
  const inp = document.getElementById('loginPass');
  const btn = this;
  if(inp.type === 'password') {
    inp.type = 'text';
    btn.style.color = 'var(--primary)';
  } else {
    inp.type = 'password';
    btn.style.color = 'var(--muted)';
  }"
  style="position:absolute; right:12px; top:50%; transform:translateY(-50%);
         border:none; background:none; cursor:pointer;
         color:var(--muted); display:flex; align-items:center">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
</button>
        </div>
      </div>
      
      <button class="btn btn-primary" id="btnLogin" style="width:100%; margin-top:10px; padding:14px; font-weight:700">
        Ingresar al Sistema
      </button>
      
      <div style="margin-top:20px; text-align:center; font-size:12px; color:var(--muted)">
        Versión 2026 · Control de Préstamos
      </div>
    </div>
  </div>`;
};

window.bindLogin = function() {
  const btnLogin = document.getElementById('btnLogin');
  const loginPassInput = document.getElementById('loginPass');
  const loginUserInput = document.getElementById('loginUser');

  if (btnLogin) {
    btnLogin.onclick = async () => {
      // Bloquear botón para evitar doble click
      btnLogin.disabled = true;
      btnLogin.textContent = 'Verificando...';

      const userVal = document.getElementById('loginUser').value.trim();
      const passVal = document.getElementById('loginPass').value.trim();
      const users = DB._cache['users'] || [];
      
      // DESPUÉS — guarda contra campos undefined
const userExists = users.find(u => u.user?.toLowerCase() === userVal.toLowerCase());
const found = users.find(u => u.user?.toLowerCase() === userVal.toLowerCase() && u.pass === passVal);
      
     if (found) {
        localStorage.setItem('lastUser', found.user);
        state.currentUser = found;
        state.screen = 'main';
        state.loginError = '';
        state.loginUserField = found.user; 
        state.loginPassField = '';
        
        // CAMBIO AQUÍ: Todos entran directo a Clientes, sin importar el rol
        state.nav = 'clientes'; 
        
        render();
        
        // Alerta de créditos vencidos (Solo para Admin)
        if (found.role === 'admin' && typeof getAlertasCreditos === 'function') {
          const alertas = getAlertasCreditos();
          if (alertas.length > 0) {
            setTimeout(() => { 
              state.modal = 'banner-alertas'; 
              render(); 
            }, 500);
          }
        }
      } else {
        // Manejo de errores
        state.loginUserField = userVal;
        if (!userExists) {
          state.loginError = 'El usuario no existe';
          state.loginPassField = passVal; // Mantenemos pass para que el usuario vea qué escribió si quiere
        } else {
          state.loginError = 'Contraseña incorrecta';
          state.loginPassField = ''; // Limpiamos pass por seguridad si el usuario sí existe
        }
        render();
      }
    };
  }

  // Soporte para tecla Enter en ambos campos
  [loginUserInput, loginPassInput].forEach(el => {
    if (el) {
      el.onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('btnLogin').click();
      };
    }
  });
};

window.logout = function() {
  if (confirm('¿Cerrar sesión?')) {
    state.screen = 'login';
    state.currentUser = null;
    state.loginPassField = '';
    state.nav = 'clientes';
    state.selectedClient = null;
    state.modal = null;
    render();
  }
};

window.togglePass = function(id) {
  const input = document.getElementById(id);
  if (input) {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    // Opcional: podrías cambiar el emoji de 👁️ a 🙈
  }
};