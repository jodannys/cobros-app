function renderAdmin() {
  if (state.selectedCobrador) return renderAdminCobrador();

  const clientes = DB.get('clientes');
  const creditos = DB.get('creditos');
  const users = DB.get('users');
  const pagos = DB.get('pagos');
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

      <!-- STATS -->
      <div class="admin-grid">
        <div class="stat-card"><div class="stat-number">${clientes.length}</div><div class="stat-label">Clientes totales</div></div>
        <div class="stat-card"><div class="stat-number">${creditos.filter(c => c.activo).length}</div><div class="stat-label">Créditos activos</div></div>
        <div class="stat-card"><div class="stat-number" style="font-size:18px">${formatMoney(totalPrestado)}</div><div class="stat-label">Total prestado</div></div>
        <div class="stat-card"><div class="stat-number" style="font-size:18px">${formatMoney(totalPorCobrar)}</div><div class="stat-label">Por cobrar</div></div>
      </div>

      <!-- ALERTAS -->
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
                <button class="btn btn-sm" style="background:var(--primary);color:white;white-space:nowrap" onclick="abrirGestionCredito('${a.cr.id}','${a.cliente?.id}')">
                  Gestionar
                </button>
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
        const alertasCobrador = getAlertasCreditos().filter(a => a.cobrador?.id === u.id);
        return `
        <div class="cobrador-row" onclick="selectCobrador('${u.id}')">
          <div class="client-avatar" style="width:40px;height:40px;font-size:16px">${u.nombre.charAt(0)}</div>
          <div style="margin-left:12px;flex:1">
            <div style="font-weight:700;display:flex;align-items:center;gap:8px">
              ${u.nombre}
              ${alertasCobrador.length > 0 ? `<span style="background:var(--danger);color:white;border-radius:20px;font-size:11px;padding:2px 7px;font-weight:700">${alertasCobrador.length}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--muted)">${mis.length} clientes · ${activos.length} créditos activos</div>
          </div>
          <span style="color:var(--muted);font-size:20px">›</span>
        </div>`;
      }).join('')}

      <!-- ADMINS -->
      <div class="card-title" style="margin-top:16px">🛡️ Administradores</div>
      ${admins.map(u => `
        <div class="cobrador-row">
          <div class="client-avatar" style="width:40px;height:40px;font-size:16px;background:linear-gradient(135deg,#805ad5,#d53f8c)">${u.nombre.charAt(0)}</div>
          <div style="margin-left:12px;flex:1"><div style="font-weight:700">${u.nombre}</div><div style="font-size:12px;color:var(--muted)">Usuario: ${u.user}</div></div>
        </div>`).join('')}
    </div>
  </div>`;
}

function abrirGestionCredito(crId, clienteId) {
  state.selectedClient = DB.get('clientes').find(x => x.id === clienteId);
  state.selectedCredito = DB.get('creditos').find(x => x.id === crId);
  state.modal = 'gestionar-credito';
  render();
}