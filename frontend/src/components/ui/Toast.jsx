import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: 'border-emerald-500 bg-emerald-500/10',
  warning: 'border-amber-500 bg-amber-500/10',
  error: 'border-red-500 bg-red-500/10',
  info: 'border-cyan-500 bg-cyan-500/10',
};

const ICON_COLORS = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
  info: 'text-cyan-400',
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div}>
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
             `}
             }
            >
              <Icon`} />
              <p>{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
               
                aria-label="Dismiss"
              >
                <X />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
