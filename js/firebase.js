// Firebase config - Ponemos los valores directos para que el navegador los lea
const firebaseConfig = {
  apiKey: "AIzaSyBof64MM8I5FCgruPyZFo64-1bUh-RCpKk",
  authDomain: "cobros-app-75af2.firebaseapp.com",
  projectId: "cobros-app-75af2",
  storageBucket: "cobros-app-75af2.firebasestorage.app",
  messagingSenderId: "403940319506",
  appId: "1:403940319506:web:21f1d79498a54fc29993cb"
};

// Inicialización
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const fsdb = firebase.firestore();

// EXPOSICIÓN GLOBAL (Para que db.js no dé error)
window.fbGetAll = async function(colName) {
  const snap = await fsdb.collection(colName).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

window.fbGet = async function(colName, id) {
  const snap = await fsdb.collection(colName).doc(id).get();
  return snap.exists ? { ...snap.data(), id: snap.id } : null;
};

window.fbSet = async function(colName, id, data) {
  await fsdb.collection(colName).doc(id).set(data);
};

window.fbUpdate = async function(colName, id, data) {
  await fsdb.collection(colName).doc(id).update(data);
};

window.fbDelete = async function(colName, id) {
  await fsdb.collection(colName).doc(id).delete();
};

window.fbQuery = async function(colName, field, value) {
  const snap = await fsdb.collection(colName).where(field, '==', value).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

window.fbEscuchar = function(colName, callback) {
  return fsdb.collection(colName).onSnapshot(snap => {
    const datos = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    callback(datos);
  }, (error) => {
    console.error(`Error escuchando ${colName}:`, error);
  });
};