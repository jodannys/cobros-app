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
    const todosLosPagos = DB._cache['pagos'] || [];

    // --- LÓGICA DE CÁLCULO MEJORADA ---
    
    // 1. Identificar créditos que este cobrador debe atender hoy
    const misClientesIds = clientes
        .filter(c => c.cobradorId === state.currentUser.id)
        .map(c => c.id);

    const misCreditosActivos = creditos.filter(cr => 
        misClientesIds.includes(cr.clienteId) && cr.activo === true
    );

    // 2. Objetivo: Suma de cuotas diarias de esos créditos
    const porCobrarHoy = misCreditosActivos.reduce((s, cr) => {
        // Forzamos que sea número para evitar errores de suma
        return s + (Number(cr.cuotaDiaria) || 0);
    }, 0);

    // 3. Lo que realmente se ha cobrado hoy
    const cuadreHoy = getCuadreDelDia(state.currentUser.id, hoy);
    
    const metaAlcanzada = cuadreHoy.total >= porCobrarHoy && porCobrarHoy > 0;

    // --- VISTA ADMINISTRADOR (Se mantiene similar pero con corrección de tipos) ---
    if (isAdmin) {
        const totalObjetivoGlobal = creditos
            .filter(cr => cr.activo === true)
            .reduce((s, cr) => s + (Number(cr.cuotaDiaria) || 0), 0);
        
        // ... (resto del código de admin que ya tienes)
    }

    // --- VISTA COBRADOR ---
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
                    : `Faltan ${formatMoney(porCobrarHoy - cuadreHoy.total)} para alcanzar la meta`}
            </div>
        </div>

        <div class="payment-split" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:15px">
            <div style="background:white; padding:8px; border-radius:10px; text-align:center; border:1px solid #e2e8f0">
                <div style="font-size:10px; color:var(--muted)">📱 YAPE</div>
                <div style="font-weight:700; font-size:13px">${formatMoney(cuadreHoy.yape)}</div>
            </div>
            <div style="background:white; padding:8px; border-radius:10px; text-align:center; border:1px solid #e2e8f0">
                <div style="font-size:10px; color:var(--muted)">💵 EFECT.</div>
                <div style="font-weight:700; font-size:13px">${formatMoney(cuadreHoy.efectivo)}</div>
            </div>
            <div style="background:white; padding:8px; border-radius:10px; text-align:center; border:1px solid #e2e8f0">
                <div style="font-size:10px; color:var(--muted)">🏦 TRANS.</div>
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
                        <div style="font-size:11px; color:#64748b">${p.tipo.toUpperCase()} • ${formatDate(p.fecha)}</div>
                    </div>
                    <div style="font-weight:800; color:#059669">${formatMoney(p.monto)}</div>
                </div>`;
            }).join('')}
        </div>
        
        <div class="card" style="margin-top:12px; padding:12px">
            <div style="font-weight:700; font-size:12px; margin-bottom:6px">OBSERVACIONES</div>
            <textarea id="notaHoy" class="form-control" style="height:50px; font-size:13px">${cuadreHoy.nota}</textarea>
            <button class="btn btn-primary" style="width:100%; margin-top:8px; font-size:13px" onclick="guardarNota()">Guardar Nota</button>
        </div>
    </div>`;
}