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
    <div>
      <div></div>
      <div>
        <p}>{v}{suffix}</p>
        <p>{label}</p>
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
    <div>
      {/* Background Matrix/Grid effect */}
      <div}></div>
      <div} />
      <div} />

      {/* Left: Branded Panel */}
      <div>
        
        <div>
          <Terminal /> Secure Command Link
        </div>

        <h2>
          Hydrological<br />Intelligence <span}>Nexus</span>
        </h2>
        
        <p>
          High-density drought telemetry, predictive risk modeling, and centralized logistics deployment for arid zones.
        </p>
        
        <div>
          <AnimatedStat value={50} label="Monitored Zones" suffix="+" />
          <AnimatedStat value={8} label="Regional Sectors" />
          <AnimatedStat value={16} label="Day Forecasts" />
        </div>
        
        <div>
          {[{ icon: Globe, text: 'PUBLIC TELEMETRY ACCESS OPEN — NO CREDENTIALS REQUIRED' },
            { icon: BarChart3, text: 'SERVER-SIDE ALGORITHMIC VALIDATION ACTIVE' },
            { icon: Shield, text: 'SECURE CLEARANCE REQUIRED FOR LOGISTICS DEPLOYMENT' }].map((item, i) => (
            <div key={i}>
              <div>
                <item.icon />
              </div>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Auth Form */}
      <div>
        <div>
          <div>
            <Terminal />
            <span>AqvaSense</span>
          </div>
          
          <div>
            <div></div>
            
            <h2>
              System Authorization
            </h2>
            <p>
              Authenticate via Google for dispatch access
            </p>



            {hasGoogleClientId ? (
              <GoogleLoginBtn />
            ) : (
              <div>
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
        <div}>
          <AlertTriangle /> {error}
        </div>
      )}
      <button onClick={() => googleLogin()}
       >
        <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        SSO: GOOGLE
      </button>
    </>
  );
}
