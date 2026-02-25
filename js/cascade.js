// ============================================================
// CASCADE.JS — Eliminación en cascada
// Garantiza que al borrar cualquier entidad, no queden
// datos huérfanos en Firestore.
//
// Relaciones:
//   usuario(cobrador) → clientes.cobradorId
//                     → pagos.cobradorId
//                     → gastos.cobradorId
//   cliente           → creditos.clienteId
//                     → pagos.clienteId
//   credito           → pagos.creditoId
// ============================================================

// ── Helper interno: borra un array de docs de una colección ──
async function _borrarLote(coleccion, docs) {
  for (const doc of docs) {
    await DB.delete(coleccion, doc.id);
  }
}

// ============================================================
// BORRAR CLIENTE (+ sus créditos + sus pagos)
// ============================================================
window.eliminarClienteCascade = async function(clienteId) {
  const creditos = (DB._cache['creditos'] || []).filter(x => x.clienteId === clienteId);
  const pagos    = (DB._cache['pagos']    || []).filter(x => x.clienteId === clienteId);

  // 1. Borrar pagos del cliente
  await _borrarLote('pagos', pagos);

  // 2. Borrar créditos del cliente
  await _borrarLote('creditos', creditos);

  // 3. Borrar el cliente
  await DB.delete('clientes', clienteId);

  // 4. Actualizar cache
  DB._cache['pagos']    = (DB._cache['pagos']    || []).filter(x => x.clienteId !== clienteId);
  DB._cache['creditos'] = (DB._cache['creditos'] || []).filter(x => x.clienteId !== clienteId);
  DB._cache['clientes'] = (DB._cache['clientes'] || []).filter(x => x.id        !== clienteId);

  console.log(`✅ Cliente ${clienteId} eliminado con ${creditos.length} créditos y ${pagos.length} pagos`);
};

// ============================================================
// BORRAR CRÉDITO (+ sus pagos)
// ============================================================
window.eliminarCreditoCascade = async function(creditoId) {
  const pagos = (DB._cache['pagos'] || []).filter(x => x.creditoId === creditoId);

  // 1. Borrar pagos del crédito
  await _borrarLote('pagos', pagos);

  // 2. Borrar el crédito
  await DB.delete('creditos', creditoId);

  // 3. Actualizar cache
  DB._cache['pagos']    = (DB._cache['pagos']    || []).filter(x => x.creditoId !== creditoId);
  DB._cache['creditos'] = (DB._cache['creditos'] || []).filter(x => x.id        !== creditoId);

  console.log(`✅ Crédito ${creditoId} eliminado con ${pagos.length} pagos`);
};

// ============================================================
// BORRAR COBRADOR (+ sus gastos + desasignar sus clientes)
// No borra los clientes ni pagos, solo desvincula
// ============================================================
window.eliminarCobradorCascade = async function(cobradorId) {
  const gastos   = (DB._cache['gastos']   || []).filter(x => x.cobradorId === cobradorId);
  const clientes = (DB._cache['clientes'] || []).filter(x => x.cobradorId === cobradorId);

  // 1. Borrar gastos del cobrador
  await _borrarLote('gastos', gastos);

  // 2. Desasignar clientes (cobradorId = null)
  for (const c of clientes) {
    await DB.update('clientes', c.id, { cobradorId: null });
    c.cobradorId = null;
  }

  // 3. Borrar el cobrador
  await DB.delete('users', cobradorId);

  // 4. Actualizar cache
  DB._cache['gastos'] = (DB._cache['gastos'] || []).filter(x => x.cobradorId !== cobradorId);
  DB._cache['users']  = (DB._cache['users']  || []).filter(x => x.id         !== cobradorId);

  console.log(`✅ Cobrador ${cobradorId} eliminado. ${clientes.length} clientes desasignados, ${gastos.length} gastos borrados`);
};

// ============================================================
// LIMPIAR HUÉRFANOS (ejecutar 1 sola vez para sanar la DB)
// Llama desde consola: await limpiarHuerfanos()
// ============================================================
window.limpiarHuerfanos = async function() {
  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const pagos    = DB._cache['pagos']    || [];
  const gastos   = DB._cache['gastos']   || [];
  const users    = DB._cache['users']    || [];

  const clienteIds  = new Set(clientes.map(x => x.id));
  const creditoIds  = new Set(creditos.map(x => x.id));
  const cobradorIds = new Set(users.map(x => x.id));

  let borrados = 0;

  // Pagos sin cliente
  for (const p of pagos.filter(x => !clienteIds.has(x.clienteId))) {
    console.warn('🗑️ Pago huérfano (sin cliente):', p.id, p.clienteId);
    await DB.delete('pagos', p.id);
    borrados++;
  }

  // Pagos sin crédito
  for (const p of pagos.filter(x => x.creditoId && !creditoIds.has(x.creditoId))) {
    console.warn('🗑️ Pago huérfano (sin crédito):', p.id, p.creditoId);
    await DB.delete('pagos', p.id);
    borrados++;
  }

  // Créditos sin cliente
  for (const cr of creditos.filter(x => !clienteIds.has(x.clienteId))) {
    console.warn('🗑️ Crédito huérfano:', cr.id, cr.clienteId);
    await DB.delete('creditos', cr.id);
    borrados++;
  }

  // Gastos sin cobrador
  for (const g of gastos.filter(x => x.cobradorId && !cobradorIds.has(x.cobradorId))) {
    console.warn('🗑️ Gasto huérfano:', g.id, g.cobradorId);
    await DB.delete('gastos', g.id);
    borrados++;
  }

  // Refrescar cache
  DB._cache['pagos']    = (await DB.getAll('pagos'));
  DB._cache['creditos'] = (await DB.getAll('creditos'));
  DB._cache['gastos']   = (await DB.getAll('gastos'));

  console.log(`✅ Limpieza completada. ${borrados} documentos huérfanos eliminados.`);
  render();
  return borrados;
};