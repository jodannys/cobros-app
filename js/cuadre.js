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
    const users = DB._cache['users'] || [];
    const creditos = DB._cache['creditos'] || [];
    const clientes = DB._cache['clientes'] || [];

    // --- LÓGICA PARA ADMINISTRADOR (RESUMEN GLOBAL) ---
    if (isAdmin) {
        const cobradores = users.filter(u => u.role === 'cobrador');
        
        // Calcular Meta Global (Suma de cuotas de todos los créditos activos)
        const metaGlobal = creditos
            .filter(cr => cr.activo === true)
            .reduce((s, cr) => s + (parseFloat(cr.cuotaDiaria) || 0), 0);

        let recaudadoGlobal = 0;
        const filas = cobradores.map(u => { 
            const c = getCuadreDelDia(u.id, hoy); 
            recaudadoGlobal += c.total; 
            return { u, c }; 
        });

        const faltanteGlobal = Math.max(0, metaGlobal - recaudadoGlobal);
        const porcGlobal = metaGlobal > 0 ? Math.round((recaudadoGlobal / metaGlobal) * 100) : 0;

        return `
        <div class="topbar"><h2>Cuadre General</h2><div class="topbar-user"><strong>Admin</strong></div></div>
        <div class="page">
            
            <div class="card" style="padding:16px; margin-bottom:16px; background: linear-gradient(135deg, #1e293b, #334155); color: white; border: none;">
                <div style="font-size:11px; opacity:0.8; font-weight:700; text-transform:uppercase; margin-bottom:10px">Resumen de Operación Hoy</div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px">
                    <div>
                        <div style="font-size:10px; opacity:0.7">OBJETIVO TOTAL</div>
                        <div style="font-size:18px; font-weight:700">${formatMoney(metaGlobal)}</div>
                    </div>
                    <div>
                        <div style="font-size:10px; opacity:0.7">RECAUDADO</div>
                        <div style="font-size:18px; font-weight:700; color:#4ade80">${formatMoney(recaudadoGlobal)}</div>
                    </div>
                </div>
                <div style="margin-top:12px; background: rgba(255,255,255,0.1); height:8px; border-radius:4px; overflow:hidden">
                    <div style="width:${porcGlobal}%; background:#4ade80; height:100%; transition: width 0.5s"></div>
                </div>
                <div class="flex-between" style="margin-top:8px">
                    <span style="font-size:12px; opacity:0.8">Faltan: ${formatMoney(faltanteGlobal)}</span>
                    <span style="font-size:12px; font-weight:700">${porcGlobal}%</span>
                </div>
            </div>

            <div class="card-title">Desglose por Cobrador</div>
            ${filas.map(({ u, c }) => `
                <div class="card" style="padding:14px; margin-bottom:10px">
                    <div class="flex-between mb-2">
                        <div style="font-weight:700">${u.nombre}</div>
                        <div class="fw-bold text-success">${formatMoney(c.total)}</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
                        <div style="background:var(--bg);border-radius:8px;padding:6px">
                            <div style="font-size:10px;color:var(--muted)">Yape</div>
                            <div style="font-weight:700;font-size:12px">${formatMoney(c.yape)}</div>
                        </div>
                        <div style="background:var(--bg);border-radius:8px;padding:6px">
                            <div style="font-size:10px;color:var(--muted)">Efect.</div>
                            <div style="font-weight:700;font-size:12px">${formatMoney(c.efectivo)}</div>
                        </div>
                        <div style="background:var(--bg);border-radius:8px;padding:6px">
                            <div style="font-size:10px;color:var(--muted)">Trans.</div>
                            <div style="font-weight:700;font-size:12px">${formatMoney(c.transferencia)}</div>
                        </div>
                    </div>
                    ${c.nota ? `<div style="font-size:11px; color:#666; margin-top:8px; font-style:italic">📝 ${c.nota}</div>` : ''}
                </div>`).join('')}
        </div>`;
    }

    // --- VISTA PARA COBRADOR (CON META DINÁMICA) ---
    const cuadreHoy = getCuadreDelDia(state.currentUser.id, hoy);
    
    // Filtro de clientes y créditos corregido (cr.activo === true)
    const misClientesIds = clientes
        .filter(c => c.cobradorId === state.currentUser.id)
        .map(c => c.id);
    
    const porCobrarHoy = creditos
        .filter(cr => misClientesIds.includes(cr.clienteId) && cr.activo === true)
        .reduce((s, cr) => s + (parseFloat(cr.cuotaDiaria) || 0), 0);

    const metaAlcanzada = cuadreHoy.total >= porCobrarHoy && porCobrarHoy > 0;
    const faltanteCobrador = Math.max(0, porCobrarHoy - cuadreHoy.total);

    return `
    <div class="topbar"><h2>Mi Cuadre</h2><div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div></div>
    <div class="page">
        <div class="card" style="padding:16px; margin-bottom:12px; background: ${metaAlcanzada ? '#dcfce7' : '#f8fafc'}; border-left: 4px solid ${metaAlcanzada ? '#22c55e' : '#4a90e2'}; transition: all 0.3s ease;">
            <div class="flex-between">
                <span style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase">Mi objetivo hoy</span>
                <span style="font-size:14px; font-weight:700">${formatMoney(porCobrarHoy)}</span>
            </div>
            <div style="font-size:13px; font-weight: 600; color: ${metaAlcanzada ? '#166534' : '#4a5568'}; margin-top:6px">
                ${metaAlcanzada ? '✅ ¡Excelente! Meta completada' : `Faltan recoger: <strong>${formatMoney(faltanteCobrador)}</strong>`}
            </div>
        </div>

        <div class="cuadre-total">
            <div style="font-size:13px;opacity:0.85">Ya cobrado hoy</div>
            <div class="amount">${formatMoney(cuadreHoy.total)}</div>
        </div>

        <div class="payment-split" style="display:flex; gap:10px; margin-bottom:15px">
            <div style="flex:1; background:white; padding:10px; border-radius:12px; text-align:center; box-shadow: var(--shadow)">
                <div style="font-size:10px; color:var(--muted)">📱 YAPE</div>
                <div style="font-weight:700">${formatMoney(cuadreHoy.yape)}</div>
            </div>
            <div style="flex:1; background:white; padding:10px; border-radius:12px; text-align:center; box-shadow: var(--shadow)">
                <div style="font-size:10px; color:var(--muted)">💵 EFECTIVO</div>
                <div style="font-weight:700">${formatMoney(cuadreHoy.efectivo)}</div>
            </div>
            <div style="flex:1; background:white; padding:10px; border-radius:12px; text-align:center; box-shadow: var(--shadow)">
                <div style="font-size:10px; color:var(--muted)">🏦 TRANS.</div>
                <div style="font-weight:700">${formatMoney(cuadreHoy.transferencia)}</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">Pagos del día (${cuadreHoy.pagos.length})</div>
            ${cuadreHoy.pagos.length === 0 ? '<p style="text-align:center; color:#999; padding:10px">Aún no has registrado cobros</p>' : 
              cuadreHoy.pagos.map(p => {
                const cl = clientes.find(c => c.id === p.clienteId);
                return `
                <div class="cuota-item">
                    <div>
                        <div style="font-weight:600;font-size:14px">${cl ? cl.nombre : 'Cliente'}</div>
                        <div style="font-size:11px;color:var(--muted)">${p.tipo.toUpperCase()}</div>
                    </div>
                    <div style="font-weight:700;color:var(--success)">+ ${formatMoney(p.monto)}</div>
                </div>`;
            }).join('')}
        </div>

        <div class="card" style="margin-top:15px; padding:12px">
            <div style="font-weight:700; font-size:13px; margin-bottom:8px">📝 Nota del día</div>
            <textarea id="notaHoy" class="form-control" style="height:60px; font-size:13px" placeholder="Reporta novedades aquí...">${cuadreHoy.nota}</textarea>
            <button class="btn btn-primary" style="width:100%; margin-top:8px" onclick="guardarNota()">Guardar Nota</button>
        </div>
    </div>`;
}