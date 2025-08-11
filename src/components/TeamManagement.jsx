// src/components/TeamManagement.jsx
// --- NUEVO COMPONENTE ---
// Este componente permite a los propietarios y administradores gestionar los miembros del equipo.

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // Asegúrate de que la ruta a tu config de firebase sea correcta

// Componente para un solo miembro, permite cambiar rol o eliminar
const MemberRow = ({ member, members, orgId, currentUserRole }) => {
  const [currentRole, setCurrentRole] = useState(member.role);
  const isSelf = member.uid === auth.currentUser.uid;

  const handleRoleChange = async (newRole) => {
    if (isSelf || currentUserRole !== 'owner') {
        console.log("No puedes cambiar tu propio rol o no tienes permisos.");
        return;
    }
    
    setCurrentRole(newRole);
    const updatedMembers = members.map(m => 
      m.uid === member.uid ? { ...m, role: newRole } : m
    );

    const orgRef = doc(db, 'organizations', orgId);
    await updateDoc(orgRef, { members: updatedMembers });
  };

  const handleRemoveMember = async () => {
    if (isSelf || currentUserRole !== 'owner') {
        console.log("No puedes eliminarte a ti mismo o no tienes permisos.");
        return;
    }
    const updatedMembers = members.filter(m => m.uid !== member.uid);
    const orgRef = doc(db, 'organizations', orgId);
    await updateDoc(orgRef, { members: updatedMembers });
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg mb-2">
      <p className="text-white">{member.email}</p>
      <div className="flex items-center gap-4">
        <select 
          value={currentRole} 
          onChange={(e) => handleRoleChange(e.target.value)}
          className="bg-gray-700 text-white rounded px-2 py-1"
          disabled={isSelf || currentUserRole !== 'owner'}
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button 
          onClick={handleRemoveMember}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded disabled:opacity-50"
          disabled={isSelf || currentUserRole !== 'owner'}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};


// Componente principal de gestión de equipo
const TeamManagement = ({ user }) => {
  const [organization, setOrganization] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('');

  // Encontrar la organización del usuario actual
  useEffect(() => {
    if (!user) return;
    
    // Asumimos que el orgId se obtiene de alguna manera al iniciar sesión.
    // Por simplicidad, aquí lo buscaremos, pero en una app real, esto debería ser más eficiente.
    const q = query(collection(db, "organizations"), where("members", "array-contains", {uid: user.uid, email: user.email, role: "owner"})); // Esto es un ejemplo, necesitarás una lógica más robusta para encontrar la org
    // La forma correcta es guardar el orgId en el custom token del usuario o en un documento de perfil.
    // Por ahora, vamos a simular que lo encontramos.
    
    // SIMULACIÓN: Suponemos que el orgId se pasa como prop o se obtiene de un contexto.
    // Para este ejemplo, necesitaremos un orgId de prueba.
    const hardcodedOrgId = "YOUR_ORGANIZATION_ID"; // REEMPLAZA ESTO CON UN ID REAL DE TU FIRESTORE
    setOrgId(hardcodedOrgId);

    if (!hardcodedOrgId) {
        setLoading(false);
        return;
    }

    const orgRef = doc(db, 'organizations', hardcodedOrgId);
    const unsubscribe = onSnapshot(orgRef, (docSnap) => {
      if (docSnap.exists()) {
        const orgData = docSnap.data();
        setOrganization(orgData);
        const member = orgData.members.find(m => m.uid === user.uid);
        setCurrentUserRole(member ? member.role : '');
      } else {
        console.log("No such organization!");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !organization || (currentUserRole !== 'owner' && currentUserRole !== 'admin')) {
        alert("Email inválido o no tienes permisos.");
        return;
    }

    const newMember = {
        // OJO: El UID no lo conocemos aún. El usuario invitado deberá completar su registro.
        // Esta es una implementación simplificada. Un sistema real usaría Cloud Functions
        // para enviar un email y crear un documento de "invitación" pendiente.
        uid: `pending_${inviteEmail}`, // UID temporal
        email: inviteEmail,
        role: inviteRole
    };

    const orgRef = doc(db, 'organizations', orgId);
    await updateDoc(orgRef, {
        members: [...organization.members, newMember]
    });

    setInviteEmail('');
  };
  
  if (loading) {
    return <div className="text-white">Cargando gestión de equipo...</div>;
  }

  if (!organization) {
    return <div className="text-white">No perteneces a ninguna organización.</div>;
  }
  
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Gestionar Equipo</h2>
      
      {canManage && (
        <form onSubmit={handleInvite} className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email del nuevo miembro"
            className="flex-grow bg-gray-800 rounded p-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select 
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="bg-gray-800 rounded p-2 border border-gray-700"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Invitar
          </button>
        </form>
      )}

      <div className="space-y-2">
        {organization.members.map(member => (
          <MemberRow 
            key={member.uid} 
            member={member}
            members={organization.members}
            orgId={orgId}
            currentUserRole={currentUserRole}
          />
        ))}
      </div>
    </div>
  );
};

export default TeamManagement;
