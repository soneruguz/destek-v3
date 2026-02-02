import axios from 'axios';

// Backend ayrı domain'de (destekapi.tesmer.org.tr)
// Zorla current origin + /api/ kullan (Mixed Content önleme)
const API_BASE_URL = `${window.location.origin}/api/`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,  // 30s - dosya yüklemesi için yeterli
  headers: {
    'Content-Type': 'application/json',
  },
  // Relative path'lerin baseURL sonuna doğru eklenmesi için
  withCredentials: true
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't force Content-Type - let each request set its own
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only logout on 401 if we're trying to access protected routes
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't logout if we're already on login page or during login attempt
      if (currentPath !== '/auth/login' && !currentPath.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
