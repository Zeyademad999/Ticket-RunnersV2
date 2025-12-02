import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  Merchant,
  NFCCard,
  Customer,
  CardAssignment,
  LoginCredentials,
  OTPVerification,
  PasswordChange,
  MobileChange,
  DashboardStats,
  ApiResponse,
} from "../types";
// Using real API endpoints - all API calls go to backend

class ApiService {
  private api: AxiosInstance | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL =
      process.env.REACT_APP_API_URL ||
      "http://localhost:8000/api/merchant";

    // Only create axios instance if not using mock data
    if (true) { // Always use real API
      this.api = axios.create({
        baseURL: this.baseURL,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Add request interceptor to include auth token
      this.api.interceptors.request.use(
        (config) => {
          // Don't add auth token for login/verify-otp endpoints
          const url = config.url || '';
          const isAuthEndpoint = url.includes('/login') || 
                                 url.includes('/verify-otp') ||
                                 url.includes('/login/') || 
                                 url.includes('/verify-otp/');
          
          if (!isAuthEndpoint) {
            const token = localStorage.getItem("access_token");
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } else {
            // Explicitly remove any auth header for login endpoints
            delete config.headers.Authorization;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      // Add response interceptor for error handling and token refresh
      this.api.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          
          // Don't redirect on 401 during login/verify-otp/assign-card endpoints - let the component handle the error
          const isAuthEndpoint = originalRequest?.url?.includes('/login/') || 
                                 originalRequest?.url?.includes('/verify-otp/') ||
                                 originalRequest?.url?.includes('/assign-card/') ||
                                 originalRequest?.url?.includes('/verify-customer-otp/');
          
          if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;
            
            // Try to refresh token
            const refreshToken = localStorage.getItem("refresh_token");
            if (refreshToken) {
              try {
                // Note: Backend doesn't have a refresh endpoint yet, so we'll just redirect to login
                // In the future, implement token refresh here
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("merchantData");
                window.location.href = "/login";
              } catch (refreshError) {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("merchantData");
                window.location.href = "/login";
              }
            } else {
              localStorage.removeItem("access_token");
              localStorage.removeItem("refresh_token");
              localStorage.removeItem("merchantData");
              window.location.href = "/login";
            }
          }
          return Promise.reject(error);
        }
      );
    }
  }

  // Authentication
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ message: string; mobile: string }>> {
    // Use real API endpoint for OTP sending
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      // Backend expects 'mobile' not 'mobile_number'
      const response: AxiosResponse = await this.api.post("/login/", {
        mobile: credentials.mobile_number,
        password: credentials.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Backend returns: { message: 'OTP sent...', mobile: '...' }
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyOTP(
    verification: OTPVerification
  ): Promise<ApiResponse<{ access: string; refresh: string; merchant: Merchant }>> {
    // Use real API endpoint for OTP verification
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      // Backend expects 'mobile' and 'otp_code'
      const response: AxiosResponse = await this.api.post("/verify-otp/", {
        mobile: verification.mobile_number,
        otp_code: verification.otp,
      });
      
      // Backend returns: { access: '...', refresh: '...', merchant: {...} }
      return {
        success: true,
        data: {
          access: response.data.access,
          refresh: response.data.refresh,
          merchant: response.data.merchant,
        },
        message: "OTP verified successfully",
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      const response: AxiosResponse = await this.api.post("/logout/", {
        refresh_token: refreshToken,
      });
      return {
        success: true,
        message: response.data.message || "Logged out successfully",
      };
    } catch (error: any) {
      // Even if logout fails, clear local storage
      return {
        success: true,
        message: "Logged out successfully",
      };
    }
  }

  // Card Assignment
  async validateCard(
    cardSerial: string
  ): Promise<ApiResponse<{ valid: boolean; card?: any; error?: { code: string; message: string } }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      // Normalize serial number: trim whitespace and convert to uppercase
      const normalizedSerial = cardSerial.trim().toUpperCase();
      const response: AxiosResponse = await this.api.post("/validate-card/", {
        card_serial: normalizedSerial,
      });
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async assignCard(
    assignment: CardAssignment
  ): Promise<ApiResponse<{ message: string; card_serial: string; customer_mobile: string }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      // Backend expects card_serial and customer_mobile (no OTP in first step)
      const response: AxiosResponse = await this.api.post("/assign-card/", {
        card_serial: assignment.card_serial,
        customer_mobile: assignment.customer_mobile,
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyCustomerOTP(
    cardSerial: string,
    customerMobile: string,
    otpCode: string
  ): Promise<ApiResponse<{ hashed_code: string; card: NFCCard }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.post("/verify-customer-otp/", {
        card_serial: cardSerial,
        customer_mobile: customerMobile,
        otp_code: otpCode,
      });
      
      return {
        success: true,
        data: {
          hashed_code: response.data.hashed_code,
          card: response.data.card,
        },
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async verifyCustomerMobile(mobile: string): Promise<ApiResponse<Customer>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.get(
        `/verify-customer/${mobile}/`
      );
      
      // Transform backend response to Customer format
      const customerData = response.data;
      return {
        success: true,
        data: {
          id: customerData.id.toString(),
          mobile_number: customerData.mobile_number,
          name: customerData.name,
          email: customerData.email,
          status: customerData.status,
          fees_paid: customerData.fees_paid,
          is_registered: customerData.is_registered,
          can_assign_card: customerData.can_assign_card,
        } as any,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async sendCustomerOTP(
    mobile: string
  ): Promise<ApiResponse<{ message: string; customer_mobile: string }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.post("/send-customer-otp/", {
        customer_mobile: mobile,
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Card Inventory
  async getCards(status?: string, search?: string): Promise<ApiResponse<NFCCard[]>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      
      const queryString = params.toString();
      const url = `/cards/${queryString ? `?${queryString}` : ""}`;
      
      const response: AxiosResponse = await this.api.get(url);
      
      // Transform backend response to NFCCard format
      const cards = Array.isArray(response.data) ? response.data : [];
      const transformedCards = cards.map((card: any) => ({
        id: card.id.toString(),
        serial_number: card.serial_number,
        status: card.status,
        merchant_id: card.merchant?.toString(),
        customer_id: card.customer?.toString(),
        customer_name: card.customer_name,
        customer_mobile: card.customer_mobile,
        assigned_at: card.assigned_at,
        delivered_at: card.delivered_at,
        hashed_code: card.hashed_code,
        issue_date: card.issue_date,
        expiry_date: card.expiry_date,
        balance: typeof card.balance === 'number' ? card.balance : parseFloat(card.balance || 0),
        card_type: card.card_type,
        usage_count: typeof card.usage_count === 'number' ? card.usage_count : parseInt(card.usage_count || 0),
        last_used: card.last_used,
        created_at: card.created_at || new Date().toISOString(),
        updated_at: card.updated_at || new Date().toISOString(),
      }));
      
      return {
        success: true,
        data: transformedCards,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.get("/dashboard-stats/");
      
      // Transform backend response to DashboardStats format
      const stats = response.data;
      return {
        success: true,
        data: {
          available_cards: stats.available_cards || 0,
          delivered_cards: stats.delivered_cards || 0,
          assigned_cards: stats.assigned_cards || 0,
          total_cards: stats.total_cards || 0,
          recent_activity: (stats.recent_activity || []).map((activity: any) => ({
            card_serial: activity.card_serial || "",
            customer_name: activity.customer_name || "N/A",
            customer_mobile: activity.customer_mobile || "",
            assigned_at: activity.assigned_at || "",
            delivered_at: activity.delivered_at || null,
          })),
        },
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // User Settings
  async getSettings(): Promise<ApiResponse<Merchant>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.get("/settings/");
      
      // Transform backend response to Merchant format
      const merchant = response.data;
      return {
        success: true,
        data: {
          id: merchant.id?.toString() || "",
          name: merchant.business_name || "",
          address: merchant.address || "",
          gmaps_location: merchant.gmaps_location || "",
          mobile_number: merchant.mobile_number || "",
          contact_name: merchant.contact_name || merchant.owner_name || "",
          status: merchant.status || "active",
          created_at: merchant.registration_date || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateSettings(settings: Partial<Merchant>): Promise<ApiResponse<Merchant>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      // Transform frontend format to backend format
      const backendData: any = {};
      if (settings.name) backendData.business_name = settings.name;
      if (settings.address) backendData.address = settings.address;
      if (settings.gmaps_location) backendData.gmaps_location = settings.gmaps_location;
      if (settings.contact_name) backendData.contact_name = settings.contact_name;
      
      const response: AxiosResponse = await this.api.put("/settings/", backendData);
      
      // Transform backend response to Merchant format
      const merchant = response.data;
      return {
        success: true,
        data: {
          id: merchant.id?.toString() || "",
          name: merchant.business_name || "",
          address: merchant.address || "",
          gmaps_location: merchant.gmaps_location || "",
          mobile_number: merchant.mobile_number || "",
          contact_name: merchant.contact_name || merchant.owner_name || "",
          status: merchant.status || "active",
          created_at: merchant.registration_date || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async changePassword(
    passwordChange: PasswordChange
  ): Promise<ApiResponse<{ message: string }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.post("/change-password/", {
        current_password: passwordChange.current_password,
        new_password: passwordChange.new_password,
        confirm_password: passwordChange.confirm_password,
      });
      
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async changeMobile(
    mobileChange: MobileChange
  ): Promise<ApiResponse<{ message: string; mobile: string }>> {
    // This method verifies OTP and changes mobile number
    return this.verifyMobileChange(mobileChange.new_mobile, mobileChange.otp);
  }

  async verifyMobileChange(
    newMobile: string,
    otpCode: string
  ): Promise<ApiResponse<{ message: string; mobile: string }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.post("/verify-mobile-change/", {
        new_mobile: newMobile,
        otp_code: otpCode,
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async sendMobileChangeOTP(
    newMobile: string
  ): Promise<ApiResponse<{ message: string; new_mobile: string }>> {
    if (!this.api) {
      throw new Error("API not initialized");
    }
    try {
      const response: AxiosResponse = await this.api.post("/change-mobile/", {
        new_mobile: newMobile,
      });
      
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    console.error("API Error:", error);
    console.error("Error Response:", error.response);
    console.error("Error Response Data:", error.response?.data);
    
    // Network error (no response from server)
    if (!error.response) {
      if (error.message === "Network Error" || error.code === "ERR_NETWORK") {
        return new Error("Network error. Please check your internet connection and try again.");
      }
      return new Error(error.message || "Network error. Please try again.");
    }
    
    // Log the full error response for debugging
    console.log("Full error response:", JSON.stringify(error.response?.data, null, 2));
    
    // Backend error format: { error: { code: '...', message: '...' } }
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      console.log("Error data extracted:", errorData);
      if (typeof errorData === 'object' && errorData.message) {
        return new Error(errorData.message);
      }
      if (typeof errorData === 'string') {
        return new Error(errorData);
      }
    }
    
    // Check for validation errors
    if (error.response?.data?.non_field_errors) {
      const nonFieldErrors = Array.isArray(error.response.data.non_field_errors) 
        ? error.response.data.non_field_errors.join(', ')
        : error.response.data.non_field_errors;
      return new Error(nonFieldErrors);
    }
    
    // Check for field-specific errors
    if (error.response?.data && typeof error.response.data === 'object') {
      const fieldErrors = Object.entries(error.response.data)
        .filter(([key]) => key !== 'error' && key !== 'message')
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.join(', ')}`;
          }
          return `${key}: ${value}`;
        });
      if (fieldErrors.length > 0) {
        return new Error(fieldErrors.join('; '));
      }
    }
    
    // Standard message field
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    
    // Status code based messages
    if (error.response?.status === 400) {
      return new Error("Invalid request. Please check your input and try again.");
    }
    if (error.response?.status === 401) {
      return new Error("Invalid credentials. Please check your mobile number and password.");
    }
    if (error.response?.status === 403) {
      return new Error("Access denied. Please contact support.");
    }
    if (error.response?.status === 404) {
      return new Error("Service not found. Please try again later.");
    }
    if (error.response?.status === 500) {
      return new Error("Server error. Please try again later.");
    }
    
    // Fallback to error message or default
    if (error.message) {
      return new Error(error.message);
    }
    
    return new Error("An unexpected error occurred. Please try again.");
  }
}

export const apiService = new ApiService();
export default apiService;
