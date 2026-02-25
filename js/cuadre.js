// ══════════════════════════════════════════════════════════════
// GESTIÓN DE CUADRE Y RENDIMIENTO
// ══════════════════════════════════════════════════════════════

window.getCuadreDelDia = function(cobradorId, fecha) {
  const pagos = DB._cache['pagos'] || [];
  const pagosDia = pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha);

  const yape          = pagosDia.filter(p => p.tipo === 'yape').reduce((s, p) => s + Number(p.monto), 0);
  const efectivo      = pagosDia.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + Number(p.monto), 0);
  const transferencia = pagosDia.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + Number(p.monto), 0);

  const notas  = DB._cache['notas_cuadre'] || [];
  const notaObj = notas.find(n => n.cobradorId === cobradorId && n.fecha === fecha);

  return {
    yape, efectivo, transferencia,
    total: yape + efectivo + transferencia,
    nota: notaObj ? notaObj.nota : '',
    pagos: pagosDia
  };
};

window.calcularMetaReal = function(cobradorId, fecha) {
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const pagos    = DB._cache['pagos']    || [];

  const misClientesIds = clientes
    .filter(c => c.cobradorId === cobradorId)
    .map(c => c.id);

  const creditosActivos = creditos.filter(cr =>
    misClientesIds.includes(cr.clienteId) &&
    cr.activo === true &&
    cr.fechaInicio <= fecha
  );

  let metaTotal = 0, pagadoHoy = 0, pendiente = 0;
  const detalle = [];

  creditosActivos.forEach(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    const cuota   = Number(cr.cuotaDiaria) || 0;
    const pagosHoyCliente = pagos.filter(p => p.creditoId === cr.id && p.fecha === fecha);
    const montoPagadoHoy  = pagosHoyCliente.reduce((s, p) => s + Number(p.monto), 0);

    metaTotal  += cuota;
    pagadoHoy  += montoPagadoHoy;
    const completo = montoPagadoHoy >= cuota;
    if (!completo) pendiente += (cuota - montoPagadoHoy);

    detalle.push({ cliente, cr, cuota, montoPagadoHoy, completo });
  });

  return { metaTotal, pagadoHoy, pendiente, detalle };
};

window.guardarNota = async function() {
  const nota  = document.getElementById('notaHoy').value.trim();
  const notas = DB._cache['notas_cuadre'] || [];
  const hoy   = today();
  const existing = notas.find(n => n.cobradorId === state.currentUser.id && n.fecha === hoy);
  try {
    if (existing) {
      await DB.update('notas_cuadre', existing.id, { nota });
      existing.nota = nota;
    } else {
      const id    = genId();
      const nueva = { id, cobradorId: state.currentUser.id, fecha: hoy, nota };
      await DB.set('notas_cuadre', id, nueva);
      if (!DB._cache['notas_cuadre']) DB._cache['notas_cuadre'] = [];
      DB._cache['notas_cuadre'].push(nueva);
    }
    showToast('Nota guardada');
  } catch (e) {
    alert('Error al guardar nota: ' + e.message);
  }
};

// ── Helper: bloque caja chica profesional (para cobrador) ─────
function _renderCajaChicaPro(caja, cuadre) {
  const saldoPositivo = caja.saldo >= 0;
  const saldoColor    = saldoPositivo ? '#22c55e' : '#f87171';

  return `
  <div style="border-radius:16px;overflow:hidden;margin-bottom:14px;
    box-shadow:0 4px 20px rgba(0,0,0,0.12)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);
      padding:16px 18px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:11px;font-weight:800;color:rgba(255,255,255,0.5);
          text-transform:uppercase;letter-spacing:1px">💼 Caja Chica</div>
        <div style="font-size:11px;font-weight:700;
          background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);
          padding:3px 10px;border-radius:20px">${formatDate(today())}</div>
      </div>

      <!-- Saldo grande -->
      <div style="text-align:center;padding:10px 0 14px">
        <div style="font-size:11px;color:rgba(255,255,255,0.4);font-weight:700;
          text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Saldo actual</div>
        <div style="font-size:36px;font-weight:900;color:${saldoColor};
          letter-spacing:-1px">${formatMoney(caja.saldo)}</div>
      </div>

      <!-- Barra visual -->
      <div style="background:rgba(255,255,255,0.08);border-radius:8px;height:6px;overflow:hidden">
        ${caja.cajaInicial > 0 ? `
        <div style="height:100%;border-radius:8px;
          background:${saldoPositivo ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#ef4444,#f87171)'};
          width:${Math.min(100, Math.max(0, Math.abs(caja.saldo / caja.cajaInicial * 100)))}%;
          transition:width 0.4s ease"></div>` : ''}
      </div>
    </div>

    <!-- Detalle -->
    <div style="background:white;padding:14px 18px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">

        <div style="background:#f8fafc;border-radius:12px;padding:12px">
          <div style="font-size:10px;color:#94a3b8;font-weight:700;
            text-transform:uppercase;margin-bottom:4px">Inicial</div>
          <div style="font-size:18px;font-weight:800;color:#1e293b">
            ${formatMoney(caja.cajaInicial)}</div>
        </div>

        <div style="background:#f0fdf4;border-radius:12px;padding:12px">
          <div style="font-size:10px;color:#16a34a;font-weight:700;
            text-transform:uppercase;margin-bottom:4px">+ Cobros</div>
          <div style="font-size:18px;font-weight:800;color:#16a34a">
            ${formatMoney(caja.cobrosDelDia)}</div>
        </div>

        <div style="background:#fff5f5;border-radius:12px;padding:12px">
          <div style="font-size:10px;color:#dc2626;font-weight:700;
            text-transform:uppercase;margin-bottom:4px">− Préstamos</div>
          <div style="font-size:18px;font-weight:800;color:#dc2626">
            ${formatMoney(caja.totalPrestadoHoy)}</div>
        </div>

        <div style="background:#fff5f5;border-radius:12px;padding:12px">
          <div style="font-size:10px;color:#dc2626;font-weight:700;
            text-transform:uppercase;margin-bottom:4px">− Gastos</div>
          <div style="font-size:18px;font-weight:800;color:#dc2626">
            ${formatMoney(caja.totalGastos)}</div>
        </div>
      </div>

      <!-- Métodos de pago -->
      <div style="background:#f8fafc;border-radius:12px;padding:12px;margin-bottom:12px">
        <div style="font-size:10px;color:#94a3b8;font-weight:700;
          text-transform:uppercase;margin-bottom:8px">Cobros por método</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
          <div>
            <div style="font-size:18px;margin-bottom:2px">📱</div>
            <div style="font-size:12px;font-weight:800;color:#1e293b">${formatMoney(cuadre.yape)}</div>
            <div style="font-size:10px;color:#94a3b8">Yape/Plin</div>
          </div>
          <div>
            <div style="font-size:18px;margin-bottom:2px">💵</div>
            <div style="font-size:12px;font-weight:800;color:#1e293b">${formatMoney(cuadre.efectivo)}</div>
            <div style="font-size:10px;color:#94a3b8">Efectivo</div>
          </div>
          <div>
            <div style="font-size:18px;margin-bottom:2px">🏦</div>
            <div style="font-size:12px;font-weight:800;color:#1e293b">${formatMoney(cuadre.transferencia)}</div>
            <div style="font-size:10px;color:#94a3b8">Transf.</div>
          </div>
        </div>
      </div>

      <!-- Gastos del día -->
      ${caja.gastos.length > 0 ? `
      <div style="border-top:1px solid #f1f5f9;padding-top:10px">
        <div style="font-size:10px;color:#94a3b8;font-weight:700;
          text-transform:uppercase;margin-bottom:8px">
          Gastos del día (${caja.gastos.length})
        </div>
        ${caja.gastos.map(g => `
          <div style="display:flex;justify-content:space-between;
            align-items:center;padding:6px 0;border-bottom:1px solid #f8fafc">
            <div style="font-size:13px;color:#334155">${g.descripcion}</div>
            <div style="font-size:13px;font-weight:700;color:#dc2626">
              −${formatMoney(g.monto)}</div>
          </div>`).join('')}
      </div>` : ''}

      <!-- Botón gasto -->
      <button onclick="openModal('nuevo-gasto')"
        style="width:100%;margin-top:12px;padding:10px;border-radius:10px;
        border:1.5px dashed #fca5a5;background:#fff5f5;color:#dc2626;
        font-size:13px;font-weight:700;cursor:pointer">
        + Registrar gasto
      </button>
    </div>
  </div>`;
}

// ── Render Principal ──────────────────────────────────────────
window.renderCuadre = function() {
  const isAdmin = state.currentUser.role === 'admin';
  const hoy     = today();
  const creditos = DB._cache['creditos'] || [];
  const usuarios = DB._cache['users']    || [];

  // ── VISTA ADMIN ───────────────────────────────────────────
  if (isAdmin) {
    const cobradores = usuarios.filter(u => u.role === 'cobrador');

    const totalObjetivoGlobal  = cobradores.reduce((s, u) => s + calcularMetaReal(u.id, hoy).metaTotal, 0);
    const pagosHoy             = (DB._cache['pagos'] || []).filter(p => p.fecha === hoy);
    const totalRecaudadoGlobal = pagosHoy.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    const porcentajeGlobal     = totalObjetivoGlobal > 0 ? Math.round((totalRecaudadoGlobal / totalObjetivoGlobal) * 100) : 0;

    const totalYape          = pagosHoy.filter(p => p.tipo === 'yape').reduce((s, p) => s + p.monto, 0);
    const totalEfectivo      = pagosHoy.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + p.monto, 0);
    const totalTransferencia = pagosHoy.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + p.monto, 0);

    const prestadoHoy = cobradores.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalPrestadoHoy, 0);
    const cajasHoy    = cobradores.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).saldo, 0);
    const gastosHoy   = cobradores.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalGastos, 0);

    const totalPorCobrar = creditos.filter(cr => cr.activo).reduce((s, cr) => {
      const pagado = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id).reduce((ss, p) => ss + p.monto, 0);
      return s + (Number(cr.total) - pagado);
    }, 0);

    const totalEnLaCalle = creditos.filter(cr => cr.activo).reduce((s, cr) => {
      const pagado = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id).reduce((ss, p) => ss + Number(p.monto), 0);
      return s + Math.max(0, Number(cr.total) - pagado);
    }, 0);

    return `
    <div class="topbar">
      <h2>Cuadre General</h2>
      <div class="topbar-user"><strong>Admin</strong></div>
    </div>
    <div class="page">

      <!-- Cobranza del día -->
      <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:16px;
        padding:18px;margin-bottom:14px;box-shadow:0 4px 20px rgba(0,0,0,0.15)">
        <div style="font-size:11px;color:rgba(255,255,255,0.5);font-weight:800;
          text-transform:uppercase;letter-spacing:1px;margin-bottom:14px">📅 Cobranza del Día</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
          <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;
              text-transform:uppercase;margin-bottom:4px">Objetivo</div>
            <div style="font-size:20px;font-weight:900;color:white">${formatMoney(totalObjetivoGlobal)}</div>
          </div>
          <div style="background:rgba(34,197,94,0.15);border-radius:12px;padding:12px;text-align:center;
            border:1px solid rgba(34,197,94,0.2)">
            <div style="font-size:10px;color:rgba(74,222,128,0.8);font-weight:700;
              text-transform:uppercase;margin-bottom:4px">Recaudado</div>
            <div style="font-size:20px;font-weight:900;color:#4ade80">${formatMoney(totalRecaudadoGlobal)}</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.08);border-radius:8px;height:8px;
          overflow:hidden;margin-bottom:8px">
          <div style="width:${Math.min(100, porcentajeGlobal)}%;
            background:linear-gradient(90deg,#22c55e,#4ade80);
            height:100%;border-radius:8px;transition:width 0.5s ease"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:rgba(255,255,255,0.6)">${porcentajeGlobal}% de la meta</span>
          <span style="font-size:13px;font-weight:800;color:${totalRecaudadoGlobal >= totalObjetivoGlobal ? '#4ade80' : '#fbbf24'}">
            ${totalRecaudadoGlobal >= totalObjetivoGlobal ? '✅ Completado' : '⏳ En proceso'}
          </span>
        </div>
      </div>

      <!-- Balance General (estilo código 2: simple y limpio) -->
      <div class="card" style="padding:16px;margin-bottom:16px;background:#0f172a;color:white;border:none">
        <div style="font-size:11px;opacity:0.7;font-weight:700;text-transform:uppercase;margin-bottom:14px">💰 Balance General</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">PRESTADO HOY</div>
            <div style="font-size:16px;font-weight:800;color:#f87171">${formatMoney(prestadoHoy)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">SALDO EN CAJAS</div>
            <div style="font-size:16px;font-weight:800;color:#4ade80">${formatMoney(cajasHoy)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center;grid-column:1/-1">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">GASTOS DEL DÍA</div>
            <div style="font-size:16px;font-weight:800;color:#f87171">${formatMoney(gastosHoy)}</div>
          </div>
          <div style="background:rgba(251,191,36,0.15);border-radius:10px;padding:10px;text-align:center;grid-column:1/-1;border:1px solid rgba(251,191,36,0.3)">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">💰 TOTAL De DINERO PRESTADO</div>
            <div style="font-size:20px;font-weight:900;color:#fbbf24">${formatMoney(totalEnLaCalle)}</div>
          </div>
        </div>
        <div style="font-size:10px;opacity:0.6;font-weight:700;text-transform:uppercase;margin-bottom:8px">Métodos de Pago</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px">
            <div style="font-size:10px;opacity:0.7">📱 Yape/Plin</div>
            <div style="font-weight:800;font-size:14px">${formatMoney(totalYape)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px">
            <div style="font-size:10px;opacity:0.7">💵 Efect.</div>
            <div style="font-weight:800;font-size:14px">${formatMoney(totalEfectivo)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px">
            <div style="font-size:10px;opacity:0.7">🏦 Trans.</div>
            <div style="font-weight:800;font-size:14px">${formatMoney(totalTransferencia)}</div>
          </div>
        </div>
      </div>

      <!-- Rendimiento por cobrador -->
      <div style="font-size:11px;color:#94a3b8;font-weight:800;
        text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding:0 2px">
        👨‍💼 Rendimiento por Cobrador
      </div>
      ${cobradores.map(u => {
        const c        = getCuadreDelDia(u.id, hoy);
        const meta     = calcularMetaReal(u.id, hoy);
        const caja     = getCajaChicaDelDia(u.id, hoy);
        const expandido = state._expandCobrador === u.id;
        const pct      = meta.metaTotal > 0 ? Math.min(100, Math.round((c.total / meta.metaTotal) * 100)) : 0;
        const saldoOk  = caja.saldo >= 0;

        return `
        <div style="background:white;border-radius:16px;margin-bottom:12px;
          overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.05)">

          <!-- Fila cobrador -->
          <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer"
            onclick="state._expandCobrador='${u.id}'===state._expandCobrador?null:'${u.id}';render()">
            <div style="width:42px;height:42px;border-radius:12px;
              background:linear-gradient(135deg,#1a56db,#0ea96d);
              display:flex;align-items:center;justify-content:center;
              color:white;font-weight:800;font-size:16px;flex-shrink:0">
              ${u.nombre.charAt(0)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <div style="font-weight:800;font-size:15px">${u.nombre}</div>
                <div style="font-weight:900;color:#16a34a;font-size:15px">${formatMoney(c.total)}</div>
              </div>
              <div style="background:#f1f5f9;border-radius:4px;height:5px;margin-bottom:4px;overflow:hidden">
                <div style="width:${pct}%;background:${pct>=100?'#22c55e':'#1a56db'};height:100%;border-radius:4px"></div>
              </div>
              <div style="display:flex;justify-content:space-between">
                <div style="font-size:11px;color:#94a3b8">Meta: ${formatMoney(meta.metaTotal)}</div>
                <div style="font-size:11px;color:${meta.pendiente>0?'#ef4444':'#16a34a'};font-weight:700">
                  ${meta.pendiente > 0 ? `Faltan: ${formatMoney(meta.pendiente)}` : '✅ Meta cumplida'}
                </div>
              </div>
            </div>
            <div style="color:#94a3b8;font-size:18px;transform:rotate(${expandido?'90':'0'}deg);transition:transform 0.2s">›</div>
          </div>

          <!-- Expandido -->
          ${expandido ? `
          <div style="border-top:1px solid #f1f5f9;padding:14px 16px;background:#f8fafc">

            <!-- Caja chica mini -->
            <div style="background:white;border-radius:12px;padding:14px;
              border:1px solid #e2e8f0;margin-bottom:12px">
              <div style="font-size:10px;color:#94a3b8;font-weight:800;
                text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">💼 Caja Chica</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                <div style="text-align:center;padding:8px;background:#f8fafc;border-radius:8px">
                  <div style="font-size:10px;color:#94a3b8">Inicial</div>
                  <div style="font-weight:800;font-size:14px">${formatMoney(caja.cajaInicial)}</div>
                </div>
                <div style="text-align:center;padding:8px;background:#f0fdf4;border-radius:8px">
                  <div style="font-size:10px;color:#16a34a">+ Cobros</div>
                  <div style="font-weight:800;font-size:14px;color:#16a34a">${formatMoney(caja.cobrosDelDia)}</div>
                </div>
                <div style="text-align:center;padding:8px;background:#fff5f5;border-radius:8px">
                  <div style="font-size:10px;color:#dc2626">− Préstamos</div>
                  <div style="font-weight:800;font-size:14px;color:#dc2626">${formatMoney(caja.totalPrestadoHoy)}</div>
                </div>
                <div style="text-align:center;padding:8px;background:#fff5f5;border-radius:8px">
                  <div style="font-size:10px;color:#dc2626">− Gastos</div>
                  <div style="font-weight:800;font-size:14px;color:#dc2626">${formatMoney(caja.totalGastos)}</div>
                </div>
              </div>
              <div style="background:${saldoOk?'#f0fdf4':'#fff5f5'};border-radius:10px;
                padding:10px 14px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:13px;font-weight:700;color:${saldoOk?'#16a34a':'#dc2626'}">Saldo en caja</div>
                <div style="font-size:20px;font-weight:900;color:${saldoOk?'#16a34a':'#dc2626'}">${formatMoney(caja.saldo)}</div>
              </div>
            </div>

            ${c.nota ? `
            <div style="background:white;border-radius:10px;padding:10px 12px;
              border:1px solid #e2e8f0;margin-bottom:10px;font-size:13px;color:#334155">
              <strong>📝 Nota:</strong> ${c.nota}
            </div>` : ''}

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button class="btn btn-sm" style="background:#eff6ff;color:#1a56db;
                border:1px solid #bfdbfe;font-weight:700;border-radius:10px;padding:10px"
                onclick="abrirAsignarCaja('${u.id}')">💼 Asignar Caja</button>
              <button class="btn btn-sm" style="background:#fff5f5;color:#dc2626;
                border:1px solid #fecaca;font-weight:700;border-radius:10px;padding:10px"
                onclick="abrirNuevoGastoAdmin('${u.id}')">💸 + Gasto</button>
            </div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ── VISTA COBRADOR ────────────────────────────────────────
  const cuadreHoy    = getCuadreDelDia(state.currentUser.id, hoy);
  const meta         = calcularMetaReal(state.currentUser.id, hoy);
  const caja         = getCajaChicaDelDia(state.currentUser.id, hoy);
  const metaAlcanzada = meta.pendiente === 0 && meta.metaTotal > 0;
  const pctMeta      = meta.metaTotal > 0 ? Math.min(100, Math.round((cuadreHoy.total / meta.metaTotal) * 100)) : 0;

  return `
  <div class="topbar">
    <h2>Mi Cuadre</h2>
    <div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div>
  </div>
  <div class="page">

    <!-- Caja Chica profesional -->
    ${_renderCajaChicaPro(caja, cuadreHoy)}

    <!-- Meta diaria -->
    <div style="background:${metaAlcanzada ? '#f0fdf4' : 'white'};border-radius:16px;
      padding:16px;margin-bottom:14px;border:1.5px solid ${metaAlcanzada ? '#86efac' : '#e2e8f0'};
      box-shadow:0 2px 8px rgba(0,0,0,0.05)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div>
          <div style="font-size:10px;color:#94a3b8;font-weight:800;
            text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Meta diaria</div>
          <div style="font-size:26px;font-weight:900;color:#1e293b;letter-spacing:-0.5px">
            ${formatMoney(meta.metaTotal)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:#94a3b8;font-weight:800;
            text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Recaudado</div>
          <div style="font-size:26px;font-weight:900;color:#16a34a;letter-spacing:-0.5px">
            ${formatMoney(cuadreHoy.total)}</div>
        </div>
      </div>
      <div style="background:#f1f5f9;border-radius:8px;height:8px;overflow:hidden;margin-bottom:6px">
        <div style="width:${pctMeta}%;background:${metaAlcanzada?'linear-gradient(90deg,#22c55e,#4ade80)':'linear-gradient(90deg,#1a56db,#3b82f6)'};
          height:100%;border-radius:8px;transition:width 0.4s ease"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:#94a3b8">${pctMeta}% completado</div>
        <div style="font-size:12px;font-weight:700;color:${metaAlcanzada?'#16a34a':'#f59e0b'}">
          ${metaAlcanzada ? '✅ Meta alcanzada' : `Faltan ${formatMoney(meta.pendiente)}`}
        </div>
      </div>
    </div>

    <!-- Clientes para cobrar -->
    <div style="background:white;border-radius:16px;overflow:hidden;margin-bottom:14px;
      border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
      <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9">
        <div style="font-size:11px;color:#94a3b8;font-weight:800;
          text-transform:uppercase;letter-spacing:1px">Clientes para Cobrar Hoy</div>
      </div>
      <div style="padding:0 16px 8px">
        ${meta.detalle.length === 0
          ? `<p style="text-align:center;color:#94a3b8;padding:20px 0;font-size:14px">
              Sin clientes para hoy</p>`
          : meta.detalle.map(d => `
          <div style="display:flex;justify-content:space-between;align-items:center;
            padding:11px 0;border-bottom:1px solid #f8fafc">
            <div>
              <div style="font-weight:700;font-size:14px;color:#1e293b">
                ${d.cliente?.nombre || 'Sin nombre'}</div>
              <div style="font-size:12px;color:#94a3b8">
                Cuota: ${formatMoney(d.cuota)}</div>
            </div>
            <span style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:20px;
              ${d.completo
                ? 'background:#f0fdf4;color:#16a34a;border:1px solid #86efac'
                : d.montoPagadoHoy > 0
                  ? 'background:#fffbeb;color:#d97706;border:1px solid #fde68a'
                  : 'background:#fff5f5;color:#dc2626;border:1px solid #fecaca'}">
              ${d.completo ? '✅ Pagado' : d.montoPagadoHoy > 0 ? '⚡ Parcial' : '⏳ Pendiente'}
            </span>
          </div>`).join('')}
      </div>
    </div>

    <!-- Nota del día -->
    <div style="background:white;border-radius:16px;padding:16px;margin-bottom:14px;
      border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.05)">
      <div style="font-size:11px;color:#94a3b8;font-weight:800;
        text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📝 Nota del día</div>
      <textarea id="notaHoy" class="form-control" style="height:80px;resize:none;border-radius:10px"
        placeholder="¿Alguna novedad con los cobros?">${cuadreHoy.nota}</textarea>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;border-radius:10px;
        font-weight:700;padding:12px" onclick="guardarNota()">
        💾 Guardar Nota
      </button>
    </div>

  </div>`;
};