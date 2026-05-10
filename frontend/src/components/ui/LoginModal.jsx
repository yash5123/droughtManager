import React, { useEffect, useRef, useState } from 'react';
import { X, Lock } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

const hasGoogleClientId = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, loginGoogle } = useAuth();
  const { addToast } = useToast();
  const [error, setError] = useState('');
  const overlayRef = useRef(null);

  useEffect(() => {
    if (loginModalOpen) {
      setTimeout(() => setError(''), 0);
    }
  }, [loginModalOpen]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeLoginModal(); };
    if (loginModalOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [loginModalOpen, closeLoginModal]);

  if (!loginModalOpen) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '20px'
      }}
      onClick={(e) => e.target === overlayRef.current && closeLoginModal()}
    >
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative', borderTop: '3px solid var(--accent-blue)' }}>
        <button onClick={closeLoginModal} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} aria-label="Close">
          <X size={20} />
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Lock size={24} style={{ color: 'var(--accent-blue)', filter: 'drop-shadow(var(--accent-blue-glow))' }} />
          <h2 className="title" style={{ fontSize: '20px' }}>Authentication Required</h2>
        </div>

        <p className="body-text" style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>
          All drought telemetry is publicly accessible. Sign in is only required for secured emergency tanker dispatch operations.
        </p>

        {error && (
          <div style={{ padding: '12px', background: 'var(--risk-extreme-tint)', borderLeft: '3px solid var(--accent-red)', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '24px', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {hasGoogleClientId ? (
          <GoogleLoginBtn loginGoogle={loginGoogle} onSuccess={() => { addToast('Signed in with Google', 'success'); closeLoginModal(); }} onError={setError} />
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--accent-amber)', background: 'var(--risk-severe-tint)', borderRadius: '8px', fontSize: '13px' }}>
            Google Sign-In is not configured in this environment.
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleLoginBtn({ loginGoogle, onSuccess, onError }) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await loginGoogle(tokenResponse.access_token);
        onSuccess();
      } catch (err) {
        onError(err.response?.data?.error || 'Google sign-in failed');
      }
    },
    onError: () => onError('Google sign-in was cancelled'),
  });

  return (
    <button onClick={() => googleLogin()} className="glass-btn" style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
      <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Continue with Google
    </button>
  );
}
