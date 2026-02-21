function openRegistrarPago(crId) {
  state.selectedCredito = (DB._cache['creditos'] || []).find(x => x.id === crId);
  state.modal = 'registrar-pago';
  render();
}

async function guardarPago() {
  const cr = state.selectedCredito;
  if (!cr) return;

  const montoRaw = document.getElementById('pMonto').value;
  const monto = parseFloat(montoRaw);
  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }

  const tipo  = document.getElementById('pTipo').value;
  const fecha = document.getElementById('pFecha').value;
  const nota  = document.getElementById('pNota').value.trim();

  if (!fecha) { alert('Selecciona una fecha'); return; }

  const id = genId();
  const nuevoPago = {
    id,
    creditoId:  cr.id,
    clienteId:  cr.clienteId,
    cobradorId: state.currentUser.id,
    monto,
    tipo,
    fecha,
    nota
  };

  // 1. Guardar en Firestore
  await DB.set('pagos', id, nuevoPago);

  // 2. Actualizar caché local de inmediato (para no esperar onSnapshot)
  if (!DB._cache['pagos']) DB._cache['pagos'] = [];
  // Evitar duplicado si onSnapshot ya lo agregó
  if (!DB._cache['pagos'].find(p => p.id === id)) {
    DB._cache['pagos'].push(nuevoPago);
  }

  // 3. Verificar si el crédito quedó saldado
  const pagosDelCr   = DB._cache['pagos'].filter(p => p.creditoId === cr.id);
  const totalPagado  = pagosDelCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);

  if (totalPagado >= cr.total) {
    await DB.update('creditos', cr.id, { activo: false });
    const idx = (DB._cache['creditos'] || []).findIndex(x => x.id === cr.id);
    if (idx !== -1) DB._cache['creditos'][idx].activo = false;
    showToast('✅ Crédito completado y cerrado automáticamente');
  } else {
    showToast('Pago registrado correctamente');
  }

  state.modal         = null;
  state.selectedCredito = null;
  render();
}