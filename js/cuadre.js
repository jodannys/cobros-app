function getCuadreDelDia(cobradorId, fecha) {
  const pagos = DB._cache['pagos'] || [];
  const pagosDia = pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha);
  const yape = pagosDia.filter(p => p.tipo === 'yape').reduce((s, p) => s + p.monto, 0);
  const efectivo = pagosDia.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + p.monto, 0);
  const transferencia = pagosDia.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + p.monto, 0);

  const notas = DB._cache['notas_cuadre'] || [];
  const notaObj = notas.find(n => n.cobradorId === cobradorId && n.fecha === fecha);

  return {
    yape, efectivo, transferencia,
    total: yape + efectivo + transferencia,
    nota: notaObj ? notaObj.nota : '',
    pagos: pagosDia
  };
}

async function guardarNota() {
  const nota = document.getElementById('notaHoy').value.trim();
  const notas = DB._cache['notas_cuadre'] || [];
  const existing = notas.find(n => n.cobradorId === state.currentUser.id && n.fecha === today());

  if (existing) {
    await DB.update('notas_cuadre', existing.id, { nota });
    const idx = notas.findIndex(n => n.id === existing.id);
    if (idx !== -1) notas[idx].nota = nota;
  } else {
    const id = genId();
    const nueva = { id, cobradorId: state.currentUser.id, fecha: today(), nota };
    await DB.set('notas_cuadre', id, nueva);
    if (!DB._cache['notas_cuadre']) DB._cache['notas_cuadre'] = [];
    DB._cache['notas_cuadre'].push(nueva);
  }
  showToast('Nota guardada');
}

function calcularMetaReal(cobradorId, fecha) {
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const pagos = DB._cache['pagos'] || [];

  const misClientesIds = clientes
    .filter(c => c.cobradorId === cobradorId)
    .map(c => c.id);

  const creditosActivos = creditos.filter(cr =>
    misClientesIds.includes(cr.clienteId) &&
    cr.activo === true &&
    cr.fechaInicio < fecha
  );

  let metaTotal = 0;
  let pagadoHoy = 0;
  let pendiente = 0;
  const detalle = [];

  creditosActivos.forEach(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    const cuota = Number(cr.cuotaDiaria) || 0;

    const pagosHoyCliente = pagos.filter(
      p => p.creditoId === cr.id && p.fecha === fecha
    );
    const montoPagadoHoy = pagosHoyCliente.reduce((s, p) => s + Number(p.monto), 0);

    metaTotal += cuota;
    pagadoHoy += montoPagadoHoy;

    const completo = montoPagadoHoy >= cuota;
    if (!completo) pendiente += (cuota - montoPagadoHoy);

    detalle.push({ cliente, cr, cuota, montoPagadoHoy, completo });
  });

  return { metaTotal, pagadoHoy, pendiente, detalle };
}



function renderCuadre() {
  const isAdmin = state.currentUser.role === 'admin';
  const hoy = today();
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const usuarios = DB._cache['users'] || [];

  if (isAdmin) {
    const cobradores = usuarios.filter(u => u.role === 'cobrador');
    const cobradorIds = cobradores.map(u => u.id);

    const totalObjetivoGlobal = creditos
      .filter(cr => {
        const cliente = clientes.find(c => c.id === cr.clienteId);
        return cr.activo === true && cr.fechaInicio <= hoy && cliente && cobradorIds.includes(cliente.cobradorId);
      })
      .reduce((s, cr) => s + (Number(cr.cuotaDiaria) || 0), 0);

    const pagosHoy = (DB._cache['pagos'] || []).filter(p => p.fecha === hoy && cobradorIds.includes(p.cobradorId));
    const totalRecaudadoGlobal = pagosHoy.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    const porcentajeGlobal = totalObjetivoGlobal > 0
      ? Math.round((totalRecaudadoGlobal / totalObjetivoGlobal) * 100)
      : 0;

    // ── Balance general ──────────────────────────────────────
    const totalYape = pagosHoy.filter(p => p.tipo === 'yape').reduce((s, p) => s + p.monto, 0);
    const totalEfectivo = pagosHoy.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + p.monto, 0);
    const totalTransferencia = pagosHoy.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + p.monto, 0);

    const prestadoHoy = cobradores.reduce((s, u) => {
      return s + getCajaChicaDelDia(u.id, hoy).totalPrestadoHoy;
    }, 0);


    const totalPrestado = creditos.filter(cr => cr.activo).reduce((s, cr) => s + Number(cr.monto), 0);

    const totalPorCobrar = creditos.filter(cr => cr.activo).reduce((s, cr) => {
      const pagado = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id).reduce((ss, p) => ss + p.monto, 0);
      return s + (cr.total - pagado);
    }, 0);

    const totalRecuperado = totalPrestado > 0
      ? Math.round(((totalPrestado - totalPorCobrar) / totalPrestado) * 100)
      : 0;
    const cajasHoy = cobradores.reduce((s, u) => {
      const caja = getCajaChicaDelDia(u.id, hoy);
      return s + caja.saldo;
    }, 0);
    const gastosHoy = cobradores.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalGastos, 0);

    return `
    <div class="topbar">
      <h2>Cuadre General</h2>
      <div class="topbar-user"><strong>Admin</strong></div>
    </div>
    <div class="page">

      <!-- ESTADO DE COBRANZA HOY -->
      <div class="card" style="padding:16px;margin-bottom:16px;background:#1e293b;color:white;border:none">
        <div style="font-size:11px;opacity:0.8;font-weight:700;text-transform:uppercase;margin-bottom:10px">Estado de Cobranza — Hoy</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;text-align:center">
          <div>
            <div style="font-size:11px;opacity:0.7">OBJETIVO DE HOY</div>
            <div style="font-size:22px;font-weight:800">${formatMoney(totalObjetivoGlobal)}</div>
          </div>
          <div>
            <div style="font-size:11px;opacity:0.7">RECAUDADO</div>
            <div style="font-size:22px;font-weight:800;color:#4ade80">${formatMoney(totalRecaudadoGlobal)}</div>
          </div>
        </div>
        <div style="margin-top:12px;background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden">
          <div style="width:${Math.min(100, porcentajeGlobal)}%;background:#22c55e;height:100%"></div>
        </div>
        <div class="flex-between" style="margin-top:8px">
          <span style="font-size:13px;opacity:0.8">
            ${totalObjetivoGlobal === 0
        ? 'Sin créditos activos hoy'
        : totalRecaudadoGlobal >= totalObjetivoGlobal
          ? `✅ Meta superada (+${formatMoney(totalRecaudadoGlobal - totalObjetivoGlobal)})`
          : `Faltan: ${formatMoney(totalObjetivoGlobal - totalRecaudadoGlobal)}`}
          </span>
          <span style="font-size:13px;font-weight:700">${Math.min(100, porcentajeGlobal)}%</span>
        </div>
      </div>

      <!-- BALANCE GENERAL -->
      <div class="card" style="padding:16px;margin-bottom:16px;background:#0f172a;color:white;border:none">
        <div style="font-size:11px;opacity:0.7;font-weight:700;text-transform:uppercase;margin-bottom:14px">
          💰 Balance General
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">
          <div style="font-size:10px;opacity:0.6;margin-bottom:4px">PRESTADO HOY</div>
<div style="font-size:16px;font-weight:800;color:#f87171">${formatMoney(prestadoHoy)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">POR COBRAR</div>
            <div style="font-size:16px;font-weight:800;color:#fbbf24">${formatMoney(totalPorCobrar)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">SALDO EN CAJA</div>
            <div style="font-size:16px;font-weight:800;color:#4ade80">${formatMoney(cajasHoy)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:10px;text-align:center">
            <div style="font-size:10px;opacity:0.6;margin-bottom:4px">GASTOS HOY</div>
            <div style="font-size:16px;font-weight:800;color:#f87171">${formatMoney(gastosHoy)}</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;margin-bottom:6px">
          <div style="width:${totalRecuperado}%;background:#22c55e;height:100%"></div>
        </div>
        <div style="font-size:12px;opacity:0.7;margin-bottom:14px">${totalRecuperado}% recuperado del total prestado</div>
        <div style="font-size:10px;opacity:0.6;font-weight:700;text-transform:uppercase;margin-bottom:8px">
          Cobros de hoy por método
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px">
            <div style="font-size:10px;opacity:0.7">📱 Yape/Plin</div>
            <div style="font-weight:800;font-size:15px">${formatMoney(totalYape)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px">
            <div style="font-size:10px;opacity:0.7">💵 Efectivo</div>
            <div style="font-weight:800;font-size:15px">${formatMoney(totalEfectivo)}</div>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px">
            <div style="font-size:10px;opacity:0.7">🏦 Transf.</div>
            <div style="font-weight:800;font-size:15px">${formatMoney(totalTransferencia)}</div>
          </div>
        </div>
      </div>

      <!-- ALERTAS -->
      ${(() => {
        const alertas = getAlertasCreditos();
        const vencidosHoy = alertas.filter(a => a.tipo === 'vencido');
        const morosos = alertas.filter(a => a.tipo === 'moroso');

        if (alertas.length === 0) return `
          <div style="background:#f0fff4;border:2px solid #c6f6d5;border-radius:14px;
            padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">✅</span>
            <div style="font-size:14px;font-weight:600;color:#276749">Todo al día — sin vencimientos</div>
          </div>`;

        return `
        <div style="background:#fff5f5;border:2px solid #fed7d7;border-radius:14px;padding:14px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-size:22px">🚨</span>
            <div>
              <div style="font-weight:800;font-size:15px;color:var(--danger)">
                ${vencidosHoy.length > 0 ? `${vencidosHoy.length} crédito${vencidosHoy.length > 1 ? 's' : ''} vencido${vencidosHoy.length > 1 ? 's' : ''}` : ''}
                ${vencidosHoy.length > 0 && morosos.length > 0 ? ' · ' : ''}
                ${morosos.length > 0 ? `${morosos.length} con atraso` : ''}
              </div>
              <div style="font-size:12px;color:var(--muted)">Requieren atención inmediata</div>
            </div>
          </div>
          ${vencidosHoy.length > 0 ? `
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--danger);
            margin-bottom:6px;letter-spacing:0.5px">🔴 Vencidos</div>
          ${vencidosHoy.map(a => `
            <div style="background:white;border-radius:10px;padding:10px 12px;margin-bottom:6px;
              border-left:4px solid var(--danger);display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:700;font-size:14px">${a.cliente?.nombre || '—'}</div>
                <div style="font-size:12px;color:var(--muted)">
                  👤 ${a.cobrador?.nombre || '—'} · Saldo: ${formatMoney(a.saldo)}
                </div>
                <div style="font-size:11px;color:var(--danger);margin-top:2px">
                  Venció el ${calcularFechaFin(a.cr.fechaInicio, a.cr.diasTotal)}
                </div>
              </div>
              <button class="btn btn-sm" style="background:var(--danger);color:white;white-space:nowrap;font-size:11px"
                onclick="abrirGestionCredito('${a.cr.id}','${a.cliente?.id}')">Gestionar</button>
            </div>`).join('')}` : ''}
          ${morosos.length > 0 ? `
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#b7791f;
            margin-top:${vencidosHoy.length > 0 ? '10px' : '0'};margin-bottom:6px;letter-spacing:0.5px">
            ⚠️ Con atraso en pagos</div>
          ${morosos.map(a => `
            <div style="background:white;border-radius:10px;padding:10px 12px;margin-bottom:6px;
              border-left:4px solid #f59e0b;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:700;font-size:14px">${a.cliente?.nombre || '—'}</div>
                <div style="font-size:12px;color:var(--muted)">
                  👤 ${a.cobrador?.nombre || '—'} · Saldo: ${formatMoney(a.saldo)}
                </div>
                <div style="font-size:11px;color:#b7791f;margin-top:2px">
                  ${a.dias} día${a.dias > 1 ? 's' : ''} sin pagar
                </div>
              </div>
              <button class="btn btn-sm" style="background:#f59e0b;color:white;white-space:nowrap;font-size:11px"
                onclick="abrirGestionCredito('${a.cr.id}','${a.cliente?.id}')">Gestionar</button>
            </div>`).join('')}` : ''}
        </div>`;
      })()}

      <!-- RENDIMIENTO POR COBRADOR -->
      <div class="card-title">Rendimiento por Cobrador</div>
      ${cobradores.map(u => {
        const c = getCuadreDelDia(u.id, hoy);
        const meta = calcularMetaReal(u.id, hoy);
        const caja = getCajaChicaDelDia(u.id, hoy);
        const expandido = state._expandCobrador === u.id;
        const metaCumplida = meta.pendiente === 0 && meta.metaTotal > 0;

        return `
        <div class="card" style="padding:0;margin-bottom:12px;overflow:hidden">
          <div style="padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer"
  onclick="state._expandCobrador = '${u.id}' === state._expandCobrador ? null : '${u.id}';render()">
  <div class="client-avatar" style="width:44px;height:44px;font-size:18px;flex-shrink:0">${u.nombre.charAt(0)}</div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div style="font-weight:800;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.nombre}</div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        <div style="font-weight:800;font-size:17px;color:var(--success)">${formatMoney(c.total)}</div>
        <div style="font-size:16px;color:var(--muted)">${expandido ? '▸' : '▾'}</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:3px">
      ${meta.detalle.length} clientes ·
      <span style="color:${metaCumplida ? 'var(--success)' : 'var(--danger)'};font-weight:600">
        ${metaCumplida ? '✅ Meta cumplida' : '⏳ Pendiente ' + formatMoney(meta.pendiente)}
      </span>
    </div>
  </div>
</div>

          ${expandido ? `
          <div style="border-top:1px solid #f1f5f9">
            <div style="padding:12px 16px;background:#f8fafc">
              <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
                💰 Cobros del día
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
                <div style="background:white;border-radius:10px;padding:10px 8px;box-shadow:var(--shadow)">
                  <div style="font-size:11px;color:var(--muted);font-weight:600">📱 Yape/Plin</div>
                  <div style="font-weight:800;font-size:16px;margin-top:2px">${formatMoney(c.yape)}</div>
                </div>
                <div style="background:white;border-radius:10px;padding:10px 8px;box-shadow:var(--shadow)">
                  <div style="font-size:11px;color:var(--muted);font-weight:600">💵 Efectivo</div>
                  <div style="font-weight:800;font-size:16px;margin-top:2px">${formatMoney(c.efectivo)}</div>
                </div>
                <div style="background:white;border-radius:10px;padding:10px 8px;box-shadow:var(--shadow)">
                  <div style="font-size:11px;color:var(--muted);font-weight:600">🏦 Transf.</div>
                  <div style="font-weight:800;font-size:16px;margin-top:2px">${formatMoney(c.transferencia)}</div>
                </div>
              </div>
            </div>
            <div style="padding:12px 16px;border-top:1px solid #f1f5f9">
              <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
                💼 Caja
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div style="background:#f8fafc;border-radius:10px;padding:10px 12px">
                  <div style="font-size:11px;color:var(--muted)">Inicial</div>
                  <div style="font-weight:800;font-size:16px">${formatMoney(caja.cajaInicial)}</div>
                </div>
                <div style="background:#f0fff4;border-radius:10px;padding:10px 12px">
                  <div style="font-size:11px;color:#276749">Cobros</div>
                  <div style="font-weight:800;font-size:16px;color:#276749">${formatMoney(caja.cobrosDelDia)}</div>
                </div>
                <div style="background:#fff5f5;border-radius:10px;padding:10px 12px">
                  <div style="font-size:11px;color:var(--danger)">Préstamos</div>
                  <div style="font-weight:800;font-size:16px;color:var(--danger)">${formatMoney(caja.totalPrestadoHoy)}</div>
                </div>
                <div style="background:#fff5f5;border-radius:10px;padding:10px 12px">
                  <div style="font-size:11px;color:var(--danger)">Gastos</div>
                  <div style="font-weight:800;font-size:16px;color:var(--danger)">${formatMoney(caja.totalGastos)}</div>
                </div>
              </div>
              <div style="background:#1e293b;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:600">Saldo en caja</div>
                <div style="font-size:20px;font-weight:800;color:${caja.saldo >= caja.cajaInicial ? '#4ade80' : '#fbbf24'}">
                  ${formatMoney(caja.saldo)}
                </div>
              </div>
            </div>
            ${caja.gastos.length > 0 ? `
            <div style="padding:12px 16px;border-top:1px solid #f1f5f9">
              <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:8px">
                🧾 Gastos (${caja.gastos.length})
              </div>
              ${caja.gastos.map(g => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f8fafc">
                  <div style="font-size:14px;font-weight:600">${g.descripcion}</div>
                  <div style="font-weight:700;color:var(--danger)">${formatMoney(g.monto)}</div>
                </div>`).join('')}
            </div>` : ''}
            <div style="padding:12px 16px;border-top:1px solid #f1f5f9;display:flex;gap:8px">
              <button class="btn btn-sm" style="flex:1;background:#eff6ff;color:var(--primary);border:1px solid #bfdbfe;font-size:13px;padding:10px"
                onclick="abrirAsignarCaja('${u.id}')">💼 Caja chica</button>
              <button class="btn btn-sm" style="flex:1;background:#fff5f5;color:var(--danger);border:1px solid #fed7d7;font-size:13px;padding:10px"
                onclick="abrirNuevoGastoAdmin('${u.id}')">➕ Gasto</button>
            </div>
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  // ─── VISTA COBRADOR ────────────────────────────────────────────────────────
  const cuadreHoy = getCuadreDelDia(state.currentUser.id, hoy);
  const meta = calcularMetaReal(state.currentUser.id, hoy);
  const metaAlcanzada = meta.pendiente === 0 && meta.metaTotal > 0;
  const notaActual = cuadreHoy.nota || '';

  return `
  <div class="topbar">
    <h2>Mi Cuadre</h2>
    <div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div>
  </div>
  <div class="page">

    ${renderPanelCajaChica()}

    <div class="card" style="padding:16px;margin-bottom:12px;background:${metaAlcanzada ? '#f0fdf4' : '#fffbeb'};border-left:4px solid ${metaAlcanzada ? '#22c55e' : '#f59e0b'}">
      <div class="flex-between">
        <div>
          <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Meta Diaria</div>
          <div style="font-size:22px;font-weight:800;color:#1e293b">${formatMoney(meta.metaTotal)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--muted);font-weight:700;text-transform:uppercase">Recaudado</div>
          <div style="font-size:22px;font-weight:800;color:${metaAlcanzada ? '#16a34a' : '#1e293b'}">${formatMoney(cuadreHoy.total)}</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:14px;font-weight:600;color:${metaAlcanzada ? '#166534' : '#92400e'}">
        ${metaAlcanzada
      ? cuadreHoy.total > meta.metaTotal
        ? `✅ ¡Meta cumplida! Superaste por ${formatMoney(cuadreHoy.total - meta.metaTotal)}`
        : `✅ ¡Meta cumplida!`
      : `Faltan ${formatMoney(meta.pendiente)} para la meta`}
      </div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Clientes de hoy (${meta.detalle.length})</div>
      ${meta.detalle.length === 0
      ? '<p style="padding:16px;text-align:center;color:#94a3b8;font-size:14px">No hay créditos activos asignados</p>'
      : meta.detalle.map(d => {
        const pagosCliente = cuadreHoy.pagos.filter(p => p.clienteId === d.cliente?.id);
        const metodoPago = pagosCliente.map(p => p.tipo.toUpperCase()).join(', ') || '—';
        return `
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:10px 0;border-bottom:1px solid #f1f5f9">
              <div style="flex:1">
                <div style="font-weight:700;font-size:14px">${d.cliente?.nombre || '—'}</div>
                <div style="font-size:12px;color:var(--muted)">
                  Cuota: ${formatMoney(d.cuota)}
                  ${d.montoPagadoHoy > 0 ? ' · ' + metodoPago : ''}
                </div>
              </div>
              <div style="text-align:right">
                ${d.completo
            ? `<span style="background:#f0fff4;color:#276749;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;min-width:80px;text-align:center;display:inline-block">✅ ${formatMoney(d.montoPagadoHoy)}</span>`
            : d.montoPagadoHoy > 0
              ? `<span style="background:#fffbeb;color:#b7791f;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;min-width:80px;text-align:center;display:inline-block">⚠️ ${formatMoney(d.montoPagadoHoy)}</span>`
              : `<span style="background:#fff5f5;color:var(--danger);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;min-width:80px;text-align:center;display:inline-block">❌ Sin pagar</span>`}
              </div>
            </div>`;
      }).join('')}
    </div>

    <div class="card" style="padding:14px">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">📝 NOTA DEL DÍA</div>
      <textarea id="notaHoy" class="form-control" style="height:70px;font-size:14px;resize:none"
        placeholder="Escribe aquí novedades del día...">${notaActual}</textarea>
      <button class="btn btn-primary" style="width:100%;margin-top:10px;font-size:14px"
        onclick="guardarNota()">
        💾 Guardar Nota
      </button>
    </div>

  </div>`;
}