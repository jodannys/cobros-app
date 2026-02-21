const genId = () => '_' + Math.random().toString(36).substr(2, 9);
const today = () => new Date().toISOString().split('T')[0];
const formatDate = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const formatMoney = (n) => 'S/ ' + Number(n).toFixed(2);

function showToast(msg, type = 'success') {
  state.toast = { msg, type };
  render();
  setTimeout(() => { state.toast = null; render(); }, 2500);
}

function previewFoto(input, previewId) {
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

function calcularFechaFin(fechaInicio, dias) {
  if (!fechaInicio) return '—';
  const fecha = new Date(fechaInicio + 'T00:00:00');
  fecha.setDate(fecha.getDate() + dias);
  return formatDate(fecha.toISOString().split('T')[0]);
}

function estaVencido(fechaInicio, dias) {
  if (!fechaInicio) return false;
  const fin = new Date(fechaInicio + 'T00:00:00');
  fin.setDate(fin.getDate() + dias);
  return new Date() > fin;
}

function diasSinPagar(creditoId) {
  const pagos = DB._cache['pagos'] || [];
  const pagosCr = pagos.filter(p => p.creditoId === creditoId);
  if (pagosCr.length === 0) return null;
  const ultimo = pagosCr.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
  return Math.floor((new Date() - new Date(ultimo + 'T00:00:00')) / (1000 * 60 * 60 * 24));
}

function getAlertasCreditos() {
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
function calcularMora(cr) {
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