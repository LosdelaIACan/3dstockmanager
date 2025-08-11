import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

// Importa tus componentes de página/vista
import AuthPage from './components/AuthPage';
import DashboardOverview from './components/DashboardOverview';
import ProjectManagement from './components/ProjectManagement';
import TeamManagement from './components/TeamManagement'; // El nuevo componente
import MaterialManagement from './components/MaterialManagement';
import ClientManagement from './components/ClientManagement';
import PricingCalculator from './components/PricingCalculator';
import Analytics from './components/Analytics';
import NotificationBell from './components/NotificationBell';

// Iconos para el sidebar (puedes usar los que prefieras)
import { Home, Folder, Users, Package, Briefcase, DollarSign, BarChart2, LogOut } from 'lucide-react';


function App() {
  const [user, setUser] = useState(null);
  const [userOrg, setUserOrg] = useState(null); // Estado para guardar la organización del usuario
  const [userRole, setUserRole] = useState(''); // Estado para guardar el rol del usuario
  const [loading, setLoading] = useState(true); // Estado de carga para la sesión inicial
  const [view, setView] = useState('overview'); // Estado para controlar qué vista se muestra

  useEffect(() => {
    // onAuthStateChanged es un listener que se ejecuta cuando el usuario inicia o cierra sesión
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 1. Si hay un usuario, lo guardamos en el estado
        setUser(currentUser);
        
        // 2. Buscamos la organización a la que pertenece el usuario
        // Esta consulta busca en la colección 'organizations' un documento donde el array 'members'
        // contenga un objeto con el UID del usuario actual.
        const orgsQuery = query(
          collection(db, 'organizations'),
          where('members', 'array-contains-any', [{uid: currentUser.uid}]) // Esto puede requerir un índice compuesto
        );

        // Una forma más robusta si la anterior no funciona bien con arrays de objetos complejos
        const orgsRef = collection(db, "organizations");
        const snapshot = await getDocs(orgsRef);
        let foundOrg = null;
        let foundRole = '';

        snapshot.forEach(doc => {
            const orgData = doc.data();
            const member = orgData.members.find(m => m.uid === currentUser.uid);
            if(member) {
                foundOrg = { id: doc.id, ...orgData };
                foundRole = member.role;
            }
        });

        if (foundOrg) {
          setUserOrg(foundOrg);
          setUserRole(foundRole);
        }

      } else {
        // Si no hay usuario, reseteamos todos los estados
        setUser(null);
        setUserOrg(null);
        setUserRole('');
      }
      // 3. Terminamos el estado de carga
      setLoading(false);
    });

    // Limpiamos el listener cuando el componente se desmonta para evitar fugas de memoria
    return () => unsubscribe();
  }, []);

  const handleSignOut = () => {
    signOut(auth).catch((error) => console.error('Error signing out: ', error));
  };

  // Función para renderizar el componente principal según la vista seleccionada
  const renderContent = () => {
    if (!userOrg) {
      return <div className="text-white">Cargando datos de la organización...</div>;
    }

    switch (view) {
      case 'overview':
        return <DashboardOverview />;
      case 'projects':
        // Pasamos el ID de la organización y el rol del usuario para gestionar permisos
        return <ProjectManagement orgId={userOrg.id} userRole={userRole} />;
      case 'team':
        // Pasamos el usuario y la organización completa para gestionar miembros
        return <TeamManagement user={user} organization={userOrg} />;
      case 'materials':
        return <MaterialManagement />;
      case 'clients':
        return <ClientManagement />;
      case 'calculator':
        return <PricingCalculator />;
      case 'analytics':
        return <Analytics />;
      default:
        return <DashboardOverview />;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Cargando...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col">
        <div className="text-2xl font-bold mb-8">3D Stock Manager</div>
        <nav className="flex flex-col space-y-2">
          <button onClick={() => setView('overview')} className={`flex items-center p-2 rounded ${view === 'overview' ? 'bg-blue-600' : ''}`}><Home className="mr-3" /> Resumen</button>
          <button onClick={() => setView('projects')} className={`flex items-center p-2 rounded ${view === 'projects' ? 'bg-blue-600' : ''}`}><Folder className="mr-3" /> Proyectos</button>
          <button onClick={() => setView('team')} className={`flex items-center p-2 rounded ${view === 'team' ? 'bg-blue-600' : ''}`}><Users className="mr-3" /> Equipo</button>
          <button onClick={() => setView('materials')} className={`flex items-center p-2 rounded ${view === 'materials' ? 'bg-blue-600' : ''}`}><Package className="mr-3" /> Materiales</button>
          <button onClick={() => setView('clients')} className={`flex items-center p-2 rounded ${view === 'clients' ? 'bg-blue-600' : ''}`}><Briefcase className="mr-3" /> Clientes</button>
          <button onClick={() => setView('calculator')} className={`flex items-center p-2 rounded ${view === 'calculator' ? 'bg-blue-600' : ''}`}><DollarSign className="mr-3" /> Calculadora</button>
          <button onClick={() => setView('analytics')} className={`flex items-center p-2 rounded ${view === 'analytics' ? 'bg-blue-600' : ''}`}><BarChart2 className="mr-3" /> Analíticas</button>
        </nav>
        <div className="mt-auto">
           <button onClick={handleSignOut} className="flex items-center w-full p-2 rounded hover:bg-red-600"><LogOut className="mr-3" /> Cerrar Sesión</button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 p-4 flex justify-end items-center">
            <NotificationBell />
            <div className="ml-4">
                <p className="font-semibold">{user.email}</p>
                <p className="text-xs text-gray-400">Rol: {userRole}</p>
            </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
