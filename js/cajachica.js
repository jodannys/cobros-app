window.getCajaChicaDelDia = function (cobradorId, fecha) {
  const gastos = DB._cache['gastos'] || [];
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const movimientos = movsCartera();
  const cajas = DB._cache['cajas'] || [];

  // 1. ARRASTRE ANTERIOR
 // Valor real (puede ser negativo si el cobrador debe): antes se mostraba 0 y la caja del día
 // no coincidía con la mochila
 let arrastreAnterior = typeof getSaldoMochilaHasta === 'function'
  ? getSaldoMochilaHasta(cobradorId, fecha)
  : 0;
  // 2. ENVÍOS (Dinero que el Admin le da al Cobrador)
  const enviadoHoyMov = movimientos
    .filter(m => m.tipo === 'envio_cobrador' && m.cobradorId === cobradorId && m.fecha === fecha)
    .reduce((s, m) => s + (Number(m.monto) || 0), 0);

  const enviadoHoyCaja = cajas
    .filter(c => c.cobradorId === cobradorId && c.fecha === fecha)
    .reduce((s, c) => s + (Number(c.monto) || 0), 0);

  const enviadoHoy = enviadoHoyMov + enviadoHoyCaja;
  const cajaInicial = arrastreAnterior + enviadoHoy;

  // 3. INGRESOS (Cobros de cuotas)
  const cuadreDelDia = typeof getCuadreDelDia === 'function'
    ? getCuadreDelDia(cobradorId, fecha)
    : { total: 0 };

  const cobrosDelDia = cuadreDelDia.total;

  // 4. EGRESOS (Gastos y Préstamos)
  const gastosDelDia = gastos.filter(g => g.cobradorId === cobradorId && g.fecha === fecha);
  const totalGastos = gastosDelDia.reduce((s, g) => s + Number(g.monto), 0);

  const prestamosHoy = creditos.filter(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    return cr.fechaInicio === fecha && cliente?.cobradorId === cobradorId;
  });
  const totalPrestadoHoy = prestamosHoy.reduce((s, cr) => s + Number(cr.monto), 0);

  // Seguros del día
  const segurosDelDia = creditos.filter(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    return cr.fechaInicio === fecha && cliente?.cobradorId === cobradorId && cr.seguro && cr.montoSeguro > 0;
  });
  const totalSeguros = segurosDelDia.reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

  // 5. Restar lo que el cobrador DEVOLVIÓ al Admin hoy
  const entregadoHoy = movimientos
    .filter(m =>
      m.cobradorId === cobradorId &&
      m.fecha === fecha &&
      m.tipo === 'confirmar_yape'
    )
    .reduce((s, m) => s + (Number(m.monto) || 0), 0);

  // Ajustes negativos del día (bajas de pago, eliminación de créditos, etc.)
  const ajustesDelDia = movimientos.filter(m =>
    m.cobradorId === cobradorId &&
    m.fecha === fecha &&
    m.tipo === 'gasto_cobrador' &&
    !esAjusteDePago(m) // el pago eliminado/corregido ya se refleja en los cobros del día
  );
  const ajustesHoy = ajustesDelDia.reduce((s, m) => s + (Number(m.monto) || 0), 0);

  // Gastos visibles = gastos normales + ajustes del sistema
  const gastosUnificados = [
    ...gastosDelDia,
    ...ajustesDelDia.map(m => ({
      id: m.id,
      descripcion: `⚙️ ${m.descripcion || 'Ajuste sistema'}`,
      monto: m.monto,
      fecha: m.fecha,
      _esAjuste: true
    }))
  ];

  // 6. SALDO FINAL
  const saldo = cajaInicial + cobrosDelDia - totalPrestadoHoy - totalGastos - entregadoHoy - ajustesHoy;

  return {
    cajaInicial,
    arrastreAnterior,
    enviadoHoy,
    cobrosDelDia,
    totalGastos: totalGastos + ajustesHoy,
    totalPrestadoHoy,
    totalSeguros,
    segurosDelDia,
    entregadoHoy,
    saldo,
    gastos: gastosUnificados
  };
};
// (Se quitaron renderPanelCajaChica y renderCajaChicaAdmin: no se usaban en ninguna pantalla.
//  La caja del día se muestra con _renderCajaChicaPro en cuadre.js.)

// ── Acciones de Gasto ─────────────────────────────────────────────

window.guardarGasto = async function () {
const monto = parseMonto(document.getElementById('gMonto').value);
  const descripcion = document.getElementById('gDescripcion').value.trim();
  const fecha = document.getElementById('gFecha').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!descripcion) { alert('Ingresa una descripción'); return; }
  if (!fecha) { alert('Selecciona una fecha'); return; }

  const cobradorId = state.currentUser.role === 'admin' && state._gastoCobradorId
    ? state._gastoCobradorId
    : state.currentUser.id;

  const id = genId();
  const nuevoGasto = { id, cobradorId, monto, descripcion, fecha, registradoPor: state.currentUser.id };

  try {
    await DB.set('gastos', id, nuevoGasto);
    state.modal = null;
    state._gastoCobradorId = null;
    showToast('Gasto registrado');
    render();
  } catch (e) {
    alert('Error al guardar gasto: ' + mensajeError(e));
  }
};

window.abrirEditarGasto = function (gastoId) {
  state._editGastoId = gastoId;
  state.modal = 'editar-gasto';
  render();
};

window.guardarEdicionGasto = async function () {
  const monto = parseMonto(document.getElementById('gMontoEdit').value);
  const descripcion = document.getElementById('gDescripcionEdit').value.trim();
  const fecha = document.getElementById('gFechaEdit').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!descripcion) { alert('Ingresa una descripción'); return; }
  if (!fecha) { alert('Selecciona una fecha'); return; }

  try {
    await DB.update('gastos', state._editGastoId, { monto, descripcion, fecha });
    state.modal = null;
    state._editGastoId = null;
    showToast('Gasto actualizado');
    render();
  } catch (e) {
    alert('Error al editar gasto: ' + mensajeError(e));
  }
};

window.eliminarGasto = async function () {
  if (!await showConfirm('¿Eliminar este gasto?', { danger: true, confirmText: 'Eliminar' })) return;
  try {
    await DB.delete('gastos', state._editGastoId);
    state.modal = null;
    state._editGastoId = null;
    showToast('Gasto eliminado');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + mensajeError(e));
  }
};

window.renderModalEditarGasto = function () {
  const gasto = (DB._cache['gastos'] || []).find(g => g.id === state._editGastoId);
  if (!gasto) return '<div class="modal-handle"></div><p>Gasto no encontrado</p>';

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Editar Gasto</div>

  <div class="form-group">
    <label>Descripción *</label>
    <input class="form-control" id="gDescripcionEdit" value="${esc(gasto.descripcion)}">
  </div>

  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="gMontoEdit" type="number" step="0.01" value="${gasto.monto}">
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input type="hidden" id="gFechaEdit" value="${gasto.fecha}">
    ${renderDatePicker({ value: gasto.fecha, onChange: "document.getElementById('gFechaEdit').value=VALUE" })}
  </div>

  <button class="btn btn-primary" onclick="guardarEdicionGasto()">
    Guardar cambios
  </button>

  <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border)">
    <button class="btn btn-danger" onclick="eliminarGasto()">
      Eliminar gasto
    </button>
  </div>`;
};
window.renderModalNuevoGasto = function () {
  const isAdmin = state.currentUser.role === 'admin';
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Registrar Gasto</div>

  ${isAdmin ? `
  <div class="form-group">
    <label>Cobrador</label>
    ${renderCustomSelect({
      id: 'cs-gCobrador',
      value: state._gastoCobradorId || '',
      onChange: "state._gastoCobradorId=VALUE",
      options: [
        { value: '', label: 'Seleccione cobrador...' },
        ...cobradores.map(u => ({ value: u.id, label: u.nombre }))
      ],
      placeholder: 'Seleccione cobrador...'
    })}
  </div>` : ''}

  <div class="form-group">
    <label>Descripción *</label>
    <input class="form-control" id="gDescripcion" placeholder="Ej: gasolina, aceite...">
  </div>

  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="gMonto" type="number" placeholder="0.00" step="0.01">
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input type="hidden" id="gFecha" value="${today()}">
    ${renderDatePicker({ value: today(), onChange: "document.getElementById('gFecha').value=VALUE" })}
  </div>

  <button class="btn btn-danger" style="font-weight:700" onclick="guardarGasto()">
    Registrar Gasto
  </button>`;
};

// ── Asignación de Caja (Solo Admin) ──────────────────────────────

window.renderModalAsignarCaja = function () {
  const u = state._cajaCobrador;
  if (!u) return '';
  const fechaModal = state._fechaCobrador || today();
  const cajas = DB._cache['cajas'] || [];
  const cajaExistente = cajas.find(c => c.cobradorId === u.id && c.fecha === fechaModal);
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💼 Caja Chica — ${esc(u.nombre)}</div>
  <div class="form-group">
    <label>Fecha</label>
    <input type="hidden" id="cajaFecha" value="${fechaModal}">
    ${renderDatePicker({ value: fechaModal, onChange: "onCajaFechaChange(VALUE)" })}
  </div>
  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    <div style="font-size:13px;color:var(--muted)">Monto asignado para esta fecha</div>
    <div style="font-size:22px;font-weight:800" id="cajaMontoActual">
      ${formatMoney(cajaExistente?.monto || 0)}
    </div>
  </div>
  <div class="form-group">
    <label>Nuevo monto (S/)</label>
    <input class="form-control" id="cajaMonto" type="number" placeholder="0.00" step="0.01">
  </div>
  <button class="btn btn-primary" style="width:100%;font-weight:700" onclick="guardarCajaChica()">Guardar</button>`;
};

window.onCajaFechaChange = function (nuevaFecha) {
  document.getElementById('cajaFecha').value = nuevaFecha;
  state._fechaCobrador = nuevaFecha;
  const u = state._cajaCobrador;
  const cajas = DB._cache['cajas'] || [];
  const existe = cajas.find(c => c.cobradorId === u.id && c.fecha === nuevaFecha);
  const el = document.getElementById('cajaMontoActual');
  if (el) el.textContent = existe ? 'S/ ' + Number(existe.monto).toFixed(2) : 'S/ 0.00';
};

window.guardarCajaChica = async function () {
  const u = state._cajaCobrador;
  const monto = parseFloat(document.getElementById('cajaMonto').value);
  const fecha = document.getElementById('cajaFecha').value;
  if (!u || isNaN(monto) || monto <= 0) { alert('Ingresa un monto válido (mayor a cero)'); return; }
  const cajas = DB._cache['cajas'] || [];
  const existente = cajas.find(c => c.cobradorId === u.id && c.fecha === fecha);
  try {
    if (existente) {
      await DB.update('cajas', existente.id, { monto });
      existente.monto = monto;
    } else {
      const id = genId();
      const nuevaCaja = { id, cobradorId: u.id, monto, fecha, asignadoPor: state.currentUser.id };
      await DB.set('cajas', id, nuevaCaja);
    }
    state.modal = null;
    state._cajaCobrador = null;
    showToast('Caja chica actualizada');
    render();
  } catch (e) {
    alert('Error: ' + mensajeError(e));
  }
};

window.abrirAsignarCaja = function (cobradorId) {
  const u = (DB._cache['users'] || []).find(x => x.id === cobradorId);
  state._cajaCobrador = u;
  state._fechaCobrador = today();
  state.modal = 'asignar-caja';
  render();
};

window.abrirNuevoGastoAdmin = function (cobradorId) {
  state._gastoCobradorId = cobradorId;
  state.modal = 'nuevo-gasto';
  render();
};
// Bloqueo contra doble toque
window.guardarGasto = unaVez(window.guardarGasto);
window.guardarEdicionGasto = unaVez(window.guardarEdicionGasto);
window.guardarCajaChica = unaVez(window.guardarCajaChica);
