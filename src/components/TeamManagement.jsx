import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, collection, getDocs, deleteDoc, query, writeBatch, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserPlus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

const MemberRow = ({ member, members, orgId, currentUserRole, addNotification }) => {
  const isSelf = member.uid === auth.currentUser.uid;
  const isOwner = member.role === 'owner';

  const handleRoleChange = async (newRole) => {
    if (currentUserRole !== 'owner' || isSelf) return;

    const updatedMembers = members.map(m =>
      m.uid === member.uid ? { ...m, role: newRole } : m
    );

    const orgRef = doc(db, 'organizations', orgId);
    try {
        await updateDoc(orgRef, { members: updatedMembers });
        addNotification(`Rol de ${member.email} actualizado a ${newRole}.`, 'success');
    } catch (error) {
        addNotification('Error al actualizar el rol.', 'error');
        console.error("Error updating role:", error);
    }
  };

  const handleRemoveMember = async () => {
    if (currentUserRole !== 'owner' || isSelf) return;
    if (window.confirm(`¿Estás seguro de que quieres eliminar a ${member.email}?`)) {
      const updatedMembers = members.filter(m => m.uid !== member.uid);
      const updatedUIDs = updatedMembers.map(m => m.uid);
      const orgRef = doc(db, 'organizations', orgId);
      await updateDoc(orgRef, { members: updatedMembers, memberUIDs: updatedUIDs });
      addNotification(`${member.email} ha sido eliminado del equipo.`, 'info');
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
      <div className="flex items-center">
        {isOwner && <ShieldCheck className="text-yellow-400 mr-3" size={20} />}
        <p className="text-white">{member.email} {isSelf && '(Tú)'}</p>
      </div>
      <div className="flex items-center gap-4">
        {isOwner ? (
          <span className="px-2 py-1 text-xs font-bold text-yellow-300 bg-yellow-900/50 rounded-full">Propietario</span>
        ) : (
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentUserRole !== 'owner'}
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        )}
        <button
          onClick={handleRemoveMember}
          className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={isOwner || currentUserRole !== 'owner'}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

const TeamManagement = ({ user, organization, addNotification }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  if (!organization) return <div className="text-center text-white">Cargando datos del equipo...</div>;

  const currentUserRole = organization.members.find(m => m.uid === user.uid)?.role || '';
  const orgId = organization.id;

  const handleInvite = async (e) => {
    e.preventDefault();
    const emailToInvite = inviteEmail.trim().toLowerCase();
    if (!emailToInvite || (currentUserRole !== 'owner' && currentUserRole !== 'admin')) {
      addNotification("Email inválido o no tienes permisos.", 'error');
      return;
    }
    if (organization.members.some(m => m.email === emailToInvite) || organization.pendingInvites?.includes(emailToInvite)) {
        addNotification("Este usuario ya es miembro o tiene una invitación pendiente.", 'error');
        return;
    }

    try {
      const orgRef = doc(db, 'organizations', orgId);
      await updateDoc(orgRef, {
        pendingInvites: arrayUnion(emailToInvite)
      });
      addNotification(`Invitación enviada a ${emailToInvite}.`, 'success');
      setInviteEmail('');
    } catch (error) {
      console.error("Error al enviar invitación:", error);
      addNotification("No se pudo enviar la invitación.", 'error');
    }
  };

  const deleteCollection = async (collectionPath) => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, collectionPath);
    const q = query(collectionRef);
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  };

  const handleDeleteOrganization = async () => {
    if (currentUserRole !== 'owner') {
        addNotification("Solo el propietario puede eliminar la organización.", 'error');
        return;
    }

    try {
      const orgRef = doc(db, 'organizations', orgId);

      await deleteCollection(`organizations/${orgId}/projects`);
      await deleteCollection(`organizations/${orgId}/materials`);
      await deleteCollection(`organizations/${orgId}/clients`);
      await deleteCollection(`organizations/${orgId}/expenses`);
      
      await deleteDoc(orgRef);
      addNotification('Organización eliminada con éxito.', 'success');
      setShowDeleteModal(false);
      window.location.reload();
    } catch (error) {
      console.error("Error al eliminar la organización:", error);
      addNotification("Error al eliminar la organización.", 'error');
    }
  };

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">Gestionar Equipo</h2>
      {canManage && (
        <form onSubmit={handleInvite} className="mb-8 flex flex-col sm:flex-row gap-3 bg-gray-800/50 border border-gray-700/50 p-4 rounded-lg">
          <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Email del nuevo miembro" className="flex-grow bg-gray-700 rounded p-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <button type="submit" className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"><UserPlus className="mr-2" size={20} />Invitar Miembro</button>
        </form>
      )}
      <div className="space-y-2">
        {organization.members.map(member => (
          <MemberRow key={member.uid} member={member} members={organization.members} orgId={orgId} currentUserRole={currentUserRole} addNotification={addNotification} />
        ))}
      </div>

      {isOwner && (
        <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-red-500">Zona de Peligro</h3>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-sm bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 size={16} /> Eliminar Organización
          </button>
        </div>

      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><AlertCircle className="text-red-500" />Confirmar Eliminación</h2>
            <p className="text-gray-400">Para confirmar, escribe el nombre de la organización "<span className="font-bold text-white">{organization.name}</span>" a continuación.</p>
            <input 
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">Cancelar</button>
              <button 
                onClick={handleDeleteOrganization} 
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={confirmationText !== organization.name}
              >
                Eliminar para siempre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;