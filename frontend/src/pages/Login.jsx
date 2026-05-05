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
    <div className="relative group">
      <div className="absolute -inset-2 bg-[var(--color-primary)] opacity-0 group-hover:opacity-10 blur transition-opacity rounded-lg"></div>
      <div className="relative z-10">
        <p className="text-3xl font-bold font-mono text-[var(--color-primary)] mb-1" style={{ textShadow: '0 0 10px rgba(6,182,212,0.5)' }}>{v}{suffix}</p>
        <p className="text-[10px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-widest">{label}</p>
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
    <div className="flex min-h-[calc(100vh-120px)] -m-4 md:-m-6 bg-[#030712] relative overflow-hidden">
      {/* Background Matrix/Grid effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--color-outline-variant) 1px, transparent 1px), linear-gradient(90deg, var(--color-outline-variant) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full opacity-[0.03] pointer-events-none blur-[100px]" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.02] pointer-events-none blur-[80px]" style={{ background: 'radial-gradient(circle, var(--color-tertiary) 0%, transparent 70%)' }} />

      {/* Left: Branded Panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-center px-20 relative z-10 border-r border-[var(--color-outline-variant)] bg-black/40 backdrop-blur-sm">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-widest mb-8 w-max">
          <Terminal className="w-3.5 h-3.5" /> Secure Command Link
        </div>

        <h2 className="text-4xl lg:text-5xl font-bold text-display leading-[1.1] mb-6 text-[var(--color-on-surface)]">
          Hydrological<br />Intelligence <span className="text-[var(--color-primary)]" style={{ textShadow: '0 0 20px rgba(6,182,212,0.4)' }}>Nexus</span>
        </h2>
        
        <p className="text-sm text-[var(--color-on-surface-variant)] mb-12 max-w-md leading-relaxed">
          High-density drought telemetry, predictive risk modeling, and centralized logistics deployment for arid zones.
        </p>
        
        <div className="grid grid-cols-3 gap-8 mb-12">
          <AnimatedStat value={50} label="Monitored Zones" suffix="+" />
          <AnimatedStat value={8} label="Regional Sectors" />
          <AnimatedStat value={16} label="Day Forecasts" />
        </div>
        
        <div className="space-y-4">
          {[{ icon: Globe, text: 'PUBLIC TELEMETRY ACCESS OPEN — NO CREDENTIALS REQUIRED' },
            { icon: BarChart3, text: 'SERVER-SIDE ALGORITHMIC VALIDATION ACTIVE' },
            { icon: Shield, text: 'SECURE CLEARANCE REQUIRED FOR LOGISTICS DEPLOYMENT' }].map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] flex items-center justify-center flex-shrink-0">
                <item.icon className="w-4 h-4 text-[var(--color-secondary)]" />
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--color-on-surface-variant)] tracking-widest">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Terminal className="w-8 h-8 text-[var(--color-primary)]" />
            <span className="text-2xl font-bold text-display tracking-wider">AqvaSense</span>
          </div>
          
          <div className="card p-8 border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/80 backdrop-blur-md relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary)]"></div>
            
            <h2 className="text-xl font-bold text-display mb-2 text-[var(--color-on-surface)] uppercase tracking-wider">
              System Authorization
            </h2>
            <p className="text-[10px] font-mono text-[var(--color-on-surface-variant)] uppercase tracking-widest mb-8">
              Authenticate via Google for dispatch access
            </p>



            {hasGoogleClientId ? (
              <GoogleLoginBtn />
            ) : (
              <div className="text-xs font-mono text-[var(--color-on-surface-variant)] text-center py-4 uppercase tracking-widest">
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
        <div className="mb-6 px-4 py-3 rounded text-[11px] font-mono uppercase tracking-wider flex items-center gap-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      <button onClick={() => googleLogin()}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded text-[11px] font-bold uppercase tracking-widest border transition-all hover:bg-[var(--color-surface-container-high)] border-[var(--color-outline-variant)] text-[var(--color-on-surface)]">
        <svg className="w-4 h-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        SSO: GOOGLE
      </button>
    </>
  );
}
