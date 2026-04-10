// ============================================================
// CUSTOM SELECT — Bottom sheet nativo con estilo propio
// Uso: renderCustomSelect({ id, options, value, onChange, placeholder })
//   options: [{ value, label }]
//   onChange: string con código JS a ejecutar, ej: "state._hCobrador=VALUE; render()"
//             VALUE se reemplaza por el valor seleccionado
// ============================================================

// encodeURIComponent no codifica ' — esto rompe atributos onclick con ' como delimitador
function _encAttr(str) {
  return encodeURIComponent(str).replace(/'/g, '%27');
}

window.renderCustomSelect = function ({ id, options, value, onChange, placeholder }) {
  const selected = options.find(o => String(o.value) === String(value));
  const label = selected ? selected.label : (placeholder || 'Seleccionar');

  return `
  <div class="custom-select-trigger"
    onclick="abrirCustomSelect('${id}', '${_encAttr(JSON.stringify(options))}', '${_encAttr(onChange)}', '${_encAttr(String(value))}')"
    style="display:flex; align-items:center; justify-content:space-between;
           width:100%; padding:12px 14px; border:2px solid var(--border);
           border-radius:10px; background:white; cursor:pointer;
           font-size:15px; color:${selected ? 'var(--text)' : 'var(--muted)'}">
    <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
      ${label}
    </span>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-left:8px">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  </div>`;
};

window.abrirCustomSelect = function (id, optsEncoded, onChangeEncoded, currentEncoded) {
  if (document.getElementById('custom-select-overlay')) return;

  const options    = JSON.parse(decodeURIComponent(optsEncoded));
  const onChange   = decodeURIComponent(onChangeEncoded);
  const current    = decodeURIComponent(currentEncoded);

  const overlay = document.createElement('div');
  overlay.id = 'custom-select-overlay';
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(15,23,42,0.45); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
    z-index:9998; display:flex; align-items:center; justify-content:center;
    padding:20px; animation:fadeIn 0.15s ease`;

  overlay.innerHTML = `
    <div style="background:white; border-radius:20px;
                width:100%; max-width:380px; max-height:70vh;
                display:flex; flex-direction:column;
                animation:popIn 0.2s cubic-bezier(0.34,1.56,0.64,1);
                box-shadow:0 20px 60px rgba(15,23,42,0.25)">
      <div style="padding:16px 20px 12px; border-bottom:1px solid var(--border); flex-shrink:0">
        <div style="width:36px; height:4px; border-radius:2px; background:#e2e8f0; margin:0 auto"></div>
      </div>
      <div style="overflow-y:auto; padding:8px 0 12px; scrollbar-width:none">
        ${options.map(o => `
          <div onclick="_selectOption('${_encAttr(String(o.value))}', '${_encAttr(onChange)}')"
            style="padding:14px 20px; font-size:15px; cursor:pointer;
                   display:flex; align-items:center; justify-content:space-between;
                   color:var(--text); font-weight:${String(o.value) === current ? '700' : '400'};
                   background:${String(o.value) === current ? '#eff6ff' : 'white'}">
            <span>${o.label}</span>
            ${String(o.value) === current ? `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a56db"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>` : ''}
          </div>`).join('')}
      </div>
    </div>`;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) _cerrarCustomSelect();
  });

  if (!document.getElementById('custom-select-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-select-styles';
    style.textContent = `
      @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
      @keyframes popIn   { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
      #custom-select-overlay ::-webkit-scrollbar { display:none }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);
};

window._selectOption = function (valueEncoded, onChangeEncoded) {
  const value    = decodeURIComponent(valueEncoded);
  const onChange = decodeURIComponent(onChangeEncoded);
  _cerrarCustomSelect();
  // Ejecutar el onChange reemplazando VALUE por el valor real
  const code = onChange.replace(/VALUE/g, JSON.stringify(value));
  // eslint-disable-next-line no-new-func
  new Function(code)();
};

window._cerrarCustomSelect = function () {
  const el = document.getElementById('custom-select-overlay');
  if (el) el.remove();
};
