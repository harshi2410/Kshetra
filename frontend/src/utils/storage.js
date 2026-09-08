/**
 * Utility functions to manage authentication state in browser storage.
 * Handles token, user object, and rememberMe preferences seamlessly.
 */

const TOKEN_KEY = 'landos_auth_token';
const USER_KEY = 'landos_auth_user';
const REMEMBER_KEY = 'landos_auth_remember';

export const storage = {
  /**
   * Save session state (token, user, rememberMe)
   */
  setSession: (token, user, rememberMe = true) => {
    try {
      // Clear previous storage locations first to avoid stale sync issues
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);

      localStorage.setItem(REMEMBER_KEY, rememberMe ? 'true' : 'false');
      const targetStorage = rememberMe ? localStorage : sessionStorage;

      if (token) {
        targetStorage.setItem(TOKEN_KEY, token);
      }
      if (user) {
        targetStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    } catch (err) {
      console.error('Failed to save auth session to storage:', err);
    }
  },

  /**
   * Retrieve saved JWT token
   */
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    } catch (err) {
      console.error('Failed to read token from storage:', err);
      return null;
    }
  },

  /**
   * Retrieve saved user object
   */
  getUser: () => {
    try {
      const rawUser = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (err) {
      console.error('Failed to parse user from storage:', err);
      return null;
    }
  },

  /**
   * Check if rememberMe is enabled
   */
  getRememberMe: () => {
    try {
      return localStorage.getItem(REMEMBER_KEY) === 'true';
    } catch (err) {
      return false;
    }
  },

  /**
   * Clear all auth tokens and user data
   */
  clearSession: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(REMEMBER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (err) {
      console.error('Failed to clear auth session:', err);
    }
  }
};

export default storage;
