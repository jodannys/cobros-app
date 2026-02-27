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
window.guardarPago = async function() {
  if (isProcessingPayment === false) return;

  try {
    const cr = state.selectedCredito;
    const monto = parseMonto(document.getElementById('pMonto').value);
    const fecha = document.getElementById('pFecha').value;
    
    if (!cr || !monto || !fecha) {
      alert('Datos incompletos');
      return;
    }

    // Bloqueo visual del botón del modal
    const btnConfirmar = document.querySelector('button[onclick="guardarPago()"]');
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML = '⏳ Guardando...';
    }

    const id = genId(); // Generamos el ID único aquí
    
    // Armamos el objeto del pago
    const nuevoPago = {
      id,
      creditoId: cr.id,
      clienteId: cr.clienteId,
      registradoPor: state.currentUser.id,
      monto,
      tipo: window._pagoTipo || 'efectivo',
      fecha,
      nota: document.getElementById('pNota').value.trim(),
      creadoEn: new Date().toISOString()
    };

    console.log(`%c [BD] Guardando pago ID: ${id}`, "color: orange");

    // 1. PRIMERO guardamos en la Base de Datos (Esperamos el await)
    await DB.set('pagos', id, nuevoPago);
    
    // 2. VERIFICACIÓN ANTI-DUPLICADO: 
    // Solo lo metemos al caché si NO existe ya (por si el listener de Firebase fue más rápido)
    if (!DB._cache['pagos']) DB._cache['pagos'] = [];
    const yaExiste = DB._cache['pagos'].some(p => p.id === id);
    
    if (!yaExiste) {
      DB._cache['pagos'].push(nuevoPago);
      console.log("✅ Cache actualizado manualmente");
    } else {
      console.log("⚠️ El pago ya fue añadido por el listener de Firebase");
    }

    // 3. CERRAR MODAL Y LIMPIAR
    state.modal = null;
    state.selectedCredito = null;
    showToast('✅ Pago registrado con éxito');
    
    render();

  } catch (error) {
    console.error("❌ ERROR:", error);
    alert('No se pudo guardar: ' + error.message);
  } finally {
    // 4. LIBERAR CANDADOS
    isProcessingPayment = false;
    deshabilitarBotonesPago(false);
  }
};
// ============================================================
// 7. RENDERIZAR MODAL (agregar deshabilitar botón)
// ============================================================
window.renderModalRegistrarPago = function() {
  const cr = state.selectedCredito;
  if (!cr) return '';

  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = Math.max(0, cr.total - totalPagado);
  
  const infoMora = obtenerDatosMora(cr);
  const mora = infoMora.total;
  const totalConMora = saldo + mora;
  const tieneVencido = mora > 0;

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Registrar Pago</div>

  <!-- RESUMEN -->
  <div style="background:var(--bg); border-radius:10px; padding:14px; margin-bottom:14px">
    ${tieneVencido ? `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--border)">
        <span style="color:var(--muted); font-size:13px">Saldo crédito</span>
        <span style="font-weight:700; color:var(--text)">${formatMoney(saldo)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;
                  margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #fecdd3">
        <span style="color:var(--danger); font-size:13px; font-weight:600">
          ⚠️ Mora (${infoMora.dias} días)
        </span>
        <span style="font-weight:700; color:var(--danger)">${formatMoney(mora)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span style="font-weight:700; font-size:13px; color:var(--text); text-transform:uppercase;
                     letter-spacing:0.5px">Total a cobrar</span>
        <span style="font-weight:900; font-size:22px; color:var(--danger); letter-spacing:-0.5px">
          ${formatMoney(totalConMora)}
        </span>
      </div>` :
    `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  margin-bottom:8px">
        <span style="color:var(--muted); font-size:13px">Cuota diaria</span>
        <span style="font-weight:700; color:var(--text)">${formatMoney(cr.cuotaDiaria)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span style="color:var(--muted); font-size:13px">Saldo pendiente</span>
        <span style="font-weight:700; color:var(--danger)">${formatMoney(saldo)}</span>
      </div>`}
  </div>

  <div class="form-group">
    <label>Monto recibido (S/)</label>
    <input class="form-control" id="pMonto" type="number"
      value="${Math.round(tieneVencido ? totalConMora : cr.cuotaDiaria)}"
      style="font-size:20px; font-weight:800; text-align:center; letter-spacing:-0.5px"
      step="0.01">
  </div>

  <div class="form-group">
    <label>Forma de pago</label>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px">
      <button type="button"
        onclick="document.querySelectorAll('.pago-tipo').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window._pagoTipo='efectivo'"
        class="pago-tipo active"
        style="padding:10px 6px; border-radius:8px; border:1.5px solid var(--border);
               background:white; font-size:12px; font-weight:600; cursor:pointer;
               display:flex; flex-direction:column; align-items:center; gap:4px">
        <span style="font-size:18px">💵</span>
        <span>Efectivo</span>
      </button>
      <button type="button"
        onclick="document.querySelectorAll('.pago-tipo').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window._pagoTipo='yape'"
        class="pago-tipo"
        style="padding:10px 6px; border-radius:8px; border:1.5px solid var(--border);
               background:white; font-size:12px; font-weight:600; cursor:pointer;
               display:flex; flex-direction:column; align-items:center; gap:4px">
        <span style="font-size:18px">📱</span>
        <span>Yape/Plin</span>
      </button>
      <button type="button"
        onclick="document.querySelectorAll('.pago-tipo').forEach(b=>b.classList.remove('active')); this.classList.add('active'); window._pagoTipo='transferencia'"
        class="pago-tipo"
        style="padding:10px 6px; border-radius:8px; border:1.5px solid var(--border);
               background:white; font-size:12px; font-weight:600; cursor:pointer;
               display:flex; flex-direction:column; align-items:center; gap:4px">
        <span style="font-size:18px">🏦</span>
        <span>Transf.</span>
      </button>
    </div>
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input class="form-control" id="pFecha" type="date" value="${today()}">
  </div>

  <div class="form-group">
    <label>Nota (opcional)</label>
    <input class="form-control" id="pNota" placeholder="Observaciones...">
  </div>

  <button class="btn btn-success" style="height:48px; font-size:15px; font-weight:700;
    disabled:${isProcessingPayment ? 'true' : 'false'}"
    onclick="guardarPago()">
    💰 Confirmar Pago
  </button>`;
};