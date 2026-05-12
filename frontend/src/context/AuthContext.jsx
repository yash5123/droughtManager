import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

const USER_CACHE_KEY = 'aqvasense_user_cache';

// Retrieve cached user from localStorage (survives page reloads & server restarts)
function getCachedUser() {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch { return null; }
}

function setCachedUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch { /* localStorage unavailable */ }
}

export function AuthProvider({ children }) {
  // Initialize from cache so UI doesn't flash to logged-out during server cold starts
  const [user, setUser] = useState(getCachedUser);
  const [loading, setLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginReturnPath, setLoginReturnPath] = useState(null);
  const retryCount = useRef(0);

  // Sync user state to localStorage cache
  useEffect(() => {
    setCachedUser(user);
  }, [user]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        retryCount.current = 0;
      } catch (err) {
        const status = err.response?.status;

        if (status === 401 || status === 403) {
          // Server explicitly said "unauthorized" — user is truly logged out
          setUser(null);
        } else {
          // Network error, timeout, or 5xx — server is likely restarting (Render cold start)
          // Keep the cached user alive so the UI stays logged in
          console.warn('[Auth] Server unreachable during session check, keeping cached session.');

          // Retry up to 3 times with exponential backoff
          if (retryCount.current < 3) {
            retryCount.current += 1;
            const delay = Math.min(2000 * Math.pow(2, retryCount.current), 15000);
            setTimeout(fetchUser, delay);
            return; // Don't set loading to false yet while retrying
          }
          // After all retries failed, keep cached user (don't log out)
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // Only log out on EXPLICIT 401 from protected endpoints, not network failures
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error', err);
    }
    setUser(null);
  }, []);

  const registerEmail = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    setUser(res.data.user);
    return res.data;
  }, []);

  const loginEmail = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.data.user);
    return res.data;
  }, []);

  const loginGoogle = useCallback(async (access_token) => {
    const res = await api.post('/auth/google', { access_token });
    setUser(res.data.user);
    return res.data;
  }, []);

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
