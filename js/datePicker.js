// ============================================================
// CUSTOM DATE PICKER — Calendario flotante minimalista
// Uso: renderDatePicker({ id, value, onChange, placeholder })
//   value:    string 'YYYY-MM-DD'
//   onChange: string con código JS — VALUE se reemplaza por 'YYYY-MM-DD'
// ============================================================

const _DP_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _DP_DIAS  = ['D','L','M','M','J','V','S'];

function _encDp(str) {
  return encodeURIComponent(str).replace(/'/g, '%27');
}

function _dpFormatLabel(v) {
  if (!v) return '';
  const [y, m, d] = v.split('-');
  return `${d} / ${m} / ${y}`;
}

window.renderDatePicker = function ({ id, value, onChange, placeholder }) {
  const hasValue = !!value;
  const label = hasValue ? _dpFormatLabel(value) : (placeholder || 'Seleccionar fecha');

  return `
  <div class="custom-select-trigger"
    onclick="abrirDatePicker('${_encDp(value || '')}', '${_encDp(onChange)}')"
    style="display:flex; align-items:center; justify-content:space-between;
           width:100%; padding:12px 14px; border:2px solid var(--border);
           border-radius:10px; background:white; cursor:pointer;
           font-size:15px; color:${hasValue ? 'var(--text)' : 'var(--muted)'}">
    <span style="flex:1">${label}</span>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
         style="flex-shrink:0; margin-left:8px">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  </div>`;
};

window.abrirDatePicker = function (valueEncoded, onChangeEncoded) {
  if (document.getElementById('dp-overlay')) return;

  const value    = decodeURIComponent(valueEncoded);
  const onChange = decodeURIComponent(onChangeEncoded);
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  const base = value || todayStr;
  const [y, m] = base.split('-').map(Number);

  window._dp = { value, onChange, dispYear: y, dispMonth: m - 1, todayStr };
  _dpRender();
};

function _dpRender() {
  const old = document.getElementById('dp-overlay');
  if (old) old.remove();

  const { value, dispYear, dispMonth, todayStr } = window._dp;

  const firstDay    = new Date(dispYear, dispMonth, 1).getDay();
  const daysInMonth = new Date(dispYear, dispMonth + 1, 0).getDate();

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<div></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${dispYear}-${String(dispMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sel   = ds === value;
    const today = ds === todayStr;
    cells += `
      <div onclick="_dpSelectDate('${_encDp(ds)}')"
        style="aspect-ratio:1; display:flex; align-items:center; justify-content:center;
               border-radius:50%; cursor:pointer; font-size:13.5px;
               font-weight:${sel || today ? '700' : '400'};
               background:${sel ? 'var(--primary)' : 'transparent'};
               color:${sel ? 'white' : today ? 'var(--primary)' : 'var(--text)'};
               outline:${today && !sel ? '2px solid var(--primary)' : 'none'};
               outline-offset:-1px">
        ${d}
      </div>`;
  }

  const prevM = dispMonth === 0  ? 11 : dispMonth - 1;
  const prevY = dispMonth === 0  ? dispYear - 1 : dispYear;
  const nextM = dispMonth === 11 ? 0  : dispMonth + 1;
  const nextY = dispMonth === 11 ? dispYear + 1 : dispYear;

  const overlay = document.createElement('div');
  overlay.id = 'dp-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(15,23,42,0.45); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
    z-index:9999; display:flex; align-items:center; justify-content:center;
    padding:20px; animation:fadeIn 0.15s ease`;

  overlay.innerHTML = `
    <div style="background:white; border-radius:20px; width:100%; max-width:320px;
                padding:20px 18px 16px;
                box-shadow:0 20px 60px rgba(15,23,42,0.25);
                animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)">

      <!-- Navegación mes -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px">
        <button onclick="_dpNav(${prevY},${prevM})"
          style="width:34px;height:34px;border:none;background:#f1f5f9;border-radius:50%;
                 cursor:pointer;font-size:18px;line-height:1;color:#475569;
                 display:flex;align-items:center;justify-content:center">‹</button>
        <div style="font-weight:700; font-size:15px; color:var(--text)">
          ${_DP_MESES[dispMonth]} ${dispYear}
        </div>
        <button onclick="_dpNav(${nextY},${nextM})"
          style="width:34px;height:34px;border:none;background:#f1f5f9;border-radius:50%;
                 cursor:pointer;font-size:18px;line-height:1;color:#475569;
                 display:flex;align-items:center;justify-content:center">›</button>
      </div>

      <!-- Cabecera días -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px">
        ${_DP_DIAS.map(d => `
          <div style="text-align:center;font-size:11px;font-weight:700;
                      color:var(--muted);padding:4px 0">${d}</div>`).join('')}
      </div>

      <!-- Grilla días -->
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px">
        ${cells}
      </div>

      <!-- Footer -->
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);
                  display:flex;justify-content:space-between;align-items:center">
        <button onclick="_dpSelectDate('${_encDp(todayStr)}')"
          style="font-size:13px;font-weight:700;color:var(--primary);
                 border:none;background:none;cursor:pointer;padding:4px 0">
          Hoy
        </button>
        <button onclick="_cerrarDatePicker()"
          style="font-size:13px;font-weight:600;color:var(--muted);
                 border:none;background:none;cursor:pointer;padding:4px 0">
          Cancelar
        </button>
      </div>
    </div>`;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) _cerrarDatePicker();
  });

  if (!document.getElementById('dp-styles')) {
    const style = document.createElement('style');
    style.id = 'dp-styles';
    style.textContent = `
      @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      @keyframes popIn  { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
}

window._dpNav = function (year, month) {
  window._dp.dispYear  = year;
  window._dp.dispMonth = month;
  _dpRender();
};

window._dpSelectDate = function (dateEncoded) {
  const date     = decodeURIComponent(dateEncoded);
  const onChange = window._dp.onChange;
  _cerrarDatePicker();
  const code = onChange.replace(/VALUE/g, JSON.stringify(date));
  // eslint-disable-next-line no-new-func
  new Function(code)();
};

window._cerrarDatePicker = function () {
  const el = document.getElementById('dp-overlay');
  if (el) el.remove();
};
