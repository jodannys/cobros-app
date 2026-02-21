let state = {
  screen: 'login',
  currentUser: null,
  nav: 'clientes',
  selectedClient: null,
  selectedCredito: null,
  modal: null,
  search: '',
  selectedCobrador: null,
  toast: null,
  _editingAdmin: null,   // Para modal editar/crear admin (P7)

  // Login
  loginError: '',
  loginUserField: localStorage.getItem('lastUser') || '',
  loginPassField: ''
};