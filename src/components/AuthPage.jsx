import React, { useState } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
// --- CORRECCIÓN APLICADA AQUÍ ---
// Se añaden todas las funciones de Firestore necesarias para el flujo de invitación
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Función para gestionar la organización de un nuevo usuario (ya sea invitado o no)
  const createOrganizationForNewUser = async (user) => {
    try {
      // 1. Busca si el usuario tiene una invitación pendiente
      const orgsQuery = query(collection(db, "organizations"), where("pendingInvites", "array-contains", user.email));
      const existingOrgSnapshot = await getDocs(orgsQuery);

      if (!existingOrgSnapshot.empty) {
        // 2. Si fue invitado, lo añade a la organización existente
        console.log("Usuario invitado detectado. Añadiendo a organización existente.");
        const orgDoc = existingOrgSnapshot.docs[0];
        const orgData = orgDoc.data();
        
        const updatedMembers = [...orgData.members, { uid: user.uid, email: user.email, role: 'viewer' }];
        const updatedUIDs = [...orgData.memberUIDs, user.uid];
        const updatedPendingInvites = orgData.pendingInvites.filter(e => e !== user.email);

        await updateDoc(doc(db, "organizations", orgDoc.id), {
            members: updatedMembers,
            memberUIDs: updatedUIDs,
            pendingInvites: updatedPendingInvites
        });

      } else {
        // 3. Si no fue invitado, crea una nueva organización para él
        console.log("Usuario nuevo. Creando nueva organización.");
        const newOrgRef = doc(collection(db, 'organizations'));
        await setDoc(newOrgRef, {
          ownerId: user.uid,
          name: `${user.email.split('@')[0]}'s Team`,
          members: [{ uid: user.uid, email: user.email, role: 'owner' }],
          memberUIDs: [user.uid],
          pendingInvites: [],
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.error("Error al gestionar la organización del usuario: ", e);
      // Propaga el error para que se muestre en la UI
      throw e;
    }
  };

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createOrganizationForNewUser(userCredential.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      if (additionalUserInfo?.isNewUser) {
        await createOrganizationForNewUser(result.user);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white font-sans">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700/50">
        <div className="text-center">
            <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-4"/>
            <h2 className="text-3xl font-bold">{isLogin ? 'Bienvenido de Nuevo' : 'Crea tu Cuenta'}</h2>
            <p className="text-gray-400 mt-2">{isLogin ? 'Inicia sesión para continuar' : 'Únete a la plataforma'}</p>
        </div>
        {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg text-center text-sm">{error}</p>}
        <form onSubmit={handleAuthAction} className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
          </div>
          <button type="submit" className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-transform hover:scale-105">
            {isLogin ? 'Entrar' : 'Crear Cuenta'}
          </button>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700" /></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-400">O</span></div>
        </div>
        <div>
           <button onClick={handleGoogleSignIn} className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold flex items-center justify-center transition-transform hover:scale-105">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
            Continuar con Google
          </button>
        </div>
        <p className="text-center text-sm text-gray-400">
          {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="font-semibold text-blue-400 hover:underline ml-1">
            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
