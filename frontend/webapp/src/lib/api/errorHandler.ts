import { toast } from "@/hooks/use-toast";
import { getSecureRefreshToken, clearSecureAuth } from "@/lib/secureStorage";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  field?: string;
}

export class ApiErrorHandler {
  private static retryCount = 0;
  private static maxRetries = 3;
  private static retryDelay = 1000; // 1 second

  static async handleError(
    error: any,
    context: string = "API"
  ): Promise<never> {
    console.error(`${context} Error:`, error);

    const apiError: ApiError = {
      message: error.message || "An unexpected error occurred",
      status: error.status || error.response?.status,
      code: error.code,
      field: error.field,
    };

    // Handle specific error types
    if (apiError.status === 401) {
      this.handleUnauthorized();
      return Promise.reject(apiError);
    }

    if (apiError.status === 403) {
      this.handleForbidden();
      return Promise.reject(apiError);
    }

    if (apiError.status === 429) {
      this.handleRateLimit();
      return Promise.reject(apiError);
    }

    if (apiError.status >= 500) {
      return this.handleServerError(apiError, context);
    }

    // Handle network errors
    if (error.code === "NETWORK_ERROR" || !navigator.onLine) {
      return this.handleNetworkError(apiError, context);
    }

    // Default error handling
    this.showErrorToast(apiError.message, context);
    return Promise.reject(apiError);
  }

  private static async handleUnauthorized(): Promise<void> {
    // Let the API interceptor handle token refresh
    // Don't duplicate the logic here to avoid race conditions
    console.log("401 error received - letting API interceptor handle refresh");

    // Only clear tokens if no refresh token is available
    const refreshToken = await getSecureRefreshToken();
    if (!refreshToken) {
      clearSecureAuth();

      // Redirect to login or show login modal
      window.dispatchEvent(new CustomEvent("auth-required"));

      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
    }
  }

  private static handleForbidden(): void {
    toast({
      title: "Access Denied",
      description: "You don't have permission to perform this action",
      variant: "destructive",
    });
  }

  private static handleRateLimit(): void {
    toast({
      title: "Too Many Requests",
      description: "Please wait a moment before trying again",
      variant: "destructive",
    });
  }

  private static async handleServerError(
    error: ApiError,
    context: string
  ): Promise<never> {
    // Trigger server error banner
    window.dispatchEvent(
      new CustomEvent("server-error", {
        detail: { context, error: error.message },
      })
    );

    // Don't show toast for server errors to avoid spam
    console.warn(`Server error in ${context}:`, error.message);

    return Promise.reject(error);
  }

  private static async handleNetworkError(
    error: ApiError,
    context: string
  ): Promise<never> {
    toast({
      title: "Connection Error",
      description: "Please check your internet connection and try again",
      variant: "destructive",
    });

    return Promise.reject(error);
  }

  private static showErrorToast(message: string, context: string): void {
    toast({
      title: "Error",
      description: `${context}: ${message}`,
      variant: "destructive",
    });
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    context: string = "API",
    maxRetries: number = this.maxRetries
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Get status from error object or axios response
        const status = error.status || error.response?.status;

        // Don't retry on certain error types
        if (
          status === 401 ||
          status === 403 ||
          status === 404 ||
          error.isAuthError ||
          (error.message && error.message.includes("Authentication failed"))
        ) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * (attempt + 1))
        );

        console.warn(`${context} attempt ${attempt + 1} failed, retrying...`);
      }
    }

    // Handle the final error
    return this.handleError(lastError, context);
  }

  static resetRetryCount(): void {
    this.retryCount = 0;
  }
}
