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
const fbAuth = firebase.auth();

// Caché de Firestore en el celular (IndexedDB). Si un listener se reanuda dentro de 30 min,
// Firebase solo cobra los documentos que cambiaron, no la colección entera.
fsdb.enablePersistence({ synchronizeTabs: true }).catch(e => {
  console.warn('Caché offline de Firestore no disponible:', e.code);
});

// ── Autenticación ────────────────────────────────────────────
// Deben coincidir con functions/index.js
window.emailDeUsuario = (user) =>
  `${String(user).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_')}@${firebaseConfig.projectId}.firebaseapp.com`;
const claveAuth = (pass) => 'cobros#' + String(pass);

// Llama a una Cloud Function y devuelve su resultado (lanza Error con mensaje legible)
window.fbFuncion = async function (nombre, datos) {
  try {
    const res = await firebase.functions().httpsCallable(nombre)(datos);
    return res.data;
  } catch (e) {
    throw new Error(e.message || 'Error en el servidor');
  }
};

// Inicia sesión. Si el usuario aún no está migrado a Firebase Auth, lo migra y reintenta.
// Devuelve { ok: true, uid } o { ok: false, motivo: 'no-existe' | 'clave' | 'red' }
window.fbLogin = async function (user, pass, recordar) {
  await fbAuth.setPersistence(recordar
    ? firebase.auth.Auth.Persistence.LOCAL
    : firebase.auth.Auth.Persistence.SESSION);
  const email = emailDeUsuario(user);
  const intentar = () => fbAuth.signInWithEmailAndPassword(email, claveAuth(pass));
  try {
    const cred = await intentar();
    return { ok: true, uid: cred.user.uid };
  } catch (e) {
    if (e.code === 'auth/network-request-failed') return { ok: false, motivo: 'red' };
    if (e.code === 'auth/too-many-requests') return { ok: false, motivo: 'bloqueado' };
  }
  const r = await fbFuncion('migrarLogin', { user, pass });
  if (!r.ok) return r;
  const cred = await intentar();
  return { ok: true, uid: cred.user.uid };
};

window.fbLogout = () => fbAuth.signOut();

// Resuelve con el usuario de Auth actual (o null) una vez que Firebase restauró la sesión
window.fbUsuarioActual = () => new Promise(resolve => {
  const unsub = fbAuth.onAuthStateChanged(u => { unsub(); resolve(u); });
});

// EXPOSICIÓN GLOBAL (Para que db.js no dé error)
window.fbGetAll = async function (colName) {
  const snap = await fsdb.collection(colName).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

window.fbGet = async function (colName, id) {
  const snap = await fsdb.collection(colName).doc(id).get();
  return snap.exists ? { ...snap.data(), id: snap.id } : null;
};

// ── Escrituras que no se traban sin señal ────────────────────
// Con la caché offline, Firestore guarda el cambio en el celular al instante y lo sube al
// volver la señal; pero la promesa no se cumple hasta que el servidor confirma. Sin señal,
// los botones quedaban en "Guardando..." y el cobrador podía registrar dos veces.
// Ahora: si el servidor no confirma en unos segundos (o no hay internet), se sigue adelante
// con el dato guardado en el celular y se avisa. Si luego el servidor lo rechaza, se avisa.
const ESPERA_SERVIDOR_MS = 5000;
let _pendientesSinSenal = 0;
let _avisoSinSenal = null;

function _conEspera(promesa) {
  let esperando = true;
  promesa
    .then(() => {
      if (!esperando) {
        _pendientesSinSenal = Math.max(0, _pendientesSinSenal - 1);
        if (_pendientesSinSenal === 0 && typeof showToast === 'function') {
          showToast('✅ Datos enviados a la nube');
        }
      }
    })
    .catch(e => {
      if (esperando) return; // el error lo maneja quien llamó
      _pendientesSinSenal = Math.max(0, _pendientesSinSenal - 1);
      console.error('Un cambio guardado sin señal fue rechazado:', e);
      alert('⚠️ Un cambio que se guardó sin señal no pudo enviarse: ' + (e.message || e) +
            '\nRevisa ese registro.');
    });

  const limite = new Promise(resolve =>
    setTimeout(() => resolve('pendiente'), navigator.onLine ? ESPERA_SERVIDOR_MS : 0));

  return Promise.race([promesa.then(() => 'ok'), limite]).then(r => {
    esperando = false;
    if (r === 'pendiente') {
      _pendientesSinSenal++;
      clearTimeout(_avisoSinSenal);
      _avisoSinSenal = setTimeout(() => {
        if (typeof showToast === 'function') {
          showToast('📴 Sin señal: guardado en el celular. Se enviará solo al volver la señal');
        }
      }, 50);
    }
    return r;
  }, e => { esperando = false; throw e; });
}

// Devuelven 'ok' (confirmado por el servidor) o 'pendiente' (guardado en el celular)
window.fbSet = function (colName, id, data) {
  return _conEspera(fsdb.collection(colName).doc(id).set(data));
};

window.fbUpdate = function (colName, id, data) {
  return _conEspera(fsdb.collection(colName).doc(id).update(data));
};

window.fbDelete = function (colName, id) {
  return _conEspera(fsdb.collection(colName).doc(id).delete());
};

// ¿Hay cambios guardados en el celular esperando señal?
window.hayCambiosSinEnviar = () => _pendientesSinSenal > 0;

// Si se intenta cerrar la app con cambios sin enviar, pedir confirmación
window.addEventListener('beforeunload', (e) => {
  if (_pendientesSinSenal > 0) { e.preventDefault(); e.returnValue = ''; }
});

window.fbQuery = async function (colName, field, value) {
  const snap = await fsdb.collection(colName).where(field, '==', value).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

window.fbGetSince = async function (colName, desde) {
  const snap = await fsdb.collection(colName).where('updatedAt', '>', desde).get();
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
};

// Escrituras múltiples atómicas (batch)
// ops = [{ op: 'set'|'update'|'delete', col, id, data? }]
window.fbBatch = function (ops) {
  const batch = fsdb.batch();
  ops.forEach(({ op, col, id, data }) => {
    const ref = fsdb.collection(col).doc(id);
    if (op === 'set')    batch.set(ref, data);
    if (op === 'update') batch.update(ref, data);
    if (op === 'delete') batch.delete(ref);
  });
  return _conEspera(batch.commit());
};

window.fbEscuchar = function (colName, callback) {
  return fsdb.collection(colName).onSnapshot(snap => {
    const datos = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    callback(datos);
  }, (error) => {
    console.error(`Error escuchando ${colName}:`, error);
  });
};

// Escucha en vivo solo los documentos donde campo == valor (ej. los de un cobrador).
window.fbEscucharDonde = function (colName, campo, valor, callback, onError) {
  return fsdb.collection(colName).where(campo, '==', valor).onSnapshot(snap => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id })));
  }, (error) => {
    console.error(`Error escuchando ${colName} (${campo}):`, error);
    if (onError) onError(error);
  });
};

// Escucha en vivo solo los documentos con updatedAt > desde.
// El arranque cobra solo esos cambios, y después cada documento nuevo/editado cuesta 1 lectura.
// onCambios recibe solo los documentos añadidos o modificados en cada actualización.
// Opcional: campo/valor añade un filtro de igualdad (requiere índice compuesto, ver firestore.indexes.json).
window.fbEscucharDesde = function (colName, desde, onCambios, onError, campo, valor) {
  let q = fsdb.collection(colName);
  if (campo) q = q.where(campo, '==', valor);
  return q.where('updatedAt', '>', desde).onSnapshot(snap => {
    const cambios = snap.docChanges()
      .filter(c => c.type !== 'removed') // "removed" = salió del filtro, no fue borrado
      .map(c => ({ ...c.doc.data(), id: c.doc.id }));
    onCambios(cambios, snap.metadata.fromCache);
  }, (error) => {
    console.error(`Error escuchando ${colName}:`, error);
    if (onError) onError(error);
  });
};

// ── Firebase Storage ─────────────────────────────────────────
window.subirFotoStorage = async function (base64, clienteId) {
  const storageRef = firebase.storage().ref(`clientes/${clienteId}.jpg`);
  await storageRef.putString(base64, 'data_url');
  return await storageRef.getDownloadURL();
};
// ─── MODO LOCAL MOCK ─────────────────────────────────────────
window.USE_LOCAL_MOCK =false; // ← false para producción

if (window.USE_LOCAL_MOCK) {
  const _mockData = {};

  window.subirFotoStorage = async (base64, clienteId) => {
    console.log('📸 Mock: foto no subida a Storage');
    return base64;
  };

  
  window.fbGetAll = async (col) => {
    const cached = localStorage.getItem(`mock_${col}`);
    if (cached) {
      _mockData[col] = JSON.parse(cached);
      return _mockData[col];
    }
    // Sin cache local → devolver vacío, NO tocar Firestore
    console.warn(`[MOCK] Sin cache para '${col}' — retornando []`);
    _mockData[col] = [];
    return [];
  };

  window.fbGet = async (col, id) => {
    const arr = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    return arr.find(x => x.id === id) || null;
  };

  window.fbGetSince = async (col, desde) => {
    const arr = JSON.parse(localStorage.getItem(`mock_${col}`) || '[]');
    return arr.filter(x => x.updatedAt > desde);
  };

  window.fbBatch = async (ops) => {
    for (const { op, col, id, data } of ops) {
      if (op === 'set')    await window.fbSet(col, id, data);
      if (op === 'update') await window.fbUpdate(col, id, data);
      if (op === 'delete') await window.fbDelete(col, id);
    }
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
    return () => { };
  };

  console.warn('🟡 MODO LOCAL MOCK activo — sin lecturas a Firestore');
}