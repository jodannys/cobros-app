// ══════════════════════════════════════════════════════════════
// CAJA CHICA
// ══════════════════════════════════════════════════════════════

function getCajaChicaDelDia(cobradorId, fecha) {
  const users    = DB._cache['users']  || [];
  const gastos   = DB._cache['gastos'] || [];
  const cobrador = users.find(u => u.id === cobradorId);

  const cajaInicial  = Number(cobrador?.cajachica) || 0;
  const gastosDelDia = gastos.filter(g => g.cobradorId === cobradorId && g.fecha === fecha);
  const totalGastos  = gastosDelDia.reduce((s, g) => s + Number(g.monto), 0);
  const cuadreDelDia = getCuadreDelDia(cobradorId, fecha);
  const cobrosDelDia = cuadreDelDia.total;
  const saldo = cajaInicial + cobrosDelDia - totalGastos;

  return { cajaInicial, cobrosDelDia, totalGastos, saldo, gastos: gastosDelDia };
}

// ── Panel caja chica (cobrador) ───────────────────────────────

function renderPanelCajaChica() {
  const hoy    = today();
  const caja   = getCajaChicaDelDia(state.currentUser.id, hoy);
  const gastos = caja.gastos;

  return `
  <div class="card" style="margin-bottom:12px;padding:0;overflow:hidden">
    <div style="background:#1e293b;padding:14px 16px;color:white">
      <div style="font-size:11px;opacity:0.7;font-weight:700;text-transform:uppercase;margin-bottom:10px">
        💼 Caja Chica — Hoy
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <div style="font-size:10px;opacity:0.6">CAJA INICIAL</div>
          <div style="font-size:18px;font-weight:800">${formatMoney(caja.cajaInicial)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">COBROS DEL DÍA</div>
          <div style="font-size:18px;font-weight:800;color:#4ade80">+${formatMoney(caja.cobrosDelDia)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">GASTOS</div>
          <div style="font-size:18px;font-weight:800;color:#f87171">-${formatMoney(caja.totalGastos)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">SALDO EN CAJA</div>
          <div style="font-size:18px;font-weight:800;color:${caja.saldo >= caja.cajaInicial ? '#4ade80' : '#fbbf24'}">
            ${formatMoney(caja.saldo)}
          </div>
        </div>
      </div>
    </div>
    <div style="padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase">
          Gastos del día (${gastos.length})
        </div>
        <button class="btn btn-sm" style="background:#fff5f5;color:var(--danger);border:1px solid #fed7d7;font-size:12px"
          onclick="openModal('nuevo-gasto')">+ Gasto</button>
      </div>
      ${gastos.length === 0
        ? '<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px 0">Sin gastos registrados hoy</div>'
        : gastos.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div>
              <div style="font-size:14px;font-weight:600">${g.descripcion}</div>
              <div style="font-size:11px;color:var(--muted)">${formatDate(g.fecha)}</div>
            </div>
            <div style="font-weight:800;color:var(--danger)">-${formatMoney(g.monto)}</div>
          </div>`).join('')}
    </div>
  </div>`;
}

// ── Panel caja chica admin — con botón editar fecha del gasto ─

function renderCajaChicaAdmin(cobradorId, fecha) {
  const caja = getCajaChicaDelDia(cobradorId, fecha);
  return `
  <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:8px">
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
      💼 Caja Chica
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div style="font-size:12px;color:var(--muted)">
        Inicial: <strong>${formatMoney(caja.cajaInicial)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Cobros: <strong style="color:var(--success)">+${formatMoney(caja.cobrosDelDia)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Gastos: <strong style="color:var(--danger)">-${formatMoney(caja.totalGastos)}</strong>
      </div>
      <div style="font-size:12px;font-weight:800">
        Saldo: <span style="color:${caja.saldo >= caja.cajaInicial ? 'var(--success)' : '#f59e0b'}">${formatMoney(caja.saldo)}</span>
      </div>
    </div>

    ${caja.gastos.length > 0 ? `
    <div style="border-top:1px solid #e2e8f0;padding-top:8px">
      ${caja.gastos.map(g => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9">
          <div>
            <div style="font-size:13px;font-weight:600">${g.descripcion}</div>
            <div style="font-size:11px;color:var(--muted)">${formatDate(g.fecha)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="color:var(--danger);font-weight:700;font-size:13px">-${formatMoney(g.monto)}</span>
            <button class="btn btn-sm"
              style="background:#eff6ff;color:var(--primary);border:1px solid #bfdbfe;font-size:11px;padding:3px 8px"
              onclick="abrirEditarFechaGasto('${g.id}')">📅</button>
          </div>
        </div>`).join('')}
    </div>` : '<div style="font-size:12px;color:var(--muted)">Sin gastos registrados</div>'}
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// ✅ EDITAR FECHA DE UN GASTO (solo admin)
// ══════════════════════════════════════════════════════════════

function abrirEditarFechaGasto(gastoId) {
  const g = (DB._cache['gastos'] || []).find(x => x.id === gastoId);
  if (!g) return;
  state._editandoGasto = g;
  state.modal = 'editar-fecha-gasto';
  render();
}

function renderModalEditarFechaGasto() {
  const g = state._editandoGasto;
  if (!g) return '';
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">📅 Cambiar Fecha del Gasto</div>

  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px">
    <div style="font-size:12px;color:var(--muted)">Gasto</div>
    <div style="font-weight:700;font-size:15px">${g.descripcion}</div>
    <div style="font-size:13px;color:var(--danger);font-weight:700;margin-top:4px">-${formatMoney(g.monto)}</div>
  </div>

  <div class="form-group">
    <label>Nueva fecha</label>
    <input class="form-control" id="egFecha" type="date" value="${g.fecha}">
  </div>

  <button class="btn btn-primary" onclick="guardarFechaGasto()">💾 Guardar fecha</button>`;
}

async function guardarFechaGasto() {
  const g     = state._editandoGasto;
  const fecha = document.getElementById('egFecha').value;
  if (!fecha) { alert('Selecciona una fecha'); return; }

  try {
    await DB.update('gastos', g.id, { fecha });
    const idx = (DB._cache['gastos'] || []).findIndex(x => x.id === g.id);
    if (idx !== -1) DB._cache['gastos'][idx].fecha = fecha;
    state._editandoGasto = null;
    state.modal = null;
    showToast('✅ Fecha actualizada');
    render();
  } catch(e) {
    alert('Error al guardar: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// MODAL ASIGNAR / EDITAR CAJA CHICA (monto inicial)
// ══════════════════════════════════════════════════════════════

function renderModalAsignarCaja() {
  const u = state._cajaCobrador;
  if (!u) return '';
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💼 Caja Chica — ${u.nombre}</div>
  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    <div style="font-size:13px;color:var(--muted)">Monto actual asignado</div>
    <div style="font-size:26px;font-weight:800">${formatMoney(u.cajachica || 0)}</div>
  </div>
  <div class="form-group">
    <label>Nuevo monto de caja chica (S/)</label>
    <input class="form-control" id="cajaMonto" type="number"
      value="${u.cajachica || ''}" placeholder="500.00" step="0.01">
  </div>
  <button class="btn btn-primary" onclick="guardarCajaChica()">💾 Guardar</button>`;
}

async function guardarCajaChica() {
  const u     = state._cajaCobrador;
  const monto = parseFloat(document.getElementById('cajaMonto').value);
  if (!u || isNaN(monto) || monto < 0) { alert('Ingresa un monto válido'); return; }
  try {
    await DB.update('users', u.id, { cajachica: monto });
    const idx = (DB._cache['users'] || []).findIndex(x => x.id === u.id);
    if (idx !== -1) DB._cache['users'][idx].cajachica = monto;
    state.modal = null;
    state._cajaCobrador = null;
    showToast('✅ Caja chica actualizada');
    render();
  } catch(e) {
    alert('Error: ' + e.message);
  }
}

function abrirAsignarCaja(cobradorId) {
  const u = (DB._cache['users'] || []).find(x => x.id === cobradorId);
  state._cajaCobrador = u;
  state.modal = 'asignar-caja';
  render();
}

// ── Guardar gasto nuevo ───────────────────────────────────────

async function guardarGasto() {
  const monto       = parseFloat(document.getElementById('gMonto').value);
  const descripcion = document.getElementById('gDescripcion').value.trim();
  const fecha       = document.getElementById('gFecha').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!descripcion)          { alert('Ingresa una descripción'); return; }
  if (!fecha)                { alert('Selecciona una fecha'); return; }

  const cobradorId = state.currentUser.role === 'admin' && state._gastoCobradorId
    ? state._gastoCobradorId
    : state.currentUser.id;

  const id = genId();
  const nuevoGasto = { id, cobradorId, monto, descripcion, fecha, registradoPor: state.currentUser.id };

  try {
    await DB.set('gastos', id, nuevoGasto);
    if (!DB._cache['gastos']) DB._cache['gastos'] = [];
    if (!DB._cache['gastos'].find(g => g.id === id)) DB._cache['gastos'].push(nuevoGasto);
    state.modal = null;
    state._gastoCobradorId = null;
    showToast('Gasto registrado');
    render();
  } catch(e) {
    alert('Error al guardar gasto: ' + e.message);
  }
}

function renderModalNuevoGasto() {
  const isAdmin    = state.currentUser.role === 'admin';
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💸 Registrar Gasto</div>
  ${isAdmin ? `
  <div class="form-group">
    <label>Cobrador</label>
    <select class="form-control" id="gCobrador" onchange="state._gastoCobradorId=this.value">
      ${cobradores.map(u => `
        <option value="${u.id}" ${u.id === state._gastoCobradorId ? 'selected' : ''}>${u.nombre}</option>
      `).join('')}
    </select>
  </div>` : ''}
  <div class="form-group">
    <label>Descripción *</label>
    <input class="form-control" id="gDescripcion" placeholder="Ej: gasolina, almuerzo, papelería...">
  </div>
  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="gMonto" type="number" placeholder="0.00" step="0.01">
  </div>
  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="gFecha" type="date" value="${today()}">
  </div>
  <button class="btn btn-danger" onclick="guardarGasto()">Registrar Gasto</button>`;
}

function abrirNuevoGastoAdmin(cobradorId) {
  state._gastoCobradorId = cobradorId;
  state.modal = 'nuevo-gasto';
  render();
}