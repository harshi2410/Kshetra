import storage from '../utils/storage.js';

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

const REGISTERED_USERS_KEY = 'landos_registered_users';

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredUser(newUser) {
  try {
    const current = getStoredUsers();
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify([...current, newUser]));
  } catch (e) {
    console.error('Failed to persist registered user:', e);
  }
}

function getAllUsers() {
  return [...MOCK_USERS, ...getStoredUsers()];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

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
        const userMatch = getAllUsers().find(
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
   * Register a new user account
   * Simulates FastAPI POST /api/v1/auth/register endpoint
   */
  register: async ({ name, email, password, company = '', rememberMe = true }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        const cleanName = name ? name.trim() : '';

        if (!cleanName) {
          return reject(new Error('Full name is required.'));
        }
        if (!cleanEmail || !cleanEmail.includes('@')) {
          return reject(new Error('Please enter a valid email address.'));
        }
        if (!password || password.length < 6) {
          return reject(new Error('Password must be at least 6 characters long.'));
        }

        const existing = getAllUsers().find((u) => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          return reject(new Error('An account with this email address already exists. Please sign in instead.'));
        }

        const newUser = {
          id: `usr_${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          password,
          company: company.trim(),
          role: 'admin', // Grants access for testing and evaluation
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80`,
          permissions: ['*'],
          createdAt: new Date().toISOString()
        };

        saveStoredUser(newUser);

        // Generate synthetic mock JWT token
        const fakeToken = `mock-jwt-${newUser.role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const { password: _, ...userPayload } = newUser;

        // Persist in storage
        storage.setSession(fakeToken, userPayload, rememberMe);

        resolve({
          user: userPayload,
          token: fakeToken
        });
      }, 500);
    });
  },

  /**
   * Sign in with Google OAuth
   * Securely verifies the Google authentication token with FastAPI backend (/api/v1/auth/google)
   * and initializes the authenticated application session.
   */
  loginWithGoogle: async ({ access_token, id_token, credential, email, name, avatar, rememberMe = true } = {}) => {
    if (access_token || id_token || credential) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: access_token || null,
            id_token: id_token || null,
            credential: credential || null,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          storage.setSession(data.token, data.user, rememberMe);
          return data;
        }

        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Google authentication failed with status ${response.status}.`);
      } catch (err) {
        if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
          throw err;
        }
        console.error('Failed to reach LandOS backend auth server:', err);
        throw new Error(`Unable to connect to authentication server at ${API_BASE_URL}. Please ensure the backend is running.`);
      }
    }

    // Fallback if no token was provided (e.g. mock demo mode)
    const selectedEmail = email ? email.trim().toLowerCase() : 'user.google@landos.ai';
    const selectedName = name && name.trim() ? name.trim() : (selectedEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Google User');
    const selectedAvatar = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80';

    const googleUser = {
      id: `usr_google_${Date.now().toString(36)}`,
      name: selectedName,
      email: selectedEmail,
      role: 'admin',
      avatar: selectedAvatar,
      permissions: ['*'],
      authProvider: 'google',
      createdAt: new Date().toISOString()
    };

    const fakeToken = `mock-jwt-google-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    storage.setSession(fakeToken, googleUser, rememberMe);

    return {
      user: googleUser,
      token: fakeToken
    };
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
