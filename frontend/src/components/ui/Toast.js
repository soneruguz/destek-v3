import React, { useEffect, useState } from 'react';

const icons = {
  success: <span className="w-5 h-5 text-success-500">✓</span>,
  error: <span className="w-5 h-5 text-danger-500">✗</span>,
  warning: <span className="w-5 h-5 text-warning-500">⚠</span>,
  info: <span className="w-5 h-5 text-primary-500">ℹ</span>
};

const bgColors = {
  success: 'bg-success-50',
  error: 'bg-danger-50',
  warning: 'bg-warning-50',
  info: 'bg-primary-50'
};

export const Toast = ({ message, type = 'info', onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Function to get the message text, handling both string and object messages
  const getMessageText = () => {
    if (typeof message === 'string') {
      return message;
    } else if (message && typeof message === 'object') {
      // If it's an object with a msg property (common in validation errors)
      if (message.msg) {
        return message.msg;
      }
      // If it has a message property (common in JS errors)
      if (message.message) {
        return message.message;
      }
      // As a fallback, try to convert the object to a string
      try {
        return JSON.stringify(message);
      } catch (e) {
        return 'An error occurred';
      }
    }
    return 'Unknown message';
  };

  return (
    <div 
      className={`transform transition-all duration-300 ease-in-out 
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full ${bgColors[type]} p-4 rounded-lg shadow-lg flex items-center`}
    >
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm text-gray-800">{getMessageText()}</p>
      </div>
      <div className="ml-4 flex-shrink-0 flex">
        <button
          onClick={handleClose}
          className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <span className="sr-only">Kapat</span>
          <span className="h-5 w-5">×</span>
        </button>
      </div>
    </div>
  );
};
