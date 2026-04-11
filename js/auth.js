// ═══════════════════════════════════════
// RENDER LOGIN
// ═══════════════════════════════════════
window.renderLogin = function () {
  return `
  <div class="login-screen">
    <div class="login-card">

      <div class="login-logo">
        <h1>💰 CobrosApp</h1>
        <p>Sistema de gestión de préstamos</p>
      </div>

      ${state.loginError ? `
        <div class="alert alert-danger">
          ⚠️ ${state.loginError}
        </div>` : ''}

      <div class="form-group">
        <label>Usuario</label>
        <input class="form-control" id="loginUser"
          placeholder="Ingresa tu usuario"
          value="${state.loginUserField || ''}"
          autocomplete="username">
      </div>

      <div class="form-group">
        <label>Contraseña</label>
        <div class="pass-wrap">

          <input class="form-control" id="loginPass"
            type="password"
            placeholder="••••••••"
            value="${state.loginPassField || ''}"
            autocomplete="current-password">

          <button type="button" id="togglePassBtn" class="eye-btn">
            <svg id="eyeIcon" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2">

              <!-- ojo cerrado inicial -->
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94"/>
              <path d="M1 1l22 22"/>
              <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-4.3 5.38"/>
              <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/>
            </svg>
          </button>

        </div>
      </div>

      <!-- 🔐 RECORDARME -->
      <div class="remember">
        <input type="checkbox" id="rememberMe" ${state.rememberMe ? 'checked' : ''}>
        <label>Recordarme</label>
      </div>

      <button class="btn btn-primary" id="btnLogin">
        Ingresar al Sistema
      </button>

      <div class="login-footer">
        Versión 2026 · Control de Préstamos
      </div>

    </div>
  </div>`;
};


// ═══════════════════════════════════════
// BIND LOGIN
// ═══════════════════════════════════════
window.bindLogin = function () {
  const btnLogin = document.getElementById('btnLogin');
  const loginUserInput = document.getElementById('loginUser');
  const loginPassInput = document.getElementById('loginPass');
  const toggleBtn = document.getElementById('togglePassBtn');

  // 🎯 AUTO FOCUS
  setTimeout(() => loginUserInput?.focus(), 50);

  // 👁️ TOGGLE PASSWORD
  toggleBtn.onclick = () => {
    const isPass = loginPassInput.type === 'password';
    loginPassInput.type = isPass ? 'text' : 'password';

    toggleBtn.style.color = isPass ? 'var(--primary)' : 'var(--muted)';

    document.getElementById('eyeIcon').innerHTML = isPass
      ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
         <circle cx="12" cy="12" r="3"/>`
      : `<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.94"/>
         <path d="M1 1l22 22"/>
         <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-4.3 5.38"/>`;
  };

  // LOGIN
  btnLogin.onclick = async () => {
    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando...';
    btnLogin.classList.add('loading');

    const userVal = loginUserInput.value.trim();
    const passVal = loginPassInput.value.trim();
    const remember = document.getElementById('rememberMe')?.checked;

    // Siempre recargar users desde Firebase — el caché puede estar desactualizado
    // si se creó un usuario nuevo después de que la app cargó
    try {
      DB._cache['users'] = await fbGetAll('users');
    } catch (e) {
      console.warn('No se pudo refrescar users desde Firebase:', e);
    }

    const users = DB._cache['users'] || [];

    const userExists = users.find(u =>
      u.user?.toLowerCase() === userVal.toLowerCase()
    );

    const found = users.find(u =>
      u.user?.toLowerCase() === userVal.toLowerCase() &&
      u.pass === passVal
    );

    if (found) {
      const userSafe = { ...found };
      delete userSafe.pass;

      if (remember) {
        localStorage.setItem('sessionUser', JSON.stringify(userSafe));
      } else {
        sessionStorage.setItem('sessionUser', JSON.stringify(userSafe));
      }

      localStorage.setItem('lastUser', found.user);

      state.currentUser = userSafe;
      state.screen = 'main';
      state.nav = 'clientes';
      state.loginError = '';
      state.rememberMe = remember;
      state.loginPassField = '';

      render();

      // Mostrar alertas automáticamente al admin si hay créditos en mora/vencidos
      if (userSafe.role === 'admin' && typeof getAlertasCreditos === 'function' && getAlertasCreditos().length > 0) {
        setTimeout(() => { state.modal = 'banner-alertas'; render(); }, 500);
      }


    } else {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Ingresar al Sistema';
      btnLogin.classList.remove('loading');

      state.loginUserField = userVal;

      if (!userExists) {
        state.loginError = 'El usuario no existe';
        state.loginPassField = passVal;
      } else {
        state.loginError = 'Contraseña incorrecta';
        state.loginPassField = '';
      }

      render();
    }
  };

  // ENTER
  [loginUserInput, loginPassInput].forEach(el => {
    el.onkeydown = e => {
      if (e.key === 'Enter') btnLogin.click();
    };
  });
};


// ═══════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════
window.logout = function () {
  localStorage.removeItem('sessionUser');
  sessionStorage.removeItem('sessionUser');

  state.screen = 'login';
  state.currentUser = null;
  state.loginPassField = '';
  state.nav = 'clientes';

  render();
};