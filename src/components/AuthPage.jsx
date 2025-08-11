import React, { useState } from 'react';
import { auth, db } from '../firebase'; // Importa 'db' desde tu configuración de Firebase
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  getAdditionalUserInfo // Necesario para saber si es un usuario nuevo con Google
} from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore'; // Importa funciones de Firestore

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Función para crear una organización en Firestore
  const createOrganizationForNewUser = async (user) => {
    try {
      // Crea una referencia a un nuevo documento en la colección 'organizations' con un ID único
      const orgRef = doc(collection(db, 'organizations')); 
      
      // Establece los datos de la nueva organización
      await setDoc(orgRef, {
        ownerId: user.uid,
        name: `${user.email}'s Organization`, // Un nombre por defecto
        members: [
          { uid: user.uid, email: user.email, role: 'owner' }
        ]
      });
      console.log("Organización creada para el usuario:", user.uid);
    } catch (e) {
      console.error("Error al crear la organización: ", e);
      // Aquí podrías manejar el error, por ejemplo, eliminando al usuario recién creado
      // para evitar un estado inconsistente.
    }
  };

  // Maneja el registro/login con email y contraseña
  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Es un registro nuevo
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Después de crear el usuario, crea su organización
        await createOrganizationForNewUser(userCredential.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Maneja el inicio de sesión con Google
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);

      // Si es un usuario nuevo (primera vez que inicia sesión con Google)
      if (additionalUserInfo?.isNewUser) {
        await createOrganizationForNewUser(result.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center">{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleAuthAction} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold"
          >
            {isLogin ? 'Entrar' : 'Crear Cuenta'}
          </button>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-800 text-gray-400">O continúa con</span>
          </div>
        </div>
        <div>
           <button
            onClick={handleGoogleSignIn}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Google
          </button>
        </div>
        <p className="text-center text-sm">
          {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-blue-500 hover:underline ml-1">
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
