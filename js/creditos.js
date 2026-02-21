function renderCreditoCard(cr) {
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  const pagadoReal = saldo <= 0;
  const mora = calcularMora(cr);
  const totalConMora = saldo + mora;
  const progreso = Math.min(100, Math.round((totalPagado / cr.total) * 100));
  const isAdmin = state.currentUser.role === 'admin';
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);

  return `
  <div class="credito-card">
    <div class="credito-header">
      <div style="flex:1">
        <div class="credito-monto">${formatMoney(cr.monto)} prestado</div>
        <div class="text-muted" style="font-size:12px">Total: ${formatMoney(cr.total)} · Cuota: ${formatMoney(cr.cuotaDiaria)}/día</div>
        ${renderFechasCredito(cr)}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span class="tag ${!pagadoReal ? 'tag-blue' : 'tag-green'}">
          ${!pagadoReal ? 'Debe ' + formatMoney(saldo) : '✓ Pagado'}
        </span>
        ${isAdmin ? `
        <button class="btn btn-sm"
          style="background:#f8fafc;color:var(--muted);border:1px solid #e2e8f0;font-size:11px;padding:3px 10px"
          onclick="abrirEditarCredito('${cr.id}')">✏️ Monto</button>` : ''}
      </div>
    </div>

    <div class="flex-between" style="font-size:14px;margin-bottom:6px">
      <span class="text-muted">Pagado: <strong class="text-success">${formatMoney(totalPagado)}</strong></span>
      <span class="text-muted">Saldo: <strong class="${saldo > 0 ? 'text-danger' : 'text-success'}">${formatMoney(saldo)}</strong></span>
    </div>

    ${mora > 0 ? isAdmin ? `
    <div style="background:#fff5f5;border-radius:8px;padding:10px;margin:8px 0;border-left:3px solid var(--danger)">
      <div class="flex-between">
        <span style="font-size:13px;color:var(--danger);font-weight:600">⚠️ Mora acumulada</span>
        <span style="font-weight:800;color:var(--danger)">${formatMoney(mora)}</span>
      </div>
      <div class="flex-between mt-2">
        <span style="font-size:14px;font-weight:700">Total con mora</span>
        <span style="font-weight:800;font-size:16px;color:var(--danger)">${formatMoney(totalConMora)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">S/ 5.00 por día de atraso</div>
    </div>` : `
    <div style="background:#fff5f5;border-radius:10px;padding:12px;margin:8px 0;border-left:3px solid var(--danger)">
      <div class="flex-between">
        <span style="font-size:13px;color:var(--danger);font-weight:700">💰 Total a cobrar hoy</span>
        <span style="font-weight:800;font-size:17px;color:var(--danger)">${formatMoney(totalConMora)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Incluye saldo + mora por atraso</div>
    </div>` : ''}

    <div class="progress-bar"><div class="progress-fill" style="width:${progreso}%"></div></div>
    <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:10px">
      ${progreso}% pagado · ${pagos.length} de ${cr.diasTotal} cuotas
    </div>

    ${cr.activo ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-success btn-sm" onclick="openRegistrarPago('${cr.id}')">💰 Registrar pago</button>
      ${isAdmin ? `
        <button class="btn btn-outline btn-sm" onclick="cerrarCredito('${cr.id}')">✓ Cerrar</button>
        <button class="btn btn-sm" style="background:${cr.mora_activa ? '#fff5f5' : '#f0fff4'};color:${cr.mora_activa ? 'var(--danger)' : 'var(--success)'};border:2px solid ${cr.mora_activa ? '#fed7d7' : '#c6f6d5'}" onclick="toggleMora('${cr.id}',${cr.mora_activa ? 'false' : 'true'})">
          ${cr.mora_activa ? '🔕 Desactivar mora' : '🔔 Activar mora'}
        </button>` : vencido ? `
        <span style="font-size:12px;color:var(--danger);font-weight:600;align-self:center">
          ⚠️ Coordina con el administrador
        </span>` : ''}
    </div>` : `
    <div style="background:#f0fff4;border-radius:8px;padding:8px 12px;font-size:13px;color:#276749;font-weight:600;text-align:center">
      ✅ Crédito cerrado
    </div>`}

    ${renderEsquemaCuotas(cr)}

    ${pagos.length > 0 ? `
    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase">
        Historial de pagos
      </div>
      ${pagos.slice().reverse().map(p => `
        <div class="cuota-item" style="align-items:center">
          <div style="flex:1">
            <div style="font-weight:600;font-size:14px">${formatDate(p.fecha)}</div>
            <div style="font-size:12px;color:var(--muted)">${p.tipo}${p.aplicadoMora ? ' · mora incluida' : ''}</div>
          </div>
          <div style="font-weight:700;font-size:15px;color:var(--success);margin-right:10px">${formatMoney(p.monto)}</div>
          ${isAdmin ? `
          <button class="btn btn-sm"
            style="background:#eff6ff;color:var(--primary);border:1px solid #bfdbfe;font-size:12px;padding:4px 10px;flex-shrink:0"
            onclick="abrirEditarPago('${p.id}')">✏️</button>` : ''}
        </div>`).join('')}
    </div>` : ''}
  </div>`;
}

function renderFechasCredito(cr) {
  const fechaFin = calcularFechaFin(cr.fechaInicio, cr.diasTotal);
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);
  return `
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
    <div class="text-muted" style="font-size:12px">📅 Inicio: ${formatDate(cr.fechaInicio)}</div>
    <div style="font-size:12px;font-weight:600;${vencido ? 'color:var(--danger)' : 'color:var(--muted)'}">
      ${vencido ? '🔴' : '🟢'} Fin: ${fechaFin}
      ${vencido ? '<span style="background:#fff5f5;color:var(--danger);padding:2px 8px;border-radius:20px;font-size:11px;margin-left:4px">VENCIDO</span>' : ''}
    </div>
  </div>`;
}

function calcularCredito() {
  const monto = parseFloat(document.getElementById('crMonto').value) || 0;
  if (monto <= 0) { document.getElementById('crPreview').style.display = 'none'; return; }
  const interes = monto * 0.2;
  const total = monto + interes;
  const cuota = total / 24;
  document.getElementById('crPreview').style.display = 'block';
  document.getElementById('crInteres').textContent = formatMoney(interes);
  document.getElementById('crTotal').textContent = formatMoney(total);
  document.getElementById('crCuota').textContent = formatMoney(cuota);
}

async function guardarCredito() {
  const creditosExistentes = (DB._cache['creditos'] || [])
    .filter(c => c.clienteId === state.selectedClient.id && c.activo);
  if (creditosExistentes.length > 0) {
    alert('Este cliente ya tiene un crédito activo. Ciérralo antes de crear uno nuevo.');
    return;
  }
  const monto = parseFloat(document.getElementById('crMonto').value) || 0;
  if (monto <= 0) { alert('Ingresa el monto'); return; }
  const fechaInicio = document.getElementById('crFecha').value;
  if (!fechaInicio) { alert('Selecciona la fecha de inicio'); return; }
  const total = monto * 1.2;
  const cuotaDiaria = total / 24;
  const id = genId();
  await DB.set('creditos', id, {
    id, clienteId: state.selectedClient.id,
    monto, total, cuotaDiaria, diasTotal: 24,
    fechaInicio, activo: true
  });
  state.modal = null;
  showToast(`Crédito de ${formatMoney(monto)} creado`);
}

async function cerrarCredito(crId) {
  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === crId);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  if (saldo > 0) {
    if (!confirm(`¡CUIDADO! Aún debe ${formatMoney(saldo)}. ¿Cerrar de todos modos?`)) return;
  } else {
    if (!confirm('¿Marcar este crédito como pagado totalmente y cerrarlo?')) return;
  }
  await DB.update('creditos', crId, { activo: false });
  const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === crId);
  if (idx !== -1) DB._cache['creditos'][idx].activo = false;
  showToast('Crédito cerrado');
  render();
}

async function extenderCredito() {
  const dias = parseInt(document.getElementById('extDias').value) || 0;
  if (dias <= 0) { alert('Ingresa los días a extender'); return; }
  const cr = state.selectedCredito;
  const nuevoDias = cr.diasTotal + dias;
  await DB.update('creditos', cr.id, { diasTotal: nuevoDias });
  state.selectedCredito = { ...cr, diasTotal: nuevoDias };
  showToast(`Plazo extendido ${dias} días más`);
  render();
}

async function guardarCompromiso() {
  const fecha = document.getElementById('fechaCompromiso').value;
  if (!fecha) { alert('Selecciona una fecha'); return; }
  await DB.update('creditos', state.selectedCredito.id, { fechaCompromiso: fecha });
  state.selectedCredito = { ...state.selectedCredito, fechaCompromiso: fecha };
  showToast(`Compromiso registrado para el ${formatDate(fecha)}`);
  render();
}

async function guardarNotaCredito() {
  const nota = document.getElementById('notaCredito').value.trim();
  await DB.update('creditos', state.selectedCredito.id, { nota });
  state.selectedCredito = { ...state.selectedCredito, nota };
  showToast('Nota guardada');
  render();
}

async function toggleMora(crId, activar) {
  const creditosCache = DB._cache['creditos'] || [];
  await DB.update('creditos', crId, { mora_activa: activar });
  const idx = creditosCache.findIndex(c => c.id === crId);
  if (idx >= 0) creditosCache[idx].mora_activa = activar;
  showToast(activar ? '🔔 Mora activada — S/5 por día' : '🔕 Mora desactivada');
  render();
}

// ══════════════════════════════════════════════════════════════
// ✅ EDITAR / ELIMINAR PAGO (solo admin)
// ══════════════════════════════════════════════════════════════

function abrirEditarPago(pagoId) {
  const p = (DB._cache['pagos'] || []).find(x => x.id === pagoId);
  if (!p) return;
  state._editandoPago = p;
  state.modal = 'editar-pago';
  render();
}

function renderModalEditarPago() {
  const p = state._editandoPago;
  if (!p) return '';
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === p.clienteId);
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">✏️ Editar Pago</div>

  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
    <div style="font-size:12px;color:var(--muted)">Cliente</div>
    <div style="font-weight:700">${cliente?.nombre || '—'}</div>
  </div>

  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="epMonto" type="number" step="0.01" value="${p.monto}">
  </div>

  <div class="form-group">
    <label>Fecha *</label>
    <input class="form-control" id="epFecha" type="date" value="${p.fecha}">
  </div>

  <div class="form-group">
    <label>Tipo de pago</label>
    <select class="form-control" id="epTipo">
      <option value="efectivo"      ${p.tipo === 'efectivo'      ? 'selected' : ''}>💵 Efectivo</option>
      <option value="yape"          ${p.tipo === 'yape'          ? 'selected' : ''}>📱 Yape</option>
      <option value="transferencia" ${p.tipo === 'transferencia' ? 'selected' : ''}>🏦 Transferencia</option>
    </select>
  </div>

  <button class="btn btn-primary" onclick="guardarPagoEditado()">💾 Guardar cambios</button>
  <button class="btn btn-danger" style="margin-top:8px" onclick="eliminarPago('${p.id}')">🗑️ Eliminar pago</button>`;
}

async function guardarPagoEditado() {
  const p     = state._editandoPago;
  const monto = parseFloat(document.getElementById('epMonto').value);
  const fecha = document.getElementById('epFecha').value;
  const tipo  = document.getElementById('epTipo').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!fecha)               { alert('Selecciona una fecha'); return; }

  const updates = { monto, fecha, tipo };

  try {
    await DB.update('pagos', p.id, updates);
    const idx = (DB._cache['pagos'] || []).findIndex(x => x.id === p.id);
    if (idx !== -1) DB._cache['pagos'][idx] = { ...DB._cache['pagos'][idx], ...updates };
    state._editandoPago = null;
    state.modal = null;
    showToast('✅ Pago actualizado');
    render();
  } catch(e) {
    alert('Error al guardar: ' + e.message);
  }
}

async function eliminarPago(pagoId) {
  if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer y afectará el saldo del crédito.')) return;
  try {
    await DB.delete('pagos', pagoId);
    DB._cache['pagos'] = (DB._cache['pagos'] || []).filter(p => p.id !== pagoId);
    state._editandoPago = null;
    state.modal = null;
    showToast('Pago eliminado');
    render();
  } catch(e) {
    alert('Error al eliminar: ' + e.message);
  }
}