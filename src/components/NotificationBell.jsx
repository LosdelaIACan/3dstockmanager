// src/components/NotificationBell.jsx

import { useState } from 'react';
import { Bell, Trash2, XCircle, CheckCircle } from 'lucide-react';

const NotificationBell = ({ notifications, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);

  const newNotificationsCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <Bell size={20} />
        {newNotificationsCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {newNotificationsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-80 bg-gray-700 rounded-xl shadow-lg border border-gray-600 z-50 p-4 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-600">
            <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
            {newNotificationsCount > 0 && (
              <button
                onClick={onClear}
                className="text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 text-sm"
              >
                <Trash2 size={16} />
                Limpiar
              </button>
            )}
          </div>
          {newNotificationsCount > 0 ? (
            <ul className="space-y-2">
              {notifications.map((notif) => (
                <li
                  key={notif.id} // 👈 Usamos el ID único de la notificación
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    notif.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'
                  }`}
                >
                  {notif.type === 'success' ? (
                    <CheckCircle size={20} className="flex-shrink-0" />
                  ) : (
                    <XCircle size={20} className="flex-shrink-0" />
                  )}
                  <span className="text-sm">{notif.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-400 text-sm">No hay notificaciones.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;