import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AuthContext from './AuthContext';
import authService from './authService';
import storage from '../utils/storage';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const savedToken = storage.getToken();
        const savedUser = storage.getUser();

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
          
          // Verify session validity via service
          const currentUser = await authService.getCurrentUser();
          if (isMounted) {
            if (currentUser) {
              setUser(currentUser);
            } else {
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('Error restoring auth session:', err);
        storage.clearSession();
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Perform user login
   */
  const login = useCallback(async ({ email, password, rememberMe }) => {
    try {
      const response = await authService.login({ email, password, rememberMe });
      setUser(response.user);
      setToken(response.token);
      return response;
    } catch (err) {
      throw err;
    }
  }, []);

  /**
   * Perform user logout
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  }, []);

  /**
   * Check if current user has a specific role or any role in a list
   */
  const hasRole = useCallback((requiredRole) => {
    if (!user || !user.role) return false;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    return user.role === requiredRole;
  }, [user]);

  /**
   * Check if current user has a specific permission
   */
  const hasPermission = useCallback((requiredPermission) => {
    if (!user || !user.permissions) return false;
    if (user.permissions.includes('*')) return true;

    if (Array.isArray(requiredPermission)) {
      return requiredPermission.every((perm) => user.permissions.includes(perm));
    }
    return user.permissions.includes(requiredPermission);
  }, [user]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    logout,
    hasRole,
    hasPermission
  }), [user, token, loading, login, logout, hasRole, hasPermission]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
