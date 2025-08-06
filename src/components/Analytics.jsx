// src/components/Analytics.jsx

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const Analytics = ({ projects }) => {
  // Datos para el gráfico de barras: Proyectos por estado
  const projectStatusData = [
    { name: 'En cola', count: projects.filter(p => p.status === 'en_cola').length },
    { name: 'En proceso', count: projects.filter(p => p.status === 'en_proceso').length },
    { name: 'Completado', count: projects.filter(p => p.status === 'completado').length },
  ];

  // Datos para el gráfico de pastel: Materiales más usados
  const materialUsage = projects.reduce((acc, project) => {
    if (project.material) {
      const existing = acc.find(item => item.name === project.material);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: project.material, value: 1 });
      }
    }
    return acc;
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-200">Reportes y Analíticas</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras: Proyectos por Estado */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Proyectos por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={projectStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
              <XAxis dataKey="name" stroke="#cbd5e0" />
              <YAxis stroke="#cbd5e0" />
              <Tooltip cursor={{ fill: '#4a5568', opacity: 0.5 }} contentStyle={{ backgroundColor: '#2d3748', border: 'none', color: 'white' }}/>
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Número de Proyectos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Gráfico de Pastel: Materiales más usados */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Uso de Materiales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={materialUsage}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {materialUsage.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#2d3748', border: 'none', color: 'white' }}/>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default Analytics;