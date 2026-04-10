// ══════════════════════════════════════════════════════════════
// DIÁLOGOS PERSONALIZADOS — reemplaza alert() y confirm()
// ══════════════════════════════════════════════════════════════

// ── showAlert ────────────────────────────────────────────────
window.showAlert = function (msg, type = 'error') {
  const icons = { error: '⚠️', warning: '⚠️', success: '✅', info: 'ℹ️' };
  const colors = {
    error:   { bg: '#fff5f5', border: '#fc8181', title: '#c53030', btn: '#e53e3e' },
    warning: { bg: '#fffbeb', border: '#f6ad55', title: '#b45309', btn: '#d97706' },
    success: { bg: '#f0fff4', border: '#68d391', title: '#276749', btn: '#22c55e' },
    info:    { bg: '#eff6ff', border: '#93c5fd', title: '#1d4ed8', btn: '#1a56db' },
  };
  const c = colors[type] || colors.error;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:99999;display:flex;align-items:center;justify-content:center;
    padding:20px;animation:fadeIn 0.15s ease`;

  overlay.innerHTML = `
    <div style="background:white;border-radius:20px;padding:28px 24px;
      max-width:320px;width:100%;text-align:center;
      animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow:0 20px 60px rgba(0,0,0,0.25)">
      <div style="font-size:44px;margin-bottom:12px">${icons[type] || '⚠️'}</div>
      <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px;font-weight:500">
        ${msg}
      </div>
      <button id="_alertOkBtn"
        style="width:100%;padding:13px;border-radius:12px;border:none;
          background:${c.btn};color:white;font-size:15px;font-weight:700;cursor:pointer">
        Entendido
      </button>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#_alertOkBtn').onclick = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  // Focus el botón para poder cerrar con Enter
  setTimeout(() => overlay.querySelector('#_alertOkBtn')?.focus(), 50);
};

// Override nativo
window.alert = (msg) => window.showAlert(String(msg ?? ''), 'error');

// ── showPrompt ────────────────────────────────────────────────
// Uso: const val = await showPrompt('Confirma el número', '51999...');
// Retorna string con el valor, o null si canceló.
window.showPrompt = function (msg, defaultValue = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:99999;display:flex;align-items:center;justify-content:center;
      padding:20px;animation:fadeIn 0.15s ease`;

    overlay.innerHTML = `
      <div style="background:white;border-radius:20px;padding:28px 24px;
        max-width:320px;width:100%;text-align:center;
        animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow:0 20px 60px rgba(0,0,0,0.25)">
        <div style="font-size:44px;margin-bottom:12px">📲</div>
        <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:16px;font-weight:500">
          ${msg}
        </div>
        <input id="_promptInput" type="tel" value="${defaultValue}"
          style="width:100%;padding:12px;border:1.5px solid #e2e8f0;border-radius:12px;
            font-size:15px;font-weight:600;text-align:center;outline:none;
            box-sizing:border-box;margin-bottom:14px;color:#1e293b"
          oninput="this.style.borderColor='#1a56db'">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button id="_promptCancelBtn"
            style="padding:13px;border-radius:12px;border:1.5px solid #e2e8f0;
              background:white;font-size:14px;font-weight:700;cursor:pointer;color:#64748b">
            Cancelar
          </button>
          <button id="_promptOkBtn"
            style="padding:13px;border-radius:12px;border:none;
              background:#1a56db;color:white;font-size:14px;font-weight:700;cursor:pointer">
            Enviar
          </button>
        </div>
      </div>`;

    const close = (val) => { overlay.remove(); resolve(val); };

    overlay.querySelector('#_promptOkBtn').onclick = () => {
      close(overlay.querySelector('#_promptInput').value);
    };
    overlay.querySelector('#_promptCancelBtn').onclick = () => close(null);
    overlay.querySelector('#_promptInput').onkeydown = e => {
      if (e.key === 'Enter') overlay.querySelector('#_promptOkBtn').click();
      if (e.key === 'Escape') close(null);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(null); });

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#_promptInput')?.focus(), 50);
  });
};

// ── showConfirm ───────────────────────────────────────────────
// Uso: const ok = await showConfirm('¿Seguro?', { danger: true });
window.showConfirm = function (msg, { danger = false, confirmText = 'Confirmar', cancelText = 'Cancelar' } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:99999;display:flex;align-items:center;justify-content:center;
      padding:20px;animation:fadeIn 0.15s ease`;

    const btnColor = danger ? '#e53e3e' : '#1a56db';

    overlay.innerHTML = `
      <div style="background:white;border-radius:20px;padding:28px 24px;
        max-width:320px;width:100%;text-align:center;
        animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        box-shadow:0 20px 60px rgba(0,0,0,0.25)">
        <div style="font-size:44px;margin-bottom:12px">${danger ? '🗑️' : '❓'}</div>
        <div style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:20px;font-weight:500">
          ${msg}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button id="_confirmCancelBtn"
            style="padding:13px;border-radius:12px;border:1.5px solid #e2e8f0;
              background:white;font-size:14px;font-weight:700;cursor:pointer;color:#64748b">
            ${cancelText}
          </button>
          <button id="_confirmOkBtn"
            style="padding:13px;border-radius:12px;border:none;
              background:${btnColor};color:white;font-size:14px;font-weight:700;cursor:pointer">
            ${confirmText}
          </button>
        </div>
      </div>`;

    const close = (result) => { overlay.remove(); resolve(result); };

    overlay.querySelector('#_confirmOkBtn').onclick = () => close(true);
    overlay.querySelector('#_confirmCancelBtn').onclick = () => close(false);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(false); });

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#_confirmCancelBtn')?.focus(), 50);
  });
};
