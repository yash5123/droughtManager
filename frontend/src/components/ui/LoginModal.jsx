import React, { useEffect, useRef, useState } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';
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
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', padding: '20px',
        animation: 'fadeIn 0.3s ease-out'
      }}
      onClick={(e) => e.target === overlayRef.current && closeLoginModal()}
    >
      <div 
        style={{ 
          width: '100%', maxWidth: '420px', padding: '40px', position: 'relative', 
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          background: 'var(--bg-gradient)',
          overflow: 'hidden',
          animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Animated Background Blobs */}
        <div style={{ position: 'absolute', top: '-50px', left: '-50px', width: '200px', height: '200px', background: 'var(--accent-blue)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.25, zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-50px', right: '-50px', width: '200px', height: '200px', background: 'var(--accent-cyan)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.15, zIndex: 0, pointerEvents: 'none' }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button 
            onClick={closeLoginModal} 
            style={{ position: 'absolute', top: '-10px', right: '-10px', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} 
            aria-label="Close"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <X size={16} />
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(6,182,212,0.15) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 8px 32px rgba(59,130,246,0.2)' }}>
              <Lock size={28} style={{ color: 'var(--accent-cyan)', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.5))' }} />
            </div>
            <div>
              <h2 className="title" style={{ fontSize: '24px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>AqvaSense Gateway</h2>
              <p className="body-text" style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '14px' }}>
                Sign in to access secured emergency tanker dispatch and sensitive telemetry operations.
              </p>
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: 'var(--risk-extreme-tint)', borderLeft: '3px solid var(--accent-red)', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '24px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} style={{ color: 'var(--accent-red)' }} />
              {error}
            </div>
          )}

          {hasGoogleClientId ? (
            <GoogleLoginBtn loginGoogle={loginGoogle} onSuccess={() => { addToast('Signed in securely', 'success'); closeLoginModal(); }} onError={setError} />
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--accent-amber)', background: 'var(--risk-severe-tint)', borderRadius: '12px', fontSize: '13px', border: '1px solid rgba(245,158,11,0.2)' }}>
              Google Sign-In is not configured.
            </div>
          )}
          
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              By signing in, you agree to the <a href="#" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Terms of Service</a> & <a href="#" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>Privacy Policy</a>.
            </p>
          </div>
        </div>
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
    <button 
      onClick={() => googleLogin()} 
      style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '15px', fontWeight: 600, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }} 
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
    >
      <div style={{ background: '#fff', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      </div>
      Continue with Google
    </button>
  );
}
