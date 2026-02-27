window.getCajaChicaDelDia = function (cobradorId, fecha) {
  const gastos      = DB._cache['gastos']   || [];
  const creditos    = DB._cache['creditos'] || [];
  const clientes    = DB._cache['clientes'] || [];
  const movimientos = DB._cache['movimientos_cartera'] || [];
  const cajas       = DB._cache['cajas'] || []; // Tabla donde el admin asigna dinero

  // 1. ARRASTRE ANTERIOR (Con filtro de seguridad)
  let arrastreAnterior = typeof getSaldoMochilaHasta === 'function'
    ? getSaldoMochilaHasta(cobradorId, fecha)
    : 0;

  // IMPLEMENTACIÓN DE LA OPCIÓN A:
  // Si el arrastre es negativo (error acumulado), lo reseteamos a 0
  if (arrastreAnterior < 0) {
    console.warn(`Aviso: Se detectó arrastre negativo (${arrastreAnterior}) para el cobrador ${cobradorId}. Reseteando a 0.`);
    arrastreAnterior = 0;
  }

  // 2. ENVÍOS (Sumamos tanto de movimientos_cartera como de la tabla cajas para no perder nada)
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

  // 4. EGRESOS
  const gastosDelDia = gastos.filter(g => g.cobradorId === cobradorId && g.fecha === fecha);
  const totalGastos  = gastosDelDia.reduce((s, g) => s + Number(g.monto), 0);
  
  const prestamosHoy = creditos.filter(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    return cr.fechaInicio === fecha && cliente?.cobradorId === cobradorId;
  });
  const totalPrestadoHoy = prestamosHoy.reduce((s, cr) => s + Number(cr.monto), 0);

  // 5. SALDO FINAL
  const saldo = cajaInicial + cobrosDelDia - totalPrestadoHoy - totalGastos;

  return {
    cajaInicial,
    arrastreAnterior,
    enviadoHoy,
    cobrosDelDia, 
    totalGastos, 
    totalPrestadoHoy,
    saldo, 
    gastos: gastosDelDia
  };
};
// ── Render panel caja chica (cobrador) ────────────────────────────

window.renderPanelCajaChica = function () {
  const hoy        = today();
  const cobradorId = state.currentUser.id;
  const caja       = getCajaChicaDelDia(cobradorId, hoy);
  const cuadre     = typeof getCuadreDelDia === 'function'
    ? getCuadreDelDia(cobradorId, hoy)
    : { yape: 0, efectivo: 0, transferencia: 0 };

  const gastos            = caja.gastos;
  const mostrarTodos      = state._verTodosGastos || false;
  const gastosVisibles    = mostrarTodos ? gastos : gastos.slice(0, 3);
  const hayMas            = gastos.length > 3;

  return `
  <div class="card" style="margin-bottom:12px;padding:0;overflow:hidden">
    <div style="background:#1e293b;padding:14px 16px;color:white">
      <div style="font-size:11px;opacity:0.7;font-weight:700;text-transform:uppercase;margin-bottom:10px">
        💼 Caja Chica — Hoy
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;text-align:center">
        <div>
          <div style="font-size:10px;opacity:0.6">CAJA INICIAL</div>
          <div style="font-size:18px;font-weight:800">${formatMoney(caja.cajaInicial)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">COBROS DEL DÍA</div>
          <div style="font-size:18px;font-weight:800;color:#4ade80">${formatMoney(caja.cobrosDelDia)}</div>
        </div>
        ${caja.totalSeguros > 0 ? `
        <div>
          <div style="font-size:10px;opacity:0.6">🛡️ SEGUROS</div>
          <div style="font-size:18px;font-weight:800;color:#fb923c">${formatMoney(caja.totalSeguros)}</div>
        </div>` : ''}
        <div>
          <div style="font-size:10px;opacity:0.6">PRÉSTAMOS HOY</div>
          <div style="font-size:18px;font-weight:800;color:#f87171">${formatMoney(caja.totalPrestadoHoy)}</div>
        </div>
        <div>
          <div style="font-size:10px;opacity:0.6">GASTOS</div>
          <div style="font-size:18px;font-weight:800;color:#f87171">${formatMoney(caja.totalGastos)}</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:10px;text-align:center;margin-bottom:14px">
        <div style="font-size:10px;opacity:0.6;margin-bottom:4px">SALDO EN CAJA</div>
        <div style="font-size:24px;font-weight:800;color:${caja.saldo >= caja.cajaInicial ? '#4ade80' : '#fbbf24'}">
          ${formatMoney(caja.saldo)}
        </div>
      </div>
      <div style="font-size:10px;opacity:0.6;font-weight:700;text-transform:uppercase;margin-bottom:8px">Cobros por método</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:8px">
          <div style="font-size:10px;opacity:0.7">📱 Yape/Plin</div>
          <div style="font-weight:800;font-size:15px">${formatMoney(cuadre.yape)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:8px">
          <div style="font-size:10px;opacity:0.7">💵 Efectivo</div>
          <div style="font-weight:800;font-size:15px">${formatMoney(cuadre.efectivo)}</div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;padding:8px">
          <div style="font-size:10px;opacity:0.7">🏦 Transf.</div>
          <div style="font-weight:800;font-size:15px">${formatMoney(cuadre.transferencia)}</div>
        </div>
      </div>
    </div>

    <div style="padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase">
          Gastos del día (${gastos.length})
        </div>
        <button class="btn btn-sm"
          style="background:#fff5f5;color:var(--danger);border:1px solid #fed7d7;font-size:12px"
          onclick="openModal('nuevo-gasto')">+ Gasto</button>
      </div>

      ${gastos.length === 0
        ? '<div style="text-align:center;color:var(--muted);font-size:13px;padding:10px 0">Sin gastos registrados hoy</div>'
        : `
        ${gastosVisibles.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                ${g.descripcion}
              </div>
              <div style="font-size:11px;color:var(--muted)">${formatDate(g.fecha)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
              <div style="font-weight:800;color:var(--danger)">${formatMoney(g.monto)}</div>
              <button onclick="abrirEditarGasto('${g.id}')"
                style="padding:4px 8px;border-radius:6px;border:1px solid #e2e8f0;
                background:white;font-size:12px;cursor:pointer;color:#64748b;
                display:flex;align-items:center;line-height:1">✏️</button>
            </div>
          </div>`).join('')}

        ${hayMas ? `
          <button onclick="state._verTodosGastos=!state._verTodosGastos;render()"
            style="width:100%;margin-top:10px;padding:8px;border-radius:8px;
            border:1px solid #e2e8f0;background:white;font-size:13px;
            font-weight:600;color:var(--muted);cursor:pointer">
            ${mostrarTodos ? '▲ Ver menos' : `▼ Ver todos (${gastos.length})`}
          </button>` : ''}
        `}

      <!-- Seguros del día -->
      ${caja.totalSeguros > 0 ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9">
        <div style="font-size:11px;font-weight:700;color:#ea580c;text-transform:uppercase;margin-bottom:8px">
          🛡️ Seguros del día (${caja.segurosDelDia.length})
        </div>
        ${caja.segurosDelDia.map(cr => {
          const cl = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
          return `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:6px 0;border-bottom:1px solid #f8fafc">
            <div>
              <div style="font-size:13px;font-weight:600">${cl?.nombre || '—'}</div>
              <div style="font-size:11px;color:var(--muted)">${cr.porcentajeSeguro}% de ${formatMoney(cr.monto)}</div>
            </div>
            <div style="font-size:13px;font-weight:800;color:#ea580c">+${formatMoney(cr.montoSeguro)}</div>
          </div>`;
        }).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:8px 0;margin-top:4px">
          <div style="font-size:12px;font-weight:700;color:#ea580c">Total seguros</div>
          <div style="font-size:15px;font-weight:800;color:#ea580c">+${formatMoney(caja.totalSeguros)}</div>
        </div>
      </div>` : ''}
    </div>
  </div>`;
};

// ── Render caja chica para admin (expandido por cobrador) ─────────

window.renderCajaChicaAdmin = function (cobradorId, fecha) {
  const caja          = getCajaChicaDelDia(cobradorId, fecha);
  const mostrarTodos  = state[`_verGastos_${cobradorId}`] || false;
  const gastosVisible = mostrarTodos ? caja.gastos : caja.gastos.slice(0, 3);
  const hayMas        = caja.gastos.length > 3;

  return `
  <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-top:8px">
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
      💼 Caja Chica
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div style="font-size:12px;color:var(--muted)">
        Inicial: <strong>${formatMoney(caja.cajaInicial)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Cobros: <strong style="color:var(--success)">+${formatMoney(caja.cobrosDelDia)}</strong>
      </div>
      ${caja.totalSeguros > 0 ? `
      <div style="font-size:12px;color:var(--muted)">
        Seguros: <strong style="color:#ea580c">+${formatMoney(caja.totalSeguros)}</strong>
      </div>` : ''}
      <div style="font-size:12px;color:var(--muted)">
        Préstamos: <strong style="color:var(--danger)">-${formatMoney(caja.totalPrestadoHoy)}</strong>
      </div>
      <div style="font-size:12px;color:var(--muted)">
        Gastos: <strong style="color:var(--danger)">-${formatMoney(caja.totalGastos)}</strong>
      </div>
      <div style="font-size:12px;font-weight:800;grid-column:span 2">
        Saldo: <span style="color:${caja.saldo >= caja.cajaInicial ? 'var(--success)' : '#f59e0b'}">
          ${formatMoney(caja.saldo)}
        </span>
      </div>
    </div>

    ${caja.gastos.length > 0 ? `
    <div style="border-top:1px solid #e2e8f0;padding-top:8px">
      <div style="font-size:11px;font-weight:700;color:var(--muted);
        text-transform:uppercase;margin-bottom:6px">
        Gastos (${caja.gastos.length})
      </div>
      ${gastosVisible.map(g => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9">
          <span style="color:var(--muted);flex:1;min-width:0;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${g.descripcion}
          </span>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
            <span style="color:var(--danger);font-weight:600">-${formatMoney(g.monto)}</span>
            <button onclick="abrirEditarGasto('${g.id}')"
              style="padding:2px 7px;border-radius:5px;border:1px solid #e2e8f0;
              background:white;font-size:11px;cursor:pointer;color:#64748b;line-height:1.6">✏️</button>
          </div>
        </div>`).join('')}

      ${hayMas ? `
        <button onclick="state['_verGastos_${cobradorId}']=!state['_verGastos_${cobradorId}'];render()"
          style="width:100%;margin-top:8px;padding:6px;border-radius:8px;
          border:1px solid #e2e8f0;background:white;font-size:12px;
          font-weight:600;color:var(--muted);cursor:pointer">
          ${mostrarTodos ? '▲ Ver menos' : `▼ Ver todos (${caja.gastos.length})`}
        </button>` : ''}
    </div>` : ''}

    ${caja.totalSeguros > 0 ? `
    <div style="border-top:1px solid #e2e8f0;padding-top:8px;margin-top:4px">
      <div style="font-size:11px;font-weight:700;color:#ea580c;
        text-transform:uppercase;margin-bottom:6px">
        🛡️ Seguros (${caja.segurosDelDia.length})
      </div>
      ${caja.segurosDelDia.map(cr => {
        const cl = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
        return `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0">
          <span style="color:var(--muted)">${cl?.nombre || '—'} (${cr.porcentajeSeguro}%)</span>
          <span style="color:#ea580c;font-weight:700">+${formatMoney(cr.montoSeguro)}</span>
        </div>`;
      }).join('')}
    </div>` : ''}
  </div>`;
};

// ── Acciones de Gasto ─────────────────────────────────────────────

window.guardarGasto = async function () {
  const monto       = parseFloat(document.getElementById('gMonto').value);
  const descripcion = document.getElementById('gDescripcion').value.trim();
  const fecha       = document.getElementById('gFecha').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!descripcion)          { alert('Ingresa una descripción'); return; }
  if (!fecha)                { alert('Selecciona una fecha'); return; }

  const cobradorId = state.currentUser.role === 'admin' && state._gastoCobradorId
    ? state._gastoCobradorId
    : state.currentUser.id;

  const id         = genId();
  const nuevoGasto = { id, cobradorId, monto, descripcion, fecha, registradoPor: state.currentUser.id };

  try {
    await DB.set('gastos', id, nuevoGasto);
    state.modal            = null;
    state._gastoCobradorId = null;
    showToast('Gasto registrado');
    render();
  } catch (e) {
    alert('Error al guardar gasto: ' + e.message);
  }
};

window.abrirEditarGasto = function (gastoId) {
  state._editGastoId = gastoId;
  state.modal        = 'editar-gasto';
  render();
};

window.guardarEdicionGasto = async function () {
  const monto       = parseFloat(document.getElementById('gMontoEdit').value);
  const descripcion = document.getElementById('gDescripcionEdit').value.trim();
  const fecha       = document.getElementById('gFechaEdit').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!descripcion)          { alert('Ingresa una descripción'); return; }
  if (!fecha)                { alert('Selecciona una fecha'); return; }

  try {
    await DB.update('gastos', state._editGastoId, { monto, descripcion, fecha });
    state.modal        = null;
    state._editGastoId = null;
    showToast('Gasto actualizado');
    render();
  } catch (e) {
    alert('Error al editar gasto: ' + e.message);
  }
};

window.eliminarGasto = async function () {
  if (!confirm('¿Eliminar este gasto?')) return;
  try {
    await DB.delete('gastos', state._editGastoId);
    state.modal        = null;
    state._editGastoId = null;
    showToast('Gasto eliminado');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
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
    <input class="form-control" id="gDescripcionEdit" value="${gasto.descripcion}">
  </div>

  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="gMontoEdit" type="number" step="0.01" value="${gasto.monto}">
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="gFechaEdit" type="date" value="${gasto.fecha}">
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
  const isAdmin    = state.currentUser.role === 'admin';
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Registrar Gasto</div>

  ${isAdmin ? `
  <div class="form-group">
    <label>Cobrador</label>
    <select class="form-control" id="gCobrador" onchange="state._gastoCobradorId=this.value">
      <option value="">Seleccione cobrador...</option>
      ${cobradores.map(u => `
        <option value="${u.id}" ${u.id === state._gastoCobradorId ? 'selected' : ''}>${u.nombre}</option>
      `).join('')}
    </select>
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
    <input class="form-control" id="gFecha" type="date" value="${today()}">
  </div>

  <button class="btn btn-danger" style="font-weight:700" onclick="guardarGasto()">
    Registrar Gasto
  </button>`;
};

// ── Asignación de Caja (Solo Admin) ──────────────────────────────

window.renderModalAsignarCaja = function () {
  const u = state._cajaCobrador;
  if (!u) return '';
  const fechaModal    = state._fechaCobrador || today();
  const cajas         = DB._cache['cajas'] || [];
  const cajaExistente = cajas.find(c => c.cobradorId === u.id && c.fecha === fechaModal);
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💼 Caja Chica — ${u.nombre}</div>
  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="cajaFecha" type="date" value="${fechaModal}"
      onchange="
        const nuevaFecha = this.value;
        state._fechaCobrador = nuevaFecha;
        const cajas = DB._cache['cajas'] || [];
        const existe = cajas.find(c => c.cobradorId === '${u.id}' && c.fecha === nuevaFecha);
        const el = document.getElementById('cajaMontoActual');
        if (el) el.textContent = existe ? 'S/ ' + Number(existe.monto).toFixed(2) : 'S/ 0.00';
      ">
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

window.guardarCajaChica = async function () {
  const u          = state._cajaCobrador;
  const monto      = parseFloat(document.getElementById('cajaMonto').value);
  const fecha      = document.getElementById('cajaFecha').value;
  if (!u || isNaN(monto) || monto < 0) { alert('Ingresa un monto válido'); return; }
  const cajas     = DB._cache['cajas'] || [];
  const existente = cajas.find(c => c.cobradorId === u.id && c.fecha === fecha);
  try {
    if (existente) {
      await DB.update('cajas', existente.id, { monto });
      existente.monto = monto;
    } else {
      const id        = genId();
      const nuevaCaja = { id, cobradorId: u.id, monto, fecha, asignadoPor: state.currentUser.id };
      await DB.set('cajas', id, nuevaCaja);
      if (!DB._cache['cajas']) DB._cache['cajas'] = [];
      DB._cache['cajas'].push(nuevaCaja);
    }
    state.modal         = null;
    state._cajaCobrador = null;
    showToast('Caja chica actualizada');
    render();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

window.abrirAsignarCaja = function (cobradorId) {
  const u = (DB._cache['users'] || []).find(x => x.id === cobradorId);
  state._cajaCobrador  = u;
  state._fechaCobrador = today();
  state.modal          = 'asignar-caja';
  render();
};

window.abrirNuevoGastoAdmin = function (cobradorId) {
  state._gastoCobradorId = cobradorId;
  state.modal            = 'nuevo-gasto';
  render();
};