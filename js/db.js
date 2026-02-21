const DB = {
  _cache: {},

  async getAll(colName) {
    this._cache[colName] = await fbGetAll(colName);
    return this._cache[colName];
  },

  async set(colName, id, data) {
    await fbSet(colName, id, { ...data, id });
    delete this._cache[colName];
    await this.getAll(colName);
  },

  async update(colName, id, data) {
    await fbUpdate(colName, id, data);
    delete this._cache[colName];
    await this.getAll(colName);
  },

  async delete(colName, id) {
    await fbDelete(colName, id);
    delete this._cache[colName];
    await this.getAll(colName);
  },

  async query(colName, field, value) {
    return await fbQuery(colName, field, value);
  },

  async init() {
    await fbInit();
    await this.getAll('users');
    await this.getAll('clientes');
    await this.getAll('creditos');
    await this.getAll('pagos');
    await this.getAll('notas_cuadre');
  }
};