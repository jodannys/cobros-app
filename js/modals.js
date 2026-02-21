function renderModal() {
  const m = state.modal;
  let content = '';
  if (m === 'nuevo-cliente') content = renderModalNuevoCliente();
  else if (m === 'editar-cliente') content = renderModalEditarCliente();
  else if (m === 'nuevo-credito') content = renderModalNuevoCredito();
  else if (m === 'registrar-pago') content = renderModalRegistrarPago();
  else if (m === 'nuevo-usuario') content = renderModalNuevoUsuario();
  else if (m === 'gestionar-credito') content = renderModalGestionarCredito();
  else if (m === 'banner-alertas') content = renderModalBannerAlertas();
  return `<div class="modal-overlay" onclick="closeModal(event)"><div class="modal" onclick="event.stopPropagation()">${content}</div></div>`;
}

function renderModalNuevoCliente() {
  const cobradores = DB.get('users').filter(u => u.role === 'cobrador');
  const isAdmin = state.currentUser.role === 'admin';
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">👤 Nuevo Cliente</div>
  <div class="form-group"><label>DNI *</label><input class="form-control" id="nDNI" placeholder="12345678" maxlength="8"></div>
  <div class="form-group"><label>Nombre completo *</label><input class="form-control" id="nNombre" placeholder="Juan Pérez"></div>
  <div class="form-group"><label>Teléfono</label><input class="form-control" id="nTelefono" placeholder="987654321" type="tel"></div>
  <div class="form-group"><label>Dirección</label><input class="form-control" id="nDireccion" placeholder="Av. Lima 123"></div>
  <div class="form-group"><label>Link Google Maps</label><input class="form-control" id="nUbicacion" placeholder="https://maps.google.com/..."></div>
  ${isAdmin ? `<div class="form-group"><label>Cobrador asignado</label><select class="form-control" id="nCobrador">${cobradores.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('')}</select></div>` : ''}
  <div class="form-group">
    <label>Foto de casa/negocio</label>
    <label class="upload-btn" for="nFoto">📷 Tomar o subir foto</label>
    <input type="file" id="nFoto" accept="image/*" capture="environment" onchange="previewFoto(this,'previewNFoto')">
    <img id="previewNFoto" style="display:none" class="uploaded-img">
  </div>
  <button class="btn btn-primary" onclick="guardarCliente()">Guardar Cliente</button>`;
}

function renderModalEditarCliente() {
  const c = state.selectedClient;
  const cobradores = DB.get('users').filter(u => u.role === 'cobrador');
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">✏️ Editar Cliente</div>
  <div class="form-group"><label>DNI</label><input class="form-control" id="eDNI" value="${c.dni}"></div>
  <div class="form-group"><label>Nombre completo</label><input class="form-control" id="eNombre" value="${c.nombre}"></div>
  <div class="form-group"><label>Teléfono</label><input class="form-control" id="eTelefono" value="${c.telefono || ''}"></div>
  <div class="form-group"><label>Dirección</label><input class="form-control" id="eDireccion" value="${c.direccion || ''}"></div>
  <div class="form-group"><label>Link Google Maps</label><input class="form-control" id="eUbicacion" value="${c.ubicacion || ''}"></div>
  <div class="form-group"><label>Cobrador asignado</label>
    <select class="form-control" id="eCobrador">${cobradores.map(u => `<option value="${u.id}" ${u.id === c.cobradorId ? 'selected' : ''}>${u.nombre}</option>`).join('')}</select>
  </div>
  <div class="form-group">
    <label>Foto</label>
    <label class="upload-btn" for="eFoto">📷 Cambiar foto</label>
    <input type="file" id="eFoto" accept="image/*" capture="environment" onchange="previewFoto(this,'previewEFoto')">
    ${c.foto ? `<img src="${c.foto}" class="uploaded-img" id="previewEFoto">` : `<img id="previewEFoto" style="display:none" class="uploaded-img">`}
  </div>
  <button class="btn btn-primary" onclick="actualizarCliente()">Actualizar</button>
   ${state.currentUser.role === 'admin' ? `<button class="btn btn-danger" style="margin-top:8px" onclick="eliminarCliente()">🗑️ Eliminar cliente</button>` : ''}
  `;
}
function renderModalNuevoCredito() {
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💳 Nuevo Crédito</div>
  <div class="form-group"><label>Monto a prestar (S/) *</label><input class="form-control" id="crMonto" type="number" placeholder="1000" oninput="calcularCredito()"></div>
  <div id="crPreview" style="display:none;background:var(--bg);border-radius:12px;padding:14px;margin-bottom:12px">
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Interés (20%)</div><div class="info-value" id="crInteres">—</div></div>
      <div class="info-item"><div class="info-label">Total a pagar</div><div class="info-value" id="crTotal">—</div></div>
      <div class="info-item"><div class="info-label">Cuota diaria</div><div class="info-value" id="crCuota">—</div></div>
      <div class="info-item"><div class="info-label">Plazo</div><div class="info-value">24 días</div></div>
    </div>
  </div>
  <div class="form-group"><label>Fecha de inicio</label><input class="form-control" id="crFecha" type="date" value="${today()}"></div>
  <button class="btn btn-primary" onclick="guardarCredito()">Crear Crédito</button>`;
}

function renderModalRegistrarPago() {
  const cr = state.selectedCredito;
  if (!cr) return '';
  const pagos = DB.get('pagos').filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💰 Registrar Pago</div>
  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    <div class="flex-between"><span class="text-muted">Cuota diaria:</span><span class="fw-bold">${formatMoney(cr.cuotaDiaria)}</span></div>
    <div class="flex-between mt-2"><span class="text-muted">Saldo pendiente:</span><span class="fw-bold text-danger">${formatMoney(saldo)}</span></div>
  </div>
  <div class="form-group"><label>Monto recibido (S/)</label><input class="form-control" id="pMonto" type="number" value="${cr.cuotaDiaria}"></div>
  <div class="form-group"><label>Forma de pago</label>
    <select class="form-control" id="pTipo">
      <option value="efectivo">💵 Efectivo</option>
      <option value="yape">📱 Yape</option>
      <option value="transferencia">🏦 Transferencia</option>
    </select>
  </div>
  <div class="form-group"><label>Fecha</label><input class="form-control" id="pFecha" type="date" value="${today()}"></div>
  <div class="form-group"><label>Nota (opcional)</label><input class="form-control" id="pNota" placeholder="Observaciones..."></div>
  <button class="btn btn-success" onclick="guardarPago()">✓ Confirmar Pago</button>`;
}

function renderModalNuevoUsuario() {
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">👤 Nuevo Usuario</div>
  <div class="form-group"><label>Nombre completo *</label><input class="form-control" id="uNombre" placeholder="Juan Pérez"></div>
  <div class="form-group"><label>Usuario *</label><input class="form-control" id="uUser" placeholder="juanperez" autocomplete="off"></div>
  <div class="form-group"><label>Contraseña *</label><input class="form-control" id="uPass" type="password" placeholder="••••••••" autocomplete="new-password"></div>
  <div class="form-group"><label>Rol</label>
    <select class="form-control" id="uRol"><option value="cobrador">Cobrador</option><option value="admin">Administrador</option></select>
  </div>
  <button class="btn btn-primary" onclick="guardarUsuario()">Crear Usuario</button>`;
}

function renderModalGestionarCredito() {
  const cr = state.selectedCredito;
  const c = state.selectedClient;
  if (!cr || !c) return '';
  const pagos = DB.get('pagos').filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  const dias = diasSinPagar(cr.id);
  const vencido = estaVencido(cr.fechaInicio, cr.diasTotal);

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">⚙️ Gestionar Crédito</div>

  <!-- INFO CLIENTE -->
  <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:16px">
    <div style="font-weight:700;font-size:16px">${c.nombre}</div>
    <div style="font-size:13px;color:var(--muted);margin-top:4px">DNI: ${c.dni}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <span style="background:${vencido ? '#fff5f5' : '#fffbeb'};color:${vencido ? 'var(--danger)' : '#b7791f'};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">
        ${vencido ? '🔴 Crédito vencido' : `⚠️ ${dias} días sin pagar`}
      </span>
      <span style="background:#fff5f5;color:var(--danger);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">
        Saldo: ${formatMoney(saldo)}
      </span>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-top:8px">
      Inicio: ${formatDate(cr.fechaInicio)} · Fin original: ${calcularFechaFin(cr.fechaInicio, cr.diasTotal)}
    </div>
  </div>

  <!-- EXTENDER PLAZO -->
  <div style="border:2px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:10px">📅 Extender plazo</div>
    <div class="form-group" style="margin-bottom:8px">
      <label>Días adicionales</label>
      <input class="form-control" id="extDias" type="number" placeholder="Ej: 5" min="1">
    </div>
    <button class="btn btn-primary btn-sm" style="width:100%" onclick="extenderCredito()">Extender plazo</button>
  </div>

  <!-- FECHA DE COMPROMISO -->
  <div style="border:2px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:10px">🤝 Fecha de compromiso</div>
    <div class="form-group" style="margin-bottom:8px">
      <label>El cliente pagará el</label>
      <input class="form-control" id="fechaCompromiso" type="date" value="${cr.fechaCompromiso || ''}">
    </div>
    <button class="btn btn-primary btn-sm" style="width:100%" onclick="guardarCompromiso()">Guardar compromiso</button>
    ${cr.fechaCompromiso ? `<div style="margin-top:8px;font-size:13px;color:var(--success);font-weight:600">✓ Compromiso actual: ${formatDate(cr.fechaCompromiso)}</div>` : ''}
  </div>

  <!-- NOTA -->
  <div style="border:2px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:10px">📝 Nota del crédito</div>
    <textarea class="form-control" id="notaCredito" placeholder="Observaciones sobre este crédito..." style="resize:none;height:80px">${cr.nota || ''}</textarea>
    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:8px" onclick="guardarNotaCredito()">Guardar nota</button>
  </div>`;

}
function renderModalBannerAlertas() {
  const alertas = getAlertasCreditos();
  return `
  <div class="modal-handle"></div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
    <span style="font-size:32px">🚨</span>
    <div>
      <div style="font-size:20px;font-weight:800;color:var(--danger)">¡Atención!</div>
      <div style="font-size:14px;color:var(--muted)">${alertas.length} crédito${alertas.length > 1 ? 's' : ''} requiere${alertas.length > 1 ? 'n' : ''} atención</div>
    </div>
  </div>
  ${alertas.map(a => `
    <div style="background:var(--bg);border-radius:10px;padding:12px;margin-bottom:8px;border-left:4px solid ${a.tipo === 'vencido' ? 'var(--danger)' : 'var(--warning)'}">
      <div style="font-weight:700">${a.cliente?.nombre || '—'}</div>
      <div style="font-size:12px;color:var(--muted)">Cobrador: ${a.cobrador?.nombre || '—'}</div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
        <span style="background:${a.tipo === 'vencido' ? '#fff5f5' : '#fffbeb'};color:${a.tipo === 'vencido' ? 'var(--danger)' : '#b7791f'};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">
          ${a.tipo === 'vencido' ? '🔴 VENCIDO' : `⚠️ ${a.dias} días sin pagar`}
        </span>
        <span style="background:#fff5f5;color:var(--danger);padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">
          Saldo: ${formatMoney(a.saldo)}
        </span>
      </div>
    </div>`).join('')}
  <button class="btn btn-primary" style="margin-top:8px" onclick="closeModal(event);navigate('admin')">Ver en Admin</button>
  <button class="btn btn-outline" style="margin-top:8px" onclick="closeModal(event)">Cerrar</button>`;
}
function openModal(m) { state.modal = m; render(); }
function closeModal(e) { state.modal = null; state.selectedCredito = null; render(); }
