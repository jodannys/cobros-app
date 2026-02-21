function getCuadreDelDia(cobradorId, fecha) {
  const pagos = DB._cache['pagos'] || [];
  const pagosDia = pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha);
  const yape          = pagosDia.filter(p => p.tipo === 'yape').reduce((s, p) => s + p.monto, 0);
  const efectivo      = pagosDia.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + p.monto, 0);
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

// CORRECCIÓN P3: Calcula la meta diaria real verificando quién debe cobrar HOY
// Un crédito cuenta para la meta del día si:
//   1. Está activo
//   2. fechaInicio <= hoy (ya arrancó)
//   3. No ha terminado su plazo aún
// Y la "meta alcanzada" se evalúa por cliente: si el cliente pagó hoy,
// su cuota se descuenta de lo que falta; si no pagó, su cuota queda pendiente.
function calcularMetaReal(cobradorId, fecha) {
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const pagos    = DB._cache['pagos']    || [];

  // Clientes de este cobrador
  const misClientesIds = clientes
    .filter(c => c.cobradorId === cobradorId)
    .map(c => c.id);

  // Créditos activos que ya arrancaron (fechaInicio <= fecha)
  const creditosActivos = creditos.filter(cr =>
    misClientesIds.includes(cr.clienteId) &&
    cr.activo === true &&
    cr.fechaInicio <= fecha
  );

  let metaTotal   = 0;
  let pagadoHoy   = 0;
  let pendiente   = 0;
  const detalle   = []; // { cliente, cuota, pagadoHoy, completo }

  creditosActivos.forEach(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    const cuota   = Number(cr.cuotaDiaria) || 0;

    // Pagos de HOY para este crédito
    const pagosHoyCliente = pagos.filter(
      p => p.creditoId === cr.id && p.fecha === fecha
    );
    const montoPagadoHoy = pagosHoyCliente.reduce((s, p) => s + Number(p.monto), 0);

    metaTotal += cuota;
    pagadoHoy += montoPagadoHoy;

    const completo = montoPagadoHoy >= cuota;
    if (!completo) pendiente += (cuota - montoPagadoHoy);

    detalle.push({
      cliente,
      cr,
      cuota,
      montoPagadoHoy,
      completo
    });
  });

  return { metaTotal, pagadoHoy, pendiente, detalle };
}

function renderCuadre() {
  const isAdmin  = state.currentUser.role === 'admin';
  const hoy      = today();
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const usuarios = DB._cache['users']    || [];

  // ─── VISTA ADMINISTRADOR ───────────────────────────────────────────────────
  if (isAdmin) {
    const totalObjetivoGlobal = creditos
      .filter(cr => cr.activo === true && cr.fechaInicio <= hoy)
      .reduce((s, cr) => s + (Number(cr.cuotaDiaria) || 0), 0);

    const cobradores = usuarios.filter(u => u.role === 'cobrador');
    const cobradorIds = cobradores.map(u => u.id);
    // Solo pagos de cobradores registrados (evita contar pagos de admin u otros)
    const pagosHoy = (DB._cache['pagos'] || []).filter(p => p.fecha === hoy && cobradorIds.includes(p.cobradorId));
    const totalRecaudadoGlobal = pagosHoy.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    const porcentajeGlobal = totalObjetivoGlobal > 0
      ? Math.round((totalRecaudadoGlobal / totalObjetivoGlobal) * 100)
      : 0;

    return `
    <div class="topbar">
      <h2>Cuadre General</h2>
      <div class="topbar-user"><strong>Admin</strong></div>
    </div>
    <div class="page">
      <div class="card" style="padding:16px;margin-bottom:16px;background:#1e293b;color:white;border:none">
        <div style="font-size:11px;opacity:0.8;font-weight:700;text-transform:uppercase;margin-bottom:10px">Estado de Cobranza — Hoy</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
          <div>
            <div style="font-size:11px;opacity:0.7">OBJETIVO TOTAL</div>
            <div style="font-size:22px;font-weight:800">${formatMoney(totalObjetivoGlobal)}</div>
          </div>
          <div>
            <div style="font-size:11px;opacity:0.7">RECAUDADO</div>
            <div style="font-size:22px;font-weight:800;color:#4ade80">${formatMoney(totalRecaudadoGlobal)}</div>
          </div>
        </div>
        <div style="margin-top:12px;background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden">
          <div style="width:${Math.min(100,porcentajeGlobal)}%;background:#22c55e;height:100%"></div>
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

      <!-- ALERTAS AUTOMÁTICAS: clientes con fecha vencida -->
      ${(() => {
        const alertas = getAlertasCreditos();
        const vencidosHoy = alertas.filter(a => a.tipo === 'vencido');
        const morosos     = alertas.filter(a => a.tipo === 'moroso');

        if (alertas.length === 0) return `
          <div style="background:#f0fff4;border:2px solid #c6f6d5;border-radius:14px;
            padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">✅</span>
            <div style="font-size:14px;font-weight:600;color:#276749">Todo al día — sin vencimientos ni atrasos</div>
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

      <div class="card-title">Rendimiento por Cobrador</div>
      ${cobradores.map(u => {
        const c    = getCuadreDelDia(u.id, hoy);
        const meta = calcularMetaReal(u.id, hoy);
        return `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <div class="flex-between" style="margin-bottom:10px">
            <div style="font-weight:700;font-size:15px">${u.nombre}</div>
            <div style="font-weight:800;font-size:15px;color:var(--success)">${formatMoney(c.total)}</div>
          </div>
    
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-bottom:10px">
            <div style="background:var(--bg);border-radius:10px;padding:10px 8px">
              <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px">📱 YAPE</div>
              <div style="font-weight:800;font-size:17px">${formatMoney(c.yape)}</div>
            </div>
            <div style="background:var(--bg);border-radius:10px;padding:10px 8px">
              <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px">💵 EFECTIVO</div>
              <div style="font-weight:800;font-size:17px">${formatMoney(c.efectivo)}</div>
            </div>
            <div style="background:var(--bg);border-radius:10px;padding:10px 8px">
              <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px">🏦 TRANSF.</div>
              <div style="font-weight:800;font-size:17px">${formatMoney(c.transferencia)}</div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:10px">
            Meta: <strong>${formatMoney(meta.metaTotal)}</strong> · Pendiente: 
            <strong style="color:${meta.pendiente > 0 ? 'var(--danger)' : 'var(--success)'}">
              ${formatMoney(meta.pendiente)}
            </strong>
          </div>
          ${renderCajaChicaAdmin(u.id, hoy)}
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn btn-sm" style="flex:1;background:#eff6ff;color:var(--primary);border:1px solid #bfdbfe;font-size:13px;padding:10px"
              onclick="abrirAsignarCaja('${u.id}')">💼 Caja chica</button>
            <button class="btn btn-sm" style="flex:1;background:#fff5f5;color:var(--danger);border:1px solid #fed7d7;font-size:13px;padding:10px"
              onclick="abrirNuevoGastoAdmin('${u.id}')">➕ Gasto</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ─── VISTA COBRADOR ────────────────────────────────────────────────────────
  const cuadreHoy = getCuadreDelDia(state.currentUser.id, hoy);
  const meta      = calcularMetaReal(state.currentUser.id, hoy);
  const metaAlcanzada = meta.pendiente === 0 && meta.metaTotal > 0;

  // Nota actual para habilitar botón
  const notaActual = cuadreHoy.nota || '';

  return `
  <div class="topbar">
    <h2>Mi Cuadre</h2>
    <div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div>
  </div>
  <div class="page">

    <!-- PANEL CAJA CHICA -->
    ${renderPanelCajaChica()}

    <!-- PANEL META DIARIA (P3 CORREGIDO) -->
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
          ? `✅ ¡Meta cumplida! Superaste por ${formatMoney(cuadreHoy.total - meta.metaTotal)}`
          : `Faltan ${formatMoney(meta.pendiente)} para la meta`}
      </div>
    </div>

    <!-- DESGLOSE YAPE / EFECTIVO / TRANSFERENCIA (P4 CORREGIDO: textos más grandes) -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:white;padding:12px 8px;border-radius:12px;text-align:center;border:1px solid #e2e8f0;box-shadow:var(--shadow)">
        <div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px">📱 YAPE</div>
        <div style="font-weight:800;font-size:16px;color:#1e293b">${formatMoney(cuadreHoy.yape)}</div>
      </div>
      <div style="background:white;padding:12px 8px;border-radius:12px;text-align:center;border:1px solid #e2e8f0;box-shadow:var(--shadow)">
        <div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px">💵 EFECTIVO</div>
        <div style="font-weight:800;font-size:16px;color:#1e293b">${formatMoney(cuadreHoy.efectivo)}</div>
      </div>
      <div style="background:white;padding:12px 8px;border-radius:12px;text-align:center;border:1px solid #e2e8f0;box-shadow:var(--shadow)">
        <div style="font-size:12px;color:var(--muted);font-weight:600;margin-bottom:4px">🏦 TRANSF.</div>
        <div style="font-weight:800;font-size:16px;color:#1e293b">${formatMoney(cuadreHoy.transferencia)}</div>
      </div>
    </div>

    <!-- DETALLE CLIENTE POR CLIENTE (P3: quién pagó / quién no) -->
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Estado por cliente (hoy)</div>
      ${meta.detalle.length === 0
        ? '<p style="padding:16px;text-align:center;color:#94a3b8;font-size:14px">No hay créditos activos asignados</p>'
        : meta.detalle.map(d => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9">
            <div style="flex:1">
              <div style="font-weight:700;font-size:14px">${d.cliente ? d.cliente.nombre : '—'}</div>
              <div style="font-size:12px;color:var(--muted)">Cuota: ${formatMoney(d.cuota)}</div>
            </div>
            <div style="text-align:right">
              ${d.completo
                ? `<span style="background:#f0fff4;color:#276749;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">✅ Pagó</span>`
                : d.montoPagadoHoy > 0
                  ? `<span style="background:#fffbeb;color:#b7791f;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">⚠️ Parcial ${formatMoney(d.montoPagadoHoy)}</span>`
                  : `<span style="background:#fff5f5;color:var(--danger);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">❌ Sin pagar</span>`}
            </div>
          </div>`).join('')}
    </div>

    <!-- COBROS DEL DÍA -->
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Cobros del día (${cuadreHoy.pagos.length})</div>
      ${cuadreHoy.pagos.length === 0
        ? '<p style="padding:16px;text-align:center;color:#94a3b8;font-size:14px">No hay cobros registrados</p>'
        : cuadreHoy.pagos.map(p => {
            const cl = clientes.find(c => c.id === p.clienteId);
            return `
            <div class="cuota-item" style="border-bottom:1px solid #f1f5f9;padding:10px 0">
              <div>
                <div style="font-weight:700;font-size:14px">${cl ? cl.nombre : 'Cliente'}</div>
                <div style="font-size:12px;color:#64748b">${p.tipo.toUpperCase()}</div>
              </div>
              <div style="font-weight:800;font-size:15px;color:#059669">${formatMoney(p.monto)}</div>
            </div>`;
          }).join('')}
    </div>

    <!-- NOTA DEL DÍA (P3 CORREGIDO: botón siempre activo) -->
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