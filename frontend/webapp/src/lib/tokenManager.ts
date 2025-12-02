/**
 * Simplified Token Management Service
 * Handles token refresh with basic mutex protection
 */

import {
  getSecureToken,
  getSecureRefreshToken,
  setSecureToken,
  setSecureRefreshToken,
  clearSecureAuth,
} from "./secureStorage";
import { ValidationService } from "./validation";

class TokenManager {
  private static instance: TokenManager;
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly FAILURE_COOLDOWN = 30000; // 30 seconds

  // Global refresh mutex to prevent multiple simultaneous refresh attempts
  private static globalRefreshMutex = false;
  private static globalRefreshPromise: Promise<string | null> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Get current access token, refresh if needed
   */
  async getValidToken(): Promise<string | null> {
    const token = await getSecureToken();
    const refreshToken = await getSecureRefreshToken();

    if (!token) {
      return null;
    }

    // If no refresh token, return null immediately
    if (!refreshToken) {
      console.log("No refresh token available");
      return null;
    }

    // Log refresh token expiration details
    ValidationService.logRefreshTokenExpiration(refreshToken);

    // Check if refresh token is expired first
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
            this.clearAuth();
            window.dispatchEvent(
              new CustomEvent("auth-required", {
                detail: { reason: "Refresh token expired" },
              })
            );
            return null;
          } else {
            // Token is still valid, don't clear
            console.log("Refresh token validation returned false positive, keeping token");
          }
        }
      } catch (error) {
        // If we can't parse, don't clear - let the server decide
        console.warn("Could not parse refresh token, keeping it:", error);
      }
    }

    // Check if access token is expired
    if (ValidationService.isTokenExpired(token)) {
      console.log("Access token expired, attempting refresh...");
      return await this.refreshAccessToken();
    }

    return token;
  }

  /**
   * Refresh access token with enhanced mutex protection and race condition prevention
   */
  async refreshAccessToken(): Promise<string | null> {
    // Global mutex check to prevent multiple instances from refreshing simultaneously
    if (TokenManager.globalRefreshMutex) {
      console.log("Global token refresh already in progress, waiting...");
      if (TokenManager.globalRefreshPromise) {
        try {
          return await TokenManager.globalRefreshPromise;
        } catch (error) {
          console.error("Failed to wait for global refresh:", error);
          // Reset global mutex if the global refresh failed
          TokenManager.globalRefreshMutex = false;
          TokenManager.globalRefreshPromise = null;
        }
      }
    }

    // Check circuit breaker
    const now = Date.now();
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      if (now - this.lastFailureTime < this.FAILURE_COOLDOWN) {
        console.log("Token refresh circuit breaker active, skipping refresh");
        return null;
      } else {
        // Reset circuit breaker after cooldown
        this.consecutiveFailures = 0;
      }
    }

    // Check if refresh token exists and is valid before attempting refresh
    const refreshToken = await getSecureRefreshToken();
    if (!refreshToken) {
      console.log("No refresh token available for refresh");
      this.clearAuth();
      return null;
    }

    if (ValidationService.isTokenExpired(refreshToken)) {
      console.log("Refresh token is expired, clearing auth");
      this.clearAuth();
      return null;
    }

    // Enhanced race condition protection
    if (this.isRefreshing) {
      console.log("Token refresh already in progress, waiting...");
      if (this.refreshPromise) {
        try {
          return await this.refreshPromise;
        } catch (error) {
          console.error("Failed to wait for existing refresh:", error);
          // If the existing refresh failed, we can try again
          this.isRefreshing = false;
          this.refreshPromise = null;
        }
      } else {
        // This shouldn't happen, but handle it gracefully
        console.warn("Refresh in progress but no promise found, retrying...");
        this.isRefreshing = false;
      }
    }

    // Set global mutex to prevent other instances from refreshing
    TokenManager.globalRefreshMutex = true;
    TokenManager.globalRefreshPromise = this.performTokenRefresh();

    // Start new refresh process with enhanced protection
    this.isRefreshing = true;
    this.refreshPromise = TokenManager.globalRefreshPromise;

    try {
      const newToken = await this.refreshPromise;
      console.log("Token refreshed successfully");
      // Reset failure counter on success
      this.consecutiveFailures = 0;
      return newToken;
    } catch (error) {
      console.error("Token refresh failed:", error);

      // Update failure tracking
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();

      // Handle different error types appropriately
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          console.warn("Token refresh timed out, will retry later");
          // Don't clear auth on timeout - allow retry
        } else if (
          error.message.includes("Network error") ||
          (error as any).code === "NETWORK_ERROR"
        ) {
          console.warn("Network error during refresh, will retry later");
          // Don't clear auth on network errors - allow retry
        } else if (
          error.message.includes("expired") ||
          error.message.includes("invalid") ||
          error.message.includes("401") ||
          error.message.includes("422")
        ) {
          console.warn("Authentication error during refresh, clearing auth");
          this.clearAuth();
        } else if (error.status === 404) {
          // 404 means endpoint doesn't exist - don't clear auth, just return null
          console.warn("Refresh endpoint not found (404), but keeping tokens");
          return null; // Don't clear auth on 404
        } else if (error.status === 500) {
          // 500 means server error - don't clear auth, just return null
          console.warn("Server error during refresh (500), but keeping tokens");
          return null; // Don't clear auth on server errors
        } else {
          console.warn(
            "Unknown error during refresh, clearing auth for safety"
          );
          this.clearAuth();
        }
      }

      return null;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
      // Reset global mutex
      TokenManager.globalRefreshMutex = false;
      TokenManager.globalRefreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh with timeout protection
   */
  private async performTokenRefresh(): Promise<string> {
    const refreshToken = await getSecureRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Log refresh token expiration details
    ValidationService.logRefreshTokenExpiration(refreshToken);

    // Check if refresh token is expired
    if (ValidationService.isTokenExpired(refreshToken)) {
      throw new Error("Refresh token is expired");
    }

    // Create abort controller for timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000); // 10 second timeout

    try {
      // Call the refresh API with timeout protection
      // Use customer-specific refresh endpoint at /api/v1/users/refresh-token/
      // This handles custom claims (customer_id) properly
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";
      const refreshUrl = `${baseUrl}/users/refresh-token/`;
      
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken, // TokenRefreshView expects 'refresh' not 'refresh_token'
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();

      // Customer refresh endpoint returns: { access: "...", refresh: "..." }
      // Extract access token from response
      const newAccessToken = data.access || data.access_token || data.data?.access || data.data?.access_token;
      
      if (!newAccessToken) {
        throw new Error("Invalid response structure from refresh token API - no access token found");
      }

      // Store the new access token
      await setSecureToken(newAccessToken);

      // If a new refresh token is provided, store it (token rotation)
      const newRefreshToken = data.refresh || data.refresh_token;
      if (newRefreshToken) {
        await setSecureRefreshToken(newRefreshToken);
        console.log("Refresh token rotated successfully");
      }

      return newAccessToken;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle timeout errors
      if (error.name === "AbortError") {
        throw new Error("Token refresh timeout after 10 seconds");
      }

      // Handle network errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        const networkError = new Error("Network error during token refresh");
        (networkError as any).code = "NETWORK_ERROR";
        throw networkError;
      }

      // Handle specific HTTP status codes
      if (error.status === 401) {
        throw new Error("Refresh token is invalid or expired");
      } else if (error.status === 422) {
        throw new Error("Invalid refresh token format");
      }
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getSecureToken();
    const refreshToken = await getSecureRefreshToken();

    console.log("TokenManager.isAuthenticated - Token exists:", !!token);
    console.log(
      "TokenManager.isAuthenticated - Refresh token exists:",
      !!refreshToken
    );
    console.log(
      "TokenManager.isAuthenticated - Token preview:",
      token?.substring(0, 20) + "..."
    );
    console.log(
      "TokenManager.isAuthenticated - Refresh token preview:",
      refreshToken?.substring(0, 20) + "..."
    );

    if (!token || !refreshToken) {
      console.log(
        "TokenManager.isAuthenticated - Missing tokens, returning false"
      );
      return false;
    }

    // Log refresh token expiration details
    ValidationService.logRefreshTokenExpiration(refreshToken);

    const isTokenExpired = ValidationService.isTokenExpired(token);
    const isRefreshTokenExpired =
      ValidationService.isTokenExpired(refreshToken);

    console.log(
      "TokenManager.isAuthenticated - Access token expired:",
      isTokenExpired
    );
    console.log(
      "TokenManager.isAuthenticated - Refresh token expired:",
      isRefreshTokenExpired
    );

    // If access token is valid, user is authenticated
    if (!isTokenExpired) {
      console.log(
        "TokenManager.isAuthenticated - Access token valid, returning true"
      );
      return true;
    }

    // If access token is expired but refresh token is valid, user is still authenticated
    const isAuthenticated = !isRefreshTokenExpired;
    console.log(
      "TokenManager.isAuthenticated - Refresh token valid:",
      isAuthenticated
    );
    return isAuthenticated;
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    console.log("Clearing authentication data");
    clearSecureAuth();
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance();

// Convenience functions
export const getValidToken = () => tokenManager.getValidToken();
export const refreshToken = () => tokenManager.refreshAccessToken();
export const isAuthenticated = () => tokenManager.isAuthenticated();
export const clearAuth = () => tokenManager.clearAuth();
