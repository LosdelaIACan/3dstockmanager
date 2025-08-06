// src/components/DashboardOverview.jsx

import { useState, useEffect } from 'react';
import { User2, Briefcase, DollarSign, Clock, PlayCircle, CheckCircle, ArrowRight, Package } from 'lucide-react';
import dayjs from 'dayjs';

// Componente reutilizable para las tarjetas de estadísticas con degradados
const StatCard = ({ icon, title, value, gradient }) => (
  <div className={`relative p-6 rounded-2xl shadow-lg overflow-hidden text-white ${gradient} transition-transform transform hover:-translate-y-1`}>
    <div className="relative z-10">
      <div className="flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-xl">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-white/90">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </div>
    <div className="absolute -bottom-8 -right-8 text-white/10 scale-150">
      {icon}
    </div>
  </div>
);

const DashboardOverview = ({ userName, clientCount, projects, materials }) => {
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalRevenue: '0.00',
    totalStockKg: '0.00',
    topMaterials: [],
  });
  const [recentProjects, setRecentProjects] = useState([]);

  useEffect(() => {
    // --- CÁLCULOS DE PROYECTOS ---
    const active = projects.filter(p => p.status === 'en_proceso');
    const completed = projects.filter(p => p.status === 'completado');
    const revenue = completed.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
    
    // Ordenar proyectos por fecha de creación para obtener los más recientes
    const sortedProjects = [...projects].sort((a, b) => {
        const dateA = a.createdAt?.toDate() || 0;
        const dateB = b.createdAt?.toDate() || 0;
        return dateB - dateA;
    });
    setRecentProjects(sortedProjects.slice(0, 4));

    // --- CÁLCULOS DE MATERIALES ---
    const totalStockGrams = materials.reduce((sum, material) => sum + (Number(material.stockInGrams) || 0), 0);
    const totalStockKg = (totalStockGrams / 1000).toFixed(2);
    
    const sortedMaterials = [...materials].sort((a, b) => (b.stockInGrams || 0) - (a.stockInGrams || 0));
    const topMaterials = sortedMaterials.slice(0, 5);

    setStats({
      activeProjects: active.length,
      completedProjects: completed.length,
      totalRevenue: revenue.toFixed(2),
      totalStockKg: totalStockKg,
      topMaterials: topMaterials,
    });

  }, [projects, materials]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'en_cola': return { icon: <Clock size={16} />, text: 'En Cola', color: 'bg-yellow-500' };
      case 'en_proceso': return { icon: <PlayCircle size={16} />, text: 'En Proceso', color: 'bg-blue-500' };
      case 'completado': return { icon: <CheckCircle size={16} />, text: 'Completado', color: 'bg-green-500' };
      default: return { icon: <Clock size={16} />, text: 'Desconocido', color: 'bg-gray-500' };
    }
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-4xl font-extrabold text-gray-100">Bienvenido, {userName}!</h2>
        <p className="text-gray-400 mt-1">Este es el centro de mando de tu negocio de impresión 3D.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<DollarSign size={48} />} 
          title="Ingresos Totales" 
          value={`${stats.totalRevenue} €`}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard 
          icon={<User2 size={48} />} 
          title="Total Clientes" 
          value={clientCount}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
        />
        <StatCard 
          icon={<Briefcase size={48} />} 
          title="En Proceso" 
          value={stats.activeProjects}
          gradient="bg-gradient-to-br from-purple-500 to-violet-600"
        />
        <StatCard 
          icon={<Package size={48} />} 
          title="Stock Total" 
          value={`${stats.totalStockKg} kg`}
          gradient="bg-gradient-to-br from-orange-500 to-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna de Proyectos Recientes */}
        <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Proyectos Recientes</h3>
            <button onClick={() => alert('Navegar a la sección de proyectos')} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {recentProjects.length > 0 ? recentProjects.map(project => {
              const statusInfo = getStatusInfo(project.status);
              return (
                <div key={project.id} className="grid grid-cols-3 md:grid-cols-4 items-center p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors">
                  <div className="col-span-2 md:col-span-2">
                    <p className="font-bold text-white">{project.name}</p>
                    <p className="text-xs text-gray-400">{project.client || 'Sin cliente'}</p>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`}></div>
                    <p className="text-sm text-gray-300">{statusInfo.text}</p>
                  </div>
                  <p className="text-right font-semibold text-white hidden md:block">{project.budget ? `${project.budget} €` : 'N/A'}</p>
                </div>
              );
            }) : (
              <p className="text-center text-gray-500 py-4">No hay proyectos recientes.</p>
            )}
          </div>
        </div>

        {/* Columna de Top Materiales */}
        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Top 5 Materiales en Stock</h3>
          <div className="space-y-3">
            {stats.topMaterials.length > 0 ? stats.topMaterials.map(material => (
              <div key={material.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-600" style={{ backgroundColor: material.color }}></div>
                  <div>
                    <p className="font-semibold text-white">{material.name}</p>
                    <p className="text-xs text-gray-400">{material.brand}</p>
                  </div>
                </div>
                <p className="font-bold text-white">{(material.stockInGrams / 1000).toFixed(2)} kg</p>
              </div>
            )) : (
              <p className="text-center text-gray-500 py-4">No hay materiales en el inventario.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardOverview;
