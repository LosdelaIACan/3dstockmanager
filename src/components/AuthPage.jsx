// src/components/AuthPage.jsx

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, LogIn, UserPlus, User, AlertCircle } from 'lucide-react';

const AuthPage = ({ addNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // Nuevo estado para errores locales

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(''); // Limpiamos errores anteriores al iniciar

    try {
      if (isRegistering) {
        if (!displayName.trim()) {
          setError('El nombre de usuario no puede estar vacío.');
          setIsLoading(false);
          return;
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
        // La notificación de éxito global sigue siendo útil aquí
        addNotification('Cuenta creada con éxito. ¡Bienvenido!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        addNotification('Sesión iniciada con éxito. ¡Bienvenido de nuevo!', 'success');
      }
    } catch (error) {
      console.error('Error de autenticación:', error);
      let friendlyMessage = 'Ha ocurrido un error de autenticación.';
      if (error.code === 'auth/invalid-email') {
        friendlyMessage = 'El correo electrónico no es válido.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        friendlyMessage = 'Credenciales incorrectas. Vuelve a intentarlo.';
      } else if (error.code === 'auth/email-already-in-use') {
        friendlyMessage = 'Este correo ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        friendlyMessage = 'La contraseña debe tener al menos 6 caracteres.';
      }
      setError(friendlyMessage); // Usamos el estado local para mostrar el error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-950 text-white p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 max-w-5xl mx-auto gap-8 items-center">
        <div className="text-center lg:text-left space-y-4">
          <h1 className="text-5xl font-extrabold leading-tight">
            Gestiona tus proyectos de <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500">Impresión 3D</span>
          </h1>
          <p className="text-lg text-gray-300">
            Simplifica la gestión de clientes, proyectos y presupuestos de manera profesional.
          </p>
        </div>
        
        <div className="w-full p-8 space-y-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
          <h2 className="text-3xl font-bold text-center text-white">
            {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>

          {/* Contenedor para mostrar el mensaje de error local */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isRegistering && (
              <div className="relative">
                <User className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Nombre de usuario"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  disabled={isLoading}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                disabled={isLoading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className="w-full p-3 font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
              {isLoading ? 'Cargando...' : isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="text-center text-gray-400">
            {isRegistering ? (
              <p>¿Ya tienes una cuenta? <button onClick={() => { setIsRegistering(false); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium">Inicia Sesión</button></p>
            ) : (
              <p>¿No tienes una cuenta? <button onClick={() => { setIsRegistering(true); setError(''); }} className="text-blue-400 hover:text-blue-300 font-medium">Regístrate</button></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
