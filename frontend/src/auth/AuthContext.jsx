import { createContext } from 'react';

/**
 * AuthContext definition
 * Shared context for providing authentication state & helper methods throughout LandOS.
 */
export const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  hasRole: () => false,
  hasPermission: () => false
});

export default AuthContext;
