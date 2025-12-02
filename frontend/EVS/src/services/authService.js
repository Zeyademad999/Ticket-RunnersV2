/**
 * Authentication Service
 * Handles authentication state and token management
 */

export const authService = {
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  // Get stored usher data
  getUsher: () => {
    const usherData = localStorage.getItem('usher_data');
    return usherData ? JSON.parse(usherData) : null;
  },

  // Get stored event data
  getEvent: () => {
    const eventData = localStorage.getItem('event_data');
    return eventData ? JSON.parse(eventData) : null;
  },

  // Get access token
  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  // Get refresh token
  getRefreshToken: () => {
    return localStorage.getItem('refresh_token');
  },

  // Clear all auth data
  clearAuth: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usher_data');
    localStorage.removeItem('event_data');
  },
};

