function openRegistrarPago(crId) {
  state.selectedCredito = (DB._cache['creditos'] || []).find(x => x.id === crId);
  state.modal = 'registrar-pago';
  render();
}

async function guardarPago() {
  const cr = state.selectedCredito;
  // ... (tu código de validación de monto)
  
  const nuevoPago = {
    id,
    creditoId: cr.id,
    clienteId: cr.clienteId,
    cobradorId: state.currentUser.id,
    monto,
    tipo,
    fecha,
    nota
  };

  // 1. Guardar en la DB
  await DB.set('pagos', id, nuevoPago);

  // 2. ¡IMPORTANTE! Actualizar el caché local de inmediato
  if (!DB._cache['pagos']) DB._cache['pagos'] = [];
  DB._cache['pagos'].push(nuevoPago);

  // 3. Verificación de cierre (usando el acumulado real)
  const pagosDelCr = DB._cache['pagos'].filter(p => p.creditoId === cr.id);
  const totalPagado = pagosDelCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);

  if (totalPagado >= cr.total) {
    await DB.update('creditos', cr.id, { activo: false });
    // También actualizamos el crédito en el caché para que el render lo vea apagado
    const crIndex = (DB._cache['creditos'] || []).findIndex(x => x.id === cr.id);
    if (crIndex !== -1) DB._cache['creditos'][crIndex].activo = false;
  }

  state.modal = null;
  state.selectedCredito = null;
  render(); 
  showToast('Pago registrado correctamente');
}