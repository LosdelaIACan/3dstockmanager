import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { Plus, Edit, Trash2 } from 'lucide-react'; // Import icons

// Componente Modal para crear/editar proyectos
const ProjectModal = ({ isOpen, onClose, onSave, project }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Not Started');

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setStatus(project.status || 'Not Started');
    } else {
      setName('');
      setDescription('');
      setStatus('Not Started');
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ name, description, status });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">{project ? 'Editar Proyecto' : 'Nuevo Proyecto'}</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre del Proyecto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600"
          />
          <textarea
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600 h-24"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600"
          >
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>On Hold</option>
          </select>
        </div>
        <div className="flex justify-end mt-6 space-x-3">
          <button onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded">Cancelar</button>
          <button onClick={handleSave} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded">Guardar</button>
        </div>
      </div>
    </div>
  );
};


// Componente principal de gestión de proyectos
function ProjectManagement({ orgId, userRole }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);

  // Determina si el usuario tiene permisos de edición basándose en su rol
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

  useEffect(() => {
    // Si no hay orgId, no se puede hacer la consulta.
    if (!orgId) {
      setLoading(false);
      return;
    }

    // La ruta de la colección ahora apunta a la subcolección 'projects' dentro de la organización
    const projectsCollectionRef = collection(db, 'organizations', orgId, 'projects');
    
    // onSnapshot escucha cambios en tiempo real en la colección de proyectos
    const unsubscribe = onSnapshot(projectsCollectionRef, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projectsData);
      setLoading(false);
    });

    // Se desuscribe del listener cuando el componente se desmonta
    return () => unsubscribe();
  }, [orgId]); // El efecto se vuelve a ejecutar si el orgId cambia

  const handleOpenModal = (project = null) => {
    setCurrentProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentProject(null);
  };

  const handleSaveProject = async (projectData) => {
    const projectsCollectionRef = collection(db, 'organizations', orgId, 'projects');
    if (currentProject) {
      // Actualizar proyecto existente
      const projectDocRef = doc(db, 'organizations', orgId, 'projects', currentProject.id);
      await updateDoc(projectDocRef, projectData);
    } else {
      // Crear nuevo proyecto
      await addDoc(projectsCollectionRef, { ...projectData, createdAt: new Date() });
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este proyecto?')) {
      const projectDocRef = doc(db, 'organizations', orgId, 'projects', projectId);
      await deleteDoc(projectDocRef);
    }
  };
  
  if (loading) {
    return <div className="text-white">Cargando proyectos...</div>;
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Proyectos</h2>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
          >
            <Plus className="mr-2" size={20} />
            Crear Proyecto
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} className="bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{project.name}</h3>
              <p className="text-gray-400 mb-4">{project.description}</p>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                project.status === 'Completed' ? 'text-green-600 bg-green-200' : 
                project.status === 'In Progress' ? 'text-yellow-600 bg-yellow-200' : 'text-gray-600 bg-gray-200'
              }`}>
                {project.status}
              </span>
              {canEdit && (
                <div className="flex space-x-2">
                  <button onClick={() => handleOpenModal(project)} className="text-gray-400 hover:text-white"><Edit size={18} /></button>
                  <button onClick={() => handleDeleteProject(project.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ProjectModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProject}
        project={currentProject}
      />
    </div>
  );
}

export default ProjectManagement;
