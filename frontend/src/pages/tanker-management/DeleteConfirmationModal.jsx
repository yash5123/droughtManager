import { AlertTriangle, Zap } from 'lucide-react';

export default function DeleteConfirmationModal({
  deleteId,
  setDeleteId,
  confirmDelete,
  theme
}) {
  if (!deleteId) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(16px)' }}>
      {/* Scanning Line Effect */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: 0.05 }}>
        <div style={{ width: '100%', height: '1px', background: 'var(--accent-red)', position: 'absolute', top: '0', left: 0, animation: 'scan 4s linear infinite' }} />
      </div>
      
      <div className="glass-card" style={{ width: '480px', padding: '40px', border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow-elevated)', textAlign: 'center', position: 'relative', background: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertTriangle size={32} color="var(--accent-red)" />
        </div>
        
        <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.5px' }}>Terminate Mission?</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '40px', lineHeight: '1.6' }}>
          This protocol will permanently <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>scrub</span> mission telemetry and deployment records. This action cannot be reversed.
        </p>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => setDeleteId(null)} className="glass-btn" style={{ flex: 1, height: '54px', fontWeight: 700, color: 'var(--text-primary)', border: '1px solid var(--divider)' }}>ABORT</button>
          <button 
            onClick={confirmDelete} 
            className="primary-btn" 
            style={{ 
              flex: 1.5, 
              height: '54px', 
              fontWeight: 900, 
              background: 'var(--accent-red)', 
              color: '#fff',
              boxShadow: '0 15px 30px -10px rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <Zap size={18} />
            CONFIRM PURGE
          </button>
        </div>
      </div>
    </div>
  );
}
