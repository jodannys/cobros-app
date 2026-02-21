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
    } else {
        const id = genId();
        await DB.set('notas_cuadre', id, { id, cobradorId: state.currentUser.id, fecha: today(), nota });
    }
    showToast('Nota guardada');
}

function renderCuadre() {
    const isAdmin = state.currentUser.role === 'admin';
    const hoy = today();
    const creditos = DB._cache['creditos'] || [];
    const clientes = DB._cache['clientes'] || [];
    const usuarios = DB._cache['users'] || [];

    // --- LÓGICA PARA ADMINISTRADOR (VISTA GLOBAL) ---
    if (isAdmin) {
        // 1. Objetivo Global: Suma de cuotas de TODOS los créditos activos en el sistema
        const totalObjetivoGlobal = creditos
            .filter(cr => cr.activo === true) // Solo cuenta los activos
            .reduce((s, cr) => s + (Number(cr.cuotaDiaria) || 0), 0);

        // 2. Recaudación Global: Suma de todos los pagos de todos los cobradores hoy
        const pagosHoy = (DB._cache['pagos'] || []).filter(p => p.fecha === hoy);
        const totalRecaudadoGlobal = pagosHoy.reduce((s, p) => s + (Number(p.monto) || 0), 0);

        // 3. Desglose por cobrador para la tabla
        const cobradores = usuarios.filter(u => u.role === 'cobrador');
        const filasCobradores = cobradores.map(u => {
            const c = getCuadreDelDia(u.id, hoy);
            return { u, c };
        });

        const porcentajeGlobal = totalObjetivoGlobal > 0 ? Math.round((totalRecaudadoGlobal / totalObjetivoGlobal) * 100) : 0;

        return `
        <div class="topbar"><h2>Cuadre General</h2><div class="topbar-user"><strong>Admin</strong></div></div>
        <div class="page">
            <div class="card" style="padding:16px; margin-bottom:16px; background: #1e293b; color: white; border: none;">
                <div style="font-size:11px; opacity:0.8; font-weight:700; text-transform:uppercase; margin-bottom:10px">Estado de Cobranza (Hoy)</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px">
                    <div>
                        <div style="font-size:10px; opacity:0.7">OBJETIVO TOTAL</div>
                        <div style="font-size:20px; font-weight:800">${formatMoney(totalObjetivoGlobal)}</div>
                    </div>
                    <div>
                        <div style="font-size:10px; opacity:0.7">RECAUDADO</div>
                        <div style="font-size:20px; font-weight:800; color:#4ade80">${formatMoney(totalRecaudadoGlobal)}</div>
                    </div>
                </div>
                <div style="margin-top:12px; background: rgba(255,255,255,0.1); height:8px; border-radius:4px; overflow:hidden">
                    <div style="width:${porcentajeGlobal}%; background:#22c55e; height:100%"></div>
                </div>
                <div class="flex-between" style="margin-top:8px">
                    <span style="font-size:12px; opacity:0.8">Faltan: ${formatMoney(Math.max(0, totalObjetivoGlobal - totalRecaudadoGlobal))}</span>
                    <span style="font-size:12px; font-weight:700">${porcentajeGlobal}%</span>
                </div>
            </div>

            <div class="card-title">Rendimiento por Cobrador</div>
            ${filasCobradores.map(({ u, c }) => `
                <div class="card" style="padding:14px; margin-bottom:10px">
                    <div class="flex-between">
                        <div style="font-weight:700">${u.nombre}</div>
                        <div class="fw-bold text-success">${formatMoney(c.total)}</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;margin-top:10px">
                        <div style="background:var(--bg);border-radius:8px;padding:6px">
                            <div style="font-size:9px;color:var(--muted)">Yape</div>
                            <div style="font-weight:700;font-size:12px">${formatMoney(c.yape)}</div>
                        </div>
                        <div style="background:var(--bg);border-radius:8px;padding:6px">
                            <div style="font-size:9px;color:var(--muted)">Efectivo</div>
                            <div style="font-weight:700;font-size:12px">${formatMoney(c.efectivo)}</div>
                        </div>
                        <div style="background:var(--bg);border-radius:8px;padding:6px">
                            <div style="font-size:9px;color:var(--muted)">Transf.</div>
                            <div style="font-weight:700;font-size:12px">${formatMoney(c.transferencia)}</div>
                        </div>
                    </div>
                </div>`).join('')}
        </div>`;
    }

    // --- VISTA PARA COBRADOR (PERSONAL) ---
    const cuadreHoy = getCuadreDelDia(state.currentUser.id, hoy);
    
    const misClientesIds = clientes
        .filter(c => c.cobradorId === state.currentUser.id)
        .map(c => c.id);

    const porCobrarHoy = creditos
        .filter(cr => misClientesIds.includes(cr.clienteId) && cr.activo === true)
        .reduce((s, cr) => s + (Number(cr.cuotaDiaria) || 0), 0);

    const metaAlcanzada = cuadreHoy.total >= porCobrarHoy && porCobrarHoy > 0;

    return `
    <div class="topbar"><h2>Mi Cuadre</h2><div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div></div>
    <div class="page">
        <div class="card" style="padding:16px; margin-bottom:12px; background: ${metaAlcanzada ? '#f0fdf4' : '#fffbeb'}; border-left: 4px solid ${metaAlcanzada ? '#22c55e' : '#f59e0b'};">
            <div class="flex-between">
                <div>
                    <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase">Meta Diaria (Cuotas)</div>
                    <div style="font-size:20px; font-weight:800; color:#1e293b">${formatMoney(porCobrarHoy)}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase">Recaudado</div>
                    <div style="font-size:20px; font-weight:800; color:${metaAlcanzada ? '#16a34a' : '#1e293b'}">${formatMoney(cuadreHoy.total)}</div>
                </div>
            </div>
            <div style="margin-top:10px; font-size:13px; font-weight:600; color: ${metaAlcanzada ? '#166534' : '#92400e'}">
                ${metaAlcanzada 
                    ? `✅ Meta superada por ${formatMoney(cuadreHoy.total - porCobrarHoy)}` 
                    : `Faltan ${formatMoney(Math.max(0, porCobrarHoy - cuadreHoy.total))} para alcanzar la meta`}
            </div>
        </div>

        <div class="payment-split" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:15px">
            <div style="background:white; padding:8px; border-radius:10px; text-align:center; border:1px solid #e2e8f0; box-shadow: var(--shadow)">
                <div style="font-size:9px; color:var(--muted)">YAPE</div>
                <div style="font-weight:700; font-size:13px">${formatMoney(cuadreHoy.yape)}</div>
            </div>
            <div style="background:white; padding:8px; border-radius:10px; text-align:center; border:1px solid #e2e8f0; box-shadow: var(--shadow)">
                <div style="font-size:9px; color:var(--muted)">EFECTIVO</div>
                <div style="font-weight:700; font-size:13px">${formatMoney(cuadreHoy.efectivo)}</div>
            </div>
            <div style="background:white; padding:8px; border-radius:10px; text-align:center; border:1px solid #e2e8f0; box-shadow: var(--shadow)">
                <div style="font-size:9px; color:var(--muted)">TRANSF.</div>
                <div style="font-weight:700; font-size:13px">${formatMoney(cuadreHoy.transferencia)}</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">Cobros del Día (${cuadreHoy.pagos.length})</div>
            ${cuadreHoy.pagos.length === 0 ? '<p style="padding:20px; text-align:center; color:#94a3b8">No hay cobros registrados</p>' : 
              cuadreHoy.pagos.map(p => {
                const cl = clientes.find(c => c.id === p.clienteId);
                return `
                <div class="cuota-item" style="border-bottom:1px solid #f1f5f9; padding:10px 0">
                    <div>
                        <div style="font-weight:700; font-size:14px">${cl ? cl.nombre : 'Cliente'}</div>
                        <div style="font-size:11px; color:#64748b">${p.tipo.toUpperCase()}</div>
                    </div>
                    <div style="font-weight:800; color:#059669">${formatMoney(p.monto)}</div>
                </div>`;
            }).join('')}
        </div>
        
        <div class="card" style="margin-top:12px; padding:12px">
            <div style="font-weight:700; font-size:12px; margin-bottom:6px">📝 NOTA DEL DÍA</div>
            <textarea id="notaHoy" class="form-control" style="height:50px; font-size:13px" placeholder="Escribe aquí novedades...">${cuadreHoy.nota}</textarea>
            <button class="btn btn-primary" style="width:100%; margin-top:8px; font-size:13px" onclick="guardarNota()">Guardar Nota</button>
        </div>
    </div>`;
}