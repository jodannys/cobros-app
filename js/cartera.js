// ============================================================
// CARTERA.JS — Cartera del Admin y Mochila del Cobrador
// ============================================================
// Tipos de movimiento en 'movimientos_cartera':
//   inyeccion        → Admin mete dinero propio         (+Cartera)
//   envio_cobrador   → Admin envía a cobrador           (-Cartera, +Mochila)
//   gasto_admin      → Gasto propio del admin           (-Cartera)
//   retiro           → Admin saca ganancia/personal     (-Cartera)
//   confirmar_yape   → Admin confirma recibo cobrador   (+Cartera, -Mochila)
//   deposito_cobrador→ Cobrador declara envío pendiente
// ============================================================

// ── Helpers internos ─────────────────────────────────────────
function _clientesDelCobrador(cobradorId) {
  return (DB._cache['clientes'] || [])
    .filter(c => c.cobradorId === cobradorId)
    .map(c => c.id);
}

// ── MOCHILA: Saldo histórico total ───────────────────────────
// "¿Cuánto dinero tiene el cobrador en su poder AHORA?"
// Enviado Admin + Cobros + Seguros − Préstamos − Gastos − Devuelto confirmado
window.getSaldoMochila = function (cobradorId) {
  return _calcularMochila(cobradorId, null);
};

// ── MOCHILA hasta fecha (exclusive) — para calcular arrastre ─
// Devuelve el saldo acumulado con todo lo ocurrido ANTES de fechaExclusiva
// Se usa como "cajaInicial" del día en cajachica.js
window.getSaldoMochilaHasta = function (cobradorId, fechaExclusiva) {
  return _calcularMochila(cobradorId, fechaExclusiva);
};

function _calcularMochila(cobradorId, fechaLimite) {
  const movs     = DB._cache['movimientos_cartera'] || [];
  const pagos    = DB._cache['pagos']    || [];
  const creditos = DB._cache['creditos'] || [];
  const gastos   = DB._cache['gastos']   || [];
  const clientesIds = _clientesDelCobrador(cobradorId);

  // Si hay fechaLimite, solo contamos lo que ocurrió ANTES de ese día
  const antes = fechaLimite ? (f) => f < fechaLimite : () => true;

  // (+) Dinero enviado por admin
  const enviado = movs
    .filter(m => m.tipo === 'envio_cobrador' && m.cobradorId === cobradorId && antes(m.fecha))
    .reduce((s, m) => s + Number(m.monto), 0);

  // (+) Todos los cobros históricos de cuotas
  const cobros = pagos
    .filter(p => p.cobradorId === cobradorId && antes(p.fecha))
    .reduce((s, p) => s + Number(p.monto), 0);

  // (+) Todos los seguros históricos
  const seguros = creditos
    .filter(cr => clientesIds.includes(cr.clienteId) && cr.seguro && antes(cr.fechaInicio))
    .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

  // (-) Todos los préstamos entregados a clientes
  const prestamos = creditos
    .filter(cr => clientesIds.includes(cr.clienteId) && antes(cr.fechaInicio))
    .reduce((s, cr) => s + Number(cr.monto), 0);

  // (-) Todos los gastos del cobrador
  const totalGastos = gastos
    .filter(g => g.cobradorId === cobradorId && antes(g.fecha))
    .reduce((s, g) => s + Number(g.monto), 0);

  // (-) Todo lo devuelto al admin y confirmado
  const devuelto = movs
    .filter(m => m.tipo === 'confirmar_yape' && m.cobradorId === cobradorId && antes(m.fecha))
    .reduce((s, m) => s + Number(m.monto), 0);

  return enviado + cobros + seguros - prestamos - totalGastos - devuelto;
}

// ── CARTERA: Saldo del admin ──────────────────────────────────
window.getSaldoCartera = function () {
  const movs = DB._cache['movimientos_cartera'] || [];
  return movs.reduce((s, m) => {
    const monto = Number(m.monto) || 0;
    switch (m.tipo) {
      case 'inyeccion':      return s + monto;
      case 'confirmar_yape': return s + monto;
      case 'envio_cobrador': return s - monto;
      case 'gasto_admin':    return s - monto;
      case 'retiro':         return s - monto;
      default:               return s;
    }
  }, 0);
};

window.getCapitalInvertido = function () {
  return (DB._cache['movimientos_cartera'] || [])
    .filter(m => m.tipo === 'inyeccion')
    .reduce((s, m) => s + Number(m.monto), 0);
};

window.getTotalEnMochilas = function () {
  return (DB._cache['users'] || [])
    .filter(u => u.role === 'cobrador')
    .reduce((s, u) => s + Math.max(0, getSaldoMochila(u.id)), 0);
};

window.getTotalEnLaCalle = function () {
  const creditos = DB._cache['creditos'] || [];
  const pagos    = DB._cache['pagos']    || [];
  return creditos
    .filter(cr => cr.activo)
    .reduce((s, cr) => {
      const pagado = pagos
        .filter(p => p.creditoId === cr.id)
        .reduce((ss, p) => ss + Number(p.monto), 0);
      return s + Math.max(0, Number(cr.total) - pagado);
    }, 0);
};

window.getDepositosPendientes = function () {
  return (DB._cache['movimientos_cartera'] || [])
    .filter(m => m.tipo === 'deposito_cobrador' && !m.confirmado);
};

window.renderPanelCartera = function () {
  const saldo      = getSaldoCartera();
  const capitalInv = getCapitalInvertido();
  const enLaCalle  = getTotalEnLaCalle();
  const enMochilas = getTotalEnMochilas();
  const pendientes = getDepositosPendientes();
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const movs       = (DB._cache['movimientos_cartera'] || [])
    .slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5);
  const saldoOk    = saldo >= 0;
  const menuAbierto = state._menuCarteraAbierto || false;
  const mostrarMovs = state._verMovsCartera || false;
  
  // Datos del cuadre (admin)
  const isAdmin = state.currentUser?.role === 'admin';
  let totalRecaudado = 0, totalObjetivo = 0, totalSeguros = 0;
  let totalPrestado = 0, totalGastos = 0;
  let totalYape = 0, totalEfectivo = 0, totalTransferencia = 0;
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
    totalObjetivo = cobradores_admin.reduce((s, u) => s + calcularMetaReal(u.id, hoy).metaTotal, 0);
    porcentaje = totalObjetivo > 0 ? Math.round((totalRecaudado / totalObjetivo) * 100) : 0;
    totalSeguros = creditos
      .filter(cr => cr.fechaInicio === hoy)
      .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);
    totalPrestado = cobradores_admin.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalPrestadoHoy, 0);
    totalGastos = cobradores_admin.reduce((s, u) => s + getCajaChicaDelDia(u.id, hoy).totalGastos, 0);
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
      <span style="font-size:11px; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.5);
                   padding:3px 12px; border-radius:20px; font-weight:600">Disponible</span>
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
                   background:transparent; font-weight:600; font-size:13px;
                   display:flex; align-items:center; gap:10px; color:#1e40af; text-align:left">
            <span style="width:28px; height:28px; background:#eff6ff; border-radius:6px;
                         display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0">💰</span>
            Enviar a Cobrador
          </button>
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
      S/ ${Math.abs(saldo).toLocaleString('es-PE')}
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
      <div style="font-size:16px; font-weight:800; color:white">S/ ${capitalInv.toLocaleString('es-PE')}</div>
    </div>
    <div style="background:rgba(251,191,36,0.12); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(251,191,36,0.7); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">En la calle</div>
      <div style="font-size:16px; font-weight:800; color:#fbbf24">S/ ${enLaCalle.toLocaleString('es-PE')}</div>
    </div>
    <div style="background:rgba(96,165,250,0.12); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(147,197,253,0.7); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">En mochilas</div>
      <div style="font-size:16px; font-weight:800; color:#93c5fd">S/ ${enMochilas.toLocaleString('es-PE')}</div>
    </div>
    <div style="background:rgba(34,197,94,0.12); border-radius:8px; padding:12px">
      <div style="font-size:10px; color:rgba(74,222,128,0.7); font-weight:700;
                  text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Total negocio</div>
      <div style="font-size:16px; font-weight:800; color:#4ade80">
        S/ ${(saldo + enMochilas + enLaCalle).toLocaleString('es-PE')}
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
        ${totalRecaudado >= totalObjetivo ? '✅ Completado' : '⏳ En proceso'}
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
    ${pendientes.map(m => {
      const cob = (DB._cache['users'] || []).find(u => u.id === m.cobradorId);
      return `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06)">
        <div>
          <div style="font-size:13px; font-weight:700; color:white">${cob?.nombre || '—'}</div>
          <div style="font-size:11px; color:rgba(255,255,255,0.4); margin-top:2px">
            ${m.descripcion || '—'} · ${m.fecha}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px">
          <div style="font-size:14px; font-weight:800; color:#fbbf24">
            S/ ${Number(m.monto).toLocaleString('es-PE')}
          </div>
          <button onclick="confirmarDeposito('${m.id}')"
            style="padding:5px 12px; border-radius:6px; border:none; cursor:pointer;
                   background:#22c55e; color:white; font-size:11px; font-weight:700">
            ✅ OK
          </button>
        </div>
      </div>`;
    }).join('')}
  </div>` : ''}

</div>

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
      ${u.nombre.charAt(0)}
            </div>
            <div>
              <div style="font-weight:700; font-size:14px; color:var(--text)">${u.nombre}</div>
              <div style="font-size:11px; color:var(--muted); margin-top:2px">Dinero en su poder</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px">
            <div style="font-size:17px; font-weight:900; color:${ok ? '#16a34a' : 'var(--danger)'}">
              S/ ${Math.abs(sm).toLocaleString('es-PE')} ${!ok ? '⚠️' : ''}
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

<!-- MOVIMIENTOS -->
<div class="card" style="margin-bottom:12px">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
    <div class="card-title" style="margin:0">Movimientos</div>
    <button onclick="state._verMovsCartera=!state._verMovsCartera; render()"
      style="font-size:12px; color:var(--primary); font-weight:700;
             background:none; border:none; cursor:pointer">
      ${mostrarMovs ? 'Ver menos ▲' : 'Ver todos ▼'}
    </button>
  </div>
  ${movs.length === 0
    ? `<div style="text-align:center; color:var(--muted); font-size:13px; padding:16px 0">
         Sin movimientos aún
       </div>`
    : (mostrarMovs
        ? (DB._cache['movimientos_cartera'] || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha))
        : movs
      ).map(m => {
        const cob = m.cobradorId ? (DB._cache['users'] || []).find(u => u.id === m.cobradorId) : null;
        const cfg = {
          inyeccion:         { icon: '➕', color: '#16a34a', signo: '+', label: 'Inyección de capital' },
          envio_cobrador:    { icon: '💰', color: '#1a56db', signo: '-', label: 'Enviado a ' + (cob?.nombre || 'cobrador') },
          gasto_admin:       { icon: '💸', color: '#dc2626', signo: '-', label: 'Gasto administrativo' },
          retiro:            { icon: '🏠', color: '#d97706', signo: '-', label: 'Retiro personal' },
          confirmar_yape:    { icon: '✅', color: '#16a34a', signo: '+', label: 'Confirmado de ' + (cob?.nombre || 'cobrador') },
          deposito_cobrador: { icon: '⏳', color: '#d97706', signo: '',  label: 'Pendiente de ' + (cob?.nombre || 'cobrador') },
        }[m.tipo] || { icon: '•', color: 'var(--muted)', signo: '', label: m.tipo };
        return `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:10px 0; border-bottom:1px solid var(--border)">
          <div style="display:flex; align-items:center; gap:10px">
            <div style="width:32px; height:32px; border-radius:8px; background:var(--bg);
                        display:flex; align-items:center; justify-content:center;
                        font-size:15px; flex-shrink:0">${cfg.icon}</div>
            <div>
              <div style="font-size:13px; font-weight:700; color:var(--text)">${cfg.label}</div>
              <div style="font-size:11px; color:var(--muted); margin-top:2px">
                ${m.descripcion || '—'} · ${m.fecha.split('-').reverse().join('/')}
              </div>
            </div>
          </div>
          <div style="font-size:14px; font-weight:900; flex-shrink:0;
                      color:${cfg.signo === '+' ? '#16a34a' : cfg.signo === '-' ? 'var(--danger)' : 'var(--muted)'}">
            ${cfg.signo}S/${Number(m.monto).toLocaleString('es-PE')}
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
  const c         = getCuadreDelDia(u.id, hoy);
  const meta      = calcularMetaReal(u.id, hoy);
  const caja      = getCajaChicaDelDia(u.id, hoy);
  const expandido = state._expandCobrador === u.id;
  const pct       = meta.metaTotal > 0 ? Math.min(100, Math.round((meta.pagadoHoy / meta.metaTotal) * 100)) : 0;
  const saldoOk   = caja.saldo >= 0;
  const segCob    = creditos
    .filter(cr => cr.fechaInicio === hoy && cr.cobradorId === u.id)
    .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

  return `
  <div style="background:white; border-radius:10px; margin-bottom:10px; overflow:hidden;
            box-shadow:var(--shadow)">

  <div style="padding:14px 16px; display:flex; align-items:center; gap:12px; cursor:pointer"
    onclick="state._expandCobrador='${u.id}'===state._expandCobrador?null:'${u.id}'; render()">

    <!-- AVATAR -->
    <div style="width:42px; height:42px; border-radius:8px; flex-shrink:0;
                background:linear-gradient(135deg,#0f172a,#2563eb);
                display:flex; align-items:center; justify-content:center;
                color:white; font-weight:800; font-size:16px">
      ${u.nombre.charAt(0)}
    </div>

    <!-- INFO -->
    <div style="flex:1; min-width:0">

      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px">
        <div style="font-weight:700; font-size:14px; color:var(--text)">${u.nombre}</div>
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

      <!-- BARRA -->
      <div style="background:var(--bg); border-radius:4px; height:4px; margin-bottom:6px; overflow:hidden">
        <div style="width:${pct}%; height:100%; border-radius:4px;
                    background:${pct >= 100 ? '#22c55e' : 'var(--primary)'};
                    transition:width 0.4s ease"></div>
      </div>

      <!-- META -->
      <div style="display:flex; justify-content:space-between; align-items:center">
        <div style="font-size:11px; color:var(--muted)">
          Meta: <span style="font-weight:600; color:var(--text)">${formatMoney(meta.metaTotal)}</span>
        </div>
        <div style="font-size:10.5px; font-weight:700;
                    color:${meta.pendiente > 0 ? 'var(--danger)' : '#16a34a'}">
          ${meta.pendiente > 0
            ? 'Faltan ' + formatMoney(meta.pendiente)
            : '✅ Meta cumplida'}
        </div>
      </div>

    </div>

    <!-- CHEVRON -->
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
  state._movCarteraTipo     = tipo;
  state._movCarteraCobrador = cobradorIdPreseleccionado || null;
  state.modal               = 'movimiento-cartera';
  render();
};

window.abrirEnviarCobrador = function (cobradorId) {
  abrirMovimientoCartera('envio_cobrador', cobradorId);
};

// Aliases por compatibilidad con cuadre.js
window.abrirInyectarCapital  = () => abrirMovimientoCartera('inyeccion');
window.abrirGastoAdminPropio = () => abrirMovimientoCartera('gasto_admin');
window.abrirRetiroHipoteca   = () => abrirMovimientoCartera('retiro');

window.abrirDepositoCobrador = function () {
  state.modal = 'deposito-cobrador';
  render();
};

window.confirmarDeposito = async function (movId) {
  if (!confirm('¿Confirmar que recibiste este dinero? Se sumará a tu cartera.')) return;
  try {
    await DB.update('movimientos_cartera', movId, {
      confirmado: true,
      tipo: 'confirmar_yape'
    });
    
    // ✅ Actualizar cache local inmediatamente
    const idx = (DB._cache['movimientos_cartera'] || []).findIndex(m => m.id === movId);
    if (idx !== -1) {
      DB._cache['movimientos_cartera'][idx].confirmado = true;
      DB._cache['movimientos_cartera'][idx].tipo = 'confirmar_yape';
    }
    
    showToast('✅ Depósito confirmado — sumado a tu cartera');
    render();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

window.guardarMovimientoCartera = async function () {
  const tipo        = state._movCarteraTipo;
  const monto       = parseMonto(document.getElementById('mcMonto').value);
  const descripcion = document.getElementById('mcDescripcion').value.trim();
  const fecha       = document.getElementById('mcFecha').value;
  const cobradorEl  = document.getElementById('mcCobrador');
  const cobradorId  = tipo === 'envio_cobrador' ? cobradorEl?.value : null;

  if (!monto || monto <= 0)                     { alert('Ingresa un monto válido'); return; }
  if (!fecha)                                    { alert('Selecciona una fecha');    return; }
  if (tipo === 'envio_cobrador' && !cobradorId) { alert('Selecciona el cobrador');  return; }

  const id    = genId();
  const nuevo = {
    id, tipo, monto, descripcion, fecha,
    cobradorId:    cobradorId || null,
    registradoPor: state.currentUser.id
  };

  try {
    await DB.set('movimientos_cartera', id, nuevo);
    state.modal               = null;
    state._movCarteraTipo     = null;
    state._movCarteraCobrador = null;

    const labels = {
      inyeccion:      `➕ S/${monto.toLocaleString('es-PE')} inyectados`,
      envio_cobrador: `💰 Caja asignada — S/${monto.toLocaleString('es-PE')}`,
      gasto_admin:    `💸 Gasto de S/${monto.toLocaleString('es-PE')} registrado`,
      retiro:         `🏦 Retiro de S/${monto.toLocaleString('es-PE')} registrado`,
    };
    showToast(labels[tipo] || 'Movimiento registrado');
    render();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

window.guardarDepositoCobrador = async function () {
  const monto       = parseMonto(document.getElementById('dcMonto').value);
  const descripcion = document.getElementById('dcDescripcion').value.trim();
  const fecha       = document.getElementById('dcFecha').value;

  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  if (!fecha)               { alert('Selecciona una fecha');    return; }

  const id = genId();
  await DB.set('movimientos_cartera', id, {
    id,
    tipo:          'deposito_cobrador',
    monto,
    descripcion:   descripcion || 'Depósito al admin',
    fecha,
    cobradorId:    state.currentUser.id,
    registradoPor: state.currentUser.id,
    confirmado:    false
  });

  state.modal = null;
  showToast('📲 Depósito registrado — esperando confirmación');
  render();
};


// ============================================================
// MODALES
// ============================================================

window.renderModalMovimientoCartera = function () {
  const tipo       = state._movCarteraTipo;
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const presel     = state._movCarteraCobrador || '';

  const cfg = {
  inyeccion: {
    titulo:      'Inyectar Capital',
    color:       'var(--success)',
    bg:          '#f0fdf4',
    border:      '#bbf7d0',
    desc:        '💡 Dinero propio que destinas al negocio. Suma a tu cartera disponible.',
    placeholder: 'Ej: Ahorros, quincena, venta de activo...',
  },
  envio_cobrador: {
    titulo:      'Asignar Caja',
    color:       'var(--primary)',
    bg:          '#eff6ff',
    border:      '#bfdbfe',
    desc:        '💡 Sale de tu cartera y entra a la caja del cobrador seleccionado.',
    placeholder: 'Ej: Caja inicial, refuerzo de ruta...',
  },
  gasto_admin: {
    titulo:      'Gasto Administrativo',
    color:       'var(--danger)',
    bg:          '#fff1f2',
    border:      '#fecdd3',
    desc:        '💡 Gastos del negocio: internet, papelería, impuestos. Resta de tu cartera.',
    placeholder: 'Ej: Internet, papelería, impuesto...',
  },
  retiro: {
    titulo:      'Retiro de Utilidades',
    color:       'var(--warning)',
    bg:          '#fffbeb',
    border:      '#fde68a',
    desc:        '💡 Retiras ganancias del negocio para uso personal. Resta de tu cartera.',
    placeholder: 'Ej: Retiro mensual, retiro de utilidades...',
  },
}[tipo] || { titulo: 'Movimiento', color: 'var(--muted)', bg: 'var(--bg)', border: 'var(--border)', desc: '', placeholder: '' };

return `
<div class="modal-handle"></div>
<div class="modal-title">${cfg.titulo}</div>

<!-- DESCRIPCIÓN -->
<div style="background:${cfg.bg}; border-radius:8px; padding:10px 14px; margin-bottom:14px;
            display:flex; align-items:flex-start; gap:8px">
  <div style="font-size:12.5px; color:${cfg.color}; font-weight:500; line-height:1.5">
    ${cfg.desc}
  </div>
</div>

<!-- COBRADOR (solo envio) -->
${tipo === 'envio_cobrador' ? `
<div class="form-group">
  <label>Cobrador *</label>
  <select class="form-control" id="mcCobrador">
    <option value="">Selecciona cobrador...</option>
    ${cobradores.map(u => `
      <option value="${u.id}" ${u.id === presel ? 'selected' : ''}>${u.nombre}</option>
    `).join('')}
  </select>
</div>` : ''}

<!-- ACCESOS RÁPIDOS (solo retiro) -->
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

<!-- MONTO -->
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
  <input class="form-control" id="mcFecha" type="date" value="${today()}">
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
    <input class="form-control" id="dcFecha" type="date" value="${today()}">
  </div>

  <button class="btn btn-primary" style="height:48px; font-size:15px; font-weight:700"
    onclick="guardarDepositoCobrador()">
    Registrar Envío
  </button>`;
};