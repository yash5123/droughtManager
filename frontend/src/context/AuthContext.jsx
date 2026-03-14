import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists in localStorage on mount
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const registerEmail = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    login(res.data.token, res.data.user);
    return res.data;
  };

  const loginEmail = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    login(res.data.token, res.data.user);
    return res.data;
  };

  const loginGoogle = async (idToken) => {
    const res = await api.post('/auth/google', { idToken });
    login(res.data.token, res.data.user);
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, registerEmail, loginEmail, loginGoogle, loading }}>
        {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
