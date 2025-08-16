import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

import AuthPage from './components/AuthPage';
import DashboardOverview from './components/DashboardOverview';
import ProjectManagement from './components/ProjectManagement';
import TeamManagement from './components/TeamManagement';
import MaterialManagement from './components/MaterialManagement';
import ClientManagement from './components/ClientManagement';
import PricingCalculator from './components/PricingCalculator';
import Analytics from './components/Analytics';
import NotificationBell from './components/NotificationBell';
import ExpenseManagement from './components/ExpenseManagement';
import InvitationScreen from './components/InvitationScreen';

import { Home, Folder, Users, Package, Briefcase, BarChart2, LogOut, Info, CheckCircle, XCircle, Calculator, CreditCard, Menu, X } from 'lucide-react';

const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

const PERMISSIONS = {
  [ROLES.OWNER]: ['overview', 'projects', 'team', 'materials', 'clients', 'expenses', 'calculator', 'analytics'],
  [ROLES.ADMIN]: ['overview', 'projects', 'team', 'materials', 'clients', 'expenses', 'calculator', 'analytics'],
  [ROLES.EDITOR]: ['overview', 'projects', 'materials', 'clients', 'expenses', 'calculator', 'analytics'],
  [ROLES.VIEWER]: ['overview', 'projects', 'materials', 'clients', 'expenses', 'calculator', 'analytics'],
};

const NAV_ITEMS = [
    { id: 'overview', label: 'Resumen', icon: Home },
    { id: 'projects', label: 'Proyectos', icon: Folder },
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'materials', label: 'Materiales', icon: Package },
    { id: 'clients', label: 'Clientes', icon: Briefcase },
    { id: 'expenses', label: 'Gastos', icon: CreditCard },
    { id: 'calculator', label: 'Calculadora', icon: Calculator },
    { id: 'analytics', label: 'Analíticas', icon: BarChart2 },
];


const NotificationPopup = ({ notification }) => {
  const iconMap = {
    success: <CheckCircle className="text-green-400" />,
    error: <XCircle className="text-red-400" />,
    info: <Info className="text-blue-400" />,
  };

  return (
    <div className={`fixed bottom-5 right-5 flex items-center gap-4 p-4 rounded-lg shadow-2xl bg-gray-800 border border-gray-700/50 animate-fade-in-up`}>
      {iconMap[notification.type]}
      <p className="text-white">{notification.message}</p>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [userOrg, setUserOrg] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [pendingInvitation, setPendingInvitation] = useState(null);
  const [isUnassignedUser, setIsUnassignedUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview');
  const [notification, setNotification] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const addNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserOrg(null);
        setUserRole('');
        setPendingInvitation(null);
        setIsUnassignedUser(false);
        setLoading(false);
      }
    });
    return () => authUnsubscribe();
  }, []);

  const handleCreateNewOrganization = async () => {
    if (!user) return;
    try {
      const newOrgRef = collection(db, 'organizations');
      await addDoc(newOrgRef, {
          ownerId: user.uid, name: `${user.email.split('@')[0]}'s Team`,
          members: [{ uid: user.uid, email: user.email, role: 'owner' }],
          memberUIDs: [user.uid], createdAt: serverTimestamp(), pendingInvites: []
      });
      addNotification('¡Tu nueva organización ha sido creada!', 'success');
      await checkUserStatus(user);
    } catch (e) {
      console.error('Error al crear organización:', e);
      addNotification('Error al crear la organización.', 'error');
    }
  };

  const checkUserStatus = async (currentUser) => {
    if (!currentUser) return;
    setLoading(true);

    let orgQuery = query(collection(db, "organizations"), where("memberUIDs", "array-contains", currentUser.uid));
    let orgSnapshot = await getDocs(orgQuery);

    if (!orgSnapshot.empty) {
      const orgDoc = orgSnapshot.docs[0];
      const orgData = { id: orgDoc.id, ...orgDoc.data() };
      const memberInfo = orgData.members.find(m => m.uid === currentUser.uid);
      setUserOrg(orgData);
      setUserRole(memberInfo.role);
      setPendingInvitation(null);
      setIsUnassignedUser(false);
      setLoading(false);
      return;
    }

    orgQuery = query(collection(db, "organizations"), where("pendingInvites", "array-contains", currentUser.email));
    orgSnapshot = await getDocs(orgQuery);

    if (!orgSnapshot.empty) {
      const orgDoc = orgSnapshot.docs[0];
      setPendingInvitation({ orgId: orgDoc.id, orgName: orgDoc.data().name });
      setIsUnassignedUser(false);
      setLoading(false);
      return;
    }

    // Si el usuario no está en una organización ni tiene invitaciones pendientes,
    // establecemos el estado para mostrar la pantalla de elección.
    setPendingInvitation(null);
    setUserOrg(null);
    setUserRole('');
    setIsUnassignedUser(true);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      checkUserStatus(user);
    }
  }, [user]);

  const handleSignOut = () => {
    signOut(auth).catch((error) => console.error('Error signing out: ', error));
  };
  
  const handleViewChange = (newView) => {
    setView(newView);
    setIsSidebarOpen(false); // Cierra el menú en móviles después de seleccionar una vista
  };

  const renderContent = () => {
    // Si el usuario está "sin asignar", mostramos la pantalla de elección.
    if (isUnassignedUser) {
        return <InvitationScreen user={user} onDecision={handleCreateNewOrganization} isUnassignedUser={true} />;
    }
    
    // Si hay una invitación pendiente, mostramos la pantalla de invitación.
    if (pendingInvitation) {
      return <InvitationScreen user={user} invitation={pendingInvitation} onDecision={() => checkUserStatus(user)} />;
    }
    
    if (user && !userOrg && !loading) {
      return <div className="text-white text-center p-8">Comprobando estado de la organización...</div>;
    }
    
    switch (view) {
      case 'overview': return <DashboardOverview orgId={userOrg?.id} />;
      case 'projects': return <ProjectManagement orgId={userOrg?.id} userRole={userRole} addNotification={addNotification} />;
      case 'team': return <TeamManagement user={user} organization={userOrg} addNotification={addNotification} />;
      case 'materials': return <MaterialManagement orgId={userOrg?.id} userRole={userRole} addNotification={addNotification} />;
      case 'clients': return <ClientManagement orgId={userOrg?.id} userRole={userRole} addNotification={addNotification} />;
      case 'expenses': return <ExpenseManagement orgId={userOrg?.id} userRole={userRole} addNotification={addNotification} />;
      case 'calculator': return <PricingCalculator orgId={userOrg?.id} addNotification={addNotification} />;
      case 'analytics': return <Analytics orgId={userOrg?.id} />;
      default: return <DashboardOverview orgId={userOrg?.id} />;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Cargando...</div>;
  }

  if (!user) {
    return <AuthPage checkUserStatus={checkUserStatus} />;
  }
  
  const userPermissions = PERMISSIONS[userRole] || [];

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {!isUnassignedUser && !pendingInvitation && (
        <>
        {/* Barra lateral - Oculta en pantallas pequeñas, se muestra si isSidebarOpen es true */}
        <aside className={`fixed z-50 lg:relative w-64 bg-gray-800 p-5 flex flex-col shrink-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 lg:translate-x-0`}>
          <div className="flex items-center justify-between lg:justify-start mb-10">
            <div className="flex items-center">
              <img src="/logo.png" alt="Logo" className="h-8 w-8 mr-3"/>
              <span className="text-xl font-bold">3D Stock Manager</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <nav className="flex flex-col space-y-2">
            {NAV_ITEMS.map(item => {
                if (!userPermissions.includes(item.id)) {
                    return null;
                }
                const Icon = item.icon;
                return (
                    <button 
                        key={item.id}
                        onClick={() => handleViewChange(item.id)} 
                        className={`flex items-center p-3 rounded-lg transition-colors ${view === item.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                    >
                        <Icon className="mr-4" size={20} /> {item.label}
                    </button>
                );
            })}
          </nav>
          <div className="mt-auto">
             <button onClick={handleSignOut} className="flex items-center w-full p-3 rounded-lg hover:bg-red-600/80 transition-colors"><LogOut className="mr-4" size={20} /> Cerrar Sesión</button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Encabezado con el botón de hamburguesa */}
          <header className="bg-gray-900/50 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-700/50 lg:justify-end">
              <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-400 hover:text-white">
                <Menu size={24} />
              </button>
              <div className="ml-4 text-right">
                  <p className="font-semibold text-sm">{user.email}</p>
                  <p className="text-xs text-gray-400 capitalize">{userOrg?.name || 'Personal'} - {userRole}</p>
              </div>
          </header>
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
        </>
      )}
      {isUnassignedUser || pendingInvitation ? (
          <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            {renderContent()}
          </main>
      ) : null}
      {notification && <NotificationPopup notification={notification} />}
    </div>
  );
}

export default App;