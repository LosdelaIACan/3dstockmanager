// src/components/ProjectManagement.jsx

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Briefcase, User2, PlayCircle, Clock, CheckCircle, Plus, Edit, Trash2, Calendar, Box } from 'lucide-react';
import dayjs from 'dayjs';

// Constantes y función de cálculo de precios
const materialPrices = {
  PLA: 0.03,
  ABS: 0.04,
  PETG: 0.05,
  ASA: 0.06,
  Resina: 0.1
};
const designCostPerHour = 25;
const profitMargin = 30;

const calculateProjectBudget = (projectData) => {
  const { weight, material, designHours, quantity } = projectData;

  if (!weight || !material) return projectData.budget;

  const materialCost = Number(weight) * materialPrices[material];
  const designCost = Number(designHours || 0) * designCostPerHour;
  const totalCost = materialCost + designCost;
  const finalPrice = totalCost * (1 + profitMargin / 100);
  
  return (finalPrice * Number(quantity || 1)).toFixed(2);
};

const ProjectManagement = ({ userId, clients, addNotification }) => {
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    status: 'en_cola',
    estimatedDeliveryDate: '',
    type: '',
    material: '',
    description: '',
    quantity: '',
    budget: '',
    weight: '',
    designHours: '',
  });
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingProject, setEditingProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');

  // useEffect para suscribirse a los cambios de proyectos en Firestore
  useEffect(() => {
    if (!userId || !db) return;
    
    const projectCollectionPath = `/artifacts/default-app-id/users/${userId}/projects`;
    const q = query(collection(db, projectCollectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const projectsData = [];
        snapshot.forEach((doc) => {
          projectsData.push({ id: doc.id, ...doc.data() });
        });
        projectsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
        setProjects(projectsData);
        setErrorMessage('');
      } catch (error) {
        console.error("Error al obtener los datos de los proyectos:", error);
        setErrorMessage("Error al cargar la lista de proyectos.");
      }
    }, (error) => {
      console.error("Error en la suscripción de onSnapshot:", error);
      setErrorMessage("Error en la conexión en tiempo real.");
    });

    return () => unsubscribe();
  }, [userId]);

  const handleAddOrEditProject = async (e) => {
    e.preventDefault();
    if (newProject.name.trim() === '' || !db || !userId) {
      setErrorMessage('El nombre del proyecto no puede estar vacío.');
      return;
    }

    setIsAddingProject(true);
    try {
      const projectCollectionPath = `/artifacts/default-app-id/users/${userId}/projects`;
      
      let updatedProjectData = { ...newProject };
      
      if (editingProject && editingProject.budget) {
        const newBudget = calculateProjectBudget({
          ...editingProject,
          ...newProject,
          quantity: Number(newProject.quantity) || 1,
          weight: Number(newProject.weight) || 0,
          designHours: Number(newProject.designHours) || 0
        });
        updatedProjectData = { ...updatedProjectData, budget: newBudget };
      }
      
      if (editingProject) {
        const projectRef = doc(db, projectCollectionPath, editingProject.id);
        await updateDoc(projectRef, {
          ...updatedProjectData,
          updatedAt: serverTimestamp(),
        });
        setEditingProject(null);
        addNotification(`Proyecto "${newProject.name}" actualizado con éxito.`, 'success');
      } else {
        await addDoc(collection(db, projectCollectionPath), {
          ...updatedProjectData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        addNotification(`Proyecto "${newProject.name}" añadido con éxito.`, 'success');
      }
      setNewProject({ name: '', client: '', status: 'en_cola', estimatedDeliveryDate: '', type: '', material: '', description: '', quantity: '', budget: '', weight: '', designHours: '' });
      setErrorMessage('');
    } catch (error) {
      console.error("Error al añadir/editar el proyecto:", error);
      setErrorMessage("Error al guardar el proyecto.");
      addNotification("Error al guardar el proyecto.", 'error');
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleChangeStatus = async (projectId, newStatus) => {
    try {
      const projectDocRef = doc(db, `/artifacts/default-app-id/users/${userId}/projects`, projectId);
      await updateDoc(projectDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      addNotification(`El estado del proyecto ha sido actualizado a "${newStatus.replace('_', ' ')}".`, 'success');
    } catch (error) {
      console.error("Error al actualizar el estado del proyecto:", error);
      setErrorMessage("No se pudo actualizar el estado del proyecto.");
      addNotification("Error al actualizar el estado del proyecto.", 'error');
    }
  };
  
  const handleEditClick = (project) => {
      setEditingProject(project);
      setNewProject({
          name: project.name,
          client: project.client,
          status: project.status,
          estimatedDeliveryDate: project.estimatedDeliveryDate ? dayjs(project.estimatedDeliveryDate).format('YYYY-MM-DD') : '',
          type: project.type,
          material: project.material,
          description: project.description,
          quantity: project.quantity,
          budget: project.budget,
          weight: project.weight,
          designHours: project.designHours,
      });
  };

  const handleCancelEdit = () => {
      setEditingProject(null);
      setNewProject({ name: '', client: '', status: 'en_cola', estimatedDeliveryDate: '', type: '', material: '', description: '', quantity: '', budget: '', weight: '', designHours: '' });
  };
  
  const handleDeleteClick = (project) => {
      setProjectToDelete(project);
      setShowDeleteModal(true);
  };
  
  const confirmDelete = async () => {
      if (!projectToDelete || !db || !userId) return;
      try {
          const projectDocRef = doc(db, `/artifacts/default-app-id/users/${userId}/projects`, projectToDelete.id);
          await deleteDoc(projectDocRef);
          addNotification(`Proyecto "${projectToDelete.name}" eliminado correctamente.`, 'success');
          setProjectToDelete(null);
          setShowDeleteModal(false);
      } catch (error) {
          console.error("Error al eliminar el proyecto:", error);
          setErrorMessage("Error al eliminar el proyecto.");
          addNotification("Error al eliminar el proyecto.", 'error');
          setShowDeleteModal(false);
      }
  };
  
  const cancelDelete = () => {
      setProjectToDelete(null);
      setShowDeleteModal(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'en_cola':
        return <Clock size={20} className="text-gray-400" />;
      case 'en_proceso':
        return <PlayCircle size={20} className="text-blue-400" />;
      case 'completado':
        return <CheckCircle size={20} className="text-green-400" />;
      default:
        return null;
    }
  };

  const daysSinceUpdate = (updatedAt) => {
    if (!updatedAt) return 0;
    const lastUpdate = dayjs(updatedAt.toDate());
    const today = dayjs();
    return today.diff(lastUpdate, 'day');
  };
  
  const filteredProjects = projects.filter(project => {
    if (filterStatus === 'todos') {
      return true;
    }
    return project.status === filterStatus;
  });

  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-200">Gestión de Proyectos</h2>
      {errorMessage && (
        <div className="bg-red-900 text-red-300 p-4 rounded-lg text-center font-medium">
          {errorMessage}
        </div>
      )}
      
      <form onSubmit={handleAddOrEditProject} className="space-y-4 p-6 bg-gray-700 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-white">
          {editingProject ? 'Editar Proyecto' : 'Añadir Nuevo Proyecto'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Nombre del proyecto"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <Briefcase className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="relative">
            <User2 className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={newProject.client}
              onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="">Selecciona un cliente (opcional)</option>
              {clients.map(client => (
                <option key={client.id} value={client.name}>{client.name}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <input
              type="date"
              value={newProject.estimatedDeliveryDate}
              onChange={(e) => setNewProject({ ...newProject, estimatedDeliveryDate: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <Calendar className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="relative">
            <Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={newProject.material}
              onChange={(e) => setNewProject({ ...newProject, material: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="">Selecciona un material</option>
              <option value="PLA">PLA</option>
              <option value="ABS">ABS</option>
              <option value="PETG">PETG</option>
              <option value="ASA">ASA</option>
              <option value="Resina">Resina</option>
            </select>
          </div>
          <div className="relative">
            <Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={newProject.type}
              onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="">Tipo de proyecto</option>
              <option value="llaveros">Llaveros</option>
              <option value="caja">Caja</option>
              <option value="personalizado">Personalizado</option>
              <option value="figura_grande">Figura Grande</option>
              <option value="figura_pequena">Figura Pequeña</option>
            </select>
          </div>
          
          <div className="relative">
              <input
                type="number"
                placeholder="Peso (gramos)"
                value={newProject.weight}
                onChange={(e) => setNewProject({ ...newProject, weight: e.target.value })}
                className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                min="0"
              />
              <Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="Horas de diseño (opcional)"
                value={newProject.designHours}
                onChange={(e) => setNewProject({ ...newProject, designHours: e.target.value })}
                className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                min="0"
              />
              <Clock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

          {newProject.type === 'llaveros' && (
            <div className="relative col-span-1">
              <input
                type="number"
                placeholder="Cantidad"
                value={newProject.quantity}
                onChange={(e) => setNewProject({ ...newProject, quantity: e.target.value })}
                className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                min="1"
              />
              <Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
          )}

          <div className="relative col-span-1 md:col-span-2 lg:col-span-3">
              <textarea
                  placeholder="Descripción del proyecto"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full p-3 pl-4 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  rows="3"
              ></textarea>
          </div>
        </div>
        <div className="flex space-x-2">
            <button
                type="submit"
                className={`flex-1 p-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2 ${isAddingProject ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isAddingProject}
            >
                <Plus size={20} />
                {isAddingProject ? 'Guardando...' : (editingProject ? 'Guardar Cambios' : 'Añadir Proyecto')}
            </button>
            {editingProject && (
                <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-4 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600 transition-all duration-200 ease-in-out"
                >
                    Cancelar
                </button>
            )}
        </div>
      </form>
      
      <div className="p-6 bg-gray-700 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-white">Proyectos Registrados</h3>
        <div className="flex flex-wrap gap-2 mt-4 mb-6">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${filterStatus === 'todos' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('en_cola')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${filterStatus === 'en_cola' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
          >
            En cola
          </button>
          <button
            onClick={() => setFilterStatus('en_proceso')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${filterStatus === 'en_proceso' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
          >
            En proceso
          </button>
          <button
            onClick={() => setFilterStatus('completado')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${filterStatus === 'completado' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
          >
            Completados
          </button>
        </div>
        <ul className="mt-4 space-y-3">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <li
                key={project.id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-600 p-4 rounded-lg shadow-sm transition-all duration-200 hover:bg-gray-500"
              >
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-shrink-0">
                      {getStatusIcon(project.status)}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{project.name}</p>
                    <p className="text-sm text-gray-400">
                      {project.client ? `Cliente: ${project.client}` : 'Sin cliente asignado'}
                    </p>
                    <div className="mt-2 text-sm text-gray-300 space-y-1">
                      {project.estimatedDeliveryDate && (
                          <p>Entrega Estimada: <span className="font-medium text-white">{dayjs(project.estimatedDeliveryDate).format('DD/MM/YYYY')}</span></p>
                      )}
                      {project.type && (
                          <p>Tipo de proyecto: <span className="font-medium text-white">{project.type}</span></p>
                      )}
                      {project.material && (
                          <p>Material: <span className="font-medium text-white">{project.material}</span></p>
                      )}
                      {project.quantity && (
                          <p>Cantidad: <span className="font-medium text-white">{project.quantity}</span></p>
                      )}
                      {project.description && (
                          <p>Descripción: <span className="text-gray-400">{project.description}</span></p>
                      )}
                      <p>
                        Presupuesto: <span className="font-bold text-green-400">{project.budget ? `${project.budget} €` : 'Sin asignar'}</span>
                      </p>
                      <p>
                        Última actualización: <span className="font-medium text-white">{daysSinceUpdate(project.updatedAt)}</span> días sin cambios.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex mt-4 md:mt-0 space-x-2 flex-shrink-0">
                  <select
                      value={project.status}
                      onChange={(e) => handleChangeStatus(project.id, e.target.value)}
                      className="p-2 bg-gray-500 text-white rounded-lg text-sm"
                  >
                      <option value="en_cola">En Cola</option>
                      <option value="en_proceso">En Proceso</option>
                      <option value="completado">Completado</option>
                  </select>
                  <button
                      onClick={() => handleEditClick(project)}
                      className="text-white bg-green-500 hover:bg-green-600 p-2 rounded-lg transition-all duration-200"
                  >
                      <Edit size={20} />
                  </button>
                  <button
                      onClick={() => handleDeleteClick(project)}
                      className="text-white bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-all duration-200"
                  >
                      <Trash2 size={20} />
                  </button>
                </div>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-400 italic">No hay proyectos aún. ¡Añade uno!</p>
          )}
        </ul>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar el proyecto "{projectToDelete?.name}"?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectManagement;