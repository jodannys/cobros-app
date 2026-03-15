const _savedUser = (() => {
  try { return JSON.parse(localStorage.getItem('sessionUser')); }
  catch { return null; }
})();

window.state = {
  screen: _savedUser ? 'main' : 'login',
  currentUser: _savedUser || null,
  nav: 'clientes',
  selectedClient: null,
  selectedCredito: null,
  modal: null,
  search: '',
  selectedCobrador: null,
  toast: null,
  _editingAdmin: null,
  filtroClientes: 'todos',
  _gastoCobradorId: null,
  _cajaCobrador: null,

  // Login
  loginError: '',
  loginUserField: localStorage.getItem('lastUser') || '',
  loginPassField: '',

  // GPS Cuadre
  miUbicacion: null,
  _ultimaUbicacionRuta: null,
  _gpsWatchId: null,
  rutaActiva: false,
};