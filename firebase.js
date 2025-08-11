import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Lee las variables de entorno que has definido en tu archivo .env.local
// import.meta.env es la forma en que Vite accede a estas variables.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

// Inicializa la aplicación de Firebase con la configuración
const app = initializeApp(firebaseConfig);

// Inicializa los servicios que vas a utilizar
const auth = getAuth(app);
const db = getFirestore(app);

// Mensaje de confirmación en la consola del navegador para saber que se conectó
console.log("Firebase se ha inicializado correctamente. Proyecto:", firebaseConfig.projectId);


// Exporta los servicios para que puedan ser usados en otros componentes de tu app
export { auth, db };
