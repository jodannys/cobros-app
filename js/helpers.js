// ══════════════════════════════════════════════════════════════
// HELPERS GLOBALES (Compatibles con Vite/Modules)
// ══════════════════════════════════════════════════════════════

window.genId = () => '_' + Math.random().toString(36).substr(2, 9);

window.today = () => new Date().toISOString().split('T')[0];

window.formatDate = (d) => { 
    if (!d) return ''; 
    const [y, m, dd] = d.split('-'); 
    return `${dd}/${m}/${y}`; 
};

window.formatMoney = function(amount) {
    const num = Number(amount) || 0;
    return 'S/ ' + num.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

window.showToast = function(msg, type = 'success') {
    state.toast = { msg, type };
    render();
    setTimeout(() => { state.toast = null; render(); }, 2500);
}

window.previewFoto = function(input, previewId) {
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

window.calcularFechaFin = function(fechaInicio, dias) {
    if (!fechaInicio) return '—';
    const fecha = new Date(fechaInicio + 'T00:00:00');
    fecha.setDate(fecha.getDate() + dias);
    return formatDate(fecha.toISOString().split('T')[0]);
}

window.estaVencido = function(fechaInicio, dias) {
    if (!fechaInicio) return false;
    const fin = new Date(fechaInicio + 'T00:00:00');
    fin.setDate(fin.getDate() + dias);
    return new Date() > fin;
}

window.diasSinPagar = function(creditoId) {
    const pagos = DB._cache['pagos'] || [];
    const pagosCr = pagos.filter(p => p.creditoId === creditoId);
    if (pagosCr.length === 0) return null;
    const ultimo = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
    return Math.floor((new Date() - new Date(ultimo + 'T00:00:00')) / (1000 * 60 * 60 * 24));
}

window.getAlertasCreditos = function() {
    const creditos = (DB._cache['creditos'] || []).filter(c => c.activo);
    const clientes = DB._cache['clientes'] || [];
    const users = DB._cache['users'] || [];
    const alertas = [];

    creditos.forEach(cr => {
        const cliente = clientes.find(c => c.id === cr.clienteId);
        const cobrador = users.find(u => u.id === cliente?.cobradorId);
        const pagos = (DB._cache['pagos'] || []).filter(p => p.creditoId === cr.id);
        const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
        const saldo = cr.total - totalPagado;
        const vencido = estaVencido(cr.fechaInicio, cr.diasTotal);
        const dias = diasSinPagar(cr.id);

        if (vencido && saldo > 0) {
            alertas.push({ tipo: 'vencido', cr, cliente, cobrador, saldo, dias });
        } else if (dias !== null && dias >= 2 && saldo > 0) {
            alertas.push({ tipo: 'moroso', cr, cliente, cobrador, saldo, dias });
        }
    });

    return alertas;
}

window.calcularMora = function(cr) {
    if (!cr.activo || !cr.mora_activa) return 0;
    const pagos = DB._cache['pagos'] || [];
    const totalPagado = pagos.filter(p => p.creditoId === cr.id).reduce((s, p) => s + p.monto, 0);
    const saldo = cr.total - totalPagado;
    if (saldo <= 0) return 0;
    const vencido = estaVencido(cr.fechaInicio, cr.diasTotal);
    if (!vencido) return 0;
    const fin = new Date(cr.fechaInicio + 'T00:00:00');
    fin.setDate(fin.getDate() + cr.diasTotal);
    const diasMora = Math.floor((new Date() - fin) / (1000 * 60 * 60 * 24));
    return diasMora > 0 ? diasMora * 5 : 0;
}

window.mostrarPagoExitoso = function(titulo, subtitulo, esCierre) {
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
    setTimeout(() => overlay?.remove(), 3000);
}