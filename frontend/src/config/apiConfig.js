// API configuration for the application
// This file centralizes all API endpoint URLs to make it easier to manage

// Base API URL - Uses window.location.origin to automatically handle HTTP/HTTPS
// In production, nginx acts as reverse proxy: https://destek.tesmer.org.tr/api -> http://backend:8000
const API_URL = process.env.REACT_APP_API_URL || 
  (typeof window !== 'undefined' 
    ? `${window.location.origin}/api` 
    : 'http://localhost:8001/api');

// API routes
const API_ROUTES = {
  // Auth related endpoints
  LOGIN: `${API_URL}/token`,
  REFRESH_TOKEN: `${API_URL}/token/refresh`,
  
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
};

export { API_URL, API_ROUTES };