import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from './Toast.jsx';

const hasGoogleClientId = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function LoginModal() {
  const { loginModalOpen, closeLoginModal, loginEmail, registerEmail, loginGoogle } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const overlayRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (loginModalOpen) {
      setError('');
      setForm({ name: '', email: '', password: '' });
      setMode('login');
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [loginModalOpen]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') closeLoginModal(); };
    if (loginModalOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [loginModalOpen, closeLoginModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await registerEmail(form.name, form.email, form.password);
        addToast('Account created successfully', 'success');
      } else {
        await loginEmail(form.email, form.password);
        addToast('Signed in successfully', 'success');
      }
      closeLoginModal();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loginModalOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9998] flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(6, 10, 19, 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === overlayRef.current && closeLoginModal()}
    >
      <div className="card w-full max-w-md mx-4 p-8 animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-display">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button onClick={closeLoginModal} className="p-1 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] mb-5">
          All drought data is publicly accessible. Sign in is only required for emergency tanker dispatch operations.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input ref={firstInputRef} type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required minLength={3}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none transition-colors focus:border-[var(--color-cyan)]"
                style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input ref={mode === 'login' ? firstInputRef : null} type="email" placeholder="Email Address" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} required
              className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none transition-colors focus:border-[var(--color-cyan)]"
              style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm border outline-none transition-colors focus:border-[var(--color-cyan)]"
              style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg-base)' }}
          >
            {submitting ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {hasGoogleClientId && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <span className="text-xs text-[var(--color-text-muted)]">or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
            </div>
            <GoogleLoginBtn loginGoogle={loginGoogle} onSuccess={() => { addToast('Signed in with Google', 'success'); closeLoginModal(); }} onError={setError} />
          </>
        )}

        <p className="mt-5 text-center text-xs text-[var(--color-text-muted)]">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-[var(--color-cyan)] hover:underline font-medium">
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

/** Only mounts when hasGoogleClientId is true, so GoogleOAuthProvider context exists */
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
    <button onClick={() => googleLogin()}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 hover:bg-[var(--color-bg-elevated)]"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
      <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Continue with Google
    </button>
  );
}
