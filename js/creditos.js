function renderCreditoCard(cr) {
  const pagos = DB.get('pagos').filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  const progreso = Math.min(100, Math.round((totalPagado / cr.total) * 100));
  const isAdmin = state.currentUser.role === 'admin';
  return `
  <div class="credito-card">
    <div class="credito-header">
      <div>
        <div class="credito-monto">${formatMoney(cr.monto)} prestado</div>
        <div class="text-muted" style="font-size:12px">Total: ${formatMoney(cr.total)} · Cuota: ${formatMoney(cr.cuotaDiaria)}/día</div>
        ${renderFechasCredito(cr)}
      </div>
      <span class="tag ${cr.activo ? 'tag-blue' : 'tag-green'}">${cr.activo ? 'Activo' : 'Pagado'}</span>
    </div>
    <div class="flex-between" style="font-size:13px">
      <span class="text-muted">Pagado: <strong class="text-success">${formatMoney(totalPagado)}</strong></span>
      <span class="text-muted">Saldo: <strong class="${saldo > 0 ? 'text-danger' : 'text-success'}">${formatMoney(saldo)}</strong></span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${progreso}%"></div></div>
    <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:8px">${progreso}% pagado · ${pagos.length} de ${cr.diasTotal} cuotas</div>
    ${cr.activo ? `
    <div style="display:flex;gap:8px">
      <button class="btn btn-success btn-sm" onclick="openRegistrarPago('${cr.id}')">💰 Registrar pago</button>
      ${isAdmin ? `<button class="btn btn-outline btn-sm" onclick="cerrarCredito('${cr.id}')">✓ Cerrar</button>` : ''}
    </div>` : ''}
    ${pagos.length > 0 ? `
    <div style="margin-top:12px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase">Últimos pagos</div>
      ${pagos.slice(-5).reverse().map(p => `
        <div class="cuota-item">
          <div><div style="font-weight:600;font-size:14px">${formatDate(p.fecha)}</div><div style="font-size:12px;color:var(--muted)">${p.tipo}</div></div>
          <div style="font-weight:700;color:var(--success)">${formatMoney(p.monto)}</div>
        </div>`).join('')}
    </div>` : ''}
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

function guardarCredito() {
  const monto = parseFloat(document.getElementById('crMonto').value) || 0;
  if (monto <= 0) { alert('Ingresa el monto'); return; }
  const total = monto * 1.2;
  const cuotaDiaria = total / 24;
  const creditos = DB.get('creditos');
  creditos.push({
    id: genId(), clienteId: state.selectedClient.id,
    monto, total, cuotaDiaria, diasTotal: 24,
    fechaInicio: document.getElementById('crFecha').value,
    activo: true
  });
  DB.set('creditos', creditos);
  state.modal = null;
  showToast(`Crédito de ${formatMoney(monto)} creado`);
}

function cerrarCredito(crId) {
  if (!confirm('¿Marcar este crédito como pagado?')) return;
  const creditos = DB.get('creditos');
  const idx = creditos.findIndex(c => c.id === crId);
  creditos[idx].activo = false;
  DB.set('creditos', creditos);
  showToast('Crédito cerrado');
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

function extenderCredito() {
  const dias = parseInt(document.getElementById('extDias').value) || 0;
  if (dias <= 0) { alert('Ingresa los días a extender'); return; }
  const creditos = DB.get('creditos');
  const idx = creditos.findIndex(c => c.id === state.selectedCredito.id);
  creditos[idx].diasTotal += dias;
  DB.set('creditos', creditos);
  state.selectedCredito = creditos[idx];
  showToast(`Plazo extendido ${dias} días más`);
  render();
}

function guardarCompromiso() {
  const fecha = document.getElementById('fechaCompromiso').value;
  if (!fecha) { alert('Selecciona una fecha'); return; }
  const creditos = DB.get('creditos');
  const idx = creditos.findIndex(c => c.id === state.selectedCredito.id);
  creditos[idx].fechaCompromiso = fecha;
  DB.set('creditos', creditos);
  state.selectedCredito = creditos[idx];
  showToast(`Compromiso registrado para el ${formatDate(fecha)}`);
  render();
}

function guardarNotaCredito() {
  const nota = document.getElementById('notaCredito').value.trim();
  const creditos = DB.get('creditos');
  const idx = creditos.findIndex(c => c.id === state.selectedCredito.id);
  creditos[idx].nota = nota;
  DB.set('creditos', creditos);
  state.selectedCredito = creditos[idx];
  showToast('Nota guardada');
  render();
}