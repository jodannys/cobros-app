// ══════════════════════════════════════════════════════════════
// GESTIÓN DE CUADRE Y RENDIMIENTO
// ══════════════════════════════════════════════════════════════

window.getCuadreDelDia = function (cobradorId, fecha) {
  const pagos = DB._cache['pagos'] || [];
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];

  // Filtramos pagos únicos por ID para evitar errores de duplicidad en la suma visual
  const pagosDia = pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha);

  let yape = pagosDia.filter(p => p.tipo === 'yape').reduce((s, p) => s + Number(p.monto), 0);
  let efectivo = pagosDia.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + Number(p.monto), 0);
  let transferencia = pagosDia.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + Number(p.monto), 0);

  const misClientesIds = clientes.filter(c => c.cobradorId === cobradorId).map(c => c.id);
  const prestamosHoy = creditos.filter(cr => cr.fechaInicio === fecha && misClientesIds.includes(cr.clienteId));

  prestamosHoy.forEach(cr => {
    const montoSeguro = Number(cr.montoSeguro || 0);
    const metodo = (cr.metodoPago || 'Efectivo').toLowerCase();
    if (metodo.includes('yape')) yape += montoSeguro;
    else if (metodo.includes('transferencia')) transferencia += montoSeguro;
    else efectivo += montoSeguro;
  });

  const notas = DB._cache['notas_cuadre'] || [];
  const notaObj = notas.find(n => n.cobradorId === cobradorId && n.fecha === fecha);

  return {
    yape, efectivo, transferencia,
    total: yape + efectivo + transferencia,
    nota: notaObj ? notaObj.nota : '',
    pagos: pagosDia
  };
};

window.calcularMetaReal = function (cobradorId, fecha) {
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const pagos = DB._cache['pagos'] || [];

  const misClientesIds = clientes.filter(c => c.cobradorId === cobradorId).map(c => c.id);

  // 🔥 CAMBIO CLAVE: Cambiamos cr.fechaInicio <= fecha por cr.fechaInicio < fecha
  // Esto excluye los préstamos nuevos de la meta de hoy.
  const creditosActivos = creditos.filter(cr =>
    misClientesIds.includes(cr.clienteId) &&
    cr.activo === true &&
    cr.fechaInicio < fecha
  );

  let metaTotal = 0, pagadoHoy = 0, pendiente = 0;
  const detalle = [];

  creditosActivos.forEach(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    const cuota = Number(cr.cuotaDiaria) || 0;
    const pagosHoy = pagos.filter(p => p.creditoId === cr.id && p.fecha === fecha);
    const montoPagadoHoy = pagosHoy.reduce((s, p) => s + Number(p.monto), 0);
    const completo = montoPagadoHoy >= cuota;

    metaTotal += cuota;
    pagadoHoy += montoPagadoHoy;
    if (!completo) pendiente += (cuota - montoPagadoHoy);
    detalle.push({ cliente, cr, cuota, montoPagadoHoy, completo });
  });

  return { metaTotal, pagadoHoy, pendiente, detalle };
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
function _renderCajaChicaPro(caja, cuadre) {
  const saldoPositivo = caja.saldo >= 0;
  const saldoColor = saldoPositivo ? '#4ade80' : '#f87171';

  return `
  <div style="border-radius:10px; overflow:hidden; margin-bottom:12px; box-shadow:var(--shadow)">

    <!-- HEADER OSCURO -->
    <div style="background:#0f172a; background-image:
                  radial-gradient(circle at 15% 50%, rgba(37,99,235,0.2) 0%, transparent 55%),
                  radial-gradient(circle at 85% 30%, rgba(5,150,105,0.15) 0%, transparent 55%);
                padding:18px 18px 16px">

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px">
        <div style="font-size:10.5px; font-weight:700; color:rgba(255,255,255,0.45);
                    text-transform:uppercase; letter-spacing:1px">Caja Chica</div>
        <div style="font-size:11px; font-weight:600; background:rgba(255,255,255,0.08);
                    color:rgba(255,255,255,0.6); padding:3px 12px; border-radius:20px">
          ${formatDate(today())}
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

    <!-- CUERPO BLANCO -->
    <div style="background:white; padding:16px 16px 12px">

      <!-- GRID 4 ITEMS -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px">

        <div style="background:var(--bg); border-radius:8px; padding:12px">
          <div style="font-size:10px; color:var(--muted); font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">Inicial</div>
          <div style="font-size:17px; font-weight:800; color:var(--text)">${formatMoney(caja.cajaInicial)}</div>
        </div>

        <div style="background:#f0fdf4; border-radius:8px; padding:12px">
          <div style="font-size:10px; color:#16a34a; font-weight:700;
                      text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px">+ Cobros</div>
          <div style="font-size:17px; font-weight:800; color:#16a34a">${formatMoney(caja.cobrosDelDia)}</div>
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

      <!-- MÉTODOS DE PAGO -->
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
  </div>`;
}
window.abrirNuevoGastoAdmin = function (cobradorId) {
  state._gastoCobradorId = cobradorId;
  state.modal = 'nuevo-gasto';
  render();
};

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

  // ══════════════════════════════════════════════════════════
  // VISTA ADMIN
  // ══════════════════════════════════════════════════════════
  if (isAdmin) {
    return `
    <div class="topbar">
      <h2>Cuadre General</h2>
      <div class="topbar-user"><strong>Admin</strong></div>
    </div>
    <div class="page">

      ${renderPanelCartera()}

    </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // VISTA COBRADOR
  // ══════════════════════════════════════════════════════════
  const userId = state.currentUser.id;
  const hoyC = today();
  const cuadreHoy = getCuadreDelDia(userId, hoyC);
  const meta = calcularMetaReal(userId, hoyC);
  const caja = getCajaChicaDelDia(userId, hoyC);

  // Lógica: La meta solo se cumple cobrando cuotas, no por seguros.
  const metaAlcanzada = meta.pagadoHoy >= meta.metaTotal;

  const segurosHoy = (DB._cache['creditos'] || [])
    .filter(cr => cr.fechaInicio === hoyC && cr.cobradorId === userId)
    .reduce((s, cr) => s + Number(cr.montoSeguro || 0), 0);

  const gastos = caja.gastos || [];
  const mostrarTodos = !!state._verTodosGastos;
  const gastosVisible = mostrarTodos ? gastos : gastos.slice(0, 3);
  const hayMas = gastos.length > 3;

  const htmlGastos = `
  <div class="card" style="padding:14px;margin-bottom:14px;background:white;border-radius:16px;border:1px solid #e2e8f0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">🧾 Gastos (${gastos.length})</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" style="background:#fff5f5;color:#dc2626;border:1px solid #fecaca;font-weight:700;padding:4px 10px;border-radius:8px" onclick="abrirNuevoGastoAdmin('${userId}')">➕ Gasto</button>
        <button class="btn btn-sm" style="background:#fffbeb;color:#d97706;border:1px solid #fde68a;font-weight:700;padding:4px 10px;border-radius:8px" onclick="abrirDepositoCobrador()">📤 Retirar </button>
      </div>
    </div>
    ${gastos.length === 0
      ? `<div style="font-size:13px;color:#94a3b8;text-align:center;padding:15px 0">No hay gastos hoy</div>`
      : gastosVisible.map(g => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc">
            <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:#334155">${g.descripcion}</div></div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="font-weight:700;color:#dc2626;font-size:14px">${formatMoney(g.monto)}</div>
              <button onclick="abrirEditarGasto('${g.id}')" style="padding:5px 8px;border-radius:8px;border:1px solid #e2e8f0;background:white">✏️</button>
            </div>
          </div>`).join('')}
    ${hayMas ? `<button onclick="state._verTodosGastos=!state._verTodosGastos;render()" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #e2e8f0;background:white;font-size:13px;font-weight:600;color:#94a3b8;cursor:pointer">${mostrarTodos ? '▲ Ver menos' : '▼ Ver todos (' + gastos.length + ')'}</button>` : ''}
  </div>`;

  return `
  <div class="topbar">
    <h2>Mi Cuadre</h2>
    <div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div>
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
              <button onclick="abrirEditarGasto('${g.id}')"
                style="width:30px; height:30px; border-radius:8px; border:1px solid var(--border);
                       background:white; cursor:pointer; display:flex; align-items:center;
                       justify-content:center; font-size:13px">✏️</button>
            </div>
          </div>`).join('')}

      ${hayMas ? `
        <button onclick="state._verTodosGastos=!state._verTodosGastos; render()"
          style="width:100%; margin-top:10px; padding:8px; border-radius:8px; border:none;
                 background:var(--bg); font-size:12.5px; font-weight:600; color:var(--muted); cursor:pointer">
          ${mostrarTodos ? '▲ Ver menos' : '▼ Ver todos (' + gastos.length + ')'}
        </button>` : ''}
    </div>

    <!-- CLIENTES POR COBRAR -->
    <div class="card" style="margin-bottom:12px; padding:0; overflow:hidden">
      <div style="padding:14px 16px; border-bottom:1px solid var(--border);
                  display:flex; justify-content:space-between; align-items:center">
        <div class="card-title" style="margin:0">Clientes por Cobrar</div>
        <span style="font-size:10.5px; background:var(--bg); padding:3px 10px;
                     border-radius:20px; color:var(--muted); font-weight:700">
          ${meta.detalle.filter(d => !d.completo).length} restantes
        </span>
      </div>

      <div style="padding:0 16px 8px">
        ${meta.detalle.filter(d => !d.completo).length === 0
      ? `<div style="text-align:center; padding:28px 0">
               <div style="font-size:28px; margin-bottom:8px">✅</div>
               <p style="color:#16a34a; font-weight:700; margin:0; font-size:13.5px">¡Ruta completada!</p>
             </div>`
      : meta.detalle.filter(d => !d.completo)
        .sort((a, b) => (a.cliente?.nombre || '').localeCompare(b.cliente?.nombre || ''))
        .map(d => `
              <div style="display:flex; justify-content:space-between; align-items:center;
                          padding:11px 0; border-bottom:1px solid var(--border)">
                <div>
                  <div style="font-weight:700; font-size:14px; color:var(--text)">
                    ${d.cliente?.nombre || 'Sin nombre'}
                  </div>
                  <div style="font-size:11.5px; color:var(--muted); margin-top:2px">
                    Cuota: ${formatMoney(d.cuota)}
                  </div>
                </div>
                <button
                  onclick="if(this.getAttribute('data-loading')) return; this.setAttribute('data-loading','true'); this.style.opacity='0.5'; pagoRapido('${d.cr.id}');"
                  style="cursor:pointer; border:none; padding:0; background:none; outline:none;">
                  <span style="font-size:10.5px; font-weight:700; padding:5px 12px; border-radius:6px;
                               background:#fff1f2; color:#9f1239; display:inline-block">
                    ⏳ Pendiente
                  </span>
                </button>
              </div>`).join('')}
      </div>
    </div>

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
           line-height:1.6; placeholder-color:#a16207"
    placeholder="¿Alguna novedad del día...?"></textarea>

  <div style="border-top:1px dashed #d97706; padding-top:10px; margin-top:4px">
    <button class="btn btn-sm" onclick="guardarNota()"
      style="background:#eab308; color:white; border:none; font-weight:600;
             padding:8px 20px; border-radius:8px; width:100%">
      Guardar nota
    </button>
  </div>
</div>

  </div>`;
};