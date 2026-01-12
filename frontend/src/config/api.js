// API URL - container'da backend service, production'da sunucu IP'si
// Docker: http://backend:8000
// Production: http://192.168.0.75:8001 veya REACT_APP_API_URL env variable'ı set et
const getApiUrl = () => {
  // Environment variable önceliği
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Docker container'da frontend çalışıyorsa, backend service'e git
  if (window.location.hostname === '0.0.0.0' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Dev mode - localhost
    return 'http://localhost:8001';
  }
  
  // Production - aynı host'ta farklı port
  return `http://${window.location.hostname}:8001`;
};

export const API_BASE_URL = getApiUrl();
export const API_ENDPOINTS = {
  auth: {
    token: '/auth/token',
    me: '/auth/me'
  },
  users: '/users',
  departments: '/departments',
  tickets: '/tickets',
  dashboard: '/dashboard',
  settings: '/settings'
};
