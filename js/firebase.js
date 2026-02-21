import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZKQPkV1LXvQ2K0wMHUwerF2Im2fcCfn8",
  authDomain: "cobros-app-75af2.firebaseapp.com",
  projectId: "cobros-app-75af2",
  storageBucket: "cobros-app-75af2.firebasestorage.app",
  messagingSenderId: "403940319506",
  appId: "1:403940319506:web:21f1d79498a54fc29993cb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLS = {
  users:        () => collection(db, 'users'),
  clientes:     () => collection(db, 'clientes'),
  creditos:     () => collection(db, 'creditos'),
  pagos:        () => collection(db, 'pagos'),
  notas_cuadre: () => collection(db, 'notas_cuadre'),
};

async function fbGetAll(colName) {
  const snap = await getDocs(COLS[colName]());
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

async function fbGet(colName, id) {
  const snap = await getDoc(doc(db, colName, id));
  return snap.exists() ? { ...snap.data(), id: snap.id } : null;
}

async function fbSet(colName, id, data) {
  await setDoc(doc(db, colName, id), data);
}

async function fbUpdate(colName, id, data) {
  await updateDoc(doc(db, colName, id), data);
}

async function fbDelete(colName, id) {
  await deleteDoc(doc(db, colName, id));
}

async function fbQuery(colName, field, value) {
  const q = query(COLS[colName](), where(field, '==', value));
  const snap = await getDocs(q);
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

export { fbGetAll, fbGet, fbSet, fbUpdate, fbDelete, fbQuery, fbInit };