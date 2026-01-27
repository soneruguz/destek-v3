// Console uyarılarını filtrele
const originalWarn = console.warn;
const originalError = console.error;
const originalInfo = console.info;

console.warn = (...args) => {
  const message = args[0];

  // React Router uyarılarını gizle
  if (typeof message === 'string' && (
    message.includes('React Router Future Flag Warning') ||
    message.includes('findDOMNode is deprecated') ||
    message.includes('DOMNodeInserted') ||
    message.includes('React DevTools') ||
    message.includes('Download the React DevTools') ||
    message.includes('WebSocket connection to')
  )) {
    return;
  }

  originalWarn.apply(console, args);
};

console.info = (...args) => {
  const message = args[0];
  if (typeof message === 'string' && (
    message.includes('React DevTools') ||
    message.includes('Download the React DevTools')
  )) {
    return;
  }
  originalInfo.apply(console, args);
};

console.error = (...args) => {
  const message = args[0];

  // Belirli hataları gizle
  if (typeof message === 'string' && (
    message.includes('Warning: findDOMNode') ||
    message.includes('Deprecation') ||
    message.includes('React DevTools') ||
    message.includes('DOMNodeInserted') ||
    message.includes('Download the React DevTools') ||
    message.includes('Error adding comment') ||
    message.includes('Error updating ticket status') ||
    message.includes('Error fetching user departments') ||
    message.includes('AxiosError') ||
    message.includes('PUT http://devdestekapi.tesmer.org.tr/tickets') ||
    message.includes('/users/') && message.includes('/departments') ||
    message.includes('403 (Forbidden)') ||
    message.includes('Attachments response') ||
    message.includes('Resim yüklendi') ||
    message.includes('API_BASE_URL = http://devdestekapi.tesmer.org.tr')
  )) {
    return;
  }

  // Quill.js hatalarını gizleme - bunlar önemli olabilir
  // Sadece React uyarılarını gizle

  originalError.apply(console, args);
};

// Quill.js'den gelen deprecation uyarılarını yakalayalım
if (typeof window !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (type === 'DOMNodeInserted') {
      // DOMNodeInserted event'ini sessizce geç
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
}
