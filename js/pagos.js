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
  const tipo = document.getElementById('pTipo').value;
  const fecha = document.getElementById('pFecha').value;
  const nota = document.getElementById('pNota').value.trim();

  // 1. Guardamos el pago en la DB
  await DB.set('pagos', id, {
    id,
    creditoId: cr.id,
    clienteId: cr.clienteId, // Usamos cr.clienteId para mayor seguridad
    cobradorId: state.currentUser.id,
    monto,
    tipo,
    fecha,
    nota
  });

  // 2. Calculamos el total pagado sumando: 
  // Lo que ya había en caché + el monto que estamos pagando AHORA
  const pagosEnCache = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagadoCalculado = pagosEnCache.reduce((s, p) => s + p.monto, 0) + monto;

  // 3. Verificamos si con este pago se llega al TOTAL (monto + 20%)
  if (totalPagadoCalculado >= cr.total) {
    await DB.update('creditos', cr.id, { activo: false });
    showToast('¡Crédito cancelado en su totalidad! ✓');
  } else {
    showToast(`Pago de ${formatMoney(monto)} registrado ✓`);
  }

  // 4. Limpiamos estado y refrescamos
  state.modal = null;
  state.selectedCredito = null;
  
  // Si tienes una función que actualiza el cache localmente antes del render, úsala.
  // Si no, el fbEscuchar() que tienes en app.js se encargará de re-renderizar.
  render(); 
}