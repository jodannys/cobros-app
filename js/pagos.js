// ============================================================
// GESTIÓN DE PAGOS (REGISTRO Y PROCESAMIENTO)
// ============================================================

window.openRegistrarPago = function(crId) {
  const cr = (DB._cache['creditos'] || []).find(x => x.id === crId);
  if (!cr) return;
  state.selectedCredito = cr;
  state.modal = 'registrar-pago';
  render();
};

window.pagoRapido = function(crId) {
  const cr = (DB._cache['creditos'] || []).find(x => x.id === crId);
  if (!cr) return;
  state.selectedCredito = cr;
  state.modal = 'registrar-pago';
  render();
};

window.guardarPago = async function() {
  const cr = state.selectedCredito;
  if (!cr) return;

  const montoInput = document.getElementById('pMonto');
  const monto = parseFloat(montoInput.value);
  if (!monto || monto <= 0) { 
    alert('Ingresa un monto válido'); 
    return; 
  }

  const tipo = document.getElementById('pTipo').value;
  const fecha = document.getElementById('pFecha').value;
  const nota = document.getElementById('pNota').value.trim();
  if (!fecha) { 
    alert('Selecciona una fecha'); 
    return; 
  }

  // ── Calcular deuda actual ──────────────────────────────────────────────────
  const pagosAnteriores = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagadoAntes = pagosAnteriores.reduce((s, p) => s + Number(p.monto), 0);
  const saldoRestante = Math.max(0, cr.total - totalPagadoAntes);
  const mora = typeof calcularMora === 'function' ? calcularMora(cr) : 0;
  const totalDeuda = saldoRestante + mora;

  // ── División proporcional (Saldo vs Mora) ──────────────────────────────────
  let aplicadoSaldo, aplicadoMora;
  if (mora > 0 && totalDeuda > 0) {
    const propSaldo = saldoRestante / totalDeuda;
    const propMora = mora / totalDeuda;
    aplicadoMora = Math.min(parseFloat((monto * propMora).toFixed(2)), mora);
    // Saldo = todo lo que no fue a mora, para evitar pérdida por redondeo
    aplicadoSaldo = Math.min(parseFloat((monto - aplicadoMora).toFixed(2)), saldoRestante);
  } else {
    aplicadoSaldo = Math.min(monto, saldoRestante);
    aplicadoMora = 0;
  }

  const id = genId();

  // cobradorId: si admin registra, usar el del cliente original
  const clienteDelCr = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
  const cobradorId = (state.currentUser.role === 'admin' && clienteDelCr?.cobradorId)
    ? clienteDelCr.cobradorId
    : state.currentUser.id;

  const nuevoPago = {
    id,
    creditoId: cr.id,
    clienteId: cr.clienteId,
    cobradorId,
    registradoPor: state.currentUser.id,
    monto,
    aplicadoSaldo,   // cuánto se aplicó al saldo del crédito
    aplicadoMora,    // cuánto se aplicó a la mora
    tieneMora: aplicadoMora > 0,
    tipo,
    fecha,
    nota
  };

  try {
    await DB.set('pagos', id, nuevoPago);
    if (!DB._cache['pagos']) DB._cache['pagos'] = [];
    DB._cache['pagos'].push(nuevoPago);

    // ── Verificar si quedó todo saldado ───────────────────────────────────────
    const todosLosPagos = DB._cache['pagos'].filter(p => p.creditoId === cr.id);
    const totalAplicadoSaldo = todosLosPagos.reduce((s, p) => s + (Number(p.aplicadoSaldo) || 0), 0);
    const totalAplicadoMora = todosLosPagos.reduce((s, p) => s + (Number(p.aplicadoMora) || 0), 0);
    
    const saldoFinal = Math.max(0, cr.total - totalAplicadoSaldo);
    const moraTotalActual = typeof calcularMora === 'function' ? calcularMora(cr) : 0;
    const moraFinal = Math.max(0, moraTotalActual - totalAplicadoMora);

    if (saldoFinal <= 0 && moraFinal <= 0) {
      await DB.update('creditos', cr.id, { activo: false });
      const idx = (DB._cache['creditos'] || []).findIndex(x => x.id === cr.id);
      if (idx !== -1) DB._cache['creditos'][idx].activo = false;
      if (window.mostrarPagoExitoso) {
        mostrarPagoExitoso('🎉 ¡Crédito completado!', 'El crédito fue cerrado automáticamente', true);
      } else {
        alert('🎉 ¡Crédito completado! El crédito fue cerrado.');
      }
    } else if (saldoFinal <= 0 && moraFinal > 0) {
      if (window.mostrarPagoExitoso) {
        mostrarPagoExitoso('✅ Saldo cubierto', `Mora pendiente: ${formatMoney(moraFinal)}`, false);
      } else {
        alert(`✅ Saldo cubierto. Mora pendiente: ${formatMoney(moraFinal)}`);
      }
    } else {
      if (window.mostrarPagoExitoso) {
        mostrarPagoExitoso('💰 Cuota registrada', `Saldo restante: ${formatMoney(saldoFinal)}`, false);
      } else {
        showToast(`💰 Pago de ${formatMoney(monto)} registrado`);
      }
    }

    state.modal = null;
    state.selectedCredito = null;
    render();
  } catch (e) {
    console.error(e);
    alert('Error al registrar el pago');
  }
};

window.renderModalRegistrarPago = function() {
  const cr = state.selectedCredito;
  if (!cr) return '';

  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = Math.max(0, cr.total - totalPagado);
  const mora = typeof calcularMora === 'function' ? calcularMora(cr) : 0;
  const totalConMora = saldo + mora;
  const tieneVencido = mora > 0;

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💰 Registrar Pago</div>

  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    ${tieneVencido ? `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;
      padding-bottom:8px;border-bottom:1px solid #e2e8f0">
      <span style="color:var(--muted);font-size:13px">Saldo crédito:</span>
      <span style="font-weight:700;color:var(--text)">${formatMoney(saldo)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;
      padding-bottom:8px;border-bottom:2px solid #fed7d7">
      <span style="color:var(--danger);font-size:13px">⚠️ Mora acumulada:</span>
      <span style="font-weight:700;color:var(--danger)">${formatMoney(mora)}</span>
    </div>
    <div style="display:flex;justify-content:space-between">
      <span style="font-weight:800;font-size:15px">Total a cobrar:</span>
      <span style="font-weight:800;font-size:18px;color:var(--danger)">${formatMoney(totalConMora)}</span>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">
      El pago se divide proporcional: ${Math.round((saldo/totalConMora)*100)}% al saldo · ${Math.round((mora/totalConMora)*100)}% a mora
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
  </div>
  <div class="form-group">
    <label>Forma de pago</label>
    <select class="form-control" id="pTipo">
      <option value="efectivo">💵 Efectivo</option>
      <option value="yape">📱 Yape/Plin</option>
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
  <div style="margin-top:20px">
    <button class="btn btn-success" style="width:100%; padding:14px; font-weight:700" onclick="guardarPago()">✓ Confirmar Pago</button>
  </div>`;
};