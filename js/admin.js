// Fallback por si infoAdmin.js no cargó aún
if (typeof window.renderBtnAyudaAdmin !== 'function') {
  window.renderBtnAyudaAdmin = function () { return ''; };
}
if (typeof window.renderBtnAyudaCobrador !== 'function') {
  window.renderBtnAyudaCobrador = function () { return ''; };
}

window.renderAdmin = function renderAdmin() {
  if (state.selectedCobrador) return renderAdminCobrador();

  const clientes = DB._cache['clientes'] || [];
  const creditos = DB._cache['creditos'] || [];
  const users = DB._cache['users'] || [];
  const cobradores = users.filter(u => u.role === 'cobrador');
  const admins = users.filter(u => u.role === 'admin');
  const alertas = getAlertasCreditos();
  return `
  <div>
   <div class="topbar">
  <h2>Administración</h2>
  <div style="display:flex; align-items:center; gap:8px;">
    <div class="topbar-user"><strong>${state.currentUser.nombre}</strong><span>Admin</span></div>
    ${renderBtnAyudaAdmin()}
  </div>
</div>
    <div class="page">

      ${alertas.length > 0 ? `
        <div style="background:#fff1f2; border-radius:10px; padding:16px; margin-bottom:16px">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px">
            <span style="font-size:22px">🚨</span>
            <div>
              <div style="font-weight:700; font-size:15px; color:#9f1239">Alertas (${alertas.length})</div>
              <div style="font-size:11.5px; color:var(--muted)">Requieren atención</div>
            </div>
          </div>
${(() => {
        const mostrarTodas = state._verTodasAlertas || false;
        const alertasVisible = mostrarTodas ? alertas : alertas.slice(0, 3);
        const hayMas = alertas.length > 3;
        return `
${alertasVisible.map(a => `
  <div style="background:white; border-radius:8px; padding:12px; margin-bottom:8px;
              border-left:3px solid ${a.tipo === 'vencido' ? 'var(--danger)' : 'var(--warning)'}">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px">
      <div style="flex:1; min-width:0">
        <div style="font-weight:700; font-size:14px; color:var(--text)">${a.cliente?.nombre || '—'}</div>
        <div style="font-size:11.5px; color:var(--muted); margin-top:2px">Cobrador: ${a.cobrador?.nombre || '—'}</div>
        <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap">
          <span style="background:${a.tipo === 'vencido' ? '#fff1f2' : '#fffbeb'};
                       color:${a.tipo === 'vencido' ? 'var(--danger)' : 'var(--warning)'};
                       padding:2px 8px; border-radius:6px; font-size:10.5px; font-weight:700">
            ${a.tipo === 'vencido' ? '🔴 VENCIDO' : `⚠️ ${a.dias} ${a.dias === 1 ? 'cuota' : 'cuotas'} pendiente`}
          </span>
          <span style="background:#fff1f2; color:var(--danger); padding:2px 8px;
                       border-radius:6px; font-size:10.5px; font-weight:700">
            Saldo: ${formatMoney(a.saldo)}
          </span>
        </div>
      </div>
      <button class="btn btn-sm btn-primary" style="white-space:nowrap; flex-shrink:0"
        onclick="abrirGestionCredito('${a.cr?.id}','${a.cliente?.id}')">Gestionar</button>
    </div>
  </div>`).join('')}
    ${hayMas ? `
      <button onclick="state._verTodasAlertas=!state._verTodasAlertas; render()"
        style="width:100%; padding:10px; border-radius:8px; border:1px solid #fecdd3;
               background:white; font-size:13px; font-weight:700; color:#9f1239;
               cursor:pointer; margin-top:4px">
        ${mostrarTodas ? '▲ Ver menos' : `▼ Ver todas las alertas (${alertas.length})`}
      </button>` : ''}
  `;
      })()}
       </div>
      ` : `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px;
                    padding:13px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px">
          <span style="font-size:18px">✅</span>
          <div style="font-size:13.5px; font-weight:600; color:#166534">Todo al día — sin alertas pendientes</div>
        </div>
      `}

      <div class="flex-between mb-2">
        <div style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Cobradores
        </div>
        <button class="btn btn-primary btn-sm" onclick="openModal('nuevo-usuario')">+ Usuario</button>
      </div>

      ${cobradores.map(u => {
        const mis = clientes.filter(c => c.cobradorId === u.id);
        const activos = creditos.filter(c => mis.some(cl => cl.id === c.clienteId) && c.activo);
        const alertasCobrador = alertas.filter(a => a.cobrador?.id === u.id);
        return `
    <div class="cobrador-row" style="display:flex; align-items:center; gap:12px; padding-right:12px">
      <div style="display:flex; align-items:center; flex:1; cursor:pointer; min-width:0"
           onclick="selectCobrador('${u.id}')">
        <div class="client-avatar" style="width:40px; height:40px; font-size:16px; flex-shrink:0">
          ${u.nombre.charAt(0)}
        </div>
        <div style="margin-left:12px; min-width:0">
          <div style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
            ${u.nombre}
          </div>
          <div style="font-size:11.5px; color:var(--muted); margin-top:2px">
            ${mis.length} clientes · ${activos.length} activos
          </div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-shrink:0">
        ${alertasCobrador.length > 0 ? `
          <div style="width:26px; height:26px; border-radius:50%; background:var(--danger);
                      color:white; font-size:11px; font-weight:700;
                      display:flex; align-items:center; justify-content:center;
                      flex-shrink:0; aspect-ratio:1">
            ${alertasCobrador.length}
          </div>` : `<div style="width:26px; height:26px; flex-shrink:0"></div>`}
        ${u.telefono ? `
          <button onclick="event.stopPropagation(); abrirChatWhatsApp('${u.telefono}', '${u.nombre}')"
            style="width:34px; height:34px; background:#25d366; color:white; border:none;
                   border-radius:8px; cursor:pointer; display:flex; align-items:center;
                   justify-content:center; flex-shrink:0">
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </button>` : `<div style="width:34px; flex-shrink:0"></div>`}
        <span style="color:var(--muted); font-size:18px; cursor:pointer"
              onclick="selectCobrador('${u.id}')">›</span>
      </div>
    </div>`;
      }).join('')}

      <div class="flex-between" style="margin-top:20px; margin-bottom:10px">
        <div class="card-title" style="margin:0; display:flex; align-items:center; gap:6px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L3 7v5c0 5 4 9.3 9 10.3C17 21.3 21 17 21 12V7z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          Administradores
        </div>
        <button class="btn btn-primary btn-sm" onclick="abrirNuevoAdmin()">+ Admin</button>
      </div>

      ${admins.map(u => `
  <div class="cobrador-row" style="display:flex; align-items:center; gap:12px">
    <div class="client-avatar"
      style="width:40px; height:40px; font-size:16px; flex-shrink:0;
             background:linear-gradient(135deg, #0f172a, #2563eb)">
      ${u.nombre.charAt(0)}
    </div>
    <div style="flex:1; min-width:0">
      <div style="font-weight:700; font-size:14px; color:var(--text)">${u.nombre}</div>
      <div style="font-size:11.5px; color:var(--muted); margin-top:2px">Usuario: ${u.user}</div>
    </div>
    <button class="btn btn-sm btn-outline" onclick="abrirEditarAdmin('${u.id}')">✏️</button>
  </div>`).join('')}

      <div class="card" style="margin-top:20px">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px">
          <div class="card-title" style="margin:0">📅 Días no laborables</div>
          <button class="btn btn-primary btn-sm" onclick="abrirAgregarFeriado()">+ Agregar</button>
        </div>
        ${(() => {
      const fechas = getDiasNoLaborables().sort();
      if (fechas.length === 0) return `
            <div style="text-align:center; color:var(--muted); font-size:13px; padding:16px 0">
              Sin fechas bloqueadas
            </div>`;
      return fechas.map(f => `
            <div style="display:flex; justify-content:space-between; align-items:center;
                        padding:10px 0; border-bottom:1px solid var(--border)">
              <div style="font-weight:700; font-size:14px; color:var(--text)">${formatDate(f)}</div>
              <button onclick="eliminarFeriado('${f}')"
                style="padding:4px 10px; border-radius:6px; border:1px solid #fecdd3;
                       background:#fff1f2; color:#9f1239; font-size:11px;
                       font-weight:700; cursor:pointer">
                Eliminar
              </button>
            </div>`).join('');
    })()}
      </div>
    </div>
  </div>`;
};

window.abrirNuevoAdmin = function abrirNuevoAdmin() {
  state._editingAdmin = null;
  state.modal = 'editar-admin';
  render();
};

window.abrirEditarAdmin = function abrirEditarAdmin(id) {
  const users = DB._cache['users'] || [];
  state._editingAdmin = users.find(u => u.id === id) || null;
  state.modal = 'editar-admin';
  render();
};

window.renderAdminCobrador = function renderAdminCobrador() {
  const users = DB._cache['users'] || [];
  const creditos = DB._cache['creditos'] || [];
  const pagosCache = DB._cache['pagos'] || [];
  const clientes = (DB._cache['clientes'] || []).filter(c => c.cobradorId === state.selectedCobrador);
  const cobrador = users.find(u => u.id === state.selectedCobrador);
  if (!cobrador) { state.selectedCobrador = null; render(); return ''; }

  const fechaVer = state._fechaCobrador || today();
  const c = getCuadreDelDia(state.selectedCobrador, fechaVer);
  const meta = calcularMetaReal(state.selectedCobrador, fechaVer);
  const caja = getCajaChicaDelDia(state.selectedCobrador, fechaVer);
  const gastos = caja.gastos;
  const mostrarTodos = state[`_verGastosAdmin_${cobrador.id}`] || false;
  const gastosVisible = mostrarTodos ? gastos : gastos.slice(0, 3);
  const hayMas = gastos.length > 3;

  // ── Filtro de clientes ────────────────────────────────────
  const filtroKey = `_filtroAdminCob_${state.selectedCobrador}`;
  const filtroAdminCob = state[filtroKey] || 'todos';

  const rutaFiltroKey = `_filtroRuta_${state.selectedCobrador}`;
  const rutaFiltro = state[rutaFiltroKey] || 'todos';



  let listaClientes = [...clientes];
  if (filtroAdminCob === 'activos') {
    listaClientes = listaClientes.filter(cl =>
      creditos.some(cr => cr.clienteId === cl.id && cr.activo)
    );
  } else if (filtroAdminCob === 'atrasados') {
    listaClientes = listaClientes.filter(cl => estaRealmenteAtrasado(cl.id));
  } else if (filtroAdminCob === 'sin_credito') {
    listaClientes = listaClientes.filter(cl => {
      const crs = creditos.filter(cr => cr.clienteId === cl.id);
      return crs.length === 0 || !crs.some(cr => cr.activo);
    });
  }
  listaClientes = _ordenarClientes(listaClientes, filtroAdminCob, creditos, pagosCache);

  return `
  <div>
    <div class="topbar">
      <button class="back-btn" onclick="state.selectedCobrador=null;state._fechaCobrador=null;render()">←</button>
      <h2>${cobrador.nombre}</h2>
      <div style="display:flex; align-items:center; gap:8px">
  ${renderIndicadorVivo()}
  <button class="btn btn-sm btn-outline" onclick="openModal('editar-usuario')">✏️ Editar</button>
  ${renderBtnAyudaAdmin()}
</div>
    </div>
    <div class="page">

      <div class="card">
        <div class="info-grid">
          <div class="info-item"><div class="info-label">Usuario</div><div class="info-value">${cobrador.user}</div></div>
          <div class="info-item"><div class="info-label">Clientes</div><div class="info-value">${clientes.length}</div></div>
        </div>

        <div class="card" style="padding:14px 16px; background:white; border-radius:12px">
          <div style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px">
            📅 Cuadre del día
          </div>
          <div style="display:flex; align-items:center; gap:10px">
            <button onclick="cambiarFechaCobrador(-1)"
              style="width:36px; height:36px; border-radius:8px; border:1px solid #e2e8f0;
              background:white; font-size:18px; cursor:pointer; flex-shrink:0">‹</button>
            <div onclick="document.getElementById('inputFechaCobrador').showPicker()"
              style="flex:1; height:40px; border:1px solid #e2e8f0; border-radius:8px; background:white;
              display:flex; align-items:center; justify-content:center; gap:8px;
              font-weight:700; font-size:14px; cursor:pointer; user-select:none">
              ${fechaVer.split('-').reverse().join('/')}
            </div>
            <input type="date" id="inputFechaCobrador" value="${fechaVer}"
              onchange="state._fechaCobrador=this.value;render()"
              style="position:fixed; opacity:0; pointer-events:none; top:0; left:0; width:1px; height:1px">
            <button onclick="cambiarFechaCobrador(1)"
              style="width:36px; height:36px; border-radius:8px; border:1px solid #e2e8f0;
              background:white; font-size:18px; cursor:pointer; flex-shrink:0;
              opacity:${fechaVer >= today() ? '0.3' : '1'}"
              ${fechaVer >= today() ? 'disabled' : ''}>›</button>
          </div>
        </div>

        ${_renderCajaChicaPro(caja, c, fechaVer)}

        <div class="card" style="padding:16px; background:white; border-radius:12px">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
            <div style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px">
              🧾 Gastos (${gastos.length})
            </div>
            <button class="btn btn-sm"
              style="background:#fff5f5; color:#dc2626; border:1px solid #fed7d7; font-weight:700; padding:6px 12px; border-radius:8px; cursor:pointer"
              onclick="abrirNuevoGastoAdmin('${cobrador.id}')">➕ Gasto</button>
          </div>
          ${gastos.length === 0
      ? `<div style="font-size:13px; color:#94a3b8; text-align:center; padding:16px 0; font-style:italic">Sin gastos este día</div>`
      : `${gastosVisible.map(g => `
              <div style="display:flex; justify-content:space-between; align-items:center;
                padding:10px 0; border-bottom:1px solid #f1f5f9">
                <div style="flex:1; min-width:0">
                  <div style="font-size:14px; font-weight:600; color:#1e293b; white-space:nowrap;
                    overflow:hidden; text-overflow:ellipsis">${g.descripcion}</div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; flex-shrink:0; margin-left:8px">
                  <div style="font-weight:800; color:#dc2626; font-size:14px">${formatMoney(g.monto)}</div>
                  ${!g._esAjuste ? `<button onclick="abrirEditarGasto('${g.id}')"
                    style="padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0;
                    background:white; font-size:13px; cursor:pointer; color:#64748b; font-weight:600">✏️</button>` : ''}
                </div>
              </div>`).join('')}
            ${hayMas ? `
              <button onclick="state['_verGastosAdmin_${cobrador.id}']=!state['_verGastosAdmin_${cobrador.id}'];render()"
                style="width:100%; margin-top:12px; padding:10px; border-radius:8px;
                border:1px solid #e2e8f0; background:white; font-size:13px;
                font-weight:600; color:#94a3b8; cursor:pointer">
                ${mostrarTodos ? '▲ Ver menos' : `▼ Ver todos (${gastos.length})`}
              </button>` : ''}`}
        </div>

       ${meta.cobrosExtra && meta.cobrosExtra.length > 0 ? `
<div class="card" style="padding:0; overflow:hidden; border:1.5px solid #fde68a; border-radius:12px">
  <div
    onclick="state['_cobrosExtraAdminOpen_${cobrador.id}']=!state['_cobrosExtraAdminOpen_${cobrador.id}']; render()"
    style="padding:12px 16px; background:#fffbeb; border-bottom:1px solid #fde68a;
           display:flex; justify-content:space-between; align-items:center;
           cursor:pointer; user-select:none">
    <div style="font-size:10px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:0.5px">
      📋 Cobros extra
    </div>
    <div style="display:flex; align-items:center; gap:8px">
      <span style="font-size:12px; font-weight:800; color:#92400e">
        ${formatMoney(meta.cobrosExtra.reduce((s, x) => s + Number(x.pago.monto), 0))}
      </span>
      <span style="font-size:12px; color:#92400e">
        ${state[`_cobrosExtraAdminOpen_${cobrador.id}`] ? '▲' : '▼'}
      </span>
    </div>
  </div>
  ${state[`_cobrosExtraAdminOpen_${cobrador.id}`] ? `
  <div style="padding:0 16px 8px; background:white">
    ${meta.cobrosExtra.map(x => `
      <div style="display:flex; justify-content:space-between; align-items:center;
                  padding:10px 0; border-bottom:1px solid #f1f5f9">
        <div>
          <div style="font-size:14px; font-weight:700; color:#1e293b">
            ${x.cliente?.nombre || '—'}
          </div>
          <div style="display:flex; gap:6px; margin-top:3px">
            <span style="background:#fff1f2; color:#9f1239; font-size:10px;
                         font-weight:700; padding:1px 7px; border-radius:4px">
              🔴 Crédito cerrado
            </span>
            <span style="font-size:11px; color:#94a3b8">${x.pago.tipo || 'efectivo'}</span>
          </div>
        </div>
        <div style="font-weight:800; color:#16a34a; font-size:15px">
          +${formatMoney(x.pago.monto)}
        </div>
      </div>`).join('')}
  </div>` : ''}
</div>` : ''}

       <div class="card" style="padding:0; overflow:hidden; border-radius:12px">
  <!-- Header ruta -->
  <div style="padding:14px 16px; min-height:56px; box-sizing:border-box; display:flex; justify-content:space-between; align-items:center;
              cursor:pointer; background:linear-gradient(135deg,#1a56db,#0ea96d)"
       onclick="state['_verRutaAdmin_${cobrador.id}']=!state['_verRutaAdmin_${cobrador.id}']; render()">

    <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
                white-space:nowrap; color:white">
      ✅ Ruta del día
    </div>

    <div style="display:flex; align-items:center; gap:8px">
      <span style="font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700;
                   white-space:nowrap; background:rgba(255,255,255,0.2); color:white">
        ${meta.detalle.filter(d => !d.completo).length} pendientes
      </span>

      <button onclick="event.stopPropagation(); abrirMapaRutaCobrador('${cobrador.id}', '${fechaVer}')"
        style="border:1px solid rgba(255,255,255,0.5); border-radius:8px; padding:6px 14px;
               background:rgba(255,255,255,0.15); color:white; font-size:12px; font-weight:700; cursor:pointer">
        🗺️ Mapa
      </button>

      <span style="font-size:16px; color:white">
        ${state[`_verRutaAdmin_${cobrador.id}`] ? '▲' : '▼'}
      </span>
    </div>
  </div>

  ${state[`_verRutaAdmin_${cobrador.id}`] ? `
  <div style="border-top:1px solid #f1f5f9; padding:0 16px 8px; background:white">
    ${(() => {

        const prioridad = { atrasado: 1, pendiente: 2, parcial: 3, pagado: 4, saldado: 5 };

        const listaOrdenada = [...meta.detalle].sort((a, b) => {
          return (prioridad[a.estadoVisual] || 99) - (prioridad[b.estadoVisual] || 99);
        });

        if (meta.detalle.length === 0) {
          return `<div style="text-align:center; padding:20px 0; color:#94a3b8; font-size:13px">
                  Sin clientes en ruta
                </div>`;
        }

        if (meta.detalle.every(d => d.estadoVisual === 'pagado' || d.estadoVisual === 'saldado')) {
          return `<div style="text-align:center; padding:20px 0">
                  <div style="font-size:22px">✅</div>
                  <div style="color:#16a34a; font-weight:700; font-size:13px; margin-top:4px">
                    ¡Ruta completada!
                  </div>
                </div>`;
        }   
        function getEstadoFiltro(d) {
          if (d.estadoVisual === 'saldado') return 'saldado';
          if (d.estadoVisual === 'pagado') return 'pagado';
          if (d.estadoVisual === 'parcial') return 'parcial';
          if (d.estadoVisual === 'atrasado') return 'atrasado';
          if (d.estadoVisual === 'pendiente') return 'pendiente';
          return 'otros';
        }

        const listaFiltrada = rutaFiltro !== 'todos'
          ? listaOrdenada.filter(d => getEstadoFiltro(d) === rutaFiltro)
          : listaOrdenada;

        const filtroBar = `
         <div style="display:flex; gap:6px; overflow-x:auto; padding:14px 0 10px; margin-top:6px; margin-bottom:4px">
            ${[
              { key: 'todos', label: 'Todos' },
              { key: 'pendiente', label: '⏳ Pendientes' },
              { key: 'atrasado', label: '🔴 Atrasados' },
              { key: 'parcial', label: '🟡 Abonos' },
              { key: 'pagado', label: '✅ Pagaron' },
              { key: 'saldado', label: '🏆 Saldados' },
            ].map(f => `
              <button onclick="event.stopPropagation(); state['${rutaFiltroKey}']='${f.key}'; render()"
                ${rutaFiltro === f.key ? 'data-filtro-activo="1"' : ''}
                style="padding:5px 10px; border-radius:15px; font-size:11px;
                       border:${rutaFiltro === f.key ? '2px solid #1a56db' : '1px solid #e2e8f0'};
                       background:${rutaFiltro === f.key ? '#eff6ff' : 'white'};
                       font-weight:${rutaFiltro === f.key ? '700' : '400'};
                       cursor:pointer; white-space:nowrap">
                ${f.label}
              </button>
            `).join('')}
          </div>`;

        const listaHTML = listaFiltrada.length === 0
          ? `<div style="text-align:center; padding:20px 0; color:#94a3b8; font-size:13px">
               Sin clientes en este filtro
             </div>`
          : listaFiltrada.map(d => {
              const terminado = d.estadoVisual === 'saldado' && d.deudaAcumulada <= 0.5;
              return `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:10px 0; border-bottom:1px solid #f8fafc;
                    ${terminado ? 'opacity:0.6' : ''}">

          <div style="flex:1; min-width:0">
            <div style="font-size:14px; font-weight:700; color:${terminado ? '#64748b' : '#1e293b'}">
              ${d.cliente?.nombre || '—'}
            </div>

            <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:3px; align-items:center">
              ${d.estadoVisual === 'saldado' ? `<span style="background:#bbf7d0; color:#14532d; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px">🏆 Saldado</span>` : ''}
              ${d.estadoVisual === 'pagado' ? `<span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px">✅ Pagó hoy</span>` : ''}
              ${d.estadoVisual === 'parcial' ? `<span style="background:#fef9c3; color:#854d0e; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px">🟡 Abonó ${formatMoney(d.montoPagadoHoy)}</span>` : ''}
              ${d.estadoVisual === 'atrasado' ? `<span style="background:#fee2e2; color:#991b1b; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px">🔴 Atrasado (${d.cuotasAtraso})</span>` : ''}
              ${d.estadoVisual === 'pendiente' ? `<span style="background:#f1f5f9; color:#64748b; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px">⏳ Pendiente</span>` : ''}

              ${d.estadoVisual !== 'saldado' ? `<span style="font-size:11px; color:#94a3b8">Cuota ${formatMoney(d.cuota)}</span>` : ''}

              ${d.deudaAcumulada > 0.5 && d.estadoVisual !== 'saldado' ? `
                <span style="background:#fff1f2; color:#9f1239; font-size:10px; font-weight:700; padding:1px 6px; border-radius:4px">
                  ⚠️ Debe ${formatMoney(d.deudaAcumulada)}
                </span>` : ''}
            </div>
          </div>

         ${!terminado ? `
         <button onclick="(async()=>{ const y=window.scrollY; await pagoRapido('${d.cr.id}'); requestAnimationFrame(()=>window.scrollTo(0,y)); })()"
              style="flex-shrink:0; margin-left:8px; border:none; padding:6px 14px; border-radius:8px;
                     cursor:pointer; background:#f0fdf4; color:#16a34a; font-size:12px; font-weight:700">
              💰 Cobrar
            </button>`
              :
              `<div style="flex-shrink:0; margin-left:8px; width:70px; display:flex; justify-content:center;
                         align-items:center; color:#16a34a; font-size:16px">
              ✅
            </div>`
            }
        </div>`;
            }).join('');

        return filtroBar + listaHTML;

      })()}
  </div>
  ` : ''}
</div>

${c.nota ? `
<div class="card" style="padding:14px 16px; background:#fefce8; border-radius:12px; border-left:4px solid #eab308; margin-top:10px">
  <div style="font-size:10px; font-weight:700; color:#854d0e; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px">
    📝 Nota
  </div>
  <div style="font-size:13px; color:#713f12; line-height:1.5; font-weight:500">
    ${c.nota}
  </div>
</div>
` : ''}

    <!-- CLIENTES CON FILTROS -->
<div class="card" style="padding:0; overflow:hidden; border-radius:12px; margin-top:20px">


  <!-- Header colapsable -->
  <div style="padding:14px 16px; min-height:56px; box-sizing:border-box; display:flex; justify-content:space-between; align-items:center;
              cursor:pointer; background:linear-gradient(135deg,#1a56db,#0ea96d)"
       onclick="state['_verClientesAdmin_${cobrador.id}']=!state['_verClientesAdmin_${cobrador.id}']; render()">
    <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; color:white">
      👥 Clientes de ${cobrador.nombre}
    </div>
    <div style="display:flex; align-items:center; gap:8px; flex-shrink:0; margin-left:8px">
      <span style="font-size:10px; padding:2px 8px; border-radius:10px; font-weight:700;
                   white-space:nowrap; background:rgba(255,255,255,0.2); color:white">
        ${listaClientes.length} / ${clientes.length}
      </span>
      <span style="font-size:16px; color:white">
        ${state[`_verClientesAdmin_${cobrador.id}`] ? '▲' : '▼'}
      </span>
    </div>
  </div>

  <div style="height:1px; background:rgba(255,255,255,0.15)"></div>

  ${state[`_verClientesAdmin_${cobrador.id}`] ? `
  <div style="padding:12px 16px 8px; background:white">

    <!-- Barra de búsqueda -->
    <div style="margin-bottom:10px">
      <div style="position:relative; width:100%">
      <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                   pointer-events:none; display:flex; align-items:center; z-index:1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </span>
  <input
    id="search_${cobrador.id}" 
    style="width:100%; box-sizing:border-box; border:1px solid #e2e8f0; border-radius:20px;
           padding:9px 36px; font-size:13px; color:#1e293b;
           font-weight:500; outline:none; background:#f8fafc"
    placeholder="Buscar por nombre o DNI..."
    value="${state[`_searchClientes_${cobrador.id}`] || ''}"
    oninput="
      const val = this.value;
      const inputId = this.id;
      state['_searchClientes_${cobrador.id}'] = val; 
      
      clearTimeout(window._searchT);
      const y = window.scrollY;

      window._searchT = setTimeout(() => {
        render(); 
        const input = document.getElementById(inputId);
        if (input) {
          input.focus();
          input.setSelectionRange(val.length, val.length);
        }
        requestAnimationFrame(() => window.scrollTo(0, y));
      }, 300)">

  ${state[`_searchClientes_${cobrador.id}`] ? `
    <span onclick="
      event.stopPropagation(); 
      state['_searchClientes_${cobrador.id}'] = ''; 
      const y = window.scrollY;
      render(); 
      requestAnimationFrame(() => window.scrollTo(0, y));"
      style="position:absolute; right:12px; top:50%; transform:translateY(-50%);
             cursor:pointer; color:#94a3b8; font-size:13px; font-weight:700; padding:5px">
      ✕
    </span>
  ` : ''}
</div>
    </div>

    <!-- Filtros -->
    <div class="filtros-scroll" style="margin-bottom:10px; display:flex; gap:5px; overflow-x:auto; padding-bottom:4px">
  ${[
        { key: 'todos', label: 'Todos' },
        { key: 'activos', label: '✅ Activos' },
        { key: 'atrasados', label: '🔴 Atrasados' },
        { key: 'sin_credito', label: '🆕 Sin crédito' }, // Acortamos el texto para ganar espacio
      ].map(f => `
    <button onclick="event.stopPropagation(); state['${filtroKey}']='${f.key}'; render()"
      class="filtro-btn ${filtroAdminCob === f.key ? 'active' : ''}"
      style="padding: 5px 10px; font-size: 10.5px; border-radius: 15px; white-space: nowrap; flex-shrink: 0; height: 28px; display: flex; align-items: center; gap: 4px">
      ${f.label}
    </button>`).join('')}
</div>

    <!-- Lista -->
    ${(() => {
        const busqueda = (state[`_searchClientes_${cobrador.id}`] || '').toLowerCase();
        const filtrados = busqueda
          ? listaClientes.filter(cl =>
            cl.nombre.toLowerCase().includes(busqueda) ||
            (cl.dni || '').toLowerCase().includes(busqueda))
          : listaClientes;

        return filtrados.length === 0
          ? `<div class="empty-state" style="padding:20px 0">
             <div class="icon">👤</div>
             <p>Sin clientes en este filtro</p>
           </div>`
          : filtrados.map(cl => {
            const crs = creditos.filter(cr => cr.clienteId === cl.id && cr.activo);
            const estadoAtraso = crs.length > 0
              ? calcularEstadoAtraso(crs[0], pagosCache)
              : { atrasado: false, cuotasAtraso: 0 };
            const vencido = crs.length > 0 && estaVencido(crs[0].fechaInicio, crs[0].diasTotal);

            let badge, badgeStyle;
            if (estadoAtraso.atrasado) {
              badge = vencido ? '🔴 Vencido' : `⚠️ Atrasado ${estadoAtraso.cuotasAtraso}`;
              badgeStyle = vencido ? 'background:#fff1f2;color:#9f1239' : 'background:#fff7ed;color:#c2410c';
            } else if (crs.length > 0) {
              badge = '● Activo'; badgeStyle = 'background:#f0fdf4;color:#166534';
            } else {
              badge = 'Sin crédito'; badgeStyle = 'background:#f8fafc;color:#64748b';
            }

            return `
              <div class="client-item" onclick="selectClient('${cl.id}')" style="cursor:pointer">
                <div class="client-avatar"
                  style="background:linear-gradient(135deg,#1a56db,#0ea96d);color:white;font-weight:800">
                  ${cl.nombre.charAt(0)}
                </div>
                <div class="client-info">
                  <div class="client-name" style="font-weight:700;color:#1e293b">${cl.nombre}</div>
                  <div class="client-dni" style="font-size:12px;color:#94a3b8">DNI: ${cl.dni}</div>
                </div>
                <span style="padding:4px 10px;border-radius:6px;font-size:10.5px;
                             font-weight:700;white-space:nowrap;${badgeStyle}">
                  ${badge}
                </span>
              </div>`;
          }).join('');
      })()}

  </div>` : ''}

</div>
</div>`;
};

window.cambiarFechaCobrador = function cambiarFechaCobrador(dias) {
  const actual = state._fechaCobrador || today();
  const partes = actual.split('-');
  const fecha = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  fecha.setDate(fecha.getDate() + dias);
  const nueva = [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')
  ].join('-');
  if (nueva > today()) return;
  state._fechaCobrador = nueva;
  render();
};

window.eliminarCobrador = async function eliminarCobrador(id) {
  const users = DB._cache['users'] || [];
  const u = users.find(x => x.id === id);
  if (!u || u.role === 'admin') {
    alert('No se puede eliminar un administrador desde esta opción.');
    return;
  }
  if (!await showConfirm('¿Eliminar este cobrador y todos sus datos (clientes, créditos, pagos)? Esta acción no se puede deshacer.', { danger: true, confirmText: 'Eliminar todo' })) return;
  try {
    await eliminarCobradorCascade(id);
    state.selectedCobrador = null;
    state.modal = null;
    showToast('Cobrador eliminado');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
};

window.abrirGestionCredito = function abrirGestionCredito(crId, clienteId) {
  state._selectedClientAntes = state.selectedClient || null;
  state.selectedClient = (DB._cache['clientes'] || []).find(x => x.id === clienteId);
  state.selectedCredito = (DB._cache['creditos'] || []).find(x => x.id === crId);
  state._gestionCreditoDesdeAdmin = !state._selectedClientAntes;
  state.modal = 'gestionar-credito';
  render();
};

window.selectCobrador = function selectCobrador(id) {
  state.selectedCobrador = id;
  render();
};

window.guardarUsuario = async function guardarUsuario() {
  if (window._guardandoUsuario) return;
  window._guardandoUsuario = true;
  const btn = document.querySelector('[onclick="guardarUsuario()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const nombre = document.getElementById('uNombre').value.trim();
    const user = document.getElementById('uUser').value.trim();
    const pass = document.getElementById('uPass').value.trim();
    const role = document.getElementById('uRol').value;
    const telefono = document.getElementById('uTelefono').value.replace(/\D/g, '').trim();
    if (!nombre || !user || !pass) { alert('Todos los campos son obligatorios'); return; }
    const users = DB._cache['users'] || [];
    if (users.find(u => u.user === user)) { alert('Ese nombre de usuario ya existe'); return; }
    const id = genId();
    const nuevoUser = { id, nombre, user, pass, role, telefono };
    await DB.set('users', id, nuevoUser);
    state.modal = null;
    showToast('Usuario creado exitosamente');
    render();
  } catch (e) {
    alert('Error al guardar: ' + e.message);
  } finally {
    window._guardandoUsuario = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Crear Usuario'; }
  }
};

window.actualizarUsuario = async function actualizarUsuario() {
  if (window._actualizandoUsuario) return;
  window._actualizandoUsuario = true;
  const btn = document.querySelector('[onclick="actualizarUsuario()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  try {
    const users = DB._cache['users'] || [];
    const u = users.find(x => x.id === state.selectedCobrador);
    if (!u) return;
    const nombre = document.getElementById('euNombre').value.trim();
    const user = document.getElementById('euUser').value.trim();
    const pass = document.getElementById('euPass').value.trim();
    const role = document.getElementById('euRol').value;
    const telefono = document.getElementById('euTelefono').value.replace(/\D/g, '').trim();
    if (!nombre || !user) { alert('Nombre y usuario son obligatorios'); return; }
    if (users.find(x => x.user === user && x.id !== u.id)) { alert('Ese usuario ya existe'); return; }
    const updates = { nombre, user, role, telefono };
    if (pass) updates.pass = pass;
    await DB.update('users', u.id, updates);
    const idx = (DB._cache['users'] || []).findIndex(x => x.id === u.id);
    if (idx !== -1) DB._cache['users'][idx] = { ...DB._cache['users'][idx], ...updates };
    state.modal = null;
    showToast('Usuario actualizado');
    render();
  } catch (e) {
    alert('Error al actualizar: ' + e.message);
  } finally {
    window._actualizandoUsuario = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Actualizar Datos'; }
  }
};

window.abrirEditarCredito = function abrirEditarCredito(crId) {
  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;
  state._editandoCredito = cr;
  state.modal = 'editar-credito';
  render();
};

window.renderModalEditarCredito = function renderModalEditarCredito() {
  const cr = state._editandoCredito;
  if (!cr) return '';
  const cliente = (DB._cache['clientes'] || []).find(c => c.id === cr.clienteId);
  const totalActual = cr.monto * 1.2;
  const cuotaActual = totalActual / cr.diasTotal;
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">✏️ Corregir Monto</div>
  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
    <div style="font-size:12px;color:var(--muted)">Cliente</div>
    <div style="font-weight:700">${cliente?.nombre || '—'}</div>
  </div>
  <div class="form-group">
    <label>Monto prestado (S/) *</label>
    <input class="form-control" id="ecMonto" type="number" step="0.01"
      value="${cr.monto}" oninput="previsualizarCambioMonto()">
  </div>
  <div style="background:#eff6ff;border-radius:10px;padding:12px;margin-bottom:16px">
    <div style="font-size:11px;color:var(--muted);font-weight:700;margin-bottom:8px;text-transform:uppercase">
      Se recalculará con 20% de interés
    </div> 
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div>
        <div style="font-size:11px;color:var(--muted)">Total a pagar</div>
        <div style="font-weight:800;font-size:18px;color:var(--primary)" id="ecPreviewTotal">${formatMoney(totalActual)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted)">Cuota diaria</div>
        <div style="font-weight:800;font-size:18px;color:var(--primary)" id="ecPreviewCuota">${formatMoney(cuotaActual)}</div>
      </div>
    </div>
  </div>
  <button class="btn btn-primary" onclick="guardarCreditoEditado()">💾 Guardar corrección</button>`;
};

window.previsualizarCambioMonto = function previsualizarCambioMonto() {
  const monto = parseFloat(document.getElementById('ecMonto').value) || 0;
  const cr = state._editandoCredito;
  const total = monto * 1.2;
  const cuota = total / (cr?.diasTotal || 24);
  const elTotal = document.getElementById('ecPreviewTotal');
  const elCuota = document.getElementById('ecPreviewCuota');
  if (elTotal) elTotal.textContent = formatMoney(total);
  if (elCuota) elCuota.textContent = formatMoney(cuota);
};

window.guardarCreditoEditado = async function guardarCreditoEditado() {
  const cr = state._editandoCredito;
  const monto = parseMonto(document.getElementById('ecMonto').value);
  if (!monto || monto <= 0) { alert('Ingresa un monto válido'); return; }
  const total = Math.round(monto * 1.2 * 100) / 100;
  const cuotaDiaria = Math.round((total / cr.diasTotal) * 100) / 100;
  const montoSeguro = cr.seguro
    ? Math.round(monto * ((cr.porcentajeSeguro || 5) / 100) * 100) / 100
    : 0;
  const montoEntregado = monto - montoSeguro;
  const updates = { monto, total, cuotaDiaria, montoSeguro, montoEntregado };
  try {
    await DB.update('creditos', cr.id, updates);
    const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === cr.id);
    if (idx !== -1) DB._cache['creditos'][idx] = { ...DB._cache['creditos'][idx], ...updates };
    state._editandoCredito = null;
    state.modal = null;
    showToast('✅ Monto corregido correctamente');
    render();
  } catch (e) {
    alert('Error al guardar: ' + e.message);
  }
};

window.abrirAgregarFeriado = function () {
  state.modal = 'agregar-feriado';
  render();
};

window.renderModalAgregarFeriado = function () {
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">📅 Agregar Día No Laborable</div>
  <div style="background:#fffbeb; border-radius:8px; padding:10px 14px; margin-bottom:14px;
              font-size:12.5px; color:#92400e; font-weight:500; line-height:1.5">
    💡 En este día los cobradores no verán clientes por cobrar y no se acumulará deuda.
  </div>
  <div class="form-group">
    <label>Fecha *</label>
    <input type="hidden" id="feriadoFecha" value="${today()}">
    ${renderDatePicker({ value: today(), onChange: "document.getElementById('feriadoFecha').value=VALUE" })}
  </div>
  <div class="form-group">
    <label>Descripción (opcional)</label>
    <input class="form-control" id="feriadoDesc" placeholder="Ej: Fiestas Patrias, Navidad...">
  </div>
  <button class="btn btn-primary" onclick="guardarFeriado()">Guardar</button>`;
};

window.guardarFeriado = async function () {
  const fecha = document.getElementById('feriadoFecha').value;
  if (!fecha) { alert('Selecciona una fecha'); return; }
  const diaSemana = new Date(fecha + 'T00:00:00').getDay();
  if (diaSemana === 0) { alert('Los domingos ya son no laborables por defecto.'); return; }
  const cfg = DB._cache['configuracion'] || [];
  const doc = cfg.find(c => c.id === 'dias_no_laborables');
  const fechas = doc?.fechas || [];
  if (fechas.includes(fecha)) { alert('Esa fecha ya está bloqueada'); return; }
  const nuevasFechas = [...fechas, fecha].sort();
  const nuevoDoc = { id: 'dias_no_laborables', fechas: nuevasFechas };
  try {
    await DB.set('configuracion', 'dias_no_laborables', nuevoDoc);
    if (!DB._cache['configuracion']) DB._cache['configuracion'] = [];
    const idx = DB._cache['configuracion'].findIndex(c => c.id === 'dias_no_laborables');
    if (idx !== -1) DB._cache['configuracion'][idx] = nuevoDoc;
    else DB._cache['configuracion'].push(nuevoDoc);
    state.modal = null;
    showToast('📅 Día bloqueado correctamente');
    render();
  } catch (e) {
    console.error('Error al guardar feriado:', e);
  }
};

window.eliminarFeriado = async function (fecha) {
  if (!await showConfirm(`¿Eliminar el bloqueo del ${formatDate(fecha)}?`, { danger: true, confirmText: 'Eliminar' })) return;
  const cfg = DB._cache['configuracion'] || [];
  const doc = cfg.find(c => c.id === 'dias_no_laborables');
  const nuevasFechas = (doc?.fechas || []).filter(f => f !== fecha);
  const nuevoDoc = { id: 'dias_no_laborables', fechas: nuevasFechas };
  try {
    await DB.set('configuracion', 'dias_no_laborables', nuevoDoc);
    const idx = (DB._cache['configuracion'] || []).findIndex(c => c.id === 'dias_no_laborables');
    if (idx !== -1) DB._cache['configuracion'][idx] = nuevoDoc;
    showToast('✅ Fecha desbloqueada');
    render();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
};

window.abrirMapaRutaCobrador = function (cobradorId, fecha) {
  const meta = calcularMetaReal(cobradorId, fecha);
  window._metaDetalle = meta.detalle;
  abrirMapaRuta();
};