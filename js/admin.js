function renderAdmin() {
  if (state.selectedCobrador) return renderAdminCobrador();

  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users = DB._cache['users'] || [];
  const pagos = DB._cache['pagos'] || [];
  const cobradores = users.filter(u => u.role === 'cobrador');
  const admins = users.filter(u => u.role === 'admin');

  const totalPrestado = creditos.filter(c => c.activo).reduce((s, c) => s + c.monto, 0);
  const totalPorCobrar = creditos.filter(c => c.activo).reduce((s, c) => {
    const pagado = pagos.filter(p => p.creditoId === c.id).reduce((ss, p) => ss + p.monto, 0);
    return s + (c.total - pagado);
  }, 0);

  const alertas = getAlertasCreditos();

  return `
  <div>
    <div class="topbar">
      <h2>Administración</h2>
      <div class="topbar-user"><strong>${state.currentUser.nombre}</strong><span>Admin</span></div>
    </div>
    <div class="page">
      <div class="admin-grid">
        <div class="stat-card"><div class="stat-number">${clientes.length}</div><div class="stat-label">Clientes totales</div></div>
        <div class="stat-card"><div class="stat-number">${creditos.filter(c => c.activo).length}</div><div class="stat-label">Créditos activos</div></div>
        <div class="stat-card"><div class="stat-number" style="font-size:18px">${formatMoney(totalPrestado)}</div><div class="stat-label">Total prestado</div></div>
        <div class="stat-card"><div class="stat-number" style="font-size:18px">${formatMoney(totalPorCobrar)}</div><div class="stat-label">Por cobrar</div></div>
      </div>

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

      <!-- ADMINISTRADORES (P7 CORREGIDO: editable + agregar) -->
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
  const diasCobrador = [...new Set(
    pagos.filter(p => p.cobradorId === state.selectedCobrador).map(p => p.fecha)
  )].sort((a, b) => b.localeCompare(a)).slice(0, 7);

  return `
  <div>
    <div class="topbar">
      <button class="back-btn" onclick="state.selectedCobrador=null;render()">←</button>
      <h2>${cobrador.nombre}</h2>
      <button class="btn btn-sm btn-outline" onclick="openModal('editar-usuario')">✏️ Editar</button>
    </div>
    <div class="page">
      <div class="card">
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Usuario</div><div class="info-value">${cobrador.user}</div></div>
          <div class="info-item"><div class="info-label">Clientes</div><div class="info-value">${clientes.length}</div></div>
        </div>
        <button class="btn btn-danger btn-sm" style="margin-top:8px" onclick="eliminarCobrador('${cobrador.id}')">🗑️ Eliminar cobrador</button>
      </div>

      <div class="card-title">Clientes</div>
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

      <div class="card-title" style="margin-top:16px">Cuadres recientes</div>
      ${diasCobrador.length === 0
      ? `<div class="empty-state"><div class="icon">📊</div><p>Sin registros</p></div>`
      : diasCobrador.map(fecha => {
        const c = getCuadreDelDia(state.selectedCobrador, fecha);
        return `
            <div class="card" style="padding:14px">
              <div class="flex-between">
                <div class="fw-bold">${formatDate(fecha)}</div>
                <div class="fw-bold text-success">${formatMoney(c.total)}</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-top:8px">
                <div style="background:var(--bg);border-radius:8px;padding:6px">
                  <div style="font-size:11px;color:var(--muted)">📱 Yape</div>
                  <div style="font-weight:700;font-size:13px">${formatMoney(c.yape)}</div>
                </div>
                <div style="background:var(--bg);border-radius:8px;padding:6px">
                  <div style="font-size:11px;color:var(--muted)">💵 Efectivo</div>
                  <div style="font-weight:700;font-size:13px">${formatMoney(c.efectivo)}</div>
                </div>
                <div style="background:var(--bg);border-radius:8px;padding:6px">
                  <div style="font-size:11px;color:var(--muted)">🏦 Transf.</div>
                  <div style="font-weight:700;font-size:13px">${formatMoney(c.transferencia)}</div>
                </div>
              </div>
              ${c.nota ? `<div style="margin-top:8px;font-size:12px;color:var(--muted);font-style:italic">📝 ${c.nota}</div>` : ''}
            </div>`;
      }).join('')}
    </div>
  </div>`;
}

async function eliminarCobrador(id) {
  const confirmar = confirm('⚠️ ¡ATENCIÓN! Si eliminas este cobrador, se borrarán PERMANENTEMENTE todos sus clientes, créditos y pagos. ¿Estás seguro?');
  if (!confirmar) return;

  try {
    // 1. Obtener todos los datos vinculados
    const clientes = (DB._cache['clientes'] || []).filter(c => c.cobradorId === id);
    const pagos = (DB._cache['pagos'] || []).filter(p => p.cobradorId === id);
    
    // 2. Borrar Clientes
    for (let c of clientes) {
      // Borrar créditos de este cliente
      const creditosCliente = (DB._cache['creditos'] || []).filter(cr => cr.clienteId === c.id);
      for (let cr of creditosCliente) {
        await DB.delete('creditos', cr.id);
      }
      // Borrar el cliente
      await DB.delete('clientes', c.id);
    }

    // 3. Borrar Pagos realizados por este cobrador
    for (let p of pagos) {
      await DB.delete('pagos', p.id);
    }

    // 4. Borrar finalmente al Cobrador (Usuario)
    await DB.delete('users', id);

    state.selectedCobrador = null;
    showToast('Cobrador y todos sus datos eliminados');
    render();
  } catch (e) {
    console.error("Error al eliminar cascada:", e);
    alert("Error al intentar borrar los datos vinculados.");
  }
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
  await DB.set('users', id, { id, nombre, user, pass, role });
  state.modal = null;
  showToast('Usuario creado exitosamente');
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
  await DB.update('users', u.id, updates);
  state.modal = null;
  showToast('Usuario actualizado');
}