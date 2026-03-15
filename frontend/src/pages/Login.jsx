import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Mail, Lock, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const { loginEmail, registerEmail, loginGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await registerEmail(formData.name, formData.email, formData.password);
      } else {
        await loginEmail(formData.email, formData.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginGoogle(credentialResponse.credential);
    } catch (err) {
      setError('Google Sign-In failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-inter flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-[440px] bg-[#111111] border border-white/5 rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none" />

        {/* Logo Area */}
        <div className="mb-8 flex flex-col items-center relative z-10">
           <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-[20px] shadow-inner mb-6">
              <Droplet className="w-8 h-8 text-blue-500 fill-blue-500/20" strokeWidth={2} />
           </div>
           
           <h3 className="text-[#a1a1aa] font-medium tracking-widest text-[11px] uppercase mb-2">Welcome to</h3>
           <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">AqvaSense Control</h1>
           <p className="text-sm text-[#71717a] text-center max-w-[280px]">
             {isRegister ? 'Register your credentials to access the analytics grid.' : 'Authenticate to access the drought monitoring grid.'}
           </p>
        </div>

        <div className="w-full relative z-10">
          {error && (
            <div className="mb-6 p-4 bg-red-950/30 border border-red-900/50 text-red-400 text-sm rounded-xl flex items-center gap-3 animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#a1a1aa] pl-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-blue-500 transition-colors">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-[#52525b] text-white text-sm"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#a1a1aa] pl-1">Email Address</label>
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-blue-500 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-[#52525b] text-white text-sm"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center pl-1 pr-1">
                 <label className="text-xs font-medium text-[#a1a1aa]">Password</label>
                 {!isRegister && (
                    <a href="#" className="text-xs font-medium text-[#71717a] hover:text-white transition-colors">Forgot?</a>
                 )}
              </div>
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#52525b] group-focus-within:text-blue-500 transition-colors">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/5 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-[#52525b] text-white text-sm"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#fafafa] hover:bg-white text-black font-semibold py-3 rounded-xl transition-all active:scale-[0.98] mt-6 text-sm flex justify-center items-center"
            >
              {isRegister ? 'Register Account' : 'Authenticate'}
            </button>
          </form>

          <div className="mt-8 mb-8 flex items-center justify-between opacity-50">
            <span className="w-full border-b border-white/10"></span>
            <span className="px-4 text-[11px] font-medium tracking-widest text-[#a1a1aa] uppercase">Or</span>
            <span className="w-full border-b border-white/10"></span>
          </div>

          <div className="flex justify-center w-full [&>div]:w-full [&_iframe]:w-full [&_iframe]:!max-w-none">
             <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In failed')}
                useOneTap
                theme="filled_black"
                shape="rectangular"
                size="large"
                text={isRegister ? "signup_with" : "signin_with"}
             />
          </div>

          <p className="mt-8 text-center text-[13px] text-[#71717a]">
             {isRegister ? 'Already have an account?' : "New to the system?"}{' '}
             <button
               type="button"
               onClick={() => {
                 setIsRegister(!isRegister);
                 setError('');
               }}
               className="text-[#e4e4e7] font-medium hover:text-white transition-colors underline decoration-white/30 underline-offset-2"
             >
               {isRegister ? 'Sign In' : 'Register Now'}
             </button>
          </p>
        </div>
      </div>
    </div>
  );
}
