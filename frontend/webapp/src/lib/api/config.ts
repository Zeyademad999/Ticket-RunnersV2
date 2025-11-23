import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError } from "./types";
import { AuthService } from "./services/auth";
import {
  getSecureToken,
  getSecureRefreshToken,
  setSecureToken,
  clearSecureAuth,
} from "../secureStorage";
import { tokenManager } from "../tokenManager";
import { ValidationService } from "../validation";

// API Configuration
// Use relative URL to fetch from the same backend server
export const API_CONFIG = {
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    "/api/v1", // Relative URL - uses same origin as frontend
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// Create axios instance
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Request interceptor with enhanced token handling
  client.interceptors.request.use(
    async (config) => {
      // Skip token for refresh endpoint to avoid infinite loops
      if (config.url?.includes("/auth/refresh")) {
        return config;
      }

      // Skip token for password reset endpoints (they work without auth)
      const passwordResetEndpoints = [
        "/forgot-password/request-otp",
        "/forgot-password/verify-otp",
        "/reset-password",
      ];
      const isPasswordResetEndpoint = passwordResetEndpoints.some((endpoint) =>
        config.url?.includes(endpoint)
      );
      if (isPasswordResetEndpoint) {
        return config;
      }

      // Get valid token using token manager
      // Skip if token was already refreshed in response interceptor
      if (!(config as any)._tokenRefreshed) {
        try {
          const token = await tokenManager.getValidToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          // Continue without token - let the response interceptor handle 401s
          console.warn("Failed to get valid token for request:", config.url);
        }
      }

      // Add request timestamp and ID for debugging
      config.metadata = {
        startTime: new Date(),
        requestId: `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
      };

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor with race condition protection
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Add response time for debugging
      const endTime = new Date();
      const startTime = response.config.metadata?.startTime;
      if (startTime) {
        response.config.metadata.responseTime =
          endTime.getTime() - startTime.getTime();
      }

      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Skip refresh logic for refresh endpoint to avoid infinite loops
      if (originalRequest.url?.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      // Skip token refresh for password reset endpoints (they work without auth)
      const passwordResetEndpoints = [
        "/forgot-password/request-otp",
        "/forgot-password/verify-otp",
        "/reset-password",
      ];
      const isPasswordResetEndpoint = passwordResetEndpoints.some((endpoint) =>
        originalRequest.url?.includes(endpoint)
      );
      if (isPasswordResetEndpoint) {
        // For password reset endpoints, extract error message properly and don't try to refresh tokens
        const errorData = error.response?.data;
        if (errorData?.error?.message) {
          // Extract the error message from the backend response
          error.message = errorData.error.message;
        }
        return Promise.reject(error);
      }

      // Handle token refresh with race condition protection
      // Prevent infinite loops - only retry once per request
      if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._refreshAttempted) {
        originalRequest._retry = true;
        originalRequest._refreshAttempted = true;

        try {
          console.log("401 error detected, attempting token refresh...");

          // Check if we have a valid refresh token before attempting refresh
          const refreshToken = await getSecureRefreshToken();
          if (!refreshToken) {
            console.log("No refresh token available, clearing auth");
            clearSecureAuth();
            window.dispatchEvent(
              new CustomEvent("auth-required", {
                detail: { reason: "No refresh token available" },
              })
            );
            const authError: any = new Error("Authentication failed");
            authError.status = 401;
            authError.isAuthError = true;
            throw authError;
          }

          // Log refresh token expiration details
          ValidationService.logRefreshTokenExpiration(refreshToken);

          // Check if refresh token is expired before attempting refresh
          // Use a more lenient check - only clear if we're CERTAIN it's expired
          const isExpired = ValidationService.isTokenExpired(refreshToken);
          if (isExpired) {
            // Double-check by parsing the token directly
            try {
              const parts = refreshToken.split(".");
              if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                const currentTime = Math.floor(Date.now() / 1000);
                // Only clear if token is actually expired (with small buffer)
                if (payload.exp && payload.exp < currentTime + 60) {
                  console.log("Refresh token is expired, clearing auth");
                  clearSecureAuth();
                  window.dispatchEvent(
                    new CustomEvent("auth-required", {
                      detail: { reason: "Refresh token expired" },
                    })
                  );
                  const authError: any = new Error("Authentication failed");
                  authError.status = 401;
                  authError.isAuthError = true;
                  throw authError;
                } else {
                  // Token is still valid, continue with refresh attempt
                  console.log("Refresh token validation returned false positive, attempting refresh anyway");
                }
              }
            } catch (error) {
              // If we can't parse, don't clear - let the server decide during refresh
              console.warn("Could not parse refresh token, attempting refresh anyway:", error);
            }
          }

          const newToken = await tokenManager.refreshAccessToken();

          if (newToken) {
            // Small delay to ensure token is fully stored before retrying
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Update the original request with new token
            // Make sure headers object exists
            if (!originalRequest.headers) {
              originalRequest.headers = {} as any;
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            // Mark that we've already set the token to prevent interceptor from overwriting
            (originalRequest as any)._tokenRefreshed = true;
            // Don't reset retry flag - prevent infinite loops
            console.log("Token refreshed successfully, retrying request with new token...");
            return client(originalRequest);
          } else {
            // Token refresh returned null - could be 404 (endpoint doesn't exist)
            // Don't clear auth in this case - just fail the request
            // The original request will fail with 401, which is fine
            console.warn("Token refresh returned null, but keeping auth - original request will fail");
            // Don't throw - let the original 401 error propagate
            return Promise.reject(error);
          }
        } catch (refreshError: any) {
          console.error("Token refresh failed:", refreshError);

          // Don't clear auth on 404 or 500 - endpoint might not exist or server error
          if (refreshError.status === 404 || refreshError.status === 500) {
            console.warn(`Refresh endpoint ${refreshError.status} - keeping auth, original request will fail`);
            return Promise.reject(error); // Return original error, don't clear auth
          }

          // Clear auth for other refresh errors (401, 403, etc.)
          clearSecureAuth();

          // Dispatch auth-required event
          window.dispatchEvent(
            new CustomEvent("auth-required", {
              detail: {
                reason: "Token refresh failed",
                error: refreshError.message,
              },
            })
          );

          // Ensure error has status code for retry logic
          if (!refreshError.status) {
            refreshError.status = 401;
            refreshError.isAuthError = true;
          }
          throw refreshError;
        }
      }

      // Transform error response
      // Handle backend error format: { error: { code: "...", message: "..." } }
      const errorData = error.response?.data;
      let errorMessage: string | object = error.message || "An unexpected error occurred";
      
      if (errorData) {
        // Check for nested error format: { error: { code: "...", message: "..." } }
        if (errorData.error?.message) {
          const messageValue = errorData.error.message;
          // Handle both string and object messages
          if (typeof messageValue === "string") {
            errorMessage = messageValue;
          } else if (typeof messageValue === "object" && messageValue !== null) {
            // Django serializer errors format: { field_name: [ErrorDetail(...)] }
            const errorKeys = Object.keys(messageValue);
            if (errorKeys.length > 0) {
              const firstKey = errorKeys[0];
              const firstError = messageValue[firstKey];
              if (Array.isArray(firstError) && firstError.length > 0) {
                errorMessage = firstError[0];
              } else if (typeof firstError === "string") {
                errorMessage = firstError;
              } else {
                errorMessage = messageValue; // Keep as object for further processing
              }
            }
          }
        } else if (errorData.message) {
          // Handle both string and object messages
          if (typeof errorData.message === "string") {
            errorMessage = errorData.message;
          } else if (typeof errorData.message === "object" && errorData.message !== null) {
            // Django serializer errors format: { field_name: [ErrorDetail(...)] }
            const errorKeys = Object.keys(errorData.message);
            if (errorKeys.length > 0) {
              const firstKey = errorKeys[0];
              const firstError = errorData.message[firstKey];
              if (Array.isArray(firstError) && firstError.length > 0) {
                errorMessage = firstError[0];
              } else if (typeof firstError === "string") {
                errorMessage = firstError;
              } else {
                errorMessage = errorData.message; // Keep as object for further processing
              }
            }
          }
        } else if (typeof errorData === "object" && !errorData.error) {
          // Handle direct serializer errors format: { field_name: [ErrorDetail(...)] }
          const errorKeys = Object.keys(errorData);
          if (errorKeys.length > 0 && !errorKeys.includes("code") && !errorKeys.includes("status")) {
            const firstKey = errorKeys[0];
            const firstError = errorData[firstKey];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0];
            } else if (typeof firstError === "string") {
              errorMessage = firstError;
            } else {
              errorMessage = errorData; // Keep as object for further processing
            }
          }
        }
      }
      
      // Ensure errorMessage is always a string
      const finalErrorMessage = typeof errorMessage === "string" 
        ? errorMessage 
        : (typeof errorMessage === "object" && errorMessage !== null
          ? (() => {
              // Try to extract from object
              const keys = Object.keys(errorMessage);
              if (keys.length > 0) {
                const firstKey = keys[0];
                const firstValue = errorMessage[firstKey];
                if (Array.isArray(firstValue) && firstValue.length > 0) {
                  return firstValue[0];
                } else if (typeof firstValue === "string") {
                  return firstValue;
                }
              }
              return JSON.stringify(errorMessage);
            })()
          : String(errorMessage));
      
      const apiError: ApiError = {
        message: finalErrorMessage,
        code: errorData?.error?.code || errorData?.code,
        field: errorData?.field,
        status: error.response?.status,
      };

      // Handle 500 errors with better user experience
      if (error.response?.status === 500) {
        const errorMessage = error.response?.data?.message || "";
        const errorDetails = error.response?.data || {};

        console.error("500 Error Details:", {
          message: errorMessage,
          details: errorDetails,
          url: error.config?.url,
          method: error.config?.method,
        });

        // Check for VERY specific authentication-related errors
        // Only clear tokens for explicit authentication failures, not general server errors
        const isAuthError =
          (errorMessage.includes("authentication") &&
            errorMessage.includes("failed")) ||
          (errorMessage.includes("unauthorized") &&
            errorMessage.includes("token")) ||
          (errorMessage.includes("token") &&
            errorMessage.includes("invalid")) ||
          (errorMessage.includes("JWT") && errorMessage.includes("invalid")) ||
          (errorMessage.includes("invalid") &&
            errorMessage.includes("token")) ||
          (errorMessage.includes("expired") && errorMessage.includes("token"));

        if (isAuthError) {
          console.warn("Backend authentication error detected:", errorMessage);

          // Clear auth data and trigger re-authentication using secure storage
          clearSecureAuth();

          // Dispatch event to trigger login modal
          window.dispatchEvent(
            new CustomEvent("auth-required", {
              detail: {
                reason: "Backend authentication error",
                message: errorMessage,
              },
            })
          );

          // Show user-friendly error message
          apiError.message = "Authentication error. Please log in again.";
        } else {
          // For other 500 errors, show user-friendly error message without clearing tokens
          console.warn(
            "Backend 500 error (not authentication related):",
            errorMessage
          );

          // Show user-friendly error message for server errors
          if (
            errorMessage.includes("property") &&
            errorMessage.includes("null")
          ) {
            apiError.message =
              "Server error: Data synchronization issue. Please try again in a moment.";
          } else if (
            errorMessage.includes("database") ||
            errorMessage.includes("connection")
          ) {
            apiError.message =
              "Server temporarily unavailable. Please try again later.";
          } else {
            apiError.message =
              "Server error occurred. Please try again or contact support if the issue persists.";
          }

          // Dispatch error event for global error handling
          window.dispatchEvent(
            new CustomEvent("api-error", {
              detail: {
                message: apiError.message,
                status: 500,
                url: error.config?.url,
                method: error.config?.method,
              },
            })
          );
        }
      }

      return Promise.reject(apiError);
    }
  );

  return client;
};

// Default API client instance
export const apiClient = createApiClient();

// Utility functions for API calls
export const handleApiResponse = <T>(response: AxiosResponse<T>) => {
  return response.data;
};

export const handleApiError = (error: any): never => {
  if (error.response) {
    // Server responded with error status
    const errorData = error.response.data;
    let errorMessage = "Server error";
    
    // Extract error message properly - check for custom error format first
    if (errorData?.error?.message) {
      // Custom exception format: { error: { code: '...', message: '...' } }
      errorMessage = errorData.error.message;
    } else if (typeof errorData?.message === "string") {
      errorMessage = errorData.message;
    } else if (typeof errorData?.message === "object" && errorData.message !== null) {
      // Django serializer errors format: { field_name: [ErrorDetail(...)] }
      const errorKeys = Object.keys(errorData.message);
      if (errorKeys.length > 0) {
        const firstKey = errorKeys[0];
        const firstError = errorData.message[firstKey];
        if (Array.isArray(firstError) && firstError.length > 0) {
          errorMessage = firstError[0];
        } else if (typeof firstError === "string") {
          errorMessage = firstError;
        }
      }
    } else if (typeof errorData === "object" && errorData !== null) {
      // Handle direct serializer errors format: { field_name: [ErrorDetail(...)] }
      const errorKeys = Object.keys(errorData);
      if (errorKeys.length > 0 && !errorKeys.includes("code") && !errorKeys.includes("status") && !errorKeys.includes("error")) {
        const firstKey = errorKeys[0];
        const firstError = errorData[firstKey];
        if (Array.isArray(firstError) && firstError.length > 0) {
          errorMessage = firstError[0];
        } else if (typeof firstError === "string") {
          errorMessage = firstError;
        }
      }
    }
    
    throw {
      message: errorMessage,
      status: error.response.status,
      code: error.response.data?.code,
    };
  } else if (error.request) {
    // Network error
    throw {
      message: "Network error. Please check your connection.",
      status: 0,
    };
  } else {
    // Other error
    throw {
      message: typeof error.message === "string" ? error.message : "An unexpected error occurred",
      status: 500,
    };
  }
};

// Retry utility for failed requests
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxRetries: number = API_CONFIG.RETRY_ATTEMPTS,
  delay: number = API_CONFIG.RETRY_DELAY
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // For rate limiting (429), use exponential backoff with jitter
      if (error.status === 429) {
        const baseDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
        const totalDelay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds

        console.warn(
          `Rate limited. Retrying in ${Math.round(
            totalDelay
          )}ms (attempt ${attempt}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      } else {
        // For other retryable errors, use linear backoff
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
};

// File upload configuration
export const createUploadConfig = (
  file: File,
  onProgress?: (progress: number) => void
): AxiosRequestConfig => {
  const formData = new FormData();
  formData.append("file", file);

  return {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    },
  };
};

// Query parameter builder
export const buildQueryParams = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
};
