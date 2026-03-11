const _savedUser = (() => {
  try { return JSON.parse(localStorage.getItem('sessionUser')); } 
  catch { return null; }
})();

window.state = {
  screen: 'login',
  screen: _savedUser ? 'main' : 'login',  // ← si hay sesión, va directo a main
  currentUser: _savedUser || null,         // ← restaura el usuario
  nav: 'clientes',
  currentUser: null,
  nav: 'clientes',
  selectedClient: null,
  selectedCredito: null, // Aquí se guardará el crédito cuando abras el modal
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
  loginPassField: ''
  
};