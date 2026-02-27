// ============================================================
// 1. UN SOLO CANDADO GLOBAL (reemplaza los dos anteriores)
// ============================================================
let isProcessingPayment = false;

// ============================================================
// 2. FUNCIÓN AUXILIAR: Bloquea todos los botones de pago
// ============================================================
window.deshabilitarBotonesPago = function(estado) {
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
// 3. EJECUTAR PAGO PROTEGIDO (corregido)
// ============================================================
window.ejecutarPagoProtegido = function(btn, creditoId) {
  console.log(`[PAGO] Clic detectado en crédito: ${creditoId}`);

  // VERIFICACIÓN 1: ¿Ya está procesando?
  if (isProcessingPayment) {
    console.warn("⚠️ Ya hay un pago en proceso. Ignorando clic.");
    return;
  }

  // VERIFICACIÓN 2: ¿El botón ya está deshabilitado?
  if (btn.disabled) {
    console.warn("⚠️ Botón deshabilitado. Ignorando clic.");
    return;
  }

  // ACTIVAR CANDADO
  isProcessingPayment = true;
  deshabilitarBotonesPago(true);

  const icon = document.getElementById(`icon-${creditoId}`);
  const text = document.getElementById(`text-${creditoId}`);
  
  if (icon) icon.innerHTML = "⏳";
  if (text) text.innerText = "Procesando...";

  console.log("✅ Abriendo modal de pago...");
  openRegistrarPago(creditoId);
};

// ============================================================
// 4. ABRIR MODAL DE PAGO (corregido)
// ============================================================
window.openRegistrarPago = function(crId) {
  // VERIFICACIÓN: ¿Hay otro modal ya abierto?
  if (state.modal && state.modal !== 'registrar-pago') {
    console.warn("⚠️ Ya hay otro modal abierto. Cerrando primero...");
    state.modal = null;
  }

  const cr = (DB._cache['creditos'] || []).find(x => x.id === crId);
  if (!cr) {
    console.error("❌ Crédito no encontrado");
    isProcessingPayment = false;
    deshabilitarBotonesPago(false);
    return;
  }

  state.selectedCredito = cr;
  state.modal = 'registrar-pago';
  render();
};

// ============================================================
// 5. PAGO RÁPIDO (corregido - usar el mismo sistema)
// ============================================================
window.pagoRapido = function(crId) {
  if (isProcessingPayment) {
    console.warn("⚠️ Ya hay un pago en proceso.");
    return;
  }

  console.log(`[PAGO RÁPIDO] Crédito: ${crId}`);
  isProcessingPayment = true;
  deshabilitarBotonesPago(true);

  const cr = (DB._cache['creditos'] || []).find(x => x.id === crId);
  if (!cr) {
    isProcessingPayment = false;
    deshabilitarBotonesPago(false);
    return;
  }

  state.selectedCredito = cr;
  state.modal = 'registrar-pago';
  render();
};

// ============================================================
// 6. GUARDAR PAGO (corregido - candado único + esperar BD)
// ============================================================
// ============================================================
// 6. GUARDAR PAGO (CORREGIDO - Evita duplicidad por sincronización)
// ============================================================
// ============================================================
// 6. GUARDAR PAGO (VERSION FINAL COMPLETA)
// ============================================================
window.guardarPago = async function() {
  if (isProcessingPayment === false) {
    console.warn("Intento de guardado sin candado activo.");
    return;
  }

  try {
    const cr = state.selectedCredito;
    const montoInput = document.getElementById('pMonto');
    const monto = parseMonto(montoInput.value);
    const fecha = document.getElementById('pFecha').value;
    const nota = document.getElementById('pNota').value.trim();
    const tipo = window._pagoTipo || 'efectivo'; // Recupera el tipo seleccionado
    
    if (!cr || !monto || monto <= 0 || !fecha) {
      alert('Por favor, ingresa un monto válido y la fecha.');
      return;
    }

    // Bloqueo visual del botón del modal
    const btnConfirmar = document.querySelector('button[onclick="guardarPago()"]');
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '⏳ Guardando...';
    }

    // --- CÁLCULO DE SALDOS ---
    const pagosAnteriores = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
    const totalPagadoAntes = pagosAnteriores.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    const saldoRestante = Math.max(0, cr.total - totalPagadoAntes);
    
    const infoMora = typeof obtenerDatosMora === 'function' ? obtenerDatosMora(cr) : { total: 0 };
    const moraActual = infoMora.total;

    let aplicadoMora = Math.min(monto, moraActual);
    let aplicadoSaldo = Math.min(monto - aplicadoMora, saldoRestante);

    const id = genId();
    const nuevoPago = {
      id,
      creditoId: cr.id,
      clienteId: cr.clienteId,
      registradoPor: state.currentUser.id,
      cobradorId: state.currentUser.role === 'admin' ? (cr.cobradorId || state.currentUser.id) : state.currentUser.id,
      monto,
      aplicadoSaldo,
      aplicadoMora,
      tipo,
      fecha,
      nota,
      creadoEn: new Date().toISOString()
    };

    console.log(`%c [BD] Guardando pago ID: ${id}`, "color: orange");

    // 1. Guardar en BD
    await DB.set('pagos', id, nuevoPago);
    
    // 2. Actualizar Caché local con seguridad anti-duplicado
    if (!DB._cache['pagos']) DB._cache['pagos'] = [];
    if (!DB._cache['pagos'].some(p => p.id === id)) {
      DB._cache['pagos'].push(nuevoPago);
      console.log("✅ Cache actualizado");
    }

    // 3. ¿Crédito terminado? (Saldo + Mora pagados)
    if ((totalPagadoAntes + aplicadoSaldo) >= cr.total && (moraActual - aplicadoMora) <= 0) {
       await DB.update('creditos', cr.id, { activo: false });
       const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === cr.id);
       if(idx !== -1) DB._cache['creditos'][idx].activo = false;
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
    isProcessingPayment = false;
    deshabilitarBotonesPago(false);
  }
};

// ============================================================
// 7. RENDERIZAR MODAL (VERSION FINAL COMPLETA)
// ============================================================
window.renderModalRegistrarPago = function() {
  const cr = state.selectedCredito;
  if (!cr) return '';

  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, cr.total - totalPagado);
  
  const infoMora = typeof obtenerDatosMora === 'function' ? obtenerDatosMora(cr) : { total: 0, dias: 0 };
  const totalConMora = saldo + infoMora.total;
  window._pagoTipo = 'efectivo'; // Reset por defecto

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
    <input class="form-control" id="pFecha" type="date" value="${new Date().toISOString().split('T')[0]}">
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