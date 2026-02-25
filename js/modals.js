// ============================================================
// FUNCIÓN DE COMPRESIÓN DE IMAGEN ✅ NUEVA
// ============================================================
function comprimirImagen(base64, maxWidth = 600, calidad = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const escala = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * escala;
      canvas.height = img.height * escala;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => {
      console.warn('⚠️ No se pudo comprimir la imagen, usando original');
      resolve(base64);
    };
  });
}

// ============================================================
// RENDER MODAL PRINCIPAL
// ============================================================
function renderModal() {
  const m = state.modal;
  let content = '';
  if (m === 'nuevo-cliente') content = renderModalNuevoCliente();
  else if (m === 'editar-cliente') content = renderModalEditarCliente();
  else if (m === 'editar-monto-gasto') content = renderModalEditarMontoGasto();
  else if (m === 'editar-pago') content = renderModalEditarPago();
  else if (m === 'nuevo-credito') content = renderModalNuevoCredito();
  else if (m === 'registrar-pago') content = renderModalRegistrarPago();
  else if (m === 'nuevo-usuario') content = renderModalNuevoUsuario();
  else if (m === 'gestionar-credito') content = renderModalGestionarCredito();
  else if (m === 'banner-alertas') content = renderModalBannerAlertas();
  else if (m === 'editar-usuario') content = renderModalEditarUsuario();
  else if (m === 'editar-admin') content = renderModalEditarAdmin();
  else if (m === 'nuevo-gasto') content = renderModalNuevoGasto();
  else if (m === 'asignar-caja') content = renderModalAsignarCaja();
  else if (m === 'editar-credito') content = renderModalEditarCredito();
  else if (m === 'historial-cliente') content = renderModalHistorialCliente();

  return `
  <div class="modal-overlay" onclick="closeModal(event)">
    <div class="modal" onclick="event.stopPropagation()">
      <button onclick="closeModal(event)"
        style="position:absolute;top:12px;right:14px;border:none;background:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1;padding:0">×</button>
      ${content}
    </div>
  </div>`;
}

// ============================================================
// MODAL NUEVO CLIENTE
// ============================================================
function renderModalNuevoCliente() {
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const isAdmin = state.currentUser.role === 'admin';
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">👤 Nuevo Cliente</div>
  <div class="form-group"><label>DNI *</label><input class="form-control" id="nDNI" placeholder="" maxlength="8"></div>
  <div class="form-group"><label>Nombre completo *</label><input class="form-control" id="nNombre" placeholder="ej. Juan Pérez"></div>
  <div class="form-group"><label>Nombre del negocio</label><input class="form-control" id="nNegocio" placeholder=" ej. Bodega El Sol, Ferretería..."></div>
  <div class="form-group"><label>Teléfono</label><input class="form-control" id="nTelefono" placeholder="" type="tel"></div>
  <div class="form-group"><label>Dirección</label><input class="form-control" id="nDireccion" placeholder="ej. Av. Lima 123"></div>
  ${renderMapaSelector(null, null)}
  ${isAdmin ? `<div class="form-group"><label>Cobrador asignado</label><select class="form-control" id="nCobrador">${cobradores.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('')}</select></div>` : ''}
  <div class="form-group">
    <label>Foto de casa/negocio</label>
    <label class="upload-btn" for="nFoto">📷 Tomar o subir foto</label>
    <input type="file" id="nFoto" accept="image/*" onchange="previewFoto(this,'previewNFoto')">
    <img id="previewNFoto" style="display:none" class="uploaded-img">
  </div>
  <button class="btn btn-primary" onclick="guardarCliente()">Guardar Cliente</button>`;
  setTimeout(() => iniciarMapaSelector(null, null), 200);
}

// ============================================================
// MODAL EDITAR CLIENTE
// ============================================================
function renderModalEditarCliente() {
  const c = state.selectedClient;
  const cobradores = (DB._cache['users'] || []).filter(u => u.role === 'cobrador');
  const isAdmin = state.currentUser.role === 'admin';
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">✏️ Editar Cliente</div>
  <div class="form-group"><label>DNI</label><input class="form-control" id="eDNI" value="${c.dni}"></div>
  <div class="form-group"><label>Nombre completo</label><input class="form-control" id="eNombre" value="${c.nombre}"></div>
  <div class="form-group"><label>Nombre del negocio</label><input class="form-control" id="eNegocio" value="${c.negocio || ''}"></div>
  <div class="form-group"><label>Teléfono</label><input class="form-control" id="eTelefono" value="${c.telefono || ''}"></div>
  <div class="form-group"><label>Dirección</label><input class="form-control" id="eDireccion" value="${c.direccion || ''}"></div>
  ${renderMapaSelector(c.lat || null, c.lng || null)}
  ${isAdmin ? `
  <div class="form-group"><label>Cobrador asignado</label>
    <select class="form-control" id="eCobrador">
      ${cobradores.map(u => `<option value="${u.id}" ${u.id === c.cobradorId ? 'selected' : ''}>${u.nombre}</option>`).join('')}
    </select>
  </div>` : ''}
  <div class="form-group">
    <label>Foto</label>
    <label class="upload-btn" for="eFoto">📷 Cambiar foto</label>
    <input type="file" id="eFoto" accept="image/*" capture="environment" onchange="previewFoto(this,'previewEFoto')">
    ${c.foto ? `<img src="${c.foto}" class="uploaded-img" id="previewEFoto">` : `<img id="previewEFoto" style="display:none" class="uploaded-img">`}
  </div>
  <button class="btn btn-primary" onclick="actualizarCliente()">Actualizar</button>
  ${isAdmin ? `<button class="btn btn-danger" style="margin-top:8px" onclick="eliminarCliente()">🗑️ Eliminar cliente</button>` : ''}`;
}

// ============================================================
// MODAL NUEVO CRÉDITO
// ============================================================
function renderModalNuevoCredito() {
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">💳 Nuevo Crédito</div>
  <div class="form-group"><label>Monto a prestar (S/) *</label>
    <input class="form-control" id="crMonto" type="number" placeholder="1000" oninput="calcularCredito()">
  </div>
  <div id="crPreview" style="display:none;background:var(--bg);border-radius:12px;padding:14px;margin-bottom:12px">
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Interés (20%)</div><div class="info-value" id="crInteres">—</div></div>
      <div class="info-item"><div class="info-label">Total a pagar</div><div class="info-value" id="crTotal">—</div></div>
      <div class="info-item"><div class="info-label">Cuota diaria</div><div class="info-value" id="crCuota">—</div></div>
      <div class="info-item"><div class="info-label">Plazo</div><div class="info-value">24 días</div></div>
    </div>
  </div>
  <div class="form-group"><label>Fecha de inicio</label>
    <input class="form-control" id="crFecha" type="date" value="${today()}">
  </div>
  <button class="btn btn-primary" onclick="guardarCredito()">Crear Crédito</button>`;
}

// ============================================================
// MODAL NUEVO USUARIO
// ============================================================
function renderModalNuevoUsuario() {
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">👤 Nuevo Usuario</div>
  <div class="form-group"><label>Nombre completo *</label><input class="form-control" id="uNombre" placeholder=""></div>
  <div class="form-group"><label>Usuario *</label><input class="form-control" id="uUser" placeholder="" autocomplete="off"></div>
  <div class="form-group">
    <label>Contraseña *</label>
    <div style="position:relative">
      <input class="form-control" id="uPass" type="password" placeholder="••••••••" autocomplete="new-password" style="padding-right:40px">
      <button type="button" onclick="togglePass('uPass')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:18px;cursor:pointer">👁️</button>
    </div>
  </div>
  <div class="form-group"><label>Rol</label>
    <select class="form-control" id="uRol">
      <option value="cobrador">Cobrador</option>
      <option value="admin">Administrador</option>
    </select>
  </div>
  <button class="btn btn-primary" onclick="guardarUsuario()">Crear Usuario</button>`;
}

// ============================================================
// MODAL GESTIONAR CRÉDITO
// ============================================================
function renderModalGestionarCredito() {
  const cr = state.selectedCredito;
  const c = state.selectedClient;
  if (!cr || !c) return '';
  const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const saldo = cr.total - totalPagado;
  const dias = diasSinPagar(cr.id);
  const vencido = estaVencido(cr.fechaInicio, cr.diasTotal);
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">⚙️ Gestionar Crédito</div>
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
      Inicio: ${formatDate(cr.fechaInicio)} · Fin: ${calcularFechaFin(cr.fechaInicio, cr.diasTotal)}
    </div>
  </div>
  <div style="border:2px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:10px">📅 Extender plazo</div>
    <div class="form-group" style="margin-bottom:8px">
      <label>Días adicionales</label>
      <input class="form-control" id="extDias" type="number" placeholder="Ej: 5" min="1">
    </div>
    <button class="btn btn-primary btn-sm" style="width:100%" onclick="extenderCredito()">Extender plazo</button>
  </div>
  <div style="border:2px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:10px">🤝 Fecha de compromiso</div>
    <div class="form-group" style="margin-bottom:8px">
      <label>El cliente pagará el</label>
      <input class="form-control" id="fechaCompromiso" type="date" value="${cr.fechaCompromiso || ''}">
    </div>
    <button class="btn btn-primary btn-sm" style="width:100%" onclick="guardarCompromiso()">Guardar compromiso</button>
    ${cr.fechaCompromiso ? `<div style="margin-top:8px;font-size:13px;color:var(--success);font-weight:600">✓ Actual: ${formatDate(cr.fechaCompromiso)}</div>` : ''}
  </div>
  <div style="border:2px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-weight:700;margin-bottom:10px">📝 Nota del crédito</div>
    <textarea class="form-control" id="notaCredito" style="resize:none;height:80px"
      placeholder="Observaciones...">${cr.nota || ''}</textarea>
    <button class="btn btn-primary btn-sm" style="width:100%;margin-top:8px" onclick="guardarNotaCredito()">Guardar nota</button>
  </div>`;
}

// ============================================================
// MODAL BANNER ALERTAS
// ============================================================
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

// ============================================================
// MODAL EDITAR USUARIO
// ============================================================
function renderModalEditarUsuario() {
  const users = DB._cache['users'] || [];
  const u = users.find(x => x.id === state.selectedCobrador);
  if (!u) return '';
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">✏️ Editar Usuario</div>
  <div class="form-group"><label>Nombre completo</label><input class="form-control" id="euNombre" value="${u.nombre}"></div>
  <div class="form-group"><label>Usuario</label><input class="form-control" id="euUser" value="${u.user}"></div>
  <div class="form-group">
    <label>Nueva contraseña</label>
    <div style="position:relative">
      <input class="form-control" id="euPass" type="password" placeholder="Dejar vacío para no cambiar" style="padding-right:40px">
      <button type="button" onclick="togglePass('euPass')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:18px;cursor:pointer">👁️</button>
    </div>
  </div>
  <div class="form-group"><label>Rol</label>
    <select class="form-control" id="euRol">
      <option value="cobrador" ${u.role === 'cobrador' ? 'selected' : ''}>Cobrador</option>
      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
    </select>
  </div>
  <button class="btn btn-primary" onclick="actualizarUsuario()">Actualizar</button>
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #fee2e2">
    ${u.role !== 'admin' ? `
<button class="btn btn-danger" style="width:100%"
  onclick="eliminarCobrador('${u.id}')">
  🗑️ Eliminar cobrador
</button>` : ''}
  </div>`;
}
// ============================================================
// MODAL EDITAR / CREAR ADMIN
// ============================================================
function renderModalEditarAdmin() {
  const u = state._editingAdmin;
  const isNew = !u;
  return `
  <div class="modal-handle"></div>
  <div class="modal-title">${isNew ? '➕ Nuevo Administrador' : '🛡️ Editar Administrador'}</div>
  <div class="form-group">
    <label>Nombre completo *</label>
    <input class="form-control" id="adNombre" value="${u ? u.nombre : ''}" placeholder="Nombre del admin">
  </div>
  <div class="form-group">
    <label>Usuario *</label>
    <input class="form-control" id="adUser" value="${u ? u.user : ''}" placeholder="usuario" autocomplete="off">
  </div>
  <div class="form-group">
    <label>${isNew ? 'Contraseña *' : 'Nueva contraseña (dejar vacío para no cambiar)'}</label>
    <div style="position:relative">
      <input class="form-control" id="adPass" type="password"
        placeholder="${isNew ? '••••••••' : 'Dejar vacío para no cambiar'}" style="padding-right:40px">
      <button type="button" onclick="togglePass('adPass')"
        style="position:absolute;right:10px;top:50%;transform:translateY(-50%);border:none;background:none;font-size:18px;cursor:pointer">👁️</button>
    </div>
  </div>
  <button class="btn btn-primary" onclick="guardarAdmin(${isNew ? 'null' : `'${u.id}'`})">${isNew ? 'Crear Admin' : 'Actualizar'}</button>

  ${!isNew ? `
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #fee2e2">
    <button class="btn btn-danger" style="width:100%"
      onclick="eliminarAdmin('${u.id}')">
      🗑️ Eliminar administrador
    </button>
  </div>` : ''}`;
}
async function eliminarAdmin(id) {
  const users = DB._cache['users'] || [];
  const admins = users.filter(u => u.role === 'admin');

  if (admins.length <= 1) {
    alert('No puedes eliminar el único administrador del sistema.');
    return;
  }
  if (id === state.currentUser.id) {
    alert('No puedes eliminarte a ti mismo.');
    return;
  }
  if (!confirm('¿Eliminar este administrador? Esta acción no se puede deshacer.')) return;

  await DB.delete('users', id);
  state._editingAdmin = null;
  state.modal = null;
  showToast('Administrador eliminado');
  render();
}

// ============================================================
// GUARDAR ADMIN
// ============================================================
async function guardarAdmin(idExistente) {
  const nombre = document.getElementById('adNombre').value.trim();
  const user = document.getElementById('adUser').value.trim();
  const pass = document.getElementById('adPass').value.trim();

  if (!nombre || !user) { alert('Nombre y usuario son obligatorios'); return; }

  const users = DB._cache['users'] || [];

  if (!idExistente) {
    if (!pass) { alert('La contraseña es obligatoria para un nuevo admin'); return; }
    if (users.find(u => u.user === user)) { alert('Ese nombre de usuario ya existe'); return; }
    const id = genId();
    await DB.set('users', id, { id, nombre, user, pass, role: 'admin' });
    showToast('Administrador creado');
  } else {
    const existing = users.find(u => u.id === idExistente);
    if (!existing) return;
    if (users.find(u => u.user === user && u.id !== idExistente)) {
      alert('Ese nombre de usuario ya está en uso'); return;
    }
    const updates = { nombre, user };
    if (pass) updates.pass = pass;
    await DB.update('users', idExistente, updates);
    if (state.currentUser.id === idExistente) {
      state.currentUser = { ...state.currentUser, nombre, user, ...(pass ? { pass } : {}) };
    }
    showToast('Administrador actualizado');
  }

  state._editingAdmin = null;
  state.modal = null;
  render();
}

// ============================================================
// HELPERS DE MODAL
// ============================================================
function openModal(m) { state.modal = m; render(); }

function closeModal(e) {
  state.modal = null;
  state.selectedCredito = null;
  state._editingAdmin = null;
  render();
}

function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ============================================================
// PREVIEW DE FOTO
// ============================================================
function previewFoto(input, previewId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = document.getElementById(previewId);
    img.src = e.target.result;
    img.style.display = 'block';
    console.log('📌 Foto cargada en preview (se comprimirá al guardar)');
  };
  reader.onerror = function (err) {
    console.error('❌ Error leyendo la imagen:', err);
  };
  reader.readAsDataURL(file);
}

function renderModalHistorialCliente() {
  const { c, creditos, pagos, texto, cobrador } = state._historialCliente;
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);

  return `
  <div class="modal-handle"></div>
  <div class="modal-title">📋 ${c.nombre}</div>

  <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:14px;font-size:13px;color:var(--muted)">
    DNI: ${c.dni}${c.negocio ? ` · 🏪 ${c.negocio}` : ''}
    ${cobrador ? ` · ${cobrador.nombre}` : ''}
  </div>

  ${creditos.map(cr => {
    const pagosCr = pagos.filter(p => p.creditoId === cr.id);
    const pagadoCr = pagosCr.reduce((s, p) => s + p.monto, 0);
    const saldoCr = Math.max(0, cr.total - pagadoCr);
    return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px">
      <div class="flex-between" style="margin-bottom:8px">
        <div style="font-weight:700">💳 Crédito ${formatDate(cr.fechaInicio)}</div>
        <span style="background:${cr.activo ? '#eff6ff' : '#f0fff4'};color:${cr.activo ? 'var(--primary)' : '#276749'};
          padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">
          ${cr.activo ? 'Activo' : '✓ Cerrado'}
        </span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
        <div style="background:#f8fafc;border-radius:8px;padding:8px;font-size:12px">
          <div style="color:var(--muted)">Prestado</div>
          <div style="font-weight:800">${formatMoney(cr.monto)}</div>
        </div>
        <div style="background:#f8fafc;border-radius:8px;padding:8px;font-size:12px">
          <div style="color:var(--muted)">Total</div>
          <div style="font-weight:800">${formatMoney(cr.total)}</div>
        </div>
        <div style="background:#f0fff4;border-radius:8px;padding:8px;font-size:12px">
          <div style="color:#276749">Pagado</div>
          <div style="font-weight:800;color:#276749">${formatMoney(pagadoCr)}</div>
        </div>
        <div style="background:${saldoCr > 0 ? '#fff5f5' : '#f0fff4'};border-radius:8px;padding:8px;font-size:12px">
          <div style="color:${saldoCr > 0 ? 'var(--danger)' : '#276749'}">Saldo</div>
          <div style="font-weight:800;color:${saldoCr > 0 ? 'var(--danger)' : '#276749'}">${saldoCr > 0 ? formatMoney(saldoCr) : '✓ Saldado'}</div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">PAGOS:</div>
      ${pagosCr.slice().reverse().map(p => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px">
          <span style="color:var(--muted)">${formatDate(p.fecha)} · ${p.tipo}</span>
          <span style="font-weight:700;color:var(--success)">${formatMoney(p.monto)}</span>
        </div>`).join('')}
    </div>`;
  }).join('')}

  <div style="background:#f0fff4;border-radius:10px;padding:12px;text-align:center;margin-bottom:14px">
    <div style="font-size:12px;color:#276749">TOTAL PAGADO</div>
    <div style="font-size:22px;font-weight:800;color:#276749">${formatMoney(totalPagado)}</div>
  </div>
<button onclick="compartirWhatsAppHistorial()"
    style="width:100%;padding:13px;background:#25d366;color:white;border:none;
    border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-bottom:8px">
    📲 Compartir por WhatsApp
  </button>
  <button onclick="state.modal=null;state._historialCliente=null;render()"
    style="width:100%;padding:12px;background:#f1f5f9;color:var(--text);border:none;
    border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">
    Cerrar
  </button>`;
}

function compartirWhatsAppHistorial() {
  if (!state._historialCliente) return;
  const texto = state._historialCliente.texto;
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank');
}