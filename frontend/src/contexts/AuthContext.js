import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from '../utils/axios';

// Context oluştur
const AuthContext = createContext(null);

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider bileşeni
export const AuthProvider = ({ children }) => {
  // Token state - initialize with null, we'll load from localStorage in useEffect
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isInitialized, setIsInitialized] = useState(false);

  // Load token from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        if (storedToken && storedToken !== 'undefined' && storedUser && storedUser !== 'undefined') {
          const parsedUser = JSON.parse(storedUser);
          
          setToken(storedToken);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []); // Only run once on mount

  // Sync user data with server when authenticated
  useEffect(() => {
    const syncUserData = async () => {
      // Only sync if we have both token and isInitialized is true
      if (token && isInitialized === true && isAuthenticated === true) {
        try {
          const response = await axiosInstance.get('/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const updatedUser = {
            ...response.data,
            is_admin: response.data.is_admin || response.data.username === 'admin'
          };
          
          // Update localStorage and state with fresh data from server
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        } catch (error) {
          console.error('Error syncing user data:', error);
          // If sync fails, don't logout - keep the user logged in with cached data
        }
      }
    };

    if (isInitialized) {
      syncUserData();
    }
  }, [isInitialized, token]);

  const login = (newToken, userData) => {
    if (!newToken || newToken === 'undefined') {
      console.error('Invalid token provided to login');
      return;
    }

    try {
      // Prepare user data with admin flag
      const userWithAdminFlag = {
        ...userData,
        is_admin: userData.is_admin || userData.username === 'admin'
      };

      // Store in localStorage
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userWithAdminFlag));
      
      // Update state
      setToken(newToken);
      setUser(userWithAdminFlag);
      setIsAuthenticated(true);
      
    } catch (error) {
      console.error('Login storage error:', error);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    token,
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
