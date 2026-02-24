const DB = {
  _cache: {},

  async getAll(colName) {
    this._cache[colName] = await fbGetAll(colName);
    return this._cache[colName];
  },

  async set(colName, id, data) {
    await fbSet(colName, id, { ...data, id });
    if (this._cache[colName]) {
      const idx = this._cache[colName].findIndex(x => x.id === id);
      if (idx !== -1) this._cache[colName][idx] = { ...data, id };
      else this._cache[colName].push({ ...data, id });
    }
  },

  async update(colName, id, data) {
    await fbUpdate(colName, id, data);
    if (this._cache[colName]) {
      const idx = this._cache[colName].findIndex(x => x.id === id);
      if (idx !== -1) this._cache[colName][idx] = { ...this._cache[colName][idx], ...data };
    }
  },

  async delete(colName, id) {
    await fbDelete(colName, id);
    if (this._cache[colName]) {
      this._cache[colName] = this._cache[colName].filter(x => x.id !== id);
    }
  },

  async query(colName, field, value) {
    return await fbQuery(colName, field, value);
  },

  async init() {
    await this.getAll('users');
    const users = this._cache['users'] || [];
    if (users.length === 0) {
      console.warn('⚠️ No hay usuarios, creando admin inicial');
      const adminInicial = { id: 'u1', nombre: 'Admin Principal', user: 'admin', pass: '1234', role: 'admin' };
      await fbSet('users', 'u1', adminInicial);
      this._cache['users'] = [adminInicial];
    }
    await this.getAll('clientes');
    await this.getAll('creditos');
    await this.getAll('pagos');
    await this.getAll('notas_cuadre');
    await this.getAll('gastos');   
  await this.getAll('cajas');   
  }
};