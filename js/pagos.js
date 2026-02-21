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
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  if (totalPagado >= cr.total) {
    await DB.update('creditos', cr.id, { activo: false });
  }
  state.modal = null;
  state.selectedCredito = null;
  showToast('Pago registrado · cuadre actualizado ✓');
}