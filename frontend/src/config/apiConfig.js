// API configuration for the application
// This file centralizes all API endpoint URLs to make it easier to manage

// Base API URL - HTTPS kullanılmalı (Mixed Content hatası önlemek için)
// Uploads için: https://destekapi.tesmer.org.tr/uploads
// API endpoints için: https://destekapi.tesmer.org.tr/api
const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://devdestekapi.tesmer.org.tr';

// API routes - /api prefix'i ile
const API_ROUTES = {
  // Auth related endpoints
  LOGIN: `${API_URL}/api/auth/token`,
  REFRESH_TOKEN: `${API_URL}/api/auth/token/refresh`,

  // User related endpoints
  USERS: `${API_URL}/api/users`,
  USER: (id) => `${API_URL}/api/users/${id}`,
  USER_DEPARTMENTS: (id) => `${API_URL}/api/users/${id}/departments`,

  // Ticket related endpoints
  TICKETS: `${API_URL}/api/tickets`,
  TICKET: (id) => `${API_URL}/api/tickets/${id}`,
  TICKET_COMMENTS: (id) => `${API_URL}/api/tickets/${id}/comments`,

  // Department related endpoints
  DEPARTMENTS: `${API_URL}/api/departments`,
  DEPARTMENT: (id) => `${API_URL}/api/departments/${id}`,

  // Wiki related endpoints
  WIKIS: `${API_URL}/api/wikis`,
  WIKI: (id) => `${API_URL}/api/wikis/${id}`,

  // Notification related endpoints
  NOTIFICATIONS: `${API_URL}/api/notifications`,
  NOTIFICATION_SETTINGS: `${API_URL}/api/notifications/settings`,
  MARK_NOTIFICATION_READ: (id) => `${API_URL}/api/notifications/${id}/read`,

  // System settings
  CONFIG: `${API_URL}/api/config`,

  // Reports & Search
  REPORTS_STATS: `${API_URL}/api/reports/stats`,
  REPORTS_SEARCH: `${API_URL}/api/reports/search`,
  REPORTS_EXPORT: `${API_URL}/api/reports/export`,
  REPORTS_PERSONNEL: `${API_URL}/api/reports/personnel-stats`,
};

export { API_URL, API_ROUTES };