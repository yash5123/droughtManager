import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet } from 'lucide-react';
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
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginGoogle(credentialResponse.credential);
    } catch (err) {
      setError('Google Sign-In failed');
    }
  };

  return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-10 animate-slide-up relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

            <div className="flex flex-col items-center justify-center mb-10 relative z-10">
                <div className="p-4 bg-white/50 backdrop-blur-md rounded-2xl shadow-sm border border-white/60 mb-5 relative group">
                  <div className="absolute inset-0 bg-blue-400/20 rounded-2xl blur group-hover:bg-blue-400/30 transition-colors" />
                  <Droplet className="text-blue-600 w-10 h-10 relative drop-shadow-md" strokeWidth={2.5} />
                </div>
                <h1 className="text-3xl font-bold text-gradient tracking-tight">
                  AqvaSense
                </h1>
                <p className="text-slate-500 text-sm mt-2 font-medium">
                  {isRegister ? 'Create your premium account' : 'Welcome back, sign in to continue'}
                </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/50 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg mt-2"
              >
                {isRegister ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between relative z-10">
              <span className="w-1/4 border-b border-slate-200"></span>
              <span className="text-xs text-center text-slate-400 font-bold uppercase tracking-wider">Or continue with</span>
              <span className="w-1/4 border-b border-slate-200"></span>
            </div>

            <div className="mt-6 flex justify-center">
               <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Log in failed')}
                  useOneTap
               />
            </div>

            <p className="mt-8 text-center text-sm text-slate-600">
               {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
               <button
                 type="button"
                 onClick={() => setIsRegister(!isRegister)}
                 className="text-blue-600 font-semibold hover:underline"
               >
                 {isRegister ? 'Sign In' : 'Sign Up'}
               </button>
            </p>
        </div>
      </div>
  );
}
