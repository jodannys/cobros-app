const DB = {
  get: (k) => JSON.parse(localStorage.getItem(k) || 'null'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  init() {
    if (!this.get('users')) {
      this.set('users', [
        { id: 'u1', nombre: 'Admin Principal', user: 'admin', pass: '1234', role: 'admin' },
        { id: 'u2', nombre: 'Carlos Ríos', user: 'carlos', pass: '1234', role: 'cobrador' },
        { id: 'u3', nombre: 'María López', user: 'maria', pass: '1234', role: 'cobrador' }
      ]);
    }
    if (!this.get('clientes')) {
      this.set('clientes', [
        { id: 'c1', dni: '12345678', nombre: 'Juan Pérez', telefono: '987654321', direccion: 'Av. Lima 123', cobradorId: 'u2', foto: '', ubicacion: '', creado: '2025-01-15' },
        { id: 'c2', dni: '87654321', nombre: 'Ana Torres', telefono: '912345678', direccion: 'Jr. Miraflores 456', cobradorId: 'u2', foto: '', ubicacion: '', creado: '2025-01-20' },
        { id: 'c3', dni: '55566677', nombre: 'Pedro Solis', telefono: '956789012', direccion: 'Calle Real 789', cobradorId: 'u3', foto: '', ubicacion: '', creado: '2025-02-01' }
      ]);
    }
    if (!this.get('creditos')) {
      this.set('creditos', [
        { id: 'cr1', clienteId: 'c1', monto: 1000, total: 1200, cuotaDiaria: 50, diasTotal: 24, fechaInicio: '2025-02-01', activo: true },
        { id: 'cr2', clienteId: 'c2', monto: 500, total: 600, cuotaDiaria: 25, diasTotal: 24, fechaInicio: '2025-01-10', activo: false }
      ]);
    }
    if (!this.get('pagos')) {
      this.set('pagos', [
        { id: 'p1', creditoId: 'cr1', clienteId: 'c1', cobradorId: 'u2', monto: 50, tipo: 'efectivo', fecha: '2025-02-10', nota: '' },
        { id: 'p2', creditoId: 'cr1', clienteId: 'c1', cobradorId: 'u2', monto: 50, tipo: 'yape', fecha: '2025-02-11', nota: '' }
      ]);
    }
    if (!this.get('notas_cuadre')) { this.set('notas_cuadre', []); }
  }
};