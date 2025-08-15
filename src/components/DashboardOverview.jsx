import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User2, Briefcase, DollarSign, Clock, PlayCircle, CheckCircle, ArrowRight, Package, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

const StatCard = ({ icon, title, value, gradient }) => (
  <div className={`relative p-6 rounded-2xl shadow-lg overflow-hidden text-white ${gradient} transition-transform transform hover:-translate-y-1`}>
    <div className="relative z-10">
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-xl">{icon}</div>
        <div>
          <p className="text-sm font-medium text-white/90">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </div>
    <div className="absolute -bottom-8 -right-8 text-white/10 scale-150">{icon}</div>
  </div>
);

const DashboardOverview = ({ orgId }) => {
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const projectsRef = collection(db, 'organizations', orgId, 'projects');
    const materialsRef = collection(db, 'organizations', orgId, 'materials');
    const clientsRef = collection(db, 'organizations', orgId, 'clients');

    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubscribeMaterials = onSnapshot(materialsRef, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubscribeClients = onSnapshot(clientsRef, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));

    return () => {
      unsubscribeProjects();
      unsubscribeMaterials();
      unsubscribeClients();
    };
  }, [orgId]);

  // --- Cálculos de Estadísticas ---
  const activeProjects = projects.filter(p => p.status === 'en_proceso').length;
  const totalRevenue = projects.filter(p => p.status === 'completado').reduce((sum, p) => sum + (Number(p.budget) || 0), 0).toFixed(2);
  const totalStockKg = (materials.reduce((sum, m) => sum + (Number(m.stockInGrams) || 0), 0) / 1000).toFixed(2);
  const clientCount = clients.length;
  const recentProjects = [...projects].sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)).slice(0, 4);
  const topMaterials = [...materials].sort((a, b) => (b.stockInGrams || 0) - (a.stockInGrams || 0)).slice(0, 5);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'en_cola': return { icon: <Clock size={16} />, text: 'En Cola', color: 'bg-yellow-500' };
      case 'en_proceso': return { icon: <PlayCircle size={16} />, text: 'En Proceso', color: 'bg-blue-500' };
      case 'completado': return { icon: <CheckCircle size={16} />, text: 'Completado', color: 'bg-green-500' };
      default: return { icon: <Clock size={16} />, text: 'Desconocido', color: 'bg-gray-500' };
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!orgId) return <div className="text-center text-gray-400">No se ha encontrado una organización activa.</div>;

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-4xl font-extrabold text-gray-100">Bienvenido, {auth.currentUser?.displayName || auth.currentUser?.email}!</h2>
        <p className="text-gray-400 mt-1">Este es el centro de mando de tu negocio de impresión 3D.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<DollarSign size={48} />} title="Ingresos Totales" value={`${totalRevenue} €`} gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
        <StatCard icon={<User2 size={48} />} title="Total Clientes" value={clientCount} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
        <StatCard icon={<Briefcase size={48} />} title="En Proceso" value={activeProjects} gradient="bg-gradient-to-br from-purple-500 to-violet-600" />
        <StatCard icon={<Package size={48} />} title="Stock Total" value={`${totalStockKg} kg`} gradient="bg-gradient-to-br from-orange-500 to-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Proyectos Recientes</h3>
          <div className="space-y-4">
            {recentProjects.length > 0 ? recentProjects.map(project => {
              const statusInfo = getStatusInfo(project.status);
              return (
                <div key={project.id} className="grid grid-cols-3 md:grid-cols-4 items-center p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="col-span-2"><p className="font-bold text-white">{project.name}</p><p className="text-xs text-gray-400">{project.client || 'Sin cliente'}</p></div>
                  <div className="flex items-center gap-2 justify-center"><div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`}></div><p className="text-sm text-gray-300">{statusInfo.text}</p></div>
                  <p className="text-right font-semibold text-white hidden md:block">{project.budget ? `${project.budget} €` : 'N/A'}</p>
                </div>
              );
            }) : <p className="text-center text-gray-500 py-4">No hay proyectos recientes.</p>}
          </div>
        </div>

        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Top 5 Materiales en Stock</h3>
          <div className="space-y-3">
            {topMaterials.length > 0 ? topMaterials.map(material => (
              <div key={material.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-600" style={{ backgroundColor: material.color }}></div>
                  <div><p className="font-semibold text-white">{material.name}</p><p className="text-xs text-gray-400">{material.brand}</p></div>
                </div>
                <p className="font-bold text-white">{(material.stockInGrams / 1000).toFixed(2)} kg</p>
              </div>
            )) : <p className="text-center text-gray-500 py-4">No hay materiales en el inventario.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardOverview;
