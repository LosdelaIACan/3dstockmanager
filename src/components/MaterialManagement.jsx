// src/components/MaterialManagement.jsx

import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Box, Plus, Trash2, Edit, TrendingUp, TrendingDown, Palette, Tag, Type, Weight, Euro } from 'lucide-react';

const MaterialManagement = ({ userId, addNotification }) => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [materialForm, setMaterialForm] = useState({
    name: '', brand: '', type: 'PLA', color: '#FFFFFF',
    pricePerKg: '', stockInGrams: '', reorderThreshold: '',
  });

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialToDelete, setMaterialToDelete] = useState(null);

  // Cargar inventario desde Firestore (sin lógica de notificación)
  useEffect(() => {
    if (!userId) return;

    const materialsCollectionPath = `/artifacts/default-app-id/users/${userId}/materials`;
    const q = query(collection(db, materialsCollectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materialsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      materialsData.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
      setInventory(materialsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setMaterialForm(prev => ({ ...prev, [name]: value }));
  };

  const resetFormAndClose = () => {
    setMaterialForm({
      name: '', brand: '', type: 'PLA', color: '#FFFFFF',
      pricePerKg: '', stockInGrams: '', reorderThreshold: '',
    });
    setEditingMaterial(null);
    setShowAddForm(false);
  };

  const handleAddOrEditMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.name || !materialForm.brand || !materialForm.type) {
      addNotification('Nombre, marca y tipo son campos obligatorios.', 'error');
      return;
    }

    const dataToSave = {
      ...materialForm,
      pricePerKg: Number(materialForm.pricePerKg) || 0,
      stockInGrams: Number(materialForm.stockInGrams) || 0,
      reorderThreshold: Number(materialForm.reorderThreshold) || 0,
      pricePerGram: (Number(materialForm.pricePerKg) || 0) / 1000,
      updatedAt: serverTimestamp(),
    };

    try {
      const materialsCollectionPath = `/artifacts/default-app-id/users/${userId}/materials`;
      if (editingMaterial) {
        const materialRef = doc(db, materialsCollectionPath, editingMaterial.id);
        await updateDoc(materialRef, dataToSave);
        addNotification(`Material "${dataToSave.name}" actualizado con éxito.`, 'success');
      } else {
        await addDoc(collection(db, materialsCollectionPath), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        addNotification(`Material "${dataToSave.name}" añadido al inventario.`, 'success');
      }
      resetFormAndClose();
    } catch (error) {
      console.error("Error al guardar el material:", error);
      addNotification("Error al guardar el material.", 'error');
    }
  };

  const handleEditClick = (material) => {
    setEditingMaterial(material);
    setMaterialForm({
      name: material.name,
      brand: material.brand,
      type: material.type,
      color: material.color,
      pricePerKg: material.pricePerKg,
      stockInGrams: material.stockInGrams,
      reorderThreshold: material.reorderThreshold,
    });
    setShowAddForm(true);
  };

  const handleDeleteClick = (material) => {
    setMaterialToDelete(material);
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;
    try {
      const materialDocRef = doc(db, `/artifacts/default-app-id/users/${userId}/materials`, materialToDelete.id);
      await deleteDoc(materialDocRef);
      addNotification(`Material "${materialToDelete.name}" eliminado correctamente.`, 'success');
      setMaterialToDelete(null);
    } catch (error) {
      console.error("Error al eliminar el material:", error);
      addNotification("Error al eliminar el material.", 'error');
    }
  };

  const handleToggleForm = () => {
    // Si el formulario está cerrado y lo vamos a abrir, lo reseteamos
    if (!showAddForm) {
      setEditingMaterial(null);
      setMaterialForm({
        name: '', brand: '', type: 'PLA', color: '#FFFFFF',
        pricePerKg: '', stockInGrams: '', reorderThreshold: '',
      });
    }
    setShowAddForm(prev => !prev);
  };

  const getStatusIcon = (stock, threshold) => {
    if (stock < threshold) {
      return <TrendingDown size={20} className="text-red-400" />;
    }
    return <TrendingUp size={20} className="text-green-400" />;
  };

  if (isLoading) {
    return <div className="text-center text-gray-400">Cargando inventario...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-200">Gestión de Inventario</h2>
        <button
          onClick={handleToggleForm}
          className="flex items-center gap-2 p-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          {showAddForm ? 'Ocultar Formulario' : 'Añadir Material'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-700 p-6 rounded-xl shadow-inner">
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingMaterial ? 'Editar Material' : 'Añadir Nuevo Material'}
          </h3>
          <form onSubmit={handleAddOrEditMaterial} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Columna 1 */}
            <div className="space-y-4">
              <input name="name" value={materialForm.name} onChange={handleFormChange} placeholder="Nombre (ej: Rojo Fuego)" className="w-full p-3 bg-gray-600 rounded-lg" />
              <input name="brand" value={materialForm.brand} onChange={handleFormChange} placeholder="Marca (ej: Prusament)" className="w-full p-3 bg-gray-600 rounded-lg" />
              <select name="type" value={materialForm.type} onChange={handleFormChange} className="w-full p-3 bg-gray-600 rounded-lg">
                <option>PLA</option><option>PETG</option><option>ABS</option>
                <option>ASA</option><option>Resina</option><option>TPU</option>
              </select>
            </div>
            {/* Columna 2 */}
            <div className="space-y-4">
              <input name="pricePerKg" type="number" value={materialForm.pricePerKg} onChange={handleFormChange} placeholder="Precio por Kg (€)" className="w-full p-3 bg-gray-600 rounded-lg" />
              <input name="stockInGrams" type="number" value={materialForm.stockInGrams} onChange={handleFormChange} placeholder="Stock inicial (gramos)" className="w-full p-3 bg-gray-600 rounded-lg" />
              <input name="reorderThreshold" type="number" value={materialForm.reorderThreshold} onChange={handleFormChange} placeholder="Umbral de alerta (gramos)" className="w-full p-3 bg-gray-600 rounded-lg" />
            </div>
            {/* Columna 3 */}
            <div className="space-y-4 flex flex-col items-center">
              <label className="text-gray-300">Color del material</label>
              <input name="color" type="color" value={materialForm.color} onChange={handleFormChange} className="w-24 h-24 p-0 border-none rounded-full cursor-pointer bg-gray-600" />
              <div className="flex gap-2 w-full mt-auto">
                <button type="button" onClick={resetFormAndClose} className="flex-1 p-3 bg-gray-500 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 p-3 bg-green-600 rounded-lg">{editingMaterial ? 'Guardar Cambios' : 'Añadir'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {inventory.map(material => (
          <div key={material.id} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col">
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Tag size={14} /> {material.brand}</p>
                  <h3 className="text-xl font-bold text-white">{material.name}</h3>
                </div>
                <div
                  className="w-12 h-12 rounded-full border-4 border-gray-700"
                  style={{ backgroundColor: material.color }}
                ></div>
              </div>
              <p className="text-sm text-gray-300 flex items-center gap-2"><Type size={16} /> Tipo: <span className="font-semibold">{material.type}</span></p>
              <p className="text-sm text-gray-300 flex items-center gap-2"><Euro size={16} /> Precio: <span className="font-semibold">{material.pricePerKg} €/kg</span></p>
              <div className="text-sm text-gray-300 flex items-center gap-2">
                <Weight size={16} /> Stock: 
                <span className={`font-bold ${material.stockInGrams < material.reorderThreshold ? 'text-red-400' : 'text-green-400'}`}>
                  {material.stockInGrams}g
                </span>
                {getStatusIcon(material.stockInGrams, material.reorderThreshold)}
              </div>
              <p className="text-xs text-gray-400">Umbral de alerta: {material.reorderThreshold}g</p>
            </div>
            <div className="bg-gray-700 p-2 flex justify-end gap-2 rounded-b-xl">
              <button onClick={() => handleEditClick(material)} className="p-2 text-blue-400 hover:bg-gray-600 rounded-md"><Edit size={18} /></button>
              <button onClick={() => handleDeleteClick(material)} className="p-2 text-red-400 hover:bg-gray-600 rounded-md"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {materialToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar "{materialToDelete.name}" del inventario?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setMaterialToDelete(null)} className="px-4 py-2 bg-gray-300 text-black rounded-lg">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default MaterialManagement;
