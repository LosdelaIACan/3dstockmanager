import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DollarSign, Tag, Calendar, Plus, Trash2, Edit, Loader2 } from 'lucide-react';

const ExpenseManagement = ({ orgId, userRole, addNotification }) => {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Material', date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'editor';

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    
    const expenseCollectionPath = `organizations/${orgId}/expenses`;
    const q = query(collection(db, expenseCollectionPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      expensesData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
      setExpenses(expensesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error al cargar gastos:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [orgId]);

  const handleAddOrEditExpense = async (e) => {
    e.preventDefault();
    if (newExpense.description.trim() === '' || !newExpense.amount || !orgId) {
      addNotification('La descripción y el importe son obligatorios.', 'error');
      return;
    }
    
    setIsSubmitting(true);
    const dataToSave = {
        ...newExpense,
        amount: Number(newExpense.amount)
    };

    try {
      const expenseCollectionPath = `organizations/${orgId}/expenses`;
      if (editingExpense) {
        const expenseRef = doc(db, expenseCollectionPath, editingExpense.id);
        await updateDoc(expenseRef, { ...dataToSave, updatedAt: serverTimestamp() });
        addNotification(`Gasto "${newExpense.description}" actualizado.`, 'success');
      } else {
        await addDoc(collection(db, expenseCollectionPath), { ...dataToSave, createdAt: serverTimestamp() });
        addNotification(`Gasto "${newExpense.description}" añadido.`, 'success');
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Error al guardar el gasto:", error);
      addNotification("Error al guardar el gasto.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setNewExpense({ description: expense.description, amount: expense.amount, category: expense.category, date: expense.date });
  };
  
  const handleCancelEdit = () => {
    setEditingExpense(null);
    setNewExpense({ description: '', amount: '', category: 'Material', date: '' });
  };

  const confirmDelete = async () => {
    if (!expenseToDelete || !orgId) return;
    try {
      const expenseDocRef = doc(db, `organizations/${orgId}/expenses`, expenseToDelete.id);
      await deleteDoc(expenseDocRef);
      addNotification(`Gasto "${expenseToDelete.description}" eliminado.`, 'success');
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error al eliminar el gasto:", error);
      addNotification("Error al eliminar el gasto.", 'error');
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!orgId) return <div className="text-center text-gray-400">No se ha encontrado una organización activa.</div>;
  
  return (
    <section className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-200">Gestión de Gastos</h2>
      
      {canEdit && (
        <form onSubmit={handleAddOrEditExpense} className="space-y-4 p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner">
          <h3 className="text-xl font-semibold text-white">{editingExpense ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative lg:col-span-2"><input type="text" placeholder="Descripción del gasto" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" required /><Tag className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><input type="number" placeholder="Importe (€)" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" required /><DollarSign className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
            <div className="relative"><input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} className="w-full p-3 pl-10 bg-gray-700 border border-gray-600 rounded-lg" required /><Calendar className="absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" size={20} /></div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                <option>Material</option>
                <option>Envío</option>
                <option>Software</option>
                <option>Herramientas</option>
                <option>Otro</option>
            </select>
            <div className="flex space-x-2">
                <button type="submit" className="p-3 bg-blue-600 font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2" disabled={isSubmitting}><Plus size={20} />{isSubmitting ? 'Guardando...' : (editingExpense ? 'Guardar Cambios' : 'Añadir Gasto')}</button>
                {editingExpense && (<button type="button" onClick={handleCancelEdit} className="p-3 bg-gray-500 font-bold rounded-lg hover:bg-gray-600 transition-all">Cancelar</button>)}
            </div>
          </div>
        </form>
      )}

      <div className="p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-inner">
        <h3 className="text-xl font-semibold text-white">Gastos Registrados</h3>
        <ul className="mt-4 space-y-3">
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <li key={expense.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                <div className="flex-1">
                  <p className="text-lg font-semibold text-white">{expense.description}</p>
                  <p className="text-sm text-gray-400">{expense.category} | {expense.date}</p>
                </div>
                <div className="flex items-center gap-4 mt-2 md:mt-0">
                    <p className="font-bold text-red-400 text-lg">{expense.amount.toFixed(2)} €</p>
                    {canEdit && (
                        <div className="flex space-x-2">
                            <button onClick={() => handleEditClick(expense)} className="text-white bg-green-600 hover:bg-green-700 p-2 rounded-lg"><Edit size={20} /></button>
                            <button onClick={() => setExpenseToDelete(expense)} className="text-white bg-red-600 hover:bg-red-700 p-2 rounded-lg"><Trash2 size={20} /></button>
                        </div>
                    )}
                </div>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-400 italic py-5">No hay gastos registrados.</p>
          )}
        </ul>
      </div>
      
      {expenseToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white">Confirmar Eliminación</h2>
            <p className="text-gray-400">¿Estás seguro de que quieres eliminar este gasto?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setExpenseToDelete(null)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ExpenseManagement;