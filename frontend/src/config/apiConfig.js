// API configuration for the application
// This file centralizes all API endpoint URLs to make it easier to manage

// Base API URL - boş bırak, axios baseURL zaten /api
// Uploads için: /uploads
// API endpoints için: /api (axios baseURL'de tanımlı)
const API_URL = '';

// API routes - axios baseURL '/api/' olduğu için prefix yok ve başında / yok
const API_ROUTES = {
  // Auth related endpoints
  LOGIN: `auth/token/`,
  REFRESH_TOKEN: `auth/token/refresh/`,

  // User related endpoints
  USERS: `users/`,
  USER: (id) => `users/${id}/`,
  USER_DEPARTMENTS: (id) => `users/${id}/departments/`,

  // Ticket related endpoints
  TICKETS: `tickets/`,
  TICKET: (id) => `tickets/${id}/`,
  TICKET_COMMENTS: (id) => `tickets/${id}/comments/`,

  // Department related endpoints
  DEPARTMENTS: `departments/`,
  DEPARTMENT: (id) => `departments/${id}/`,

  // Wiki related endpoints
  WIKIS: `wikis/`,
  WIKI: (id) => `wikis/${id}/`,

  // Notification related endpoints
  NOTIFICATIONS: `notifications/`,
  NOTIFICATION_SETTINGS: `notifications/settings/`,
  MARK_NOTIFICATION_READ: (id) => `notifications/${id}/read/`,

  // System settings
  CONFIG: `config/`,

  // Reports & Search
  REPORTS_STATS: `reports/stats/`,
  REPORTS_SEARCH: `reports/search/`,
  REPORTS_EXPORT: `reports/export/`,
  REPORTS_PERSONNEL: `reports/personnel-stats/`,
};

export { API_URL, API_ROUTES };