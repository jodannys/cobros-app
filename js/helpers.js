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
  const pagos = DB.get('pagos').filter(p => p.creditoId === creditoId);
  if (pagos.length === 0) return null;
  const ultimo = pagos.map(p => p.fecha).sort((a, b) => b.localeCompare(a))[0];
  const diff = Math.floor((new Date() - new Date(ultimo + 'T00:00:00')) / (1000 * 60 * 60 * 24));
  return diff;
}

function getAlertasCreditos() {
  const creditos = DB.get('creditos').filter(c => c.activo);
  const clientes = DB.get('clientes');
  const users = DB.get('users');
  const alertas = [];

  creditos.forEach(cr => {
    const cliente = clientes.find(c => c.id === cr.clienteId);
    const cobrador = users.find(u => u.id === cliente?.cobradorId);
    const pagos = DB.get('pagos').filter(p => p.creditoId === cr.id);
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
    const saldo = cr.total - totalPagado;
    const vencido = estaVencido(cr.fechaInicio, cr.diasTotal);
    const dias = diasSinPagar(cr.id);

    // Crédito vencido con saldo
    if (vencido && saldo > 0) {
      alertas.push({ tipo: 'vencido', cr, cliente, cobrador, saldo, dias });
    }
    // Moroso: 2+ días sin pagar y no vencido
    else if (dias !== null && dias >= 2 && saldo > 0) {
      alertas.push({ tipo: 'moroso', cr, cliente, cobrador, saldo, dias });
    }
  });

  return alertas;
}