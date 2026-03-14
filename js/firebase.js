// Firebase config - Ponemos los valores directos para que el navegador los lea
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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

// ─── MODO LOCAL MOCK ─────────────────────────────────────────
const USE_LOCAL_MOCK = false; // ← false para producción

if (USE_LOCAL_MOCK) {
  const _mockData = {};
  const _fbGetAllOriginal = window.fbGetAll;

  window.fbGetAll = async (col) => {
    const cached = localStorage.getItem(`mock_${col}`);
    if (cached) {
      _mockData[col] = JSON.parse(cached);
      return _mockData[col];
    }
    const datos = await _fbGetAllOriginal(col);
    localStorage.setItem(`mock_${col}`, JSON.stringify(datos));
    _mockData[col] = datos;
    return datos;
  };

  window.fbSet = async (col, id, data) => {
    if (!_mockData[col]) {
      _mockData[col] = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    }
    const idx = _mockData[col].findIndex(x => x.id === id);
    if (idx !== -1) _mockData[col][idx] = data;
    else _mockData[col].push(data);
    localStorage.setItem(`mock_${col}`, JSON.stringify(_mockData[col]));
  };

  window.fbUpdate = async (col, id, data) => {
    if (!_mockData[col]) {
      _mockData[col] = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    }
    const item = _mockData[col].find(x => x.id === id);
    if (item) Object.assign(item, data);
    localStorage.setItem(`mock_${col}`, JSON.stringify(_mockData[col]));
  };

  window.fbDelete = async (col, id) => {
    if (!_mockData[col]) {
      _mockData[col] = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    }
    _mockData[col] = _mockData[col].filter(x => x.id !== id);
    localStorage.setItem(`mock_${col}`, JSON.stringify(_mockData[col]));
  };

  window.fbQuery = async (col, field, value) => {
    if (!_mockData[col]) {
      _mockData[col] = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    }
    return _mockData[col].filter(x => x[field] === value);
  };

  window.fbEscuchar = (col, cb) => {
    _mockData[col] = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    cb(_mockData[col]);
    return () => {};
  };

  console.warn("🟡 MODO LOCAL MOCK activo — sin lecturas a Firestore");
}