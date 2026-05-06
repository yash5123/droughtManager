import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReturnPath, setLoginReturnPath] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setTimeout(() => setUser(JSON.parse(storedUser)), 0);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const persistLogin = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const registerEmail = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    persistLogin(res.data.token, res.data.user);
    return res.data;
  }, [persistLogin]);

  const loginEmail = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    persistLogin(res.data.token, res.data.user);
    return res.data;
  }, [persistLogin]);

  const loginGoogle = useCallback(async (access_token) => {
    const res = await api.post('/auth/google', { access_token });
    persistLogin(res.data.token, res.data.user);
    return res.data;
  }, [persistLogin]);

  const openLoginModal = useCallback((returnPath = null) => {
    setLoginReturnPath(returnPath);
    setLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    setLoginReturnPath(null);
  }, []);

  const value = {
    user,
    loading,
    logout,
    registerEmail,
    loginEmail,
    loginGoogle,
    loginModalOpen,
    loginReturnPath,
    openLoginModal,
    closeLoginModal,
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
