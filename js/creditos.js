// ============================================================
// GESTIÓN DE CRÉDITOS Y PAGOS
// ============================================================

// ── Tokens de diseño (inline) ─────────────────────────────────
// Se usan como constantes locales para mantener coherencia visual
// sin depender de clases externas que puedan no estar cargadas.
const _S = {
  // Radios
  r6: 'border-radius:6px',
  r8: 'border-radius:8px',
  r10: 'border-radius:10px',
  r12: 'border-radius:12px',

  // Tipografía
  label: 'font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.7px; color:var(--muted)',
  value: 'font-size:14px; font-weight:800; color:var(--text)',
  valueLg: 'font-size:16px; font-weight:800; color:var(--text)',

  // Superficies
  surface: 'background:var(--bg); border-radius:8px; padding:10px 14px',
  surfaceGreen: 'background:#f0fdf4; border-radius:8px; padding:10px 14px',
  surfaceRed: 'background:#fff1f2; border-radius:8px; padding:10px 14px',
  surfaceAmber: 'background:#fff7ed; border-radius:8px; padding:10px 14px',

  // Grid 2 col
  grid2: 'display:grid; grid-template-columns:1fr 1fr; gap:10px',
};

// ── registrarPagoSeguro ───────────────────────────────────────
window.registrarPagoSeguro = function (btn, creditoId) {
  if (btn.dataset.loading === 'true') return;
  btn.dataset.loading = 'true';
  btn.style.opacity = '0.55';
  btn.innerHTML = '⌛ Procesando…';
  openRegistrarPago(creditoId);
  // El modal se encarga — restaurar botón al cerrarse
  const restore = () => {
    btn.dataset.loading = 'false';
    btn.style.opacity = '1';
    btn.innerHTML = '💰 Registrar pago';
  };
  document.addEventListener('modalClosed', restore, { once: true });
};

// ── renderSeccionCreditosCliente ──────────────────────────────
window.renderSeccionCreditosCliente = function (clienteId) {
  const todos = (DB._cache['creditos'] || [])
    .filter(c => c.clienteId === clienteId)
    .sort((a, b) => new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0));

  const activo = todos.find(c => c.activo === true);
  const antiguos = todos.filter(c => c.activo !== true);

  return `
    <div class="contenedor-creditos" style="display:flex; flex-direction:column; gap:12px">

      ${activo ? renderCreditoCard(activo) : `
        <div style="text-align:center; padding:28px 20px; color:var(--muted);
                    font-size:13px; background:var(--bg); border-radius:12px;
                    border:1.5px dashed var(--border)">
          Sin crédito activo
        </div>
      `}

      ${antiguos.length > 0 ? `
        <div>
          <button onclick="toggleHistorial()"
            style="width:100%; padding:12px 16px; background:var(--bg);
                   border:1.5px solid var(--border); border-radius:10px;
                   color:var(--text); font-weight:700; font-size:12px; cursor:pointer;
                   display:flex; justify-content:space-between; align-items:center;
                   transition:background 0.15s">
            <span>📁 Créditos cerrados (${antiguos.length})</span>
            <span id="flecha-hist" style="color:var(--muted); font-size:11px">▼</span>
          </button>
          <div id="cajon-historial" style="display:none; margin-top:10px;
               flex-direction:column; gap:10px">
            ${antiguos.map(ant => renderCreditoCard(ant)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
};

// ── toggleHistorial ───────────────────────────────────────────
window.toggleHistorial = function () {
  const cajon = document.getElementById('cajon-historial');
  const flecha = document.getElementById('flecha-hist');
  if (!cajon) return;
  const isHidden = cajon.style.display === 'none';
  cajon.style.display = isHidden ? 'flex' : 'none';
  flecha.innerText = isHidden ? '▲' : '▼';
};

// ── renderCreditoCard ─────────────────────────────────────────
window.renderCreditoCard = function (cr) {
  const pagos = (DB._cache['pagos'] || [])
    .filter(p => p.creditoId === cr.id && !p.eliminado)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = Math.max(0, cr.total - totalPagado);
  const pagadoReal = saldo <= 0;
  const progreso = Math.min(100, Math.round((totalPagado / cr.total) * 100));
  const isAdmin = state.currentUser.role === 'admin';
  const hoyStr = today();
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);
  const infoMora = obtenerDatosMora(cr);
  const mora = infoMora.total;
  const totalConMora = saldo + mora;
  const cuotasCubiertas = Math.floor(totalPagado / cr.cuotaDiaria);

  return `
  <div class="credito-card" style="padding:18px; border-radius:14px; margin-bottom:0">

    <!-- ── ENCABEZADO ── -->
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px">
      <div>
        <div style="${_S.label}; margin-bottom:5px">Monto prestado</div>
        <div style="font-size:28px; font-weight:900; color:var(--text); letter-spacing:-1px; line-height:1">
          ${formatMoney(cr.monto)}
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px">
        <span class="tag ${!pagadoReal ? 'tag-blue' : 'tag-green'}"
              style="font-size:12px; padding:5px 14px; border-radius:8px; font-weight:700">
          ${!pagadoReal ? 'Debe ' + formatMoney(saldo) : '✓ Pagado'}
        </span>
        ${cr.seguro ? `
          <span style="${_S.surfaceAmber}; padding:3px 10px; border-radius:6px;
                        font-size:10.5px; font-weight:700; color:#c2410c">
            🛡️ Seguro ${cr.porcentajeSeguro}%
          </span>` : ''}
      </div>
    </div>

    <!-- ── SEGURO ── -->
    ${cr.seguro ? `
    <div style="${_S.surfaceAmber}; margin-bottom:12px">
      <div style="${_S.grid2}">
        <div>
          <div style="${_S.label}; color:#c2410c; margin-bottom:4px">🛡️ Seguro cobrado</div>
          <div style="font-weight:800; color:#c2410c; font-size:16px">${formatMoney(cr.montoSeguro)}</div>
        </div>
        <div>
          <div style="${_S.label}; color:var(--primary); margin-bottom:4px">💵 Entregado</div>
          <div style="font-weight:800; color:var(--primary); font-size:16px">${formatMoney(cr.montoEntregado)}</div>
        </div>
      </div>
    </div>` : ''}

    <!-- ── TOTAL Y CUOTA ── -->
    <div style="${pagadoReal ? '' : _S.grid2}; margin-bottom:12px">
      <div style="${_S.surface}">
        <div style="${_S.label}; margin-bottom:4px">Total a pagar</div>
        <div style="${_S.valueLg}">${formatMoney(cr.total)}</div>
      </div>
      ${!pagadoReal ? `
      <div style="${_S.surface}">
        <div style="${_S.label}; margin-bottom:4px">Cuota diaria</div>
        <div style="${_S.valueLg}">${formatMoney(cr.cuotaDiaria)}</div>
      </div>` : ''}
    </div>

    ${renderFechasCredito(cr)}

    <!-- ── PAGADO / SALDO ── -->
    <div style="${_S.grid2}; margin:12px 0">
      <div style="${_S.surfaceGreen}">
        <div style="${_S.label}; color:#166534; margin-bottom:4px">✅ Pagado</div>
        <div style="font-size:16px; font-weight:800; color:#166534">${formatMoney(totalPagado)}</div>
      </div>
      <div style="${saldo > 0 ? _S.surfaceRed : _S.surfaceGreen}">
        <div style="${_S.label}; color:${saldo > 0 ? '#9f1239' : '#166534'}; margin-bottom:4px">
          ${saldo > 0 ? '⏳ Saldo pendiente' : '✓ Saldado'}
        </div>
        <div style="font-size:16px; font-weight:800; color:${saldo > 0 ? 'var(--danger)' : '#166534'}">
          ${formatMoney(saldo)}
        </div>
      </div>
    </div>

    <!-- ── MORA ── -->
    ${mora > 0 ? `
    <div style="${_S.surfaceRed}; margin:12px 0; border-left:3px solid var(--danger)">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
        <span style="font-size:12.5px; color:var(--danger); font-weight:700">
          ⚠️ Mora · ${infoMora.dias} días
        </span>
        <span style="font-weight:800; color:var(--danger); font-size:16px">${formatMoney(mora)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding-top:10px; border-top:1px dashed #fecdd3">
        <span style="font-size:13px; font-weight:700; color:var(--text)">Total con mora</span>
        <span style="font-weight:900; font-size:18px; color:var(--danger)">${formatMoney(totalConMora)}</span>
      </div>
      <div style="font-size:11px; color:#9f1239; margin-top:6px; font-style:italic">
        S/ 5.00 por cada día de atraso
      </div>
    </div>` : ''}

    <!-- ── PROGRESO ── -->
    <div style="margin:14px 0 6px">
      <div style="display:flex; justify-content:space-between; align-items:center;
                  font-size:11.5px; color:var(--muted); margin-bottom:7px">
        <span>${cuotasCubiertas} de ${cr.diasTotal} cuotas</span>
        <span style="font-weight:700; color:${progreso >= 100 ? 'var(--success)' : 'var(--primary)'}">
          ${progreso}%
        </span>
      </div>
      <div class="progress-bar" style="height:6px; border-radius:99px; overflow:hidden">
        <div class="progress-fill"
             style="width:${progreso}%; height:100%; border-radius:99px; transition:width 0.4s ease"></div>
      </div>
    </div>

    <!-- ── ACCIONES ── -->
    ${cr.activo ? `
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px">

      <!-- Botón principal -->
      <button class="btn btn-success"
        id="btn-pago-${cr.id}"
        style="height:48px; font-size:14px; font-weight:700; width:100%; border-radius:10px;
               display:flex; align-items:center; justify-content:center; gap:8px"
        onclick="ejecutarPagoProtegido(this, '${cr.id}')">
        <span id="icon-${cr.id}">💰</span>
        <span id="text-${cr.id}">Registrar pago</span>
      </button>

      ${isAdmin ? `
        <!-- Fila 1: Cerrar + Eliminar -->
        <div style="${_S.grid2}">
          <button class="btn btn-outline btn-sm"
            style="height:42px; font-size:12px; font-weight:700; border-radius:8px"
            onclick="cerrarCredito('${cr.id}')">
            ✓ Cerrar crédito
          </button>
          <button class="btn btn-sm"
            style="height:42px; font-size:12px; font-weight:700; border-radius:8px;
                   background:#fff1f2; color:#9f1239; border:1.5px solid #fecdd3"
            onclick="eliminarCredito('${cr.id}')">
            🚫 Eliminar
          </button>
        </div>

        <!-- Fila 2: Mora + Corregir monto -->
        <div style="${_S.grid2}">
          <button class="btn btn-sm"
            style="height:42px; font-size:12px; font-weight:700; border-radius:8px;
                   background:${cr.mora_activa ? '#fff1f2' : '#f0fdf4'};
                   color:${cr.mora_activa ? 'var(--danger)' : 'var(--success)'};
                   border:1.5px solid ${cr.mora_activa ? '#fecdd3' : '#bbf7d0'}"
            onclick="toggleMora('${cr.id}',${cr.mora_activa ? 'false' : 'true'})">
            ${cr.mora_activa ? '🔕 Sin mora' : '🔔 Activar mora'}
          </button>
          <button class="btn btn-sm btn-outline"
            style="height:42px; font-size:12px; font-weight:700; border-radius:8px"
            onclick="abrirEditarCredito('${cr.id}')">
            ✏️ Corregir monto
          </button>
        </div>
      ` : vencido ? `
        <div style="text-align:center; padding:10px; font-size:12px;
                    color:var(--danger); font-weight:600; background:#fff1f2;
                    border-radius:8px">
          ⚠️ Coordina con el administrador
        </div>
      ` : ''}
    </div>

    ` : `
    <div style="${_S.surfaceGreen}; font-size:13px; color:#166534;
                font-weight:600; text-align:center; margin-top:14px">
      ✅ Crédito cerrado
    </div>
    ${isAdmin ? `
      <button class="btn btn-sm btn-outline"
        style="margin-top:8px; width:100%; border-radius:8px; height:38px; font-size:12px"
        onclick="reabrirCredito('${cr.id}')">
        🔓 Reabrir crédito
      </button>` : ''}
    `}

    ${renderEsquemaCuotas(cr)}

    <!-- ── HISTORIAL DE PAGOS ── -->
    ${pagos.length > 0 ? `
    <div style="margin-top:16px">
      <div style="${_S.label}; margin-bottom:10px">Historial de pagos</div>
      ${pagos.slice().reverse().map(p => `
        <div class="cuota-item"
          style="display:flex; align-items:center; gap:10px;
                 padding:11px 0; border-bottom:1px solid var(--border)">

          <div style="flex:1; min-width:0">
            <div style="font-weight:600; font-size:13.5px; color:var(--text)">
              ${formatDate(p.fecha)}
            </div>
            <div style="display:flex; align-items:center; gap:5px; margin-top:4px; flex-wrap:wrap">
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
                      letter-spacing:-0.3px; flex-shrink:0">
            ${formatMoney(p.monto)}
          </div>

          ${isAdmin ? `
            <button onclick="abrirEditarPago('${p.id}')"
              style="width:32px; height:32px; border-radius:8px; border:1.5px solid var(--border);
                     background:var(--bg); color:var(--muted); font-size:13px;
                     cursor:pointer; display:flex; align-items:center; justify-content:center;
                     flex-shrink:0; transition:background 0.15s">
              ✏️
            </button>` : ''}
        </div>
      `).join('')}
    </div>` : ''}

  </div>`;
};

// ── renderFechasCredito ───────────────────────────────────────
window.renderFechasCredito = function (cr) {
  const fechaFin = calcularFechaFin(cr.fechaInicio, cr.diasTotal);
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);

  return `
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:4px; align-items:stretch">

    <div style="display:flex; align-items:flex-start; gap:8px;
                background:var(--bg);
                border-radius:8px;
                padding:12px 14px;
                flex:1; min-width:120px">

      <span style="font-size:16px; width:20px; text-align:center; margin-top:1px">📅</span>

      <div>
        <div style="${_S.label}; margin-bottom:3px; text-transform:uppercase">Inicio</div>
        <div style="font-size:13px; font-weight:700; color:var(--text)">
          ${formatDate(cr.fechaInicio)}
        </div>
      </div>
    </div>

    <div style="display:flex; align-items:flex-start; gap:8px;
                background:${vencido ? '#fff1f2' : 'var(--bg)'};
                border-radius:8px;
                padding:12px 14px;
                flex:1; min-width:120px">

      <span style="font-size:16px; width:20px; text-align:center; margin-top:1px">
        ${vencido ? '🔴' : '🟢'}
      </span>

      <div>
        <div style="${_S.label}; margin-bottom:3px; text-transform:uppercase;
                    color:${vencido ? '#9f1239' : 'var(--muted)'}">
          Fin
        </div>

        <div style="font-size:13px; font-weight:700;
                    color:${vencido ? 'var(--danger)' : 'var(--text)'}">
          ${fechaFin}
        </div>

        ${vencido ? `
          <div style="margin-top:4px">
            <span style="background:#fecdd3; color:#9f1239;
                         padding:2px 6px; border-radius:4px;
                         font-size:9px; font-weight:800; letter-spacing:0.5px">
              VENCIDO
            </span>
          </div>` : ''}
      </div>
    </div>

  </div>`;
}

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

  const pctInteres = 0.20;
  const interes = monto * pctInteres;
  const total = monto + interes;
  const cuota = total / diasTotal;

  const preview = document.getElementById('crPreview');
  if (preview) preview.style.display = 'block';
  if (document.getElementById('crInteres')) document.getElementById('crInteres').textContent = formatMoney(interes);
  if (document.getElementById('crTotal')) document.getElementById('crTotal').textContent = formatMoney(total);
  if (document.getElementById('crCuota')) document.getElementById('crCuota').textContent = formatMoney(cuota);

  const seguroActivo = state._crSeguro !== false;
  const seguroPreview = document.getElementById('crSeguroPreview');
  if (seguroPreview) {
    if (seguroActivo) {
      const pct = state._crPctSeguro ?? 5;
      const montoSeguro = Math.round(monto * (pct / 100) * 100) / 100;
      const entregaReal = monto - montoSeguro;
      if (document.getElementById('crSeguroMonto')) document.getElementById('crSeguroMonto').textContent = formatMoney(montoSeguro);
      if (document.getElementById('crEntregaReal')) document.getElementById('crEntregaReal').textContent = formatMoney(entregaReal);
      seguroPreview.style.display = 'block';
    } else {
      seguroPreview.style.display = 'none';
    }
  }
};

// ── guardarCredito ────────────────────────────────────────────
window.guardarCredito = async function () {
  if (window._guardandoCredito) return;
  window._guardandoCredito = true;

  const btn = document.querySelector('[onclick="guardarCredito()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  try {
    const creditosExistentes = (DB._cache['creditos'] || [])
      .filter(c => c.clienteId === state.selectedClient.id && c.activo);

    if (creditosExistentes.length > 0) {
      alert('Este cliente ya tiene un crédito activo.');
      return;
    }

    const plan = document.getElementById('crPlan')?.value || 'A';
    const diasTotal = plan === 'B' ? 20 : 24;
    const pctInteres = 0.20;

    const monto = parseMonto(document.getElementById('crMonto').value);
    const fechaInicio = document.getElementById('crFecha').value;
    if (monto <= 0 || !fechaInicio) { alert('Datos incompletos'); return; }

    const total = monto * (1 + pctInteres);
    const cuotaDiaria = Math.round((total / diasTotal) * 100) / 100;
    const fechaFin = sumarDiasHabiles(fechaInicio, diasTotal);

    const seguroActivo = state._crSeguro !== false;
    const porcentajeSeguro = seguroActivo ? (state._crPctSeguro ?? 5) : 0;
    const montoSeguro = seguroActivo ? Math.round(monto * (porcentajeSeguro / 100) * 100) / 100 : 0;

    const id = genId();
    const nuevoCredito = {
      id,
      clienteId: state.selectedClient.id,
      cobradorId: state.selectedClient.cobradorId || null,
      monto, total, cuotaDiaria, diasTotal, fechaInicio, fechaFin,
      activo: true,
      metodoPago: document.getElementById('crMetodoPago')?.value || 'Efectivo',
      seguro: seguroActivo, porcentajeSeguro, montoSeguro,
      montoEntregado: monto - montoSeguro,
      creadoEn: new Date().toISOString(),
      updatedAt: new Date()
    };

    await DB.set('creditos', id, nuevoCredito);
    state.modal = null;
    showToast('✅ Crédito creado con éxito');
    render();
  } catch (error) {
    console.error('Error al guardar:', error);
    alert('Hubo un error al guardar el crédito.');
  } finally {
    window._guardandoCredito = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Crear Crédito'; }
  }
};

// ── eliminarCredito ───────────────────────────────────────────
// Borra crédito + pagos y ajusta caja con la fecha original del
// crédito para que el historial quede limpio.
window.eliminarCredito = async function (crId) {
  if (window._eliminandoCredito) return;

  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;

  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === crId && !p.eliminado);
  const totalPagado = pagos.reduce((s, p) => s + Number(p.monto), 0);
  const montoSeguro = Number(cr.montoSeguro || 0);
  const montoTotal = Number(cr.monto) + montoSeguro;
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);

  const lineas = [
    `Monto prestado: ${formatMoney(cr.monto)}`,
    montoSeguro > 0 ? `Seguro: ${formatMoney(montoSeguro)}` : null,
    `Cuotas cobradas: ${formatMoney(totalPagado)}`,
    `Fecha del crédito: ${formatDate(cr.fechaInicio)}`,
    ``,
    `Se eliminarán ${pagos.length} pago(s) y se ajustará la caja.`,
    `Esta acción no se puede deshacer.`
  ].filter(l => l !== null).join('\n');

  if (!await showConfirm(`¿Eliminar este crédito completamente?\n\n${lineas}`, { danger: true, confirmText: 'Eliminar' })) return;

  window._eliminandoCredito = true;

  try {
    // 1. Marcar pagos como eliminados
    for (const p of pagos) {
      await DB.update('pagos', p.id, { eliminado: true });
    }

    // 2. Eliminar el crédito
    await DB.delete('creditos', crId);

    const cobradorId = cliente?.cobradorId || null;
    const fechaAjuste = cr.fechaInicio;

    // 3. Ajuste cartera admin: devolver monto + seguro
    if (montoTotal > 0) {
      const idAdmin = genId();
      await DB.set('movimientos_cartera', idAdmin, {
        id: idAdmin, tipo: 'inyeccion', monto: montoTotal,
        descripcion: 'Baja crédito',
        fecha: fechaAjuste, cobradorId,
        registradoPor: state.currentUser.id
      });
    }

    // 4. Quitar cuotas ya cobradas de la mochila del cobrador
    if (totalPagado > 0 && cobradorId) {
      const idCob = genId();
      await DB.set('movimientos_cartera', idCob, {
        id: idCob, tipo: 'gasto_cobrador', monto: totalPagado,
        descripcion: 'Baja crédito',
        fecha: fechaAjuste, cobradorId,
        registradoPor: state.currentUser.id
      });
    }

    showToast('✅ Crédito eliminado y caja ajustada');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  } finally {
    window._eliminandoCredito = false;
  }
};

// ── cerrarCredito ─────────────────────────────────────────────
window.cerrarCredito = async function (crId) {
  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;

  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === crId && !p.eliminado);
  const totalPagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = cr.total - totalPagado;

  if (saldo > 0) {
    if (!await showConfirm(`¡CUIDADO! Aún debe ${formatMoney(saldo)}. ¿Cerrar de todos modos?`, { danger: true, confirmText: 'Cerrar igualmente' })) return;
  } else {
    if (!await showConfirm('¿Marcar este crédito como pagado totalmente y cerrarlo?', { confirmText: 'Cerrar crédito' })) return;
  }

  try {
    await DB.update('creditos', crId, { activo: false });
    showToast('✅ Crédito cerrado');
    render();
  } catch (e) {
    alert('Error al cerrar: ' + e.message);
  }
};

// ── extenderCredito ───────────────────────────────────────────
window.extenderCredito = async function () {
  const input = document.getElementById('extDias');
  const diasExtra = parseInt(input.value) || 0;
  if (diasExtra <= 0) return alert('⚠️ Ingresa días válidos.');

  const cr = state.selectedCredito;
  const nuevoTotalDias = Number(cr.diasTotal) + diasExtra;
  const nuevaFechaFin = sumarDiasHabiles(cr.fechaInicio, nuevoTotalDias);

  const nuevaCuota = Math.round((cr.total / nuevoTotalDias) * 100) / 100;

  try {
    await DB.update('creditos', cr.id, { diasTotal: nuevoTotalDias, fechaFin: nuevaFechaFin, cuotaDiaria: nuevaCuota });
    state.selectedCredito = { ...state.selectedCredito, diasTotal: nuevoTotalDias, fechaFin: nuevaFechaFin, cuotaDiaria: nuevaCuota };
    showToast(`✅ Plazo extendido hasta ${formatDate(nuevaFechaFin)}`);
    render();
  } catch (error) { console.error(error); }
};

// ── guardarCompromiso ─────────────────────────────────────────
window.guardarCompromiso = async function () {
  const fecha = document.getElementById('fechaCompromiso').value;
  if (!fecha) return alert('⚠️ Selecciona una fecha para el compromiso.');
  if (fecha < today()) return alert('⚠️ La fecha de compromiso no puede ser anterior a hoy.');

  try {
    await DB.update('creditos', state.selectedCredito.id, {
      fechaCompromiso: fecha, estadoCompromiso: 'pendiente'
    });
    state.selectedCredito = { ...state.selectedCredito, fechaCompromiso: fecha };
    showToast(`📅 Compromiso: ${formatDate(fecha)}`);
    render();
  } catch (error) {
    alert('❌ No se pudo guardar el compromiso.');
  }
};

// ── guardarNotaCredito ────────────────────────────────────────
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

// ── toggleMora ────────────────────────────────────────────────
window.toggleMora = async function (crId, activar) {
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
    console.error('❌ Error en toggleMora:', error);
    alert('No se pudo cambiar el estado de la mora.');
  }
};

// ── abrirEditarPago ───────────────────────────────────────────
window.abrirEditarPago = function (pagoId) {
  const p = (DB._cache['pagos'] || []).find(x => x.id === pagoId);
  if (!p) return;
  state._editandoPago = p;
  state.modal = 'editar-pago';
  render();
};

// ── renderModalEditarPago ─────────────────────────────────────
window.renderModalEditarPago = function () {
  const p = state._editandoPago;
  if (!p) return '';
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === p.clienteId);

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Editar Pago</div>

  <div style="${_S.surface}; margin-bottom:14px">
    <div style="${_S.label}; margin-bottom:4px">Cliente</div>
    <div style="font-weight:700; font-size:14px; color:var(--text)">${cliente?.nombre || '—'}</div>
  </div>

  <div class="form-group">
    <label>Monto (S/) *</label>
    <input class="form-control" id="epMonto" type="number" step="0.01" value="${p.monto}"
      style="font-size:22px; font-weight:800; text-align:center; letter-spacing:-0.5px;
             border-radius:10px; height:56px">
  </div>

  <div class="form-group">
    <label>Tipo de pago</label>
    <input type="hidden" id="epTipo" value="${p.tipo || 'efectivo'}">
    ${renderCustomSelect({
      id: 'cs-epTipo',
      value: p.tipo || 'efectivo',
      onChange: "document.getElementById('epTipo').value=VALUE",
      options: [
        { value: 'efectivo',      label: '💵 Efectivo' },
        { value: 'yape',          label: '📱 Yape / Plin' },
        { value: 'transferencia', label: '🏦 Transferencia' }
      ]
    })}
  </div>

  <button class="btn btn-primary" style="width:100%; height:46px; border-radius:10px; font-weight:700"
    onclick="guardarPagoEditado()">
    Guardar cambios
  </button>

  <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border)">
    <button class="btn btn-danger" style="width:100%; height:42px; border-radius:10px; font-weight:700"
      onclick="eliminarPago('${p.id}')">
      Eliminar pago
    </button>
  </div>`;
};

// ── guardarPagoEditado ────────────────────────────────────────
window.guardarPagoEditado = async function () {
  if (window._guardandoPagoEditado) return;
  window._guardandoPagoEditado = true;

  const btn = document.querySelector('[onclick="guardarPagoEditado()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  try {
    const p = state._editandoPago;
    const montoNuevo = parseMonto(document.getElementById('epMonto').value);
    const tipo = document.getElementById('epTipo').value;
    if (!montoNuevo || montoNuevo <= 0) { alert('Ingresa un monto válido'); return; }

    const montoViejo = Number(p.monto);
    const diferencia = Math.round((montoNuevo - montoViejo) * 100) / 100;

    // 1. Actualizar el pago
    await DB.update('pagos', p.id, { monto: montoNuevo, tipo });

    // 2. Ajustar mochila del cobrador si el monto cambió
    if (Math.abs(diferencia) >= 0.01 && p.cobradorId) {
      const idAjuste = genId();
      // diferencia > 0 → cobrador cobró MÁS → sumar (cobro_ajuste)
      // diferencia < 0 → cobrador cobró MENOS → restar (gasto_cobrador)
      await DB.set('movimientos_cartera', idAjuste, {
        id: idAjuste,
        tipo: diferencia > 0 ? 'cobro_ajuste' : 'gasto_cobrador',
        monto: Math.abs(diferencia),
        descripcion: `Corrección pago (${diferencia > 0 ? '+' : ''}${diferencia.toFixed(2)})`,
        fecha: p.fecha,
        cobradorId: p.cobradorId,
        registradoPor: state.currentUser.id
      });
    }

    state._editandoPago = null;
    state.modal = null;
    showToast('✅ Pago actualizado');
    render();
  } catch (e) {
    alert('Error al guardar: ' + e.message);
  } finally {
    window._guardandoPagoEditado = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
  }
};

// ── eliminarPago ──────────────────────────────────────────────
window.eliminarPago = async function (pagoId) {
  if (!await showConfirm('¿Eliminar este pago? Esta acción afectará el saldo del crédito.', { danger: true, confirmText: 'Eliminar' })) return;

  const p = (DB._cache['pagos'] || []).find(x => x.id === pagoId);
  if (!p) return;

  try {
    // Marcar como eliminado (NO borrar — preserva cuadre histórico)
    await DB.update('pagos', pagoId, { eliminado: true });

    // Ajuste mochila cobrador: quitar ese cobro
    if (p.cobradorId && p.monto > 0) {
      const idAjuste = genId();
      await DB.set('movimientos_cartera', idAjuste, {
        id: idAjuste, tipo: 'gasto_cobrador', monto: Number(p.monto),
        descripcion: 'Baja pago',
        fecha: p.fecha,
        cobradorId: p.cobradorId,
        registradoPor: state.currentUser.id
      });
    }

    state._editandoPago = null;
    state.modal = null;
    showToast('Pago eliminado');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
};

// ── reabrirCredito ────────────────────────────────────────────
window.reabrirCredito = async function (crId) {
  if (window._reabriendo) return;
  if (!await showConfirm('¿Reabrir este crédito? Volverá a estar activo y aparecerá en los cobros.', { confirmText: 'Reabrir' })) return;
  window._reabriendo = true;
  try {
    await DB.update('creditos', crId, { activo: true });
    showToast('✅ Crédito reabierto');
    render();
  } catch (e) {
    alert('Error al reabrir: ' + e.message);
  } finally {
    window._reabriendo = false;
  }
};

// ── nuevoCreditoRapido ────────────────────────────────────────
window.nuevoCreditoRapido = function (clienteId) {
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === clienteId);
  if (!cliente) return;
  state.selectedClient = cliente;
  state.modal = 'nuevo-credito';
  render();
};