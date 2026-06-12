import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (savedToken) {
        try {
          // Verify token and fetch fresh user details
          const res = await getCurrentUser();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          } else {
            // Token invalid
            handleLogout();
          }
        } catch (err) {
          console.error('Auth initialization error:', err);
          // If server is not reachable, fallback to cached user data to prevent locking out offline
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          } else {
            handleLogout();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const handleLogin = (tokenData, userData) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const updateUserInfo = (updatedUser) => {
    const fullUpdatedUser = { ...user, ...updatedUser };
    setUser(fullUpdatedUser);
    localStorage.setItem('user', JSON.stringify(fullUpdatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        logout: handleLogout,
        updateUser: updateUserInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
