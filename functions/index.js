// Cloud Functions de CobrosApp: gestión de usuarios con Firebase Authentication.
// El documento users/{id} usa el mismo id que la cuenta de Auth (uid).
// Las contraseñas solo viven en Firebase Auth (cifradas); nunca en Firestore.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

const db = admin.firestore();
const auth = admin.auth();
const DOMINIO = 'cobros-app-75af2.firebaseapp.com';

// Debe coincidir con js/auth.js
const emailDe = (user) =>
  `${String(user).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_')}@${DOMINIO}`;
// Firebase exige mínimo 6 caracteres; el prefijo permite conservar claves cortas existentes.
const claveAuth = (pass) => 'cobros#' + String(pass);

async function buscarPorUser(user) {
  const snap = await db.collection('users').get();
  const u = String(user).trim().toLowerCase();
  const doc = snap.docs.find(d => String(d.data().user || '').toLowerCase() === u);
  return doc ? { id: doc.id, ...doc.data() } : null;
}

async function exigirAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
  const me = await db.collection('users').doc(request.auth.uid).get();
  if (!me.exists || me.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo un administrador puede hacer esto');
  }
}

// Crea (o actualiza) la cuenta de Auth de un usuario que aún tiene clave en Firestore
// y borra esa clave del documento.
async function migrarDoc(u) {
  const datos = {
    email: emailDe(u.user),
    password: claveAuth(u.pass),
    displayName: u.nombre || u.user
  };
  try {
    await auth.createUser({ uid: u.id, ...datos });
  } catch (e) {
    if (e.code !== 'auth/uid-already-exists') throw e;
    await auth.updateUser(u.id, datos);
  }
  await db.collection('users').doc(u.id).update({ pass: admin.firestore.FieldValue.delete() });
}

// Login de un usuario aún no migrado. Llamada sin sesión.
exports.migrarLogin = onCall(async (request) => {
  const { user, pass } = request.data || {};
  if (!user || !pass) return { ok: false, motivo: 'clave' };
  const u = await buscarPorUser(user);
  if (!u) return { ok: false, motivo: 'no-existe' };
  // esAdmin: el login muestra "¿Olvidaste tu clave?" solo a administradores
  if (typeof u.pass !== 'string' || u.pass !== String(pass)) {
    return { ok: false, motivo: 'clave', esAdmin: u.role === 'admin' };
  }
  await migrarDoc(u);
  return { ok: true };
});

// Migra de una vez a todos los usuarios que aún tienen clave en Firestore (solo admin).
exports.migrarTodos = onCall(async (request) => {
  await exigirAdmin(request);
  const snap = await db.collection('users').get();
  let migrados = 0;
  const fallidos = [];
  for (const d of snap.docs) {
    const u = { id: d.id, ...d.data() };
    if (typeof u.pass === 'string' && u.pass && u.user) {
      // Un usuario con problema no frena a los demás; su clave queda intacta y puede migrar al entrar
      try {
        await migrarDoc(u);
        migrados++;
      } catch (e) {
        console.error(`No se pudo migrar ${u.user}:`, e);
        fallidos.push(u.user);
      }
    }
  }
  return { ok: true, migrados, fallidos };
});

exports.crearUsuario = onCall(async (request) => {
  await exigirAdmin(request);
  const { nombre, user, pass, role, telefono } = request.data || {};
  if (!nombre || !user || !pass) throw new HttpsError('invalid-argument', 'Todos los campos son obligatorios');
  if (!['admin', 'cobrador'].includes(role)) throw new HttpsError('invalid-argument', 'Rol inválido');
  if (await buscarPorUser(user)) throw new HttpsError('already-exists', 'Ese nombre de usuario ya existe');

  const cuenta = await auth.createUser({
    email: emailDe(user),
    password: claveAuth(pass),
    displayName: nombre
  });
  const doc = { id: cuenta.uid, nombre, user, role, telefono: telefono || '', updatedAt: new Date() };
  await db.collection('users').doc(cuenta.uid).set(doc);
  return { ok: true, id: cuenta.uid };
});

exports.actualizarUsuario = onCall(async (request) => {
  await exigirAdmin(request);
  const { id, nombre, user, pass, role, telefono } = request.data || {};
  if (!id || !nombre || !user) throw new HttpsError('invalid-argument', 'Nombre y usuario son obligatorios');
  const ref = db.collection('users').doc(id);
  const actual = await ref.get();
  if (!actual.exists) throw new HttpsError('not-found', 'Usuario no encontrado');
  const otro = await buscarPorUser(user);
  if (otro && otro.id !== id) throw new HttpsError('already-exists', 'Ese usuario ya existe');

  const updates = { nombre, user, updatedAt: new Date() };
  if (role) {
    if (!['admin', 'cobrador'].includes(role)) throw new HttpsError('invalid-argument', 'Rol inválido');
    updates.role = role;
  }
  if (telefono !== undefined) updates.telefono = telefono;

  const datosAuth = { email: emailDe(user), displayName: nombre };
  if (pass) datosAuth.password = claveAuth(pass);
  try {
    await auth.updateUser(id, datosAuth);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    // Usuario sin migrar: si no se envió clave nueva, usar la que tenía
    const passFinal = pass || actual.data().pass;
    if (!passFinal) throw new HttpsError('failed-precondition', 'Asigna una contraseña a este usuario');
    await auth.createUser({ uid: id, ...datosAuth, password: claveAuth(passFinal) });
  }
  updates.pass = admin.firestore.FieldValue.delete();
  await ref.update(updates);
  return { ok: true };
});

// ── Cartera: marcar en créditos y pagos quién es el cobrador actual del cliente ──
// Permite que cada cobrador descargue solo lo suyo. Solo escribe el campo `cartera`
// (y updatedAt en pagos, para que los celulares reciban el cambio); no toca nada más.
// Es idempotente: solo escribe donde el valor no coincide. Al terminar activa el interruptor
// configuracion/migraciones.cartera, que habilita la descarga filtrada en los cobradores.
exports.asignarCartera = onCall({ timeoutSeconds: 540, memory: '512MiB' }, async (request) => {
  await exigirAdmin(request);
  const [cli, cre, pag] = await Promise.all([
    db.collection('clientes').get(),
    db.collection('creditos').get(),
    db.collection('pagos').get()
  ]);
  const duenoDeCliente = new Map(cli.docs.map(d => [d.id, d.data().cobradorId || null]));
  const clienteDeCredito = new Map(cre.docs.map(d => [d.id, d.data().clienteId]));

  const writer = db.bulkWriter();
  let nCreditos = 0, nPagos = 0;

  cre.docs.forEach(d => {
    const x = d.data();
    if (!duenoDeCliente.has(x.clienteId)) return; // cliente borrado: no tocar
    const cartera = duenoDeCliente.get(x.clienteId);
    if (x.cartera !== cartera) {
      writer.update(d.ref, { cartera });
      nCreditos++;
    }
  });

  pag.docs.forEach(d => {
    const x = d.data();
    const clienteId = x.clienteId || clienteDeCredito.get(x.creditoId);
    if (!duenoDeCliente.has(clienteId)) return;
    const cartera = duenoDeCliente.get(clienteId);
    if (x.cartera !== cartera) {
      writer.update(d.ref, { cartera, updatedAt: new Date() });
      nPagos++;
    }
  });

  await writer.close();
  const fecha = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  await db.collection('configuracion').doc('migraciones')
    .set({ cartera: true, carteraFecha: fecha }, { merge: true });
  return { ok: true, creditos: nCreditos, pagos: nPagos, fecha };
});

// ── Código de recuperación ───────────────────────────────────
// Se guarda solo su hash en recuperacion/{uid} (las reglas bloquean esa colección a la app).
const crypto = require('crypto');
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para no confundir
const normalizarCodigo = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCodigo = (codigo, salt) => crypto.scryptSync(normalizarCodigo(codigo), salt, 32).toString('hex');
const MAX_INTENTOS = 5;
const BLOQUEO_MS = 30 * 60 * 1000;

// Genera un código nuevo para el usuario con sesión (invalida el anterior). Se muestra una sola vez.
exports.generarCodigoRecuperacion = onCall(async (request) => {
  await exigirAdmin(request); // los cobradores recuperan su clave a través del admin
  const bytes = crypto.randomBytes(8);
  const crudo = Array.from(bytes, b => ALFABETO[b % ALFABETO.length]).join('');
  const salt = crypto.randomBytes(16).toString('hex');
  await db.collection('recuperacion').doc(request.auth.uid).set({
    hash: hashCodigo(crudo, salt), salt, intentos: 0, bloqueadoHasta: 0, creado: new Date()
  });
  return { codigo: `${crudo.slice(0, 4)}-${crudo.slice(4)}` };
});

// Cambia la clave con usuario + código de recuperación. Llamada sin sesión. El código se consume.
exports.recuperarClave = onCall(async (request) => {
  const { user, codigo, nueva } = request.data || {};
  const error = { ok: false, motivo: 'codigo' }; // mismo mensaje si el usuario no existe
  if (!user || !codigo || !nueva) return error;
  if (String(nueva).length < 4) return { ok: false, motivo: 'corta' };

  const u = await buscarPorUser(user);
  if (!u || u.role !== 'admin') return error;
  const ref = db.collection('recuperacion').doc(u.id);
  const snap = await ref.get();
  if (!snap.exists) return error;
  const r = snap.data();
  if (r.bloqueadoHasta > Date.now()) return { ok: false, motivo: 'bloqueado' };

  const esperado = Buffer.from(r.hash, 'hex');
  const recibido = Buffer.from(hashCodigo(codigo, r.salt), 'hex');
  if (!crypto.timingSafeEqual(esperado, recibido)) {
    const intentos = (r.intentos || 0) + 1;
    await ref.update(intentos >= MAX_INTENTOS
      ? { intentos: 0, bloqueadoHasta: Date.now() + BLOQUEO_MS }
      : { intentos });
    return error;
  }

  const datosAuth = { email: emailDe(u.user), password: claveAuth(nueva), displayName: u.nombre || u.user };
  try {
    await auth.updateUser(u.id, datosAuth);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    await auth.createUser({ uid: u.id, ...datosAuth });
  }
  await auth.revokeRefreshTokens(u.id); // cierra sesiones abiertas en otros celulares
  await ref.delete();
  await db.collection('users').doc(u.id).update({ pass: admin.firestore.FieldValue.delete() });
  return { ok: true };
});

exports.eliminarUsuario = onCall(async (request) => {
  await exigirAdmin(request);
  const { id } = request.data || {};
  if (!id) throw new HttpsError('invalid-argument', 'Falta el id');
  if (id === request.auth.uid) throw new HttpsError('failed-precondition', 'No puedes eliminarte a ti mismo');
  try {
    await auth.deleteUser(id);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
  }
  await db.collection('users').doc(id).delete();
  return { ok: true };
});
