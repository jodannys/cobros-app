// ── Helpers internos ─────────────────────────────────────────
function _clientesDelCobrador(cobradorId) {
  return (DB._cache['clientes'] || [])
    .filter(c => c.cobradorId === cobradorId)
    .map(c => c.id);
}

// ── MOCHILA: Saldo histórico total ───────────────────────────
window.getSaldoMochila = function (cobradorId) {
  return _calcularMochila(cobradorId, null);
};

window.getSaldoMochilaHasta = function (cobradorId, fechaExclusiva) {
  return _calcularMochila(cobradorId, fechaExclusiva);
};

const _mochilaCache = {};

function _calcularMochila(cobradorId, fechaLimite) {
  const key = cobradorId + '|' + (fechaLimite || '') + '|' + DB._cacheVersion;
  if (_mochilaCache[key] !== undefined) return _mochilaCache[key];

  const movs = movsCartera();
  const pagos = DB._cache['pagos'] || [];
  const creditos = DB._cache['creditos'] || [];
  const gastos = DB._cache['gastos'] || [];
  const clientesIds = _clientesDelCobrador(cobradorId);

  const antes = fechaLimite ? (f) => f < fechaLimite : () => true;

  const enviado = movs
    .filter(m => m.tipo === 'envio_cobrador' && m.cobradorId === cobradorId && antes(m.fecha))
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const cobros = pagos
    .filter(p => p.cobradorId === cobradorId && !p.eliminado && antes(p.fecha))
    .reduce((s, p) => s + Number(p.monto || 0), 0);

  const ajustesCobros = movs
    .filter(m => m.tipo === 'cobro_ajuste' && m.cobradorId === cobradorId && antes(m.fecha) && !esAjusteDePago(m))
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const seguros = creditos
    .filter(cr => clientesIds.includes(cr.clienteId) && cr.seguro && antes(cr.fechaInicio))
    .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

  const prestamos = creditos
    .filter(cr => clientesIds.includes(cr.clienteId) && antes(cr.fechaInicio))
    .reduce((s, cr) => s + Number(cr.monto || 0), 0);

  const totalGastos = gastos
    .filter(g => g.cobradorId === cobradorId && antes(g.fecha))
    .reduce((s, g) => s + Number(g.monto || 0), 0);

  const cajasAsignadas = (DB._cache['cajas'] || [])
    .filter(c => c.cobradorId === cobradorId && antes(c.fecha))
    .reduce((s, c) => s + Number(c.monto || 0), 0);

  const devuelto = movs
    .filter(m => {
      const esMio = m.cobradorId === cobradorId;
      const esAntes = antes(m.fecha);
      const estaConfirmado = m.confirmado === true || m.tipo === 'confirmar_yape';
      const esGastoCobrador = m.tipo === 'gasto_cobrador';
      // Los ajustes de pago eliminado/corregido no cuentan: el pago ya se refleja solo
      return esMio && esAntes && (estaConfirmado || esGastoCobrador) && !esAjusteDePago(m);
    })
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const resultado = enviado + cobros + ajustesCobros + seguros + cajasAsignadas - prestamos - totalGastos - devuelto;
  _mochilaCache[key] = resultado;
  return resultado;
}

// ── CARTERA: Saldo del admin ──────────────────────────────────
window.getSaldoCartera = function () {
  const movs = movsCartera();
  const saldoMovs = movs.reduce((s, m) => {
    const monto = Number(m.monto) || 0;
    switch (m.tipo) {
      case 'inyeccion': return s + monto;
      case 'confirmar_yape': return s + monto;
      case 'envio_cobrador': return s - monto;
      case 'gasto_admin': return s - monto;
      case 'retiro': return s - monto;
      default: return s;
    }
  }, 0);
  // La caja chica asignada sale de la cartera del admin, igual que "Enviar a cobrador"
  // (antes solo se sumaba al cobrador y el mismo dinero aparecía en los dos lados)
  // (solo de cobradores que existen: al eliminar un cobrador se borran sus envíos, igual con sus cajas)
  const idsUsuarios = new Set((DB._cache['users'] || []).map(u => u.id));
  const cajasAsignadas = (DB._cache['cajas'] || [])
    .filter(c => idsUsuarios.has(c.cobradorId))
    .reduce((s, c) => s + (Number(c.monto) || 0), 0);
  return saldoMovs - cajasAsignadas;
};

window.getCapitalInvertido = function () {
  return movsCartera()
    .filter(m => m.tipo === 'inyeccion')
    .reduce((s, m) => s + Number(m.monto), 0);
};

window.getTotalEnMochilas = function () {
  return (DB._cache['users'] || [])
    .filter(u => u.role === 'cobrador')
    .reduce((s, u) => s + getSaldoMochila(u.id), 0);
};

window.getTotalEnLaCalle = function () {
  const creditos = DB._cache['creditos'] || [];
  const pagos = DB._cache['pagos'] || [];
  return creditos
    .filter(cr => cr.activo)
    // Capital que falta cobrar (la mora pagada no reduce el préstamo)
    .reduce((s, cr) => s + estadoCredito(cr, pagos).saldo, 0);
};

window.getDepositosPendientes = function () {
  return movsCartera()
    .filter(m => m.tipo === 'deposito_cobrador' && !m.confirmado);
};

window.renderPanelCartera = function () {
  const saldo = getSaldoCartera();
  const capitalInv = getCapitalInvertido();
  const enLaCalle = getTotalEnLaCalle();
  const enMochilas = getTotalEnMochilas();
  const pendientes = getDepositosPendientes();
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const movs = movsCartera()
    .slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 5);
  const saldoOk = saldo >= 0;
  const menuAbierto = state._menuCarteraAbierto || false;
  const mostrarMovs = state._verMovsCartera || false;

  const isAdmin = state.currentUser?.role === 'admin';
  let totalRecaudado = 0, totalObjetivo = 0, totalSeguros = 0;
  let totalPrestado = 0, totalGastos = 0;
  let totalYape = 0, totalEfectivo = 0, totalTransferencia = 0;
  let totalPagadoMeta = 0; 
  const creditos = DB._cache['creditos'] || [];
  const usuarios = DB._cache['users'] || [];
  const hoy = today();
  let cobradores_admin = [];
  let porcentaje = 0;

  if (isAdmin) {
    cobradores_admin = usuarios.filter(u => u.role === 'cobrador');
    const cuadresCobradores = cobradores_admin.map(u => getCuadreDelDia(u.id, hoy));

    totalYape = cuadresCobradores.reduce((s, c) => s + c.yape, 0);
    totalEfectivo = cuadresCobradores.reduce((s, c) => s + c.efectivo, 0);
    totalTransferencia = cuadresCobradores.reduce((s, c) => s + c.transferencia, 0);
    totalRecaudado = totalYape + totalEfectivo + totalTransferencia;

    const metasCobradores = cobradores_admin.map(u => calcularMetaReal(u.id, hoy));
    const totalPagadoMeta = metasCobradores.reduce((s, m) => s + m.pagadoHoy, 0);
    totalObjetivo = metasCobradores.reduce((s, m) => s + m.metaTotal, 0);
    porcentaje = totalObjetivo > 0 ? Math.round((totalPagadoMeta / totalObjetivo) * 100) : 0;

    totalSeguros = creditos
      .filter(cr => cr.fechaInicio === hoy)
      .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

    const gastosRuta = cobradores_admin.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalGastos, 0);
    const gastosMovsCartera = movsCartera()
      .filter(m => m.fecha === hoy && (m.tipo === 'gasto_admin' || m.tipo === 'retiro'))
      .reduce((s, m) => s + Number(m.monto || 0), 0);
    totalGastos = gastosRuta + gastosMovsCartera;

    totalPrestado = cobradores_admin.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalPrestadoHoy, 0);
  }

  return `
<!-- PANEL PRINCIPAL -->
<div style="background:#0f172a; background-image:
              radial-gradient(circle at 15% 50%, rgba(37,99,235,0.2) 0%, transparent 55%),
              radial-gradient(circle at 85% 30%, rgba(5,150,105,0.15) 0%, transparent 55%);
            border-radius:10px; padding:18px; margin-bottom:12px; box-shadow:var(--shadow)">

  <!-- HEADER -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
    <div style="font-size:10.5px; font-weight:700; color:rgba(255,255,255,0.45);
                text-transform:uppercase; letter-spacing:1px">Mi Cartera</div>
    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px">
      <div style="position:relative">
        <button onclick="state._menuCarteraAbierto=!state._menuCarteraAbierto; render()"
          style="background:none; border:none; color:rgba(255,255,255,0.7); padding:0;
                 cursor:pointer; font-size:30px; font-weight:700; line-height:1">☰</button>
        ${menuAbierto ? `
        <div style="position:absolute; top:28px; right:0; background:white;
                    border-radius:10px; padding:8px; min-width:180px; z-index:20;
                    box-shadow:0 8px 32px rgba(15,23,42,0.15)">
          <button onclick="abrirMovimientoCartera('inyeccion'); state._menuCarteraAbierto=false; render()"
            style="width:100%; padding:9px 12px; border-radius:8px; border:none; cursor:pointer;
                   background:transparent; font-weight:600; font-size:13px; margin-bottom:2px;
                   display:flex; align-items:center; gap:10px; color:#166534; text-align:left">
            <span style="width:28px; height:28px; background:#f0fdf4; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">➕</span>
            Inyectar Capital
          </button>
          <button onclick="abrirMovimientoCartera('gasto_admin'); state._menuCarteraAbierto=false; render()"
            style="width:100%; padding:9px 12px; border-radius:8px; border:none; cursor:pointer;
                   background:transparent; font-weight:600; font-size:13px; margin-bottom:2px;
                   display:flex; align-items:center; gap:10px; color:#9f1239; text-align:left">
            <span style="width:28px; height:28px; background:#fff1f2; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">💸</span>
            Gasto Admin
          </button>
          <button onclick="abrirMovimientoCartera('retiro'); state._menuCarteraAbierto=false; render()"
            style="width:100%; padding:9px 12px; border-radius:8px; border:none; cursor:pointer;
                   background:transparent; font-weight:600; font-size:13px; margin-bottom:2px;
                   display:flex; align-items:center; gap:10px; color:#92400e; text-align:left">
            <span style="width:28px; height:28px; background:#fffbeb; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">🏠</span>
            Retiro Personal
          </button>
          <button onclick="abrirMovimientoCartera('envio_cobrador'); state._menuCarteraAbierto=false; render()"
            style="width:100%; padding:9px 12px; border-radius:8px; border:none; cursor:pointer;
                   background:transparent; font-weight:600; font-size:13px; margin-bottom:2px;
                   display:flex; align-items:center; gap:10px; color:#1e40af; text-align:left">
            <span style="width:28px; height:28px; background:#eff6ff; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">💰</span>
            Enviar a Cobrador
          </button>
          <button onclick="abrirRetirarCobrador(); state._menuCarteraAbierto=false; render()"
            style="width:100%; padding:9px 12px; border-radius:8px; border:none; cursor:pointer;
                   background:transparent; font-weight:600; font-size:13px; margin-top:2px;
                   display:flex; align-items:center; gap:10px; color:#9f1239; text-align:left">
            <span style="width:28px; height:28px; background:#fff1f2; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">💼</span>
            Retirar de Cobrador
          </button>
          ${movsAjustesBaja().length ? `
          <button onclick="state.modal='revisar-bajas'; state._menuCarteraAbierto=false; render()"
            style="width:100%; padding:9px 12px; border-radius:8px; border:none; cursor:pointer;
                   background:transparent; font-weight:600; font-size:13px; margin-top:2px;
                   display:flex; align-items:center; gap:10px; color:#475569; text-align:left;
                   border-top:1px solid #f1f5f9">
            <span style="width:28px; height:28px; background:#f8fafc; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">🧾</span>
            Revisar créditos eliminados
          </button>` : ''}
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- SALDO PRINCIPAL -->
  <div style="text-align:center; padding:8px 0 20px">
    <div style="font-size:12px; color:rgba(255,255,255,0.6); font-weight:600;
                letter-spacing:2px; text-transform:uppercase; margin-bottom:8px">Tienes en mano</div>
    <div style="font-size:48px; font-weight:900; letter-spacing:-2px;
                color:${saldoOk ? '#4ade80' : '#f87171'};
                text-shadow:0 0 50px ${saldoOk ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)'}">
      ${formatMoney(Math.abs(saldo))}
    </div>
    ${!saldoOk ? `
      <div style="font-size:12px; color:#f87171; font-weight:700; margin-top:6px">
        ⚠️ Saldo negativo — revisa tus movimientos
      </div>` : ''}
  </div>

  <div style="border-top:1px solid rgba(255,255,255,0.06); margin-bottom:14px"></div>

  <!-- GRID STATS -->
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px">
    <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Capital invertido</div>
      <div style="font-size:clamp(12px, 3.5vw, 16px); font-weight:800; color:white; white-space:nowrap">${formatMoney(capitalInv)}</div>
    </div>
    <div style="background:rgba(251,191,36,0.12); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(251,191,36,0.7); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">En la calle</div>
      <div style="font-size:clamp(12px, 3.5vw, 16px); font-weight:800; color:#fbbf24; white-space:nowrap">${formatMoney(enLaCalle)}</div>
    </div>
    <div style="background:rgba(96,165,250,0.12); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(147,197,253,0.7); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">En mochilas</div>
      <div style="font-size:clamp(12px, 3.5vw, 16px); font-weight:800; color:#93c5fd; white-space:nowrap">${formatMoney(enMochilas)}</div>
    </div>
    <div style="background:rgba(34,197,94,0.12); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(74,222,128,0.7); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Total negocio</div>
      <div style="font-size:clamp(12px, 3.5vw, 16px); font-weight:800; color:#4ade80; white-space:nowrap">
        ${formatMoney(saldo + enMochilas + enLaCalle)}
      </div>
    </div>
  </div>

  ${isAdmin ? `
  <div style="border-top:1px solid rgba(255,255,255,0.06); margin-bottom:14px"></div>

  <!-- COBRANZA DEL DÍA -->
  <div style="margin-bottom:14px">
    <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                text-transform:uppercase; letter-spacing:1px; margin-bottom:12px">Cobranza del día</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px">
      <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:12px; text-align:center">
        <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                    text-transform:uppercase; margin-bottom:4px">Objetivo</div>
        <div style="font-size:20px; font-weight:900; color:white">${formatMoney(totalObjetivo)}</div>
      </div>
      <div style="background:rgba(34,197,94,0.15); border-radius:8px; padding:12px; text-align:center">
        <div style="font-size:10px; color:rgba(74,222,128,0.7); font-weight:700;
                    text-transform:uppercase; margin-bottom:4px">Recaudado</div>
        <div style="font-size:20px; font-weight:900; color:#4ade80">${formatMoney(totalRecaudado)}</div>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.08); border-radius:4px; height:4px;
                overflow:hidden; margin-bottom:8px">
      <div style="width:${Math.min(100, porcentaje)}%;
                  background:linear-gradient(90deg,#2563eb,#4ade80);
                  height:100%; border-radius:4px; transition:width 0.5s ease"></div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:center">
      <span style="font-size:11.5px; color:rgba(255,255,255,0.5)">${porcentaje}% de la meta</span>
      <span style="font-size:11.5px; font-weight:700;
                   color:${totalRecaudado >= totalObjetivo ? '#4ade80' : '#fbbf24'}">
     ${totalPagadoMeta >= totalObjetivo ? '✅ Completado' : '⏳ En proceso'}
      </span>
    </div>
  </div>

  ${totalSeguros > 0 ? `
  <div style="background:rgba(59,130,246,0.15); border-radius:8px; padding:8px 14px;
              margin-bottom:14px; display:flex; justify-content:space-between; align-items:center">
    <span style="color:#93c5fd; font-size:11.5px; font-weight:700">🛡️ Total seguros hoy</span>
    <span style="color:white; font-size:13px; font-weight:800">${formatMoney(totalSeguros)}</span>
  </div>` : ''}

  <div style="border-top:1px solid rgba(255,255,255,0.06); margin-bottom:14px"></div>

  <!-- BALANCE GENERAL -->
  <div style="margin-bottom:14px">
    <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                text-transform:uppercase; letter-spacing:1px; margin-bottom:10px">Balance General</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
      <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:10px; text-align:center">
        <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                    text-transform:uppercase; margin-bottom:4px">Prestado hoy</div>
        <div style="font-size:15px; font-weight:800; color:#f87171">${formatMoney(totalPrestado)}</div>
      </div>
      <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:10px; text-align:center">
        <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                    text-transform:uppercase; margin-bottom:4px">Gastos del día</div>
        <div style="font-size:15px; font-weight:800; color:#f87171">${formatMoney(totalGastos)}</div>
      </div>
    </div>
  </div>

  <!-- MÉTODOS DE PAGO -->
  <div>
    <div style="font-size:10px; color:rgba(255,255,255,0.4); font-weight:700;
                text-transform:uppercase; letter-spacing:1px; margin-bottom:10px">Métodos de pago</div>
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; text-align:center">
      <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:10px">
        <div style="font-size:14px; margin-bottom:4px">📱</div>
        <div style="font-weight:800; font-size:13px; color:white">${formatMoney(totalYape)}</div>
        <div style="font-size:9.5px; color:rgba(255,255,255,0.4); margin-top:2px">Yape/Plin</div>
      </div>
      <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:10px">
        <div style="font-size:14px; margin-bottom:4px">💵</div>
        <div style="font-weight:800; font-size:13px; color:white">${formatMoney(totalEfectivo)}</div>
        <div style="font-size:9.5px; color:rgba(255,255,255,0.4); margin-top:2px">Efectivo</div>
      </div>
      <div style="background:rgba(255,255,255,0.06); border-radius:8px; padding:10px">
        <div style="font-size:14px; margin-bottom:4px">🏦</div>
        <div style="font-weight:800; font-size:13px; color:white">${formatMoney(totalTransferencia)}</div>
        <div style="font-size:9.5px; color:rgba(255,255,255,0.4); margin-top:2px">Transf.</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- DEPÓSITOS PENDIENTES -->
  ${pendientes.length > 0 ? `
  <div style="border-top:1px solid rgba(255,255,255,0.06); margin-top:14px; padding-top:14px">
    <div style="font-size:11px; font-weight:700; color:#fbbf24; margin-bottom:10px">
      ⏳ ${pendientes.length} depósito${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''} de confirmar
    </div>
    <div class="lista-scroll" data-scroll-id="depositos-pendientes" style="max-height:40vh">${pendientes.map(m => {
    const cob = (DB._cache['users'] || []).find(u => u.id === m.cobradorId);
    return `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06)">
        <div>
          <div style="font-size:13px; font-weight:700; color:white">${esc(cob?.nombre || '—')}</div>
          <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px">
            ${esc(m.descripcion || '—')} · ${formatDate(m.fecha)}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px">
          <div style="font-size:14px; font-weight:800; color:#fbbf24">
            ${formatMoney(Number(m.monto))}
          </div>
          <button onclick="confirmarDeposito('${m.id}')"
            style="padding:5px 12px; border-radius:6px; border:none; cursor:pointer;
                   background:#22c55e; color:white; font-size:11px; font-weight:700">
            ✅ OK
          </button>
        </div>
      </div>`;
  }).join('')}</div>
  </div>` : ''}

</div>

<!-- MOVIMIENTOS (ver renderTarjetaMovimientos) -->
${renderTarjetaMovimientos()}

<!-- MOCHILAS -->
<div class="card" style="margin-bottom:12px">
  <div class="card-title">Dinero en caja de cobradores</div>
  ${cobradores.length === 0
      ? `<div style="text-align:center; color:var(--muted); font-size:13px; padding:16px 0">
         Sin cobradores registrados
       </div>`
      : cobradores.map(u => {
        const sm = getSaldoMochila(u.id);
        const ok = sm >= 0;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:10px 0; border-bottom:1px solid var(--border)">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:42px; height:42px; border-radius:8px; flex-shrink:0;
                background:linear-gradient(135deg,#0f172a,#2563eb);
                display:flex; align-items:center; justify-content:center;
                color:white; font-weight:800; font-size:16px">
      ${esc(String(u.nombre || '?').charAt(0).toUpperCase())}
            </div>
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text)">${esc(u.nombre)}</div>
              <div style="font-size:11px; color:var(--muted); margin-top:2px">Dinero en su poder</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px">
           <div style="font-size:clamp(12px, 3.5vw, 17px); font-weight:900; color:${ok ? '#16a34a' : 'var(--danger)'}; white-space:nowrap">
  ${formatMoney(Math.abs(sm))} ${!ok ? '⚠️' : ''}
</div>
            <button onclick="abrirEnviarCobrador('${u.id}')"
              style="padding:6px 12px; border-radius:8px; border:none;
                     background:#eff6ff; color:var(--primary); font-size:11px;
                     font-weight:700; cursor:pointer">
              Enviar
            </button>
          </div>
        </div>`;
      }).join('')}
</div>

<!-- RENDIMIENTO POR COBRADOR -->
${isAdmin ? `
<div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase;
            letter-spacing:0.6px; margin-bottom:10px">
  Rendimiento por Cobrador
</div>

${cobradores_admin.map(u => {
        const c = getCuadreDelDia(u.id, hoy);
        const meta = calcularMetaReal(u.id, hoy);
        const caja = getCajaChicaDelDia(u.id, hoy);
        const expandido = state._expandCobrador === u.id;
        const pct = meta.metaTotal > 0 ? Math.min(100, Math.round((meta.pagadoHoy / meta.metaTotal) * 100)) : 0;
        const saldoOk = caja.saldo >= 0;
        const clientesDelCob = (DB._cache['clientes'] || []).filter(c => c.cobradorId === u.id).map(c => c.id);
        const segCob = creditos
          .filter(cr => cr.fechaInicio === hoy && clientesDelCob.includes(cr.clienteId) && cr.seguro && cr.montoSeguro > 0)
          .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

        return `
  <div style="background:white; border-radius:10px; margin-bottom:10px; overflow:hidden;
            box-shadow:var(--shadow)">

  <div style="padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer"
    onclick="state._expandCobrador='${u.id}'===state._expandCobrador?null:'${u.id}'; render()">

    <div style="width:42px; height:42px; border-radius:8px; flex-shrink:0;
                background:linear-gradient(135deg,#0f172a,#2563eb);
                display:flex; align-items:center; justify-content:center;
                color:white; font-weight:800; font-size:16px">
      ${esc(String(u.nombre || '?').charAt(0).toUpperCase())}
    </div>

    <div style="flex:1; min-width:0">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
        <div style="font-weight:700; font-size:14px; color:var(--text)">${esc(u.nombre)}</div>
        <div style="text-align:right">
          <div style="font-weight:800; color:#16a34a; font-size:14px; letter-spacing:-0.3px">
            ${formatMoney(c.total)}
          </div>
          ${segCob > 0 ? `
            <div style="font-size:10px; color:#1e40af; font-weight:700; margin-top:2px">
              🛡️ ${formatMoney(segCob)}
            </div>` : ''}
        </div>
      </div>

      <div style="background:var(--bg); border-radius:4px; height:4px; margin-bottom:6px; overflow:hidden">
        <div style="width:${pct}%; height:100%; border-radius:4px;
                    background:${pct >= 100 ? '#22c55e' : 'var(--primary)'};
                    transition:width 0.4s ease"></div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center">
        <div style="font-size:11px; color:var(--muted)">
          Meta: <span style="font-weight:600; color:var(--text)">${formatMoney(meta.metaTotal)}</span>
        </div>
        <div style="font-size:10.5px; font-weight:700;
            color:${!esDiaLaboral(hoy) ? '#a855f7' : meta.pendiente > 0 ? 'var(--danger)' : '#16a34a'}">
  ${!esDiaLaboral(hoy)
            ? '🎉 Día no laborable'
            : meta.pendiente > 0
              ? 'Faltan ' + formatMoney(meta.pendiente)
              : '✅ Meta cumplida'}
</div>
      </div>
    </div>

    <div style="color:var(--muted); font-size:20px; flex-shrink:0;
                transform:rotate(${expandido ? '90' : '0'}deg); transition:transform 0.2s">›</div>
  </div>

    ${expandido ? `
    <div style="border-top:1px solid var(--border); padding:14px 16px; background:var(--bg)">
      <div style="background:white; border-radius:8px; padding:14px; margin-bottom:10px;
                  box-shadow:var(--shadow)">
        <div style="font-size:10px; color:var(--muted); font-weight:700; text-transform:uppercase;
                    letter-spacing:0.6px; margin-bottom:10px">Caja Chica</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px">
          <div style="text-align:center; padding:8px; background:var(--bg); border-radius:8px">
            <div style="font-size:10px; color:var(--muted)">Inicial</div>
            <div style="font-weight:800; font-size:14px">${formatMoney(caja.cajaInicial)}</div>
          </div>
          <div style="text-align:center; padding:8px; background:#f0fdf4; border-radius:8px">
            <div style="font-size:10px; color:#16a34a">+ Cobros</div>
            <div style="font-weight:800; font-size:14px; color:#16a34a">${formatMoney(caja.cobrosDelDia)}</div>
          </div>
          <div style="text-align:center; padding:8px; background:#fff1f2; border-radius:8px">
            <div style="font-size:10px; color:#9f1239">− Préstamos</div>
            <div style="font-weight:800; font-size:14px; color:#9f1239">${formatMoney(caja.totalPrestadoHoy)}</div>
          </div>
          <div style="text-align:center; padding:8px; background:#fff1f2; border-radius:8px">
            <div style="font-size:10px; color:#9f1239">− Gastos</div>
            <div style="font-weight:800; font-size:14px; color:#9f1239">${formatMoney(caja.totalGastos)}</div>
          </div>
        </div>
        <div style="background:${saldoOk ? '#f0fdf4' : '#fff1f2'}; border-radius:8px;
                    padding:10px 14px; display:flex; justify-content:space-between; align-items:center">
          <div style="font-size:13px; font-weight:700;
                      color:${saldoOk ? '#16a34a' : 'var(--danger)'}">Saldo en caja</div>
          <div style="font-size:20px; font-weight:900;
                      color:${saldoOk ? '#16a34a' : 'var(--danger)'}">
            ${formatMoney(caja.saldo)}
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px">
        <button class="btn btn-sm"
          style="background:#fff1f2; color:#9f1239; border:none;
                 font-weight:600; border-radius:8px; padding:10px"
          onclick="abrirNuevoGastoAdmin('${u.id}')">💸 Gasto</button>
        <button class="btn btn-sm"
          style="background:#f0fdf4; color:#16a34a; border:none;
                 font-weight:600; border-radius:8px; padding:10px"
          onclick="abrirEnviarCobrador('${u.id}')">💰 Enviar</button>
      </div>
    </div>` : ''}
  </div>`;
      }).join('')}
` : ''}`;
};

window.abrirMovimientoCartera = function (tipo, cobradorIdPreseleccionado) {
  state._movCarteraTipo = tipo;
  state._movCarteraCobrador = cobradorIdPreseleccionado || null;
  state.modal = 'movimiento-cartera';
  render();
};

window.abrirEnviarCobrador = function (cobradorId) {
  abrirMovimientoCartera('envio_cobrador', cobradorId);
};

window.abrirInyectarCapital = () => abrirMovimientoCartera('inyeccion');
window.abrirGastoAdminPropio = () => abrirMovimientoCartera('gasto_admin');
window.abrirRetiroHipoteca = () => abrirMovimientoCartera('retiro');

window.abrirDepositoCobrador = function () {
  state.modal = 'deposito-cobrador';
  render();
};

window.confirmarDeposito = async function (movId) {
  if (!await showConfirm('¿Confirmar que recibiste este dinero? Se sumará a tu cartera.', { confirmText: 'Confirmar' })) return;
  try {
    await DB.update('movimientos_cartera', movId, {
      confirmado: true,
      tipo: 'confirmar_yape'
    });
    const idx = (DB._cache['movimientos_cartera'] || []).findIndex(m => m.id === movId);
    if (idx !== -1) {
      DB._cache['movimientos_cartera'][idx].confirmado = true;
      DB._cache['movimientos_cartera'][idx].tipo = 'confirmar_yape';
    }
    showToast('✅ Depósito confirmado — sumado a tu cartera');
    render();
  } catch (e) {
    alert('Error: ' + mensajeError(e));
  }
};

window.guardarMovimientoCartera = async function () {
  const tipo = state._movCarteraTipo;
  const monto = parseMonto(document.getElementById('mcMonto').value);
  const descripcion = document.getElementById('mcDescripcion').value.trim();
  const fecha = document.getElementById('mcFecha').value;
  const cobradorEl = document.getElementById('mcCobrador');
  const cobradorId = tipo === 'envio_cobrador' ? cobradorEl?.value : null;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!fecha) { alert('Selecciona una fecha'); return; }
  if (tipo === 'envio_cobrador' && !cobradorId) { alert('Selecciona el cobrador'); return; }

  const id = genId();
  const nuevo = {
    id, tipo, monto, descripcion, fecha,
    cobradorId: cobradorId || null,
    registradoPor: state.currentUser.id
  };

  try {
    await DB.set('movimientos_cartera', id, nuevo);
    state.modal = null;
    state._movCarteraTipo = null;
    state._movCarteraCobrador = null;
    const labels = {
      inyeccion: `➕ ${formatMoney(monto)} inyectados`,
      envio_cobrador: `💰 Caja asignada — ${formatMoney(monto)}`,
      gasto_admin: `💸 Gasto de ${formatMoney(monto)} registrado`,
      retiro: `🏦 Retiro de ${formatMoney(monto)} registrado`,
    };
    showToast(labels[tipo] || 'Movimiento registrado');
    render();
  } catch (e) {
    alert('Error: ' + mensajeError(e));
  }
};

window.guardarDepositoCobrador = async function () {
  const monto = parseMonto(document.getElementById('dcMonto').value);
  const descripcion = document.getElementById('dcDescripcion').value.trim();
  const fecha = document.getElementById('dcFecha').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!fecha) { alert('Selecciona una fecha'); return; }

  const id = genId();
  const nuevoDeposito = {
    id,
    tipo: 'deposito_cobrador',
    monto,
    descripcion: descripcion || 'Depósito al admin',
    fecha,
    cobradorId: state.currentUser.id,
    registradoPor: state.currentUser.id,
    confirmado: false
  };
  await DB.set('movimientos_cartera', id, nuevoDeposito);

  state.modal = null;
  showToast('📲 Depósito registrado — esperando confirmación');
  render();
};

// ============================================================
// MODALES
// ============================================================

window.renderModalMovimientoCartera = function () {
  const tipo = state._movCarteraTipo;
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const presel = state._movCarteraCobrador || '';

  const cfg = {
    inyeccion: {
      titulo: 'Inyectar Capital',
      color: 'var(--success)',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      desc: '💡 Dinero propio que destinas al negocio. Suma a tu cartera disponible.',
      placeholder: 'Ej: Ahorros, quincena, venta de activo...',
    },
    envio_cobrador: {
      titulo: 'Asignar Caja',
      color: 'var(--primary)',
      bg: '#eff6ff',
      border: '#bfdbfe',
      desc: '💡 Sale de tu cartera y entra a la caja del cobrador seleccionado.',
      placeholder: 'Ej: Caja inicial, refuerzo de ruta...',
    },
    gasto_admin: {
      titulo: 'Gasto Administrativo',
      color: 'var(--danger)',
      bg: '#fff1f2',
      border: '#fecdd3',
      desc: '💡 Gastos del negocio: internet, papelería, impuestos. Resta de tu cartera.',
      placeholder: 'Ej: Internet, papelería, impuesto...',
    },
    retiro: {
      titulo: 'Retiro de Utilidades',
      color: 'var(--warning)',
      bg: '#fffbeb',
      border: '#fde68a',
      desc: '💡 Retiras ganancias del negocio para uso personal. Resta de tu cartera.',
      placeholder: 'Ej: Retiro mensual, retiro de utilidades...',
    },
  }[tipo] || { titulo: 'Movimiento', color: 'var(--muted)', bg: 'var(--bg)', border: 'var(--border)', desc: '', placeholder: '' };

  return `
<div class="modal-handle"></div>
<div class="modal-title">${cfg.titulo}</div>

<div style="background:${cfg.bg}; border-radius:8px; padding:10px 14px; margin-bottom:14px;
            display:flex; align-items:flex-start; gap:8px">
  <div style="font-size:12.5px; color:${cfg.color}; font-weight:500; line-height:1.5">
    ${cfg.desc}
  </div>
</div>

${tipo === 'envio_cobrador' ? `
<div class="form-group">
  <label>Cobrador *</label>
  <input type="hidden" id="mcCobrador" value="${presel || ''}">
  ${renderCustomSelect({
    id: 'cs-mcCobrador',
    value: presel || '',
    onChange: "document.getElementById('mcCobrador').value=VALUE",
    options: [{ value: '', label: 'Selecciona cobrador...' }, ...cobradores.map(u => ({ value: u.id, label: u.nombre }))],
    placeholder: 'Selecciona cobrador...'
  })}
</div>` : ''}

${tipo === 'retiro' ? `
<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px">
  <button onclick="
    document.getElementById('mcDescripcion').value='Retiro mensual';
    this.parentElement.querySelectorAll('button').forEach(b=>b.style.opacity='0.5');
    this.style.opacity='1';"
    style="padding:9px 6px; border-radius:8px; border:1.5px solid #fde68a;
           background:#fffbeb; color:#92400e; font-weight:600; font-size:12px; cursor:pointer">
    📅 Retiro mensual
  </button>
  <button onclick="
    document.getElementById('mcDescripcion').value='Retiro de utilidades';
    this.parentElement.querySelectorAll('button').forEach(b=>b.style.opacity='0.5');
    this.style.opacity='1';"
    style="padding:9px 6px; border-radius:8px; border:1.5px solid var(--border);
           background:var(--bg); color:var(--muted); font-weight:600; font-size:12px; cursor:pointer">
    💰 Utilidades
  </button>
</div>` : ''}

<div class="form-group">
  <label>Monto (S/) *</label>
  <input class="form-control" id="mcMonto" type="number" placeholder="0"
    onwheel="this.blur()"
    style="font-size:22px; font-weight:800; text-align:center; letter-spacing:-0.5px;
           border:1.5px solid ${cfg.border}">
</div>

<div class="form-group">
  <label>Descripción</label>
  <input class="form-control" id="mcDescripcion" placeholder="${cfg.placeholder}">
</div>

<div class="form-group">
  <label>Fecha</label>
  <input type="hidden" id="mcFecha" value="${today()}">
  ${renderDatePicker({ value: today(), onChange: "document.getElementById('mcFecha').value=VALUE" })}
</div>

<button class="btn"
  style="height:48px; font-size:15px; font-weight:700;
         background:${cfg.color}; color:white; border:none; cursor:pointer;
         border-radius:10px; width:100%"
  onclick="guardarMovimientoCartera()">
  ${cfg.titulo}
</button>`;
};

window.renderModalDepositoCobrador = function () {
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">Registrar Envío</div>

  <div style="background:#fffbeb; border-radius:8px; padding:10px 14px; margin-bottom:14px;
              display:flex; align-items:flex-start; gap:8px">
    <span style="font-size:16px; flex-shrink:0">📤</span>
    <div style="font-size:12.5px; color:#92400e; font-weight:500; line-height:1.5">
      Registra cuando le hayas yapado o depositado dinero al admin.
      Quedará pendiente hasta que lo confirme.
    </div>
  </div>

  <div class="form-group">
    <label>Monto enviado (S/) *</label>
    <input class="form-control" id="dcMonto" type="number" placeholder="0"
      onwheel="this.blur()"
      style="font-size:22px; font-weight:800; text-align:center; letter-spacing:-0.5px">
  </div>

  <div class="form-group">
    <label>Descripción</label>
    <input class="form-control" id="dcDescripcion" placeholder="Ej: Yape cobros del martes...">
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input type="hidden" id="dcFecha" value="${today()}">
    ${renderDatePicker({ value: today(), onChange: "document.getElementById('dcFecha').value=VALUE" })}
  </div>

  <button class="btn btn-primary" style="height:48px; font-size:15px; font-weight:700"
    onclick="guardarDepositoCobrador()">
    Registrar Envío
  </button>`;
};

window.abrirRetirarCobrador = function (cobradorIdPresel) {
  state._retiroCobrador = cobradorIdPresel || null;
  state.modal = 'retiro-cobrador';
  render();
};

window.renderModalRetiroCobrador = function () {
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const presel = state._retiroCobrador || '';

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💼 Retirar de Cobrador</div>

  <div style="background:#fff1f2; border-radius:8px; padding:10px 14px; margin-bottom:14px;
              font-size:12.5px; color:#9f1239; font-weight:500; line-height:1.5">
    💡 Registra el dinero que retiras físicamente de la caja del cobrador.
    Resta de su mochila y suma a tu cartera.
  </div>

  <div class="form-group">
    <label>Cobrador *</label>
    <input type="hidden" id="rcCobrador" value="${presel || ''}">
    ${renderCustomSelect({
    id: 'cs-rcCobrador',
    value: presel || '',
    onChange: "document.getElementById('rcCobrador').value=VALUE",
    options: [
      { value: '', label: 'Selecciona cobrador...' },
      ...cobradores.map(u => ({ value: u.id, label: u.nombre + ' — ' + formatMoney(getSaldoMochila(u.id)) + ' en caja' }))
    ],
    placeholder: 'Selecciona cobrador...'
  })}
  </div>

  <div class="form-group">
    <label>Monto a retirar (S/) *</label>
    <input class="form-control" id="rcMonto" type="number" placeholder="0"
      onwheel="this.blur()"
      style="font-size:22px; font-weight:800; text-align:center; letter-spacing:-0.5px;
             border:1.5px solid #fecdd3">
  </div>

  <div class="form-group">
    <label>Descripción</label>
    <input class="form-control" id="rcDescripcion"
      placeholder="Ej: Retiro cobros del día, cierre de semana...">
  </div>

  <div class="form-group">
    <label>Fecha</label>
    <input type="hidden" id="rcFecha" value="${today()}">
    ${renderDatePicker({ value: today(), onChange: "document.getElementById('rcFecha').value=VALUE" })}
  </div>

  <button class="btn" onclick="guardarRetiroCobrador()"
    style="height:48px; font-size:15px; font-weight:700;
           background:#9f1239; color:white; border:none; cursor:pointer;
           border-radius:10px; width:100%">
    Confirmar Retiro
  </button>`;
};

window.guardarRetiroCobrador = async function () {
  const cobradorId = document.getElementById('rcCobrador').value;
  const monto = parseMonto(document.getElementById('rcMonto').value);
  const descripcion = document.getElementById('rcDescripcion').value.trim();
  const fecha = document.getElementById('rcFecha').value;

  if (!cobradorId) { alert('Selecciona un cobrador'); return; }
  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!fecha) { alert('Selecciona una fecha'); return; }

  const id = genId();
  const nuevo = {
    id,
    tipo: 'confirmar_yape',
    monto,
    descripcion: descripcion || 'Retiro de cobrador',
    fecha,
    cobradorId,
    confirmado: true,
    registradoPor: state.currentUser.id
  };

  try {
    await DB.set('movimientos_cartera', id, nuevo);
    state.modal = null;
    state._retiroCobrador = null;
    showToast(`💼 Retiro de ${formatMoney(monto)} registrado`);
    render();
  } catch (e) {
    alert('Error: ' + mensajeError(e));
  }
};
// Bloqueo contra doble toque
window.confirmarDeposito = unaVez(window.confirmarDeposito);
window.guardarMovimientoCartera = unaVez(window.guardarMovimientoCartera);
window.guardarDepositoCobrador = unaVez(window.guardarDepositoCobrador);
window.guardarRetiroCobrador = unaVez(window.guardarRetiroCobrador);

// ── REVISAR AJUSTES VIEJOS DE CRÉDITOS/CLIENTES ELIMINADOS ─────────
// Antes, al eliminar un crédito o cliente, la app creaba dos ajustes automáticos:
//   - "inyección" a la cartera del admin por monto + seguro
//   - "gasto_cobrador" en la mochila por las cuotas cobradas (que ya se descontaban solas)
// Con la regla nueva (eliminar = deshacer el crédito) esos ajustes sobran. No se tocan solos
// para no mover saldos viejos: el admin decide uno por uno si dejan de contar (anulado).
window.movsAjustesBaja = function () {
  return (DB._cache['movimientos_cartera'] || [])
    .filter(m => (m.descripcion === 'Baja crédito' || m.descripcion === 'Baja cliente') &&
                 (m.tipo === 'inyeccion' || m.tipo === 'gasto_cobrador'))
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
};

window.renderModalRevisarBajas = function () {
  const lista = movsAjustesBaja();
  const nombre = (id) => (DB._cache['users'] || []).find(u => u.id === id)?.nombre || '—';
  const activos = lista.filter(m => !m.anulado);

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">🧾 Movimientos de créditos eliminados</div>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;
              margin-bottom:12px;font-size:12.5px;color:#92400e;line-height:1.55">
    Son movimientos de dinero que se anotaron solos al eliminar un crédito o un cliente.
    Pueden hacer que <strong>tu disponible</strong> o <strong>la caja de un cobrador</strong> no cuadren
    con el dinero real.<br><br>
    <strong>Qué hacer:</strong><br>
    1. Toca <strong>No contar</strong> en cada uno (o <strong>No contar ninguno</strong> para todos).<br>
    2. Si el cobrador te entregó dinero de ese crédito, regístralo como <strong>depósito</strong>
       con el monto que recibiste de verdad.<br><br>
    No se borra nada. Si te equivocas, toca <strong>Volver a contar</strong>.
  </div>
  ${activos.length > 1 ? `
  <button onclick="anularAjustesBaja(null)"
    style="width:100%;padding:10px;margin-bottom:10px;border-radius:10px;border:2px solid #fecaca;
           background:white;color:#dc2626;font-weight:700;font-size:13px;cursor:pointer">
    No contar ninguno (${activos.length})
  </button>` : ''}
  ${lista.length === 0
    ? '<div style="text-align:center;color:var(--muted);padding:20px 0">No hay nada que revisar</div>'
    : lista.map(m => {
      const esAdmin = m.tipo === 'inyeccion';
      return `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);display:flex;
                  justify-content:space-between;align-items:center;gap:8px;${m.anulado ? 'opacity:0.5' : ''}">
        <div style="min-width:0">
          <div style="font-weight:700;font-size:13.5px">
            ${esAdmin ? 'Se sumó a tu disponible' : 'Se le restó a ' + esc(nombre(m.cobradorId))}
            <span style="color:${esAdmin ? 'var(--success)' : 'var(--danger)'}">
              ${esAdmin ? '+' : '−'}${formatMoney(m.monto)}
            </span>
          </div>
          <div style="font-size:11.5px;color:var(--muted)">
            ${m.descripcion === 'Baja cliente' ? 'Cliente eliminado' : 'Crédito eliminado'} del ${formatDate(m.fecha)}${esAdmin && m.cobradorId ? ' · cobrador ' + esc(nombre(m.cobradorId)) : ''}
            ${m.anulado ? ' · <strong>no cuenta</strong>' : ''}
          </div>
        </div>
        <button onclick="anularAjustesBaja('${esc(m.id)}', ${m.anulado ? 'false' : 'true'})"
          style="flex-shrink:0;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;
                 border:1px solid ${m.anulado ? '#bbf7d0' : '#fecaca'};background:white;
                 color:${m.anulado ? '#15803d' : '#dc2626'}">
          ${m.anulado ? 'Volver a contar' : 'No contar'}
        </button>
      </div>`;
    }).join('')}
  <button onclick="state.modal=null; render()"
    style="width:100%;padding:12px;margin-top:12px;background:#f1f5f9;color:var(--text);border:none;
           border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">Cerrar</button>`;
};

// id = un ajuste (anular true/false); id = null → anular todos los que aún cuentan
window.anularAjustesBaja = unaVez(async function (id, anular = true) {
  const objetivo = id
    ? movsAjustesBaja().filter(m => m.id === id)
    : movsAjustesBaja().filter(m => !m.anulado);
  if (!objetivo.length) return;
  if (!id && !await showConfirm(`¿Dejar de contar estos ${objetivo.length} movimientos? Tu disponible y la caja de los cobradores se van a recalcular.`,
    { confirmText: 'No contar' })) return;
  try {
    const ops = objetivo.map(m => ({ op: 'update', col: 'movimientos_cartera', id: m.id, data: { anulado: anular, updatedAt: new Date() } }));
    for (let i = 0; i < ops.length; i += 400) await fbBatch(ops.slice(i, i + 400));
    objetivo.forEach(m => { m.anulado = anular; });
    DB._cacheVersion++; // recalcular mochilas
    showToast(anular ? '✅ Listo, ya no cuenta en tus saldos' : '✅ Volvió a contar en tus saldos');
    render();
  } catch (e) {
    alert('Error: ' + mensajeError(e));
  }
});

// ── MOVIMIENTOS DE CARTERA: filtros, fecha y lista con scroll propio ────
// Con muchos movimientos (ej. 400), "Ver todos" alargaba la página y el botón para
// recogerla quedaba fuera de la vista. Ahora: filtros por tipo, lista dentro de una
// caja con scroll, de a 30, y el botón Ocultar siempre arriba.
const _MOVS_POR_PAGINA = 30;

// Cómo se muestra cada tipo de movimiento (sin nombres técnicos)
function _infoMovimiento(m) {
  const cob = esc((DB._cache['users'] || []).find(u => u.id === m.cobradorId)?.nombre || '—');
  const tipos = {
    inyeccion:         { icon: '➕', color: '#16a34a', label: 'Inyección de capital', grupo: 'entradas' },
    confirmar_yape:    { icon: '✅', color: '#16a34a', label: `Depósito de ${cob}`, grupo: 'entradas' },
    deposito_cobrador: { icon: '⏳', color: '#d97706', label: `Depósito de ${cob} (por confirmar)`, grupo: 'pendientes' },
    envio_cobrador:    { icon: '💰', color: '#1d4ed8', label: `Envío a ${cob}`, grupo: 'salidas' },
    gasto_admin:       { icon: '💸', color: '#9f1239', label: 'Gasto admin', grupo: 'salidas' },
    retiro:            { icon: '🏠', color: '#92400e', label: 'Retiro personal', grupo: 'salidas' },
    gasto_cobrador:    { icon: '➖', color: '#64748b', label: `Descuento en la caja de ${cob}`, grupo: 'ajustes' },
    cobro_ajuste:      { icon: '➕', color: '#64748b', label: `Ajuste a favor de ${cob}`, grupo: 'ajustes' }
  };
  return tipos[m.tipo] || { icon: '📌', color: 'var(--muted)', label: 'Movimiento', grupo: 'ajustes' };
}

function _movimientosFiltrados() {
  const filtro = state._filtroTipoMovs || 'todos';
  const fecha = state._filtroFechaMovs || null;
  return movsCartera()
    .filter(m => !esAjusteDePago(m)) // no cuentan en los saldos: no se muestran
    .filter(m => !fecha || m.fecha === fecha)
    .filter(m => filtro === 'todos' || _infoMovimiento(m).grupo === filtro)
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
}

function _itemMovimientoHTML(m) {
  const cfg = _infoMovimiento(m);
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;
              padding:10px 0; border-bottom:1px solid var(--border)">
    <div style="display:flex; align-items:center; gap:10px; min-width:0">
      <span style="font-size:18px; flex-shrink:0">${cfg.icon}</span>
      <div style="min-width:0">
        <div style="font-size:13px; font-weight:700; color:var(--text)">${cfg.label}</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;
                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
          ${formatDate(m.fecha)}${m.descripcion ? ' · ' + esc(m.descripcion) : ''}
        </div>
      </div>
    </div>
    <div style="font-weight:800; font-size:12.5px; color:${cfg.color}; white-space:nowrap">
      ${formatMoney(m.monto)}
    </div>
  </div>`;
}

function _listaMovimientosHTML() {
  const lista = _movimientosFiltrados();
  const desplegado = state._verMovsCartera || !!state._filtroFechaMovs;
  if (!lista.length) {
    return `<div style="text-align:center; color:var(--muted); font-size:13px; padding:16px 0">Sin movimientos</div>`;
  }
  if (!desplegado) return lista.slice(0, 5).map(_itemMovimientoHTML).join('');
  const limite = state._movsLimite || _MOVS_POR_PAGINA;
  const quedan = lista.length - limite;
  return `
  <div class="lista-scroll" data-scroll-id="movimientos" style="margin:0 -4px; padding:0 4px">
    ${lista.slice(0, limite).map(_itemMovimientoHTML).join('')}
    ${quedan > 0 ? `
      <button onclick="state._movsLimite=${limite + _MOVS_POR_PAGINA}; render()"
        style="width:100%; margin-top:8px; padding:10px; border-radius:8px; border:1px dashed #cbd5e1;
               background:white; font-size:13px; font-weight:700; color:var(--muted); cursor:pointer">
        Mostrar ${Math.min(quedan, _MOVS_POR_PAGINA)} más (quedan ${quedan})
      </button>` : ''}
  </div>`;
}

window.renderTarjetaMovimientos = function () {
  const desplegado = state._verMovsCartera || false;
  const filtro = state._filtroTipoMovs || 'todos';
  const base = movsCartera().filter(m => !esAjusteDePago(m));
  const cuenta = (grupo) => base.filter(m => _infoMovimiento(m).grupo === grupo).length;
  const chip = (valor, texto, n) => `
    <button onclick="state._filtroTipoMovs='${valor}'; state._movsLimite=null; state._verMovsCartera=true; render()"
      style="padding:5px 10px; border-radius:20px; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap;
             border:1.5px solid ${filtro === valor ? 'var(--text)' : 'var(--border)'};
             background:${filtro === valor ? 'var(--text)' : 'white'};
             color:${filtro === valor ? 'white' : 'var(--muted)'}">
      ${texto}${n !== null ? ` (${n})` : ''}
    </button>`;
  const pendientes = cuenta('pendientes');

  return `
<div class="card" style="margin-bottom:12px">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
    <div class="card-title" style="margin:0">📒 Movimientos</div>
    <button onclick="state._verMovsCartera=${!desplegado}; state._movsLimite=null; render()"
      style="font-size:12px; font-weight:700; background:var(--bg); border:none;
             padding:6px 12px; border-radius:8px; cursor:pointer; color:var(--text)">
      ${desplegado ? iconoFlecha(true) + ' Ocultar' : iconoFlecha(false) + ' Ver todos'}
    </button>
  </div>

  <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; margin-bottom:10px; scrollbar-width:none">
    ${chip('todos', 'Todos', null)}
    ${chip('entradas', '⬇️ Entradas', cuenta('entradas'))}
    ${chip('salidas', '⬆️ Salidas', cuenta('salidas'))}
    ${pendientes ? chip('pendientes', '⏳ Por confirmar', pendientes) : ''}
    ${cuenta('ajustes') ? chip('ajustes', 'Ajustes', cuenta('ajustes')) : ''}
  </div>

  <div style="display:flex; gap:8px; align-items:center; margin-bottom:10px">
    <div style="flex:1; min-width:0">
      ${renderDatePicker({
        value: state._filtroFechaMovs || '',
        placeholder: 'Filtrar por fecha',
        onChange: "state._filtroFechaMovs=VALUE||null; state._movsLimite=null; state._verMovsCartera=true; render()"
      })}
    </div>
    ${state._filtroFechaMovs ? `
    <button onclick="state._filtroFechaMovs=null; state._movsLimite=null; render()"
      style="padding:9px 12px; border-radius:10px; border:1.5px solid #e2e8f0; background:white;
             font-size:12px; cursor:pointer; color:#64748b; font-weight:700; white-space:nowrap">✕ Quitar fecha</button>` : ''}
  </div>

  ${_listaMovimientosHTML()}
</div>`;
};
