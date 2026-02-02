// API bağlantı konfigürasyonları
// HTTPS kullanılmalı (Mixed Content hatası önlemek için)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://devdestekapi.tesmer.org.tr/api';

export default API_BASE_URL;