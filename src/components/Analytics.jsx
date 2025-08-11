import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

function Analytics({ orgId }) {
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    const projectsRef = collection(db, 'organizations', orgId, 'projects');
    const expensesRef = collection(db, 'organizations', orgId, 'expenses');

    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      setProjects(snapshot.docs.map(doc => doc.data()));
    });

    const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => doc.data()));
      setLoading(false);
    }, () => setLoading(false));

    return () => {
        unsubscribeProjects();
        unsubscribeExpenses();
    };
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }
  
  if (!orgId) {
     return <div className="text-center text-gray-400">No se ha encontrado una organización activa para mostrar analíticas.</div>;
  }

  // --- Procesamiento de datos ---
  const statusData = projects.reduce((acc, project) => {
    const status = project.status || 'en_cola';
    const existing = acc.find(item => item.name === status.replace('_', ' '));
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: status.replace('_', ' '), count: 1 });
    }
    return acc;
  }, []);

  const totalIncome = projects.filter(p => p.status === 'completado').reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netBalance = totalIncome - totalExpenses;

  const balanceData = [
      { name: 'Balance', Ingresos: totalIncome, Gastos: totalExpenses, Neto: netBalance }
  ];

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-8">Analíticas Financieras y de Proyectos</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4">Balance de Ingresos y Gastos</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={balanceData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
              <XAxis dataKey="name" stroke="#A0AEC0" />
              <YAxis stroke="#A0AEC0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568', color: '#E2E8F0' }}
                formatter={(value) => `${value.toFixed(2)} €`}
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#48BB78" />
              <Bar dataKey="Gastos" fill="#F56565" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-4">Proyectos por Estado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="count" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} proyectos`, name]} contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
