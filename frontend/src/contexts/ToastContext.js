import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Toast } from '../components/ui/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    // Use counter + timestamp for truly unique IDs
    const id = `${Date.now()}-${++counterRef.current}`;
    
    // Handle different message types here before passing to Toast component
    // This provides an extra layer of protection beyond the Toast component's own handling
    let processedMessage = message;
    
    // If it's a validation error object with loc, msg, type structure
    if (message && typeof message === 'object' && message.msg && message.loc) {
      processedMessage = message.msg;
    }
    
    setToasts(prev => [...prev, { id, message: processedMessage, type }]);
    
    // 5 saniye sonra toast'ı kaldır
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast 
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
