import React from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, PlusCircle } from 'lucide-react';

const InvitationScreen = ({ user, invitation, onDecision, isUnassignedUser = false }) => {

  const handleAccept = async () => {
    const orgRef = doc(db, 'organizations', invitation.orgId);
    try {
      await updateDoc(orgRef, {
        members: arrayUnion({ uid: user.uid, email: user.email, role: 'viewer' }),
        memberUIDs: arrayUnion(user.uid),
        pendingInvites: arrayRemove(user.email)
      });
      onDecision();
    } catch (error) {
      console.error("Error al aceptar la invitación:", error);
    }
  };

  const handleDeclineAndCreate = async () => {
    if (isUnassignedUser) {
        onDecision();
        return;
    }
    const orgRef = doc(db, 'organizations', invitation.orgId);
    try {
      await updateDoc(orgRef, {
        pendingInvites: arrayRemove(user.email)
      });

      const newOrgRef = collection(db, 'organizations');
      await addDoc(newOrgRef, {
          ownerId: user.uid,
          name: `${user.email.split('@')[0]}'s Team`,
          members: [{ uid: user.uid, email: user.email, role: 'owner' }],
          memberUIDs: [user.uid],
          pendingInvites: [],
          createdAt: serverTimestamp()
      });
      onDecision();
    } catch (error) {
      console.error("Error al rechazar y crear organización:", error);
    }
  };

  if (isUnassignedUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-lg mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-white">¡Bienvenido!</h2>
          <p className="text-gray-400 mb-8">
            Parece que no tienes una organización asignada. Puedes crear una nueva o esperar una invitación.
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleDeclineAndCreate} 
              className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-lg"
            >
              <PlusCircle size={20} />
              Crear Mi Propia Organización
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full p-4 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all flex items-center justify-center gap-2"
            >
              <Users size={20} />
              Esperar una Invitación
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Código original para invitaciones
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-8 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-lg mx-auto">
        <h2 className="text-3xl font-bold mb-4 text-white">¡Has sido invitado!</h2>
        <p className="text-gray-400 mb-8">
          Has recibido una invitación para unirte a la organización <span className="font-bold text-white">"{invitation.orgName}"</span>.
        </p>
        <div className="space-y-4">
          <button 
            onClick={handleAccept} 
            className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Users size={20} />
            Aceptar y Unirme al Equipo
          </button>
          <button 
            onClick={handleDeclineAndCreate} 
            className="w-full p-4 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500 transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle size={20} />
            Rechazar y Crear mi Propia Organización
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationScreen;