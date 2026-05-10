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
  success: 'var(--accent-green)',
  warning: 'var(--accent-amber)',
  error: 'var(--accent-red)',
  info: 'var(--accent-cyan)',
};

const BG_COLORS = {
  success: 'var(--risk-normal-tint)',
  warning: 'var(--risk-severe-tint)',
  error: 'var(--risk-extreme-tint)',
  info: 'var(--risk-moderate-tint)',
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
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {toasts.map(t => {
          const Icon = ICONS[t.type] || Info;
          const color = COLORS[t.type];
          const bg = BG_COLORS[t.type];
          return (
            <div
              key={t.id}
              className="glass-card"
              style={{
                background: `linear-gradient(${bg}, ${bg}), var(--glass-bg)`,
                backdropFilter: 'var(--glass-backdrop)',
                border: `1px solid ${color}30`,
                borderLeft: `4px solid ${color}`,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                minWidth: '300px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 15px ${color}15`,
                opacity: t.exiting ? 0 : 1,
                transform: t.exiting ? 'translateY(10px) scale(0.95)' : 'translateY(0) scale(1)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <Icon size={20} style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
              <p className="body-text" style={{ margin: 0, flex: 1, fontSize: '14px', color: 'var(--text-primary)' }}>{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
