import storage from '../utils/storage';

/**
 * MOCK USER DATABASE
 * Single Admin role configuration for LandOS access control.
 */
export const MOCK_USERS = [
  {
    id: 'usr_admin_01',
    name: 'Alexander Wright',
    email: 'admin@landos.com',
    password: 'admin123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    permissions: ['*']
  }
];

/**
 * ISOLATED AUTH SERVICE API
 * Currently operates using mock latency and local storage.
 * When switching to FastAPI, only this file will be updated with actual HTTP calls (e.g. fetch / axios).
 */
export const authService = {
  /**
   * Authenticate user with email and password
   * Simulates FastAPI POST /api/v1/auth/login endpoint
   */
  login: async ({ email, password, rememberMe = true }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        const userMatch = MOCK_USERS.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.password === password
        );

        if (!userMatch) {
          return reject(new Error('Invalid email or password. Please check your credentials.'));
        }

        // Generate synthetic mock JWT token
        const fakeToken = `mock-jwt-${userMatch.role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Strip password from returned user payload
        const { password: _, ...userPayload } = userMatch;

        // Persist in storage
        storage.setSession(fakeToken, userPayload, rememberMe);

        resolve({
          user: userPayload,
          token: fakeToken
        });
      }, 500); // 500ms server latency imitation
    });
  },

  /**
   * Log out active user and invalidate session
   * Simulates FastAPI POST /api/v1/auth/logout endpoint
   */
  logout: async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        storage.clearSession();
        resolve({ success: true });
      }, 200);
    });
  },

  /**
   * Refresh session / token
   * Simulates FastAPI POST /api/v1/auth/refresh endpoint
   */
  refresh: async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const currentToken = storage.getToken();
        const currentUser = storage.getUser();

        if (!currentToken || !currentUser) {
          storage.clearSession();
          return reject(new Error('Session expired. Please log in again.'));
        }

        const newToken = `mock-jwt-refreshed-${Date.now()}`;
        const rememberMe = storage.getRememberMe();
        storage.setSession(newToken, currentUser, rememberMe);

        resolve({
          user: currentUser,
          token: newToken
        });
      }, 300);
    });
  },

  /**
   * Get authenticated user profile from session
   * Simulates FastAPI GET /api/v1/auth/me endpoint
   */
  getCurrentUser: async () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const token = storage.getToken();
        const user = storage.getUser();

        if (!token || !user) {
          return resolve(null);
        }

        resolve(user);
      }, 200);
    });
  },

  /**
   * Request password reset email
   */
  requestPasswordReset: async (email) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        if (!cleanEmail || !cleanEmail.includes('@')) {
          return reject(new Error('Please enter a valid email address.'));
        }

        resolve({
          success: true,
          message: `Password reset instructions have been sent to ${cleanEmail}`
        });
      }, 500);
    });
  }
};

export default authService;
