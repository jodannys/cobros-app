// ═══════════════════════════════════════
// RENDER LOGIN
// ═══════════════════════════════════════
window.renderLogin = function () {
  if (state.loginRecuperar) return renderRecuperarClave();
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
          value="${esc(state.loginUserField || '')}"
          autocomplete="username">
      </div>

      <div class="form-group">
        <label>Contraseña</label>
        <div class="pass-wrap">

          <input class="form-control" id="loginPass"
            type="password"
            placeholder="••••••••"
            value="${esc(state.loginPassField || '')}"
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

      ${state.loginEsAdmin ? `
      <button type="button" class="btn" style="background:none;color:var(--primary);margin-top:6px"
        onclick="state.loginRecuperar=true; state.loginError=''; render()">
        ¿Olvidaste tu clave?
      </button>` : ''}

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
  if (state.loginRecuperar) return;
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
    if (btnLogin.disabled) return; // evita doble toque mientras entra

    const userVal = loginUserInput.value.trim();
    const passVal = loginPassInput.value.trim();
    const remember = document.getElementById('rememberMe')?.checked;

    // Campos vacíos: avisar sin consultar al servidor
    if (!userVal || !passVal) {
      state.loginUserField = userVal;
      state.loginPassField = passVal;
      state.loginError = !userVal ? 'Escribe tu usuario' : 'Escribe tu contraseña';
      render();
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Verificando...';
    btnLogin.classList.add('loading');

    let resultado;
    let found = null;
    try {
      resultado = await fbLogin(userVal, passVal, remember);
      if (resultado.ok) {
        // La clave ya es correcta; ahora se descargan los datos (puede tardar unos segundos)
        btnLogin.textContent = 'Cargando tus datos...';
        await DB.init();
        found = (DB._cache['users'] || []).find(u => u.id === resultado.uid) || null;
        if (!found) {
          await fbLogout();
          resultado = { ok: false, motivo: 'no-existe' };
        }
      }
    } catch (e) {
      console.error('Error de login:', e);
      const sinRed = e?.code === 'auth/network-request-failed' || !navigator.onLine;
      resultado = { ok: false, motivo: sinRed ? 'red' : 'otro', detalle: e?.code || e?.message };
    }

    if (found) {
      const userSafe = { ...found };
      delete userSafe.pass;

      // Primer ingreso de un admin tras la actualización: migrar a todos los usuarios pendientes
      if (userSafe.role === 'admin' && (DB._cache['users'] || []).some(u => u.pass !== undefined)) {
        fbFuncion('migrarTodos', {})
          .then(async () => { DB._cache['users'] = await fbGetAll('users'); })
          .catch(e => console.warn('No se pudo migrar usuarios:', e));
      }

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

      // Solo un admin ve "¿Olvidaste tu clave?"; al cobrador se la cambia el admin
      state.loginEsAdmin = resultado?.motivo === 'clave' && resultado?.esAdmin === true;
      const errores = {
        'no-existe': 'El usuario no existe',
        'clave': state.loginEsAdmin
          ? 'Contraseña incorrecta'
          : 'Contraseña incorrecta. Si la olvidaste, pide al administrador que la cambie',
        'bloqueado': 'Demasiados intentos. Espera unos minutos',
        'red': 'Sin conexión. Revisa tu internet'
      };
      state.loginError = errores[resultado?.motivo]
        || `No se pudo iniciar sesión${resultado?.detalle ? ` (${esc(resultado.detalle)})` : ''}`;
      state.loginPassField = resultado?.motivo === 'no-existe' ? passVal : '';

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
// RECUPERAR CLAVE (con código de recuperación)
// ═══════════════════════════════════════
window.renderRecuperarClave = function () {
  return `
  <div class="login-screen">
    <div class="login-card">
      <div class="login-logo">
        <h1>🔑 Recuperar clave</h1>
        <p>Usa el código de recuperación que anotaste</p>
      </div>

      ${state.loginError ? `<div class="alert alert-danger">⚠️ ${state.loginError}</div>` : ''}

      <div class="form-group">
        <label>Usuario</label>
        <input class="form-control" id="recUser" autocomplete="username"
          value="${esc(state.loginUserField || '')}">
      </div>
      <div class="form-group">
        <label>Código de recuperación</label>
        <input class="form-control" id="recCodigo" placeholder="XXXX-XXXX"
          autocomplete="off" style="text-transform:uppercase; letter-spacing:2px">
      </div>
      <div class="form-group">
        <label>Nueva clave</label>
        <input class="form-control" id="recNueva" type="password" autocomplete="new-password">
      </div>

      <button class="btn btn-primary" onclick="recuperarClave()">Cambiar clave</button>
      <button type="button" class="btn" style="background:none;color:var(--primary);margin-top:6px"
        onclick="state.loginRecuperar=false; state.loginError=''; render()">
        ← Volver
      </button>
    </div>
  </div>`;
};

window.recuperarClave = unaVez(async function () {
  const user = document.getElementById('recUser').value.trim();
  const codigo = document.getElementById('recCodigo').value.trim();
  const nueva = document.getElementById('recNueva').value.trim();
  state.loginUserField = user;
  if (!user || !codigo || !nueva) {
    state.loginError = 'Completa todos los campos';
    render();
    return;
  }
  let r;
  try {
    r = await fbFuncion('recuperarClave', { user, codigo, nueva });
  } catch (e) {
    r = { ok: false, motivo: 'red' };
  }
  if (r.ok) {
    state.loginRecuperar = false;
    state.loginEsAdmin = false;
    state.loginError = '';
    showToast('Clave cambiada. Ya puedes ingresar');
    render();
    return;
  }
  const errores = {
    codigo: 'Usuario o código incorrecto',
    corta: 'La clave nueva debe tener al menos 4 caracteres',
    bloqueado: 'Demasiados intentos. Espera 30 minutos',
    red: 'Sin conexión. Revisa tu internet'
  };
  state.loginError = errores[r.motivo] || 'No se pudo cambiar la clave';
  render();
});

// Genera el código del usuario actual y lo muestra una sola vez
window.generarCodigoRecuperacion = unaVez(async function () {
  if (!await showConfirm('Se generará un código nuevo y el anterior dejará de servir. ¿Continuar?',
    { confirmText: 'Generar' })) return;
  try {
    const r = await fbFuncion('generarCodigoRecuperacion', {});
    state._codigoRecuperacion = r.codigo;
    render();
  } catch (e) {
    alert('Error al generar código: ' + mensajeError(e));
  }
});

// ═══════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════
window.logout = function () {
  localStorage.removeItem('sessionUser');
  sessionStorage.removeItem('sessionUser');
  DB._detenerListeners();
  DB._borrarCacheLocal();
  fbLogout().catch(() => {});
  state.loginEsAdmin = false;
  state.loginError = '';

  state.screen = 'login';
  state.currentUser = null;
  state.loginPassField = '';
  state.nav = 'clientes';

  render();
};