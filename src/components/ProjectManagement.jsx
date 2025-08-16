import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Briefcase, User2, PlayCircle, Clock, CheckCircle, Plus, Edit, Trash2, Calendar, Box, Loader2 } from 'lucide-react';
import dayjs from 'dayjs';

// Las constantes de precios se pueden mantener si son globales para la app.
const materialPrices = {
  PLA: 0.03, ABS: 0.04, PETG: 0.05, ASA: 0.06, Resina: 0.1
};
const designCostPerHour = 25;
const profitMargin = 30;

const calculateProjectBudget = (projectData) => {
  const { weight, material, designHours, quantity } = projectData;
  if (!weight || !material || !materialPrices[material]) return projectData.budget || 0;
  const materialCost = Number(weight) * materialPrices[material];
  const designCost = Number(designHours || 0) * designCostPerHour;
  const totalCost = materialCost + designCost;
  const finalPrice = totalCost * (1 + profitMargin / 100);
  return (finalPrice * Number(quantity || 1)).toFixed(2);
};

// El componente ahora recibe orgId y userRole desde App.jsx
const ProjectManagement = ({ orgId, userRole, addNotification }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({ name: '', client: '', status: 'en_cola', estimatedDeliveryDate: '', type: '', material: '', description: '', quantity: '1', budget: '', weight: '', designHours: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState('todos');

  // Permisos basados en el rol del usuario
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

  // useEffect para cargar proyectos y clientes de la organización
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    // RUTA CORREGIDA: Apunta a la subcolección de la organización
    const projectsPath = `organizations/${orgId}/projects`;
    const clientsPath = `organizations/${orgId}/clients`;

    const projectsQuery = query(collection(db, projectsPath));
    const clientsQuery = query(collection(db, clientsPath));

    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      projectsData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
      setProjects(projectsData);
      setLoading(false);
    }, error => {
      console.error("Error al cargar proyectos:", error);
      setLoading(false);
    });

    const unsubscribeClients = onSnapshot(clientsQuery, (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeProjects();
      unsubscribeClients();
    };
  }, [orgId]);

  const handleAddOrEditProject = async (e) => {
    e.preventDefault();
    if (newProject.name.trim() === '' || !orgId) return;

    setIsSubmitting(true);
    try {
      // RUTA CORREGIDA
      const projectCollectionPath = `organizations/${orgId}/projects`;
      
      let updatedProjectData = { ...newProject, budget: calculateProjectBudget(newProject) };

      if (editingProject) {
        const projectRef = doc(db, projectCollectionPath, editingProject.id);
        await updateDoc(projectRef, { ...updatedProjectData, updatedAt: serverTimestamp() });
        addNotification(`Proyecto "${newProject.name}" actualizado.`, 'success');
        setEditingProject(null);
      } else {
        await addDoc(collection(db, projectCollectionPath), { ...updatedProjectData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        addNotification(`Proyecto "${newProject.name}" añadido.`, 'success');
      }
      handleCancelEdit(); // Resetea el formulario
    } catch (error) {
      console.error("Error al guardar el proyecto:", error);
      addNotification("Error al guardar el proyecto.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeStatus = async (projectId, newStatus) => {
    try {
      const projectDocRef = doc(db, `organizations/${orgId}/projects`, projectId);
      await updateDoc(projectDocRef, { status: newStatus, updatedAt: serverTimestamp() });
      addNotification(`Estado del proyecto actualizado.`, 'success');
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      addNotification("Error al actualizar estado.", 'error');
    }
  };
  
  const handleEditClick = (project) => {
    setEditingProject(project);
    setNewProject({
      name: project.name || '', client: project.client || '', status: project.status || 'en_cola',
      estimatedDeliveryDate: project.estimatedDeliveryDate ? dayjs(project.estimatedDeliveryDate).format('YYYY-MM-DD') : '',
      type: project.type || '', material: project.material || '', description: project.description || '',
      quantity: project.quantity || '1', budget: project.budget || '', weight: project.weight || '', designHours: project.designHours || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setNewProject({ name: '', client: '', status: 'en_cola', estimatedDeliveryDate: '', type: '', material: '', description: '', quantity: '1', budget: '', weight: '', designHours: '' });
  };
  
  const handleDeleteClick = (project) => setProjectToDelete(project);
  
  const confirmDelete = async () => {
    if (!projectToDelete || !orgId) return;
    try {
      const projectDocRef = doc(db, `organizations/${orgId}/projects`, projectToDelete.id);
      await deleteDoc(projectDocRef);
      addNotification(`Proyecto "${projectToDelete.name}" eliminado.`, 'success');
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error al eliminar:", error);
      addNotification("Error al eliminar.", 'error');
      setProjectToDelete(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'en_cola': return <Clock size={20} className="text-gray-400" />;
      case 'en_proceso': return <PlayCircle size={20} className="text-blue-400" />;
      case 'completado': return <CheckCircle size={20} className="text-green-400" />;
      default: return null;
    }
  };

  const filteredProjects = projects.filter(p => filterStatus === 'todos' || p.status === filterStatus);

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!orgId) return <div className="text-center text-gray-400">No se ha encontrado una organización activa.</div>;

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-200">Gestión de Proyectos</h2>
      
      {canEdit && (
        <form onSubmit={handleAddOrEditProject} className="space-y-4 p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner">
          <h3 className="text-xl font-semibold text-white">{editingProject ? 'Editar Proyecto' : 'Añadir Nuevo Proyecto'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Campos del formulario (iguales al original) */}
            <div className="relative"><input type="text" placeholder="Nombre del proyecto" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required /><Briefcase className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><User2 className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /><select value={newProject.client} onChange={(e) => setNewProject({ ...newProject, client: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Selecciona cliente</option>{clients.map(c => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></div>
            <div className="relative"><input type="date" value={newProject.estimatedDeliveryDate} onChange={(e) => setNewProject({ ...newProject, estimatedDeliveryDate: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><Calendar className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /><select value={newProject.material} onChange={(e) => setNewProject({ ...newProject, material: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Material</option>{Object.keys(materialPrices).map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div className="relative"><Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /><select value={newProject.type} onChange={(e) => setNewProject({ ...newProject, type: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="">Tipo de proyecto</option><option value="llaveros">Llaveros</option><option value="caja">Caja</option><option value="personalizado">Personalizado</option></select></div>
            <div className="relative"><input type="number" placeholder="Peso (g)" value={newProject.weight} onChange={(e) => setNewProject({ ...newProject, weight: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" min="0" /><Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><input type="number" placeholder="Horas de diseño" value={newProject.designHours} onChange={(e) => setNewProject({ ...newProject, designHours: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" min="0" /><Clock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><input type="number" placeholder="Cantidad" value={newProject.quantity} onChange={(e) => setNewProject({ ...newProject, quantity: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" min="1" /><Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative md:col-span-2 lg:col-span-3"><textarea placeholder="Descripción" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg" rows="3"></textarea></div>
          </div>
          <div className="flex space-x-2 pt-2"><button type="submit" className="flex-1 p-3 bg-blue-600 font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2" disabled={isSubmitting}><Plus size={20} />{isSubmitting ? 'Guardando...' : (editingProject ? 'Guardar Cambios' : 'Añadir Proyecto')}</button>{editingProject && (<button type="button" onClick={handleCancelEdit} className="p-3 bg-gray-500 font-bold rounded-lg hover:bg-gray-600 transition-all">Cancelar</button>)}</div>
        </form>
      )}
      
      <div className="p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-white">Proyectos Registrados</h3>
        <div className="flex flex-wrap gap-2 mt-4 mb-6">
          {/* Botones de filtro */}
          <button onClick={() => setFilterStatus('todos')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'todos' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>Todos</button>
          <button onClick={() => setFilterStatus('en_cola')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'en_cola' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>En cola</button>
          <button onClick={() => setFilterStatus('en_proceso')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'en_proceso' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>En proceso</button>
          <button onClick={() => setFilterStatus('completado')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'completado' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}>Completados</button>
        </div>
        <ul className="mt-4 space-y-3">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <li key={project.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-shrink-0">{getStatusIcon(project.status)}</div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{project.name}</p>
                    <p className="text-sm text-gray-400">{project.client ? `Cliente: ${project.client}` : 'Sin cliente'}</p>
                    <div className="mt-2 text-xs text-gray-300 grid grid-cols-2 gap-x-4 gap-y-1">
                      {project.estimatedDeliveryDate && <p>Entrega: <span className="font-medium text-white">{dayjs(project.estimatedDeliveryDate).format('DD/MM/YYYY')}</span></p>}
                      {project.type && <p>Tipo: <span className="font-medium text-white">{project.type}</span></p>}
                      {project.material && <p>Material: <span className="font-medium text-white">{project.material}</span></p>}
                      {project.quantity && <p>Cantidad: <span className="font-medium text-white">{project.quantity}</span></p>}
                      <p className="col-span-2">Presupuesto: <span className="font-bold text-green-400">{project.budget ? `${project.budget} €` : 'N/A'}</span></p>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex mt-4 md:mt-0 space-x-2 flex-shrink-0 self-end md:self-center">
                    <select value={project.status} onChange={(e) => handleChangeStatus(project.id, e.target.value)} className="p-2 bg-gray-600 text-white rounded-lg text-sm"><option value="en_cola">En Cola</option><option value="en_proceso">En Proceso</option><option value="completado">Completado</option></select>
                    <button onClick={() => handleEditClick(project)} className="text-white bg-green-600 hover:bg-green-700 p-2 rounded-lg"><Edit size={20} /></button>
                    <button onClick={() => handleDeleteClick(project)} className="text-white bg-red-600 hover:bg-red-700 p-2 rounded-lg"><Trash2 size={20} /></button>
                  </div>
                )}
              </li>
            ))
          ) : (
            <p className="text-center text-gray-400 italic py-5">No hay proyectos que coincidan con el filtro.</p>
          )}
        </ul>
      </div>

      {projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar el proyecto "{projectToDelete?.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectManagement;