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
  
  // --- NUEVOS CAMPOS PARA EL LOGIN ---
  loginError: '',
  // Intenta recuperar el último usuario guardado, si no, vacío
  loginUserField: localStorage.getItem('lastUser') || '', 
  loginPassField: ''
};