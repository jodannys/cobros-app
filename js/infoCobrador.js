
const _SECCIONES_COBRADOR = [
  {
    tab: 'clientes',
    titulo: '📋 Lista de clientes',
    keywords: ['cliente','lista','todos','filtro','activo','atrasado','sin credito','buscar','dni','negocio','nombre','busqueda'],
    contenido: 'Tu lista muestra todos los clientes asignados. Usa los filtros rápidos: <b>Todos · ✅ Activos · 🆕 Sin crédito · 🔴 Atrasados</b>. También puedes buscar por nombre, DNI o negocio en la barra superior.'
  },
  {
    tab: 'clientes',
    titulo: '⚡ Acciones rápidas desde la lista',
    keywords: ['cobrar','cuota','pago rapido','credito nuevo','whatsapp','chat','boton verde','boton azul','accion rapida'],
    contenido: '💰 <b>Botón verde</b> → registra una cuota al instante sin entrar al perfil.<br>➕ <b>Botón azul</b> → crea un crédito nuevo si el cliente no tiene uno activo.<br>💬 <b>Logo WhatsApp</b> → abre directamente el chat del cliente sin enviar nada.'
  },
 
  {
    tab: 'clientes',
    titulo: '👤 Perfil del cliente',
    keywords: ['perfil','ficha','editar','datos','foto','ubicacion','gps','estado de cuenta','whatsapp estado','telefono','direccion'],
    contenido: 'Al tocar un cliente entras a su ficha. Arriba a la derecha puedes <b>editar sus datos</b> (nombre, DNI, teléfono, dirección, foto y ubicación GPS). También puedes enviarle su <b>estado de cuenta por WhatsApp</b> — el sistema te pedirá confirmar el número antes de enviar.'
  },
  {
    tab: 'clientes',
    titulo: '💳 Gestión de crédito',
    keywords: ['credito activo','atraso','atrasado','mora','vencido','credito cerrado','historial','agregar pago','admin','inicio','fin','fecha'],
    contenido: 'En la ficha ves el resumen del crédito activo: fecha de inicio, fecha de fin, cuánto debe y si está atrasado o al día. Si hay atraso puedes <b>notificar al admin</b>. También puedes ver créditos cerrados anteriores y agregar un pago desde aquí.'
  },
  {
    tab: 'clientes',
    titulo: '➕ Crear un crédito',
    keywords: ['crear credito','nuevo credito','plan','24 dias','20 dias','seguro','monto','yape','efectivo','transferencia','cuota diaria','interes'],
    contenido: 'Elige el <b>plan</b> (24 o 20 días), el <b>monto</b> a prestar, si cobras <b>seguro</b> o no y el porcentaje, y cómo se entregó el dinero (efectivo, Yape o transferencia). El sistema calcula automáticamente la cuota diaria y el total a pagar.'
  },
   {
  tab: 'clientes',
  titulo: '🔔 Cliente con mora — ¿qué hacer?',
  keywords: ['mora','moroso','vencido','notificar','admin','gestionar','atraso grave','que hago','que hacer'],
  contenido: 'Si un cliente lleva varios días sin pagar o su crédito ya venció, entra a su ficha y toca <b>Gestionar crédito</b>. Desde ahí puedes activar la mora (penalidad de S/5 diarios) y el admin recibirá una alerta automática en su panel. El admin decidirá si extender el plazo, negociar un pago parcial o cerrar el crédito. No tomes decisiones sobre créditos en mora sin consultar al admin primero.'
},
  {
    tab: 'cuadre',
    titulo: '💰 Tu caja del día',
    keywords: ['caja','dinero disponible','prestar','asignado','cobrado','gastos','prestamos','disponible'],
    contenido: 'Muestra el dinero disponible para seguir prestando — incluye lo que el admin te asignó más lo que has cobrado hoy, menos los gastos y préstamos del día.'
  },
  {
    tab: 'cuadre',
    titulo: '🎯 Meta de cobranza',
    keywords: ['meta','cobrar hoy','cuanto llevo','falta','atrasados','deuda','total','resumen'],
    contenido: 'Muestra cuánto debes cobrar hoy, cuánto llevas y cuánto te falta. También ves un <b>resumen de clientes atrasados</b> y el total que deben acumulado.'
  },
  {
    tab: 'cuadre',
    titulo: '▶️ Ruta del día — lista',
    keywords: ['ruta','empezar ruta','pausar ruta','cercania','gps','orden','pendientes','cobro rapido','lista ruta','reanudar'],
    contenido: 'Lista de clientes pendientes. Toca el <b>botón con el monto</b> para registrar el pago al instante — el cliente desaparece de la lista.<br><br>▶️ <b>Empezar ruta</b>: activa el GPS y organiza por cercanía — el indicador muestra "📍 Por cercanía".<br>⏸️ <b>Pausar ruta</b>: vuelve al orden alfabético. Al reanudar se reorganizan según tu posición actual.'
  },
  {
    tab: 'cuadre',
    titulo: '🗺️ Mapa de ruta',
    keywords: ['mapa','ruta mapa','circulo azul','circulo rojo','gps mapa','ver mapa','ubicacion mapa'],
    contenido: 'Toca el ícono 🗺️ para ver los clientes pendientes en el mapa. <b>Tú eres el círculo azul</b>. Los clientes aparecen con colores según su estado: 🔴 rojo = pendiente/atrasado, 🟡 naranja = abonó, 🟢 verde = pagó. Puedes pausar y reanudar el GPS — al reanudar los clientes se reorganizan según tu nueva posición.'
  },
  {
    tab: 'cuadre',
    titulo: '🧾 Registrar un gasto',
    keywords: ['gasto','registrar gasto','transporte','papeleria','descuento','caja gasto','agregar gasto'],
    contenido: 'Toca <b>➕ Gasto</b>, ingresa el monto y una descripción (transporte, papelería, etc.). El gasto se descuenta automáticamente de tu caja y el admin puede verlo en su panel.'
  },
  {
    tab: 'cuadre',
    titulo: '📝 Notas del día',
    keywords: ['nota','comentario','detalle','observacion','admin nota','mensaje admin'],
    contenido: 'Al final del día puedes dejar un <b>comentario o detalle importante</b> para el admin en la sección de notas.'
  },
  {
    tab: 'cuadre',
    titulo: '💸 Retirar dinero',
    keywords: ['retirar','enviar dinero','admin','confirmar','descuento','mochila','retiro','entregar'],
    contenido: 'Usa el botón <b>Retirar</b> para enviar dinero al admin. Ingresa el monto y una descripción. El admin recibe una notificación y debe <b>confirmar</b> — solo entonces se descuenta de tu caja disponible.'
  },
  {
    tab: 'cuadre',
   titulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar sesión',
    keywords: ['salir','cerrar sesion','sesion','logout','fin del dia','terminar'],
    contenido: 'Puedes <b>dejar tu sesión abierta</b> entre días. Cuando termines tu jornada toca <b>Salir</b> en la barra inferior.'
  }
];

// ── Función de filtrado global ────────────────────────────────
window._filtrarAyuda = function (q) {
  const contenedor = document.getElementById('ayuda-resultados');
  if (!contenedor) return;

  const iconClientes = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const iconCuadre = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';

  const icons = { clientes: iconClientes, cuadre: iconCuadre };
  const tabLabels = { clientes: 'Clientes', cuadre: 'Cuadre' };

  const term = (q || '').toLowerCase().trim();
  const filtradas = term === '' ? _SECCIONES_COBRADOR : _SECCIONES_COBRADOR.filter(s =>
    s.keywords.some(k => k.includes(term)) ||
    s.titulo.toLowerCase().includes(term) ||
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

// ── Botón ⓘ para pegar en el topbar ─────────────────────────
window.renderBtnAyudaCobrador = function () {
  return `
  <button onclick="abrirAyudaCobrador()"
    style="width:24px; height:24px; border-radius:50%; background:#ea580c;
           border:none; color:white; cursor:pointer;
           display:flex; align-items:center; justify-content:center;
           flex-shrink:0; box-shadow:0 2px 8px rgba(234,88,12,0.4)">
    <span style="font-size:14px; font-weight:700; font-family:Georgia,serif; 
                 line-height:1; margin-top:1px">i</span>
  </button>`;
};

// ── Abrir overlay flotante centrado ───────────────────────────
window.abrirAyudaCobrador = function () {
  if (document.getElementById('overlay-ayuda')) return;

  const overlay = document.createElement('div');
  overlay.id = 'overlay-ayuda';
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
    <div style="width:32px; height:32px; border-radius:50%; background:#ea580c;
                display:flex; align-items:center; justify-content:center;
                flex-shrink:0;">
      <span style="font-size:18px; font-weight:700; font-family:Georgia,serif;
                   color:white; line-height:1; margin-top:1px">i</span>
    </div>
    <span style="color:white; font-size:16px; font-weight:700">Guía del cobrador</span>
  </div>
  <span onclick="document.getElementById('overlay-ayuda').remove()"
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
    <input id="ayuda-search" type="text"
      placeholder="Buscar: pago, ruta, gasto, crédito..."
      oninput="_filtrarAyuda(this.value);
               document.getElementById('btn-clear-ayuda-cobrador').style.display=this.value?'block':'none';"
      style="width:100%; border:none; background:#ffffff; border-radius:20px;
             padding:9px 36px 9px 40px; font-size:13.5px; color:#2d3748;
             font-weight:500; outline:none; box-shadow:0 2px 8px rgba(0,0,0,0.08);
             box-sizing:border-box;">
    <span id="btn-clear-ayuda-cobrador"
      onclick="document.getElementById('ayuda-search').value='';
               _filtrarAyuda('');
               this.style.display='none';"
      style="position:absolute; right:14px; cursor:pointer; color:#a0aec0;
             font-size:13px; font-weight:700; line-height:1; display:none">
      ✕
    </span>
  </div>
</div>

      <div id="ayuda-resultados" style="overflow-y:auto; flex:1; background:white;"></div>
    </div>`;

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  _filtrarAyuda('');
};