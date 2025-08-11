import React, { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Calculator, Box, Save, LayoutGrid, Clock, Lock, Palette, Loader2 } from 'lucide-react';

const PricingCalculator = ({ orgId, addNotification }) => {
  // Estados para los datos cargados desde Firestore
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para los inputs de la calculadora
  const [selectedProject, setSelectedProject] = useState(null);
  const [weight, setWeight] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [designHours, setDesignHours] = useState('');
  const [profitMargin, setProfitMargin] = useState(30);
  const [isBulk, setIsBulk] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  // Cargar proyectos y materiales de la organización actual
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    
    const projectsRef = collection(db, 'organizations', orgId, 'projects');
    const materialsRef = collection(db, 'organizations', orgId, 'materials');

    const unsubscribeProjects = onSnapshot(projectsRef, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, () => setLoading(false));

    const unsubscribeMaterials = onSnapshot(materialsRef, (snapshot) => {
      setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeProjects();
      unsubscribeMaterials();
    };
  }, [orgId]);

  const editableProjects = useMemo(() => {
    return projects.filter(p => p.status === 'en_cola' || p.status === 'en_proceso');
  }, [projects]);

  const isProjectLocked = selectedProject && selectedProject.status === 'completado';

  useEffect(() => {
    if (selectedProject) {
      setWeight(selectedProject.weight || '');
      setMaterialType(selectedProject.material || '');
      setDesignHours(selectedProject.designHours || '');
      setQuantity(selectedProject.quantity || 1);
      setIsBulk((selectedProject.quantity || 1) > 1);
      setTotalPrice(selectedProject.budget || 0);
    } else {
      setWeight('');
      setMaterialType('');
      setDesignHours('');
      setQuantity(1);
      setIsBulk(false);
      setTotalPrice(0);
    }
  }, [selectedProject]);
  
  const designCostPerHour = 25;

  const calculatePrice = () => {
    const selectedMaterialObject = materials.find(m => m.type === materialType);

    if (!selectedMaterialObject) {
      addNotification(`El material "${materialType}" no se encuentra en el inventario.`, 'error');
      return;
    }

    const pricePerGram = (selectedMaterialObject.pricePerKg || 0) / 1000;
    const materialCost = Number(weight) * pricePerGram;
    const designCost = Number(designHours) * designCostPerHour;
    const totalCost = materialCost + designCost;
    const finalPrice = totalCost * (1 + profitMargin / 100);
    const finalPriceWithQuantity = isBulk ? finalPrice * Number(quantity) : finalPrice;
    
    setTotalPrice(finalPriceWithQuantity.toFixed(2));
  };
  
  const handleCalculateClick = (e) => {
    e.preventDefault();
    if (isProjectLocked) {
      addNotification('No se puede calcular el precio de un proyecto completado.', 'error');
      return;
    }
    calculatePrice();
  };

  const handleSaveBudget = async () => {
    if (!selectedProject || !orgId || !totalPrice) {
      addNotification('Por favor, selecciona un proyecto para poder guardar el presupuesto.', 'error');
      return;
    }
    if (isProjectLocked) {
      addNotification('No se puede guardar el presupuesto de un proyecto completado.', 'error');
      return;
    }
    
    try {
      // RUTA CORREGIDA: Apunta a la subcolección de la organización
      const projectRef = doc(db, 'organizations', orgId, 'projects', selectedProject.id);
      await updateDoc(projectRef, {
        budget: Number(totalPrice),
        updatedAt: serverTimestamp(),
        weight: Number(weight),
        material: materialType,
        designHours: Number(designHours),
        quantity: Number(quantity),
      });
      addNotification(`Presupuesto de ${totalPrice} € guardado para "${selectedProject.name}".`, 'success');
    } catch (error) {
      console.error('Error al guardar el presupuesto:', error);
      addNotification('Error al guardar el presupuesto.', 'error');
    }
  };

  const handleProjectSelect = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projects.find(p => p.id === projectId) || null);
  };

  const availableMaterialTypes = useMemo(() => {
    const types = materials.map(m => m.type);
    return [...new Set(types)];
  }, [materials]);

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!orgId) return <div className="text-center text-gray-400">No se ha encontrado una organización activa.</div>;

  return (
    <section className="space-y-6">
      <div className="bg-gray-800/50 border border-gray-700/50 p-8 rounded-xl shadow-2xl w-full max-w-xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-gray-200 text-center">Calculadora de Precios</h2>
        
        <div className="relative">
          <label className="text-sm text-gray-400 mb-1 block">Selecciona un Proyecto (Opcional)</label>
          <select
            onChange={handleProjectSelect}
            value={selectedProject?.id || ""}
            className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          >
            <option value="">Calcular sin proyecto...</option>
            {editableProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.status.replace('_', ' ')})</option>
            ))}
          </select>
          <LayoutGrid className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400 mt-4" size={20} />
        </div>
        
        {isProjectLocked && (
          <div className="bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-200 p-4 rounded-r-lg flex items-center gap-3">
            <Lock size={24} />
            <div>
              <p className="font-bold">Proyecto Completado</p>
              <p className="text-sm">El presupuesto de este proyecto no se puede modificar.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleCalculateClick} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm text-gray-400 mb-1 block">Peso del Objeto (g)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-700 rounded-lg disabled:bg-gray-600"
                disabled={isProjectLocked} />
              <Box className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400 mt-4" size={20} />
            </div>
            <div className="relative">
              <label className="text-sm text-gray-400 mb-1 block">Material</label>
              <select value={materialType} onChange={(e) => setMaterialType(e.target.value)}
                className="w-full p-3 pl-10 bg-gray-700 rounded-lg disabled:bg-gray-600"
                disabled={isProjectLocked}>
                <option value="">Selecciona material</option>
                {availableMaterialTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <Palette className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400 mt-4" size={20} />
            </div>
          </div>
          <div className="relative">
            <label className="text-sm text-gray-400 mb-1 block">Horas de Diseño</label>
            <input type="number" value={designHours} onChange={(e) => setDesignHours(e.target.value)}
              className="w-full p-3 pl-10 bg-gray-700 rounded-lg disabled:bg-gray-600"
              disabled={isProjectLocked} />
            <Clock className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400 mt-4" size={20} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center text-gray-300">
              <input type="checkbox" checked={isBulk} onChange={(e) => setIsBulk(e.target.checked)}
                className="form-checkbox text-blue-500 rounded-sm"
                disabled={isProjectLocked} />
              <span className="ml-2">Pedido al por mayor</span>
            </label>
            {isBulk && (
              <div className="relative flex-1">
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded-lg disabled:bg-gray-600"
                  min="1"
                  disabled={isProjectLocked} />
              </div>
            )}
          </div>
          <button type="submit"
            className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:bg-blue-800 disabled:cursor-not-allowed"
            disabled={isProjectLocked}>
            <Calculator size={20} />
            Calcular Precio
          </button>
        </form>

        <div className="text-center bg-gray-900/50 p-6 rounded-lg space-y-4">
          <p className="text-gray-400 text-xl font-medium">Precio Estimado:</p>
          <p className="text-5xl font-extrabold text-green-400 mt-2">{totalPrice} €</p>
          <button onClick={handleSaveBudget}
            className="w-full p-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:bg-green-800 disabled:cursor-not-allowed"
            disabled={!selectedProject || isProjectLocked || !totalPrice}>
            <Save size={20} />
            Guardar Presupuesto
          </button>
        </div>
      </div>
    </section>
  );
};

export default PricingCalculator;
