import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, BarChart3, Globe, Terminal, AlertTriangle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useCountUp } from '../hooks/useCountUp.js';

function AnimatedStat({ value, label, suffix = '' }) {
  const v = useCountUp(value, 2000);
  return (
    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <p style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-blue)', textShadow: 'var(--accent-blue-glow)' }}>{v}{suffix}</p>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) { navigate('/'); return null; }

  const hasGoogleClientId = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--app-bg)' }}>
      {/* Background Matrix/Grid effect */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(var(--accent-blue) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      
      {/* Left: Branded Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px', position: 'relative', zIndex: 1 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '40px' }}>
          <Terminal size={16} style={{ color: 'var(--accent-cyan)' }} /> Secure Command Link
        </div>

        <h2 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: '0 0 24px 0' }}>
          Hydrological<br />Intelligence <span style={{ color: 'var(--accent-blue)' }}>Nexus</span>
        </h2>
        
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '500px', lineHeight: 1.6, margin: '0 0 48px 0' }}>
          High-density drought telemetry, predictive risk modeling, and centralized logistics deployment for arid zones.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', maxWidth: '600px', marginBottom: '48px' }}>
          <AnimatedStat value={50} label="Monitored Zones" suffix="+" />
          <AnimatedStat value={8} label="Regional Sectors" />
          <AnimatedStat value={16} label="Day Forecasts" />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
          {[{ icon: Globe, text: 'PUBLIC TELEMETRY ACCESS OPEN - NO CREDENTIALS REQUIRED', color: 'var(--accent-green)' },
            { icon: BarChart3, text: 'SERVER-SIDE ALGORITHMIC VALIDATION ACTIVE', color: 'var(--accent-cyan)' },
            { icon: Shield, text: 'SECURE CLEARANCE REQUIRED FOR LOGISTICS DEPLOYMENT', color: 'var(--accent-amber)' }].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: `3px solid ${item.color}` }}>
              <item.icon size={18} style={{ color: item.color }} />
              <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Auth Form */}
      <div style={{ width: '450px', background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', justifyContent: 'center' }}>
            <Terminal size={32} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>AqvaSense</span>
          </div>
          
          <div className="glass-card" style={{ padding: '32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent-blue), transparent)' }}></div>
            
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center', marginBottom: '8px' }}>
              System Authorization
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
              Authenticate via Google for dispatch access
            </p>

            {hasGoogleClientId ? (
              <GoogleLoginBtn />
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--accent-amber)', background: 'var(--risk-severe-tint)', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                EXTERNAL AUTH NOT CONFIGURED
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleLoginBtn() {
  const { loginGoogle } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        await loginGoogle(tokenResponse.access_token);
        addToast('Access Granted', 'success');
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.error || 'Google sign-in failed');
      }
    },
    onError: () => setError('Google sign-in was cancelled'),
  });

  return (
    <>
      {error && (
        <div style={{ padding: '12px', background: 'var(--risk-extreme-tint)', borderLeft: '3px solid var(--accent-red)', color: 'var(--text-primary)', fontSize: '13px', marginBottom: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} style={{ color: 'var(--accent-red)' }} /> {error}
        </div>
      )}
      <button className="primary-btn" onClick={() => googleLogin()} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
        <svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
        SSO: GOOGLE
      </button>
    </>
  );
}
