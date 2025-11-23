/**
 * Fallback service to handle API failures gracefully
 * Provides mock data when the backend is experiencing issues
 */

import { CustomerBookingItem, CustomerCardDetailsResponse } from "../types";

export class FallbackService {
  /**
   * Get fallback booking data when API fails
   */
  static getFallbackBookings(): CustomerBookingItem[] {
    return [
      {
        id: "fallback-1",
        event_id: "event-1",
        event_title: "Sample Event",
        event_date: new Date().toISOString().split("T")[0],
        event_time: "19:00",
        event_location: "Sample Location",
        order_id: "order-1",
        ticket_category: "General",
        quantity: 1,
        unit_price: 100,
        total_amount: 100,
        purchase_date: new Date().toISOString(),
        status: "confirmed",
        qr_enabled: true,
        check_in_time: null,
        dependents: [],
      },
    ];
  }

  /**
   * Get fallback card details when API fails
   */
  static getFallbackCardDetails(): CustomerCardDetailsResponse | null {
    return {
      customer_first_name: "Sample",
      nfc_card: {
        card_number: "**** **** **** 0000",
        card_status: "active",
        card_issue_date: new Date().toISOString().split("T")[0],
        card_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      wallet: {
        wallet_status: "active",
        wallet_expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
    };
  }

  /**
   * Get fallback favorites data when API fails
   */
  static getFallbackFavorites(): any[] {
    return [
      {
        id: 1,
        event_id: 101,
        event_title: "Cairo Jazz Festival 2025",
        event_date: "2025-07-15",
        event_time: "19:00",
        event_location: "El Sawy Culturewheel, Zamalek",
        event_price: 150,
        event_category: "Jazz",
        event_image: "/public/event1.jpg",
        favorite_time: new Date().toISOString(),
      },
      {
        id: 2,
        event_id: 102,
        event_title: "Art Expo 2025",
        event_date: "2024-12-15",
        event_time: "17:00",
        event_location: "Cairo Exhibition Center, Nasr City",
        event_price: 80,
        event_category: "Art",
        event_image: "/public/event2.jpg",
        favorite_time: new Date().toISOString(),
      },
    ];
  }

  /**
   * Check if we should use fallback data based on error
   */
  static shouldUseFallback(error: any): boolean {
    // Use fallback for database errors, 500 errors, rate limits, or network issues
    return (
      error?.status === 500 ||
      error?.status === 429 ||
      error?.message?.includes("SQLSTATE") ||
      error?.message?.includes("Column not found") ||
      error?.message?.includes("Too Many Attempts") ||
      error?.message?.includes("Request aborted") ||
      error?.message?.includes("network") ||
      error?.code === "NETWORK_ERROR"
    );
  }

  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error: any): string {
    if (
      error?.message?.includes("SQLSTATE") ||
      error?.message?.includes("Column not found")
    ) {
      return "We're experiencing database maintenance. Some features may be limited.";
    }

    if (error?.status === 500) {
      return "Server is temporarily unavailable. Please try again in a few minutes.";
    }

    if (
      error?.status === 429 ||
      error?.message?.includes("Too Many Attempts")
    ) {
      return "Rate limit exceeded. Please wait a moment before trying again.";
    }

    if (error?.message?.includes("Request aborted")) {
      return "Request was cancelled. Please try again.";
    }

    if (error?.message?.includes("network")) {
      return "Network connection issue. Please check your internet connection.";
    }

    return "Unable to load data. Please try again later.";
  }
}
