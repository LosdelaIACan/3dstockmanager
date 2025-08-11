import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

// Este componente ahora espera recibir el ID de la organización del usuario
function NotificationBell({ orgId }) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no tenemos un orgId (porque el usuario no pertenece a ninguna organización), no hacemos nada.
    if (!orgId) {
      setLoading(false);
      return;
    }

    // Creamos una consulta a Firestore para obtener las notificaciones de la organización actual,
    // ordenadas por fecha de creación descendente.
    const notificationsQuery = query(
      collection(db, "organizations", orgId, "notifications"),
      orderBy("createdAt", "desc")
    );

    // onSnapshot crea un listener en tiempo real. Cada vez que haya un cambio en las notificaciones,
    // este código se ejecutará automáticamente.
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifsData);
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar notificaciones: ", error);
      setLoading(false);
    });

    // Limpiamos el listener cuando el componente se desmonta para evitar fugas de memoria.
    return () => unsubscribe();
  }, [orgId]); // El efecto se vuelve a ejecutar si el orgId cambia.

  // Contamos solo las notificaciones que no han sido leídas.
  const unreadCount = notifications.filter(n => !n.read).length;

  // Función para marcar una notificación como leída
  const handleMarkAsRead = async (notificationId) => {
    if (!orgId || !notificationId) return;
    const notifRef = doc(db, "organizations", orgId, "notifications", notificationId);
    try {
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative text-gray-400 hover:text-white transition-colors">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 items-center justify-center text-xs font-bold">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-gray-800 border border-gray-700/50 rounded-lg shadow-2xl z-20">
          <div className="p-4 font-bold border-b border-gray-700/50">Notificaciones</div>
          <div className="py-1 max-h-96 overflow-y-auto">
            {loading && <div className="px-4 py-3 text-sm text-gray-400 text-center">Cargando...</div>}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">No hay notificaciones.</div>
            )}
            {!loading && notifications.map(notif => (
              <div key={notif.id} className={`px-4 py-3 text-sm flex items-start gap-3 ${!notif.read ? 'text-white' : 'text-gray-400'}`}>
                <div className="flex-shrink-0 mt-1">
                  <Bell size={16} className={!notif.read ? 'text-blue-400' : 'text-gray-500'} />
                </div>
                <div className="flex-grow">
                  <p>{notif.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.createdAt?.toDate()).toLocaleString()}
                  </p>
                </div>
                {!notif.read && (
                  <button onClick={() => handleMarkAsRead(notif.id)} title="Marcar como leído" className="text-gray-500 hover:text-green-400">
                    <CheckCircle size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
