function renderCreditoCard(cr) {
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  const pagadoReal = saldo <= 0;
  const mora = calcularMora(cr);
  // LOG temporal para debug de mora
  if (cr.mora_activa) {
    console.log('📊 renderCreditoCard - mora_activa=true | mora calculada:', mora,
      '| activo:', cr.activo, '| vencido:', estaVencido(cr.fechaInicio, cr.diasTotal),
      '| saldo:', saldo);
  }
  const totalConMora = saldo + mora;
  const progreso = Math.min(100, Math.round((totalPagado / cr.total) * 100));
  const isAdmin = state.currentUser.role === 'admin';
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);

  return `
  <div class="credito-card">
    <div class="credito-header">
      <div style="flex:1">
        <div class="credito-monto">${formatMoney(cr.monto)} prestado</div>
        <div class="text-muted" style="font-size:12px">Total: ${formatMoney(cr.total)} · Cuota: ${formatMoney(cr.cuotaDiaria)}/día</div>
        ${renderFechasCredito(cr)}
      </div>
      <span class="tag ${!pagadoReal ? 'tag-blue' : 'tag-green'}">
        ${!pagadoReal ? 'Debe ' + formatMoney(saldo) : '✓ Pagado'}
      </span>
    </div>

    <div class="flex-between" style="font-size:14px;margin-bottom:6px">
      <span class="text-muted">Pagado: <strong class="text-success">${formatMoney(totalPagado)}</strong></span>
      <span class="text-muted">Saldo: <strong class="${saldo > 0 ? 'text-danger' : 'text-success'}">${formatMoney(saldo)}</strong></span>
    </div>

    ${mora > 0 ? isAdmin ? `
    <!-- ADMIN: ver detalle completo de mora -->
    <div style="background:#fff5f5;border-radius:8px;padding:10px;margin:8px 0;border-left:3px solid var(--danger)">
      <div class="flex-between">
        <span style="font-size:13px;color:var(--danger);font-weight:600">⚠️ Mora acumulada</span>
        <span style="font-weight:800;color:var(--danger)">${formatMoney(mora)}</span>
      </div>
      <div class="flex-between mt-2">
        <span style="font-size:14px;font-weight:700">Total con mora</span>
        <span style="font-weight:800;font-size:16px;color:var(--danger)">${formatMoney(totalConMora)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">S/ 5.00 por día de atraso</div>
    </div>` : `
    <!-- COBRADOR: ver total a cobrar de forma simple -->
    <div style="background:#fff5f5;border-radius:10px;padding:12px;margin:8px 0;border-left:3px solid var(--danger)">
      <div class="flex-between">
        <span style="font-size:13px;color:var(--danger);font-weight:700">💰 Total a cobrar hoy</span>
        <span style="font-weight:800;font-size:17px;color:var(--danger)">${formatMoney(totalConMora)}</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Incluye saldo + mora por atraso</div>
    </div>` : ''}

    <div class="progress-bar"><div class="progress-fill" style="width:${progreso}%"></div></div>
    <div style="font-size:12px;color:var(--muted);text-align:center;margin-bottom:10px">
      ${progreso}% pagado · ${pagos.length} de ${cr.diasTotal} cuotas
    </div>

    ${cr.activo ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-success btn-sm" onclick="openRegistrarPago('${cr.id}')">💰 Registrar pago</button>
      ${isAdmin ? `
        <button class="btn btn-outline btn-sm" onclick="cerrarCredito('${cr.id}')">✓ Cerrar</button>
        <button class="btn btn-sm" style="background:${cr.mora_activa ? '#fff5f5' : '#f0fff4'};color:${cr.mora_activa ? 'var(--danger)' : 'var(--success)'};border:2px solid ${cr.mora_activa ? '#fed7d7' : '#c6f6d5'}" onclick="toggleMora('${cr.id}',${cr.mora_activa ? 'false' : 'true'})">
          ${cr.mora_activa ? '🔕 Desactivar mora' : '🔔 Activar mora'}
        </button>` : vencido ? `
        <span style="font-size:12px;color:var(--danger);font-weight:600;align-self:center">
          ⚠️ Coordina con el administrador
        </span>` : ''}
    </div>` : `
    <div style="background:#f0fff4;border-radius:8px;padding:8px 12px;font-size:13px;color:#276749;font-weight:600;text-align:center">
      ✅ Crédito cerrado
    </div>`}

    ${renderEsquemaCuotas(cr)}

    ${pagos.length > 0 ? `
    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase">Últimos pagos</div>
      ${pagos.slice(-5).reverse().map(p => `
        <div class="cuota-item">
          <div>
            <div style="font-weight:600;font-size:14px">${formatDate(p.fecha)}</div>
            <div style="font-size:12px;color:var(--muted)">${p.tipo}${p.aplicadoMora ? ' · mora incluida' : ''}</div>
          </div>
          <div style="font-weight:700;font-size:15px;color:var(--success)">${formatMoney(p.monto)}</div>
        </div>`).join('')}
    </div>` : ''}
  </div>`;
}

function renderFechasCredito(cr) {
  const fechaFin = calcularFechaFin(cr.fechaInicio, cr.diasTotal);
  const vencido = cr.activo && estaVencido(cr.fechaInicio, cr.diasTotal);
  return `
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
    <div class="text-muted" style="font-size:12px">📅 Inicio: ${formatDate(cr.fechaInicio)}</div>
    <div style="font-size:12px;font-weight:600;${vencido ? 'color:var(--danger)' : 'color:var(--muted)'}">
      ${vencido ? '🔴' : '🟢'} Fin: ${fechaFin}
      ${vencido ? '<span style="background:#fff5f5;color:var(--danger);padding:2px 8px;border-radius:20px;font-size:11px;margin-left:4px">VENCIDO</span>' : ''}
    </div>
  </div>`;
}

function calcularCredito() {
  const monto = parseFloat(document.getElementById('crMonto').value) || 0;
  if (monto <= 0) { document.getElementById('crPreview').style.display = 'none'; return; }
  const interes = monto * 0.2;
  const total = monto + interes;
  const cuota = total / 24;
  document.getElementById('crPreview').style.display = 'block';
  document.getElementById('crInteres').textContent = formatMoney(interes);
  document.getElementById('crTotal').textContent = formatMoney(total);
  document.getElementById('crCuota').textContent = formatMoney(cuota);
}

async function guardarCredito() {
  const creditosExistentes = (DB._cache['creditos'] || [])
    .filter(c => c.clienteId === state.selectedClient.id && c.activo);
  if (creditosExistentes.length > 0) {
    alert('Este cliente ya tiene un crédito activo. Ciérralo antes de crear uno nuevo.');
    return;
  }
  const monto = parseFloat(document.getElementById('crMonto').value) || 0;
  if (monto <= 0) { alert('Ingresa el monto'); return; }
  const fechaInicio = document.getElementById('crFecha').value;
  if (!fechaInicio) { alert('Selecciona la fecha de inicio'); return; }
  const total = monto * 1.2;
  const cuotaDiaria = total / 24;
  const id = genId();
  await DB.set('creditos', id, {
    id, clienteId: state.selectedClient.id,
    monto, total, cuotaDiaria, diasTotal: 24,
    fechaInicio, activo: true
  });
  state.modal = null;
  showToast(`Crédito de ${formatMoney(monto)} creado`);
}

async function cerrarCredito(crId) {
  const cr = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (!cr) return;
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === crId);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  if (saldo > 0) {
    if (!confirm(`¡CUIDADO! Aún debe ${formatMoney(saldo)}. ¿Cerrar de todos modos?`)) return;
  } else {
    if (!confirm('¿Marcar este crédito como pagado totalmente y cerrarlo?')) return;
  }
  await DB.update('creditos', crId, { activo: false });
  const idx = (DB._cache['creditos'] || []).findIndex(c => c.id === crId);
  if (idx !== -1) DB._cache['creditos'][idx].activo = false;
  showToast('Crédito cerrado');
  render();
}

async function extenderCredito() {
  const dias = parseInt(document.getElementById('extDias').value) || 0;
  if (dias <= 0) { alert('Ingresa los días a extender'); return; }
  const cr = state.selectedCredito;
  const nuevoDias = cr.diasTotal + dias;
  await DB.update('creditos', cr.id, { diasTotal: nuevoDias });
  state.selectedCredito = { ...cr, diasTotal: nuevoDias };
  showToast(`Plazo extendido ${dias} días más`);
  render();
}

async function guardarCompromiso() {
  const fecha = document.getElementById('fechaCompromiso').value;
  if (!fecha) { alert('Selecciona una fecha'); return; }
  await DB.update('creditos', state.selectedCredito.id, { fechaCompromiso: fecha });
  state.selectedCredito = { ...state.selectedCredito, fechaCompromiso: fecha };
  showToast(`Compromiso registrado para el ${formatDate(fecha)}`);
  render();
}

async function guardarNotaCredito() {
  const nota = document.getElementById('notaCredito').value.trim();
  await DB.update('creditos', state.selectedCredito.id, { nota });
  state.selectedCredito = { ...state.selectedCredito, nota };
  showToast('Nota guardada');
  render();
}

async function toggleMora(crId, activar) {
  console.group('🔔 toggleMora');
  console.log('crId:', crId, '| activar:', activar);

  // 1. Buscar crédito en caché antes de actualizar
  const creditosCache = DB._cache['creditos'] || [];
  const crAntes = creditosCache.find(c => c.id === crId);
  console.log('Crédito antes:', crAntes ? JSON.stringify(crAntes) : 'NO ENCONTRADO');

  // 2. Verificar si está vencido (requisito para que calcularMora funcione)
  if (crAntes) {
    const vencido = estaVencido(crAntes.fechaInicio, crAntes.diasTotal);
    console.log('¿Está vencido?', vencido, '| fechaInicio:', crAntes.fechaInicio, '| diasTotal:', crAntes.diasTotal);
    const moraCalculada = calcularMora({ ...crAntes, mora_activa: activar });
    console.log('Mora que calcularMora devolvería con mora_activa=' + activar + ':', moraCalculada);
  }

  // 3. Actualizar en Firestore
  try {
    await DB.update('creditos', crId, { mora_activa: activar });
    console.log('✅ Firestore actualizado correctamente');
  } catch (e) {
    console.error('❌ Error al actualizar Firestore:', e);
  }

  // 4. Actualizar caché local
  const idx = creditosCache.findIndex(c => c.id === crId);
  if (idx >= 0) {
    creditosCache[idx].mora_activa = activar;
    console.log('✅ Caché actualizado. mora_activa ahora:', creditosCache[idx].mora_activa);
  } else {
    console.warn('⚠️ No se encontró el crédito en caché para actualizar');
  }

  // 5. Verificar mora después del cambio
  const crDespues = (DB._cache['creditos'] || []).find(c => c.id === crId);
  if (crDespues) {
    const moraFinal = calcularMora(crDespues);
    console.log('Mora después de activar/desactivar:', moraFinal);
    console.log('Crédito después:', JSON.stringify(crDespues));
  }

  console.groupEnd();
  showToast(activar ? '🔔 Mora activada — S/5 por día' : '🔕 Mora desactivada');
  render();
}