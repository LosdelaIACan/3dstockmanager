// src/App.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { BarChart2, User2, Briefcase, DollarSign, LogOut, PieChart, Box } from 'lucide-react';
import './App.css';

import { auth, db } from './firebase';
import AuthPage from './components/AuthPage';
import DashboardOverview from './components/DashboardOverview';
import ClientManagement from './components/ClientManagement';
import ProjectManagement from './components/ProjectManagement';
import PricingCalculator from './components/PricingCalculator';
import NotificationBell from './components/NotificationBell';
import Analytics from './components/Analytics';
import MaterialManagement from './components/MaterialManagement';

// Paleta de colores unificada para la navegación y el dashboard
const navButtonStyles = {
  dashboard: {
    base: 'hover:bg-orange-700',
    active: 'bg-gradient-to-r from-orange-500 to-red-600 shadow-lg ring-2 ring-orange-400/50',
    icon: BarChart2,
  },
  clients: {
    base: 'hover:bg-blue-700',
    active: 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg ring-2 ring-blue-400/50',
    icon: User2,
  },
  projects: {
    base: 'hover:bg-purple-700',
    active: 'bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg ring-2 ring-purple-400/50',
    icon: Briefcase,
  },
  pricing: {
    base: 'hover:bg-green-700',
    active: 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg ring-2 ring-green-400/50',
    icon: DollarSign,
  },
  analytics: {
    base: 'hover:bg-pink-700',
    active: 'bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg ring-2 ring-pink-400/50',
    icon: PieChart,
  },
  materials: {
    base: 'hover:bg-orange-700',
    active: 'bg-gradient-to-r from-orange-500 to-red-600 shadow-lg ring-2 ring-orange-400/50',
    icon: Box,
  },
};

function App() {
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  
  const notifiedMaterialsRef = useRef([]);

  // Establecer el título de la página
  useEffect(() => {
    document.title = '3D Print Manager';
  }, []);

  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserName(user.displayName || 'Usuario');
        notifiedMaterialsRef.current = [];
      } else {
        setUserId(null);
        setUserName('');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addNotification = useCallback((message, type) => {
    setNotifications(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  useEffect(() => {
    if (!userId || !db) return;
    const clientCollectionPath = `/artifacts/default-app-id/users/${userId}/clients`;
    const q = query(collection(db, clientCollectionPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsData);
    });
    return () => unsubscribe();
  }, [userId]);
  
  useEffect(() => {
    if (!userId || !db) return;
    const projectCollectionPath = `/artifacts/default-app-id/users/${userId}/projects`;
    const q = query(collection(db, projectCollectionPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, [userId]);
  
  useEffect(() => {
    if (!userId) return;
    const materialsCollectionPath = `/artifacts/default-app-id/users/${userId}/materials`;
    const q = query(collection(db, materialsCollectionPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materialsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(materialsData);

      materialsData.forEach(material => {
        const isLowStock = material.stockInGrams < material.reorderThreshold;
        const hasBeenNotified = notifiedMaterialsRef.current.includes(material.id);

        if (isLowStock && !hasBeenNotified) {
          addNotification(`¡Alerta! Stock bajo para ${material.brand} ${material.name} (${material.stockInGrams}g).`, 'error');
          notifiedMaterialsRef.current.push(material.id);
        }
      });
    });
    return () => unsubscribe();
  }, [userId, addNotification]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Cargando...
      </div>
    );
  }

  if (!userId) {
    return <AuthPage addNotification={addNotification} />;
  }

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col font-sans text-white">
      <nav className="bg-gray-800/70 backdrop-blur-lg p-4 shadow-2xl fixed top-0 w-full z-20 border-b border-gray-700">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between">
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 mb-4 sm:mb-0">
            3D Print Manager
          </h1>
          <div className="flex flex-wrap justify-center items-center gap-2">
            {Object.entries(navButtonStyles).map(([section, styles]) => {
              const Icon = styles.icon;
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none ${
                    activeSection === section
                      ? styles.active
                      : `text-gray-300 ${styles.base}`
                  }`}
                >
                  <Icon size={18} />
                  {section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <NotificationBell notifications={notifications} onClear={clearNotifications} />
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full text-gray-300 bg-gray-700 hover:bg-red-600 hover:text-white transition-colors focus:outline-none"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 pt-32 sm:pt-28">
        <div className="w-full max-w-7xl mx-auto space-y-8">
          {activeSection === 'dashboard' && <DashboardOverview userName={userName} clientCount={clients.length} projects={projects} materials={materials} />}
          {activeSection === 'clients' && <ClientManagement userId={userId} addNotification={addNotification} />}
          {activeSection === 'projects' && <ProjectManagement userId={userId} clients={clients} addNotification={addNotification} />}
          {activeSection === 'pricing' && <PricingCalculator projects={projects} materials={materials} userId={userId} addNotification={addNotification} />}
          {activeSection === 'analytics' && <Analytics projects={projects} />}
          {activeSection === 'materials' && <MaterialManagement userId={userId} addNotification={addNotification} />}
        </div>
      </main>
    </div>
  );
}

export default App;
