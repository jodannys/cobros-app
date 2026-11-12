
const _SECCIONES_COBRADOR = [
  // ── CLIENTES ──────────────────────────────────────────────
  {
    tab: 'clientes',
    titulo: '📋 Lista de clientes',
    keywords: ['cliente','lista','todos','filtro','activo','atrasado','sin credito','buscar','dni','negocio','nombre','busqueda'],
    contenido: 'Tu lista muestra <b>solo tus clientes</b>. Usa los filtros rápidos: <b>Todos · ✅ Activos · 🆕 Sin crédito · 🔴 Atrasados</b>. También puedes buscar por nombre, DNI o negocio en la barra de arriba; la <b>X</b> borra la búsqueda.'
  },
  {
    tab: 'clientes',
    titulo: '⚡ Acciones rápidas desde la lista',
    keywords: ['cobrar','cuota','pago rapido','credito nuevo','whatsapp','chat','boton verde','boton azul','accion rapida'],
    contenido: '💰 <b>Botón verde</b> → registra una cuota al instante sin entrar a la ficha.<br>➕ <b>Botón azul</b> → crea un crédito nuevo si el cliente no tiene uno activo.<br>💬 <b>Logo de WhatsApp</b> → abre el chat del cliente sin enviar nada.'
  },
  {
    tab: 'clientes',
    titulo: '➕ Crear un cliente',
    keywords: ['crear cliente','nuevo cliente','agregar cliente','dni','dni repetido','ya existe','otro cobrador'],
    contenido: 'Toca el botón <b>+</b> y completa los datos. Si sale <b>"Ya existe un cliente con ese DNI (de otro cobrador)"</b>, ese cliente ya está registrado con otro cobrador: no lo crees de nuevo y avísale al admin.'
  },
  {
    tab: 'clientes',
    titulo: '📷 Foto de la casa o negocio',
    keywords: ['foto','camara','galeria','imagen','tomar foto','subir foto','casa','negocio'],
    contenido: 'Al crear o editar un cliente tienes dos botones:<br>📷 <b>Cámara</b> → toma la foto en ese momento.<br>🖼️ <b>Galería</b> → elige una foto que ya tienes en el celular.<br>Toca la foto para verla en grande.'
  },
  {
    tab: 'clientes',
    titulo: '👤 Ficha del cliente',
    keywords: ['perfil','ficha','editar','datos','foto','ubicacion','gps','estado de cuenta','whatsapp estado','telefono','direccion'],
    contenido: 'Al tocar un cliente entras a su ficha. Arriba a la derecha puedes <b>editar sus datos</b> (nombre, DNI, teléfono, dirección, foto y ubicación GPS). También puedes enviarle su <b>estado de cuenta por WhatsApp</b>; la app te pide confirmar el número antes de enviar.'
  },
  {
    tab: 'clientes',
    titulo: '💳 Crédito activo',
    keywords: ['credito activo','atraso','atrasado','mora','vencido','credito cerrado','historial','agregar pago','inicio','fin','fecha','saldo','debe'],
    contenido: 'En la ficha ves el crédito activo: fecha de inicio y de fin, <b>cuánto debe</b> y si está atrasado o al día. Las cuotas se empiezan a cobrar <b>al día siguiente</b> del préstamo, y no se cobra los domingos ni los feriados. También ves sus créditos anteriores.'
  },
  {
    tab: 'clientes',
    titulo: '➕ Dar un crédito',
    keywords: ['crear credito','nuevo credito','prestar','plan','24 dias','20 dias','seguro','monto','yape','efectivo','transferencia','cuota diaria','interes'],
    contenido: 'Elige el <b>plan</b> (24 o 20 días), el <b>monto</b>, si cobras <b>seguro</b> y su porcentaje, y cómo entregaste el dinero (efectivo, Yape o transferencia). La app calcula la cuota diaria y el total a pagar.<br><b>Ejemplo:</b> prestas S/100 con seguro de S/5 → le entregas <b>S/95</b> al cliente y el seguro se queda en tu caja.'
  },
  {
    tab: 'clientes',
    titulo: '💰 Registrar un pago',
    keywords: ['pago','cobrar','registrar pago','cuota','abono','yape','efectivo','transferencia','mora','monto'],
    contenido: 'Escribe el monto que te dio el cliente, elige cómo pagó (efectivo, Yape o transferencia) y confirma. Si el cliente tiene mora, el pago <b>cubre primero la mora</b> y lo que sobra va al préstamo. Cuando termina de pagar todo, el crédito se cierra solo.'
  },
  {
    tab: 'clientes',
    titulo: '✏️ Me equivoqué en un pago',
    keywords: ['error pago','equivoque','corregir pago','borrar pago','eliminar pago','pago duplicado','pago repetido','monto mal'],
    contenido: 'No lo registres de nuevo ni intentes compensarlo. <b>Avísale al admin</b>: él puede corregir el monto o eliminar el pago, y tu caja se ajusta sola.'
  },
  {
    tab: 'clientes',
    titulo: '🔔 Cliente con mora — ¿qué hacer?',
    keywords: ['mora','moroso','vencido','notificar','admin','atraso grave','que hago','que hacer','no paga'],
    contenido: 'Si un cliente lleva varios días sin pagar o su crédito ya venció, <b>avísale al admin</b>. El admin decide si activa la mora (S/5 por cada día hábil de retraso), extiende el plazo o acuerda un pago. Cuando la mora está activa, verás el monto actualizado en la ficha del cliente.'
  },

  // ── CUADRE ────────────────────────────────────────────────
  {
    tab: 'cuadre',
    titulo: '💰 Tu caja del día',
    keywords: ['caja','dinero disponible','prestar','asignado','cobrado','gastos','prestamos','disponible','negativo','caja chica'],
    contenido: 'Es el dinero que deberías tener en la mano:<br>lo que traías de ayer <b>+</b> lo que te envió el admin (incluida la caja chica) <b>+</b> lo cobrado hoy y los seguros <b>−</b> lo prestado <b>−</b> tus gastos <b>−</b> lo que entregaste al admin.<br>Si sale en negativo, avísale al admin.'
  },
  {
    tab: 'cuadre',
    titulo: '🎯 Meta de cobranza',
    keywords: ['meta','cobrar hoy','cuanto llevo','falta','atrasados','deuda','total','resumen'],
    contenido: 'Muestra cuánto debes cobrar hoy, cuánto llevas y cuánto te falta. También ves un <b>resumen de clientes atrasados</b> y cuánto deben en total.'
  },
  {
    tab: 'cuadre',
    titulo: '▶️ Ruta del día — lista',
    keywords: ['ruta','empezar ruta','pausar ruta','cercania','gps','orden','pendientes','cobro rapido','lista ruta','reanudar'],
    contenido: 'Lista de clientes que te faltan cobrar. Toca el <b>botón con el monto</b> para registrar el pago al instante; el cliente sale de la lista.<br><br>▶️ <b>Empezar ruta</b>: activa el GPS y ordena por cercanía (aparece "📍 Por cercanía").<br>⏸️ <b>Pausar ruta</b>: vuelve al orden alfabético. Al reanudar se ordena según dónde estés.'
  },
  {
    tab: 'cuadre',
    titulo: '🗺️ Mapa de ruta',
    keywords: ['mapa','ruta mapa','circulo azul','circulo rojo','gps mapa','ver mapa','ubicacion mapa'],
    contenido: 'Toca el ícono 🗺️ para ver en el mapa a los clientes que te faltan. <b>Tú eres el círculo azul</b>. Los clientes salen en colores: 🔴 rojo = pendiente o atrasado, 🟡 naranja = abonó, 🟢 verde = pagó.'
  },
  {
    tab: 'cuadre',
    titulo: '🧾 Registrar un gasto',
    keywords: ['gasto','registrar gasto','gasolina','transporte','papeleria','descuento','caja gasto','agregar gasto','editar gasto','borrar gasto'],
    contenido: 'Toca <b>➕ Gasto</b>, escribe el monto y para qué fue (gasolina, transporte, etc.). Se descuenta de tu caja y el admin lo ve. Si te equivocaste, toca el gasto para <b>corregirlo o borrarlo</b>.'
  },
  {
    tab: 'cuadre',
    titulo: '📝 Notas del día',
    keywords: ['nota','comentario','detalle','observacion','admin nota','mensaje admin'],
    contenido: 'Al final del día puedes dejarle al admin un <b>comentario o detalle importante</b> en la sección de notas.'
  },
  {
    tab: 'cuadre',
    titulo: '💸 Entregar dinero al admin',
    keywords: ['retirar','entregar','enviar dinero','admin','confirmar','deposito','yape admin','mochila','retiro'],
    contenido: 'Cuando le entregues dinero al admin, usa el botón <b>Retirar</b>: escribe el monto y una descripción. El admin recibe un aviso y lo <b>confirma</b> cuando le llega el dinero; recién ahí se descuenta de tu caja.'
  },

  // ── TU CUENTA ─────────────────────────────────────────────
  {
    tab: 'cuenta',
    titulo: '🔐 Iniciar sesión',
    keywords: ['iniciar sesion','entrar','login','usuario','contraseña','clave','recordarme','no puedo entrar'],
    contenido: 'Entra con el <b>usuario y la contraseña</b> que te dio el admin. Si marcas <b>Recordarme</b>, no tendrás que volver a escribirla en tu celular.'
  },
  {
    tab: 'cuenta',
    titulo: '❓ Olvidé mi contraseña',
    keywords: ['olvide mi clave','olvide contraseña','no recuerdo','recuperar clave','cambiar clave','perdi clave'],
    contenido: '<b>Pídele al admin</b> que te ponga una contraseña nueva. Él lo hace desde su panel y te la dice.'
  },
  {
    tab: 'cuenta',
    titulo: '📴 Sin señal o sin internet',
    keywords: ['sin señal','sin internet','offline','no carga','guardando','sin datos','conexion','zona sin señal'],
    contenido: 'Puedes seguir cobrando sin señal: lo que guardes queda en tu celular y aparece <b>"📴 Sin señal: guardado en el celular"</b>. Cuando vuelve la señal se envía solo y sale <b>"✅ Datos enviados a la nube"</b>.<br><b>No vuelvas a registrar el mismo pago.</b> Evita cerrar la app hasta ver ese aviso.'
  },
  {
    tab: 'cuenta',
    titulo: '🔄 La app no se actualiza',
    keywords: ['actualizar','version nueva','no se ve','cambios','recargar','no aparece','error'],
    contenido: 'Si algo no carga o no ves un cambio, <b>cierra la pestaña de la app y ábrela de nuevo</b>.'
  },
  {
    tab: 'cuenta',
    titulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar sesión',
    keywords: ['salir','cerrar sesion','sesion','logout','fin del dia','terminar'],
    contenido: 'Puedes <b>dejar tu sesión abierta</b> entre días. Cuando termines tu jornada toca <b>Salir</b> en la barra de abajo. Si hay pagos sin enviar por falta de señal, espera a que se envíen antes de salir.'
  }
];
// ── Función de filtrado global ────────────────────────────────
window._filtrarAyuda = function (q) {
  const contenedor = document.getElementById('ayuda-resultados');
  if (!contenedor) return;

  const iconClientes = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
  const iconCuadre = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>';

  const iconCuenta = '<span style="vertical-align:middle;margin-right:4px;font-size:13px">🔑</span>';
  const icons = { clientes: iconClientes, cuadre: iconCuadre, cuenta: iconCuenta };
  const tabLabels = { clientes: 'Clientes', cuadre: 'Cuadre', cuenta: 'Tu cuenta' };

  // Búsqueda sin importar tildes ni mayúsculas ("contrasena" encuentra "contraseña")
  const term = _normAyuda(q).trim();
  const filtradas = term === '' ? _SECCIONES_COBRADOR : _SECCIONES_COBRADOR.filter(s =>
    s.keywords.some(k => _normAyuda(k).includes(term)) ||
    _normAyuda(s.titulo.replace(/<[^>]+>/g, '')).includes(term) ||
    _normAyuda(s.contenido.replace(/<[^>]+>/g, '')).includes(term)
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