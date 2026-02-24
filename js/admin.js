function renderAdmin() {
  if (state.selectedCobrador) return renderAdminCobrador();

  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users = DB._cache['users'] || [];
  const pagos = DB._cache['pagos'] || [];
  const cobradores = users.filter(u => u.role === 'cobrador');
  const admins = users.filter(u => u.role === 'admin');

  const alertas = getAlertasCreditos();

  return `
  <div>
    <div class="topbar">
      <h2>Administración</h2>
      <div class="topbar-user"><strong>${state.currentUser.nombre}</strong><span>Admin</span></div>
    </div>
    <div class="page">
     

      ${alertas.length > 0 ? `
        <div style="background:#fff5f5;border:2px solid #fed7d7;border-radius:14px;padding:16px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:22px">🚨</span>
            <div>
              <div style="font-weight:800;font-size:16px;color:var(--danger)">Alertas (${alertas.length})</div>
              <div style="font-size:12px;color:var(--muted)">Requieren atención</div>
            </div>
          </div>
          ${alertas.map(a => `
            <div style="background:white;border-radius:10px;padding:12px;margin-bottom:8px;border-left:4px solid ${a.tipo === 'vencido' ? 'var(--danger)' : 'var(--warning)'}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                  <div style="font-weight:700;font-size:14px">${a.cliente?.nombre || '—'}</div>
                  <div style="font-size:12px;color:var(--muted)">Cobrador: ${a.cobrador?.nombre || '—'}</div>
                  <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
                    <span style="background:${a.tipo === 'vencido' ? '#fff5f5' : '#fffbeb'};color:${a.tipo === 'vencido' ? 'var(--danger)' : '#b7791f'};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">
                      ${a.tipo === 'vencido' ? '🔴 VENCIDO' : `⚠️ ${a.dias} días sin pagar`}
                    </span>
                    <span style="background:#fff5f5;color:var(--danger);padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">
                      Saldo: ${formatMoney(a.saldo)}
                    </span>
                  </div>
                </div>
                <button class="btn btn-sm" style="background:var(--primary);color:white;white-space:nowrap"
                  onclick="abrirGestionCredito('${a.cr.id}','${a.cliente?.id}')">Gestionar</button>
              </div>
            </div>`).join('')}
        </div>
      ` : `
        <div style="background:#f0fff4;border:2px solid #c6f6d5;border-radius:14px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">✅</span>
          <div style="font-size:14px;font-weight:600;color:#276749">Todo al día — sin alertas pendientes</div>
        </div>
      `}

      <!-- COBRADORES -->
      <div class="flex-between mb-2">
        <div class="card-title" style="margin:0">👨‍💼 Cobradores</div>
        <button class="btn btn-primary btn-sm" onclick="openModal('nuevo-usuario')">+ Usuario</button>
      </div>
      ${cobradores.map(u => {
    const mis = clientes.filter(c => c.cobradorId === u.id);
    const activos = creditos.filter(c => mis.some(cl => cl.id === c.clienteId) && c.activo);
    const alertasCobrador = alertas.filter(a => a.cobrador?.id === u.id);
    return `
        <div class="cobrador-row" onclick="selectCobrador('${u.id}')">
          <div class="client-avatar" style="width:40px;height:40px;font-size:16px">${u.nombre.charAt(0)}</div>
          <div style="margin-left:12px;flex:1">
            <div style="font-weight:700;display:flex;align-items:center;gap:8px">
              ${u.nombre}
              ${alertasCobrador.length > 0
        ? `<span style="background:var(--danger);color:white;border-radius:20px;font-size:11px;padding:2px 7px;font-weight:700">${alertasCobrador.length}</span>`
        : ''}
            </div>
            <div style="font-size:12px;color:var(--muted)">${mis.length} clientes · ${activos.length} créditos activos</div>
          </div>
          <span style="color:var(--muted);font-size:20px">›</span>
        </div>`;
  }).join('')}

      <!-- ADMINISTRADORES -->
      <div class="flex-between" style="margin-top:20px;margin-bottom:10px">
        <div class="card-title" style="margin:0">🛡️ Administradores</div>
        <button class="btn btn-primary btn-sm" onclick="abrirNuevoAdmin()">+ Admin</button>
      </div>
      ${admins.map(u => `
        <div class="cobrador-row">
          <div class="client-avatar"
            style="width:40px;height:40px;font-size:16px;background:linear-gradient(135deg,#805ad5,#d53f8c)">
            ${u.nombre.charAt(0)}
          </div>
          <div style="margin-left:12px;flex:1">
            <div style="font-weight:700">${u.nombre}</div>
            <div style="font-size:12px;color:var(--muted)">Usuario: ${u.user}</div>
          </div>
          <button class="btn btn-sm btn-outline" onclick="abrirEditarAdmin('${u.id}')">✏️</button>
        </div>`).join('')}
    </div>
  </div>`;
}

function abrirNuevoAdmin() {
  state._editingAdmin = null;
  state.modal = 'editar-admin';
  render();
}

function abrirEditarAdmin(id) {
  const users = DB._cache['users'] || [];
  state._editingAdmin = users.find(u => u.id === id) || null;
  state.modal = 'editar-admin';
  render();
}

function renderAdminCobrador() {
  const users = DB._cache['users'] || [];
  const clientes = (DB._cache['clientes'] || []).filter(c => c.cobradorId === state.selectedCobrador);
  const creditos = DB._cache['creditos'] || [];
  const pagos = DB._cache['pagos'] || [];
  const cobrador = users.find(u => u.id === state.selectedCobrador);
  if (!cobrador) { state.selectedCobrador = null; render(); return ''; }

  // Fecha seleccionada — por defecto hoy
  const fechaVer = state._fechaCobrador || today();

  const c = getCuadreDelDia(state.selectedCobrador, fechaVer);
  const caja = getCajaChicaDelDia(state.selectedCobrador, fechaVer);

  return `
  <div>
    <div class="topbar">
      <button class="back-btn" onclick="state.selectedCobrador=null;state._fechaCobrador=null;render()">←</button>
      <h2>${cobrador.nombre}</h2>
      <button class="btn btn-sm btn-outline" onclick="openModal('editar-usuario')">✏️ Editar</button>
    </div>
    <div class="page">

      <!-- INFO COBRADOR -->
      <div class="card" style="background:#1e293b;">
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Usuario</div><div class="info-value">${cobrador.user}</div></div>
          <div class="info-item"><div class="info-label">Clientes</div><div class="info-value">${clientes.length}</div></div>
        </div>
        <div style="margin-top:12px;padding:10px;background:#eff6ff;border-radius:10px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;color:var(--muted)">💼 Caja Chica asignada</div>
            
<div style="font-size:18px;font-weight:800;color:var(--primary)">${formatMoney(caja.cajaInicial)}</div>
          </div>
          <button class="btn btn-sm" style="background:var(--primary);color:white"
            onclick="abrirAsignarCaja('${cobrador.id}')">✏️ Editar</button>
        </div>
      </div>


  <!-- FECHA -->
<div class="card" style="padding:12px 16px">
  <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
    📅 Cuadre del día
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <button onclick="cambiarFechaCobrador(-1)"
      style="width:36px;height:36px;border-radius:8px;border:1px solid #e2e8f0;
      background:white;font-size:18px;cursor:pointer;flex-shrink:0">‹</button>

    <div onclick="document.getElementById('inputFechaCobrador').showPicker()"
      style="flex:1;height:38px;border:1px solid #e2e8f0;border-radius:8px;background:white;
      display:flex;align-items:center;justify-content:center;gap:8px;
      font-weight:700;font-size:14px;cursor:pointer;user-select:none">
      📅 ${fechaVer.split('-').reverse().join('/')}
    </div>

    <input type="date" id="inputFechaCobrador"
      value="${fechaVer}"
      onchange="state._fechaCobrador=this.value;render()"
      style="position:fixed;opacity:0;pointer-events:none;top:0;left:0;width:1px;height:1px">

    <button onclick="cambiarFechaCobrador(1)"
      style="width:36px;height:36px;border-radius:8px;border:1px solid #e2e8f0;
      background:white;font-size:18px;cursor:pointer;flex-shrink:0;
      opacity:${fechaVer >= today() ? '0.3' : '1'}"
      ${fechaVer >= today() ? 'disabled' : ''}>›</button>
  </div>
</div>
      <!-- CUADRE DEL DÍA SELECCIONADO -->
      <div class="card" style="padding:14px">

        <!-- Métodos de pago -->
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
          💰 Cobros
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-bottom:14px">
          <div style="background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--muted)">📱 Yape/Plin</div>
            <div style="font-weight:700;font-size:14px">${formatMoney(c.yape)}</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--muted)">💵 Efectivo</div>
            <div style="font-weight:700;font-size:14px">${formatMoney(c.efectivo)}</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:8px">
            <div style="font-size:11px;color:var(--muted)">🏦 Transf.</div>
            <div style="font-weight:700;font-size:14px">${formatMoney(c.transferencia)}</div>
          </div>
        </div>

        <!-- Caja -->
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
          💼 Caja
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
            <div style="font-size:11px;color:var(--muted)">Inicial</div>
            <div style="font-weight:800;font-size:16px">${formatMoney(caja.cajaInicial)}</div>
          </div>
          <div style="background:#f0fff4;border-radius:10px;padding:10px 12px">
            <div style="font-size:11px;color:#276749">Cobros</div>
            <div style="font-weight:800;font-size:16px;color:#276749">${formatMoney(caja.cobrosDelDia)}</div>
          </div>
          <div style="background:#fff5f5;border-radius:10px;padding:10px 12px">
            <div style="font-size:11px;color:var(--danger)">Préstamos</div>
            <div style="font-weight:800;font-size:16px;color:var(--danger)">${formatMoney(caja.totalPrestadoHoy)}</div>
          </div>
          <div style="background:#fff5f5;border-radius:10px;padding:10px 12px">
            <div style="font-size:11px;color:var(--danger)">Gastos</div>
            <div style="font-weight:800;font-size:16px;color:var(--danger)">${formatMoney(caja.totalGastos)}</div>
          </div>
        </div>
        <div style="background:#1e293b;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:600">Saldo en caja</div>
          <div style="font-size:20px;font-weight:800;color:${caja.saldo >= caja.cajaInicial ? '#4ade80' : '#fbbf24'}">
            ${formatMoney(caja.saldo)}
          </div>
        </div>
      </div>

      <!-- GASTOS DEL DÍA -->
      ${caja.gastos.length > 0 ? `
      <div class="card" style="padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase">
            🧾 Gastos (${caja.gastos.length})
          </div>
          <button class="btn btn-sm" style="background:#fff5f5;color:var(--danger);border:1px solid #fed7d7"
            onclick="abrirNuevoGastoAdmin('${cobrador.id}')">➕ Gasto</button>
        </div>
        ${caja.gastos.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="font-size:14px;font-weight:600">${g.descripcion}</div>
            <div style="font-weight:700;color:var(--danger)">${formatMoney(g.monto)}</div>
          </div>`).join('')}
      </div>` : `
      <div class="card" style="padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:var(--muted)">Sin gastos este día</div>
        <button class="btn btn-sm" style="background:#fff5f5;color:var(--danger);border:1px solid #fed7d7"
          onclick="abrirNuevoGastoAdmin('${cobrador.id}')">➕ Gasto</button>
      </div>`}

      <!-- NOTA -->
      ${c.nota ? `
      <div class="card" style="padding:12px 16px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:6px">📝 Nota</div>
        <div style="font-size:14px;color:#334155;font-style:italic">${c.nota}</div>
      </div>` : ''}

      <!-- CLIENTES -->
      <div class="card-title" style="margin-top:4px">Clientes</div>
      ${clientes.map(c => {
    const crs = creditos.filter(cr => cr.clienteId === c.id && cr.activo);
    return `
        <div class="client-item" onclick="selectClient('${c.id}')">
          <div class="client-avatar">${c.nombre.charAt(0)}</div>
          <div class="client-info">
            <div class="client-name">${c.nombre}</div>
            <div class="client-dni">DNI: ${c.dni}</div>
          </div>
          <span class="client-badge ${crs.length > 0 ? 'badge-active' : 'badge-done'}">
            ${crs.length > 0 ? 'Activo' : 'Sin crédito'}
          </span>
        </div>`;
  }).join('')}
    </div>
  </div>`;
}

function cambiarFechaCobrador(dias) {
  const actual = state._fechaCobrador || today();
  console.log('📅 fecha actual:', actual, '| dias:', dias);

  const partes = actual.split('-');
  const y = Number(partes[0]);
  const m = Number(partes[1]) - 1;
  const d = Number(partes[2]);
  console.log('📅 partes:', y, m, d);

  const fecha = new Date(y, m, d);
  fecha.setDate(fecha.getDate() + dias);

  const nueva = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')
  ].join('-');

  console.log('📅 nueva fecha calculada:', nueva, '| today:', today());

  if (nueva > today()) {
    console.log('📅 bloqueado: fecha futura');
    return;
  }

  state._fechaCobrador = nueva;
  console.log('📅 state._fechaCobrador seteado a:', state._fechaCobrador);
  render();
}
async function eliminarCobrador(id) {
  const users = DB._cache['users'] || [];
  const u = users.find(x => x.id === id);

  // Protección: nunca borrar admins
  if (!u || u.role === 'admin') {
    alert('No se puede eliminar un administrador desde esta opción.');
    return;
  }

  if (!confirm('¿Eliminar este cobrador? Sus clientes quedarán sin cobrador asignado. Esta acción no se puede deshacer.')) return;

  await DB.delete('users', id);
  DB._cache['users'] = users.filter(x => x.id !== id);
  state.selectedCobrador = null;
  state.modal = null;
  showToast('Cobrador eliminado');
  render();
}

function abrirGestionCredito(crId, clienteId) {
  state.selectedClient = (DB._cache['clientes'] || []).find(x => x.id === clienteId);
  state.selectedCredito = (DB._cache['creditos'] || []).find(x => x.id === crId);
  state.modal = 'gestionar-credito';
  render();
}

function selectCobrador(id) {
  state.selectedCobrador = id;
  render();
}

async function guardarUsuario() {
  const nombre = document.getElementById('uNombre').value.trim();
  const user = document.getElementById('uUser').value.trim();
  const pass = document.getElementById('uPass').value.trim();
  const role = document.getElementById('uRol').value;
  if (!nombre || !user || !pass) { alert('Todos los campos son obligatorios'); return; }
  const users = DB._cache['users'] || [];
  if (users.find(u => u.user === user)) { alert('Ese nombre de usuario ya existe'); return; }
  const id = genId();
  try {
    const nuevoUser = { id, nombre, user, pass, role };
    await DB.set('users', id, nuevoUser);
    if (!DB._cache['users']) DB._cache['users'] = [];
    if (!DB._cache['users'].find(u => u.id === id)) DB._cache['users'].push(nuevoUser);
    state.modal = null;
    showToast('Usuario creado exitosamente');
    render();
  } catch (e) {
    alert('Error al guardar: ' + e.message);
  }
}

async function actualizarUsuario() {
  const users = DB._cache['users'] || [];
  const u = users.find(x => x.id === state.selectedCobrador);
  if (!u) return;
  const nombre = document.getElementById('euNombre').value.trim();
  const user = document.getElementById('euUser').value.trim();
  const pass = document.getElementById('euPass').value.trim();
  const role = document.getElementById('euRol').value;
  if (!nombre || !user) { alert('Nombre y usuario son obligatorios'); return; }
  if (users.find(x => x.user === user && x.id !== u.id)) { alert('Ese usuario ya existe'); return; }
  const updates = { nombre, user, role };
  if (pass) updates.pass = pass;
  try {
    await DB.update('users', u.id, updates);
    const idx = (DB._cache['users'] || []).findIndex(x => x.id === u.id);
    if (idx !== -1) DB._cache['users'][idx] = { ...DB._cache['users'][idx], ...updates };
    state.modal = null;
    showToast('Usuario actualizado');
    render();
  } catch (e) {
    alert('Error al actualizar: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
// ✅ EDITAR MONTO DEL CRÉDITO (solo admin)
// Recalcula total (20% interés) y cuota diaria automáticamente
// ══════════════════════════════════════════════════════════════

function abrirEditarCredito(crId) {
  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;
  state._editandoCredito = cr;
  state.modal = 'editar-credito';
  render();
}

function renderModalEditarCredito() {
  const cr = state._editandoCredito;
  if (!cr) return '';
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
  const totalActual = cr.monto * 1.2;
  const cuotaActual = totalActual / cr.diasTotal;
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">✏️ Corregir Monto</div>
  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
    <div style="font-size:12px;color:var(--muted)">Cliente</div>
    <div style="font-weight:700">${cliente?.nombre || '—'}</div>
  </div>

  <div class="form-group">
    <label>Monto prestado (S/) *</label>
    <input class="form-control" id="ecMonto" type="number" step="0.01"
      value="${cr.monto}" oninput="previsualizarCambioMonto()">
  </div>

  <!-- Preview recálculo automático -->
  <div style="background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:16px">
    <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px;text-transform:uppercase">
      Se recalculará con 20% de interés
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div style="font-size:11px;color:var(--muted)">Total a pagar</div>
        <div style="font-weight:800;font-size:18px;color:var(--primary)" id="ecPreviewTotal">
          ${formatMoney(totalActual)}
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted)">Cuota diaria</div>
        <div style="font-weight:800;font-size:18px;color:var(--primary)" id="ecPreviewCuota">
          ${formatMoney(cuotaActual)}
        </div>
      </div>
    </div>
  </div>

  <button class="btn btn-primary" onclick="guardarCreditoEditado()">💾 Guardar corrección</button>`;
}

function previsualizarCambioMonto() {
  const monto = parseFloat(document.getElementById('ecMonto').value) || 0;
  const cr = state._editandoCredito;
  const total = monto * 1.2;
  const cuota = total / (cr?.diasTotal || 24);
  const elTotal = document.getElementById('ecPreviewTotal');
  const elCuota = document.getElementById('ecPreviewCuota');
  if (elTotal) elTotal.textContent = formatMoney(total);
  if (elCuota) elCuota.textContent = formatMoney(cuota);
}

async function guardarCreditoEditado() {
  const cr = state._editandoCredito;
  const monto = parseFloat(document.getElementById('ecMonto').value);
  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }

  const total = monto * 1.2;
  const cuota = total / cr.diasTotal;
  const updates = { monto, total, cuotaDiaria: cuota };

  try {
    await DB.update('creditos', cr.id, updates);
    const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === cr.id);
    if (idx !== -1) DB._cache['creditos'][idx] = { ...DB._cache['creditos'][idx], ...updates };
    state._editandoCredito = null;
    state.modal = null;
    showToast('✅ Monto corregido correctamente');
    render();
  } catch (e) {
    alert('Error al guardar: ' + e.message);
  }
}