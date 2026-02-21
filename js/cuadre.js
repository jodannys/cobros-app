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

    // --- VISTA PARA ADMINISTRADOR ---
    if (isAdmin) {
        const cobradores = users.filter(u => u.role === 'cobrador');
        let totalGeneral = 0;
        const filas = cobradores.map(u => { 
            const c = getCuadreDelDia(u.id, hoy); 
            totalGeneral += c.total; 
            return { u, c }; 
        });

        return `
        <div class="topbar"><h2>Cuadre General</h2><div class="topbar-user"><strong>Admin</strong></div></div>
        <div class="page">
            <div class="cuadre-total">
                <div style="font-size:13px;opacity:0.85">Recaudación Total Hoy</div>
                <div class="amount">${formatMoney(totalGeneral)}</div>
            </div>
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
    const misClientesIds = (DB._cache['clientes'] || [])
        .filter(c => c.cobradorId === state.currentUser.id)
        .map(c => c.id);
    
    const porCobrarHoy = (DB._cache['creditos'] || [])
        .filter(cr => misClientesIds.includes(cr.clienteId) && cr.estado === 'activo')
        .reduce((s, cr) => s + (cr.cuotaDiaria || 0), 0);

    const metaAlcanzada = cuadreHoy.total >= porCobrarHoy && porCobrarHoy > 0;

    return `
    <div class="topbar"><h2>Mi Cuadre</h2><div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div></div>
    <div class="page">
        <div class="card" style="padding:16px; margin-bottom:12px; background: ${metaAlcanzada ? '#dcfce7' : '#f8fafc'}; border-left: 4px solid ${metaAlcanzada ? '#22c55e' : '#4a90e2'}; transition: all 0.3s ease;">
            <div class="flex-between">
                <span style="font-size:11px; color:var(--muted); font-weight:700; text-transform:uppercase">Objetivo del día</span>
                <span style="font-size:14px; font-weight:700">${formatMoney(porCobrarHoy)}</span>
            </div>
            <div style="font-size:13px; font-weight: 600; color: ${metaAlcanzada ? '#166534' : '#4a5568'}; margin-top:6px">
                ${metaAlcanzada ? '✅ ¡Excelente! Meta completada' : `Faltan recoger: <strong>${formatMoney(Math.max(0, porCobrarHoy - cuadreHoy.total))}</strong>`}
            </div>
        </div>

        <div class="cuadre-total">
            <div style="font-size:13px;opacity:0.85">Total cobrado hoy</div>
            <div class="amount">${formatMoney(cuadreHoy.total)}</div>
        </div>

        <div class="payment-split" style="display:flex; gap:10px; margin-bottom:15px">
            <div style="flex:1; background:white; padding:10px; border-radius:12px; text-align:center; box-shadow: var(--shadow)">
                <div style="font-size:10px; color:var(--muted)">YAPE</div>
                <div style="font-weight:700">${formatMoney(cuadreHoy.yape)}</div>
            </div>
            <div style="flex:1; background:white; padding:10px; border-radius:12px; text-align:center; box-shadow: var(--shadow)">
                <div style="font-size:10px; color:var(--muted)">EFECTIVO</div>
                <div style="font-weight:700">${formatMoney(cuadreHoy.efectivo)}</div>
            </div>
        </div>

        <div class="card">
            <div class="card-title">Pagos registrados (${cuadreHoy.pagos.length})</div>
            ${cuadreHoy.pagos.length === 0 ? '<p style="text-align:center; color:#999; padding:10px">No hay cobros aún</p>' : 
              cuadreHoy.pagos.map(p => {
                const cl = (DB._cache['clientes'] || []).find(c => c.id === p.clienteId);
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
            <textarea id="notaHoy" class="form-control" style="height:60px; font-size:13px" placeholder="Alguna novedad...">${cuadreHoy.nota}</textarea>
            <button class="btn btn-primary" style="width:100%; margin-top:8px" onclick="guardarNota()">Guardar Nota</button>
        </div>
    </div>`;
}