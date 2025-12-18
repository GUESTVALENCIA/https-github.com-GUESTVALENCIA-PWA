import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  return (
    <div className={`fixed top-4 right-4 z-[100] ${bgColors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in-down max-w-sm`}>
      <p className="font-medium text-sm">{message}</p>
      <button onClick={onClose} className="text-white/70 hover:text-white">
        ✕
      </button>
    </div>
  );
};

export default Notification;