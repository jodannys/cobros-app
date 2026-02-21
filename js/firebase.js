// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAZKQPkV1LXvQ2K0wMHUwerF2Im2fcCfn8",
  authDomain: "cobros-app-75af2.firebaseapp.com",
  projectId: "cobros-app-75af2",
  storageBucket: "cobros-app-75af2.firebasestorage.app",
  messagingSenderId: "403940319506",
  appId: "1:403940319506:web:21f1d79498a54fc29993cb"
};

firebase.initializeApp(firebaseConfig);
const fsdb = firebase.firestore();

async function fbGetAll(colName) {
  const snap = await fsdb.collection(colName).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

async function fbGet(colName, id) {
  const snap = await fsdb.collection(colName).doc(id).get();
  return snap.exists ? { ...snap.data(), id: snap.id } : null;
}

async function fbSet(colName, id, data) {
  await fsdb.collection(colName).doc(id).set(data);
}

async function fbUpdate(colName, id, data) {
  await fsdb.collection(colName).doc(id).update(data);
}

async function fbDelete(colName, id) {
  await fsdb.collection(colName).doc(id).delete();
}

async function fbQuery(colName, field, value) {
  const snap = await fsdb.collection(colName).where(field, '==', value).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

async function fbInit() {
  const users = await fbGetAll('users');
  if (users.length === 0) {
    await fbSet('users', 'u1', { id: 'u1', nombre: 'Admin Principal', user: 'admin', pass: '1234', role: 'admin' });
    await fbSet('users', 'u2', { id: 'u2', nombre: 'Carlos Ríos', user: 'carlos', pass: '1234', role: 'cobrador' });
    await fbSet('users', 'u3', { id: 'u3', nombre: 'María López', user: 'maria', pass: '1234', role: 'cobrador' });
  }
}
function fbEscuchar(colName, callback) {
  return fsdb.collection(colName).onSnapshot(snap => {
    const datos = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    DB._cache[colName] = datos;
    callback();
  });
}