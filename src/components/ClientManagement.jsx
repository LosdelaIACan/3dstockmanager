import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Mail, User2, Phone, Plus, Trash2, Edit, Loader2 } from 'lucide-react';

const ClientManagement = ({ orgId, userRole, addNotification }) => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingClient, setEditingClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);

  // Permisos basados en el rol del usuario
  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

  // Cargar clientes desde la organización actual en Firestore
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    
    // RUTA CORREGIDA: Apunta a la subcolección de la organización
    const clientCollectionPath = `organizations/${orgId}/clients`;
    const q = query(collection(db, clientCollectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar por fecha de creación si el campo existe
      clientsData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
      setClients(clientsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error al cargar clientes:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const handleAddOrEditClient = async (e) => {
    e.preventDefault();
    if (newClient.name.trim() === '' || !orgId) {
      addNotification('El nombre del cliente no puede estar vacío.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // RUTA CORREGIDA
      const clientCollectionPath = `organizations/${orgId}/clients`;
      if (editingClient) {
        const clientRef = doc(db, clientCollectionPath, editingClient.id);
        await updateDoc(clientRef, {
          ...newClient,
          updatedAt: serverTimestamp(),
        });
        addNotification(`Cliente "${newClient.name}" actualizado.`, 'success');
      } else {
        await addDoc(collection(db, clientCollectionPath), {
          ...newClient,
          createdAt: serverTimestamp(),
        });
        addNotification(`Cliente "${newClient.name}" añadido.`, 'success');
      }
      handleCancelEdit(); // Resetea el formulario
    } catch (error) {
      console.error("Error al guardar el cliente:", error);
      addNotification("Error al guardar el cliente.", 'error');
    } finally {
      setIsSubmitting(false);
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

  const confirmDelete = async () => {
    if (!clientToDelete || !orgId) return;
    try {
      // RUTA CORREGIDA
      const clientDocRef = doc(db, `organizations/${orgId}/clients`, clientToDelete.id);
      await deleteDoc(clientDocRef);
      addNotification(`Cliente "${clientToDelete.name}" eliminado.`, 'success');
      setClientToDelete(null);
    } catch (error) {
      console.error("Error al eliminar el cliente:", error);
      addNotification("Error al eliminar el cliente.", 'error');
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!orgId) return <div className="text-center text-gray-400">No se ha encontrado una organización activa.</div>;
  
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-200">Gestión de Clientes</h2>
      
      {canEdit && (
        <form onSubmit={handleAddOrEditClient} className="space-y-4 p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner">
          <h3 className="text-xl font-semibold text-white">{editingClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative"><input type="text" placeholder="Nombre del cliente" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" required /><User2 className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><input type="email" placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" /><Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><input type="tel" placeholder="Teléfono" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" /><Phone className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
          </div>
          <div className="flex space-x-2 pt-2">
            <button type="submit" className="flex-1 p-3 bg-blue-600 font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2" disabled={isSubmitting}><Plus size={20} />{isSubmitting ? 'Guardando...' : (editingClient ? 'Guardar Cambios' : 'Añadir Cliente')}</button>
            {editingClient && (<button type="button" onClick={handleCancelEdit} className="p-3 bg-gray-500 font-bold rounded-lg hover:bg-gray-600 transition-all">Cancelar</button>)}
          </div>
        </form>
      )}

      <div className="p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-white">Clientes Registrados</h3>
        <ul className="mt-4 space-y-3">
          {clients.length > 0 ? (
            clients.map((client) => (
              <li key={client.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-white">{client.name}</p>
                  <p className="text-sm text-gray-400">{client.email} {client.phone && `| ${client.phone}`}</p>
                </div>
                {canEdit && (
                    <div className="flex mt-2 md:mt-0 space-x-2 self-end md:self-center">
                        <button onClick={() => handleEditClick(client)} className="text-white bg-green-600 hover:bg-green-700 p-2 rounded-lg"><Edit size={20} /></button>
                        <button onClick={() => setClientToDelete(client)} className="text-white bg-red-600 hover:bg-red-700 p-2 rounded-lg"><Trash2 size={20} /></button>
                    </div>
                )}
              </li>
            ))
          ) : (
            <p className="text-center text-gray-400 italic py-5">No hay clientes aún. ¡Añade uno!</p>
          )}
        </ul>
      </div>
      
      {clientToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar al cliente "{clientToDelete?.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setClientToDelete(null)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ClientManagement;
