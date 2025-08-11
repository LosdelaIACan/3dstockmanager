import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';

// --- Subcomponente para cada fila de miembro ---
const MemberRow = ({ member, members, orgId, currentUserRole, addNotification }) => {
  const isSelf = member.uid === auth.currentUser.uid;
  const isOwner = member.role === 'owner';

  // Función para cambiar el rol de un miembro
  const handleRoleChange = async (newRole) => {
    // Solo el 'owner' puede cambiar roles, y no puede cambiarse el suyo propio
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

  // Función para eliminar un miembro
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
          // --- MENÚ DESPLEGABLE PARA CAMBIAR ROLES ---
          <select
            value={member.role}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentUserRole !== 'owner'} // Solo el owner puede cambiar roles
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


// --- Componente principal de Gestión de Equipo ---
function TeamManagement({ user, organization, addNotification }) {
  const [inviteEmail, setInviteEmail] = useState('');

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

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

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
    </div>
  );
}

export default TeamManagement;
