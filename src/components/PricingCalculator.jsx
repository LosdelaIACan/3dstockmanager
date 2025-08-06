// src/components/PricingCalculator.jsx

import { useState, useEffect, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Calculator, Euro, Box, Save, LayoutGrid, Clock, Lock, Palette } from 'lucide-react';

const PricingCalculator = ({ projects, materials, userId, addNotification }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [weight, setWeight] = useState(0);
  const [materialType, setMaterialType] = useState('PLA');
  const [designHours, setDesignHours] = useState(0);
  const [profitMargin, setProfitMargin] = useState(30);
  const [isBulk, setIsBulk] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(0);

  const editableProjects = useMemo(() => {
    return projects.filter(p => p.status === 'en_cola' || p.status === 'en_proceso');
  }, [projects]);

  const isProjectLocked = selectedProject && selectedProject.status === 'completado';

  useEffect(() => {
    if (selectedProject) {
      setWeight(selectedProject.weight || 0);
      setMaterialType(selectedProject.material || 'PLA');
      setDesignHours(selectedProject.designHours || 0);
      setQuantity(selectedProject.quantity || 1);
      setIsBulk((selectedProject.quantity || 1) > 1);
      setTotalPrice(selectedProject.budget || 0);
    } else {
      setWeight(0);
      setMaterialType('PLA');
      setDesignHours(0);
      setQuantity(1);
      setIsBulk(false);
      setTotalPrice(0);
    }
  }, [selectedProject]);
  
  const designCostPerHour = 25;

  const calculatePrice = () => {
    const selectedMaterialObject = materials.find(m => m.type === materialType);

    if (!selectedMaterialObject) {
      addNotification(`El material "${materialType}" no se encuentra en el inventario. No se puede calcular el precio.`, 'error');
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
    if (!selectedProject || !userId || !totalPrice) {
      addNotification('Por favor, selecciona un proyecto para poder guardar el presupuesto.', 'error');
      return;
    }
    if (isProjectLocked) {
      addNotification('No se puede guardar el presupuesto de un proyecto completado.', 'error');
      return;
    }
    
    try {
      const projectRef = doc(db, `/artifacts/default-app-id/users/${userId}/projects`, selectedProject.id);
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
    if (projectId === "") {
      setSelectedProject(null);
    } else {
      const projectFound = projects.find(p => p.id === projectId);
      setSelectedProject(projectFound);
    }
  };

  const availableMaterialTypes = useMemo(() => {
    const types = materials.map(m => m.type);
    return [...new Set(types)];
  }, [materials]);

  return (
    <section className="space-y-6">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl mx-auto space-y-6">
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
          <div className="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-200 p-4 rounded-r-lg flex items-center gap-3">
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

        <div className="text-center bg-gray-700 p-6 rounded-lg space-y-4">
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
