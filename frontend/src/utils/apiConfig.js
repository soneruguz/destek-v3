// API bağlantı konfigürasyonları
// HTTPS kullanılmalı (Mixed Content hatası önlemek için)
const API_BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';

export default API_BASE_URL;