import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Zap, Shield, BarChart3, Globe } from 'lucide-react';
import { useEffect } from 'react';

import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';

function AnimatedStat({ value, label, suffix = '' }) {
  const v = useCountUp(value, 2000);
  return (
    <div>
      <p className="text-2xl font-bold font-mono text-[var(--color-cyan)]">{v}{suffix}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

export default function Login() {
  const { loginEmail, registerEmail, loginGoogle, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (user) { navigate('/'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await registerEmail(form.name, form.email, form.password);
        addToast('Account created', 'success');
      } else {
        await loginEmail(form.email, form.password);
        addToast('Signed in', 'success');
      }
      navigate('/');
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setSubmitting(false); }
  };

  const hasGoogleClientId = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <div className="flex min-h-[calc(100vh-120px)] -m-4 md:-m-6">
      {/* Left: Branded Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="w-8 h-8 text-[var(--color-cyan)]" />
            <span className="text-2xl font-bold text-display tracking-tight">AqvaSense</span>
          </div>
          <h2 className="text-3xl font-bold text-display leading-tight mb-3">
            Drought Intelligence<br />for <span style={{ color: 'var(--color-cyan)' }}>Decision Makers</span>
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-10 max-w-md">
            Real-time drought risk monitoring, groundwater analysis, and emergency tanker dispatch for 50+ drought-prone regions across India.
          </p>
          <div className="grid grid-cols-3 gap-6 mb-10">
            <AnimatedStat value={50} label="Villages Monitored" suffix="+" />
            <AnimatedStat value={8} label="States Covered" />
            <AnimatedStat value={16} label="Day Forecast" />
          </div>
          <div className="space-y-3">
            {[{ icon: Globe, text: 'All drought data is publicly accessible — no login needed' },
              { icon: BarChart3, text: 'Backend-validated risk scores — no client-side estimation' },
              { icon: Shield, text: 'Sign in is only required for tanker dispatch operations' }].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-[var(--color-cyan)] flex-shrink-0" />
                <span className="text-xs text-[var(--color-text-secondary)]">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, var(--color-cyan) 0%, transparent 70%)' }} />
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--color-bg-base)' }}>
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Zap className="w-6 h-6 text-[var(--color-cyan)]" />
            <span className="text-lg font-bold text-display">AqvaSense</span>
          </div>
          <h2 className="text-xl font-bold text-display mb-1">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-6">
            {mode === 'login' ? 'Sign in to access tanker dispatch operations' : 'Create an account to manage emergency resources'}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <InputField icon={User} type="text" placeholder="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required minLength={3} />
            )}
            <InputField icon={Mail} type="email" placeholder="Email Address" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} required />
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={8}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)] transition-colors"
                style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-cyan)', color: 'var(--color-bg-base)' }}>
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
              <button onClick={() => { /* Google OAuth handled in production */ }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-all hover:bg-[var(--color-bg-elevated)]"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
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
    </div>
  );
}

function InputField({ icon: Icon, type, placeholder, value, onChange, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} {...props}
        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm border outline-none focus:border-[var(--color-cyan)] transition-colors"
        style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
    </div>
  );
}
