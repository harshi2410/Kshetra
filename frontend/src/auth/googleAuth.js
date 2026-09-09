/**
 * Google Identity Services (GIS) Integration
 * 
 * Provides official Google OAuth 2.0 integration to read the real Google
 * accounts active in the user's local browser session.
 */

/**
 * Get configured Google Client ID from Vite environment or localStorage
 */
export function getGoogleClientId() {
  return (
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    localStorage.getItem('landos_google_client_id') ||
    ''
  );
}

/**
 * Save custom Google Client ID into localStorage for development
 */
export function setGoogleClientId(clientId) {
  if (clientId) {
    localStorage.setItem('landos_google_client_id', clientId.trim());
  } else {
    localStorage.removeItem('landos_google_client_id');
  }
}

/**
 * Check if the Google Identity Services SDK script has loaded in the browser
 */
export function isGoogleGsiLoaded() {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.oauth2);
}

/**
 * Trigger authentic Google OAuth popup to select an account signed into the browser.
 * Fetches user profile (email, name, picture) directly from Google's userinfo endpoint.
 * 
 * Returns Promise<{ email, name, avatar, sub }> or rejects if cancelled/error.
 */
export async function triggerGoogleBrowserAuth() {
  const clientId = getGoogleClientId();

  if (!clientId) {
    throw new Error('NO_CLIENT_ID');
  }

  // Ensure GIS script is available
  if (!isGoogleGsiLoaded()) {
    // Wait up to 2 seconds for script to initialize
    await new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (isGoogleGsiLoaded()) {
          clearInterval(interval);
          resolve(true);
        } else if (attempts > 20) {
          clearInterval(interval);
          reject(new Error('Google Identity Services SDK failed to load. Please check internet connection.'));
        }
      }, 100);
    });
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }

          if (!tokenResponse.access_token) {
            return reject(new Error('No access token received from Google.'));
          }

          try {
            // Optionally fetch profile for immediate client preview; backend performs authoritative verification
            let profile = {};
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              });
              if (res.ok) {
                profile = await res.json();
              }
            } catch (e) {
              // Non-critical: backend performs authoritative token verification and profile extraction
            }

            resolve({
              access_token: tokenResponse.access_token,
              email: profile.email,
              name: profile.name || profile.given_name,
              avatar: profile.picture,
              sub: profile.sub,
            });
          } catch (fetchErr) {
            // Still resolve with access_token so server can verify
            resolve({
              access_token: tokenResponse.access_token
            });
          }
        },
        error_callback: (err) => {
          if (err?.type === 'popup_closed') {
            reject(new Error('Google sign-in was cancelled (popup closed).'));
          } else if (err?.type === 'popup_blocked') {
            reject(new Error('Google sign-in popup was blocked by your browser. Please enable popups for this site.'));
          } else {
            reject(new Error(err?.message || 'Google authentication was cancelled or failed.'));
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}
