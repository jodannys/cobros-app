// ══════════════════════════════════════════════════════════════
// HELPERS GLOBALES (Compatibles con Vite/Modules)
// ══════════════════════════════════════════════════════════════

window.genId = () => '_' + Math.random().toString(36).substr(2, 9);

window.today = () => new Date().toISOString().split('T')[0];

window.parseMonto = function parseMonto(valor) {
    return Math.round(parseFloat(valor) || 0);
};
window.formatDate = (d) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-');
    return `${dd}/${m}/${y}`;
};

window.formatMoney = function (amount) {
    const num = Number(amount) || 0;
    return 'S/ ' + num.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

window.showToast = function (msg, type = 'success') {
    state.toast = { msg, type };
    render();
    setTimeout(() => { state.toast = null; render(); }, 2500);
}

window.previewFoto = function (input, previewId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById(previewId);
        img.src = e.target.result;
        img.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

window.calcularFechaFin = function (fechaInicio, dias) {
    if (!fechaInicio) return '—';
    const fecha = new Date(fechaInicio + 'T00:00:00');
    fecha.setDate(fecha.getDate() + dias);
    return formatDate(fecha.toISOString().split('T')[0]);
}

window.estaVencido = function (fechaInicio, dias) {
    if (!fechaInicio) return false;
    const fin = new Date(fechaInicio + 'T00:00:00');
    fin.setDate(fin.getDate() + dias);
    return new Date() > fin;
}

window.diasSinPagar = function (creditoId) {
    const pagos = DB._cache['pagos'] || [];
    const pagosCr = pagos.filter(p => p.creditoId === creditoId);
    if (pagosCr.length === 0) return null;
    const ultimo = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
    return Math.floor((new Date() - new Date(ultimo + 'T00:00:00')) / (1000 * 60 * 60 * 24));
}

window.getAlertasCreditos = function () {
    if (!DB || !DB._cache) return [];

    const creditos = (DB._cache['creditos'] || []).filter(c => c.activo === true);
    const clientes = DB._cache['clientes'] || [];
    const users = DB._cache['users'] || [];
    const todosLosPagos = DB._cache['pagos'] || [];
    const alertas = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    creditos.forEach(cr => {
        try {
            // 1. Validaciones de Seguridad (Evita que el Admin se rompa)
            const cliente = clientes.find(c => c.id === cr.clienteId);
            if (!cliente) return; // Si el cliente no existe, ignoramos el crédito

            const cobrador = users.find(u => u.id === cliente.cobradorId) || { nombre: 'Sin Cobrador', id: 'n/a' };

            const pagosCr = todosLosPagos.filter(p => p.creditoId === cr.id);
            const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
            const saldo = Number(cr.total || 0) - totalPagado;

            if (saldo < 1) return; // Si ya pagó, no es alerta

            // 2. Cálculo de Fechas
            let fFin;
            if (cr.fechaFin && cr.fechaFin !== 'undefined') {
                fFin = new Date(cr.fechaFin + 'T00:00:00');
            } else {
                fFin = new Date(cr.fechaInicio + 'T00:00:00');
                fFin.setDate(fFin.getDate() + Number(cr.diasTotal || 0));
            }
            fFin.setHours(0, 0, 0, 0);

            // 3. Días de Inactividad
            const fechasPagos = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a));
            const ultimaFechaRef = fechasPagos.length > 0 ? fechasPagos[0] : cr.fechaInicio;
            const uAbono = new Date(ultimaFechaRef + 'T00:00:00');
            uAbono.setHours(0, 0, 0, 0);
            const diasInactivo = Math.floor((hoy - uAbono) / (1000 * 60 * 60 * 24));

            // 4. Clasificación de Alertas
            if (hoy > fFin) {
                const diasVencido = Math.floor((hoy - fFin) / (1000 * 60 * 60 * 24));
                alertas.push({
                    tipo: 'vencido',
                    cr, // Pasamos el objeto crédito completo para el botón "Gestionar"
                    cliente,
                    cobrador,
                    saldo,
                    dias: diasVencido || 0
                });
            } else if (diasInactivo >= 2) {
                alertas.push({
                    tipo: 'moroso',
                    cr,
                    cliente,
                    cobrador,
                    saldo,
                    dias: diasInactivo || 0
                });
            }
        } catch (e) {
            console.error("Error en crédito individual:", e);
        }
    });

    return alertas;
};


// Función auxiliar para evitar errores de fecha
function calcularFechaFinSimple(inicio, dias) {
    const d = new Date(inicio + 'T00:00:00');
    d.setDate(d.getDate() + Number(dias));
    return d.toISOString().split('T')[0];
}



window.calcularMora = function (cr) {
    // Si no hay crédito, no está activo o la mora está apagada, 0 soles.
    if (!cr || !cr.mora_activa || !cr.activo) return 0;

    // Llamamos a la función optimizada que ya tienes para obtener los días
    const info = obtenerDatosMora(cr);
    
    // Si ya venció (diasVencido > 0), multiplicamos por S/ 5
    if (info.diasVencido > 0) {
        return info.diasVencido * 5;
    }

    return 0;
};
// Versión optimizada: Una sola lógica para todo
window.obtenerDatosMora = function (credito, pagos) {
    // 1. SEGURIDAD DE ENTRADA
    const listaPagos = pagos || (DB && DB._cache ? DB._cache['pagos'] : []) || [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (!credito) return { esVencido: false, dias: 0, total: 0, diasInactivo: 0 };

    // 2. REPARACIÓN DE FECHA FIN (Si noz existe, la calculamos al vuelo)
    let fFin;
    if (credito.fechaFin && credito.fechaFin !== 'undefined') {
        fFin = new Date(credito.fechaFin + 'T00:00:00');
    } else {
        // Si no hay fecha fin, usamos Inicio + diasTotal
        fFin = new Date(credito.fechaInicio + 'T00:00:00');
        fFin.setDate(fFin.getDate() + Number(credito.diasTotal || 0));
    }
    fFin.setHours(0, 0, 0, 0);

    // 3. CÁLCULO DE ÚLTIMO PAGO
    const pagosCr = listaPagos.filter(p => p.creditoId === credito.id);
    let fechaRef = credito.fechaInicio;
    if (pagosCr.length > 0) {
        const fechas = pagosCr.map(p => p.fecha).filter(f => f); // quitar nulos
        if (fechas.length > 0) {
            fechaRef = fechas.sort((a, b) => b.localeCompare(a))[0];
        }
    }
    const fUltimo = new Date(fechaRef + 'T00:00:00');
    fUltimo.setHours(0, 0, 0, 0);

    // 4. CÁLCULO DE DÍAS
    const difVencimiento = Math.floor((hoy - fFin) / (1000 * 60 * 60 * 24));
    const diasInactividad = Math.floor((hoy - fUltimo) / (1000 * 60 * 60 * 24));

   const esVencido = hoy > fFin;
    const diasDeMora = esVencido ? difVencimiento : 0;

    return {
        esVencido: esVencido,
        dias: diasDeMora, // Usamos solo los días de vencimiento para el cobro
        diasVencido: diasDeMora,
        diasInactivo: diasInactividad,
        // CLAVE: Si la mora está activa, multiplicamos por S/ 5
        total: (credito.mora_activa && diasDeMora > 0) ? (diasDeMora * 5) : 0 
    };
};
// Reparamos también la función calcularMora para que no de error
window.calcularMora = function (cr) {
    const info = obtenerDatosMora(cr);
    return info.total || 0;
};

window.mostrarPagoExitoso = function (titulo, subtitulo, esCierre) {
    // 1. SI YA EXISTE UN MODAL DE PAGO, NO HACER NADA
    if (document.querySelector('[data-overlay="pago"]')) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.6);
    z-index:99999;display:flex;align-items:center;
    justify-content:center;animation:fadeIn 0.2s ease`;

    overlay.innerHTML = `
    <div style="background:white;border-radius:24px;padding:32px 28px;
      text-align:center;max-width:300px;width:90%;
      animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      <div style="font-size:64px;margin-bottom:16px;animation:bounce 0.6s ease 0.2s both">
        ${esCierre ? '🎉' : '✅'}
      </div>
      <div style="font-size:20px;font-weight:800;color:#1e293b;margin-bottom:8px">${titulo}</div>
      <div style="font-size:14px;color:#64748b;margin-bottom:24px;line-height:1.5">${subtitulo}</div>
      <button onclick="this.closest('[data-overlay]').remove()"
        style="background:#1a56db;color:white;border:none;border-radius:12px;
        padding:13px 32px;font-size:15px;font-weight:700;cursor:pointer;width:100%">
        Aceptar
      </button>
      <div style="height:4px;background:#e2e8f0;border-radius:4px;margin-top:16px;overflow:hidden">
        <div style="height:100%;background:#1a56db;border-radius:4px;
          animation:progreso 3s linear forwards"></div>
      </div>
    </div>`;

    overlay.setAttribute('data-overlay', 'pago');
    
    // Al hacer clic fuera, también removemos el overlay
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    if (!document.getElementById('animaciones-pago')) {
        const style = document.createElement('style');
        style.id = 'animaciones-pago';
        style.textContent = `
            @keyframes fadeIn { from{opacity:0} to{opacity:1} }
            @keyframes popIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
            @keyframes bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
            @keyframes progreso { from{width:100%} to{width:0%} }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.remove();
        }
    }, 3000);
}