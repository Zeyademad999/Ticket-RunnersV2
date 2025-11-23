// Export all types
export * from "./types";

// Export configuration
export * from "./config";

// Import services
import { AuthService } from "./services/auth";
import { EventsService } from "./services/events";
import { BookingsService } from "./services/bookings";
import { AdminService } from "./services/admin";
import { TicketsService } from "./services/tickets";
import { PaymentsService } from "./services/payments";
import { NFCCardsService } from "./services/nfcCards";
import { DependentsService } from "./services/dependents";
import { FavoritesService } from "./services/favorites";
import { AnalyticsService } from "./services/analytics";

// Export all services
export { AuthService } from "./services/auth";
export { EventsService } from "./services/events";
export { BookingsService } from "./services/bookings";
export { AdminService } from "./services/admin";
export { TicketsService } from "./services/tickets";
export { PaymentsService } from "./services/payments";
export { NFCCardsService } from "./services/nfcCards";
export { DependentsService } from "./services/dependents";
export { FavoritesService } from "./services/favorites";
export { AnalyticsService } from "./services/analytics";

// Export hooks
export { useEventFilters } from "./hooks/useEventFilters";
export { useEventDetails } from "./hooks/useEventDetails";

// Main API client class that provides access to all services
export class ApiClient {
  // Authentication services
  static auth = AuthService;

  // Event management services
  static events = EventsService;

  // Booking and ticket services
  static bookings = BookingsService;
  static tickets = TicketsService;

  // Payment services
  static payments = PaymentsService;

  // NFC Card services
  static nfcCards = NFCCardsService;

  // User management services
  static dependents = DependentsService;
  static favorites = FavoritesService;
  static analytics = AnalyticsService;

  // Admin services
  static admin = AdminService;
}

// Default export for convenience
export default ApiClient;

// Utility functions for common API operations
export const apiUtils = {
  /**
   * Check if the API is available
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "/api/v1"
        }/health`
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get API version
   */
  async getApiVersion(): Promise<string> {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "/api/v1"
        }/version`
      );
      const data = await response.json();
      return data.version || "unknown";
    } catch {
      return "unknown";
    }
  },

  /**
   * Clear all cached data
   */
  clearCache(): void {
    // Clear any cached data from localStorage or sessionStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("api_cache_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  },

  /**
   * Set API base URL
   */
  setBaseUrl(url: string): void {
    // This would need to be implemented in the config file
    // For now, we'll just update the environment variable
    if (typeof window !== "undefined") {
      (window as any).__API_BASE_URL__ = url;
    }
  },

  /**
   * Get current API base URL
   */
  getBaseUrl(): string {
    return import.meta.env.VITE_API_BASE_URL;
  },
};

// Export individual services for direct import
export const authService = AuthService;
export const eventsService = EventsService;
export const bookingsService = BookingsService;
export const ticketsService = TicketsService;
export const paymentsService = PaymentsService;
export const nfcCardsService = NFCCardsService;
export const dependentsService = DependentsService;
export const favoritesService = FavoritesService;
export const analyticsService = AnalyticsService;
export const adminService = AdminService;
