// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Pega aquí el objeto de configuración que copiaste de la consola de Firebase
// --- INICIO DE TU CONFIGURACIÓN ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
// --- FIN DE TU CONFIGURACIÓN ---

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Inicializamos los servicios de Firebase que vamos a usar y los exportamos
export const auth = getAuth(app);
export const db = getFirestore(app);
