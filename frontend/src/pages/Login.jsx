import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, Mail, Lock, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

export default function Login() {
  const { loginEmail, registerEmail, loginGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    try {
      if (isForgotPassword) {
        // Simulate password reset
        setSuccessMessage(`Password reset link sent to ${formData.email}`);
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccessMessage('');
          setFormData({ ...formData, password: '' });
        }, 3000);
        return;
      }

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

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setIsForgotPassword(false);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-900 font-inter flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-[440px] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        
        {/* Subtle top glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-500/15 rounded-full blur-[50px] pointer-events-none" />

        {/* Logo Area */}
        <div className="mb-8 flex flex-col items-center relative z-10">
           <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600/50 rounded-[20px] shadow-inner mb-6">
              <Droplet className="w-8 h-8 text-blue-400 fill-blue-500/20" strokeWidth={2} />
           </div>
           
           <h3 className="text-slate-300 font-medium tracking-widest text-[11px] uppercase mb-2">Welcome to</h3>
           <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">AqvaSense Control</h1>
           <p className="text-sm text-slate-300 text-center max-w-[280px]">
             {isForgotPassword 
                ? 'Enter your email to receive a password reset link.' 
                : isRegister 
                  ? 'Register your credentials to access the analytics grid.' 
                  : 'Authenticate to access the drought monitoring grid.'}
           </p>
        </div>

        <div className="w-full relative z-10">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl flex items-center gap-3 animate-shake">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] shrink-0" />
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && !isForgotPassword && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 pl-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-500 text-slate-100 text-sm"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 pl-1">Email Address</label>
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-500 text-slate-100 text-sm"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
              </div>
            </div>

            {!isForgotPassword && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center pl-1 pr-1">
                   <label className="text-xs font-medium text-slate-300">Password</label>
                   {!isRegister && (
                      <button 
                        type="button" 
                        onClick={(e) => {
                           e.preventDefault();
                           setIsForgotPassword(true);
                           setError('');
                           setSuccessMessage('');
                        }}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Forgot?
                      </button>
                   )}
                </div>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                      <Lock size={16} />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-500 text-slate-100 text-sm"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                </div>
              </div>
            )}

            {isForgotPassword ? (
               <div className="pt-2 flex flex-col gap-3">
                 <button
                   type="submit"
                   className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm flex justify-center items-center shadow-lg shadow-blue-500/20 mt-4"
                 >
                   Send Reset Link
                 </button>
                 <button
                   type="button"
                   onClick={() => setIsForgotPassword(false)}
                   className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-all active:scale-[0.98] text-sm flex justify-center items-center gap-2"
                 >
                   <ArrowLeft size={16} /> Back to Login
                 </button>
               </div>
            ) : (
               <button
                 type="submit"
                 className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl transition-all active:scale-[0.98] mt-6 text-sm flex justify-center items-center"
               >
                 {isRegister ? 'Register Account' : 'Authenticate'}
               </button>
            )}
          </form>

          {!isForgotPassword && (
            <>
              <div className="mt-8 mb-8 flex items-center justify-between opacity-60">
                <span className="w-full border-b border-slate-700"></span>
                <span className="px-4 text-[11px] font-medium tracking-widest text-slate-500 uppercase">Or</span>
                <span className="w-full border-b border-slate-700"></span>
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

              <p className="mt-8 text-center text-[13px] text-slate-400">
                 {isRegister ? 'Already have an account?' : "New to the system?"}{' '}
                 <button
                   type="button"
                   onClick={toggleMode}
                   className="text-slate-200 font-medium hover:text-white transition-colors underline decoration-slate-600 hover:decoration-slate-400 underline-offset-4"
                 >
                   {isRegister ? 'Sign In' : 'Register Now'}
                 </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
