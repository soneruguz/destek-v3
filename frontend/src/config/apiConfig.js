// API configuration for the application
// This file centralizes all API endpoint URLs to make it easier to manage

// Base API URL - relative kullan (Mixed Content hatası önlemek için)
// Uploads için: /uploads
// API endpoints için: /api
const API_URL = '/api';

// API routes - /api prefix'i ile
const API_ROUTES = {
  // Auth related endpoints
  LOGIN: `${API_URL}/auth/token`,
  REFRESH_TOKEN: `${API_URL}/auth/token/refresh`,

  // User related endpoints
  USERS: `${API_URL}/users`,
  USER: (id) => `${API_URL}/users/${id}`,
  USER_DEPARTMENTS: (id) => `${API_URL}/users/${id}/departments`,

  // Ticket related endpoints
  TICKETS: `${API_URL}/tickets`,
  TICKET: (id) => `${API_URL}/tickets/${id}`,
  TICKET_COMMENTS: (id) => `${API_URL}/tickets/${id}/comments`,

  // Department related endpoints
  DEPARTMENTS: `${API_URL}/departments`,
  DEPARTMENT: (id) => `${API_URL}/departments/${id}`,

  // Wiki related endpoints
  WIKIS: `${API_URL}/wikis`,
  WIKI: (id) => `${API_URL}/wikis/${id}`,

  // Notification related endpoints
  NOTIFICATIONS: `${API_URL}/notifications`,
  NOTIFICATION_SETTINGS: `${API_URL}/notifications/settings`,
  MARK_NOTIFICATION_READ: (id) => `${API_URL}/notifications/${id}/read`,

  // System settings
  CONFIG: `${API_URL}/config`,

  // Reports & Search
  REPORTS_STATS: `${API_URL}/reports/stats`,
  REPORTS_SEARCH: `${API_URL}/reports/search`,
  REPORTS_EXPORT: `${API_URL}/reports/export`,
  REPORTS_PERSONNEL: `${API_URL}/reports/personnel-stats`,
};

export { API_URL, API_ROUTES };