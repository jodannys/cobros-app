function openRegistrarPago(crId) {
  state.selectedCredito = (DB._cache['creditos'] || []).find(x => x.id === crId);
  state.modal = 'registrar-pago';
  render();
}

async function guardarPago() {
  const cr = state.selectedCredito;
  if (!cr) return;

  const monto = parseFloat(document.getElementById('pMonto').value);
  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }

  const tipo  = document.getElementById('pTipo').value;
  const fecha = document.getElementById('pFecha').value;
  const nota  = document.getElementById('pNota').value.trim();
  if (!fecha) { alert('Selecciona una fecha'); return; }

  // Calcular cuánto va al saldo y cuánto a mora
  const pagosAnteriores = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagadoAntes = pagosAnteriores.reduce((s, p) => s + Number(p.monto), 0);
  const saldoRestante    = Math.max(0, cr.total - totalPagadoAntes);
  const mora             = calcularMora(cr);

  // El pago se divide proporcional entre saldo y mora
  const totalDeuda    = saldoRestante + mora;
  let aplicadoSaldo, aplicadoMora;
  if (mora > 0 && totalDeuda > 0) {
    // Proporción: cuánto le corresponde a cada parte
    aplicadoSaldo = Math.min(monto * (saldoRestante / totalDeuda), saldoRestante);
    aplicadoMora  = Math.min(monto * (mora / totalDeuda), mora);
  } else {
    aplicadoSaldo = Math.min(monto, saldoRestante);
    aplicadoMora  = 0;
  }
  const hayMora = aplicadoMora > 0;

  const id = genId();

  // cobradorId: si el admin registra, usar el del cliente
  const clienteDelCr = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
  const cobradorId = state.currentUser.role === 'admin' && clienteDelCr?.cobradorId
    ? clienteDelCr.cobradorId
    : state.currentUser.id;

  const nuevoPago = {
    id,
    creditoId:     cr.id,
    clienteId:     cr.clienteId,
    cobradorId,
    registradoPor: state.currentUser.id,
    monto,
    aplicadoSaldo,
    aplicadoMora,
    aplicadoMora:  hayMora,   // flag para mostrar en historial
    tipo,
    fecha,
    nota
  };

  await DB.set('pagos', id, nuevoPago);

  if (!DB._cache['pagos']) DB._cache['pagos'] = [];
  if (!DB._cache['pagos'].find(p => p.id === id)) {
    DB._cache['pagos'].push(nuevoPago);
  }

  // Verificar si el crédito quedó saldado (saldo + mora cubiertos)
  const todosLosPagos   = DB._cache['pagos'].filter(p => p.creditoId === cr.id);
  const totalPagadoAhora = todosLosPagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldoFinal      = cr.total - totalPagadoAhora;
  const moraFinal       = calcularMora({ ...cr }); // recalcular

  if (saldoFinal <= 0 && moraFinal <= 0) {
    await DB.update('creditos', cr.id, { activo: false });
    const idx = (DB._cache['creditos'] || []).findIndex(x => x.id === cr.id);
    if (idx !== -1) DB._cache['creditos'][idx].activo = false;
    showToast('✅ Crédito completado y cerrado automáticamente');
  } else if (saldoFinal <= 0 && moraFinal > 0) {
    showToast(`Pago registrado. Aún queda mora pendiente: ${formatMoney(moraFinal)}`);
  } else {
    showToast('Pago registrado correctamente');
  }

  state.modal          = null;
  state.selectedCredito = null;
  render();
}

// Modal de registrar pago — con desglose de mora si aplica
function renderModalRegistrarPago() {
  const cr = state.selectedCredito;
  if (!cr) return '';

  const pagos       = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo       = Math.max(0, cr.total - totalPagado);
  const mora        = calcularMora(cr);
  const totalConMora = saldo + mora;
  const tieneVencido = mora > 0;

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💰 Registrar Pago</div>

  <!-- Resumen del crédito -->
  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    ${tieneVencido ? `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;
      padding-bottom:8px;border-bottom:1px solid #e2e8f0">
      <span style="color:var(--muted);font-size:13px">Saldo crédito:</span>
      <span style="font-weight:700;color:var(--danger)">${formatMoney(saldo)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;
      padding-bottom:8px;border-bottom:2px solid #fed7d7">
      <span style="color:var(--danger);font-size:13px">⚠️ Mora acumulada:</span>
      <span style="font-weight:700;color:var(--danger)">${formatMoney(mora)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:800;font-size:15px">Total a cobrar:</span>
      <span style="font-weight:800;font-size:18px;color:var(--danger)">${formatMoney(totalConMora)}</span>
    </div>` : `
    <div class="flex-between">
      <span class="text-muted">Cuota diaria:</span>
      <span class="fw-bold">${formatMoney(cr.cuotaDiaria)}</span>
    </div>
    <div class="flex-between mt-2">
      <span class="text-muted">Saldo pendiente:</span>
      <span class="fw-bold text-danger">${formatMoney(saldo)}</span>
    </div>`}
  </div>

  <div class="form-group">
    <label>Monto recibido (S/)</label>
    <input class="form-control" id="pMonto" type="number"
      value="${tieneVencido ? totalConMora.toFixed(2) : cr.cuotaDiaria.toFixed(2)}"
      step="0.01">
    ${tieneVencido ? `
    <div style="font-size:11px;color:var(--muted);margin-top:4px">
      El pago cubre primero el saldo del crédito, luego la mora
    </div>` : ''}
  </div>

  <div class="form-group">
    <label>Forma de pago</label>
    <select class="form-control" id="pTipo">
      <option value="efectivo">💵 Efectivo</option>
      <option value="yape">📱 Yape</option>
      <option value="transferencia">🏦 Transferencia</option>
    </select>
  </div>
  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="pFecha" type="date" value="${today()}">
  </div>
  <div class="form-group">
    <label>Nota (opcional)</label>
    <input class="form-control" id="pNota" placeholder="Observaciones...">
  </div>
  <button class="btn btn-success" onclick="guardarPago()">✓ Confirmar Pago</button>`;
}