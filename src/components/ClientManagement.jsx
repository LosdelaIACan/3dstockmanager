// src/components/ClientManagement.jsx

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Mail, User2, Phone, Plus, Trash2, Edit } from 'lucide-react';
import { db } from '../firebase';

const ClientManagement = ({ userId, addNotification }) => {
  const [clients, setClients] = useState([]);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [editingClient, setEditingClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!userId || !db) return;
    
    const clientCollectionPath = `/artifacts/default-app-id/users/${userId}/clients`;
    const q = query(collection(db, clientCollectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const clientsData = [];
        snapshot.forEach((doc) => {
          clientsData.push({ id: doc.id, ...doc.data() });
        });
        clientsData.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
        setClients(clientsData);
        setErrorMessage('');
      } catch (error) {
        console.error("Error al obtener los datos de los clientes:", error);
        setErrorMessage("Error al cargar la lista de clientes.");
      }
    }, (error) => {
      console.error("Error en la suscripción de onSnapshot:", error);
      setErrorMessage("Error en la conexión en tiempo real.");
    });

    return () => unsubscribe();
  }, [userId]);

  const handleAddOrEditClient = async (e) => {
    e.preventDefault();
    if (newClient.name.trim() === '' || !db || !userId) {
      setErrorMessage('El nombre del cliente no puede estar vacío.');
      return;
    }
    
    setIsAddingClient(true);
    try {
      const clientCollectionPath = `/artifacts/default-app-id/users/${userId}/clients`;
      if (editingClient) {
        const clientRef = doc(db, clientCollectionPath, editingClient.id);
        await updateDoc(clientRef, {
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
        });
        setEditingClient(null);
        addNotification(`Cliente "${newClient.name}" actualizado con éxito.`, 'success');
      } else {
        await addDoc(collection(db, clientCollectionPath), {
          ...newClient,
          createdAt: serverTimestamp(),
        });
        addNotification(`Cliente "${newClient.name}" añadido con éxito.`, 'success');
      }
      setNewClient({ name: '', email: '', phone: '' });
      setErrorMessage('');
    } catch (error) {
      console.error("Error al añadir/editar el cliente:", error);
      setErrorMessage("Error al guardar el cliente.");
      addNotification("Error al guardar el cliente.", 'error');
    } finally {
      setIsAddingClient(false);
    }
  };
  
  const handleEditClick = (client) => {
    setEditingClient(client);
    setNewClient({ name: client.name, email: client.email, phone: client.phone });
  };
  
  const handleCancelEdit = () => {
    setEditingClient(null);
    setNewClient({ name: '', email: '', phone: '' });
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete || !db || !userId) return;

    try {
      const clientDocRef = doc(db, `/artifacts/default-app-id/users/${userId}/clients`, clientToDelete.id);
      await deleteDoc(clientDocRef);
      addNotification(`Cliente "${clientToDelete.name}" eliminado correctamente.`, 'success');
      setClientToDelete(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Error al eliminar el cliente:", error);
      setErrorMessage("Error al eliminar el cliente.");
      addNotification("Error al eliminar el cliente.", 'error');
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setClientToDelete(null);
    setShowDeleteModal(false);
  };
  
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-200">Gestión de Clientes</h2>
      
      {errorMessage && (
        <div className="bg-red-900 text-red-300 p-4 rounded-lg text-center font-medium">
          {errorMessage}
        </div>
      )}
      
      <form onSubmit={handleAddOrEditClient} className="space-y-4 p-6 bg-gray-700 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-white">
          {editingClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <User2 className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="relative">
            <input
              type="email"
              placeholder="Email"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="relative">
            <input
              type="tel"
              placeholder="Teléfono"
              value={newClient.phone}
              onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              className="w-full p-3 pl-10 bg-gray-600 border border-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <Phone className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
        </div>
        <div className="flex space-x-2">
            <button
              type="submit"
              className={`flex-1 p-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2 ${isAddingClient ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isAddingClient}
            >
              <Plus size={20} />
              {isAddingClient ? 'Guardando...' : (editingClient ? 'Guardar Cambios' : 'Añadir Cliente')}
            </button>
            {editingClient && (
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
        <h3 className="text-xl font-semibold text-white">Clientes Registrados</h3>
        <ul className="mt-4 space-y-3">
          {clients.length > 0 ? (
            clients.map((client) => (
              <li
                key={client.id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-600 p-4 rounded-lg shadow-sm transition-all duration-200 hover:bg-gray-500"
              >
                <div className="flex-1">
                  <p className="text-lg font-semibold text-white">{client.name}</p>
                  <p className="text-sm text-gray-400">
                    {client.email} {client.phone && `| ${client.phone}`}
                  </p>
                </div>
                <div className="flex mt-2 md:mt-0 space-x-2">
                    <button
                        onClick={() => handleEditClick(client)}
                        className="text-white bg-green-500 hover:bg-green-600 p-2 rounded-lg transition-all duration-200"
                    >
                        <Edit size={20} />
                    </button>
                    <button
                        onClick={() => handleDeleteClick(client)}
                        className="text-white bg-red-500 hover:bg-red-600 p-2 rounded-lg transition-all duration-200"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-400 italic">No hay clientes aún. ¡Añade uno!</p>
          )}
        </ul>
      </div>
      
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar al cliente "{clientToDelete?.name}"?</p>
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

export default ClientManagement;