window.state = {
  screen: 'login',
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