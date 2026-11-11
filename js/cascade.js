// ============================================================
// CASCADE.JS — Eliminación en cascada
// ============================================================

async function _borrarLote(coleccion, docs) {
  for (const doc of docs) {
    await DB.delete(coleccion, doc.id);
  }
}

async function _marcarEliminados(pagos) {
  for (const p of pagos) {
    await DB.update('pagos', p.id, { eliminado: true });
    const idx = (DB._cache['pagos'] || []).findIndex(x => x.id === p.id);
    if (idx !== -1) DB._cache['pagos'][idx].eliminado = true;
  }
}

// ============================================================
// BORRAR CLIENTE (+ sus créditos + sus pagos)
// ============================================================
window.eliminarClienteCascade = async function (clienteId) {
  const creditos = (DB._cache['creditos'] || []).filter(x => x.clienteId === clienteId);
  const pagos    = (DB._cache['pagos']    || []).filter(x => x.clienteId === clienteId);
  const cliente  = (DB._cache['clientes'] || []).find(x => x.id === clienteId);

  // Eliminar = DESHACER sus créditos (como si nunca hubieran existido). No se crean ajustes:
  // la mochila del cobrador se recalcula sola (vuelve lo prestado, salen seguro y cuotas).
  // Si el cobrador entrega ese dinero al admin, se registra con "Depósito" (monto real, confirmado).
  // Antes se sumaba monto+seguro a la cartera del admin y se restaban las cuotas dos veces.

  // Copia de archivo para poder ver su historial después de borrarlo (buscador del historial).
  // Solo la leen el buscador y el historial: no afecta mochila, cuadre ni caja.
  if (cliente) {
    const { foto, ...datosCliente } = cliente; // la foto se borra de Storage más abajo
    const archivo = {
      ...datosCliente,
      creditos: creditos.map(cr => ({ ...cr })),
      pagosVigentes: pagos.filter(p => !p.eliminado).map(p => p.id), // los que contaban al borrarlo
      eliminadoEn: new Date().toISOString(),
      eliminadoPor: state.currentUser?.id || null
    };
    try {
      await DB.set('clientes_eliminados', clienteId, archivo);
      if (Array.isArray(DB._eliminados)) {
        DB._eliminados = DB._eliminados.filter(x => x.id !== clienteId).concat({ ...archivo, id: clienteId });
      }
    } catch (e) {
      console.warn('No se pudo archivar el cliente (se elimina igual):', e);
    }
  }

  // Marcar pagos como eliminados (no borrar para preservar cuadre histórico)
  // Solo los que aún no están marcados para evitar escrituras duplicadas
  await _marcarEliminados(pagos.filter(p => !p.eliminado));

  // Borrar créditos y cliente
  await _borrarLote('creditos', creditos);
  // Eliminar foto de Storage si existe (solo en producción)
  if (!window.USE_LOCAL_MOCK && cliente?.foto && cliente.foto.includes('firebasestorage')) {
    try {
      const ref = firebase.storage().ref(`clientes/${clienteId}.jpg`);
      await ref.delete();
    } catch (e) {}
  }

  await DB.delete('clientes', clienteId);

  // Actualizar cache
  DB._cache['creditos'] = (DB._cache['creditos'] || []).filter(x => x.clienteId !== clienteId);
  DB._cache['clientes'] = (DB._cache['clientes'] || []).filter(x => x.id !== clienteId);

  console.log(`✅ Cliente ${clienteId} eliminado.`);
};

// ============================================================
// BORRAR CRÉDITO (+ sus pagos) — usado internamente
// ============================================================
window.eliminarCreditoCascade = async function (creditoId) {
  const pagos = (DB._cache['pagos'] || []).filter(x => x.creditoId === creditoId);

  await _marcarEliminados(pagos);
  await DB.delete('creditos', creditoId);

  DB._cache['creditos'] = (DB._cache['creditos'] || []).filter(x => x.id !== creditoId);

  console.log(`✅ Crédito ${creditoId} eliminado con ${pagos.length} pagos marcados.`);
};

// ============================================================
// BORRAR COBRADOR
// ============================================================
window.eliminarCobradorCascade = async function (cobradorId) {
  const gastos   = (DB._cache['gastos']   || []).filter(x => x.cobradorId === cobradorId);
  const clientes = (DB._cache['clientes'] || []).filter(x => x.cobradorId === cobradorId);

  await _borrarLote('gastos', gastos);

  // Eliminar cada cliente en cascada (créditos, pagos, ajustes contables)
  for (const c of clientes) {
    await eliminarClienteCascade(c.id);
  }

  // Limpiar movimientos_cartera del cobrador
  const movsDelCobrador = (DB._cache['movimientos_cartera'] || []).filter(m => m.cobradorId === cobradorId);
  await _borrarLote('movimientos_cartera', movsDelCobrador);

  // Limpiar notas_cuadre del cobrador
  const notasDelCobrador = (DB._cache['notas_cuadre'] || []).filter(n => n.cobradorId === cobradorId);
  await _borrarLote('notas_cuadre', notasDelCobrador);

  await fbFuncion('eliminarUsuario', { id: cobradorId }); // borra cuenta de Auth + documento

  DB._cache['gastos']               = (DB._cache['gastos']               || []).filter(x => x.cobradorId !== cobradorId);
  DB._cache['movimientos_cartera']  = (DB._cache['movimientos_cartera']  || []).filter(x => x.cobradorId !== cobradorId);
  DB._cache['notas_cuadre']         = (DB._cache['notas_cuadre']         || []).filter(x => x.cobradorId !== cobradorId);
  DB._cache['users']                = (DB._cache['users']                || []).filter(x => x.id !== cobradorId);

  console.log(`✅ Cobrador ${cobradorId} eliminado con todos sus datos.`);
};

// ============================================================
// LIMPIAR HUÉRFANOS
// ============================================================
window.limpiarHuerfanos = async function () {
  const clientes  = DB._cache['clientes']  || [];
  const creditos  = DB._cache['creditos']  || [];
  const pagos     = DB._cache['pagos']     || [];
  const gastos    = DB._cache['gastos']    || [];
  const users     = DB._cache['users']     || [];

  const clienteIds  = new Set(clientes.map(x => x.id));
  const creditoIds  = new Set(creditos.map(x => x.id));
  const cobradorIds = new Set(users.map(x => x.id));

  let borrados = 0;

  const pagosHuerfanos = pagos.filter(x =>
    !clienteIds.has(x.clienteId) || (x.creditoId && !creditoIds.has(x.creditoId))
  );
  await _marcarEliminados(pagosHuerfanos);
  borrados += pagosHuerfanos.length;
  for (const cr of creditos.filter(x => !clienteIds.has(x.clienteId))) {
    await DB.delete('creditos', cr.id); borrados++;
  }
  for (const g of gastos.filter(x => x.cobradorId && !cobradorIds.has(x.cobradorId))) {
    await DB.delete('gastos', g.id); borrados++;
  }

  // El cache se actualiza solo vía los listeners onSnapshot — no leer Firestore aquí

  console.log(`✅ Limpieza: ${borrados} documentos huérfanos eliminados.`);
  render();
  return borrados;
};