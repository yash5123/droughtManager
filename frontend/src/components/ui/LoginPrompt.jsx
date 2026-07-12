
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPrompt({ message = 'Sign in to dispatch emergency resources' }) {
  const { openLoginModal } = useAuth();

  return (
    <button
      onClick={() => openLoginModal()}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        width: '100%', padding: '10px 16px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--text-tertiary)',
        color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      <Lock size={16} />
      {message}
    </button>
  );
}
