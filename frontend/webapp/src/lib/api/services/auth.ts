import { apiClient, handleApiResponse, retryRequest } from "../config";
import {
  setSecureToken,
  setSecureRefreshToken,
  clearSecureAuth,
  getSecureToken,
  getSecureRefreshToken,
} from "../../secureStorage";
import {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  OtpLoginRequest,
  SendOtpRequest,
  SendOtpResponse,
  SignupRequest,
  SignupStartRequest,
  SignupStartResponse,
  SendMobileOtpRequest,
  SendMobileOtpResponse,
  VerifyMobileOtpRequest,
  VerifyMobileOtpResponse,
  SendEmailOtpRequest,
  SendEmailOtpResponse,
  VerifyEmailOtpRequest,
  VerifyEmailOtpResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  UploadProfileImageRequest,
  UploadProfileImageResponse,
  SaveOptionalInfoRequest,
  SaveOptionalInfoResponse,
  CompleteSignupRequest,
  CompleteSignupResponse,
  RefreshTokenResponse,
  LogoutResponse,
  LogoutAllResponse,
  GetCurrentUserResponse,
  PasswordResetOtpResponse,
  VerifyPasswordResetOtpResponse,
  ConfirmPasswordResetResponse,
} from "../types";

// Utility function to generate device fingerprint
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Device fingerprint", 2, 2);
  }

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
};

export class AuthService {
  /**
   * User registration - Step 1: Send OTP
   * POST /api/v1/users/register/
   */
  static async register(userData: {
    mobile_number: string;
    password: string;
    name: string;
    email: string;
    otp_delivery_method?: "sms" | "email";
  }): Promise<{ message: string; mobile_number: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        "/users/register/",
        userData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * User registration - Step 2: Verify OTP and complete registration
   * POST /api/v1/users/verify-otp/
   */
  static async verifyRegistrationOtp(data: {
    mobile_number: string;
    otp_code: string;
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        "/users/verify-otp/",
        data
      );
      const responseData = handleApiResponse(response);

      // Backend returns: { access: "...", refresh: "...", user: {...} }
      const authData: AuthResponse = {
        token: responseData.access,
        refreshToken: responseData.refresh,
        user: {
          id: responseData.user.id,
          name: responseData.user.name,
          email: responseData.user.email,
          phone: responseData.user.mobile_number || responseData.user.phone,
          CardActive: false,
          emergencyContact: "",
          emergencyContactName: "",
          bloodType: "",
          profileImage: "",
        },
      };

      // Store tokens securely
      if (authData.token) {
        await setSecureToken(authData.token);
      }
      if (authData.refreshToken) {
        await setSecureRefreshToken(authData.refreshToken);
      }

      return authData;
    });
  }

  /**
   * User login - Step 1: Send OTP
   * POST /api/v1/users/login/
   */
  static async login(credentials: {
    mobile_number: string;
    password: string;
  }): Promise<{ message: string; mobile_number: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        "/users/login/",
        credentials
      );
      return handleApiResponse(response);
    });
  }

  /**
   * User login - Step 2: Verify OTP and get tokens
   * POST /api/v1/users/verify-login-otp/
   */
  static async verifyLoginOtp(data: {
    mobile_number: string;
    otp_code: string;
  }): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        "/users/verify-login-otp/",
        data
      );
      const responseData = handleApiResponse(response);

      // Backend returns: { access: "...", refresh: "...", user: {...} }
      const authData: AuthResponse = {
        token: responseData.access,
        refreshToken: responseData.refresh,
        user: {
          id: responseData.user.id,
          name: responseData.user.name,
          email: responseData.user.email,
          phone: responseData.user.mobile_number || responseData.user.phone,
          CardActive: false,
          emergencyContact: "",
          emergencyContactName: "",
          bloodType: "",
          profileImage: "",
        },
      };

      // Store tokens securely
      if (authData.token) {
        await setSecureToken(authData.token);
      }
      if (authData.refreshToken) {
        await setSecureRefreshToken(authData.refreshToken);
      }

      return authData;
    });
  }

  /**
   * Helper method to create login request with device fingerprint
   */
  static createLoginRequest(login: string, password: string): LoginRequest {
    return {
      login,
      password,
      device_fingerprint: generateDeviceFingerprint(),
    };
  }

  /**
   * Send OTP for login (mobile or email)
   */
  static async sendLoginOtp(otpData: SendOtpRequest): Promise<SendOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<SendOtpResponse>>(
        "/auth/send-otp",
        otpData
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let otpResponse: SendOtpResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "...", expires_at: "..." } }
        otpResponse = data.data as SendOtpResponse;
      } else if ("message" in data) {
        // Direct structure: { message: "...", expires_at: "..." }
        otpResponse = data as unknown as SendOtpResponse;
      } else {
        // Fallback: try to extract from the response directly
        console.error("Unexpected Send OTP response structure:", data);
        throw new Error("Invalid response structure from Send OTP API");
      }

      return otpResponse;
    });
  }

  /**
   * Login with OTP verification
   */
  static async loginWithOtp(
    credentials: OtpLoginRequest
  ): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/login/otp",
        credentials
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let authData: AuthResponse;

      if (data.data && typeof data.data === "object" && "token" in data.data) {
        // Standard nested structure: { success: true, data: { token: "...", user: {...} } }
        authData = data.data as AuthResponse;
      } else if ("token" in data) {
        // Direct structure: { token: "...", user: {...} }
        authData = data as unknown as AuthResponse;
      } else if ("access_token" in data && "customer" in data) {
        // API structure: { customer: {...}, access_token: "...", refresh_token: "..." }
        const customerData = data.customer as any;
        authData = {
          token: data.access_token as string,
          user: {
            id: customerData.id,
            name: `${customerData.first_name} ${customerData.last_name}`,
            email: customerData.email,
            phone: customerData.mobile_number,
            CardActive:
              customerData.type === "vip" || customerData.status === "vip",
            emergencyContact: "",
            emergencyContactName: "",
            bloodType: "",
            profileImage: "",
          },
          refreshToken: (data as any).refresh_token,
        };
      } else {
        // Fallback: try to extract from the response directly
        console.error("Unexpected OTP login response structure:", data);
        throw new Error("Invalid response structure from OTP login API");
      }

      // Store tokens securely
      if (authData.token) {
        setSecureToken(authData.token);
      }
      if (authData.refreshToken) {
        setSecureRefreshToken(authData.refreshToken);
      }

      return authData;
    });
  }

  /**
   * Helper method to create OTP login request with device fingerprint
   */
  static createOtpLoginRequest(
    mobile: string | undefined,
    email: string | undefined,
    otpCode: string
  ): OtpLoginRequest {
    return {
      mobile,
      email,
      otp_code: otpCode,
      device_fingerprint: generateDeviceFingerprint(),
    };
  }

  /**
   * Start signup process - create pending customer
   * POST /api/v1/users/register/
   */
  static async signupStart(
    userData: SignupStartRequest
  ): Promise<SignupStartResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SignupStartResponse>(
        "/users/register/",
        userData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Send mobile OTP for signup verification
   */
  static async sendMobileOtp(
    otpData: SendMobileOtpRequest
  ): Promise<SendMobileOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SendMobileOtpResponse>(
        "/signup/otp/mobile/send",
        otpData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Verify mobile OTP for signup verification
   * POST /api/v1/users/verify-otp/
   */
  static async verifyMobileOtp(
    otpData: VerifyMobileOtpRequest
  ): Promise<VerifyMobileOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<VerifyMobileOtpResponse>(
        "/users/verify-otp/",
        {
          mobile_number: otpData.mobile_number,
          otp_code: otpData.otp_code,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Send email OTP for signup verification
   * POST /api/v1/users/send-email-otp/
   */
  static async sendEmailOtp(
    otpData: SendEmailOtpRequest
  ): Promise<SendEmailOtpResponse> {
    return retryRequest(async () => {
      // signup_id is actually the mobile_number string, not an integer
      // Use mobile_number if provided, otherwise use signup_id as string
      const mobile_number = otpData.mobile_number || String(otpData.signup_id);
      
      const response = await apiClient.post<SendEmailOtpResponse>(
        "/users/send-email-otp/",
        {
          mobile_number: mobile_number,
          email: otpData.email,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Verify email OTP for signup verification
   * POST /api/v1/users/verify-email-otp/
   */
  static async verifyEmailOtp(
    otpData: VerifyEmailOtpRequest
  ): Promise<VerifyEmailOtpResponse> {
    return retryRequest(async () => {
      // signup_id is actually the mobile_number string, not an integer
      // Use mobile_number if provided, otherwise use signup_id as string
      const mobile_number = otpData.mobile_number || String(otpData.signup_id);
      
      const response = await apiClient.post<VerifyEmailOtpResponse>(
        "/users/verify-email-otp/",
        {
          mobile_number: mobile_number,
          email: otpData.email,
          otp_code: otpData.otp_code,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Set password during signup (stores in cache, doesn't create account)
   * POST /api/v1/users/set-password/
   */
  static async setPassword(
    passwordData: SetPasswordRequest
  ): Promise<SetPasswordResponse> {
    return retryRequest(async () => {
      // Backend expects mobile_number and password
      // signup_id is the mobile_number in our case
      const mobile_number = passwordData.mobile_number || passwordData.signup_id?.toString() || "";
      const response = await apiClient.post<SetPasswordResponse>(
        "/users/set-password/",
        {
          mobile_number: mobile_number,
          password: passwordData.password,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Upload profile image for signup account
   */
  static async uploadProfileImage(
    imageData: UploadProfileImageRequest
  ): Promise<UploadProfileImageResponse> {
    return retryRequest(async () => {
      const formData = new FormData();
      // signup_id is mobile_number (string), ensure it's sent as string
      formData.append("signup_id", String(imageData.signup_id));
      formData.append("file", imageData.file);

      const response = await apiClient.post<UploadProfileImageResponse>(
        "/signup/profile-image/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Save optional information for signup account
   */
  static async saveOptionalInfo(
    optionalData: SaveOptionalInfoRequest
  ): Promise<SaveOptionalInfoResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<SaveOptionalInfoResponse>(
        "/users/save-optional-info/",
        optionalData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Complete signup and activate account
   */
  static async completeSignup(
    signupData: CompleteSignupRequest
  ): Promise<CompleteSignupResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<CompleteSignupResponse>(
        "/users/complete-registration/",
        signupData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * User signup
   */
  static async signup(userData: SignupRequest): Promise<AuthResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/signup",
        userData
      );
      const data = handleApiResponse(response);

      // Store tokens securely
      if (data.data.token) {
        setSecureToken(data.data.token);
      }
      if (data.data.refreshToken) {
        setSecureRefreshToken(data.data.refreshToken);
      }

      return data.data;
    });
  }

  /**
   * Refresh access token using the API specification
   * POST /auth/refresh with refresh_token in body
   */
  static async refreshToken(
    refreshToken: string
  ): Promise<RefreshTokenResponse> {
    // Validate refresh token format before making the request
    if (!this.isValidRefreshToken(refreshToken)) {
      throw new Error("Invalid refresh token format");
    }

    return retryRequest(async () => {
      try {
        const response = await apiClient.post<
          ApiResponse<RefreshTokenResponse>
        >("/auth/refresh", {
          refresh: refreshToken, // TokenRefreshView expects 'refresh' not 'refresh_token'
        });
        const data = handleApiResponse(response);

        // Handle the API response structure according to spec: { access_token: string, expires_at: string }
        let refreshResponse: RefreshTokenResponse;

        if (data.data && data.data.access_token && data.data.expires_at) {
          // Nested structure: { success: true, data: { access_token: "...", expires_at: "..." } }
          refreshResponse = data.data as RefreshTokenResponse;
        } else if ((data as any).access_token && (data as any).expires_at) {
          // Direct structure: { access_token: "...", expires_at: "..." }
          refreshResponse = data as unknown as RefreshTokenResponse;
        } else {
          console.error("Unexpected refresh token response structure:", data);
          throw new Error("Invalid response structure from refresh token API");
        }

        // Validate response structure according to API spec
        if (!refreshResponse.access_token || !refreshResponse.expires_at) {
          throw new Error("Missing required fields in refresh token response");
        }

        // Update stored access token
        if (refreshResponse.access_token) {
          setSecureToken(refreshResponse.access_token);
        }

        return refreshResponse;
      } catch (error: any) {
        // Handle specific HTTP status codes from the API specification
        if (error.status === 401) {
          throw new Error("Refresh token is invalid or expired");
        } else if (error.status === 422) {
          throw new Error(
            "Invalid refresh token format or missing required field"
          );
        } else {
          throw error;
        }
      }
    });
  }

  /**
   * User logout - invalidate tokens on server
   */
  static async logout(): Promise<LogoutResponse> {
    try {
      const response = await apiClient.post<ApiResponse<LogoutResponse>>(
        "/auth/logout",
        {}
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let logoutResponse: LogoutResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "..." } }
        logoutResponse = data.data as LogoutResponse;
      } else if ("message" in data) {
        // Direct structure: { message: "..." }
        logoutResponse = data as unknown as LogoutResponse;
      } else {
        // Fallback: use default message
        console.warn("Unexpected logout response structure:", data);
        logoutResponse = { message: "Logged out successfully" };
      }

      return logoutResponse;
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout API call failed:", error);
      // Return a default response to maintain consistency
      return { message: "Logged out successfully" };
    } finally {
      // Clear secure storage regardless of API call result
      clearSecureAuth();
    }
  }

  /**
   * Logout from all devices - invalidate all sessions
   */
  static async logoutAll(): Promise<LogoutAllResponse> {
    try {
      const response = await apiClient.post<ApiResponse<LogoutAllResponse>>(
        "/auth/logout-all",
        {}
      );
      const data = handleApiResponse(response);

      // Handle different possible response structures
      let logoutAllResponse: LogoutAllResponse;

      if (
        data.data &&
        typeof data.data === "object" &&
        "message" in data.data
      ) {
        // Standard nested structure: { success: true, data: { message: "..." } }
        logoutAllResponse = data.data as LogoutAllResponse;
      } else if ("message" in data) {
        // Direct structure: { message: "..." }
        logoutAllResponse = data as unknown as LogoutAllResponse;
      } else {
        // Fallback: use default message
        console.warn("Unexpected logout all response structure:", data);
        logoutAllResponse = {
          message: "Logged out from all devices successfully",
        };
      }

      return logoutAllResponse;
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn("Logout all API call failed:", error);
      // Return a default response to maintain consistency
      return { message: "Logged out from all devices locally" };
    } finally {
      // Clear secure storage regardless of API call result
      clearSecureAuth();
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/users/me/
   */
  static async getCurrentUser(): Promise<GetCurrentUserResponse> {
    return retryRequest(async () => {
      const response = await apiClient.get("/users/me/");
      const data = handleApiResponse(response);

      // Backend returns user data directly
      // Transform to match GetCurrentUserResponse format
      const userResponse: GetCurrentUserResponse = {
        customer: {
          id: data.id,
          first_name: data.name?.split(' ')[0] || '',
          last_name: data.name?.split(' ').slice(1).join(' ') || '',
          mobile_number: data.mobile_number || data.phone || '',
          email: data.email || '',
          profile_image_id: data.profile_image_id || '',
          profile_image: data.profile_image || '', // Full URL from backend
          type: data.type || 'regular',
          status: data.status || 'active',
          created_at: data.created_at || data.registration_date || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_mobile: data.emergency_contact_mobile || '',
          blood_type: data.blood_type || '',
          labels: data.labels || [], // Customer labels
        },
      };

      return userResponse;
    });
  }

  /**
   * Update user profile
   * PUT /api/v1/users/profile/
   */
  static async updateProfile(profileData: {
    name?: string;
    email?: string;
    phone?: string;
  }): Promise<any> {
    return retryRequest(async () => {
      const response = await apiClient.put("/users/profile/", profileData);
      return handleApiResponse(response);
    });
  }

  /**
   * Request password reset OTP
   * POST /api/v1/users/forgot-password/request-otp/
   */
  static async requestPasswordResetOtp(data: {
    mobile_number: string;
  }): Promise<{ message: string; mobile_number: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        "/users/forgot-password/request-otp/",
        data
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Reset password with OTP
   * POST /api/v1/users/reset-password/
   */
  static async resetPassword(data: {
    mobile_number: string;
    otp_code: string;
    new_password: string;
  }): Promise<{ message: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/reset-password/", data);
      return handleApiResponse(response);
    });
  }

  /**
   * Verify email
   */
  static async verifyEmail(
    token: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/verify-email",
        {
          token,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Resend verification email
   */
  static async resendVerificationEmail(
    email: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/resend-verification",
        {
          email,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Change password
   */
  static async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        "/auth/change-password",
        {
          oldPassword,
          newPassword,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const token = await getSecureToken();
    const refreshToken = await getSecureRefreshToken();

    if (!token || !refreshToken) {
      return false;
    }

    // Check if access token is expired
    if (this.isTokenExpired(token)) {
      return false;
    }

    return true;
  }

  /**
   * Get stored auth token
   */
  static async getAuthToken(): Promise<string | null> {
    return await getSecureToken();
  }

  /**
   * Get stored refresh token
   */
  static async getRefreshToken(): Promise<string | null> {
    return await getSecureRefreshToken();
  }

  /**
   * Clear all auth data
   */
  static clearAuthData(): void {
    clearSecureAuth();
  }

  /**
   * Check if access token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      // Validate token format
      if (
        !token ||
        typeof token !== "string" ||
        token.split(".").length !== 3
      ) {
        return true;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // Add 30 second buffer to refresh token before it actually expires
      const bufferTime = 30; // 30 seconds
      const isExpired = payload.exp < currentTime + bufferTime;

      return isExpired;
    } catch (error) {
      console.warn("Error parsing token:", error);
      return true; // If we can't parse the token, consider it expired
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return new Date(payload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Debug token information
   */
  static debugTokenInfo(token: string, tokenType: string = "token"): void {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;

      console.log(`${tokenType} debug info:`, {
        issuedAt: new Date(payload.iat * 1000).toISOString(),
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        currentTime: new Date(currentTime * 1000).toISOString(),
        timeUntilExpiry: timeUntilExpiry,
        timeUntilExpiryMinutes: Math.floor(timeUntilExpiry / 60),
        isExpired: timeUntilExpiry < 0,
        tokenPreview: token.substring(0, 20) + "...",
      });
    } catch (error) {
      console.warn(`Error parsing ${tokenType}:`, error);
    }
  }

  /**
   * Validate refresh token format
   */
  static isValidRefreshToken(token: string): boolean {
    try {
      if (!token || typeof token !== "string") {
        return false;
      }

      // Check if it's a JWT token (3 parts separated by dots)
      if (token.split(".").length !== 3) {
        return false;
      }

      // Try to parse the payload
      const payload = JSON.parse(atob(token.split(".")[1]));

      // Check if it has required fields
      return payload && typeof payload === "object" && payload.exp;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate JWT token format and content (conservative approach)
   */
  static validateToken(token: string): {
    isValid: boolean;
    payload?: any;
    error?: string;
  } {
    try {
      if (!token || typeof token !== "string") {
        return { isValid: false, error: "Token is not a string" };
      }

      // Check if it's a JWT token (3 parts separated by dots)
      const parts = token.split(".");
      if (parts.length !== 3) {
        return { isValid: false, error: "Token is not a valid JWT format" };
      }

      // Try to parse the payload
      const payload = JSON.parse(atob(parts[1]));

      // Check if it has required fields - only fail for critical missing fields
      if (!payload || typeof payload !== "object") {
        return { isValid: false, error: "Token payload is not an object" };
      }

      // Only require user ID (sub) - expiration can be handled by the server
      if (!payload.sub) {
        return { isValid: false, error: "Token missing user ID (sub)" };
      }

      // Don't require expiration field - let the server handle it
      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error: `Token parsing error: ${error}` };
    }
  }

  /**
   * Check if refresh token is expired
   */
  static isRefreshTokenExpired(token: string): boolean {
    try {
      // Validate token format first
      if (!this.isValidRefreshToken(token)) {
        console.warn("Invalid refresh token format");
        return true;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      // Add 30 second buffer to refresh token before it actually expires
      const bufferTime = 30; // 30 seconds
      const isExpired = payload.exp < currentTime + bufferTime;

      return isExpired;
    } catch (error) {
      console.warn("Error parsing refresh token:", error);
      return true; // If we can't parse the token, consider it expired
    }
  }


  /**
   * Verify OTP for password reset
   */
  static async verifyPasswordResetOtp(
    mobileNumber: string,
    otpCode: string
  ): Promise<VerifyPasswordResetOtpResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<
        ApiResponse<VerifyPasswordResetOtpResponse>
      >("/users/forgot-password/verify-otp/", {
        mobile_number: mobileNumber,
        otp_code: otpCode,
      });
      const data = handleApiResponse(response);

      // Debug logging to help identify response structure
      console.log("Password reset OTP verification API response:", {
        status: response.status,
        data: data,
        dataType: typeof data,
        hasData: !!data,
        hasDataData: !!(data && data.data),
        dataKeys: data ? Object.keys(data) : [],
        dataDataKeys: data && data.data ? Object.keys(data.data) : [],
      });

      // Handle different possible response structures
      let verifyResponse: VerifyPasswordResetOtpResponse;

      if (
        data &&
        data.data &&
        typeof data.data === "object" &&
        "password_reset_token" in data.data
      ) {
        // Standard nested structure: { success: true, data: { password_reset_token: "...", expires_in_seconds: ... } }
        verifyResponse = data.data as VerifyPasswordResetOtpResponse;
      } else if (data && "password_reset_token" in data) {
        // Direct structure: { password_reset_token: "...", expires_in_seconds: ... }
        verifyResponse = data as unknown as VerifyPasswordResetOtpResponse;
      } else {
        // Fallback: throw error for invalid response
        console.error(
          "Unexpected password reset OTP verification response structure:",
          data
        );
        throw new Error(
          "Invalid response structure from password reset OTP verification API"
        );
      }

      return verifyResponse;
    });
  }

  /**
   * Confirm password reset with new password
   * POST /api/v1/users/reset-password/
   */
  static async confirmPasswordReset(
    mobile_number: string,
    otp_code: string,
    new_password: string
  ): Promise<ConfirmPasswordResetResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/reset-password/", {
        mobile_number,
        otp_code,
        new_password,
      });
      const data = handleApiResponse(response);
      
      // Transform response to include message
      const confirmResponse: ConfirmPasswordResetResponse = {
        message: data.message || "Password reset successfully",
      };
      
      return confirmResponse;
    });
  }

  /**
   * Send OTP to current mobile number for verification
   * POST /api/v1/users/change-mobile/send-current-otp/
   */
  static async sendCurrentMobileOtp(): Promise<{ message: string; mobile_number: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/change-mobile/send-current-otp/", {});
      return handleApiResponse(response);
    });
  }

  /**
   * Send OTP to new mobile number for mobile change
   * POST /api/v1/users/change-mobile/send-new-otp/
   */
  static async sendNewMobileOtp(new_mobile: string): Promise<{ message: string; new_mobile: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/change-mobile/send-new-otp/", {
        new_mobile,
      });
      return handleApiResponse(response);
    });
  }

  /**
   * Verify OTPs and change mobile number
   * POST /api/v1/users/change-mobile/verify/
   */
  static async verifyAndChangeMobile(
    current_mobile_otp: string,
    new_mobile: string,
    new_mobile_otp: string
  ): Promise<{ message: string; mobile_number: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/change-mobile/verify/", {
        current_mobile_otp,
        new_mobile,
        new_mobile_otp,
      });
      return handleApiResponse(response);
    });
  }

  /**
   * Send OTP to current email address for verification
   * POST /api/v1/users/change-email/send-current-otp/
   */
  static async sendCurrentEmailOtp(): Promise<{ message: string; email: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/change-email/send-current-otp/", {});
      return handleApiResponse(response);
    });
  }

  /**
   * Send OTP to new email address for email change
   * POST /api/v1/users/change-email/send-new-otp/
   */
  static async sendNewEmailOtp(new_email: string): Promise<{ message: string; new_email: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/change-email/send-new-otp/", {
        new_email,
      });
      return handleApiResponse(response);
    });
  }

  /**
   * Verify OTPs and change email address
   * POST /api/v1/users/change-email/verify/
   */
  static async verifyAndChangeEmail(
    current_email_otp: string,
    new_email: string,
    new_email_otp: string
  ): Promise<{ message: string; email: string }> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/change-email/verify/", {
        current_email_otp,
        new_email,
        new_email_otp,
      });
      return handleApiResponse(response);
    });
  }

  /**
   * Validate registration token for ticket assignment
   * GET /api/v1/users/validate-registration-token/?token={token}
   */
  static async validateRegistrationToken(
    token: string
  ): Promise<{
    valid: boolean;
    user_already_registered?: boolean;
    auto_login?: boolean;
    access?: string;
    refresh?: string;
    user?: any;
    phone_number?: string;
    ticket_id?: string;
    event_name?: string;
    purchaser_name?: string;
    ticket_number?: string;
    category?: string;
    message?: string;
    error?: { code: string; message: string };
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get(
        `/users/validate-registration-token/?token=${encodeURIComponent(token)}`
      );
      return handleApiResponse(response);
    });
  }
}
