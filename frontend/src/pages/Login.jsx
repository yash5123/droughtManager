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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex flex-col items-center justify-center mb-8">
                <div className="p-3 bg-blue-50 rounded-xl mb-4">
                  <Droplet className="text-blue-600 w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                  AqvaSense
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  {isRegister ? 'Create an account to continue' : 'Sign in to your account'}
                </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {isRegister ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <span className="w-1/5 border-b border-slate-200 lg:w-1/4"></span>
              <span className="text-xs text-center text-slate-500 uppercase">Or continue with</span>
              <span className="w-1/5 border-b border-slate-200 lg:w-1/4"></span>
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
