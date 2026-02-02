// API URL - Production'da backend ayrı domain'de (destekapi.tesmer.org.tr)
// HTTPS kullanılmalı (Mixed Content hatası önlemek için)
// window.location.origin kullanarak her zaman doğru protokol
export const API_BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';
export const API_ENDPOINTS = {
  auth: {
    token: '/auth/token/',
    me: '/auth/me/'
  },
  users: '/users/',
  departments: '/departments/',
  tickets: '/tickets/',
  dashboard: '/dashboard/',
  settings: '/settings/'
};
