// Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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


// CORRECCIÓN P1: fbEscuchar ahora pasa los datos al callback
// Esto permite que app.js actualice el caché cuando Firestore notifica cambios
// sin cerrar la app ni perder el estado actual
function fbEscuchar(colName, callback) {
  return fsdb.collection(colName).onSnapshot(snap => {
    const datos = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    // Pasar los datos al callback para que app.js actualice el caché
    callback(datos);
  }, (error) => {
    console.error(`Error escuchando ${colName}:`, error);
  });
}