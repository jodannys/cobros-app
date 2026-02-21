function openRegistrarPago(crId) {
  state.selectedCredito = DB.get('creditos').find(x => x.id === crId);
  state.modal = 'registrar-pago';
  render();
}

function guardarPago() {
  const cr = state.selectedCredito;
  const monto = parseFloat(document.getElementById('pMonto').value) || 0;
  if (monto <= 0) { alert('Ingresa el monto'); return; }
  const pagos = DB.get('pagos');
  pagos.push({
    id: genId(),
    creditoId: cr.id,
    clienteId: state.selectedClient.id,
    cobradorId: state.currentUser.id,
    monto,
    tipo: document.getElementById('pTipo').value,
    fecha: document.getElementById('pFecha').value,
    nota: document.getElementById('pNota').value.trim()
  });
  DB.set('pagos', pagos);
  const totalPagado = pagos.filter(p => p.creditoId === cr.id).reduce((s, p) => s + p.monto, 0);
  if (totalPagado >= cr.total) {
    const creditos = DB.get('creditos');
    const idx = creditos.findIndex(c => c.id === cr.id);
    creditos[idx].activo = false;
    DB.set('creditos', creditos);
  }
  state.modal = null;
  state.selectedCredito = null;
  showToast('Pago registrado · cuadre actualizado ✓');
}