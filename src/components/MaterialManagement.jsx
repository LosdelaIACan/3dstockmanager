import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Box, Plus, Trash2, Edit, TrendingUp, TrendingDown, Tag, Type, Weight, Euro, Loader2, PackagePlus } from 'lucide-react';

// --- Nuevo Componente: Modal para Añadir Stock ---
const AddStockModal = ({ material, orgId, onClose, addNotification }) => {
  const [amount, setAmount] = useState('');

  const handleAddStock = async (e) => {
    e.preventDefault();
    const amountToAdd = Number(amount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      addNotification('Por favor, introduce una cantidad válida.', 'error');
      return;
    }

    const newStock = (material.stockInGrams || 0) + amountToAdd;
    const materialRef = doc(db, `organizations/${orgId}/materials`, material.id);

    try {
      await updateDoc(materialRef, { stockInGrams: newStock });
      addNotification(`Añadidos ${amountToAdd}g de stock a "${material.name}".`, 'success');
      onClose();
    } catch (error) {
      console.error("Error al añadir stock:", error);
      addNotification("Error al actualizar el stock.", 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
        <h2 className="text-xl font-bold text-white">Añadir Stock a "{material.name}"</h2>
        <p className="text-gray-400">Stock actual: <span className="font-bold">{material.stockInGrams}g</span></p>
        <form onSubmit={handleAddStock}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Gramos a añadir"
            className="w-full p-3 bg-gray-700 rounded-lg"
            autoFocus
          />
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700">Añadir</button>
          </div>
        </form>
      </div>
    </div>
  );
};


const MaterialManagement = ({ orgId, userRole, addNotification }) => {
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [materialForm, setMaterialForm] = useState({
    name: '', brand: '', type: 'PLA', color: '#FFFFFF',
    pricePerKg: '', stockInGrams: '', reorderThreshold: '',
  });

  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [materialToAddStock, setMaterialToAddStock] = useState(null); // Estado para el modal de añadir stock

  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    const materialsCollectionPath = `organizations/${orgId}/materials`;
    const q = query(collection(db, materialsCollectionPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const materialsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      materialsData.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
      setInventory(materialsData);
      setIsLoading(false);
    }, error => {
        console.error("Error al cargar materiales:", error);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [orgId]);

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
      updatedAt: serverTimestamp(),
    };
    try {
      const materialsCollectionPath = `organizations/${orgId}/materials`;
      if (editingMaterial) {
        const materialRef = doc(db, materialsCollectionPath, editingMaterial.id);
        await updateDoc(materialRef, dataToSave);
        addNotification(`Material "${dataToSave.name}" actualizado.`, 'success');
      } else {
        await addDoc(collection(db, materialsCollectionPath), { ...dataToSave, createdAt: serverTimestamp() });
        addNotification(`Material "${dataToSave.name}" añadido.`, 'success');
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
      name: material.name, brand: material.brand, type: material.type,
      color: material.color, pricePerKg: material.pricePerKg,
      stockInGrams: material.stockInGrams, reorderThreshold: material.reorderThreshold,
    });
    setShowAddForm(true);
  };

  const confirmDelete = async () => {
    if (!materialToDelete || !orgId) return;
    try {
      const materialDocRef = doc(db, `organizations/${orgId}/materials`, materialToDelete.id);
      await deleteDoc(materialDocRef);
      addNotification(`Material "${materialToDelete.name}" eliminado.`, 'success');
      setMaterialToDelete(null);
    } catch (error) {
      console.error("Error al eliminar el material:", error);
      addNotification("Error al eliminar el material.", 'error');
    }
  };

  const getStatusIcon = (stock, threshold) => {
    if (stock < threshold) return <TrendingDown size={20} className="text-red-400" />;
    return <TrendingUp size={20} className="text-green-400" />;
  };

  if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!orgId) return <div className="text-center text-gray-400">No se ha encontrado una organización activa.</div>;

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-200">Gestión de Inventario</h2>
        {canEdit && (
            <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 p-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all">
                <Plus size={20} />
                {showAddForm ? 'Ocultar Formulario' : 'Añadir Material'}
            </button>
        )}
      </div>

      {showAddForm && canEdit && (
        <div className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl shadow-inner">
          <h3 className="text-xl font-semibold text-white mb-4">{editingMaterial ? 'Editar Material' : 'Nuevo Material'}</h3>
          <form onSubmit={handleAddOrEditMaterial} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-4"><input name="name" value={materialForm.name} onChange={handleFormChange} placeholder="Nombre (ej: Rojo Fuego)" className="w-full p-3 bg-gray-700 rounded-lg" required /><input name="brand" value={materialForm.brand} onChange={handleFormChange} placeholder="Marca (ej: Prusament)" className="w-full p-3 bg-gray-700 rounded-lg" required /><select name="type" value={materialForm.type} onChange={handleFormChange} className="w-full p-3 bg-gray-700 rounded-lg"><option>PLA</option><option>PETG</option><option>ABS</option><option>ASA</option><option>Resina</option><option>TPU</option></select></div>
            <div className="space-y-4"><input name="pricePerKg" type="number" value={materialForm.pricePerKg} onChange={handleFormChange} placeholder="Precio por Kg (€)" className="w-full p-3 bg-gray-700 rounded-lg" /><input name="stockInGrams" type="number" value={materialForm.stockInGrams} onChange={handleFormChange} placeholder="Stock inicial (g)" className="w-full p-3 bg-gray-700 rounded-lg" /><input name="reorderThreshold" type="number" value={materialForm.reorderThreshold} onChange={handleFormChange} placeholder="Umbral de alerta (g)" className="w-full p-3 bg-gray-700 rounded-lg" /></div>
            <div className="space-y-4 flex flex-col items-center"><label className="text-gray-300">Color del material</label><input name="color" type="color" value={materialForm.color} onChange={handleFormChange} className="w-24 h-24 p-0 border-none rounded-full cursor-pointer bg-gray-700" /><div className="flex gap-2 w-full mt-auto"><button type="button" onClick={resetFormAndClose} className="flex-1 p-3 bg-gray-500 rounded-lg">Cancelar</button><button type="submit" className="flex-1 p-3 bg-green-600 rounded-lg">{editingMaterial ? 'Guardar' : 'Añadir'}</button></div></div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {inventory.map(material => (
          <div key={material.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg flex flex-col">
            <div className="p-4 space-y-3 flex-grow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Tag size={14} /> {material.brand}</p>
                  <h3 className="text-xl font-bold text-white">{material.name}</h3>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-gray-700" style={{ backgroundColor: material.color }}></div>
              </div>
              <p className="text-sm text-gray-300 flex items-center gap-2"><Type size={16} /> Tipo: <span className="font-semibold">{material.type}</span></p>
              <p className="text-sm text-gray-300 flex items-center gap-2"><Euro size={16} /> Precio: <span className="font-semibold">{material.pricePerKg} €/kg</span></p>
              <div className="text-sm text-gray-300 flex items-center gap-2"><Weight size={16} /> Stock: <span className={`font-bold ${material.stockInGrams < material.reorderThreshold ? 'text-red-400' : 'text-green-400'}`}>{material.stockInGrams}g</span>{getStatusIcon(material.stockInGrams, material.reorderThreshold)}</div>
              <p className="text-xs text-gray-400">Umbral de alerta: {material.reorderThreshold}g</p>
            </div>
            {canEdit && (
                <div className="bg-gray-700/50 p-2 flex justify-end gap-2 rounded-b-xl">
                    <button onClick={() => setMaterialToAddStock(material)} className="p-2 text-green-400 hover:bg-gray-600 rounded-md" title="Añadir Stock"><PackagePlus size={18} /></button>
                    <button onClick={() => handleEditClick(material)} className="p-2 text-blue-400 hover:bg-gray-600 rounded-md" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setMaterialToDelete(material)} className="p-2 text-red-400 hover:bg-gray-600 rounded-md" title="Eliminar"><Trash2 size={18} /></button>
                </div>
            )}
          </div>
        ))}
      </div>

      {materialToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar "{materialToDelete.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMaterialToDelete(null)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {materialToAddStock && (
        <AddStockModal
          material={materialToAddStock}
          orgId={orgId}
          onClose={() => setMaterialToAddStock(null)}
          addNotification={addNotification}
        />
      )}
    </section>
  );
};

export default MaterialManagement;
