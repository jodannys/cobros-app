const _SECCIONES_ADMIN = [
  // ── CLIENTES ──────────────────────────────────────────────
  {
    tab: 'clientes',
    titulo: '📋 Lista de clientes',
    keywords: ['cliente', 'lista', 'todos', 'filtro', 'activo', 'atrasado', 'cerrados', 'sin credito', 'buscar', 'dni', 'negocio', 'nombre'],
    contenido: 'Tu lista muestra todos los clientes con el nombre de su cobrador. Usa los filtros rápidos: <b>Todos · ✅ Activos · 🆕 Sin crédito · 🔴 Atrasados · 🔒 Cerrados</b>. También puedes buscar por nombre, DNI o negocio en la barra de arriba.'
  },
  {
    tab: 'clientes',
    titulo: '⚡ Acciones rápidas desde la lista',
    keywords: ['cobrar', 'cuota', 'pago rapido', 'credito nuevo', 'whatsapp', 'chat', 'boton verde', 'boton azul', 'accion rapida'],
    contenido: '💰 <b>Botón verde</b> → registra una cuota al instante sin entrar a la ficha.<br>➕ <b>Botón azul</b> → crea un crédito nuevo si el cliente no tiene uno activo.<br>💬 <b>Logo de WhatsApp</b> → abre el chat del cliente sin enviar nada.'
  },
  {
    tab: 'clientes',
    titulo: '➕ Crear un cliente',
    keywords: ['crear cliente', 'nuevo cliente', 'cobrador asignado', 'asignar', 'agregar cliente', 'dni repetido', 'ya existe'],
    contenido: 'Toca el botón <b>+</b>, completa los datos y elige el <b>cobrador asignado</b>: ese cobrador verá al cliente en su lista y se encargará de cobrarle. Si el DNI ya está registrado, la app te avisa para que no se repita el cliente.'
  },
  {
    tab: 'clientes',
    titulo: '📷 Foto de la casa o negocio',
    keywords: ['foto', 'camara', 'galeria', 'imagen', 'tomar foto', 'subir foto', 'casa', 'negocio'],
    contenido: 'Al crear o editar un cliente tienes dos botones:<br>📷 <b>Cámara</b> → toma la foto en ese momento.<br>🖼️ <b>Galería</b> → elige una foto que ya tienes en el celular.<br>Toca la foto para verla en grande.'
  },
  {
    tab: 'clientes',
    titulo: '✏️ Editar un cliente',
    keywords: ['editar cliente', 'modificar', 'datos cliente', 'cambiar cobrador', 'reasignar', 'pasar cliente'],
    contenido: 'En la ficha del cliente toca <b>Editar</b> (arriba a la derecha). Puedes cambiar todos sus datos, incluido el cobrador. Si lo pasas a otro cobrador, <b>sus créditos y pagos pasan con él</b>: el nuevo cobrador verá todo y el anterior conserva en su cuadre lo que ya cobró.'
  },
  {
    tab: 'clientes',
    titulo: '🗑️ Eliminar un cliente',
    keywords: ['eliminar cliente', 'borrar cliente', 'quitar cliente', 'deuda', 'sin deuda', 'cliente eliminado'],
    contenido: 'En la ficha toca <b>Editar</b> → <b>Eliminar cliente</b>. El cliente sale de la lista y deja de contar en la caja y el cuadre. <b>Su historial no se pierde</b>: lo encuentras en <b>Historial</b> buscando su nombre o DNI (aparece con la etiqueta roja "Eliminado").<br>Lo que el cliente devuelva vuelve a la caja del cobrador. Si el cobrador te entrega ese dinero, regístralo como <b>depósito</b>.'
  },
  {
    tab: 'clientes',
    titulo: '🧹 Borrar un cliente para siempre',
    keywords: ['eliminar definitivamente', 'borrar para siempre', 'borrar historial', 'cliente de prueba', 'duplicado', 'error'],
    contenido: 'Solo para clientes creados por error, de prueba o duplicados. Primero elimínalo de forma normal. Luego ve a <b>Historial</b>, búscalo, ábrelo y abajo toca <b>🗑️ Eliminar definitivamente</b>. Se borra su historial y ya no aparece en ningún lado. <b>No se puede deshacer.</b> La caja y el cuadre no cambian.'
  },
  {
    tab: 'clientes',
    titulo: '👤 Ficha del cliente',
    keywords: ['perfil', 'ficha', 'editar', 'datos', 'foto', 'ubicacion', 'gps', 'estado de cuenta', 'whatsapp estado', 'telefono', 'direccion'],
    contenido: 'Al tocar un cliente entras a su ficha. Arriba a la derecha puedes <b>editar sus datos</b> (nombre, DNI, teléfono, dirección, foto y ubicación GPS). También puedes enviarle su <b>estado de cuenta por WhatsApp</b>; la app te pide confirmar el número antes de enviar.'
  },
  {
    tab: 'clientes',
    titulo: '💳 Crédito activo',
    keywords: ['credito activo', 'atraso', 'atrasado', 'mora', 'vencido', 'credito cerrado', 'historial', 'agregar pago', 'inicio', 'fin', 'fecha', 'saldo', 'debe'],
    contenido: 'En la ficha ves el crédito activo: fecha de inicio y de fin, <b>cuánto debe</b> y si está atrasado o al día. Las cuotas se empiezan a cobrar <b>al día siguiente</b> de entregado el préstamo. También ves los créditos cerrados anteriores y puedes agregar un pago.'
  },
  {
    tab: 'clientes',
    titulo: '🔧 Corregir monto del crédito',
    keywords: ['corregir monto', 'modificar credito', 'cambiar monto', 'recalcular', 'cuota', 'error monto'],
    contenido: 'Toca <b>Corregir monto</b> en la ficha del crédito si te equivocaste al escribir el monto prestado. La app recalcula la cuota diaria, el total a pagar y el seguro, y la caja del cobrador se actualiza sola. <b>Úsalo solo para corregir errores.</b>'
  },
  {
    tab: 'clientes',
    titulo: '❌ Eliminar un crédito',
    keywords: ['eliminar credito', 'borrar credito', 'anular credito', 'devolver prestamo', 'cliente devuelve', 'pagos', 'caja'],
    contenido: 'Anula el crédito como si nunca se hubiera dado, y sus pagos quedan anulados.<br><b>Ejemplo:</b> préstamo de S/100 con seguro de S/5 (el cliente recibió S/95) y ya pagó S/30 → el cliente devuelve <b>S/65</b>, que vuelven a la caja del cobrador. Antes de eliminar, la app te muestra cuánto es.<br>Si el cobrador te entrega ese dinero, regístralo como <b>depósito</b>. <b>No se puede deshacer.</b>'
  },
  {
    tab: 'clientes',
    titulo: '🔒 Cerrar un crédito',
    keywords: ['cerrar credito', 'credito cerrado', 'reabrir', 'activo', 'inactivo', 'terminar credito'],
    contenido: 'Marca el crédito como terminado sin borrarlo: deja de aparecer como activo pero queda en la ficha como <b>crédito cerrado</b>. Si aún debe algo, la app te avisa antes. Se puede <b>reabrir</b> cuando quieras para seguir cobrando. Cuando el cliente paga todo, el crédito se cierra solo.'
  },
  {
    tab: 'clientes',
    titulo: '🔔 Activar o quitar la mora',
    keywords: ['mora', 'activar mora', 'desactivar mora', 'quitar mora', 'penalidad', 'dias vencidos', 's/5', 'recargo'],
    contenido: 'Cuando el crédito pasa su fecha de fin, puedes activar la mora: suma <b>S/5 por cada día hábil</b> de retraso. El cobrador verá el monto actualizado. Si llegas a un acuerdo con el cliente, puedes quitarla.'
  },
  {
    tab: 'clientes',
    titulo: '💵 Cómo se cobra la mora',
    keywords: ['mora', 'pago con mora', 'saldo', 'total con mora', 'pagado', 'cuanto debe', 'mora pagada'],
    contenido: 'Cuando un cliente con mora paga, el dinero <b>cubre primero la mora</b> y lo que sobra va al préstamo. En la ficha ves por separado el <b>saldo del préstamo</b>, la <b>mora pendiente</b> y el <b>total con mora</b>. La mora que ya pagó no se le vuelve a cobrar. El crédito aparece como <b>"✓ Pagado"</b> solo cuando no debe nada: ni préstamo ni mora.'
  },
  {
    tab: 'clientes',
    titulo: '✏️ Corregir un pago',
    keywords: ['editar pago', 'modificar pago', 'corregir pago', 'monto pago', 'metodo pago', 'lapiz', 'yape', 'efectivo', 'equivoque pago'],
    contenido: 'Toca el lápiz ✏️ debajo del calendario de cuotas para cambiar el monto o la forma de pago (efectivo, Yape, transferencia). La caja del cobrador y el cuadre se corrigen solos con el monto nuevo; no tienes que ajustar nada más.'
  },
  {
    tab: 'clientes',
    titulo: '🚫 Eliminar un pago',
    keywords: ['eliminar pago', 'borrar pago', 'anular pago', 'pago duplicado', 'pago por error', 'pago repetido'],
    contenido: 'Si un pago se registró por error o dos veces, ábrelo con el lápiz ✏️ y toca <b>Eliminar</b>. El pago queda anulado: deja de contar en la caja del cobrador y en el cuadre, y el saldo del cliente vuelve a subir. En el historial del cliente se ve tachado, para que quede constancia. Solo el admin puede eliminar o corregir pagos.'
  },
  {
    tab: 'clientes',
    titulo: '🔔 Cliente con mora — ¿qué hacer?',
    keywords: ['mora', 'moroso', 'vencido', 'notificar', 'gestionar', 'atraso grave', 'que hago', 'que hacer', 'extender plazo', 'compromiso'],
    contenido: 'Si un cliente lleva varios días sin pagar o su crédito ya venció, entra a su ficha y toca <b>Gestionar crédito</b>. Desde ahí puedes activar la mora, extender el plazo, anotar una fecha de compromiso de pago o dejar una nota. También ves la alerta en el panel de Admin.'
  },

  // ── CUADRE ────────────────────────────────────────────────
  {
    tab: 'cuadre',
    titulo: '💰 Panel de capital',
    keywords: ['capital', 'dinero disponible', 'mochilas', 'negocio', 'saldo total', 'objetivo', 'recaudado', 'seguros', 'prestado', 'gastos', 'en la calle'],
    contenido: '• <b>Dinero disponible</b> — lo que tienes tú, listo para entregar<br>• <b>Saldo en mochilas</b> — lo que tienen los cobradores en este momento<br>• <b>Capital total</b> — cuánto vale tu negocio ahora<br>• <b>Objetivo del día</b> — meta de cobro de todos los cobradores<br>• <b>Recaudado hoy</b> — lo cobrado hasta ahora<br>• <b>Seguros cobrados</b> — seguros de los préstamos de hoy<br>• <b>Prestado hoy</b> — préstamos entregados hoy<br>• <b>Gastos totales</b> — gastos de los cobradores y tuyos'
  },
  {
    tab: 'cuadre',
    titulo: '🔄 Cómo se mueve el dinero',
    keywords: ['como funciona', 'dinero', 'cuadrar', 'no cuadra', 'enviar', 'deposito', 'mochila', 'disponible', 'prestar', 'explicacion'],
    contenido: 'El dinero pasa de una mano a otra, nunca aparece ni desaparece:<br>• <b>Envías dinero o caja chica</b> a un cobrador → baja tu disponible y sube su caja.<br>• <b>El cobrador presta</b> → baja su caja (menos el seguro, que se queda con él).<br>• <b>El cobrador cobra cuotas</b> → sube su caja.<br>• <b>El cobrador te entrega dinero</b> (depósito, cuando tú lo confirmas) → baja su caja y sube tu disponible.<br>Prestar <b>no</b> resta de tu disponible: ese dinero ya salió de ti cuando se lo enviaste al cobrador.'
  },
  {
    tab: 'cuadre',
    titulo: '☰ Menú de movimientos',
    keywords: ['menu', 'inyeccion', 'inyectar', 'gasto admin', 'retiro personal', 'enviar caja', 'caja chica', 'cobrador', 'movimiento', 'tres rayas'],
    contenido: '• <b>Inyectar capital</b> — dinero propio que metes al negocio<br>• <b>Gasto admin</b> — gastos del negocio pagados de tu dinero<br>• <b>Retiro personal</b> — dinero que sacas para ti<br>• <b>Enviar a cobrador</b> — le das dinero a un cobrador para trabajar (sale de tu disponible)<br>• <b>Retirar de cobrador</b> — recibes dinero de un cobrador al instante, sin que él confirme. <b>Coordínalo antes.</b>'
  },
  {
    tab: 'cuadre',
    titulo: '🧾 Revisar créditos eliminados antes de la actualización',
    keywords: ['ajustes viejos', 'revisar ajustes', 'no contar', 'volver a contar', 'saldo raro', 'no cuadra', 'credito eliminado antes', 'baja credito', 'baja cliente'],
    contenido: 'Solo aparece en el menú ☰ si tienes créditos o clientes eliminados con la versión anterior de la app. Esa versión, al eliminar, <b>sumaba dinero a tu disponible y restaba de más al cobrador</b>, así que esos saldos pueden verse mal.<br>Revisa cada movimiento de la lista:<br>• Si ese dinero <b>no</b> llegó a tus manos → toca <b>No contar</b>.<br>• Si el cobrador <b>sí</b> te lo entregó → toca <b>No contar</b> y regístralo como depósito con el monto real.<br>No se borra nada, y puedes tocar <b>Volver a contar</b> si te equivocas.'
  },
  {
    tab: 'cuadre',
    titulo: '🔔 Depósitos del cobrador por confirmar',
    keywords: ['notificacion', 'retiro', 'deposito', 'confirmar', 'circulo rojo', 'cobrador entrega', 'pendiente', 'yape cobrador'],
    contenido: 'Cuando un cobrador te entrega dinero con el botón <b>Retirar</b>, aparece un <b>círculo rojo con un número</b> en la pestaña Cuadre. <b>Confírmalo</b> cuando recibas el dinero: recién ahí se descuenta de su caja y se suma a tu disponible. <b>Confírmalo el mismo día</b> para que el cuadre cierre bien.'
  },
  {
    tab: 'cuadre',
    titulo: '📋 Movimientos recientes',
    keywords: ['movimientos', 'lista', 'ver mas', 'ver menos', 'inyeccion', 'deposito', 'retiro', 'historial movimientos'],
    contenido: 'Lista de los últimos 5 movimientos (inyecciones, retiros, envíos, depósitos y otros). Toca <b>Ver más</b> para ver todos y <b>Ver menos</b> para cerrar la lista.'
  },
  {
    tab: 'cuadre',
    titulo: '💼 Dinero en la caja de cada cobrador',
    keywords: ['caja cobrador', 'mochila', 'resumen cobrador', 'enviar dinero', 'saldo cobrador', 'negativo', 'debe'],
    contenido: 'Muestra cuánto dinero tiene cada cobrador en este momento, con un botón para <b>enviarle dinero</b> directamente. Si un número sale en <b>negativo</b>, el cobrador entregó o gastó más de lo que tenía: revisa sus movimientos.'
  },
  {
    tab: 'cuadre',
    titulo: '📈 Rendimiento por cobrador',
    keywords: ['rendimiento', 'meta cobrador', 'recaudado', 'detalle cobrador', 'gastos cobrador', 'saldo', 'registrar gasto'],
    contenido: 'Para cada cobrador ves cuánto lleva cobrado y cuál es su meta. En el detalle ves: dinero con el que empezó el día, cobros, préstamos entregados, gastos y lo que tiene ahora. Desde aquí puedes <b>registrarle un gasto</b> (él también lo verá) y <b>enviarle dinero</b>.'
  },

  // ── ADMIN ─────────────────────────────────────────────────
  {
    tab: 'admin',
    titulo: '🚨 Panel de alertas',
    keywords: ['alertas', 'atrasados', 'vencidos', 'gestion credito', 'penalidad', 'plazo', 'compromiso', 'mora admin'],
    contenido: 'Al entrar ves las alertas de créditos atrasados o vencidos. Al tocar <b>Gestionar</b> puedes: activar o quitar la mora, extender el plazo, anotar una fecha de compromiso o dejar una nota.'
  },
  {
    tab: 'admin',
    titulo: '👤 Cobradores',
    keywords: ['cobrador', 'agregar cobrador', 'crear cobrador', 'editar cobrador', 'usuario', 'whatsapp cobrador', 'alerta cobrador'],
    contenido: 'Lista de todos tus cobradores. Puedes agregar nuevos o editar los que ya tienes (nombre, usuario, contraseña, teléfono). El logo de WhatsApp abre su chat. Si un cobrador tiene clientes vencidos o atrasados, verás un <b>indicador rojo</b> con la cantidad.'
  },
  {
    tab: 'admin',
    titulo: '👁️ Qué puede hacer un cobrador',
    keywords: ['permisos', 'cobrador puede', 'que ve el cobrador', 'seguridad', 'privacidad', 'solo sus clientes', 'no puede'],
    contenido: 'Cada cobrador <b>solo ve sus propios clientes</b>, su caja y sus movimientos: no ve los de otros cobradores.<br>✅ <b>Puede:</b> crear y editar sus clientes, dar créditos, registrar pagos, anotar sus gastos y notas, y entregarte dinero (que tú confirmas).<br>🚫 <b>No puede:</b> corregir ni eliminar pagos, eliminar clientes o créditos, activar la mora, confirmar sus propios depósitos ni asignarse dinero. Eso lo haces tú.'
  },
  {
    tab: 'admin',
    titulo: '🗑️ Eliminar un cobrador',
    keywords: ['eliminar cobrador', 'borrar cobrador', 'quitar cobrador', 'clientes del cobrador', 'reasignar'],
    contenido: 'En la ficha del cobrador toca <b>Editar</b> → <b>Eliminar cobrador</b>.<br><b>⚠️ Cuidado:</b> se borran también <b>todos sus clientes, créditos, pagos y movimientos</b>. Si quieres conservar a sus clientes, primero pásalos a otro cobrador (Editar cliente → Cobrador) y después elimínalo. <b>No se puede deshacer.</b>'
  },
  {
    tab: 'admin',
    titulo: '🗺️ Ficha del cobrador',
    keywords: ['perfil cobrador', 'cuadre fecha', 'mapa cobrador', 'clientes cobrador', 'filtrar clientes', 'saldo cobrador'],
    contenido: 'Al tocar un cobrador ves: cuántos clientes tiene, sus cuadres de días anteriores (cambiando la fecha), su caja, sus gastos y sus clientes en el <b>mapa</b> según su ubicación GPS, útil para revisar zonas y planificar rutas.'
  },
  {
    tab: 'admin',
    titulo: '👥 Clientes del cobrador',
    keywords: ['clientes cobrador', 'filtrar cobrador', 'activos cobrador', 'atrasados cobrador', 'sin credito cobrador', 'buscar'],
    contenido: 'Dentro de la ficha del cobrador puedes buscar y filtrar sus clientes: <b>Todos · ✅ Activos · 🔴 Atrasados · 🆕 Sin crédito</b>. Al tocar un cliente entras a su ficha completa.'
  },
  {
    tab: 'admin',
    titulo: '📅 Días no laborables',
    keywords: ['feriado', 'no laborable', 'bloquear dia', 'domingo', 'cuotas', 'deuda', 'meta', 'calendario'],
    contenido: 'Agrega las fechas en que no se cobra. Ese día: los clientes no deben cuota, los cobradores no tienen meta y no se acumula deuda. En el calendario de cuotas se ve con 🎉. <b>Afecta a todos los cobradores.</b>'
  },

  // ── HISTORIAL ─────────────────────────────────────────────
  {
    tab: 'historial',
    titulo: '📊 Resumen del día',
    keywords: ['resumen', 'cobrado', 'gastos', 'prestado', 'seguros', 'tarjetas', 'totales', 'dia'],
    contenido: 'Arriba ves cuatro números del día elegido: <b>Cobrado · Gastos · Prestado · Seguros</b>. Toca cualquiera para ver su detalle. Si eliges un cobrador, solo ves lo de él.'
  },
  {
    tab: 'historial',
    titulo: '📆 Cambiar de día',
    keywords: ['fecha', 'dia anterior', 'flechas', 'calendario', 'ayer', 'hoy', 'otro dia'],
    contenido: 'Usa las flechas <b>‹ ›</b> para ir al día anterior o al siguiente. <b>Toca la fecha</b> para abrir el calendario y elegir cualquier día. No se pueden elegir días futuros.'
  },
  {
    tab: 'historial',
    titulo: '🔍 Buscar un cliente',
    keywords: ['buscar cliente', 'nombre', 'dni', 'historial cliente', 'estado credito', 'whatsapp historial', 'cliente eliminado', 'eliminado'],
    contenido: 'Escribe el <b>nombre o DNI</b> en la barra de arriba. Al tocar un cliente ves todos sus créditos y pagos, y puedes enviarle su estado por WhatsApp.<br>También aparecen los <b>clientes eliminados</b> (con etiqueta roja "Eliminado"), para que consultes qué pagaron. La <b>X</b> borra la búsqueda.'
  },
  {
    tab: 'historial',
    titulo: '🗂️ Pagos, gastos y créditos del día',
    keywords: ['filtro', 'cobrador', 'pagos', 'gastos', 'creditos', 'yape', 'efectivo', 'transferencia', 'hora', 'ruta', 'admin', 'retiro', 'ajuste', 'debe mora'],
    contenido: '• <b>Pagos</b> — del más reciente al más antiguo, con la hora y totales por <b>Efectivo · Yape · Transferencia</b>.<br>• <b>Gastos</b> — cada uno con su etiqueta: <b>Ruta</b> (del cobrador), <b>Admin</b> (tuyos), <b>Retiro</b> (retiros personales) o <b>Ajuste</b> (descuentos automáticos de la caja de un cobrador).<br>• <b>Créditos</b> — préstamos entregados ese día con su avance y estado: <b>Activo</b>, <b>✓ Cerrado</b> o <b>Debe mora</b>.<br>Puedes filtrar por cobrador.'
  },
  {
    tab: 'historial',
    titulo: '📆 Cómo se cuentan las cuotas',
    keywords: ['domingo', 'cuota domingo', 'atrasado', 'dias habiles', 'logica', 'como cuenta', 'pago atrasado', 'dia siguiente'],
    contenido: 'Las cuotas empiezan <b>al día siguiente</b> de entregado el préstamo. <b>No se cobra los domingos</b> ni los días no laborables. Un cliente está atrasado cuando las cuotas que pagó son menos que los días que ya le tocaba pagar. La mora pagada no cuenta como cuota.'
  },

  // ── TU CUENTA ─────────────────────────────────────────────
  {
    tab: 'cuenta',
    titulo: '🔐 Iniciar sesión',
    keywords: ['iniciar sesion', 'entrar', 'login', 'usuario', 'contraseña', 'clave', 'recordarme', 'no puedo entrar'],
    contenido: 'Entra con tu <b>usuario y contraseña</b>. Si marcas <b>Recordarme</b>, no tendrás que volver a escribirla en ese celular. Si sale "Contraseña incorrecta", revisa mayúsculas y espacios.'
  },
  {
    tab: 'cuenta',
    titulo: '🔑 Código de recuperación (hazlo hoy)',
    keywords: ['codigo de recuperacion', 'recuperar', 'generar codigo', 'olvide', 'clave', 'contraseña', 'seguridad'],
    contenido: 'Sirve para cambiar tu clave si un día la olvidas. Ve a <b>Admin → toca tu nombre (Editar admin) → Generar código</b>. Aparece un código como <b>K7PM-Q2XD</b>: <b>anótalo en papel y guárdalo</b>, porque no se vuelve a mostrar. Cada código sirve una sola vez; después de usarlo, genera otro.'
  },
  {
    tab: 'cuenta',
    titulo: '❓ Olvidé mi contraseña',
    keywords: ['olvide mi clave', 'olvide contraseña', 'no recuerdo', 'recuperar clave', 'cambiar clave', 'perdi clave'],
    contenido: 'En la pantalla de inicio escribe tu usuario y cualquier clave. Al salir "Contraseña incorrecta", aparece <b>"¿Olvidaste tu clave?"</b>. Tócalo, escribe tu usuario, tu <b>código de recuperación</b> y la clave nueva. Si no tienes código, pídele a otro administrador que te la cambie. Tras 5 intentos fallidos se bloquea 30 minutos.'
  },
  {
    tab: 'cuenta',
    titulo: '🔁 Cambiar la clave de un cobrador o admin',
    keywords: ['cambiar clave', 'cambiar contraseña', 'cobrador olvido', 'nueva clave', 'resetear', 'clave cobrador'],
    contenido: 'Si un cobrador olvida su clave, entra a su ficha → <b>Editar</b> y escribe una contraseña nueva; luego díselo. Lo mismo para otro administrador. Deja el campo vacío si no quieres cambiarla. <b>Consejo:</b> ten siempre <b>dos administradores</b>, por si uno olvida su clave.'
  },
  {
    tab: 'cuenta',
    titulo: '📴 Sin señal o sin internet',
    keywords: ['sin señal', 'sin internet', 'offline', 'no carga', 'guardando', 'sin datos', 'conexion'],
    contenido: 'Puedes seguir trabajando sin señal: lo que guardes queda en el celular y aparece el aviso <b>"📴 Sin señal: guardado en el celular"</b>. Cuando vuelve la señal se envía solo y sale <b>"✅ Datos enviados a la nube"</b>. <b>No vuelvas a registrar lo mismo.</b> Evita cerrar la app hasta ver ese aviso.'
  },
  {
    tab: 'cuenta',
    titulo: '🔄 La app no se actualiza',
    keywords: ['actualizar', 'version nueva', 'no se ve', 'cambios', 'recargar', 'no aparece'],
    contenido: 'Si no ves algo nuevo, <b>cierra la pestaña de la app y ábrela de nuevo</b>. Los datos se actualizan solos y en vivo: lo que registra un cobrador lo ves al momento.'
  },

  // ── IMPORTANTE ────────────────────────────────────────────
  {
    tab: 'importante',
    titulo: '⚠️ Cosas importantes',
    keywords: ['importante', 'cuidado', 'advertencia', 'precaucion', 'eliminar', 'corregir', 'coordinar', 'confirmar'],
    contenido: '• <b>Eliminar un cobrador</b> borra también todos sus clientes. Pásalos a otro cobrador antes.<br>• <b>Eliminar un crédito o un cliente</b> no se puede deshacer. Si el cobrador te entrega dinero, regístralo como depósito.<br>• <b>Confirma los depósitos</b> de los cobradores el mismo día para que el cuadre cierre bien.<br>• <b>Retirar de cobrador</b> es inmediato: coordínalo antes.<br>• <b>Corregir monto</b> de un crédito es solo para errores.<br>• Los <b>días no laborables</b> afectan a todos los cobradores.<br>• Guarda tu <b>código de recuperación</b> en papel.'
  },

  // ── SALIR ─────────────────────────────────────────────────
  {
    tab: 'salir',
    titulo: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar sesión',
    keywords: ['salir', 'cerrar sesion', 'sesion', 'logout', 'terminar'],
    contenido: 'Toca <b>Salir</b> en la barra de abajo para cerrar tu sesión. Si hay datos sin enviar por falta de señal, espera a que se envíen antes de salir.'
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

  const iconCuenta = '<span style="vertical-align:middle;margin-right:4px;font-size:13px">🔑</span>';
  const icons = { clientes: iconClientes, cuadre: iconCuadre, admin: iconAdmin, historial: iconHistorial, cuenta: iconCuenta, importante: iconImportante, salir: iconSalir };
  const tabLabels = { clientes: 'Clientes', cuadre: 'Cuadre', admin: 'Admin', historial: 'Historial', cuenta: 'Tu cuenta', importante: 'Importante', salir: 'Salir' };

  // Búsqueda sin importar tildes ni mayúsculas ("contrasena" encuentra "contraseña")
  const term = _normAyuda(q).trim();
  const filtradas = term === '' ? _SECCIONES_ADMIN : _SECCIONES_ADMIN.filter(s =>
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