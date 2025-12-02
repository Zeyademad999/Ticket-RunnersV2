import {
  apiClient,
  handleApiResponse,
  retryRequest,
} from "../config";
import {
  ApiResponse,
} from "../types";

/**
 * Analytics Service
 * Handles all analytics-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class AnalyticsService {
  /**
   * Get user analytics
   * GET /api/v1/users/analytics/
   */
  static async getUserAnalytics(): Promise<{
    total_bookings: number;
    total_spent: number;
    attended_events: number;
    favorite_events: number;
    upcoming_events: number;
    recent_bookings: Array<{
      event_title: string;
      booking_date: string;
      amount: number;
    }>;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get("/users/analytics/");
      return handleApiResponse(response);
    });
  }

  /**
   * Get user payment history (also available in PaymentsService)
   * GET /api/v1/users/payment-history/
   * This is kept here for convenience and consistency with the plan
   */
  static async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    items: Array<{
      id: string;
      transaction_id: string;
      amount: number;
      payment_method: string;
      status: string;
      event_title?: string;
      created_at: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    return retryRequest(async () => {
      const queryString = new URLSearchParams();
      if (params?.page) queryString.append("page", params.page.toString());
      if (params?.limit) queryString.append("limit", params.limit.toString());
      if (params?.date_from) queryString.append("date_from", params.date_from);
      if (params?.date_to) queryString.append("date_to", params.date_to);
      
      const url = queryString.toString()
        ? `/users/payment-history/?${queryString.toString()}`
        : "/users/payment-history/";
      const response = await apiClient.get(url);
      return handleApiResponse(response);
    });
  }
}

