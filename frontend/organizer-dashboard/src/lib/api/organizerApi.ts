/**
 * Organizer Portal API Service
 * Base URL: /api/organizer/
 * Authentication: JWT tokens (organizer_id in token)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// Get API base URL from environment or use default
// Use relative URL to work with Vite proxy (works for both localhost and network access)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/organizer'|| "192.168.0.104:8000";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('organizer_access_token');
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
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't redirect on auth endpoints - let components handle errors
      const isAuthEndpoint = originalRequest?.url?.includes('/login/') || 
                             originalRequest?.url?.includes('/verify-otp/') ||
                             originalRequest?.url?.includes('/forgot-password/') ||
                             originalRequest?.url?.includes('/reset-password/');

      if (!isAuthEndpoint) {
        // Clear tokens and redirect to login
        localStorage.removeItem('organizer_access_token');
        localStorage.removeItem('organizer_refresh_token');
        localStorage.removeItem('organizer_authenticated');
        localStorage.removeItem('organizer_profile');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Types
export interface OrganizerLoginRequest {
  mobile: string;
  password: string;
}

export interface OrganizerLoginResponse {
  message: string;
  mobile: string;
}

export interface OrganizerOTPRequest {
  mobile: string;
  otp_code: string;
}

export interface OrganizerOTPResponse {
  access: string;
  refresh: string;
  organizer: OrganizerProfile;
}

export interface OrganizerProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_mobile?: string;
  contact_email?: string;
  company_name?: string;
  tax_id?: string;
  commercial_registration?: string;
  legal_business_name?: string;
  trade_name?: string;
  about?: string;
  profile_image?: string;
  category?: string;
  location?: string;
  status: string;
  verified?: boolean;
  commission_rate?: number;
  last_login?: string;
  total_events?: number;
  total_revenue?: number;
  rating?: number;
  registration_date?: string;
}

export interface DashboardStats {
  total_events: number;
  running_events: number;
  completed_events: number;
  available_tickets: number;
  total_tickets_sold: number;
  total_attendees: number;
  total_revenues: number;
  net_revenues: number;
  total_processed_payouts: number;
  total_pending_payouts: number;
}

export interface Event {
  id: string | number;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  venue?: {
    id: string;
    name: string;
  };
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  image_url?: string;
  image?: string;
  tickets_sold?: number;
  tickets_available?: number;
  people_admitted?: number;
  people_remaining?: number;
  total_payout_pending?: number;
  total_payout_paid?: number;
  total_tickets?: number;
  ticket_categories?: TicketCategory[];
}

export interface TicketCategory {
  name: string;
  price: number;
  total_tickets: number;
  tickets_sold: number;
  tickets_available: number;
}

export interface EventAnalytics {
  id: string | number;
  title: string;
  date: string;
  time: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  description?: string;
  about_venue?: string;
  starting_price?: number;
  featured?: boolean;
  image_url?: string;
  category_name?: string;
  gates_open_time?: string;
  ticket_categories?: Array<{
    category?: string;
    name?: string;
    price?: number;
    total?: number;
    total_tickets?: number;
    ticketsSold?: number;
    sold?: number;
    ticketsAvailable?: number;
    available?: number;
  }>;
  overall_stats?: {
    sold: number;
    available: number;
    admitted: number;
    remaining: number;
  };
  payout_info?: {
    pending: number;
    paid: number;
  };
  gender_distribution?: {
    male: number;
    female: number;
    prefer_not_to_say: number;
    other: number;
    unknown: number;
    total: number;
    percentages: {
      male: number;
      female: number;
      prefer_not_to_say: number;
      other: number;
      unknown: number;
    };
  };
  age_distribution?: {
    '0-17': number;
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55-64': number;
    '65+': number;
    unknown: number;
    total: number;
    percentages: {
      '0-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
      unknown: number;
    };
  };
}

export interface Payout {
  id: string | number;
  reference: string;
  organizer?: {
    id: string | number;
    name: string;
  };
  organizer_name?: string;
  amount: number | string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method?: string;
  created_at?: string;
  processed_at?: string | null;
}

export interface EventEditRequest {
  event: string;
  requested_changes: string;
  file_attachments?: string;
}

export interface ForgotPasswordRequest {
  mobile: string;
}

export interface ResetPasswordRequest {
  mobile: string;
  otp_code: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  otp_code: string;
  new_password: string;
}

// API Service Class
class OrganizerApiService {
  /**
   * Authentication
   */

  /**
   * Login with mobile and password
   * POST /api/organizer/login/
   */
  async login(data: OrganizerLoginRequest): Promise<OrganizerLoginResponse> {
    const response = await api.post<OrganizerLoginResponse>('/login/', data);
    return response.data;
  }

  /**
   * Verify OTP and get tokens
   * POST /api/organizer/verify-otp/
   */
  async verifyOTP(data: OrganizerOTPRequest): Promise<OrganizerOTPResponse> {
    const response = await api.post<OrganizerOTPResponse>('/verify-otp/', data);
    
    // Store tokens
    localStorage.setItem('organizer_access_token', response.data.access);
    localStorage.setItem('organizer_refresh_token', response.data.refresh);
    localStorage.setItem('organizer_authenticated', 'true');
    localStorage.setItem('organizer_profile', JSON.stringify(response.data.organizer));
    
    return response.data;
  }

  /**
   * Logout
   * POST /api/organizer/logout/
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('organizer_refresh_token');
    if (refreshToken) {
      try {
        await api.post('/logout/', { refresh_token: refreshToken });
      } catch (error) {
        // Continue with logout even if API call fails
        console.error('Logout API error:', error);
      }
    }
    
    // Clear local storage
    localStorage.removeItem('organizer_access_token');
    localStorage.removeItem('organizer_refresh_token');
    localStorage.removeItem('organizer_authenticated');
    localStorage.removeItem('organizer_profile');
  }

  /**
   * Get current organizer profile
   * GET /api/organizer/me/
   */
  async getMe(): Promise<OrganizerProfile> {
    const response = await api.get<OrganizerProfile>('/me/');
    return response.data;
  }

  /**
   * Request password reset OTP
   * POST /api/organizer/forgot-password/
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string; mobile: string }> {
    const response = await api.post('/forgot-password/', data);
    return response.data;
  }

  /**
   * Reset password with OTP
   * POST /api/organizer/reset-password/
   */
  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    const response = await api.post('/reset-password/', data);
    return response.data;
  }

  /**
   * Dashboard
   */

  /**
   * Get dashboard statistics
   * GET /api/organizer/dashboard/stats/
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats/');
    return response.data;
  }

  /**
   * Events
   */

  /**
   * List organizer's events
   * GET /api/organizer/events/
   */
  async getEvents(params?: {
    status?: string;
    location?: string;
    search?: string;
  }): Promise<Event[]> {
    const response = await api.get<Event[]>('/events/', { params });
    return response.data;
  }

  /**
   * Get event details with analytics
   * GET /api/organizer/events/:id/
   */
  async getEventDetail(eventId: string): Promise<EventAnalytics> {
    const response = await api.get<EventAnalytics>(`/events/${eventId}/`);
    return response.data;
  }

  /**
   * Submit event edit request
   * POST /api/organizer/events/:id/edit-request/
   */
  async submitEventEditRequest(
    eventId: string,
    data: EventEditRequest | FormData
  ): Promise<EventEditRequest> {
    // Don't set Content-Type header for FormData - axios will automatically set it with boundary
    // For FormData, axios/browser handles the Content-Type header automatically
    const response = await api.post(`/events/${eventId}/edit-request/`, data);
    return response.data;
  }

  /**
   * Payouts
   */

  /**
   * List organizer's payouts
   * GET /api/organizer/payouts/
   */
  async getPayouts(params?: {
    status?: string;
    search?: string;
  }): Promise<Payout[]> {
    const response = await api.get<Payout[]>('/payouts/', { params });
    return response.data;
  }

  /**
   * Get payout details
   * GET /api/organizer/payouts/:id/
   */
  async getPayoutDetail(payoutId: string): Promise<Payout> {
    const response = await api.get<Payout>(`/payouts/${payoutId}/`);
    return response.data;
  }

  /**
   * Get payout invoice
   * GET /api/organizer/payouts/:id/invoice/
   */
  async getPayoutInvoice(payoutId: string): Promise<any> {
    const response = await api.get(`/payouts/${payoutId}/invoice/`);
    return response.data;
  }

  /**
   * Profile
   */

  /**
   * Get organizer profile
   * GET /api/organizer/profile/
   */
  async getProfile(): Promise<OrganizerProfile> {
    const response = await api.get<OrganizerProfile>('/profile/');
    return response.data;
  }

  /**
   * Create profile edit request (requires admin approval)
   * POST /api/organizer/profile/edit-request/
   */
  async createProfileEditRequest(data: Partial<OrganizerProfile> | FormData): Promise<any> {
    // If data is FormData, use multipart/form-data headers
    const config = data instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await api.post('/profile/edit-request/', data, config);
    return response.data;
  }

  /**
   * Get organizer's edit requests
   * GET /api/organizer/profile/edit-requests/
   */
  async getEditRequests(): Promise<any[]> {
    const response = await api.get('/profile/edit-requests/');
    return response.data;
  }

  /**
   * Change password
   * POST /api/organizer/profile/change-password/
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await api.post('/profile/change-password/', data);
    return response.data;
  }
}

// Export singleton instance
const organizerApi = new OrganizerApiService();
export default organizerApi;
export { organizerApi };

