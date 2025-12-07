import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "@/components/ui/use-toast";
import { parseISO, isAfter, compareAsc } from "date-fns";
import { useTranslation } from "react-i18next";
import { AuthService } from "@/lib/api/services/auth";
import {
  setSecureUserData,
  getSecureUserData,
  clearSecureAuth,
} from "@/lib/secureStorage";
import { ValidationService } from "@/lib/validation";
import { tokenManager } from "@/lib/tokenManager";
import { normalizeImageUrl } from "@/lib/utils";

interface AuthProviderProps {
  children: ReactNode;
}
interface BookedEvent {
  title: string;
  date: string;
  time: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  profile_image_id: string;
  profile_image?: string; // Full URL from backend
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  name?: string;
  isVip?: boolean;
  vipCardNumber?: string;
  vipExpiryDate?: string;
  // Profile fields
  emergency_contact_name?: string;
  emergency_contact_mobile?: string;
  blood_type?: string;
  labels?: string[]; // Customer labels (e.g., "VIP", "Black Card Customer")
}

type AuthContextType = {
  isLoginOpen: boolean;
  isSignupOpen: boolean;
  openLogin: () => void;
  openSignup: () => void;
  closeLogin: () => void;
  closeSignup: () => void;
  switchToSignup: () => void;
  switchToLogin: () => void;
  login: (userData: User) => void;
  loginWithCredentials: (login: string, password: string) => Promise<void>;
  verifyLoginOtp: (mobile_number: string, otp_code: string) => Promise<void>;
  sendLoginOtp: (mobile?: string, email?: string) => Promise<void>;
  loginWithOtp: (
    mobile: string | undefined,
    email: string | undefined,
    otpCode: string
  ) => Promise<void>;
  requestPasswordResetOtp: (mobileNumber: string) => Promise<void>;
  verifyPasswordResetOtp: (
    mobileNumber: string,
    otpCode: string
  ) => Promise<{ password_reset_token: string; expires_in_seconds: number }>;
  confirmPasswordReset: (
    mobile_number: string,
    otp_code: string,
    new_password: string
  ) => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  user: User | null;
  isVip: boolean;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useTranslation();

  // Initialize user from secure storage on app start
  useEffect(() => {
    const initializeUser = async () => {
      console.log("Initializing user from secure storage...");

      // Check if we have valid tokens first
      const isAuthenticated = await tokenManager.isAuthenticated();
      console.log("User authentication status on init:", isAuthenticated);

      if (isAuthenticated) {
        // Always fetch fresh user data from API to ensure labels and other data are up-to-date
        // This prevents stale cached data (e.g., old Black Card labels) from persisting
        console.log("User authenticated, fetching fresh user data from API...");
        try {
          await getCurrentUser();
        } catch (error) {
          console.error("Failed to fetch current user:", error);
          // Fallback to stored data if API call fails
          const storedUser = await getSecureUserData();
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              console.log("Using stored user data as fallback:", userData.id);
              setUser(userData);
            } catch (parseError) {
              console.error("Error parsing stored user data:", parseError);
              clearSecureAuth();
            }
          } else {
            clearSecureAuth();
          }
        }
      } else {
        console.log("No valid authentication found, user will need to login");
        // Clear any stale data
        clearSecureAuth();
      }
    };

    initializeUser();

    // Listen for logout-all events from other tabs
    let logoutChannel: BroadcastChannel | null = null;
    try {
      logoutChannel = new BroadcastChannel('auth-logout');
      logoutChannel.onmessage = (event) => {
        if (event.data.type === 'logout-all') {
          console.log("Received logout-all broadcast from another tab");
          clearSecureAuth();
          setUser(null);
        }
      };
    } catch (error) {
      console.warn("BroadcastChannel not supported, using storage event fallback");
      // Fallback: listen for storage events
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'logout-all') {
          console.log("Received logout-all event from another tab");
          clearSecureAuth();
          setUser(null);
        }
      };
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        if (logoutChannel) {
          logoutChannel.close();
        }
      };
    }

    return () => {
      if (logoutChannel) {
        logoutChannel.close();
      }
    };
  }, []);

  // Listen for auth-required events from API errors
  useEffect(() => {
    const handleAuthRequired = (event: CustomEvent) => {
      console.log("Auth required event received:", event.detail?.reason);

      // Clear user state and show login
      setUser(null);
      clearSecureAuth();
      setIsLoginOpen(true);

      toast({
        title: t("auth.authenticationRequired"),
        description: t("auth.authenticationRequiredMessage"),
        variant: "destructive",
      });
    };

    // Remove duplicate token refresh logic - let API interceptor handle it
    // const handleTokenRefreshRequired = async (event: Event) => {
    //   // This is now handled by the API interceptor to avoid race conditions
    // };

    window.addEventListener(
      "auth-required",
      handleAuthRequired as EventListener
    );
    // Removed token-refresh-required listener to avoid race conditions

    return () => {
      window.removeEventListener(
        "auth-required",
        handleAuthRequired as EventListener
      );
      // Removed token-refresh-required cleanup
    };
  }, [t]);

  // Initialize token manager and check authentication status
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is authenticated using token manager
        if (user && !(await tokenManager.isAuthenticated())) {
          console.log("User exists but not authenticated, clearing session");
          clearSecureAuth();
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // Only clear auth if it's a genuine authentication error
        if (error instanceof Error && error.message.includes("expired")) {
          clearSecureAuth();
          setUser(null);
        }
      }
    };

    // Only run auth check once on mount, not on every user change
    if (user) {
      initializeAuth();
    }
  }, []); // Remove user dependency to prevent loops

  const login = async (userData: User) => {
    await setSecureUserData(JSON.stringify(userData));
    setUser(userData);
    checkNextUpcomingEvent();
  };

  const loginWithCredentials = async (
    loginIdentifier: string,
    password: string
  ) => {
    setIsLoading(true);
    try {
      // Sanitize inputs
      const sanitizedLogin = ValidationService.sanitizeInput(loginIdentifier);
      const sanitizedPassword = ValidationService.sanitizeInput(password);

      if (!sanitizedLogin || !sanitizedPassword) {
        throw new Error(t("auth.invalidInput"));
      }

      // Backend expects mobile_number and password
      // Step 1: Send login request (this sends OTP, doesn't return user data yet)
      const response = await AuthService.login({
        mobile_number: sanitizedLogin,
        password: sanitizedPassword,
      });

      // The login endpoint only sends OTP and returns { message, mobile_number }
      // We need to trigger OTP verification step
      // Store mobile_number for OTP verification and throw a special error
      // to signal the UI to show OTP input form
      const otpRequiredError: any = new Error("OTP_REQUIRED");
      otpRequiredError.otpRequired = true;
      otpRequiredError.mobile_number = sanitizedLogin;
      otpRequiredError.message = response.message || t("auth.otpSentDescription");
      throw otpRequiredError;
    } catch (error: any) {
      // Check if this is an OTP required error (from password login)
      if (error.otpRequired) {
        // Re-throw so the UI can handle showing OTP form
        throw error;
      }

      console.error("Login error:", error);

      // Extract error message properly - handle both string and object formats
      let errorMessage = t("auth.loginErrorMessage");
      let errorTitle = t("auth.loginError");

      // Handle error message extraction
      if (typeof error.message === "string") {
        errorMessage = error.message;
      } else if (typeof error.message === "object" && error.message !== null) {
        // If message is an object (like serializer.errors), extract the first error
        const errorKeys = Object.keys(error.message);
        if (errorKeys.length > 0) {
          const firstKey = errorKeys[0];
          const firstError = error.message[firstKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0];
          } else if (typeof firstError === "string") {
            errorMessage = firstError;
          } else {
            errorMessage = JSON.stringify(error.message);
          }
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      }

      // Check for banned account error code first
      const errorCode = error.response?.data?.error?.code || error.response?.data?.code;
      if (errorCode === "ACCOUNT_BANNED" || errorCode === "account_banned") {
        errorTitle = t("auth.accountBanned") || "Account Banned";
        errorMessage = error.response?.data?.error?.message || 
                      error.response?.data?.message || 
                      "Your account has been banned. Please contact support for more information.";
      }
      // Handle specific error types
      else if (error.status === 429) {
        errorTitle = t("auth.rateLimitError");
        errorMessage = t("auth.rateLimitMessage");

        setTimeout(() => {
          toast({
            title: t("auth.tryOtpLogin"),
            description: t("auth.otpLoginSuggestion"),
            variant: "default",
          });
        }, 2000);
      } else if (error.status === 401) {
        // Only show generic invalid credentials if not already handled (e.g., banned)
        if (!errorCode || (errorCode !== "ACCOUNT_BANNED" && errorCode !== "account_banned")) {
          errorTitle = t("auth.invalidCredentials");
          errorMessage = errorMessage || t("auth.invalidCredentialsMessage");
        }
      } else if (error.status === 403) {
        errorTitle = t("auth.accountBlocked");
        errorMessage = errorMessage || t("auth.accountBlockedMessage");
      } else if (error.status === 400) {
        // 400 Bad Request - validation errors
        errorTitle = t("auth.loginError");
        // errorMessage already extracted above
      } else if (error.status >= 500) {
        errorTitle = t("auth.serverError");
        // Show more specific error messages for 500 errors
        const messageStr = String(errorMessage);
        if (
          messageStr.includes("property") &&
          messageStr.includes("null")
        ) {
          errorMessage = t("auth.dataSyncError");
        } else if (
          messageStr.includes("database") ||
          messageStr.includes("connection")
        ) {
          errorMessage = t("auth.serverUnavailableError");
        } else {
          errorMessage = t("auth.genericServerError");
        }
      } else if (
        typeof errorMessage === "string" &&
        errorMessage.includes("Invalid response structure")
      ) {
        errorTitle = t("auth.apiError");
        errorMessage = t("auth.apiErrorMessage");
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendLoginOtp = async (mobile?: string, email?: string) => {
    setIsLoading(true);
    try {
      if (!mobile && !email) {
        throw new Error(t("auth.provideContactInfo"));
      }

      const response = await AuthService.sendLoginOtp({ mobile, email });

      // Format the expiration time for display
      const expiresAt = new Date(response.expires_at).toLocaleString();

      toast({
        title: t("auth.otpSent"),
        description: `${t("auth.otpSentDescription")} ${t("auth.otpExpiresAt", {
          time: expiresAt,
        })}`,
      });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      toast({
        title: t("auth.otpSendError"),
        description: error.message || t("auth.otpSendErrorMessage"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOtp = async (
    mobile: string | undefined,
    email: string | undefined,
    otpCode: string
  ) => {
    setIsLoading(true);
    try {
      if (!mobile && !email) {
        throw new Error(t("auth.provideContactInfo"));
      }

      // Sanitize inputs
      const sanitizedMobile = mobile
        ? ValidationService.sanitizeInput(mobile)
        : undefined;
      const sanitizedEmail = email
        ? ValidationService.sanitizeInput(email)
        : undefined;
      const sanitizedOtp = ValidationService.sanitizeInput(otpCode);

      if (!sanitizedOtp) {
        throw new Error(t("auth.invalidOtp"));
      }

      const otpRequest = AuthService.createOtpLoginRequest(
        sanitizedMobile,
        sanitizedEmail,
        sanitizedOtp
      );
      const response = await AuthService.loginWithOtp(otpRequest);

      // Note: Tokens are already stored by AuthService.loginWithOtp()
      // No need to store them again here to avoid duplication

      // Convert API user data to local User format
      const customer = (response as any).customer || response.user;
      const customerName =
        customer.name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

      const userData: User = {
        id: customer.id,
        first_name: customer.first_name || customer.name?.split(" ")[0] || "",
        last_name:
          customer.last_name ||
          customer.name?.split(" ").slice(1).join(" ") ||
          "",
        mobile_number: customer.mobile_number || customer.phone || "",
        email: customer.email,
        profile_image_id:
          customer.profile_image_id || customer.profileImage || "",
        profile_image: customer.profile_image || customer.profileImage || "",
        type:
          customer.type === "vip" ||
          customer.status === "vip" ||
          customer.CardActive
            ? "vip"
            : "regular",
        status: customer.status || "active",
        created_at: customer.created_at || new Date().toISOString(),
        updated_at: customer.updated_at || new Date().toISOString(),
        // Legacy fields for backward compatibility
        name: customerName,
        isVip:
          customer.type === "vip" ||
          customer.status === "vip" ||
          customer.CardActive ||
          false,
        vipCardNumber: undefined,
        vipExpiryDate: undefined,
        labels: customer.labels || [], // Customer labels (e.g., "Black Card Customer")
      };

      login(userData);

      toast({
        title: t("auth.loginSuccess"),
        description: t("auth.welcomeBack", { name: userData.name }),
      });
    } catch (error: any) {
      console.error("OTP login error:", error);
      toast({
        title: t("auth.otpLoginError"),
        description: error.message || t("auth.otpLoginErrorMessage"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyLoginOtp = async (mobile_number: string, otp_code: string) => {
    setIsLoading(true);
    try {
      // Verify login OTP and get tokens - tokens are stored by AuthService
      const response = await AuthService.verifyLoginOtp({
        mobile_number,
        otp_code,
      });

      // Convert API user data to local User format
      const customer = (response as any).user || response.customer;
      if (!customer) {
        throw new Error("User data not found in response");
      }

      const customerName =
        customer.name ||
        `${customer.first_name || ""} ${customer.last_name || ""}`.trim();

      const userData: User = {
        id: customer.id,
        first_name: customer.first_name || customer.name?.split(" ")[0] || "",
        last_name:
          customer.last_name ||
          customer.name?.split(" ").slice(1).join(" ") ||
          "",
        mobile_number: customer.mobile_number || customer.phone || "",
        email: customer.email,
        profile_image_id:
          customer.profile_image_id || customer.profileImage || "",
        profile_image: customer.profile_image || customer.profileImage || "",
        type:
          customer.type === "vip" ||
          customer.status === "vip" ||
          customer.CardActive
            ? "vip"
            : "regular",
        status: customer.status || "active",
        created_at: customer.created_at || new Date().toISOString(),
        updated_at: customer.updated_at || new Date().toISOString(),
        // Legacy fields for backward compatibility
        name: customerName,
        isVip:
          customer.type === "vip" ||
          customer.status === "vip" ||
          customer.CardActive ||
          false,
        vipCardNumber: undefined,
        vipExpiryDate: undefined,
      };

      // Set user - this signs them in
      await login(userData);

      toast({
        title: t("auth.loginSuccess"),
        description: t("auth.welcomeBack", { name: userData.name }),
      });
    } catch (error: any) {
      console.error("OTP verification error:", error);
      
      // Check for banned account error code
      const errorCode = error.response?.data?.error?.code || error.response?.data?.code;
      if (errorCode === "ACCOUNT_BANNED" || errorCode === "account_banned") {
        const errorMessage = error.response?.data?.error?.message || 
                            error.response?.data?.message || 
                            "Your account has been banned. Please contact support for more information.";
        toast({
          title: t("auth.accountBanned") || "Account Banned",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      }
      
      // Handle other errors
      toast({
        title: t("auth.otpLoginError"),
        description: error.response?.data?.error?.message || 
                    error.response?.data?.message || 
                    error.message || 
                    t("auth.otpLoginErrorMessage"),
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordResetOtp = async (mobileNumber: string) => {
    setIsLoading(true);
    try {
      if (!mobileNumber) {
        throw new Error(t("auth.provideMobileNumber"));
      }

      const response = await AuthService.requestPasswordResetOtp({
        mobile_number: mobileNumber,
      });

      // Ensure response exists and has a message property
      const message =
        response?.message || t("auth.passwordResetOtpSentDescription");

      toast({
        title: t("auth.passwordResetOtpSent"),
        description: message,
      });
    } catch (error: any) {
      console.error("Password reset OTP request error:", error);

      // Safely extract error message
      const errorMessage =
        error?.message || t("auth.passwordResetOtpErrorMessage");

      toast({
        title: t("auth.passwordResetOtpError"),
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPasswordResetOtp = async (
    mobileNumber: string,
    otpCode: string
  ) => {
    setIsLoading(true);
    try {
      if (!mobileNumber || !otpCode) {
        throw new Error(t("auth.provideMobileAndOtp"));
      }

      const response = await AuthService.verifyPasswordResetOtp(
        mobileNumber,
        otpCode
      );

      // Safely extract response properties with fallbacks
      const expiresInSeconds = response?.expires_in_seconds || 300; // Default to 5 minutes
      const passwordResetToken = response?.password_reset_token;

      if (!passwordResetToken) {
        throw new Error("Password reset token not received from server");
      }

      toast({
        title: t("auth.passwordResetOtpVerified"),
        description: t("auth.passwordResetOtpVerifiedDescription", {
          expiresIn: Math.floor(expiresInSeconds / 60),
        }),
      });

      return {
        password_reset_token: passwordResetToken,
        expires_in_seconds: expiresInSeconds,
      };
    } catch (error: any) {
      console.error("Password reset OTP verification error:", error);

      // Safely extract error message from various error formats
      let errorMessage = t("auth.passwordResetOtpVerificationErrorMessage");
      
      if (error?.response?.data?.error?.message) {
        // Backend error format: { error: { message: "..." } }
        errorMessage = error.response.data.error.message;
      } else if (error?.response?.data?.message) {
        // Direct message format: { message: "..." }
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        // Error object with message property
        errorMessage = error.message;
      }

      toast({
        title: t("auth.passwordResetOtpVerificationError"),
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPasswordReset = async (
    mobile_number: string,
    otp_code: string,
    new_password: string
  ) => {
    setIsLoading(true);
    try {
      if (!mobile_number || !otp_code || !new_password) {
        throw new Error(t("auth.provideAllFields"));
      }

      const response = await AuthService.confirmPasswordReset(
        mobile_number,
        otp_code,
        new_password
      );

      // Safely extract response message
      const message =
        response?.message || t("auth.passwordResetSuccessDescription");

      toast({
        title: t("auth.passwordResetSuccess"),
        description: message,
      });
    } catch (error: any) {
      console.error("Password reset confirmation error:", error);

      // Handle specific validation errors
      let errorTitle = t("auth.passwordResetConfirmationError");
      let errorMessage =
        error.message || t("auth.passwordResetConfirmationErrorMessage");

      if (error.message && error.message.includes("exceeds maximum length")) {
        errorTitle = "Token Too Long";
        errorMessage =
          "The password reset token is too long. Please try the password reset process again.";
      } else if (error.message && error.message.includes("500 characters")) {
        errorTitle = "Token Validation Error";
        errorMessage =
          "The password reset token exceeds the maximum allowed length. Please restart the password reset process.";
      } else if (
        error.message &&
        error.message.includes("Invalid or expired reset token")
      ) {
        errorTitle = "Token Invalid";
        errorMessage =
          "The password reset token is invalid or has expired. Please restart the password reset process.";

        // Clear stored tokens when they're invalid
        try {
          const { secureStorage } = await import("@/lib/secureStorage");
          localStorage.removeItem("passwordResetToken");
          secureStorage.removeItem("passwordResetExpires");
          console.log("Cleared invalid password reset tokens");
        } catch (clearError) {
          console.warn("Failed to clear invalid tokens:", clearError);
        }
      } else if (error.code === "TOKEN_INVALID") {
        errorTitle = "Token Invalid";
        errorMessage =
          "The password reset token is invalid or has expired. Please restart the password reset process.";

        // Clear stored tokens when they're invalid
        try {
          const { secureStorage } = await import("@/lib/secureStorage");
          localStorage.removeItem("passwordResetToken");
          secureStorage.removeItem("passwordResetExpires");
          console.log("Cleared invalid password reset tokens");
        } catch (clearError) {
          console.warn("Failed to clear invalid tokens:", clearError);
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    try {
      const newToken = await tokenManager.refreshAccessToken();

      if (newToken) {
        // Don't show toast for automatic token refresh to avoid spam
        console.log("Token refreshed successfully in AuthContext");
        return newToken;
      } else {
        // Token refresh failed, clear auth
        console.warn(
          "Token refresh failed in AuthContext, clearing authentication"
        );
        clearSecureAuth();
        setUser(null);
        return null;
      }
    } catch (error: any) {
      console.error("Token refresh failed in AuthContext:", error);

      // Check if it's a network error vs authentication error
      if (isNetworkError(error)) {
        console.warn("Network error during token refresh - will retry later");
        return null; // Don't logout on network errors
      }

      // Only show error notification for non-network errors
      if (!isNetworkError(error)) {
        toast({
          title: t("auth.tokenRefreshError"),
          description: t("auth.tokenRefreshErrorMessage"),
          variant: "destructive",
        });
      }

      // Only logout if it's a genuine authentication error
      if (error.status === 401 || error.status === 422) {
        console.warn("Authentication error during refresh, logging out");
        await logout();
      }

      return null;
    }
  };

  // Helper method to identify network errors
  const isNetworkError = (error: any): boolean => {
    return (
      error.code === "NETWORK_ERROR" ||
      !navigator.onLine ||
      error.message?.includes("network") ||
      error.message?.includes("Network") ||
      error.message?.includes("fetch") ||
      error.message?.includes("timeout") ||
      error.name === "NetworkError" ||
      error.name === "TypeError"
    );
  };

  const logout = async () => {
    try {
      // Call the logout API to invalidate tokens on server
      const response = await AuthService.logout();

      // Show success message
      toast({
        title: t("auth.logoutSuccess"),
        description: response.message || t("auth.logoutSuccessMessage"),
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      // Show error message but continue with local logout
      toast({
        title: t("auth.logoutError"),
        description: t("auth.logoutErrorMessage"),
        variant: "destructive",
      });
    } finally {
      // Always clear secure storage and update state
      clearSecureAuth();
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      // Call the logout all API to invalidate all sessions on server
      const response = await AuthService.logoutAll();

      // Show success message
      toast({
        title: t("auth.logoutAllSuccess"),
        description: response.message || t("auth.logoutAllSuccessMessage"),
      });
    } catch (error: any) {
      console.error("Logout all error:", error);
      // Show error message but continue with local logout
      toast({
        title: t("auth.logoutAllError"),
        description: t("auth.logoutAllErrorMessage"),
        variant: "destructive",
      });
    } finally {
      // Clear this tab's session
      clearSecureAuth();
      setUser(null);
      
      // Broadcast logout to all other tabs using BroadcastChannel API
      try {
        const channel = new BroadcastChannel('auth-logout');
        channel.postMessage({ type: 'logout-all' });
        channel.close();
      } catch (broadcastError) {
        console.warn("BroadcastChannel not supported, using storage event fallback");
        // Fallback: use localStorage event to notify other tabs
        localStorage.setItem('logout-all', Date.now().toString());
        localStorage.removeItem('logout-all');
      }
    }
  };

  const getCurrentUser = async () => {
    try {
      // Check if we have valid tokens before making the request
      const isAuthenticated = await tokenManager.isAuthenticated();
      if (!isAuthenticated) {
        console.log("User not authenticated, skipping getCurrentUser");
        setUser(null);
        return;
      }

      const response = await AuthService.getCurrentUser();

      // Validate response structure
      if (!response.customer) {
        throw new Error("Invalid response structure: missing customer data");
      }

      const customer = response.customer;

      // Validate required fields
      if (!customer.id || !customer.email) {
        throw new Error(
          "Invalid response structure: missing required customer fields"
        );
      }

      console.log("getCurrentUser - customer.profile_image from API:", customer.profile_image);
      
      // Convert API user data to local User format
      const userData: User = {
        id: customer.id,
        first_name: customer.first_name || "",
        last_name: customer.last_name || "",
        mobile_number: customer.mobile_number || "",
        email: customer.email,
        profile_image_id: customer.profile_image_id || "",
        profile_image: normalizeImageUrl(customer.profile_image), // Normalize URL to work with proxy
        type: customer.type || "regular",
        status: customer.status || "active",
        created_at: customer.created_at || new Date().toISOString(),
        updated_at: customer.updated_at || new Date().toISOString(),
        // Legacy fields for backward compatibility
        name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
        isVip: customer.type === "vip" || customer.status === "vip",
        vipCardNumber: undefined, // This would need to be fetched separately if needed
        vipExpiryDate: undefined, // This would need to be fetched separately if needed
        // Profile fields
        emergency_contact_name: customer.emergency_contact_name || "",
        emergency_contact_mobile: customer.emergency_contact_mobile || "",
        blood_type: customer.blood_type || "",
        labels: customer.labels || [], // Customer labels
      };

      console.log("getCurrentUser - normalized profile_image:", userData.profile_image);
      
      // Update user data in secure storage and state
      setSecureUserData(JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      console.error("Get current user error:", error);

      // Handle specific error types
      let errorTitle = t("auth.getUserError");
      let errorMessage = t("auth.getUserErrorMessage");

      if (error.status === 401) {
        errorTitle = t("auth.unauthorized");
        errorMessage = t("auth.unauthorizedMessage");
        // Clear stored tokens if unauthorized
        clearSecureAuth();
        setUser(null);
        // Don't show toast for 401 errors as they're handled by the API interceptor
        return;
      } else if (error.status === 403) {
        errorTitle = t("auth.forbidden");
        errorMessage = t("auth.forbiddenMessage");
      } else if (error.status >= 500) {
        errorTitle = t("auth.serverError");
        // Show more specific error messages for 500 errors
        if (
          error.message &&
          error.message.includes("property") &&
          error.message.includes("null")
        ) {
          errorMessage = t("auth.dataSyncError");
        } else if (
          error.message &&
          (error.message.includes("database") ||
            error.message.includes("connection"))
        ) {
          errorMessage = t("auth.serverUnavailableError");
        } else {
          errorMessage = t("auth.genericServerError");
        }
      } else if (
        error.message &&
        error.message.includes("Invalid response structure")
      ) {
        errorTitle = t("auth.apiError");
        errorMessage = t("auth.apiErrorMessage");
      }

      // Only show toast for non-401 errors
      if (error.status !== 401) {
        toast({
          title: errorTitle,
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  const switchToSignup = () => {
    setIsLoginOpen(false);
    setTimeout(() => setIsSignupOpen(true), 100); // allow modal transition
  };

  const switchToLogin = () => {
    setIsSignupOpen(false);
    setTimeout(() => setIsLoginOpen(true), 100);
  };

  const openLogin = () => {
    // Store current URL for redirect after login
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/' && !currentPath.includes('/login') && !currentPath.includes('/signup')) {
      sessionStorage.setItem('authRedirectUrl', currentPath);
    }
    setIsLoginOpen(true);
  };
  const openSignup = () => {
    // Store current URL for redirect after signup
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/' && !currentPath.includes('/login') && !currentPath.includes('/signup')) {
      sessionStorage.setItem('authRedirectUrl', currentPath);
    }
    setIsSignupOpen(true);
  };
  const closeLogin = () => setIsLoginOpen(false);
  const closeSignup = () => setIsSignupOpen(false);

  const checkNextUpcomingEvent = () => {
    const events = JSON.parse(localStorage.getItem("bookedEvents") || "[]");
    const now = new Date();

    const upcoming = (events as BookedEvent[])
      .map((event) => ({
        ...event,
        eventDate: parseISO(event.date),
      }))
      .filter((event) => isAfter(event.eventDate, now))
      .sort((a, b) => compareAsc(a.eventDate, b.eventDate));

    const next = upcoming[0];

    if (next) {
      toast({
        title: t("notifications.nextEventTitle"),
        description: t("notifications.nextEventDescription", {
          title: next.title,
          date: next.date,
          time: next.time,
        }),
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoginOpen,
        isSignupOpen,
        openLogin,
        openSignup,
        closeLogin,
        closeSignup,
        switchToLogin,
        switchToSignup,
        login,
        loginWithCredentials,
        verifyLoginOtp,
        sendLoginOtp,
        loginWithOtp,
        requestPasswordResetOtp,
        verifyPasswordResetOtp,
        confirmPasswordReset,
        refreshAccessToken,
        logout,
        logoutAll,
        getCurrentUser,
        user,
        isVip: user?.isVip || false,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    console.error("useAuth called outside of AuthProvider");
    // During hot reload, this might happen temporarily
    // Return a default context to prevent crashes
    if (process.env.NODE_ENV === "development") {
      console.warn("Returning default auth context during development");
      return {
        isLoginOpen: false,
        isSignupOpen: false,
        openLogin: () => {},
        openSignup: () => {},
        closeLogin: () => {},
        closeSignup: () => {},
        switchToLogin: () => {},
        switchToSignup: () => {},
        login: () => {},
        loginWithCredentials: async () => {},
        sendLoginOtp: async () => {},
        loginWithOtp: async () => {},
        requestPasswordResetOtp: async () => {},
        verifyPasswordResetOtp: async () => ({
          password_reset_token: "",
          expires_in_seconds: 0,
        }),
        confirmPasswordReset: async () => {},
        refreshAccessToken: async () => null,
        logout: async () => {},
        logoutAll: async () => {},
        getCurrentUser: async () => {},
        user: null,
        isVip: false,
        isLoading: false,
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
