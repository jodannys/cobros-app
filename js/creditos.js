// ============================================================
// GESTIÓN DE CRÉDITOS Y PAGOS
// ============================================================
window.registrarPagoSeguro = function (btn, creditoId) {
  if (btn.dataset.loading === 'true') return;
  btn.dataset.loading = 'true';
  btn.style.opacity = '0.5';
  btn.innerHTML = '⌛ Procesando...';

  openRegistrarPago(creditoId);

  setTimeout(() => {
    btn.dataset.loading = 'false';
    btn.style.opacity = '1';
    btn.innerHTML = '💰 Registrar pago';
  }, 2000);
};

window.renderCreditoCard = function (cr) {
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = Math.max(0, cr.total - totalPagado);
  const pagadoReal = saldo <= 0;
  const progreso = Math.min(100, Math.round((totalPagado / cr.total) * 100));
  const isAdmin = state.currentUser.role === 'admin';
  const hoyStr = today();
  const vencido = cr.activo && cr.fechaFin && hoyStr > cr.fechaFin;
  const infoMora = obtenerDatosMora(cr);
  const mora = infoMora.total;
  const totalConMora = saldo + mora;
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);

  return `
  <div class="credito-card" style="padding:16px; margin-bottom:12px; border-radius:10px">

    <!-- ENCABEZADO -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px">
      <div>
        <div style="font-size:10.5px; font-weight:700; color:var(--muted); text-transform:uppercase;
                    letter-spacing:0.6px; margin-bottom:4px">Monto prestado</div>
        <div style="font-size:26px; font-weight:800; color:var(--text); letter-spacing:-0.5px; line-height:1">
          ${formatMoney(cr.monto)}
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px">
        <span class="tag ${!pagadoReal ? 'tag-blue' : 'tag-green'}" style="font-size:12px; padding:4px 12px">
          ${!pagadoReal ? 'Debe ' + formatMoney(saldo) : '✓ Pagado'}
        </span>
        ${cr.seguro ? `
          <span style="background:#fff7ed; color:#c2410c; padding:3px 10px;
                       border-radius:6px; font-size:10.5px; font-weight:700">
            🛡️ Seguro ${cr.porcentajeSeguro}%
          </span>` : ''}
      </div>
    </div>

    <!-- SEGURO -->
    ${cr.seguro ? `
    <div style="background:#fff7ed; border-radius:8px; padding:10px 12px; margin-bottom:12px">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
        <div>
          <div style="font-size:10.5px; color:#c2410c; font-weight:700; text-transform:uppercase;
                      letter-spacing:0.4px; margin-bottom:3px">🛡️ Seguro cobrado</div>
          <div style="font-weight:800; color:#c2410c; font-size:15px">${formatMoney(cr.montoSeguro)}</div>
        </div>
        <div>
          <div style="font-size:10.5px; color:var(--primary); font-weight:700; text-transform:uppercase;
                      letter-spacing:0.4px; margin-bottom:3px">💵 Entregado</div>
          <div style="font-weight:800; color:var(--primary); font-size:15px">${formatMoney(cr.montoEntregado)}</div>
        </div>
      </div>
    </div>` : ''}

    <!-- TOTAL Y CUOTA -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px">
      <div style="background:var(--bg); border-radius:8px; padding:10px 12px">
        <div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;
                    letter-spacing:0.4px; margin-bottom:3px">Total a pagar</div>
        <div style="font-size:15px; font-weight:800; color:var(--text)">${formatMoney(cr.total)}</div>
      </div>
      <div style="background:var(--bg); border-radius:8px; padding:10px 12px">
        <div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;
                    letter-spacing:0.4px; margin-bottom:3px">Cuota diaria</div>
        <div style="font-size:15px; font-weight:800; color:var(--text)">${formatMoney(cr.cuotaDiaria)}</div>
      </div>
    </div>

    ${renderFechasCredito(cr)}

    <!-- PAGADO / SALDO -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0">
      <div style="background:#f0fdf4; border-radius:8px; padding:10px 12px">
        <div style="font-size:10.5px; color:#166534; font-weight:700; text-transform:uppercase;
                    letter-spacing:0.4px; margin-bottom:3px">✅ Pagado</div>
        <div style="font-size:15px; font-weight:800; color:#166534">${formatMoney(totalPagado)}</div>
      </div>
      <div style="background:${saldo > 0 ? '#fff1f2' : '#f0fdf4'}; border-radius:8px; padding:10px 12px">
        <div style="font-size:10.5px; color:${saldo > 0 ? '#9f1239' : '#166534'}; font-weight:700;
                    text-transform:uppercase; letter-spacing:0.4px; margin-bottom:3px">
          ${saldo > 0 ? '⏳ Saldo' : '✓ Saldado'}
        </div>
        <div style="font-size:15px; font-weight:800; color:${saldo > 0 ? 'var(--danger)' : '#166534'}">
          ${formatMoney(saldo)}
        </div>
      </div>
    </div>

    <!-- MORA -->
    ${mora > 0 ? `
    <div style="background:#fff1f2; border-radius:8px; padding:12px 14px; margin:12px 0;
                border-left:3px solid var(--danger)">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
        <span style="font-size:12.5px; color:var(--danger); font-weight:700">
          ⚠️ Mora (${infoMora.dias} días)
        </span>
        <span style="font-weight:800; color:var(--danger); font-size:15px">${formatMoney(mora)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding-top:8px; border-top:1px dashed #fecdd3">
        <span style="font-size:13px; font-weight:700; color:var(--text)">Total con mora</span>
        <span style="font-weight:900; font-size:17px; color:var(--danger)">${formatMoney(totalConMora)}</span>
      </div>
      <div style="font-size:11px; color:#9f1239; margin-top:6px; font-style:italic">
        S/ 5.00 por cada día de atraso
      </div>
    </div>` : ''}

    <!-- PROGRESO -->
    <div style="margin:12px 0 6px">
      <div style="display:flex; justify-content:space-between; font-size:11.5px;
                  color:var(--muted); margin-bottom:6px">
        <span>${cuotasCubiertas} de ${cr.diasTotal} cuotas</span>
        <span style="font-weight:700; color:${progreso >= 100 ? 'var(--success)' : 'var(--primary)'}">
          ${progreso}% pagado
        </span>
      </div>
      <div class="progress-bar" style="height:5px; border-radius:4px">
        <div class="progress-fill" style="width:${progreso}%; border-radius:4px"></div>
      </div>
    </div>

    <!-- ACCIONES -->
    ${cr.activo ? `
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:14px">
      <button class="btn btn-success"
        id="btn-pago-${cr.id}"
        style="height:46px; font-size:14px; font-weight:700; width:100%; display:flex; align-items:center; justify-content:center; gap:8px"
        onclick="ejecutarPagoProtegido(this, '${cr.id}')">
        <span id="icon-${cr.id}">💰</span>
        <span id="text-${cr.id}">Registrar pago</span>
      </button>
      ${isAdmin ? `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
          <button class="btn btn-outline btn-sm" onclick="cerrarCredito('${cr.id}')">
            ✓ Cerrar crédito
          </button>
          <button class="btn btn-sm"
            style="background:${cr.mora_activa ? '#fff1f2' : '#f0fdf4'};
                   color:${cr.mora_activa ? 'var(--danger)' : 'var(--success)'};
                   border:1.5px solid ${cr.mora_activa ? '#fecdd3' : '#bbf7d0'}"
            onclick="toggleMora('${cr.id}',${cr.mora_activa ? 'false' : 'true'})">
            ${cr.mora_activa ? '🔕 Sin mora' : '🔔 Activar mora'}
          </button>
        </div>
        <button class="btn btn-sm btn-outline" onclick="abrirEditarCredito('${cr.id}')">
          ✏️ Corregir monto
        </button>` :
        vencido ? `
        <div style="text-align:center; font-size:12px; color:var(--danger); font-weight:600">
          ⚠️ Coordina con el administrador
        </div>` : ''}
    </div>` : `
    <div style="background:#f0fdf4; border-radius:8px; padding:10px 14px; font-size:13px;
                color:#166534; font-weight:600; text-align:center; margin-top:12px">
      ✅ Crédito cerrado
    </div>
    ${isAdmin ? `
      <button class="btn btn-sm btn-outline" style="margin-top:8px" onclick="reabrirCredito('${cr.id}')">
        🔓 Reabrir crédito
      </button>` : ''}`}

    ${renderEsquemaCuotas(cr)}

    <!-- HISTORIAL DE PAGOS -->
    ${pagos.length > 0 ? `
    <div style="margin-top:14px">
      <div style="font-size:10.5px; font-weight:700; color:var(--muted); text-transform:uppercase;
                  letter-spacing:0.6px; margin-bottom:10px">Historial de pagos</div>
      ${pagos.slice().reverse().map(p => `
        <div class="cuota-item" style="display:flex; align-items:center; padding:10px 0;
                                       border-bottom:1px solid var(--border)">
          <div style="flex:1; min-width:0">
            <div style="font-weight:600; font-size:13.5px; color:var(--text)">${formatDate(p.fecha)}</div>
            <div style="display:flex; align-items:center; gap:6px; margin-top:3px">
              <span style="font-size:10.5px; background:var(--bg); color:var(--muted);
                           padding:2px 8px; border-radius:6px; font-weight:600; text-transform:capitalize">
                ${p.tipo}
              </span>
              ${p.aplicadoMora ? `
                <span style="font-size:10.5px; background:#fff1f2; color:#9f1239;
                             padding:2px 8px; border-radius:6px; font-weight:600">
                  mora incluida
                </span>` : ''}
            </div>
          </div>
          <div style="font-weight:800; font-size:15px; color:var(--success);
                      margin-right:${isAdmin ? '10px' : '0'}; flex-shrink:0; letter-spacing:-0.3px">
            ${formatMoney(p.monto)}
          </div>
          ${isAdmin ? `
            <button onclick="abrirEditarPago('${p.id}')"
              style="width:30px; height:30px; border-radius:8px; border:none;
                     background:var(--bg); color:var(--muted); font-size:13px;
                     cursor:pointer; display:flex; align-items:center; justify-content:center;
                     flex-shrink:0">✏️</button>` : ''}
        </div>`).join('')}
    </div>` : ''}

  </div>`;
};

window.renderFechasCredito = function (cr) {
  const fechaFin = calcularFechaFin(cr.fechaInicio, cr.diasTotal);
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);

  return `
  <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:4px">
    <div style="display:flex; align-items:center; gap:6px; background:var(--bg);
                padding:6px 12px; border-radius:8px">
      <span style="font-size:13px">📅</span>
      <div>
        <div style="font-size:10px; color:var(--muted); font-weight:700;
                    text-transform:uppercase; letter-spacing:0.4px">Inicio</div>
        <div style="font-size:13px; font-weight:700; color:var(--text)">${formatDate(cr.fechaInicio)}</div>
      </div>
    </div>
    <div style="display:flex; align-items:center; gap:6px;
                background:${vencido ? '#fff1f2' : 'var(--bg)'};
                padding:6px 12px; border-radius:8px">
      <span style="font-size:13px">${vencido ? '🔴' : '🟢'}</span>
      <div>
        <div style="font-size:10px; color:${vencido ? '#9f1239' : 'var(--muted)'}; font-weight:700;
                    text-transform:uppercase; letter-spacing:0.4px">Fin</div>
        <div style="font-size:13px; font-weight:700; color:${vencido ? 'var(--danger)' : 'var(--text)'}">
          ${fechaFin}
          ${vencido ? `<span style="background:#fecdd3; color:#9f1239; padding:1px 7px;
                                   border-radius:4px; font-size:10px; font-weight:700;
                                   margin-left:6px">VENCIDO</span>` : ''}
        </div>
      </div>
    </div>
  </div>`;
};

// ── calcularCredito ───────────────────────────────────────────
window.calcularCredito = function () {
  const monto = parseFloat(document.getElementById('crMonto')?.value) || 0;
  if (monto <= 0) {
    const prev = document.getElementById('crPreview');
    if (prev) prev.style.display = 'none';
    return;
  }

  const plan = document.getElementById('crPlan')?.value || 'A';
  const diasTotal = plan === 'B' ? 20 : 24;
  const elPlazo = document.getElementById('crPlazo');
  if (elPlazo) elPlazo.textContent = diasTotal + ' días';
  const pctInteres = 0.20; // siempre 20%
  const interes = monto * pctInteres;
  const total = monto + interes;
  const cuota = total / diasTotal;

  const preview = document.getElementById('crPreview');
  if (preview) preview.style.display = 'block';
  const elInteres = document.getElementById('crInteres');
  const elTotal = document.getElementById('crTotal');
  const elCuota = document.getElementById('crCuota');
  if (elInteres) elInteres.textContent = formatMoney(interes);
  if (elTotal) elTotal.textContent = formatMoney(total);
  if (elCuota) elCuota.textContent = formatMoney(cuota);

  // Seguro
  const seguroActivo = state._crSeguro !== false;
  const seguroPreview = document.getElementById('crSeguroPreview');
  if (seguroPreview) {
    if (seguroActivo) {
      const pct = state._crPctSeguro ?? 5;
      const montoSeguro = Math.round(monto * (pct / 100) * 100) / 100;
      const entregaReal = monto - montoSeguro;
      const elSeg = document.getElementById('crSeguroMonto');
      const elEnt = document.getElementById('crEntregaReal');
      if (elSeg) elSeg.textContent = formatMoney(montoSeguro);
      if (elEnt) elEnt.textContent = formatMoney(entregaReal);
      seguroPreview.style.display = 'block';
    } else {
      seguroPreview.style.display = 'none';
    }
  }
};

// ── guardarCredito ────────────────────────────────────────────
window.guardarCredito = async function () {
  const creditosExistentes = (DB._cache['creditos'] || [])
    .filter(c => c.clienteId === state.selectedClient.id && c.activo);

  if (creditosExistentes.length > 0) {
    alert('Este cliente ya tiene un crédito activo.');
    return;
  }

  const plan = document.getElementById('crPlan')?.value || 'A';
  const diasTotal = plan === 'B' ? 20 : 24;
  const pctInteres = 0.20; // siempre 20%

  const monto = parseMonto(document.getElementById('crMonto').value);
  const fechaInicio = document.getElementById('crFecha').value;
  if (monto <= 0 || !fechaInicio) { alert('Datos incompletos'); return; }

  const total = monto * (1 + pctInteres);
  const cuotaDiaria = total / diasTotal;
  const fechaFin = sumarDiasHabiles(fechaInicio, diasTotal);

  const seguroActivo = state._crSeguro !== false;
  const porcentajeSeguro = seguroActivo ? (state._crPctSeguro ?? 5) : 0;
  const montoSeguro = seguroActivo ? Math.round(monto * (porcentajeSeguro / 100)) : 0;

  const id = genId();
  const nuevoCredito = {
    id,
    clienteId: state.selectedClient.id,
    monto,
    total,
    cuotaDiaria,
    diasTotal,
    fechaInicio,
    fechaFin,
    activo: true,
    metodoPago: document.getElementById('crMetodoPago')?.value || 'Efectivo',
    seguro: seguroActivo,
    porcentajeSeguro,
    montoSeguro,
    montoEntregado: monto - montoSeguro,
    creadoEn: new Date().toISOString()
  };

  try {
    console.log("Intentando guardar nuevo crédito...", nuevoCredito);
    await DB.set('creditos', id, nuevoCredito);
    state.modal = null;
    showToast(`✅ Crédito creado con éxito`);
    render();
  } catch (error) {
    console.error("Error al guardar:", error);
    alert("Hubo un error al guardar el crédito.");
  }
};

window.cerrarCredito = async function (crId) {
  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === crId);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  if (saldo > 0) {
    if (!confirm(`¡CUIDADO! Aún debe ${formatMoney(saldo)}. ¿Cerrar de todos modos?`)) return;
  } else {
    if (!confirm('¿Marcar este crédito como pagado totalmente y cerrarlo?')) return;
  }
  await DB.update('creditos', crId, { activo: false });
  const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === crId);
  if (idx !== -1) DB._cache['creditos'][idx].activo = false;
  showToast('Crédito cerrado');
  render();
};

window.extenderCredito = async function () {
  const input = document.getElementById('extDias');
  const diasExtra = parseInt(input.value) || 0;
  if (diasExtra <= 0) return alert('⚠️ Ingresa días válidos.');

  const cr = state.selectedCredito;
  const nuevoTotalDias = Number(cr.diasTotal) + diasExtra;
  const nuevaFechaFin = sumarDiasHabiles(cr.fechaInicio, nuevoTotalDias);

  try {
    await DB.update('creditos', cr.id, {
      diasTotal: nuevoTotalDias,
      fechaFin: nuevaFechaFin
    });
    showToast(`✅ Plazo extendido hasta ${formatDate(nuevaFechaFin)}`);
    render();
  } catch (error) { console.error(error); }
};

window.guardarCompromiso = async function () {
  const fecha = document.getElementById('fechaCompromiso').value;
  if (!fecha) return alert('⚠️ Selecciona una fecha para el compromiso.');
  if (fecha < today()) return alert('⚠️ La fecha de compromiso no puede ser anterior a hoy.');

  try {
    await DB.update('creditos', state.selectedCredito.id, {
      fechaCompromiso: fecha,
      estadoCompromiso: 'pendiente'
    });
    state.selectedCredito = { ...state.selectedCredito, fechaCompromiso: fecha };
    showToast(`📅 Compromiso: ${formatDate(fecha)}`);
    render();
  } catch (error) {
    alert('❌ No se pudo guardar el compromiso.');
  }
};

window.guardarNotaCredito = async function () {
  const notaInput = document.getElementById('notaCredito');
  const notaTexto = notaInput.value.trim();
  if (!notaTexto) return alert('⚠️ Escribe algo en la nota antes de guardar.');

  try {
    const notaFinal = `${notaTexto} (Por: ${state.currentUser.nombre} - ${today()})`;
    await DB.update('creditos', state.selectedCredito.id, { nota: notaFinal });
    state.selectedCredito = { ...state.selectedCredito, nota: notaFinal };
    showToast('📝 Nota guardada correctamente');
    render();
  } catch (error) {
    alert('❌ Error al guardar la nota.');
  }
};

window.toggleMora = async function (crId, activar) {
  console.log(`--- Intentando ${activar ? 'Activar' : 'Desactivar'} Mora para ID: ${crId} ---`);

  try {
    const creditosCache = DB._cache['creditos'] || [];
    await DB.update('creditos', crId, { mora_activa: activar });

    const idx = creditosCache.findIndex(c => c.id === crId);
    if (idx >= 0) {
      creditosCache[idx].mora_activa = activar;
      if (state.selectedCredito && state.selectedCredito.id === crId) {
        state.selectedCredito.mora_activa = activar;
      }
    }

    showToast(activar ? '🔔 Mora activada — S/5 por día' : '🔕 Mora desactivada');
    render();
  } catch (error) {
    console.error("❌ Error en toggleMora:", error);
    alert("No se pudo cambiar el estado de la mora.");
  }
};

window.abrirEditarPago = function (pagoId) {
  const p = (DB._cache['pagos'] || []).find(x => x.id === pagoId);
  if (!p) return;
  state._editandoPago = p;
  state.modal = 'editar-pago';
  render();
};

window.renderModalEditarPago = function () {
  const p = state._editandoPago;
  if (!p) return '';
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === p.clienteId);

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Editar Pago</div>

  <div style="background:var(--bg); border-radius:8px; padding:10px 14px; margin-bottom:14px">
    <div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;
                letter-spacing:0.4px; margin-bottom:3px">Cliente</div>
    <div style="font-weight:700; font-size:14px; color:var(--text)">${cliente?.nombre || '—'}</div>
  </div>

  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="epMonto" type="number" step="0.01" value="${p.monto}"
      style="font-size:20px; font-weight:800; text-align:center; letter-spacing:-0.5px">
  </div>

  <div class="form-group">
    <label>Tipo de pago</label>
    <select class="form-control" id="epTipo">
      <option value="efectivo"      ${p.tipo === 'efectivo' ? 'selected' : ''}>Efectivo</option>
      <option value="yape"          ${p.tipo === 'yape' ? 'selected' : ''}>Yape / Plin</option>
      <option value="transferencia" ${p.tipo === 'transferencia' ? 'selected' : ''}>Transferencia</option>
    </select>
  </div>

  <button class="btn btn-primary" onclick="guardarPagoEditado()">
    Guardar cambios
  </button>

  <div style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border)">
    <button class="btn btn-danger" onclick="eliminarPago('${p.id}')">
      Eliminar pago
    </button>
  </div>`;
};

window.guardarPagoEditado = async function () {
  const p = state._editandoPago;
  const monto = parseMonto(document.getElementById('epMonto').value);
  const tipo = document.getElementById('epTipo').value;
  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  const updates = { monto, tipo };
  try {
    await DB.update('pagos', p.id, updates);
    const idx = (DB._cache['pagos'] || []).findIndex(x => x.id === p.id);
    if (idx !== -1) DB._cache['pagos'][idx] = { ...DB._cache['pagos'][idx], ...updates };
    state._editandoPago = null;
    state.modal = null;
    showToast('✅ Pago actualizado');
    render();
  } catch (e) {
    alert('Error al guardar: ' + e.message);
  }
};

window.eliminarPago = async function (pagoId) {
  if (!confirm('¿Eliminar este pago? Esta acción no se puede deshacer y afectará el saldo del crédito.')) return;
  try {
    await DB.delete('pagos', pagoId);
    DB._cache['pagos'] = (DB._cache['pagos'] || []).filter(p => p.id !== pagoId);
    state._editandoPago = null;
    state.modal = null;
    showToast('Pago eliminado');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
};

window.reabrirCredito = async function (crId) {
  if (!confirm('¿Reabrir este crédito? Volverá a estar activo y aparecerá en los cobros.')) return;
  await DB.update('creditos', crId, { activo: true });
  const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === crId);
  if (idx !== -1) DB._cache['creditos'][idx].activo = true;
  showToast('✅ Crédito reabierto');
  render();
};

window.nuevoCreditoRapido = function (clienteId) {
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === clienteId);
  if (!cliente) return;
  state.selectedClient = cliente;
  state.modal = 'nuevo-credito';
  render();
};

window.ejecutarPagoProtegido = function (btn, creditoId) {
  console.log("%c [CLIC DETECTADO] ", "background: #222; color: #bada55", `Intentando pagar crédito: ${creditoId}`);

  if (btn.disabled || btn.dataset.procesando === "true") {
    console.warn("%c [BLOQUEADO] ", "background: red; color: white", "Se evitó un disparo doble.");
    return;
  }

  console.log("%c [PROCESANDO...] ", "background: green; color: white", "Abriendo modal de pago...");

  btn.disabled = true;
  btn.dataset.procesando = "true";

  const icon = document.getElementById(`icon-${creditoId}`);
  const text = document.getElementById(`text-${creditoId}`);

  if (icon) icon.innerHTML = "⏳";
  if (text) text.innerText = "Procesando...";
  btn.style.opacity = "0.7";

  if (typeof openRegistrarPago === 'function') {
    openRegistrarPago(creditoId);
  } else {
    console.error("CRÍTICO: No existe la función openRegistrarPago");
  }

  setTimeout(() => {
    console.log("%c [BOTÓN LIBERADO] ", "background: blue; color: white", "El botón vuelve a estar activo.");
    btn.disabled = false;
    btn.dataset.procesando = "false";
    btn.style.opacity = "1";
    if (icon) icon.innerHTML = "💰";
    if (text) text.innerText = "Registrar pago";
  }, 3000);
};