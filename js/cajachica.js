// ══════════════════════════════════════════════════════════════
// CAJA CHICA
// Colección Firestore: 'gastos'
// { id, cobradorId, monto, descripcion, fecha, registradoPor }
// El monto de caja chica se guarda en users: { cajachica: 500 }
// ══════════════════════════════════════════════════════════════

// ── Helpers de caja chica ─────────────────────────────────────

function getCajaChicaDelDia(cobradorId, fecha) {
  const users = DB._cache['users'] || [];
  const gastos = DB._cache['gastos'] || [];
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const cobrador = users.find(u => u.id === cobradorId);

  const cajas = DB._cache['cajas'] || [];
  const cajaDelDia = cajas.find(c => c.cobradorId === cobradorId && c.fecha === fecha);
  // Si no hay caja asignada ese día, busca la más reciente anterior
  const cajaAnterior = cajas
    .filter(c => c.cobradorId === cobradorId && c.fecha <= fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const cajaInicial = Number(cajaDelDia?.monto ?? cajaAnterior?.monto ?? cobrador?.cajachica) || 0;
  const gastosDelDia = gastos.filter(g => g.cobradorId === cobradorId && g.fecha === fecha);
  const totalGastos = gastosDelDia.reduce((s, g) => s + Number(g.monto), 0);
  const cuadreDelDia = getCuadreDelDia(cobradorId, fecha);
  const cobrosDelDia = cuadreDelDia.total;

  // Préstamos entregados hoy por este cobrador
  const prestamosHoy = creditos.filter(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    return cr.fechaInicio === fecha && cliente?.cobradorId === cobradorId;
  });
  const totalPrestadoHoy = prestamosHoy.reduce((s, cr) => s + Number(cr.monto), 0);

  const saldo = cajaInicial + cobrosDelDia - totalPrestadoHoy - totalGastos;

  return { cajaInicial, cobrosDelDia, totalGastos, totalPrestadoHoy, prestamosHoy, saldo, gastos: gastosDelDia };
}

// ── Render panel caja chica (para cobrador en cuadre) ─────────

function renderPanelCajaChica() {
  const hoy = today();
  const caja = getCajaChicaDelDia(state.currentUser.id, hoy);
  const gastos = caja.gastos;
  const cuadre = getCuadreDelDia(state.currentUser.id, hoy);
  const mostrarTodosGastos = state._verTodosGastos || false;
  const gastosVisibles = mostrarTodosGastos ? gastos : gastos.slice(0, 3);

  return `
  <div class="card" style="margin-bottom:12px;padding:0;overflow:hidden">
    <!-- Header oscuro: caja + métodos de pago -->
    <div style="background:#1e293b;padding:14px 16px;color:white">
      <div style="font-size:11px;opacity:0.7;font-weight:700;text-transform:uppercase;margin-bottom:10px">
        💼 Caja Chica — Hoy
      </div>

      <!-- Grid caja -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;text-align:center">
        <div>
          <div style="font-size:10px;opacity:0.6">CAJA INICIAL</div>
          <div style="font-size:18px;font-weight:800">${formatMoney(caja.cajaInicial)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">COBROS DEL DÍA</div>
          <div style="font-size:18px;font-weight:800;color:#4ade80">${formatMoney(caja.cobrosDelDia)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">PRÉSTAMOS HOY</div>
          <div style="font-size:18px;font-weight:800;color:#f87171">${formatMoney(caja.totalPrestadoHoy)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">GASTOS</div>
          <div style="font-size:18px;font-weight:800;color:#f87171">${formatMoney(caja.totalGastos)}</div>
        </div>
      </div>

      <!-- Saldo destacado -->
      <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px;text-align:center;margin-bottom:14px">
        <div style="font-size:10px;opacity:0.6;margin-bottom:4px">SALDO EN CAJA</div>
        <div style="font-size:24px;font-weight:800;color:${caja.saldo >= caja.cajaInicial ? '#4ade80' : '#fbbf24'}">
          ${formatMoney(caja.saldo)}
        </div>
      </div>

      <!-- Métodos de pago -->
      <div style="font-size:10px;opacity:0.6;font-weight:700;text-transform:uppercase;margin-bottom:8px">
        Cobros por método
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:8px">
          <div style="font-size:10px;opacity:0.7">📱 Yape/Plin</div>
          <div style="font-weight:800;font-size:15px">${formatMoney(cuadre.yape)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:8px">
          <div style="font-size:10px;opacity:0.7">💵 Efectivo</div>
          <div style="font-weight:800;font-size:15px">${formatMoney(cuadre.efectivo)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:8px">
          <div style="font-size:10px;opacity:0.7">🏦 Transf.</div>
          <div style="font-weight:800;font-size:15px">${formatMoney(cuadre.transferencia)}</div>
        </div>
      </div>
    </div>

    <!-- Gastos del día -->
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
      : `${gastosVisibles.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div>
              <div style="font-size:14px;font-weight:600">${g.descripcion}</div>
              <div style="font-size:11px;color:var(--muted)">${formatDate(g.fecha)}</div>
            </div>
            <div style="font-weight:800;color:var(--danger)">${formatMoney(g.monto)}</div>
          </div>`).join('')}
          ${gastos.length > 3 ? `
          <button onclick="state._verTodosGastos=${!mostrarTodosGastos};render()"
            style="width:100%;margin-top:10px;padding:8px;border-radius:8px;border:1px solid #e2e8f0;
            background:white;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer">
            ${mostrarTodosGastos ? '▲ Ver menos' : `▼ Ver todos (${gastos.length})`}
          </button>` : ''}`}
    </div>
  </div>`;
}

// ── Render panel caja chica para admin (por cobrador) ─────────

function renderCajaChicaAdmin(cobradorId, fecha) {
  const caja = getCajaChicaDelDia(cobradorId, fecha);
  return `
  <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:8px">
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
      💼 Caja Chica
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="font-size:12px;color:var(--muted)">
        Inicial: <strong>${formatMoney(caja.cajaInicial)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Cobros: <strong style="color:var(--success)">+${formatMoney(caja.cobrosDelDia)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Préstamos: <strong style="color:var(--danger)">-${formatMoney(caja.totalPrestadoHoy)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Gastos: <strong style="color:var(--danger)">-${formatMoney(caja.totalGastos)}</strong>
      </div>
      <div style="font-size:12px;font-weight:800;grid-column:span 2">
        Saldo: <span style="color:${caja.saldo >= caja.cajaInicial ? 'var(--success)' : '#f59e0b'}">${formatMoney(caja.saldo)}</span>
      </div>
    </div>
    ${caja.gastos.length > 0 ? `
    <div style="margin-top:8px;border-top:1px solid #e2e8f0;padding-top:8px">
      ${caja.gastos.map(g => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0">
          <span style="color:var(--muted)">${g.descripcion}</span>
          <span style="color:var(--danger);font-weight:600">-${formatMoney(g.monto)}</span>
        </div>`).join('')}
    </div>` : ''}
  </div>`;
}

// ── Guardar gasto ─────────────────────────────────────────────

async function guardarGasto() {
  const monto = parseFloat(document.getElementById('gMonto').value);
  const descripcion = document.getElementById('gDescripcion').value.trim();
  const fecha = document.getElementById('gFecha').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!descripcion) { alert('Ingresa una descripción'); return; }
  if (!fecha) { alert('Selecciona una fecha'); return; }

  // Si es admin registrando desde el perfil de un cobrador
  const cobradorId = state.currentUser.role === 'admin' && state._gastoCobradorId
    ? state._gastoCobradorId
    : state.currentUser.id;

  const id = genId();
  const nuevoGasto = {
    id, cobradorId, monto, descripcion, fecha,
    registradoPor: state.currentUser.id
  };

  try {
    await DB.set('gastos', id, nuevoGasto);
    if (!DB._cache['gastos']) DB._cache['gastos'] = [];
    if (!DB._cache['gastos'].find(g => g.id === id)) {
      DB._cache['gastos'].push(nuevoGasto);
    }
    state.modal = null;
    state._gastoCobradorId = null;
    showToast('Gasto registrado');
    render();
  } catch (e) {
    alert('Error al guardar gasto: ' + e.message);
  }
}

// ── Modal nuevo gasto ─────────────────────────────────────────

function renderModalNuevoGasto() {
  const isAdmin = state.currentUser.role === 'admin';
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
    <input class="form-control" id="gDescripcion" placeholder="Ej: gasolina, aceite...">
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

// ── Modal asignar caja chica (solo admin) ─────────────────────

function renderModalAsignarCaja() {
  const u = state._cajaCobrador;
  if (!u) return '';
  const fechaModal = state._fechaCobrador || today();
  
  const cajas = DB._cache['cajas'] || [];
  const cajaExistente = cajas.find(c => c.cobradorId === u.id && c.fecha === fechaModal);
  
  console.log('🏦 Modal abierto — fecha:', fechaModal);
  console.log('🏦 cajas en cache:', cajas.length);
  console.log('🏦 cajaExistente:', cajaExistente);

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💼 Caja Chica — ${u.nombre}</div>

  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="cajaFecha" type="date" 
      value="${fechaModal}"
      onchange="
        const nuevaFecha = this.value;
        console.log('📅 fecha cambiada a:', nuevaFecha);
        state._fechaCobrador = nuevaFecha;
        const cajas = DB._cache['cajas'] || [];
        console.log('🏦 cajas disponibles:', cajas.length, cajas);
        const existe = cajas.find(c => c.cobradorId === '${u.id}' && c.fecha === nuevaFecha);
        console.log('🏦 existe para fecha:', existe);
        document.getElementById('cajaMonto').value = '';
        const elActual = document.getElementById('cajaMontoActual');
        if (elActual) {
          elActual.textContent = existe ? 'S/ ' + Number(existe.monto).toFixed(2) : 'S/ 0.00';
          console.log('✅ cajaMontoActual actualizado a:', elActual.textContent);
        } else {
          console.log('❌ no se encontró el elemento cajaMontoActual');
        }
      ">
  </div>

  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    <div style="font-size:13px;color:var(--muted)">Monto asignado para esta fecha</div>
    <div style="font-size:22px;font-weight:800" id="cajaMontoActual">
      ${formatMoney(cajaExistente?.monto || 0)}
    </div>
  </div>

  <div class="form-group">
    <label>Nuevo monto (S/)</label>
    <input class="form-control" id="cajaMonto" type="number"
      value="" 
      placeholder="0.00" step="0.01">
  </div>
  <button class="btn btn-primary" onclick="guardarCajaChica()">Guardar</button>`;
}
async function guardarCajaChica() {
  const u     = state._cajaCobrador;
  const monto = parseFloat(document.getElementById('cajaMonto').value);
  const fecha = document.getElementById('cajaFecha').value;
  if (!u || isNaN(monto) || monto < 0) { alert('Ingresa un monto válido'); return; }

  const cajas = DB._cache['cajas'] || [];
  const existente = cajas.find(c => c.cobradorId === u.id && c.fecha === fecha);

  try {
    if (existente) {
      // Actualizar en lugar de crear nuevo
      console.log('🏦 actualizando caja existente:', existente.id);
      await DB.update('cajas', existente.id, { monto });
      existente.monto = monto;
    } else {
      // Crear nuevo solo si no existe
      const id = genId();
      const nuevaCaja = { id, cobradorId: u.id, monto, fecha, asignadoPor: state.currentUser.id };
      console.log('🏦 creando nueva caja:', nuevaCaja);
      await DB.set('cajas', id, nuevaCaja);
      if (!DB._cache['cajas']) DB._cache['cajas'] = [];
      DB._cache['cajas'].push(nuevaCaja);
    }
    state.modal = null;
    state._cajaCobrador = null;
    showToast('Caja chica actualizada');
    render();
  } catch(e) {
    alert('Error: ' + e.message);
  }
}
console.log(DB._cache['cajas'])
function abrirAsignarCaja(cobradorId) {
  const u = (DB._cache['users'] || []).find(x => x.id === cobradorId);
  state._cajaCobrador = u;
  state.modal = 'asignar-caja';
  render();
}

function abrirNuevoGastoAdmin(cobradorId) {
  state._gastoCobradorId = cobradorId;
  state.modal = 'nuevo-gasto';
  render();
}