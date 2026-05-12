import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  withCredentials: true,
});

// Remove manual token injection since we use httpOnly cookies
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't fire for /auth/me — AuthContext handles that with retry logic
      const url = error.config?.url || '';
      if (!url.includes('/auth/me')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
