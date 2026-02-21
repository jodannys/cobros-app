function openRegistrarPago(crId) {
  state.selectedCredito = (DB._cache['creditos'] || []).find(x => x.id === crId);
  state.modal = 'registrar-pago';
  render();
}

async function guardarPago() {
  const cr = state.selectedCredito;
  const monto = parseFloat(document.getElementById('pMonto').value) || 0;
  if (monto <= 0) { alert('Ingresa el monto'); return; }
  
  const id = genId();
  
  // 1. Guardamos el pago
  await DB.set('pagos', id, {
    id,
    creditoId: cr.id,
    clienteId: state.selectedClient.id,
    cobradorId: state.currentUser.id,
    monto,
    tipo: document.getElementById('pTipo').value,
    fecha: document.getElementById('pFecha').value,
    nota: document.getElementById('pNota').value.trim()
  });

  // 2. Calculamos el total pagado incluyendo el monto que acabamos de recibir
  const pagosAnteriores = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagadoReal = pagosAnteriores.reduce((s, p) => s + p.monto, 0) + monto;

  // 3. Ahora sí comparamos contra el TOTAL (el que tiene el 20%)
  if (totalPagadoReal >= cr.total) {
    await DB.update('creditos', cr.id, { activo: false });
    showToast('¡Crédito cancelado en su totalidad! ✓');
  } else {
    showToast('Pago registrado · cuadre actualizado ✓');
  }

  state.modal = null;
  state.selectedCredito = null;
  render(); // Forzamos el redibujado para que la etiqueta cambie a "Pagado"
}