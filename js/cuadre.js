function getCuadreDelDia(cobradorId, fecha) {
  const pagos = DB._cache['pagos'] || [];
  const pagosDia = pagos.filter(p => p.cobradorId === cobradorId && p.fecha === fecha);
  const yape = pagosDia.filter(p => p.tipo === 'yape').reduce((s, p) => s + p.monto, 0);
  const efectivo = pagosDia.filter(p => p.tipo === 'efectivo').reduce((s, p) => s + p.monto, 0);
  const transferencia = pagosDia.filter(p => p.tipo === 'transferencia').reduce((s, p) => s + p.monto, 0);
  const notas = DB._cache['notas_cuadre'] || [];
  const notaObj = notas.find(n => n.cobradorId === cobradorId && n.fecha === fecha);
  return { yape, efectivo, transferencia, total: yape + efectivo + transferencia, nota: notaObj ? notaObj.nota : '', pagos: pagosDia };
}

function renderCuadre() {
  const isAdmin = state.currentUser.role === 'admin';
  const hoy = today();
  const users = DB._cache['users'] || [];

  if (isAdmin) {
    const cobradores = users.filter(u => u.role === 'cobrador');
    let totalGeneral = 0;
    const filas = cobradores.map(u => { const c = getCuadreDelDia(u.id, hoy); totalGeneral += c.total; return { u, c }; });
    const pagos = DB._cache['pagos'] || [];
    const dias = [...new Set(pagos.map(p => p.fecha))].sort((a, b) => b.localeCompare(a)).slice(0, 10);

    return `
    <div>
      <div class="topbar"><h2>Cuadre Diario</h2><div class="topbar-user"><strong>${state.currentUser.nombre}</strong><span>Admin</span></div></div>
      <div class="page">
        <div class="cuadre-total">
          <div style="font-size:13px;opacity:0.85">Total cobrado hoy · ${formatDate(hoy)}</div>
          <div class="amount">${formatMoney(totalGeneral)}</div>
          <div style="font-size:13px;opacity:0.75;margin-top:4px">Todos los cobradores</div>
        </div>
        ${filas.map(({ u, c }) => `
          <div class="card" style="padding:14px">
            <div class="flex-between mb-2">
              <div style="font-weight:700">${u.nombre}</div>
              <div class="fw-bold text-success">${formatMoney(c.total)}</div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
              <div style="background:var(--bg);border-radius:8px;padding:8px"><div style="font-size:18px">📱</div><div style="font-size:11px;color:var(--muted)">Yape</div><div style="font-weight:700;font-size:13px">${formatMoney(c.yape)}</div></div>
              <div style="background:var(--bg);border-radius:8px;padding:8px"><div style="font-size:18px">💵</div><div style="font-size:11px;color:var(--muted)">Efectivo</div><div style="font-weight:700;font-size:13px">${formatMoney(c.efectivo)}</div></div>
              <div style="background:var(--bg);border-radius:8px;padding:8px"><div style="font-size:18px">🏦</div><div style="font-size:11px;color:var(--muted)">Transfer.</div><div style="font-weight:700;font-size:13px">${formatMoney(c.transferencia)}</div></div>
            </div>
            ${c.nota ? `<div class="text-muted mt-2" style="font-size:12px">📝 ${c.nota}</div>` : ''}
          </div>`).join('')}
        <div class="card-title" style="margin-top:8px">Historial por fecha</div>
        ${dias.length === 0 ? `<div class="empty-state"><div class="icon">📊</div><p>Sin registros aún</p></div>` :
          dias.map(fecha => {
            let totalDia = 0;
            const detalle = cobradores.map(u => { const c = getCuadreDelDia(u.id, fecha); totalDia += c.total; return { u, c }; }).filter(x => x.c.total > 0);
            return `
            <div class="card" style="padding:14px">
              <div class="flex-between mb-2">
                <div class="fw-bold">${formatDate(fecha)}</div>
                <div class="fw-bold text-success">${formatMoney(totalDia)}</div>
              </div>
              ${detalle.map(({ u, c }) => `
                <div class="flex-between" style="font-size:13px;padding:4px 0;border-top:1px solid var(--border)">
                  <span class="text-muted">${u.nombre}</span>
                  <span class="fw-bold">${formatMoney(c.total)}</span>
                </div>`).join('')}
            </div>`;
          }).join('')}
      </div>
    </div>`;
  }

  const cuadreHoy = getCuadreDelDia(state.currentUser.id, hoy);
  const pagos = DB._cache['pagos'] || [];
  const diasCobrador = [...new Set(pagos.filter(p => p.cobradorId === state.currentUser.id).map(p => p.fecha))].sort((a, b) => b.localeCompare(a));

  return `
  <div>
    <div class="topbar"><h2>Mi Cuadre</h2><div class="topbar-user"><strong>${state.currentUser.nombre}</strong></div></div>
    <div class="page">
      ${cuadreHoy.total > 0 ? `
        <div class="cuadre-total">
          <div style="font-size:13px;opacity:0.85">Total cobrado hoy · ${formatDate(hoy)}</div>
          <div class="amount">${formatMoney(cuadreHoy.total)}</div>
        </div>
        <div class="payment-split">
          <div class="payment-item"><div class="payment-icon">📱</div><div class="payment-label">Yape</div><div class="payment-amount">${formatMoney(cuadreHoy.yape)}</div></div>
          <div class="payment-item"><div class="payment-icon">💵</div><div class="payment-label">Efectivo</div><div class="payment-amount">${formatMoney(cuadreHoy.efectivo)}</div></div>
          <div class="payment-item"><div class="payment-icon">🏦</div><div class="payment-label">Transfer.</div><div class="payment-amount">${formatMoney(cuadreHoy.transferencia)}</div></div>
        </div>
        <div class="card">
          <div class="card-title">Pagos de hoy (${cuadreHoy.pagos.length})</div>
          ${cuadreHoy.pagos.map(p => {
            const cl = (DB._cache['clientes'] || []).find(c => c.id === p.clienteId);
            return `
            <div class="cuota-item">
              <div><div style="font-weight:600;font-size:14px">${cl ? cl.nombre : '—'}</div><div style="font-size:12px;color:var(--muted)">${p.tipo}</div></div>
              <div style="font-weight:700;color:var(--success)">${formatMoney(p.monto)}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="nota-box">
          <div class="card-title">📝 Nota del día</div>
          <textarea class="form-control" id="notaHoy" placeholder="Agrega una observación..." style="resize:none;height:80px">${cuadreHoy.nota}</textarea>
          <button class="btn btn-primary" style="margin-top:10px" onclick="guardarNota()">Guardar nota</button>
        </div>
      ` : `
        <div class="card" style="text-align:center;padding:32px 20px">
          <div style="font-size:48px;margin-bottom:12px">📋</div>
          <p style="color:var(--muted);font-size:15px">Aún no hay cobros registrados hoy</p>
          <p style="color:var(--muted);font-size:13px;margin-top:8px">Cuando registres un pago aparecerá aquí automáticamente</p>
        </div>
      `}
      <div class="card-title" style="margin-top:8px">Historial</div>
      ${diasCobrador.length === 0 ? `<div class="empty-state"><div class="icon">📊</div><p>Sin registros aún</p></div>` :
        diasCobrador.map(fecha => {
          const c = getCuadreDelDia(state.currentUser.id, fecha);
          return `
          <div class="card" style="padding:14px">
            <div class="flex-between">
              <div class="fw-bold">${formatDate(fecha)}</div>
              <div class="fw-bold text-success">${formatMoney(c.total)}</div>
            </div>
            <div class="text-muted" style="font-size:12px;margin-top:4px">📱 ${formatMoney(c.yape)} · 💵 ${formatMoney(c.efectivo)} · 🏦 ${formatMoney(c.transferencia)}</div>
            ${c.nota ? `<div class="text-muted" style="font-size:12px;margin-top:4px">📝 ${c.nota}</div>` : ''}
          </div>`;
        }).join('')}
    </div>
  </div>`;
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