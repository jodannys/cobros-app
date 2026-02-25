window.state = {
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
  filtroClientes: 'todos', // Filtro activo en lista clientes
  _gastoCobradorId: null,   // Para modal nuevo gasto desde admin
  _cajaCobrador: null,       // Para modal asignar caja chica

  // Login
  loginError: '',
  loginUserField: localStorage.getItem('lastUser') || '',
  loginPassField: ''
};