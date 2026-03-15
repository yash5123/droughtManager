import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, BarChart3, Map, ShieldCheck, Mail, Lock, User } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 font-inter flex flex-col lg:flex-row animate-in fade-in duration-700">
      {/* Left Side - Branding / Hero (Hidden on Mobile) */}
      <div className="hidden lg:flex w-[45%] bg-slate-900 relative overflow-hidden flex-col justify-between p-12 shadow-2xl z-10">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] -translate-x-1/3 translate-y-1/3" />
        
        {/* Optional abstract background pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        <div className="relative z-10 flex items-center gap-3 animate-slide-right delay-100">
           <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-lg shadow-blue-500/20 border border-white/10">
             <Droplet className="text-white w-6 h-6 fill-white/20" strokeWidth={2.5} />
           </div>
           <span className="text-2xl font-bold font-outfit text-white tracking-wide">AqvaSense</span>
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-10 animate-slide-up delay-300">
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6 font-outfit tracking-tight">
            Intelligent Data for <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Resilient Futures</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-10 font-light">
            Advanced analytics, real-time monitoring, and predictive modeling to safeguard water resources and mitigate drought impacts across Maharashtra.
          </p>
          
          <div className="space-y-5">
            <div className="flex items-center gap-4 text-slate-300 group">
               <div className="w-12 h-12 rounded-2xl bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-slate-700/50 group-hover:border-blue-500/50 transition-colors shadow-inner">
                  <BarChart3 size={20} className="text-blue-400"/>
               </div>
               <div>
                 <span className="font-semibold text-white block">Real-time Data Analytics</span>
                 <span className="text-sm text-slate-400">Monitor rainfall and groundwater trends</span>
               </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300 group">
               <div className="w-12 h-12 rounded-2xl bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-slate-700/50 group-hover:border-teal-500/50 transition-colors shadow-inner">
                 <Map size={20} className="text-teal-400"/>
               </div>
               <div>
                  <span className="font-semibold text-white block">Interactive Risk Mapping</span>
                  <span className="text-sm text-slate-400">Geospatial insights for village-level planning</span>
               </div>
            </div>
            <div className="flex items-center gap-4 text-slate-300 group">
               <div className="w-12 h-12 rounded-2xl bg-slate-800/80 backdrop-blur-sm flex items-center justify-center border border-slate-700/50 group-hover:border-emerald-500/50 transition-colors shadow-inner">
                 <ShieldCheck size={20} className="text-emerald-400"/>
               </div>
               <div>
                  <span className="font-semibold text-white block">AI-Powered Action Plans</span>
                  <span className="text-sm text-slate-400">Automated predictions and mitigation strategies</span>
               </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm animate-fade-in delay-700">
          &copy; {new Date().getFullYear()} Maharashtra Drought Management Authority
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        {/* Mobile ambient glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none lg:hidden" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none lg:hidden" />
        
        <div className="max-w-[420px] w-full relative z-10 animate-slide-up delay-200">
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
             <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/30">
               <Droplet className="text-white w-6 h-6 fill-white/20" strokeWidth={2.5} />
             </div>
             <span className="text-3xl font-bold font-outfit text-slate-800 tracking-tight">AqvaSense</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 font-outfit mb-3 tracking-tight">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isRegister ? 'Enter your details to register as an administrator.' : 'Please enter your credentials to access the dashboard.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-3 animate-shake">
              <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div className="space-y-2 group">
                <label className="text-sm font-semibold text-slate-700 block">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium hover:bg-slate-50"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-sm font-semibold text-slate-700 block">Email Address</label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium hover:bg-slate-50"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
              </div>
            </div>

            <div className="space-y-2 group">
              <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-slate-700 block">Password</label>
                 {!isRegister && (
                    <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">Forgot password?</a>
                 )}
              </div>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium hover:bg-slate-50"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98] mt-6 font-outfit text-lg"
            >
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-between">
            <span className="w-full border-b border-slate-200"></span>
            <span className="px-4 text-sm text-slate-400 font-medium bg-white">or</span>
            <span className="w-full border-b border-slate-200"></span>
          </div>

          <div className="mt-8 flex justify-center">
             <div className="w-full hover:scale-[1.02] transition-transform flex justify-center [&>div]:w-full [&_iframe]:w-full [&_iframe]:!max-w-none">
                 <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError('Google Sign-In failed')}
                    useOneTap
                    theme="outline"
                    shape="rectangular"
                    size="large"
                    text={isRegister ? "signup_with" : "signin_with"}
                    width="100%"
                 />
             </div>
          </div>

          <p className="mt-10 text-center text-slate-600 font-medium">
             {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
             <button
               type="button"
               onClick={() => {
                 setIsRegister(!isRegister);
                 setError('');
               }}
               className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors"
             >
               {isRegister ? 'Sign In' : 'Sign Up'}
             </button>
          </p>
        </div>
      </div>
    </div>
  );
}
