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

  // Ajuste contable por cada crédito
  for (const cr of creditos) {
    const pagosCr      = pagos.filter(p => p.creditoId === cr.id && !p.eliminado);
    const totalPagado  = pagosCr.reduce((s, p) => s + Number(p.monto), 0);
    const montoSeguro  = Number(cr.montoSeguro || 0);
    const montoTotal   = Number(cr.monto) + montoSeguro;
    const cobradorId   = cliente?.cobradorId || null;
    const fechaAjuste  = cr.fechaInicio;

    // Devolver monto + seguro a cartera admin
    if (montoTotal > 0) {
      const id = genId();
      await DB.set('movimientos_cartera', id, {
       id, tipo: 'inyeccion', monto: montoTotal,
        descripcion: `Baja cliente`,
        fecha: fechaAjuste, cobradorId,
        registradoPor: state.currentUser.id
      });
      if (!DB._cache['movimientos_cartera']) DB._cache['movimientos_cartera'] = [];
      DB._cache['movimientos_cartera'].push({ id, tipo: 'inyeccion', monto: montoTotal,
        descripcion: `Baja cliente`, fecha: fechaAjuste, cobradorId });
    }

    // Quitar cuotas cobradas de la mochila del cobrador
    if (totalPagado > 0 && cobradorId) {
      const id2 = genId();
      await DB.set('movimientos_cartera', id2, {
        id: id2, tipo: 'gasto_cobrador', monto: totalPagado,
        descripcion: `Baja cliente`,
        fecha: fechaAjuste, cobradorId,
        registradoPor: state.currentUser.id
      });
      DB._cache['movimientos_cartera'].push({ id: id2, tipo: 'gasto_cobrador',
        monto: totalPagado, descripcion: `Baja cliente`, fecha: fechaAjuste, cobradorId });
    }
  }

  // Marcar pagos como eliminados (no borrar para preservar cuadre histórico)
  await _marcarEliminados(pagos);

  // Borrar créditos y cliente
  await _borrarLote('creditos', creditos);
  // Eliminar foto de Storage si existe
  if (cliente?.foto && cliente.foto.includes('firebasestorage')) {
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

  await DB.delete('users', cobradorId);

  DB._cache['gastos']               = (DB._cache['gastos']               || []).filter(x => x.cobradorId !== cobradorId);
  DB._cache['movimientos_cartera']  = (DB._cache['movimientos_cartera']  || []).filter(x => x.cobradorId !== cobradorId);
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

  DB._cache['pagos']    = await fbGetAll('pagos');
DB._cache['creditos'] = await fbGetAll('creditos');
DB._cache['gastos']   = await fbGetAll('gastos');

  console.log(`✅ Limpieza: ${borrados} documentos huérfanos eliminados.`);
  render();
  return borrados;
};