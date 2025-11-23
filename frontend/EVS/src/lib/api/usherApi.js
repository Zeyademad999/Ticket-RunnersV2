/**
 * Usher Portal API Service Layer
 * Handles all API calls to the backend usher portal endpoints
 */

import axios from 'axios';

// API Base URL - change this to production URL when deploying
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/usher';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Log all errors for debugging
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    // Only handle 401 for authentication endpoints or if error code indicates auth issue
    const isAuthError = error.response?.status === 401 && 
                       (error.response?.data?.error?.code === 'AUTHENTICATION_ERROR' ||
                        error.response?.data?.error?.code === 'TOKEN_EXPIRED' ||
                        originalRequest?.url?.includes('/login') ||
                        originalRequest?.url?.includes('/me'));

    // If 401 and haven't tried to refresh yet, and it's actually an auth error
    if (isAuthError && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } else {
          // No refresh token, logout
          console.warn('No refresh token available, logging out');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('usher_data');
          localStorage.removeItem('event_data');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed, logout user only if it's a real auth error
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usher_data');
        localStorage.removeItem('event_data');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For non-auth errors (404, 400, 500, etc.), don't logout - just format and reject
    // Ensure error response data is properly formatted
    if (error.response?.data) {
      // If error.data is an object with error key, ensure it's properly structured
      if (error.response.data.error && typeof error.response.data.error === 'object') {
        // Already properly structured, keep as is
      } else if (typeof error.response.data === 'object' && !error.response.data.error) {
        // Wrap in error structure if needed
        error.response.data = {
          error: {
            code: error.response.status === 400 ? 'VALIDATION_ERROR' : 
                  error.response.status === 401 ? 'AUTHENTICATION_ERROR' :
                  error.response.status === 404 ? 'NOT_FOUND' : 
                  error.response.status === 500 ? 'SERVER_ERROR' : 'ERROR',
            message: error.response.data.message || error.response.data.detail || 'An error occurred'
          }
        };
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (username, password, eventId) => {
    const response = await api.post('/login/', {
      username,
      password,
      event_id: eventId,
    });
    
    // Store tokens and user data
    if (response.data.access && response.data.refresh) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      if (response.data.usher) {
        localStorage.setItem('usher_data', JSON.stringify(response.data.usher));
      }
      if (response.data.event) {
        localStorage.setItem('event_data', JSON.stringify(response.data.event));
      }
    }
    
    return response.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/logout/', { refresh_token: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usher_data');
    localStorage.removeItem('event_data');
  },

  getMe: async () => {
    const response = await api.get('/me/');
    return response.data;
  },
};

// Events API
export const eventsAPI = {
  list: async () => {
    const response = await api.get('/events/');
    return response.data;
  },

  getDetail: async (eventId) => {
    const response = await api.get(`/events/${eventId}/`);
    return response.data;
  },

  validateAssignment: async (eventId) => {
    const response = await api.post(`/events/${eventId}/validate-assignment/`);
    return response.data;
  },

  getStatus: async (eventId) => {
    const response = await api.get(`/events/${eventId}/status/`);
    return response.data;
  },
};

// Scanning API
export const scanAPI = {
  verifyCard: async (cardId) => {
    const response = await api.post('/scan/verify-card/', { card_id: cardId });
    return response.data;
  },

  getAttendee: async (cardId, eventId = null) => {
    // Trim whitespace from cardId
    const trimmedCardId = cardId ? String(cardId).trim() : '';
    const url = eventId 
      ? `/scan/attendee/${encodeURIComponent(trimmedCardId)}/?event_id=${eventId}`
      : `/scan/attendee/${encodeURIComponent(trimmedCardId)}/`;
    const response = await api.get(url);
    return response.data;
  },

  processResult: async (cardId, eventId, result, notes = '') => {
    const response = await api.post('/scan/result/', {
      card_id: cardId,
      event_id: eventId,
      result,
      notes,
    });
    return response.data;
  },

  logScan: async (scanData) => {
    const response = await api.post('/scan/log/', scanData);
    return response.data;
  },
};

// Logs API
export const logsAPI = {
  list: async (eventId = null, page = 1) => {
    const url = eventId 
      ? `/scan/logs/?event_id=${eventId}&page=${page}`
      : `/scan/logs/?page=${page}`;
    const response = await api.get(url);
    return response.data;
  },

  search: async (searchParams) => {
    const response = await api.get('/scan/logs/search/', { params: searchParams });
    return response.data;
  },
};

// Part-time Leave API
export const leaveAPI = {
  create: async (eventId, cardId, reason = '') => {
    const response = await api.post('/scan/part-time-leave/', {
      event_id: eventId,
      card_id: cardId,
      reason: reason || 'Part-time leave',
    });
    return response.data;
  },

  return: async (eventId, cardId) => {
    // For now, we'll use the same endpoint but mark as return
    // In the future, this could be a separate endpoint
    const response = await api.post('/scan/part-time-leave/', {
      event_id: eventId,
      card_id: cardId,
      reason: 'Returned from part-time leave',
      return: true,
    });
    return response.data;
  },

  list: async (eventId) => {
    const url = eventId 
      ? `/scan/part-time-leave/list/?event_id=${eventId}`
      : '/scan/part-time-leave/list/';
    const response = await api.get(url);
    return response.data;
  },

  checkLeave: async (eventId, cardId) => {
    // Check if customer is currently on leave
    const response = await api.get(`/scan/part-time-leave/list/?event_id=${eventId}&card_id=${cardId}&active=true`);
    return response.data;
  },
};

// Reports API
export const reportsAPI = {
  create: async (reportData) => {
    const response = await api.post('/scan/report/', reportData);
    return response.data;
  },
};

// Sync API
export const syncAPI = {
  getAttendees: async (eventId) => {
    const response = await api.get(`/sync/attendees/?event_id=${eventId}`);
    return response.data;
  },

  getCards: async (eventId) => {
    const response = await api.get(`/sync/cards/?event_id=${eventId}`);
    return response.data;
  },
};

// NFC Status API
export const nfcAPI = {
  getStatus: async () => {
    const response = await api.get('/nfc/status/');
    return response.data;
  },
};

export default api;

