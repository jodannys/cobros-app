// ══════════════════════════════════════════════════════════════
// GESTIÓN DE CUADRE Y RENDIMIENTO
// ══════════════════════════════════════════════════════════════
window.getCuadreDelDia = function (cobradorId, fecha) {
  const pagos = DB._cache['pagos'] || [];
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];

  // Pagos reales (cobros de cuotas)
  const pagosDia = pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha && !p.eliminado);
  const yape = pagosDia.filter(p => p.tipo === 'yape').reduce((s, p) => s + Number(p.monto), 0);
  const efectivo = pagosDia.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + Number(p.monto), 0);
  const transferencia = pagosDia.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + Number(p.monto), 0);

  // Seguros — separados de los cobros
  const misClientesIds = clientes.filter(c => c.cobradorId === cobradorId).map(c => c.id);
  const prestamosHoy = creditos.filter(cr => cr.fechaInicio === fecha && misClientesIds.includes(cr.clienteId));
  let segurosYape = 0, segurosEfectivo = 0, segurosTransferencia = 0;
  prestamosHoy.forEach(cr => {
    const montoSeguro = Number(cr.montoSeguro || 0);
    const metodo = (cr.metodoPago || 'Efectivo').toLowerCase();
    if (metodo.includes('yape')) segurosYape += montoSeguro;
    else if (metodo.includes('transferencia')) segurosTransferencia += montoSeguro;
    else segurosEfectivo += montoSeguro;
  });
  const totalSeguros = segurosYape + segurosEfectivo + segurosTransferencia;

  const notas = DB._cache['notas_cuadre'] || [];
  const notaObj = notas.find(n => n.cobradorId === cobradorId && n.fecha === fecha);

  return {
    yape, efectivo, transferencia,
    total: yape + efectivo + transferencia + totalSeguros, // total real para saldo
    totalPagos: yape + efectivo + transferencia,           // solo cobros
    totalSeguros,
    nota: notaObj ? notaObj.nota : '',
    pagos: pagosDia
  };
};

window.calcularMetaReal = function (cobradorId, fecha) {
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const pagos = DB._cache['pagos'] || [];

  const misClientesIds = clientes
    .filter(c => c.cobradorId === cobradorId)
    .map(c => c.id);

  if (!esDiaLaboral(fecha)) {
    return {
      metaTotal: 0,
      pagadoHoy: 0,
      pendiente: 0,
      detalle: [],
      totalVencidos: 0,
      clientesVencidos: 0,
      cobrosExtra: []
    };
  }

  // Incluir también créditos cerrados HOY (para mostrar badge de pago en la lista)
  const creditosConPagoHoy = new Set(
    pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha && !p.eliminado)
         .map(p => p.creditoId)
  );

  const creditosTodos = creditos.filter(cr =>
    misClientesIds.includes(cr.clienteId) &&
    cr.fechaInicio <= fecha &&
    (cr.activo === true || creditosConPagoHoy.has(cr.id))
  );

  let metaTotal = 0;
  let pagadoHoy = 0;
  let pendiente = 0;
  let totalVencidos = 0;
  let clientesVencidos = 0;

  const detalle = [];

  // ─────────────────────────────────────────────
  // RECORRER CRÉDITOS
  // ─────────────────────────────────────────────
  creditosTodos.forEach(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    const cuota = Number(cr.cuotaDiaria) || 0;
    if (cuota <= 0) return;

    const pagosNoEliminados = pagos.filter(p =>
      p.creditoId === cr.id && !p.eliminado
    );

    const montoPagadoHoy = pagosNoEliminados
      .filter(p => p.fecha === fecha)
      .reduce((s, p) => s + Number(p.monto), 0);

    const totalPagado = pagosNoEliminados
      .reduce((s, p) => s + Number(p.monto), 0);

    const saldoRestante = Number(cr.total) - totalPagado;

    // Crédito ya saldado: solo mostrarlo si pagó HOY (badge de saldado)
    if (saldoRestante <= 0.5) {
      if (montoPagadoHoy > 0) {
        detalle.push({
          cliente, cr, cuota, montoPagadoHoy,
          completo: true, deudaAcumulada: 0, atrasado: false,
          cuotasAtraso: 0, saldoRestante: 0, estadoVisual: 'saldado'
        });
      }
      return;
    }

    const diasTranscurridos = Math.max(0, contarDiasHabiles(cr.fechaInicio, fecha) - 1);

    const estado = calcularEstadoAtraso(cr, pagosNoEliminados, fecha);

    const leTocaHoy =
      diasTranscurridos >= 1 &&
      diasTranscurridos <= Number(cr.diasTotal);

    const alDia =
      estado.cuotasCubiertas >= estado.cuotasDebidas;

    // ── META ──
    const totalPagadoSinHoy = totalPagado - montoPagadoHoy;

    const cuotasCubiertasSinHoy = Math.min(
      Math.floor((totalPagadoSinHoy + 0.5) / cuota),
      diasTranscurridos
    );

    const estabaAlDiaSinHoy =
      cuotasCubiertasSinHoy >= diasTranscurridos;

    if (leTocaHoy && !estabaAlDiaSinHoy) {
      metaTotal += cuota;

      const cuotaPagadaHoy = Math.min(montoPagadoHoy, cuota);
      pagadoHoy += cuotaPagadaHoy;

      if (cuotaPagadaHoy < cuota) {
        pendiente += (cuota - cuotaPagadaHoy);
      }
    }

    // ── ESTADO VISUAL ──
    let estadoVisual = 'pendiente';

    if (montoPagadoHoy >= cuota) {
      estadoVisual = 'pagado';
    } else if (montoPagadoHoy > 0) {
      estadoVisual = 'parcial';
    } else if (estado.atrasado) {
      // Solo muestra 'atrasado' si NO pagó nada hoy
      estadoVisual = 'atrasado';
    }

    const deudaAcumulada =
      Math.round(estado.cuotasAtraso * cuota * 100) / 100;

    if (estado.atrasado) {
      totalVencidos += deudaAcumulada;
      clientesVencidos++;
    }

    const pendienteEnRuta = leTocaHoy
      ? !alDia
      : estado.atrasado;

    detalle.push({
      cliente,
      cr,
      cuota,
      montoPagadoHoy,
      completo: !pendienteEnRuta,
      deudaAcumulada,
      atrasado: estado.atrasado,
      cuotasAtraso: estado.cuotasAtraso,
      saldoRestante,
      estadoVisual
    });
  });

  // ─────────────────────────────────────────────
  // COBROS EXTRA (créditos inactivos desde ANTES de hoy)
  // Los saldados HOY ya aparecen arriba como 'saldado', no duplicar
  // ─────────────────────────────────────────────
  const detalleIds = new Set(detalle.map(d => d.cr.id));

  const creditosInactivosIds = new Set(
    creditos
      .filter(cr =>
        misClientesIds.includes(cr.clienteId) &&
        cr.activo === false &&
        !detalleIds.has(cr.id)   // excluir los ya mostrados como 'saldado'
      )
      .map(cr => cr.id)
  );

  const cobrosExtra = pagos
    .filter(p =>
      !p.eliminado &&
      p.fecha === fecha &&
      p.cobradorId === cobradorId &&
      creditosInactivosIds.has(p.creditoId)
    )
    .map(p => {
      const crObj = creditos.find(c => c.id === p.creditoId);
      const clienteObj = clientes.find(c => c.id === p.clienteId);

      return {
        pago: p,
        cr: crObj,
        cliente: clienteObj
      };
    });

  // ─────────────────────────────────────────────
  // RETURN FINAL (ÚNICO Y CORRECTO ✅)
  // ─────────────────────────────────────────────
  return {
    metaTotal: Math.round(metaTotal * 100) / 100,
    pagadoHoy: Math.round(pagadoHoy * 100) / 100,
    pendiente: Math.round(pendiente * 100) / 100,
    detalle,
    totalVencidos: Math.round(totalVencidos * 100) / 100,
    clientesVencidos,
    cobrosExtra
  };
};
window.guardarNota = async function () {
  const notaElement = document.getElementById('notaHoy');
  if (!notaElement) return;
  const nota = notaElement.value.trim();
  if (nota === '') return;

  const notas = DB._cache['notas_cuadre'] || [];
  const hoy = today();
  const existing = notas.find(n => n.cobradorId === state.currentUser.id && n.fecha === hoy);

  try {
    if (existing) {
      await DB.update('notas_cuadre', existing.id, { nota });
      existing.nota = nota;
    } else {
      const id = genId();
      const nueva = { id, cobradorId: state.currentUser.id, fecha: hoy, nota };
      await DB.set('notas_cuadre', id, nueva);
      // Actualizar cache para evitar duplicados si el listener no ha disparado aún
      if (!DB._cache['notas_cuadre']) DB._cache['notas_cuadre'] = [];
      DB._cache['notas_cuadre'].push(nueva);
    }
    showToast('Nota guardada');
    render();
    setTimeout(() => { const el = document.getElementById('notaHoy'); if (el) el.value = ''; }, 100);
  } catch (e) {
    alert('Error al guardar nota: ' + e.message);
  }
};

// ── Helper: caja chica profesional (cobrador) ─────────────────
window._renderCajaChicaPro = function (caja, cuadre, fecha) {
  const saldoPositivo = caja.saldo >= 0;
  const saldoColor = saldoPositivo ? '#4ade80' : '#f87171';

  return `
  <div style="border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:var(--shadow)">

    <div style="background:#0f172a; background-image:
                  radial-gradient(circle at 15% 50%, rgba(37,99,235,0.2) 0%, transparent 55%),
                  radial-gradient(circle at 85% 30%, rgba(5,150,105,0.15) 0%, transparent 55%);
                padding:18px 18px 16px">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <div style="font-size:10.5px; font-weight:700; color:rgba(255,255,255,0.45);
                    text-transform:uppercase; letter-spacing:1px">Caja Chica</div>
        <div style="font-size:11px; font-weight:600; background:rgba(255,255,255,0.08);
                    color:rgba(255,255,255,0.6); padding:3px 12px; border-radius:20px">
          ${formatDate(fecha || today())}
        </div>
      </div>

      <div style="text-align:center; padding:8px 0 16px">
        <div style="font-size:15px; color:rgba(255,255,255,0.6); font-weight:600;
                    letter-spacing:2px; text-transform:uppercase; margin-bottom:6px">
          Saldo actual
        </div>
        <div style="font-size:38px; font-weight:900; color:${saldoColor}; letter-spacing:-2px;
                    text-shadow:0 0 40px ${saldoPositivo ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}">
          ${formatMoney(caja.saldo)}
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.08); border-radius:4px; height:4px; overflow:hidden">
        ${caja.cajaInicial > 0 ? `
          <div style="height:100%; border-radius:4px;
                      background:${saldoPositivo
        ? 'linear-gradient(90deg, #2563eb, #4ade80)'
        : 'linear-gradient(90deg, #ef4444, #f87171)'};
                      width:${Math.min(100, Math.max(0, Math.abs(caja.saldo / caja.cajaInicial * 100)))}%;
                      transition:width 0.5s cubic-bezier(0.4,0,0.2,1)"></div>` : ''}
      </div>
    </div>

    <div style="background:white; padding:16px 16px 12px">
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px">
        <div style="background:var(--bg); border-radius:8px; padding:12px">
          <div style="font-size:10px; color:var(--muted); font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Inicial</div>
          <div style="font-size:17px; font-weight:800; color:var(--text)">${formatMoney(caja.cajaInicial)}</div>
        </div>
        <div style="background:#f0fdf4; border-radius:8px; padding:12px">
          <div style="font-size:10px; color:#16a34a; font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">+ Cobros</div>
          <div style="font-size:17px; font-weight:800; color:#16a34a">${formatMoney(cuadre.totalPagos != null ? cuadre.totalPagos : caja.cobrosDelDia - (caja.totalSeguros || 0))}</div>
        </div>
        <div style="background:#fff1f2; border-radius:8px; padding:12px">
          <div style="font-size:10px; color:#9f1239; font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">− Préstamos</div>
          <div style="font-size:17px; font-weight:800; color:#9f1239">${formatMoney(caja.totalPrestadoHoy)}</div>
        </div>
        <div style="background:#fff1f2; border-radius:8px; padding:12px">
          <div style="font-size:10px; color:#9f1239; font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">− Gastos</div>
          <div style="font-size:17px; font-weight:800; color:#9f1239">${formatMoney(caja.totalGastos)}</div>
        </div>
      </div>

      <div style="border-top:1px solid var(--border); padding-top:12px">
        <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform:uppercase;
                    letter-spacing:0.6px; margin-bottom:10px; text-align:center">Cobros por método</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; text-align:center">
          <div style="background:var(--bg); border-radius:8px; padding:10px">
            <div style="font-size:15px; margin-bottom:4px">📱</div>
            <div style="font-weight:800; font-size:13px; color:var(--text)">${formatMoney(cuadre.yape)}</div>
            <div style="font-size:9.5px; color:var(--muted); font-weight:600; margin-top:2px">Yape/Plin</div>
          </div>
          <div style="background:var(--bg); border-radius:8px; padding:10px">
            <div style="font-size:15px; margin-bottom:4px">💵</div>
            <div style="font-weight:800; font-size:13px; color:var(--text)">${formatMoney(cuadre.efectivo)}</div>
            <div style="font-size:9.5px; color:var(--muted); font-weight:600; margin-top:2px">Efectivo</div>
          </div>
          <div style="background:var(--bg); border-radius:8px; padding:10px">
            <div style="font-size:15px; margin-bottom:4px">🏦</div>
            <div style="font-weight:800; font-size:13px; color:var(--text)">${formatMoney(cuadre.transferencia)}</div>
            <div style="font-size:9.5px; color:var(--muted); font-weight:600; margin-top:2px">Transf.</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  ${(caja.totalSeguros || 0) > 0 ? `
  <div style="background:#fff7ed; border:1.5px solid #fed7aa; border-radius:10px;
              padding:12px 16px; margin-bottom:12px; display:flex;
              justify-content:space-between; align-items:center; gap:12px">
    <div>
      <div style="font-size:10px; font-weight:700; color:#ea580c;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px">
        🛡️ Micro Seguros del día
      </div>
    
    </div>
    <div style="font-size:20px; font-weight:900; color:#ea580c; flex-shrink:0">
      +${formatMoney(caja.totalSeguros)}
    </div>
  </div>` : ''}`;
}

window.abrirEditarGasto = function (id) {
  state._editGastoId = id;
  state.modal = 'editar-gasto';
  render();
};

// ── Render Principal ──────────────────────────────────────────
window.renderCuadre = function () {
  const isAdmin = state.currentUser.role === 'admin';
  const hoy = today();
  const creditos = DB._cache['creditos'] || [];
  const usuarios = DB._cache['users'] || [];

  // ════════════════════════════════════════════════════════
  // VISTA ADMIN
  // ════════════════════════════════════════════════════════
  if (isAdmin) {
    return `
  <div class="topbar">
    <h2>Cuadre General</h2>
    <div style="display:flex; align-items:center; gap:8px">
      ${renderIndicadorVivo()}
      <div class="topbar-user"><strong>Admin</strong></div>
      ${renderBtnAyudaAdmin()}
    </div>
  </div>
  <div class="page">
    ${renderPanelCartera()}
  </div>`;
  }
  // ════════════════════════════════════════════════════════
  // VISTA COBRADOR
  // ════════════════════════════════════════════════════════
  const userId = state.currentUser.id;
  const hoyC = today();
  const cuadreHoy = getCuadreDelDia(userId, hoyC);
  const meta = calcularMetaReal(userId, hoyC);
  const caja = getCajaChicaDelDia(userId, hoyC);

  // ── Exponer detalle para el mapa ──
  window._metaDetalle = meta.detalle;

  // ── Ordenar clientes por distancia o por nombre ──
  //const clientesPendientes = meta.detalle.filter(d => !d.completo);
  // Ahora incluimos a los que ya pagaron hoy para poder ver el badge verde
// SUSTITUYE LA LÍNEA DE clientesPendientes POR ESTA:
// ────────────────────────────────────────────────────────────────
// LOGS DE DEPURACIÓN (Pon esto en tu renderCuadre)
// ────────────────────────────────────────────────────────────────
const clientesPendientes = meta.detalle.filter(d =>
  d.estadoVisual === 'pendiente' ||
  d.estadoVisual === 'parcial' ||
  d.estadoVisual === 'pagado' ||
  d.estadoVisual === 'atrasado' ||
  (d.estadoVisual === 'saldado' && d.montoPagadoHoy > 0)
);

  if (state.miUbicacion) {
    clientesPendientes.sort((a, b) => {
      const dA = calcularDistancia(
        state.miUbicacion.lat, state.miUbicacion.lng,
        a.cliente?.lat, a.cliente?.lng
      );
      const dB = calcularDistancia(
        state.miUbicacion.lat, state.miUbicacion.lng,
        b.cliente?.lat, b.cliente?.lng
      );
      return dA - dB;
    });
  } else {
    clientesPendientes.sort((a, b) =>
      (a.cliente?.nombre || '').localeCompare(b.cliente?.nombre || '')
    );
  }

  // ── Indicador de modo GPS ──
  const indicadorGPS = state.miUbicacion
    ? `<span style="font-size:10px; color:white; font-weight:700; background:rgba(255,255,255,0.2);
         padding:2px 8px; border-radius:12px; white-space:nowrap">📍 Por cercanía</span>`
    : `<span style="font-size:10px; color:white; font-weight:700; background:rgba(255,255,255,0.15);
         padding:2px 8px; border-radius:12px; white-space:nowrap">⚠️ Por nombre</span>`;

  const metaAlcanzada = meta.pagadoHoy >= meta.metaTotal;

  const misClientesIds = new Set(
    (DB._cache['clientes'] || []).filter(c => c.cobradorId === userId).map(c => c.id)
  );
  const segurosHoy = (DB._cache['creditos'] || [])
    .filter(cr => cr.fechaInicio === hoyC && misClientesIds.has(cr.clienteId))
    .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

  const gastos = caja.gastos || [];
  const mostrarTodos = !!state._verTodosGastos;
  const gastosVisible = mostrarTodos ? gastos : gastos.slice(0, 3);
  const hayMas = gastos.length > 3;

  return `
 <div class="topbar">
  <h2>Mi Cuadre</h2>
  <div style="display:flex; align-items:center; gap:8px;">
    <div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div>
    ${state.currentUser.role === 'cobrador' ? renderBtnAyudaCobrador() : ''}
  </div>
</div>
<div class="page">

    ${_renderCajaChicaPro(caja, cuadreHoy)}

    <!-- META DE COBRANZA -->
    <div style="background:${metaAlcanzada ? '#f0fdf4' : 'white'}; border-radius:10px; padding:16px;
                margin-bottom:12px; border:1.5px solid ${metaAlcanzada ? '#86efac' : 'var(--border)'};
                box-shadow:var(--shadow)">

      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px">
        <div>
          <div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;
                      letter-spacing:0.6px; margin-bottom:4px">Meta de Cobranza</div>
          <div style="font-size:24px; font-weight:800; color:var(--text); letter-spacing:-0.5px">
            ${formatMoney(meta.metaTotal)}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10.5px; color:var(--muted); font-weight:700; text-transform:uppercase;
                      letter-spacing:0.6px; margin-bottom:4px">Recaudado</div>
          <div style="font-size:24px; font-weight:800; color:#16a34a; letter-spacing:-0.5px">
          ${formatMoney(meta.pagadoHoy)}
          </div>
        </div>
      </div>

    <div style="background:var(--bg); border-radius:4px; height:5px; overflow:hidden; margin-bottom:10px;
                  border:1px solid var(--border)">
        <div style="width:${meta.metaTotal > 0 ? Math.min(100, meta.pagadoHoy / meta.metaTotal * 100) : 0}%;
                    background:${metaAlcanzada ? '#22c55e' : 'linear-gradient(90deg,#0f172a,#2563eb)'};
                    height:100%; border-radius:4px; transition:width 0.6s cubic-bezier(0.4,0,0.2,1)"></div>
      </div>

      ${meta.totalVencidos > 0 ? `
      <div style="background:#fff7ed; border-radius:8px; padding:10px 12px; margin-bottom:10px;
                  border-left:3px solid #f97316; display:flex; justify-content:space-between; align-items:center">
        <div>
          <div style="font-size:11px; font-weight:700; color:#c2410c; text-transform:uppercase;
                      letter-spacing:0.4px">⚠️ Vencidos por cobrar</div>
          <div style="font-size:11px; color:#9a3412; margin-top:2px">
            ${meta.clientesVencidos} cliente${meta.clientesVencidos > 1 ? 's' : ''}
          </div>
        </div>
        <div style="font-size:18px; font-weight:900; color:#c2410c">
          ${formatMoney(meta.totalVencidos)}
        </div>
      </div>` : ''}

      ${segurosHoy > 0 ? `
        <div style="background:#eff6ff; border-radius:8px; padding:8px 12px; margin-bottom:10px;
                    display:flex; justify-content:space-between; align-items:center">
          <div style="display:flex; align-items:center; gap:6px">
            <span>🛡️</span>
            <span style="font-size:11px; color:#1d4ed8; font-weight:700; text-transform:uppercase;
                         letter-spacing:0.4px">Seguros cobrados</span>
          </div>
          <span style="font-size:13px; font-weight:800; color:#1d4ed8">${formatMoney(segurosHoy)}</span>
        </div>` : ''}

      <div style="display:flex; justify-content:space-between; align-items:center">
        <div style="font-size:11px; color:var(--muted)"></div>
        <div style="font-size:11.5px; font-weight:700;
                    color:${metaAlcanzada ? '#16a34a' : 'var(--warning)'}">
          ${metaAlcanzada && meta.metaTotal > 0
      ? '✅ Meta cumplida'
      : meta.metaTotal === 0
        ? '✨ Sin cobros pendientes'
        : 'Faltan ' + formatMoney(meta.pendiente)}
        </div>
      </div>
    </div>

    <!-- GASTOS -->
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
        <div class="card-title" style="margin:0">🧾 Gastos (${gastos.length})</div>
        <div style="display:flex; gap:8px">
          <button class="btn btn-sm"
            style="background:#fff1f2; color:#9f1239; border:none; font-weight:600; padding:6px 12px; border-radius:8px"
            onclick="abrirNuevoGastoAdmin('${userId}')">+ Gasto</button>
          <button class="btn btn-sm"
            style="background:#fffbeb; color:#92400e; border:none; font-weight:600; padding:6px 12px; border-radius:8px"
            onclick="abrirDepositoCobrador()">Retirar</button>
        </div>
      </div>

      ${gastos.length === 0
      ? `<div style="font-size:13px; color:var(--muted); text-align:center; padding:16px 0">
               No hay gastos hoy
             </div>`
      : gastosVisible.map(g => `
            <div style="display:flex; justify-content:space-between; align-items:center;
                        padding:10px 0; border-bottom:1px solid var(--border)">
              <div style="flex:1; min-width:0">
                <div style="font-size:13.5px; font-weight:600; color:var(--text);
                            white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
                  ${g.descripcion}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px; flex-shrink:0">
                <div style="font-weight:700; color:var(--danger); font-size:14px">
                  ${formatMoney(g.monto)}
                </div>
                ${!g._esAjuste ? `<button onclick="abrirEditarGasto('${g.id}')"
                  style="width:30px; height:30px; border-radius:8px; border:1px solid var(--border);
                         background:white; cursor:pointer; display:flex; align-items:center;
                         justify-content:center; font-size:13px">✏️</button>` : `<div style="width:30px"></div>`}
              </div>
            </div>`).join('')}

      ${hayMas ? `
        <button onclick="state._verTodosGastos=!state._verTodosGastos; render()"
          style="width:100%; margin-top:10px; padding:8px; border-radius:8px; border:none;
                 background:var(--bg); font-size:12.5px; font-weight:600; color:var(--muted); cursor:pointer">
          ${mostrarTodos ? '▲ Ver menos' : '▼ Ver todos (' + gastos.length + ')'}
        </button>` : ''}
    </div>
<!-- SWITCH DE RUTA -->
    <div style="margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;
                background:white; border-radius:10px; padding:14px 16px; box-shadow:var(--shadow);
                border:1.5px solid ${state.rutaActiva ? '#86efac' : 'var(--border)'}">
      <div>
        <div style="font-size:13px; font-weight:700; color:var(--text)">
          ${state.rutaActiva ? '🟢 Ruta en curso' : '⚪ Ruta pausada'}
        </div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px">
          ${state.rutaActiva
      ? 'GPS activo · lista ordenada por cercanía'
      : 'Presiona para activar el GPS y optimizar la ruta'}
        </div>
      </div>
      <button onclick="toggleRuta()"
        style="flex-shrink:0; border:none; border-radius:10px; padding:10px 18px;
               font-size:13px; font-weight:700; cursor:pointer;
               background:${state.rutaActiva ? '#fff1f2' : '#0f172a'};
               color:${state.rutaActiva ? '#9f1239' : 'white'}">
        ${state.rutaActiva ? '⏸️ Pausar' : '▶️ Empezar Ruta'}
      </button>
    </div>

    
  <!-- CLIENTES POR COBRAR -->
<div class="card" style="margin-bottom:12px; padding:0; overflow:hidden; border-radius:12px">
  <!-- Header ruta cobrador -->
  <div style="padding:14px 16px; display:flex; justify-content:space-between; align-items:center;
              cursor:pointer; background:linear-gradient(135deg,#1a56db,#0ea96d)"
       onclick="state._clientesPendientesOpen = !state._clientesPendientesOpen; render()">

    <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
                white-space:nowrap; color:white">
      ✅ Ruta del día
    </div>

    <div style="display:flex; align-items:center; gap:8px">
      <span style="font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700;
                   white-space:nowrap; background:rgba(255,255,255,0.2); color:white">
        ${clientesPendientes.filter(d => !d.completo).length} pendientes
      </span>

      ${indicadorGPS}

      <span style="font-size:16px; color:white">
        ${state._clientesPendientesOpen ? '▲' : '▼'}
      </span>
    </div>
  </div>

  ${state._clientesPendientesOpen ? `
  <div style="border-top:1px solid #f1f5f9; padding:0 16px 8px; background:white">
    ${(() => {
      const _filtroRuta = state._filtroRutaCobrador || 'todos';
      const _filtroKey = '_filtroRutaCobrador';

      function _getEstado(d) {
  if (d.estadoVisual === 'saldado') return 'saldado';
  if (d.estadoVisual === 'pagado') return 'pagado';
  if (d.estadoVisual === 'parcial') return 'parcial';
  if (d.estadoVisual === 'atrasado') return 'atrasado';
  if (d.estadoVisual === 'pendiente') return 'pendiente';
  return 'otros';
}

const prioridad = { atrasado: 1, pendiente: 2, parcial: 3, pagado: 4, saldado: 5 };
const listaOrdenada = [...clientesPendientes].sort((a, b) => {
  const pA = prioridad[_getEstado(a)] || 99;
  const pB = prioridad[_getEstado(b)] || 99;
  // Grupo 0 = por cobrar (atrasado/pendiente/parcial), grupo 1 = ya pagaron
  const grupoA = pA <= 3 ? 0 : 1;
  const grupoB = pB <= 3 ? 0 : 1;
  if (grupoA !== grupoB) return grupoA - grupoB;
  // Dentro del mismo grupo: por cercanía si hay GPS, si no por prioridad
  if (state.miUbicacion) {
    const dA = calcularDistancia(state.miUbicacion.lat, state.miUbicacion.lng, a.cliente?.lat, a.cliente?.lng);
    const dB = calcularDistancia(state.miUbicacion.lat, state.miUbicacion.lng, b.cliente?.lat, b.cliente?.lng);
    return dA - dB;
  }
  return pA - pB;
});

const listaFiltrada = _filtroRuta !== 'todos'
  ? listaOrdenada.filter(d => _getEstado(d) === _filtroRuta)
  : listaOrdenada;

      const _btns = [
        
        { key: 'todos', label: 'Todos' },
        { key: 'pendiente', label: '⏳ Pendientes' },
        { key: 'atrasado', label: '🔴 Atrasados' },
        { key: 'parcial', label: '🟡 Abonos' },
        { key: 'pagado', label: '✅ Pagaron' },
        { key: 'saldado', label: '🏆 Saldados' },
      ].map(function(f) {
        const isActive = _filtroRuta === f.key;
        return '<button onclick="event.stopPropagation(); state[\'' + _filtroKey + '\']=\'' + f.key + '\'; render()"'
          + (isActive ? ' data-filtro-activo="1"' : '')
          + ' style="padding:5px 10px; border-radius:15px; font-size:11px; flex-shrink:0; cursor:pointer; white-space:nowrap;'
          + ' border:' + (isActive ? '2px solid #1a56db' : '1px solid #e2e8f0') + ';'
          + ' background:' + (isActive ? '#eff6ff' : 'white') + ';'
          + ' font-weight:' + (isActive ? '700' : '400') + '">'
          + f.label + '</button>';
      }).join('');
     const filtroBar =
  '<div style="display:flex; gap:6px; overflow-x:auto; padding:14px 0 10px; margin-top:6px; margin-bottom:4px">' 
  + _btns + 
  '</div>';
       

      const listaHTML = listaFiltrada.length === 0
        ? `<div style="text-align:center; padding:20px 0; color:#94a3b8; font-size:13px">Sin clientes en este filtro</div>`
        : listaFiltrada.map(d => {
          const dist = state.miUbicacion
            ? calcularDistancia(state.miUbicacion.lat, state.miUbicacion.lng, d.cliente?.lat, d.cliente?.lng)
            : null;
          const distLabel = dist !== null ? _fmtDistancia(dist) : null;
          return `
            <div style="display:flex; justify-content:space-between; align-items:center;
                        padding:11px 0; border-bottom:1px solid var(--border)">
              <div>
                <div style="font-weight:700; font-size:14px; color:var(--text)">
                  ${d.cliente?.nombre || 'Sin nombre'}
                </div>
                <div style="font-size:11.5px; color:var(--muted); margin-top:2px;
            display:flex; align-items:center; gap:6px; flex-wrap:wrap">
            ${d.estadoVisual === 'saldado' ? `
  <span style="
    background:#bbf7d0;
    color:#14532d;
    font-size:10px;
    font-weight:700;
    padding:2px 6px;
    border-radius:4px">
    🏆 Crédito Saldado
  </span>
` : ''}

${d.estadoVisual === 'pagado' ? `
  <span style="
    background:#dcfce7;
    color:#166534;
    font-size:10px;
    font-weight:700;
    padding:2px 6px;
    border-radius:4px">
    ✅ Pagó hoy
  </span>
` : ''}

${d.estadoVisual === 'parcial' ? `
  <span style="
    background:#fef9c3;
    color:#854d0e;
    font-size:10px;
    font-weight:700;
    padding:2px 6px;
    border-radius:4px">
    🟡 Abonó ${formatMoney(d.montoPagadoHoy)}
  </span>
` : ''}

${d.estadoVisual === 'atrasado' ? `
  <span style="
    background:#fee2e2;
    color:#991b1b;
    font-size:10px;
    font-weight:700;
    padding:2px 6px;
    border-radius:4px">
    🔴 Atrasado (${d.cuotasAtraso})
  </span>
` : ''}
${d.estadoVisual === 'pendiente' ? `
  <span style="
    background:#f1f5f9;
    color:#64748b;
    font-size:10px;
    font-weight:700;
    padding:2px 6px;
    border-radius:4px">
    ⏳ Pendiente
  </span>
` : ''}
                  ${distLabel ? `
                    <span style="background:#eff6ff; color:#1d4ed8; font-size:10px;
                                 font-weight:700; padding:1px 6px; border-radius:4px">
                      📍 a ${distLabel}
                    </span>` : ''}
                  ${d.deudaAcumulada > 0.5 ? `
                    <span style="background:#fff1f2; color:#9f1239; font-size:10px;
                                 font-weight:700; padding:1px 6px; border-radius:4px">
                      ⚠️ Debe ${formatMoney(d.deudaAcumulada)}
                    </span>` : ''}
                </div>
              </div>
              ${d.estadoVisual === 'saldado' ? `
                <span style="font-size:20px; color:#16a34a; flex-shrink:0">✅</span>
              ` : `
                <button
                  onclick="if(this.getAttribute('data-loading')) return;
                           this.setAttribute('data-loading','true');
                           this.style.opacity='0.5';
                           pagoRapido('${d.cr.id}');"
                  style="cursor:pointer; border:none; padding:0; background:none; outline:none">
                  <span style="font-size:10.5px; font-weight:700; padding:5px 12px; border-radius:6px;
                               background:#fff1f2; color:#9f1239; display:inline-block; white-space:nowrap">
                    ⏳ ${formatMoney(d.cuota)}
                  </span>
                </button>
              `}
            </div>`;
        }).join('');

      if (clientesPendientes.length === 0) {
        return `<div style="text-align:center; padding:28px 0">
          <div style="font-size:28px; margin-bottom:8px">✅</div>
          <p style="color:#16a34a; font-weight:700; margin:0; font-size:13.5px">¡Ruta completada!</p>
        </div>`;
      }
      return filtroBar + listaHTML;
    })()}
  </div>` : ''}
</div>

    <!-- COBROS EXTRA (créditos vencidos/inactivos) -->
   ${meta.cobrosExtra && meta.cobrosExtra.length > 0 ? `
<div class="card" style="margin-bottom:12px; padding:0; overflow:hidden; border:1.5px solid #fde68a">
  <div
    onclick="state._cobrosExtraOpen = !state._cobrosExtraOpen; render()"
    style="padding:12px 16px; background:#fffbeb; border-bottom:1px solid #fde68a;
           display:flex; justify-content:space-between; align-items:center; cursor:pointer;
           user-select:none">
    <div style="font-size:11px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.5px">
      📋 Cobros extra
    </div>
    <div style="display:flex; align-items:center; gap:8px">
      <span style="font-size:11px; font-weight:800; color:#92400e">
        ${formatMoney(meta.cobrosExtra.reduce((s, x) => s + Number(x.pago.monto), 0))}
      </span>
      <span style="font-size:12px; color:#92400e">
        ${state._cobrosExtraOpen ? '▲' : '▼'}
      </span>
    </div>
  </div>
  ${state._cobrosExtraOpen ? `
  <div style="padding:0 16px 8px; background:white">
    ${meta.cobrosExtra.map(x => `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:10px 0; border-bottom:1px solid var(--border)">
        <div>
          <div style="font-weight:700; font-size:14px; color:var(--text)">
            ${x.cliente?.nombre || '—'}
          </div>
          <div style="display:flex; gap:6px; margin-top:3px; flex-wrap:wrap">
            <span style="background:#fff1f2; color:#9f1239; font-size:10px;
                         font-weight:700; padding:1px 7px; border-radius:4px">
              🔴 Crédito cerrado
            </span>
            <span style="font-size:11px; color:var(--muted)">${x.pago.tipo || 'efectivo'}</span>
          </div>
        </div>
        <div style="font-weight:800; color:#16a34a; font-size:15px">
          +${formatMoney(x.pago.monto)}
        </div>
      </div>`).join('')}
  </div>` : ''}
</div>` : ''}

    <!-- NOTA DEL DÍA -->
    <div style="background:#fefce8; border-radius:10px; padding:16px; margin-bottom:12px;
                box-shadow:0 4px 20px rgba(234,179,8,0.15), var(--shadow);
                border-top:3px solid #eab308">

      <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px">
        <span style="font-size:16px">📝</span>
        <div style="font-size:11px; font-weight:700; color:#854d0e;
                    text-transform:uppercase; letter-spacing:0.6px">Nota del día</div>
      </div>

      <textarea id="notaHoy"
        style="width:100%; height:60px; resize:none; border:none; outline:none;
               background:transparent; font-size:14px; color:#713f12;
               font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               line-height:1.6"
        placeholder="¿Alguna novedad del día...?"></textarea>

      <div style="border-top:1px dashed #d97706; padding-top:10px; margin-top:4px">
        <button class="btn btn-sm" onclick="guardarNota()"
          style="background:#eab308; color:white; border:none; font-weight:600;
                 padding:8px 20px; border-radius:8px; width:100%">
          Guardar nota
        </button>
      </div>
    </div>

    <!-- BOTÓN FLOTANTE MAPA -->
    <button onclick="abrirMapaRutaCobrador('${userId}', '${hoyC}')"
      style="position:fixed; bottom:90px; right:20px; z-index:199;
             width:56px; height:56px; border-radius:50%; border:none;
             background:#0f172a; color:white; font-size:22px;
             box-shadow:0 4px 16px rgba(0,0,0,0.35); cursor:pointer;
             display:flex; align-items:center; justify-content:center">
      🗺️
    </button>

  </div>`;
};

window.toggleRuta = function () {
  if (state.rutaActiva) {
    detenerGPSCuadre();
    state.rutaActiva = false;
    state.miUbicacion = null;
    state._ultimaUbicacionRuta = null;
  } else {
    state.rutaActiva = true;
    iniciarGPSCuadre();
  }
  render();
};