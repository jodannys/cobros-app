const _SECCIONES_ADMIN = [
  // ── CLIENTES ──────────────────────────────────────────────
  {
    tab: 'clientes',
    titulo: '📋 Lista de clientes',
    keywords: ['cliente', 'lista', 'todos', 'filtro', 'activo', 'atrasado', 'cerrados', 'sin credito', 'buscar', 'dni', 'negocio', 'nombre'],
    contenido: 'Tu lista muestra todos los clientes en total con el nombre del cobrador asignado. Usa los filtros rápidos: <b>Todos · ✅ Activos · 🆕 Sin crédito · 🔴 Atrasados · 🔒 Cerrados</b>. También puedes buscar por nombre, DNI o negocio en la barra superior.'
  },
  {
    tab: 'clientes',
    titulo: '⚡ Acciones rápidas desde la lista',
    keywords: ['cobrar', 'cuota', 'pago rapido', 'credito nuevo', 'whatsapp', 'chat', 'boton verde', 'boton azul', 'accion rapida'],
    contenido: '💰 <b>Botón verde</b> → registra una cuota al instante sin entrar al perfil.<br>➕ <b>Botón azul</b> → crea un crédito nuevo si el cliente no tiene uno activo.<br>💬 <b>Logo WhatsApp</b> → abre directamente el chat del cliente sin enviar nada.'
  },
  {
    tab: 'clientes',
    titulo: '➕ Crear un cliente',
    keywords: ['crear cliente', 'nuevo cliente', 'cobrador asignado', 'asignar', 'agregar cliente'],
    contenido: 'Toca el botón <b>+</b>. Al crear un cliente como admin debes seleccionar el <b>cobrador asignado</b> — ese cobrador verá al cliente en su lista y será responsable de los cobros.'
  },
  {
    tab: 'clientes',
    titulo: '✏️ Editar un cliente',
    keywords: ['editar cliente', 'modificar', 'datos cliente', 'cambiar cobrador', 'reasignar'],
    contenido: 'Desde la ficha toca <b>Editar</b> arriba a la derecha. Puedes modificar todos sus datos incluyendo el cobrador asignado. Solo lo pueden hacer los administradores'
  },
  {
    tab: 'clientes',
    titulo: '🗑️ Eliminar un cliente',
    keywords: ['eliminar cliente', 'borrar cliente', 'deuda', 'sin deuda'],
    contenido: 'Desde la ficha del cliente. Se recomienda eliminar solo cuando el cliente ya no tenga deuda pendiente — al eliminarlo se borran también sus créditos y pagos del sistema, y se actulizan los montos.'
  },
  {
    tab: 'clientes',
    titulo: '👤 Perfil del cliente',
    keywords: ['perfil', 'ficha', 'editar', 'datos', 'foto', 'ubicacion', 'gps', 'estado de cuenta', 'whatsapp estado', 'telefono', 'direccion', 'borrar clinte'],
    contenido: 'Al tocar un cliente entras a su ficha. Arriba a la derecha puedes <b>editar sus datos</b> (nombre, DNI, teléfono, dirección, incluso borrarlo, foto y ubicación GPS). También puedes enviarle su <b>estado de cuenta por WhatsApp</b> — el sistema te pedirá confirmar el número antes de enviar.'
  },
  {
    tab: 'clientes',
    titulo: '💳 Gestión de crédito',
    keywords: ['credito activo', 'atraso', 'atrasado', 'mora', 'vencido', 'credito cerrado', 'historial', 'agregar pago', 'inicio', 'fin', 'fecha'],
    contenido: 'En la ficha ves el resumen del crédito activo: fecha de inicio, fecha de fin, cuánto debe y si está atrasado o al día. Puedes ver créditos cerrados anteriores y agregar un pago desde aquí.'
  },
  {
    tab: 'clientes',
    titulo: '🔧 Corregir monto del crédito',
    keywords: ['corregir monto', 'modificar credito', 'cambiar monto', 'recalcular', 'cuota', 'contabilidad'],
    contenido: 'Toca <b>Corregir monto</b> en la ficha del crédito. Esto recalcula automáticamente la cuota diaria, el total a pagar, y ajusta la caja del cobrador y el dinero disponible del admin. <b>Es una operación contable real — úsala solo para corregir errores.</b>'
  },
  {
    tab: 'clientes',
    titulo: '❌ Eliminar un crédito',
    keywords: ['eliminar credito', 'borrar credito', 'pagos', 'capital', 'mochila', 'ajuste'],
    contenido: 'Elimina el crédito y todos sus pagos. Esto también ajusta automáticamente la mochila del cobrador y el capital disponible del admin. <b>Esta acción es irreversible.</b>'
  },
  {
    tab: 'clientes',
    titulo: '🔒 Cerrar un crédito',
    keywords: ['cerrar credito', 'credito cerrado', 'reabrir', 'activo', 'inactivo'],
    contenido: 'Marca el crédito como cerrado sin eliminarlo. Dejará de aparecer como activo pero quedará visible en el perfil del cliente como <b>crédito cerrado</b>. Puede reabrirse en cualquier momento para continuar el cobro.'
  },
  {
    tab: 'clientes',
    titulo: '🔔 Activar mora',
    keywords: ['mora', 'activar mora', 'desactivar mora', 'penalidad', 'dias vencidos', 'monto actualizado'],
    contenido: 'Cuando el cliente superó los días estipulados del crédito. Al activarla el cobrador verá el monto actualizado incluyendo la <b>penalidad diaria de S/5</b>. Puede desactivarse si se llega a un acuerdo.'
  },
  {
    tab: 'clientes',
    titulo: '✏️ Editar un pago',
    keywords: ['editar pago', 'modificar pago', 'metodo pago', 'lapiz', 'calendario', 'cuota editada'],
    contenido: 'Toca el lápiz ✏️ debajo del calendario de cuotas para modificar el monto o el método de pago de cualquier cuota registrada. Al modificar un pago se recalcula automáticamente el estado del crédito de ese cliente.'
  },
  {
    tab: 'clientes',
    titulo: '🔔 Cliente con mora — ¿qué hacer?',
    keywords: ['mora', 'moroso', 'vencido', 'notificar', 'gestionar', 'atraso grave', 'que hago', 'que hacer'],
    contenido: 'Si un cliente lleva varios días sin pagar o su crédito ya venció, entra a su ficha y toca <b>Gestionar crédito</b>. Desde ahí puedes activar la mora, extender el plazo o negociar un pago parcial. Puedes ver la alerta también en el panel de Admin.'
  },

  // ── CUADRE ────────────────────────────────────────────────
  {
    tab: 'cuadre',
    titulo: '💰 Panel de capital',
    keywords: ['capital', 'dinero disponible', 'mochilas', 'negocio', 'saldo total', 'objetivo', 'recaudado', 'seguros', 'prestado', 'gastos'],
    contenido: '• <b>Dinero disponible</b> — capital listo para distribuir<br>• <b>Saldo en mochilas</b> — dinero en la calle (cajas de cobradores)<br>• <b>Capital total</b> — cuánto vale tu negocio ahora<br>• <b>Objetivo del día</b> — meta combinada de todos los cobradores<br>• <b>Recaudado hoy</b> — total cobrado hasta este momento<br>• <b>Seguros cobrados</b> — total de seguros del día<br>• <b>Prestado hoy</b> — créditos entregados hoy<br>• <b>Gastos totales</b> — suma de gastos de todos los cobradores'
  },
  {
    tab: 'cuadre',
    titulo: '☰ Menú de movimientos',
    keywords: ['menu', 'inyeccion', 'gasto admin', 'retiro personal', 'enviar caja', 'cobrador', 'movimiento', 'tres rayas'],
    contenido: '• <b>Inyección de capital</b> — dinero propio que ingresas al negocio<br>• <b>Gasto administrativo</b> — gastos del negocio que salen de tu capital<br>• <b>Retiro personal</b> — dinero que retiras para uso personal<br>• <b>Enviar caja a cobrador</b> — asignas dinero a un cobrador para su jornada<br>• <b>Retirar dinero de cobrador</b> — retiro directo e inmediato, sin confirmación del cobrador. El dinero se resta de su mochila al instante. <b>Coordínalo antes de hacerlo.</b>'
  },
  {
    tab: 'cuadre',
    titulo: '🔔 Notificación de retiro del cobrador',
    keywords: ['notificacion', 'retiro', 'confirmar', 'badge', 'cobrador entrega', 'pendiente', 'cuadre'],
    contenido: 'Cuando un cobrador usa el botón <b>Retirar</b>, recibes una notificación — aparece un <b>badge rojo</b> en el ícono de la pestaña Cuadre con el número de retiros pendientes. Debes <b>confirmar</b> cada retiro para que el dinero se descuente de la mochila del cobrador. Si no confirmas, el cobrador seguirá viendo ese monto en su caja. <b>Confirma el mismo día para que el cuadre cierre correctamente.</b>'
  },
  {
    tab: 'cuadre',
    titulo: '📋 Movimientos recientes',
    keywords: ['movimientos', 'lista', 'ver mas', 'ver menos', 'inyeccion', 'deposito', 'retiro', 'historial movimientos'],
    contenido: 'Lista de los últimos 5 movimientos (inyecciones, retiros, envíos, depósitos y otros). Toca <b>Ver más</b> para ver todos y <b>Ver menos</b> para contraer la lista.'
  },
  {
    tab: 'cuadre',
    titulo: '💼 Dinero en caja de cobradores',
    keywords: ['caja cobrador', 'mochila', 'resumen cobrador', 'enviar dinero', 'saldo cobrador'],
    contenido: 'Resumen individual de cada cobrador — cuánto tiene en caja en este momento. Incluye un botón directo para <b>enviarle dinero</b> sin tener que ir al menú principal.'
  },
  {
    tab: 'cuadre',
    titulo: '📈 Rendimiento por cobrador',
    keywords: ['rendimiento', 'meta cobrador', 'recaudado', 'detalle cobrador', 'gastos cobrador', 'saldo', 'registrar gasto'],
    contenido: 'Para cada cobrador ves cuánto ha recaudado y cuál es su meta. Al tocar el detalle ves: dinero inicial, cobros del día, créditos entregados, gastos y saldo actual en caja. Desde aquí puedes <b>registrarle un gasto</b> (él también lo verá) y <b>enviarle dinero</b> directamente.'
  },

  // ── ADMIN ─────────────────────────────────────────────────
  {
    tab: 'admin',
    titulo: '🚨 Panel de alertas',
    keywords: ['alertas', 'atrasados', 'vencidos', 'gestion credito', 'penalidad', 'plazo', 'compromiso', 'mora admin'],
    contenido: 'Al entrar ves las alertas de créditos atrasados o vencidos. Al tocar <b>Gestionar</b> puedes: aplicar penalidad por atraso, extender el plazo del crédito, poner una fecha de compromiso, o activar/desactivar la mora.'
  },
  {
    tab: 'admin',
    titulo: '👤 Cobradores',
    keywords: ['cobrador', 'agregar cobrador', 'editar cobrador', 'contraseña', 'usuario', 'whatsapp cobrador', 'alerta cobrador'],
    contenido: 'Lista de todos los cobradores. Puedes agregar nuevos o editar los existentes (nombre, usuario, contraseña, teléfono). El logo de WhatsApp abre su chat directamente. Si un cobrador tiene clientes vencidos o atrasados verás un <b>indicador rojo</b> con la cantidad.'
  },
  {
    tab: 'admin',
    titulo: '🗑️ Eliminar un cobrador',
    keywords: ['eliminar cobrador', 'borrar cobrador', 'clientes sin cobrador', 'reasignar'],
    contenido: 'Desde la ficha del cobrador toca <b>Editar</b> y luego <b>Eliminar cobrador</b>. <b>⚠️ Importante:</b> si el cobrador tiene clientes asignados, al eliminarlo esos clientes quedarán sin cobrador — sus datos no se borran pero deberás reasignarlos manualmente desde la ficha de cada cliente.'
  },
  {
    tab: 'admin',
    titulo: '🗺️ Perfil del cobrador',
    keywords: ['perfil cobrador', 'cuadre fecha', 'mapa cobrador', 'clientes cobrador', 'filtrar clientes', 'saldo cobrador'],
    contenido: 'Al tocar un cobrador ves: cuántos clientes tiene, navegación por fecha para ver cuadres anteriores, resumen de saldo en caja, registrar gastos, y ver sus clientes en el <b>mapa</b> — los clientes aparecen como puntos según su ubicación GPS, útil para verificar zonas y planificar rutas. También puedes filtrar sus clientes por: Todos, Activos, Atrasados, Sin crédito.'
  },
  {
    tab: 'admin',
    titulo: '👥 Clientes del cobrador',
    keywords: ['clientes cobrador', 'filtrar cobrador', 'activos cobrador', 'atrasados cobrador', 'sin credito cobrador'],
    contenido: 'Dentro del perfil del cobrador puedes ver y filtrar todos sus clientes: <b>Todos · ✅ Activos · 🔴 Atrasados · 🆕 Sin crédito</b>. Al tocar un cliente entras a su ficha completa donde puedes gestionar su crédito, registrar pagos y editar sus datos.'
  },
  {
    tab: 'admin',
    titulo: '📅 Días no laborables',
    keywords: ['feriado', 'no laborable', 'bloquear dia', 'domingo', 'cuotas', 'deuda', 'meta', 'calendario'],
    contenido: 'Agrega fechas en las que no se deben cobrar cuotas. Al bloquear un día: los clientes no verán cuotas pendientes, los cobradores no tendrán meta, y no se acumulará deuda. Se refleja en el calendario de cuotas de cada crédito con 🎉.'
  },

  // ── HISTORIAL ─────────────────────────────────────────────
  {
    tab: 'historial',
    titulo: '🔍 Búsqueda por cliente',
    keywords: ['buscar cliente', 'nombre', 'historial cliente', 'estado credito', 'whatsapp historial'],
    contenido: 'Escribe el nombre del cliente en la barra superior. Al seleccionarlo ves el detalle completo de su crédito y un botón para enviarle el estado por WhatsApp.'
  },
  {
    tab: 'historial',
    titulo: '🗂️ Filtros de historial',
    keywords: ['filtro fecha', 'filtro cobrador', 'pagos', 'gastos', 'creditos', 'vista', 'historial filtro'],
    contenido: 'Filtra por <b>fecha</b> y por <b>cobrador</b>. Las vistas disponibles son: <b>Pagos</b> — todos los pagos del día, <b>Gastos</b> — gastos registrados ese día, <b>Créditos</b> — préstamos entregados con su estado y progreso.'
  },
  {
    tab: 'historial',
    titulo: '📆 Lógica de cuotas — importante',
    keywords: ['domingo', 'cuota domingo', 'atrasado', 'dias habiles', 'logica', 'como cuenta', 'pago atrasado'],
    contenido: 'El sistema <b>no cobra cuotas los domingos</b>. Un pago se considera atrasado cuando las cuotas cubiertas son menores a los días hábiles transcurridos desde el inicio del crédito — excluyendo el día de entrega. Los días no laborables configurados tampoco acumulan deuda.'
  },

  // ── IMPORTANTE ────────────────────────────────────────────
  {
    tab: 'importante',
    titulo: '⚠️ Cosas importantes',
    keywords: ['importante', 'cuidado', 'advertencia', 'precaucion', 'eliminar', 'corregir', 'coordinar', 'confirmar'],
    contenido: '• <b>Corregir monto</b> de un crédito recalcula la cuota y ajusta la contabilidad — solo para errores reales<br>• <b>Eliminar un crédito</b> es irreversible — borra todos los pagos asociados<br>• <b>Eliminar un cobrador</b> deja a sus clientes sin asignar — reasígnalos antes<br>• <b>Retirar dinero de cobrador</b> desde el panel admin es inmediato — el cobrador no confirma, coordínalo antes<br>• <b>Días no laborables</b> afectan a todos los cobradores<br>• <b>Confirmar el retiro</b> del cobrador es obligatorio para que su caja cuadre al final del día'
  },

  // ── SALIR ─────────────────────────────────────────────────
  {
    tab: 'salir',
    titulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar sesión',
    keywords: ['salir', 'cerrar sesion', 'sesion', 'logout', 'terminar'],
    contenido: 'Toca <b>Salir</b> en la barra inferior para cerrar tu sesión.'
  }
];

// ── Función de filtrado global ────────────────────────────────
window._filtrarAyudaAdmin = function (q) {
  const contenedor = document.getElementById('ayuda-admin-resultados');
  if (!contenedor) return;

  const iconClientes = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const iconCuadre = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';
  const iconAdmin = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M12 2L3 7v5c0 5 4 9.3 9 10.3C17 21.3 21 17 21 12V7z"/><polyline points="9 12 11 14 15 10"/></svg>';
  const iconHistorial = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const iconImportante = '<span style="vertical-align:middle;margin-right:4px;font-size:13px">⚠️</span>';
  const iconSalir = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

  const icons = { clientes: iconClientes, cuadre: iconCuadre, admin: iconAdmin, historial: iconHistorial, importante: iconImportante, salir: iconSalir };
  const tabLabels = { clientes: 'Clientes', cuadre: 'Cuadre', admin: 'Admin', historial: 'Historial', importante: 'Importante', salir: 'Salir' };

  const term = (q || '').toLowerCase().trim();
  const filtradas = term === '' ? _SECCIONES_ADMIN : _SECCIONES_ADMIN.filter(s =>
    s.keywords.some(k => k.includes(term)) ||
    s.titulo.toLowerCase().replace(/<[^>]+>/g, '').includes(term) ||
    s.contenido.toLowerCase().replace(/<[^>]+>/g, '').includes(term)
  );

  if (filtradas.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center;color:#64748b;font-size:13px;padding:24px 16px;">Sin resultados. Intenta con otra palabra.</p>';
    return;
  }

  let html = '';
  let tabActual = '';
  filtradas.forEach(function (s) {
    if (s.tab !== tabActual) {
      tabActual = s.tab;
      html += '<div style="padding:8px 20px 6px; font-size:11px; font-weight:700; color:#64748b; background:#f1f5f9; border-bottom:1px solid #e2e8f0; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;">'
        + icons[s.tab] + tabLabels[s.tab]
        + '</div>';
    }
    html += '<div style="padding:13px 20px; border-bottom:1px solid #e2e8f0;">'
      + '<div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:5px;">' + s.titulo + '</div>'
      + '<div style="font-size:13px; color:#64748b; line-height:1.6;">' + s.contenido + '</div>'
      + '</div>';
  });
  contenedor.innerHTML = html;
};

// ── Botón ⓘ para pegar en el topbar del admin ────────────────
window.renderBtnAyudaAdmin = function () {
  return `
  <button onclick="abrirAyudaAdmin()"
    style="width:24px; height:24px; border-radius:50%; background:#ea580c;
           border:none; color:white; cursor:pointer;
           display:flex; align-items:center; justify-content:center;
           flex-shrink:0; box-shadow:0 2px 8px rgba(234,88,12,0.4)">
    <span style="font-size:15px; font-weight:700; font-family:Georgia,serif;
                 line-height:1; margin-top:1px">i</span>
  </button>`;
};

// ── Abrir overlay flotante centrado ───────────────────────────
window.abrirAyudaAdmin = function () {
  if (document.getElementById('overlay-ayuda-admin')) return;

  const overlay = document.createElement('div');
  overlay.id = 'overlay-ayuda-admin';
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.6);
    z-index:99999; display:flex; align-items:center;
    justify-content:center; padding:20px`;

  overlay.innerHTML = `
    <div style="background:white; border-radius:20px; width:100%;
                max-width:420px; max-height:85vh; display:flex;
                flex-direction:column; overflow:hidden;
                box-shadow:0 20px 60px rgba(0,0,0,0.3)">

      <div style="background:#0f172a; padding:14px 18px;
                  display:flex; align-items:center; justify-content:space-between;
                  flex-shrink:0; border-radius:20px 20px 0 0">
        <div style="display:flex; align-items:center; gap:10px">
          <div style="width:30px; height:30px; border-radius:50%; background:#ea580c;
                      display:flex; align-items:center; justify-content:center;
                      flex-shrink:0;">
            <span style="font-size:18px; font-weight:700; font-family:Georgia,serif;
                         color:white; line-height:1; margin-top:1px">i</span>
          </div>
          <span style="color:white; font-size:16px; font-weight:700">Guía del administrador</span>
        </div>
        <span onclick="document.getElementById('overlay-ayuda-admin').remove()"
          style="color:rgba(255,255,255,0.6); font-size:24px; cursor:pointer;
                 line-height:1; padding:0 4px">×</span>
      </div>

      <div style="padding:12px 16px; border-bottom:1px solid #e2e8f0; flex-shrink:0; background:white;">
        <div style="position:relative; display:flex; align-items:center;">
          <span style="position:absolute; left:14px; pointer-events:none; display:flex; align-items:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input id="ayuda-admin-search" type="text"
  placeholder="Buscar: mora, retiro, cobrador, crédito..."
  oninput="_filtrarAyudaAdmin(this.value); 
           document.getElementById('btn-clear-ayuda').style.display=this.value?'block':'none';"
  style="width:100%; border:none; background:#ffffff; border-radius:20px;
         padding:9px 36px 9px 40px; font-size:13.5px; color:#2d3748;
         font-weight:500; outline:none; box-shadow:0 2px 8px rgba(0,0,0,0.08);
         box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
<span id="btn-clear-ayuda"
  onclick="document.getElementById('ayuda-admin-search').value=''; 
           _filtrarAyudaAdmin('');
           this.style.display='none';"
  style="position:absolute; right:14px; cursor:pointer; color:#a0aec0;
         font-size:13px; font-weight:700; line-height:1; display:none">
  ✕
</span>
        </div>
      </div>

      <div id="ayuda-admin-resultados" style="overflow-y:auto; flex:1; background:white;"></div>
    </div>`;

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  _filtrarAyudaAdmin('');
};