// ============================================================
// 1. CANDADO EN STATE (no en variable local)
// ============================================================
window.deshabilitarBotonesPago = function (estado) {
  document.querySelectorAll('button[id^="btn-pago-"]').forEach(btn => {
    btn.disabled = estado;
    btn.style.opacity = estado ? '0.5' : '1';
  });
  document.querySelectorAll('button[onclick*="pagoRapido"]').forEach(btn => {
    btn.disabled = estado;
    btn.style.opacity = estado ? '0.5' : '1';
  });
};

// ============================================================
// 2. EJECUTAR PAGO PROTEGIDO
// ============================================================
window.ejecutarPagoProtegido = function (btn, creditoId) {

  if (state._pagoProcesando) {
    console.warn("⚠️ Ya hay un pago en proceso. Ignorando clic.");
    return;
  }
  if (btn.disabled) {
    console.warn("⚠️ Botón deshabilitado. Ignorando clic.");
    return;
  }

  state._pagoProcesando = true;
  deshabilitarBotonesPago(true);

  const icon = document.getElementById(`icon-${creditoId}`);
  const text = document.getElementById(`text-${creditoId}`);
  if (icon) icon.innerHTML = "⏳";
  if (text) text.innerText = "Procesando...";

  openRegistrarPago(creditoId);
};

// ============================================================
// 3. ABRIR MODAL DE PAGO
// ============================================================
window.openRegistrarPago = function (crId) {
  if (state.modal && state.modal !== 'registrar-pago') {
    state.modal = null;
  }

  const cr = (DB._cache['creditos'] || []).find(x => x.id === crId);
  if (!cr) {
    console.error("❌ Crédito no encontrado");
    state._pagoProcesando = false;
    deshabilitarBotonesPago(false);
    return;
  }

  state.selectedCredito = cr;
  state.modal = 'registrar-pago';
  render();
};

// ============================================================
// 4. PAGO RÁPIDO
// ============================================================
window.pagoRapido = function (crId) {
  if (state._pagoProcesando) {
    console.warn("⚠️ Ya hay un pago en proceso.");
    return;
  }

  console.log(`[PAGO RÁPIDO] Crédito: ${crId}`);
  state._pagoProcesando = true;
  deshabilitarBotonesPago(true);

  const cr = (DB._cache['creditos'] || []).find(x => x.id === crId);
  if (!cr) {
    state._pagoProcesando = false;
    deshabilitarBotonesPago(false);
    return;
  }

  state.selectedCredito = cr;
  state.modal = 'registrar-pago';
  render();
};

// ============================================================
// 5. GUARDAR PAGO
// ============================================================
window.guardarPago = async function () {
  try {
    const cr = state.selectedCredito;
    const montoInput = document.getElementById('pMonto');
    const monto = parseMonto(montoInput.value);
    const fecha = document.getElementById('pFecha').value;
    const nota = document.getElementById('pNota').value.trim();
    const tipo = window._pagoTipo || 'efectivo';

    if (!cr || !monto || monto <= 0 || !fecha) {
      alert('Por favor, ingresa un monto válido y la fecha.');
      return;
    }

    const btnConfirmar = document.querySelector('button[onclick="guardarPago()"]');
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '⏳ Guardando...';
    }

    const pagosAnteriores = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id && !p.eliminado);
    const totalPagadoAntes = pagosAnteriores.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    const saldoRestante = Math.max(0, cr.total - totalPagadoAntes);

    const infoMora = typeof obtenerDatosMora === 'function' ? obtenerDatosMora(cr) : { total: 0 };
    const moraActual = infoMora.total;

    let aplicadoMora = Math.min(monto, moraActual);
    let aplicadoSaldo = Math.min(monto - aplicadoMora, saldoRestante);

    const clienteDePago = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
    const users = DB._cache['users'] || [];
    const cobradorCandidato = state.currentUser.role === 'admin'
      ? (clienteDePago?.cobradorId || state.currentUser.id)
      : state.currentUser.id;
    // Validar que el cobrador exista; si no, caer al usuario actual
    const cobradorDelPago = users.some(u => u.id === cobradorCandidato)
      ? cobradorCandidato
      : state.currentUser.id;

    const id = genId();
    const ts = new Date().toISOString();
    const nuevoPago = {
      id,
      creditoId: cr.id,
      clienteId: cr.clienteId,
      registradoPor: state.currentUser.id,
      cobradorId: cobradorDelPago,
      monto,
      aplicadoSaldo,
      aplicadoMora,
      tipo,
      fecha,
      nota,
      creadoEn: ts,
      updatedAt: new Date()
    };

    const creditoSeCierra = (totalPagadoAntes + aplicadoSaldo) >= cr.total && (moraActual - aplicadoMora) <= 0;

    // Escritura atómica: pago + cierre de crédito (si aplica) en un solo commit
    const ops = [{ op: 'set', col: 'pagos', id, data: nuevoPago }];
    if (creditoSeCierra) {
      ops.push({ op: 'update', col: 'creditos', id: cr.id, data: { activo: false, updatedAt: new Date() } });
    }
    await fbBatch(ops);

    // Actualizar cache local
    if (!DB._cache['pagos'].some(p => p.id === id)) {
      DB._cache['pagos'].push(nuevoPago);
    }

    if (creditoSeCierra) {
      const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === cr.id);
      if (idx !== -1) DB._cache['creditos'][idx].activo = false;
      showToast('🎉 ¡Crédito completado!');
    } else {
      showToast('💰 Pago registrado con éxito');
    }

    state.modal = null;
    state.selectedCredito = null;
    render();

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
    alert('Error al guardar: ' + error.message);
  } finally {
    state._pagoProcesando = false;
    deshabilitarBotonesPago(false);
  }
};

// ============================================================
// 6. RENDERIZAR MODAL
// ============================================================
window.renderModalRegistrarPago = function () {
  const cr = state.selectedCredito;
  if (!cr) return '';

  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id && !p.eliminado);
  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, cr.total - totalPagado);

  const infoMora = typeof obtenerDatosMora === 'function' ? obtenerDatosMora(cr) : { total: 0, dias: 0 };
  const totalConMora = saldo + infoMora.total;
  window._pagoTipo = 'efectivo';

  // Fecha forzada a Lima
  const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Registrar Pago</div>

  <div style="background:var(--bg); border-radius:10px; padding:14px; margin-bottom:14px">
    <div style="display:flex; justify-content:space-between; margin-bottom:8px">
      <span style="color:var(--muted); font-size:13px">Saldo pendiente:</span>
      <span style="font-weight:700; color:var(--text)">${formatMoney(saldo)}</span>
    </div>
    ${infoMora.total > 0 ? `
    <div style="display:flex; justify-content:space-between; color:var(--danger); font-size:13px">
      <span>Mora (${infoMora.dias} días):</span>
      <span style="font-weight:700">${formatMoney(infoMora.total)}</span>
    </div>` : ''}
  </div>

  <div class="form-group">
    <label>Monto recibido (S/)</label>
    <input class="form-control" id="pMonto" type="number" step="0.01"
      value="${infoMora.total > 0 ? totalConMora : Math.min(cr.cuotaDiaria, saldo)}"
      style="font-size:20px; font-weight:800; text-align:center">
  </div>

  <div class="form-group">
    <label>Forma de pago</label>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px">
      <button type="button" onclick="document.querySelectorAll('.pago-tipo').forEach(b=>b.style.border='1.5px solid var(--border)'); this.style.border='2px solid var(--primary)'; window._pagoTipo='efectivo'"
        class="pago-tipo" style="padding:10px 6px; border-radius:8px; border:2px solid var(--primary); background:white; font-size:12px; display:flex; flex-direction:column; align-items:center; gap:4px">
        <span>💵</span><span>Efectivo</span>
      </button>
      <button type="button" onclick="document.querySelectorAll('.pago-tipo').forEach(b=>b.style.border='1.5px solid var(--border)'); this.style.border='2px solid var(--primary)'; window._pagoTipo='yape'"
        class="pago-tipo" style="padding:10px 6px; border-radius:8px; border:1.5px solid var(--border); background:white; font-size:12px; display:flex; flex-direction:column; align-items:center; gap:4px">
        <span>📱</span><span>Yape/Plin</span>
      </button>
      <button type="button" onclick="document.querySelectorAll('.pago-tipo').forEach(b=>b.style.border='1.5px solid var(--border)'); this.style.border='2px solid var(--primary)'; window._pagoTipo='transferencia'"
        class="pago-tipo" style="padding:10px 6px; border-radius:8px; border:1.5px solid var(--border); background:white; font-size:12px; display:flex; flex-direction:column; align-items:center; gap:4px">
        <span>🏦</span><span>Transf.</span>
      </button>
    </div>
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="pFecha" type="date" value="${fechaHoy}">
  </div>

  <div class="form-group">
    <label>Nota (opcional)</label>
    <input class="form-control" id="pNota" placeholder="Ej. Pago adelantado...">
  </div>

  <button class="btn btn-success" style="height:48px; width:100%; font-weight:700; margin-top:10px"
    onclick="guardarPago()">
    💰 Confirmar Pago
  </button>`;
};