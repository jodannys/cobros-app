window.genId = () => '_' + Math.random().toString(36).substr(2, 9);

window.hoyPeru = () => {
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  return new Date(hoyStr + 'T00:00:00');
};

window.today = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima'
  });
};
// ── DÍAS NO LABORABLES ───────────────────────────────────────
window.getDiasNoLaborables = function() {
  const cfg = DB._cache['configuracion'] || [];
  const doc = cfg.find(c => c.id === 'dias_no_laborables');
  return Array.isArray(doc?.fechas) ? doc.fechas : [];
};

window.esDiaLaboral = function(fechaStr) {
  const fecha = new Date(fechaStr + 'T00:00:00');
  if (fecha.getDay() === 0) return false;
  return !getDiasNoLaborables().includes(fechaStr);
};
// ── DÍAS HÁBILES (sin domingos) ──────────────────────────────
window.sumarDiasHabiles = function(fechaStr, dias) {
  const diasNoLaborables = getDiasNoLaborables();
  const parts = fechaStr.split('-');
  const fecha = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  let contados = 0;
  while (contados < dias) {
    fecha.setDate(fecha.getDate() + 1);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    if (fecha.getDay() !== 0 && !diasNoLaborables.includes(`${y}-${m}-${d}`)) contados++;
  }
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

window.contarDiasHabiles = function(fechaInicioStr, fechaFinStr) {
  const diasNoLaborables = getDiasNoLaborables();
  const p1 = fechaInicioStr.split('-');
  const p2 = fechaFinStr.split('-');
  const inicio = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
  const fin    = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
  let count = 0;
  const cursor = new Date(inicio);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= fin) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    if (cursor.getDay() !== 0 && !diasNoLaborables.includes(`${y}-${m}-${d}`)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

window.parseMonto = function(valor) {
  return Math.round((parseFloat(valor) || 0) * 100) / 100;
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
  const pagosCr = pagos.filter(p => p.creditoId === creditoId && !p.eliminado);
  if (pagosCr.length === 0) return null;
  const ultimo = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
  const hoyStr = today();
  return contarDiasHabiles(ultimo, hoyStr);
};

window.getAlertasCreditos = function() {
  if (!DB || !DB._cache) return [];

  // No filtrar por c.activo — puede estar obsoleto si se eliminó un pago.
  // La verificación saldoTotal <= 0.1 más adelante descarta los realmente cerrados.
  const creditos = DB._cache['creditos'] || [];
  const clientes = DB._cache['clientes'] || [];
  const users = DB._cache['users'] || [];
  const todosLosPagos = DB._cache['pagos'] || [];
  const alertas = [];
  const hoy = hoyPeru();
  const hoyStr = today();

  creditos.forEach(cr => {
    try {
      const cliente = clientes.find(c => c.id === cr.clienteId);
      if (!cliente) return;

      const cobrador = users.find(u => u.id === cliente.cobradorId) || { nombre: 'Sin Cobrador', id: 'n/a' };
      const pagosCr = todosLosPagos.filter(p => p.creditoId === cr.id && !p.eliminado);
      const totalPagado = pagosCr.reduce((s, p) => s + (Number(p.monto) || 0), 0);
      const saldoTotal = Number(cr.total || 0) - totalPagado;

      if (saldoTotal <= 0.1) return;

      // Siempre recalcular fechaFin con feriados actuales (la guardada puede estar desactualizada)
      const finStr = sumarDiasHabiles(cr.fechaInicio, Number(cr.diasTotal || 0));
      const fFin = new Date(finStr + 'T00:00:00');

      if (hoy > fFin) {
        const diasVencido = contarDiasHabiles(finStr, hoyStr);
        alertas.push({ tipo: 'vencido', cr, cliente, cobrador, saldo: saldoTotal, dias: diasVencido });
      } else {
        // Atrasado — usa la función canónica
        const estado = calcularEstadoAtraso(cr, pagosCr, hoyStr);
        if (estado.atrasado) {
          alertas.push({
            tipo: 'moroso',
            cr, cliente, cobrador,
            saldo: saldoTotal,
            dias: estado.cuotasAtraso
          });
        }
      }
    } catch (e) {
      console.error("Error en alerta individual:", e);
    }
  });

  return alertas;
};


window.obtenerDatosMora = function(credito, pagos) {
  const listaPagos = pagos || (DB && DB._cache ? DB._cache['pagos'] : []) || [];
  const hoy = hoyPeru();

  if (!credito) return { esVencido: false, dias: 0, total: 0, diasInactivo: 0 };

  // Siempre recalcular con feriados actuales para consistencia con el calendario
  const fFin = new Date(sumarDiasHabiles(credito.fechaInicio, Number(credito.diasTotal || 0)) + 'T00:00:00');
  fFin.setHours(0, 0, 0, 0);

  const pagosCr = listaPagos.filter(p => p.creditoId === credito.id && !p.eliminado);
  let fechaRef = credito.fechaInicio;
  if (pagosCr.length > 0) {
    const fechas = pagosCr.map(p => p.fecha).filter(f => f);
    if (fechas.length > 0) fechaRef = fechas.sort((a, b) => b.localeCompare(a))[0];
  }

  const finStr = fFin.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  const hoyStr = today();

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


// ══════════════════════════════════════════════════════════════
// FUNCIÓN CANÓNICA DE ATRASO
// Usada por: calcularMetaReal, getAlertasCreditos,
//            clienteEstaAtrasado, cuotaAtrasada, estaRealmenteAtrasado
// ══════════════════════════════════════════════════════════════
window.calcularEstadoAtraso = function (cr, pagos, fecha) {
  const TOLERANCIA = 0.5;

  if (!cr || !cr.activo) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante: 0 };
  }

  const fechaRef = fecha || today();
  const cuota    = Number(cr.cuotaDiaria) || 0;
  if (cuota <= 0) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante: 0 };
  }

  const pagosNoEliminados = (pagos || []).filter(
    p => p.creditoId === cr.id && !p.eliminado
  );

  const totalPagado   = pagosNoEliminados.reduce((s, p) => s + Number(p.monto), 0);
  const saldoRestante = Math.max(0, Number(cr.total) - totalPagado);

  if (saldoRestante <= TOLERANCIA) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante: 0 };
  }

  const diasTranscurridos = Math.max(0, contarDiasHabiles(cr.fechaInicio, fechaRef) - 1);

  if (diasTranscurridos <= 0) {
    return { atrasado: false, cuotasDebidas: 0, cuotasCubiertas: 0,
             cuotasAtraso: 0, montoAtraso: 0, saldoRestante };
  }

  const cuotasDebidas   = Math.min(diasTranscurridos, Number(cr.diasTotal));
  const cuotasCubiertas = Math.min(
    Math.floor((totalPagado + TOLERANCIA) / cuota),
    cuotasDebidas
  );

  const cuotasAtraso = Math.max(0, cuotasDebidas - cuotasCubiertas);
  const montoAtraso  = Math.round(cuotasAtraso * cuota * 100) / 100;
  const atrasado     = cuotasAtraso > 0;

  return { atrasado, cuotasDebidas, cuotasCubiertas, cuotasAtraso, montoAtraso, saldoRestante };
};

// Aliases para compatibilidad con llamadas existentes en clientes.js
window.clienteEstaAtrasado = function (cr, pagos) {
  return calcularEstadoAtraso(cr, pagos).atrasado;
};

window.cuotaAtrasada = function (cr, pagos) {
  return calcularEstadoAtraso(cr, pagos).cuotasAtraso;
};

window.estaRealmenteAtrasado = function (clienteId) {
  const creditos = DB._cache['creditos'] || [];
  const pagos    = DB._cache['pagos']    || [];
  const cr = creditos.find(c => c.clienteId === clienteId && c.activo);
  if (!cr) return false;
  return calcularEstadoAtraso(cr, pagos).atrasado;
};