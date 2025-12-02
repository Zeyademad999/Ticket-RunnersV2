/**
 * Admin API Service Layer
 * Handles all API calls for the Admin Dashboard
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Get API base URL from environment variable or use default
// In production, set VITE_API_BASE_URL in .env file
// Use relative URL to work with Vite proxy (works for both localhost and network access)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance
const adminApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - Add token to all requests
adminApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('admin_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If data is FormData, don't set Content-Type header (let browser set it with boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 403 Forbidden - Permission denied
    if (error.response?.status === 403) {
      // Show permission denied message
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          "You do not have permission to access this feature.";
      
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('permission-denied', { 
        detail: { message: errorMessage } 
      }));
      
      console.error("Permission denied:", errorMessage);
    }

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('admin_refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('admin_access_token', access);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          return adminApi(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  /**
   * Login with username and password
   */
  login: async (username: string, password: string) => {
    const response = await adminApi.post('/auth/login/', {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Logout - blacklist refresh token
   */
  logout: async () => {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (refreshToken) {
      try {
        await adminApi.post('/auth/logout/', {
          refresh_token: refreshToken,
        });
      } catch (error) {
        // Continue with logout even if API call fails
        console.error('Logout API error:', error);
      }
    }
    // Clear local storage
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
  },

  /**
   * Get current user profile
   */
  getMe: async () => {
    const response = await adminApi.get('/auth/me/');
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
      refresh: refreshToken,
    });
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await adminApi.put('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async () => {
    const response = await adminApi.get('/dashboard/stats/');
    return response.data;
  },

  /**
   * Get revenue analytics
   */
  getRevenueAnalytics: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await adminApi.get('/analytics/revenue/', { params });
    return response.data;
  },

  /**
   * Get user growth analytics
   */
  getUserGrowthAnalytics: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await adminApi.get('/analytics/users/', { params });
    return response.data;
  },

  /**
   * Get card status analytics
   */
  getCardStatusAnalytics: async () => {
    const response = await adminApi.get('/analytics/cards/');
    return response.data;
  },

  /**
   * Get event categories analytics
   */
  getEventCategoriesAnalytics: async () => {
    const response = await adminApi.get('/analytics/events/');
    return response.data;
  },
};

// Events API
export const eventsApi = {
  /**
   * Get all events with filtering
   */
  getEvents: async (params?: {
    search?: string;
    status?: string;
    organizer?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/events/', { params });
    return response.data;
  },

  /**
   * Get event by ID
   */
  getEvent: async (id: string) => {
    const response = await adminApi.get(`/events/${id}/`);
    return response.data;
  },

  /**
   * Create new event
   */
  createEvent: async (data: any) => {
    const response = await adminApi.post('/events/', data);
    return response.data;
  },

  /**
   * Update event
   */
  updateEvent: async (id: string, data: any) => {
    // Check if data is FormData (for file uploads) or regular object
    const isFormData = data instanceof FormData;
    const method = isFormData ? 'put' : 'patch';
    const response = await adminApi[method](`/events/${id}/`, data, {
      headers: isFormData ? {} : { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  /**
   * Delete event
   */
  deleteEvent: async (id: string) => {
    const response = await adminApi.delete(`/events/${id}/`);
    return response.data;
  },

  /**
   * Get event statistics
   */
  getEventStatistics: async (id: string) => {
    const response = await adminApi.get(`/events/${id}/statistics/`);
    return response.data;
  },

  /**
   * Get all event categories
   */
  getCategories: async () => {
    const response = await adminApi.get('/events/categories/');
    return response.data;
  },
};

// Tickets API
export const ticketsApi = {
  /**
   * Get all tickets with filtering
   */
  getTickets: async (params?: {
    search?: string;
    event?: string;
    customer?: string;
    merchant?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/tickets/', { params });
    return response.data;
  },

  /**
   * Get ticket by ID
   */
  getTicket: async (id: string) => {
    const response = await adminApi.get(`/tickets/${id}/`);
    return response.data;
  },

  /**
   * Create ticket
   */
  createTicket: async (data: {
    event_id: string;
    customer_id: string;
    category: string;
    price: number;
  }) => {
    const response = await adminApi.post('/tickets/', data);
    return response.data;
  },

  /**
   * Update ticket status
   */
  updateTicketStatus: async (id: string, status: string) => {
    const response = await adminApi.put(`/tickets/${id}/status/`, { status });
    return response.data;
  },

  /**
   * Update ticket (general update)
   */
  updateTicket: async (id: string, data: { status?: string; category?: string; price?: number; [key: string]: any }) => {
    const response = await adminApi.put(`/tickets/${id}/`, data);
    return response.data;
  },

  /**
   * Delete ticket
   */
  deleteTicket: async (id: string) => {
    const response = await adminApi.delete(`/tickets/${id}/`);
    return response.data;
  },

  /**
   * Check in ticket
   */
  checkinTicket: async (id: string, data?: { device_name?: string; device_type?: string; notes?: string }) => {
    const response = await adminApi.post(`/tickets/${id}/checkin/`, data || {});
    return response.data;
  },

  /**
   * Transfer ticket
   */
  transferTicket: async (id: string, to_customer_id: string) => {
    const response = await adminApi.post(`/tickets/${id}/transfer/`, { to_customer_id });
    return response.data;
  },
};

// Customers API
export const customersApi = {
  /**
   * Get all customers with filtering
   */
  getCustomers: async (params?: {
    search?: string;
    status?: string;
    is_recurrent?: boolean;
    fees_paid?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/customers/', { params });
    return response.data;
  },

  /**
   * Get customer by ID
   */
  getCustomer: async (id: string) => {
    const response = await adminApi.get(`/customers/${id}/`);
    return response.data;
  },

  /**
   * Create customer
   */
  createCustomer: async (data: any) => {
    const isFormData =
      typeof FormData !== "undefined" && data instanceof FormData;
    const response = await adminApi.post("/customers/", data, {
      headers: isFormData ? {} : undefined,
    });
    return response.data;
  },

  /**
   * Update customer
   */
  updateCustomer: async (id: string, data: any) => {
    const response = await adminApi.put(`/customers/${id}/`, data);
    return response.data;
  },

  /**
   * Update customer status (ban/unban/activate/deactivate)
   */
  updateCustomerStatus: async (id: string, status: string) => {
    const response = await adminApi.put(`/customers/${id}/status/`, { status });
    return response.data;
  },

  /**
   * Delete customer
   */
  deleteCustomer: async (id: string) => {
    const response = await adminApi.delete(`/customers/${id}/`);
    return response.data;
  },

  /**
   * Get customer bookings (tickets)
   */
  getCustomerBookings: async (id: string) => {
    const response = await adminApi.get(`/customers/${id}/bookings/`);
    return response.data;
  },
};

// NFC Cards API
export const nfcCardsApi = {
  /**
   * Get all NFC cards with filtering
   */
  getCards: async (params?: {
    search?: string;
    customer?: string;
    merchant?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/nfc-cards/', { params });
    return response.data;
  },

  /**
   * Get card by ID
   */
  getCard: async (id: string) => {
    const response = await adminApi.get(`/nfc-cards/${id}/`);
    return response.data;
  },

  /**
   * Create new card
   */
  createCard: async (data: any) => {
    const response = await adminApi.post('/nfc-cards/', data);
    return response.data;
  },

  /**
   * Update card (uses PATCH for partial updates)
   */
  updateCard: async (id: string, data: any) => {
    const response = await adminApi.patch(`/nfc-cards/${id}/`, data);
    return response.data;
  },

  /**
   * Delete card
   */
  deleteCard: async (id: string) => {
    const response = await adminApi.delete(`/nfc-cards/${id}/`);
    return response.data;
  },

  /**
   * Bulk operations
   */
  bulkOperation: async (data: { operation: string; card_ids: string[]; [key: string]: any }) => {
    const response = await adminApi.post('/nfc-cards/bulk/', data);
    return response.data;
  },
};

// Ushers API
export const ushersApi = {
  /**
   * Get ushers
   */
  getUshers: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/ushers/', { params });
    return response.data;
  },

  /**
   * Create usher
   */
  createUsher: async (data: any) => {
    const response = await adminApi.post('/ushers/', data);
    return response.data;
  },

  /**
   * Update usher
   */
  updateUsher: async (id: string, data: any) => {
    const response = await adminApi.patch(`/ushers/${id}/`, data);
    return response.data;
  },

  /**
   * Delete usher
   */
  deleteUsher: async (id: string) => {
    const response = await adminApi.delete(`/ushers/${id}/`);
    return response.data;
  },

  /**
   * Create EVS credentials for usher
   */
  createCredentials: async (id: string, data: { username: string; password: string; event_ids?: number[] }) => {
    const response = await adminApi.post(`/ushers/${id}/create_credentials/`, data);
    return response.data;
  },

  /**
   * Assign usher to events
   */
  assignEvent: async (id: string, data: { event_ids: number[] }) => {
    const response = await adminApi.post(`/ushers/${id}/assign_event/`, data);
    return response.data;
  },
};

// Merchants API
export const merchantsApi = {
  /**
   * Get merchants
   */
  getMerchants: async (params?: {
    search?: string;
    status?: string;
    verification_status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/merchants/', { params });
    return response.data;
  },

  /**
   * Create merchant
   */
  createMerchant: async (data: any) => {
    const response = await adminApi.post('/merchants/', data);
    return response.data;
  },

  /**
   * Create credentials for merchant
   */
  createMerchantCredentials: async (id: string, data: { mobile: string; password: string }) => {
    const response = await adminApi.post(`/merchants/${id}/create_credentials/`, data);
    return response.data;
  },

  /**
   * Update merchant
   */
  updateMerchant: async (id: string, data: any) => {
    const response = await adminApi.put(`/merchants/${id}/`, data);
    return response.data;
  },

  /**
   * Delete merchant
   */
  deleteMerchant: async (id: string) => {
    const response = await adminApi.delete(`/merchants/${id}/`);
    return response.data;
  },
};

// Merchant Locations API
export const merchantLocationsApi = {
  /**
   * Get all merchant locations
   */
  getLocations: async (params?: {
    merchant?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/users/merchant-locations/', { params });
    return response.data;
  },

  /**
   * Get location by ID
   */
  getLocation: async (id: string) => {
    const response = await adminApi.get(`/users/merchant-locations/${id}/`);
    return response.data;
  },

  /**
   * Create merchant location
   */
  createLocation: async (data: {
    merchant?: number | null;
    merchant_name?: string;
    phone_number?: string;
    address: string;
    google_maps_link?: string;
    is_active?: boolean;
  }) => {
    const response = await adminApi.post('/users/merchant-locations/', data);
    return response.data;
  },

  /**
   * Update merchant location
   */
  updateLocation: async (id: string, data: any) => {
    const response = await adminApi.patch(`/users/merchant-locations/${id}/`, data);
    return response.data;
  },

  /**
   * Delete merchant location
   */
  deleteLocation: async (id: string) => {
    const response = await adminApi.delete(`/users/merchant-locations/${id}/`);
    return response.data;
  },
};

// Users API (Organizers, Merchants, Ushers, Admins)
export const usersApi = {
  /**
   * Get organizers
   */
  getOrganizers: async (params?: {
    search?: string;
    status?: string;
    verified?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/organizers/', { params });
    return response.data;
  },

  /**
   * Get merchants
   */
  getMerchants: async (params?: {
    search?: string;
    status?: string;
    verification_status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/merchants/', { params });
    return response.data;
  },

  /**
   * Get ushers
   */
  getUshers: async (params?: {
    search?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/ushers/', { params });
    return response.data;
  },

  /**
   * Get admin users
   */
  getAdmins: async (params?: {
    search?: string;
    role?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/admins/', { params });
    return response.data;
  },

  /**
   * Create organizer
   */
  createOrganizer: async (data: any) => {
    const response = await adminApi.post('/organizers/', data);
    return response.data;
  },

  /**
   * Create credentials for organizer
   */
  createOrganizerCredentials: async (id: string, data: { mobile: string; password: string }) => {
    const response = await adminApi.post(`/organizers/${id}/create_credentials/`, data);
    return response.data;
  },

  /**
   * Update organizer
   */
  updateOrganizer: async (id: string, data: any) => {
    const response = await adminApi.patch(`/organizers/${id}/`, data);
    return response.data;
  },

  /**
   * Delete organizer
   */
  deleteOrganizer: async (id: string) => {
    const response = await adminApi.delete(`/organizers/${id}/`);
    return response.data;
  },

  /**
   * Create merchant
   */
  createMerchant: async (data: any) => {
    const response = await adminApi.post('/merchants/', data);
    return response.data;
  },

  /**
   * Create credentials for merchant
   */
  createMerchantCredentials: async (id: string, data: { mobile: string; password: string }) => {
    const response = await adminApi.post(`/merchants/${id}/create_credentials/`, data);
    return response.data;
  },

  /**
   * Update merchant
   */
  updateMerchant: async (id: string, data: any) => {
    const response = await adminApi.put(`/merchants/${id}/`, data);
    return response.data;
  },

  /**
   * Delete merchant
   */
  deleteMerchant: async (id: string) => {
    const response = await adminApi.delete(`/merchants/${id}/`);
    return response.data;
  },

  /**
   * Create usher
   */
  createUsher: async (data: any) => {
    const response = await adminApi.post('/ushers/', data);
    return response.data;
  },

  /**
   * Update usher
   */
  updateUsher: async (id: string, data: any) => {
    const response = await adminApi.patch(`/ushers/${id}/`, data);
    return response.data;
  },

  /**
   * Delete usher
   */
  deleteUsher: async (id: string) => {
    const response = await adminApi.delete(`/ushers/${id}/`);
    return response.data;
  },

  /**
   * Create admin user
   */
  createAdmin: async (data: any) => {
    const response = await adminApi.post('/admins/', data);
    return response.data;
  },

  /**
   * Update admin user
   */
  updateAdmin: async (id: string, data: any) => {
    const response = await adminApi.patch(`/admins/${id}/`, data);
    return response.data;
  },

  /**
   * Delete admin user
   */
  deleteAdmin: async (id: string) => {
    const response = await adminApi.delete(`/admins/${id}/`);
    return response.data;
  },
};

// Organizer Edit Requests API
export const organizerEditRequestsApi = {
  /**
   * Get organizer edit requests
   */
  getEditRequests: async (params?: {
    status?: string;
    organizer?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/organizers/edit-requests/', { params });
    return response.data;
  },

  /**
   * Get edit request by ID
   */
  getEditRequest: async (id: string) => {
    const response = await adminApi.get(`/organizers/edit-requests/${id}/`);
    return response.data;
  },

  /**
   * Approve edit request
   */
  approveEditRequest: async (id: string) => {
    const response = await adminApi.post(`/organizers/edit-requests/${id}/approve/`);
    return response.data;
  },

  /**
   * Reject edit request
   */
  rejectEditRequest: async (id: string, rejectionReason?: string) => {
    const response = await adminApi.post(`/organizers/edit-requests/${id}/reject/`, {
      rejection_reason: rejectionReason || '',
    });
    return response.data;
  },
};

// Venues API
export const venuesApi = {
  /**
   * Get all venues
   */
  getVenues: async (params?: {
    search?: string;
    city?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/venues/', { params });
    return response.data;
  },

  /**
   * Get venue by ID
   */
  getVenue: async (id: string) => {
    const response = await adminApi.get(`/venues/${id}/`);
    return response.data;
  },

  /**
   * Create venue
   */
  createVenue: async (data: any) => {
    const response = await adminApi.post('/venues/', data);
    return response.data;
  },

  /**
   * Update venue
   */
  updateVenue: async (id: string, data: any) => {
    const response = await adminApi.put(`/venues/${id}/`, data);
    return response.data;
  },

  /**
   * Delete venue
   */
  deleteVenue: async (id: string) => {
    const response = await adminApi.delete(`/venues/${id}/`);
    return response.data;
  },
};

// Financial API
export const financesApi = {
  /**
   * Get expenses
   */
  getExpenses: async (params?: {
    search?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/expenses/', { params });
    return response.data;
  },

  /**
   * Create expense
   */
  createExpense: async (data: {
    category: string;
    amount: number;
    description: string;
    date: string;
  }) => {
    const response = await adminApi.post('/expenses/', data);
    return response.data;
  },

  /**
   * Update expense
   */
  updateExpense: async (id: string, data: {
    category?: string;
    amount?: number;
    description?: string;
    date?: string;
  }) => {
    const response = await adminApi.put(`/expenses/${id}/`, data);
    return response.data;
  },

  /**
   * Delete expense
   */
  deleteExpense: async (id: string) => {
    const response = await adminApi.delete(`/expenses/${id}/`);
    return response.data;
  },

  /**
   * Get payouts
   */
  getPayouts: async (params?: {
    search?: string;
    status?: string;
    organizer?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/payouts/', { params });
    return response.data;
  },

  /**
   * Update payout status
   */
  updatePayout: async (id: string, data: {
    status?: string;
    notes?: string;
  }) => {
    const response = await adminApi.patch(`/payouts/${id}/`, data);
    return response.data;
  },

  /**
   * Create payout
   */
  createPayout: async (data: {
    organizer: string;
    amount: number;
    method?: string;
    reference: string;
  }) => {
    const response = await adminApi.post('/payouts/', data);
    return response.data;
  },

  /**
   * Get company finances
   */
  getCompanyFinances: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await adminApi.get('/finances/company/', { params });
    return response.data;
  },

  /**
   * Get profit share data
   */
  getProfitShare: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await adminApi.get('/finances/profit-share/', { params });
    return response.data;
  },

  /**
   * Create profit share owner
   */
  createProfitShareOwner: async (data: {
    partner_name: string;
    email?: string;
    phone?: string;
    share_percentage: number;
    initial_deposit?: number;
  }) => {
    const response = await adminApi.post('/finances/profit-share/', data);
    return response.data;
  },

  /**
   * Get settlements
   */
  getSettlements: async (params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/finances/settlements/', { params });
    return response.data;
  },

  /**
   * Get deposits
   */
  getDeposits: async (params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/finances/deposits/', { params });
    return response.data;
  },

  /**
   * Get profit withdrawals
   */
  getProfitWithdrawals: async (params?: {
    search?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/finances/withdrawals/', { params });
    return response.data;
  },

  /**
   * Get payments
   */
  getPayments: async (params?: {
    search?: string;
    status?: string;
    payment_method?: string;
    customer?: string;
    ticket?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/payments/', { params });
    return response.data;
  },

  /**
   * Get payment statistics
   */
  getPaymentStats: async () => {
    const response = await adminApi.get('/payments/stats/');
    return response.data;
  },
};

// System Logs API
export const systemLogsApi = {
  /**
   * Get system logs
   */
  getSystemLogs: async (params?: {
    search?: string;
    user?: string;
    action?: string;
    category?: string;
    severity?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/logs/system/', { params });
    return response.data;
  },

  /**
   * Get check-in logs
   */
  getCheckinLogs: async (params?: {
    search?: string;
    event?: string;
    customer?: string;
    device?: string;
    operator?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }) => {
    const response = await adminApi.get('/logs/checkin/', { params });
    return response.data;
  },
};

// Home Page Sections API
export const homePageSectionsApi = {
  /**
   * Get all home page sections
   */
  getSections: async () => {
    const response = await adminApi.get('/core/home-page-sections/');
    return response.data;
  },

  /**
   * Get a specific home page section
   */
  getSection: async (id: string | number) => {
    const response = await adminApi.get(`/core/home-page-sections/${id}/`);
    return response.data;
  },

  /**
   * Create a new home page section
   */
  createSection: async (data: {
    section_key: string;
    title: string;
    subtitle?: string;
    event_ids?: number[];
    order?: number;
    is_active?: boolean;
    max_events?: number;
  }) => {
    const response = await adminApi.post('/core/home-page-sections/', data);
    return response.data;
  },

  /**
   * Update a home page section
   */
  updateSection: async (id: string | number, data: {
    title?: string;
    subtitle?: string;
    event_ids?: number[];
    order?: number;
    is_active?: boolean;
    max_events?: number;
  }) => {
    // Use PATCH for partial updates instead of PUT
    const response = await adminApi.patch(`/core/home-page-sections/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a home page section
   */
  deleteSection: async (id: string | number) => {
    const response = await adminApi.delete(`/core/home-page-sections/${id}/`);
    return response.data;
  },

  /**
   * Get public view of home page sections (what web app sees)
   */
  getPublicSections: async () => {
    const response = await adminApi.get('/core/home-page-sections/public_list/');
    return response.data;
  },
};

// Export default API instance for custom requests
export default adminApi;

