// ══════════════════════════════════════════════════════════════
// HELPERS GLOBALES (Compatibles con Vite/Modules)
// ══════════════════════════════════════════════════════════════

window.genId = () => '_' + Math.random().toString(36).substr(2, 9);

// ── HORA PERUANA (UTC-5) ─────────────────────────────────────
window.hoyPeru = () => {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - (ahora.getTimezoneOffset() + 300));
  return new Date(ahora.toISOString().split('T')[0] + 'T00:00:00');
};

window.today = () => {
  const ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - (ahora.getTimezoneOffset() + 300));
  return ahora.toISOString().split('T')[0];
};

// ── DÍAS HÁBILES (sin domingos) ──────────────────────────────
window.sumarDiasHabiles = function(fechaStr, dias) {
  const parts = fechaStr.split('-');
  const fecha = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  let contados = 0;
  while (contados < dias) {
    fecha.setDate(fecha.getDate() + 1);
    if (fecha.getDay() !== 0) contados++;
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

window.contarDiasHabiles = function(fechaInicioStr, fechaFinStr) {
  const p1 = fechaInicioStr.split('-');
  const p2 = fechaFinStr.split('-');
  const inicio = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
  const fin = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
  let count = 0;
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= fin) {
    if (cursor.getDay() !== 0) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

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
};

window.showToast = function (msg, type = 'success') {
    state.toast = { msg, type };
    render();
    setTimeout(() => { state.toast = null; render(); }, 2500);
};

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
};

window.calcularFechaFin = function(fechaInicio, dias) {
  if (!fechaInicio) return '—';
  const fechaFin = sumarDiasHabiles(fechaInicio, dias);
  return formatDate(fechaFin);
};

window.estaVencido = function(fechaInicio, dias) {
  if (!fechaInicio) return false;
  const finStr = sumarDiasHabiles(fechaInicio, dias);
  const fin = new Date(finStr + 'T00:00:00');
  return hoyPeru() > fin;
};

window.diasSinPagar = function(creditoId) {
  const pagos = DB._cache['pagos'] || [];
  const pagosCr = pagos.filter(p => p.creditoId === creditoId);
  if (pagosCr.length === 0) return null;
  const ultimo = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
  const hoyStr = hoyPeru().toISOString().split('T')[0];
  return contarDiasHabiles(ultimo, hoyStr);
};

window.getAlertasCreditos = function() {
  if (!DB || !DB._cache) return [];

  const creditos = (DB._cache['creditos'] || []).filter(c => c.activo === true);
  const clientes = DB._cache['clientes'] || [];
  const users = DB._cache['users'] || [];
  const todosLosPagos = DB._cache['pagos'] || [];
  const alertas = [];
  const hoy = hoyPeru();
  const hoyStr = hoy.toISOString().split('T')[0];

 creditos.forEach(cr => {
    try {
      const cliente = clientes.find(c => c.id === cr.clienteId);
      if (!cliente) return;

      const cobrador = users.find(u => u.id === cliente.cobradorId) || { nombre: 'Sin Cobrador', id: 'n/a' };
      const pagosCr = todosLosPagos.filter(p => p.creditoId === cr.id);
      const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
      const saldo = Number(cr.total || 0) - totalPagado;

      if (saldo < 1) return;

      // Fecha fin
      let fFin;
      if (cr.fechaFin && cr.fechaFin !== 'undefined') {
        fFin = new Date(cr.fechaFin + 'T00:00:00');
      } else {
        const finStr = sumarDiasHabiles(cr.fechaInicio, Number(cr.diasTotal || 0));
        fFin = new Date(finStr + 'T00:00:00');
      }
      fFin.setHours(0, 0, 0, 0);
      const finStr = fFin.toISOString().split('T')[0];

      if (hoy > fFin) {
        // VENCIDO
        const diasVencido = contarDiasHabiles(finStr, hoyStr);
        alertas.push({ tipo: 'vencido', cr, cliente, cobrador, saldo, dias: diasVencido || 0 });
      } else {
        // ATRASADO — misma lógica que clienteEstaAtrasado
        const diasTranscurridos = Math.max(0, contarDiasHabiles(cr.fechaInicio, hoyStr) - 1);
        if (diasTranscurridos <= 0) return;
        const cuotasDebidas = Math.min(diasTranscurridos, cr.diasTotal);
        const cuotasCubiertas = Math.floor(totalPagado / (cr.cuotaDiaria || 1));
        if (cuotasCubiertas < cuotasDebidas) {
          const dias = cuotasDebidas - cuotasCubiertas;
          alertas.push({ tipo: 'moroso', cr, cliente, cobrador, saldo, dias });
        }
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

window.obtenerDatosMora = function(credito, pagos) {
  const listaPagos = pagos || (DB && DB._cache ? DB._cache['pagos'] : []) || [];
  const hoy = hoyPeru();

  if (!credito) return { esVencido: false, dias: 0, total: 0, diasInactivo: 0 };

  let fFin;
  if (credito.fechaFin && credito.fechaFin !== 'undefined') {
    fFin = new Date(credito.fechaFin + 'T00:00:00');
  } else {
    const finStr = sumarDiasHabiles(credito.fechaInicio, Number(credito.diasTotal || 0));
    fFin = new Date(finStr + 'T00:00:00');
  }
  fFin.setHours(0, 0, 0, 0);

  const pagosCr = listaPagos.filter(p => p.creditoId === credito.id);
  let fechaRef = credito.fechaInicio;
  if (pagosCr.length > 0) {
    const fechas = pagosCr.map(p => p.fecha).filter(f => f);
    if (fechas.length > 0) fechaRef = fechas.sort((a, b) => b.localeCompare(a))[0];
  }

  const finStr = fFin.toISOString().split('T')[0];
  const hoyStr = hoy.toISOString().split('T')[0];

  const esVencido = hoy > fFin;
  const diasDeMora = esVencido ? contarDiasHabiles(finStr, hoyStr) : 0;
  const diasInactividad = contarDiasHabiles(fechaRef, hoyStr);

  return {
    esVencido,
    dias: diasDeMora,
    diasVencido: diasDeMora,
    diasInactivo: diasInactividad,
    total: (credito.mora_activa && diasDeMora > 0) ? (diasDeMora * 5) : 0
  };
};

window.calcularMora = function (cr) {
    const info = obtenerDatosMora(cr);
    return info.total || 0;
};

window.mostrarPagoExitoso = function (titulo, subtitulo, esCierre) {
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

    setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.remove();
        }
    }, 3000);
};