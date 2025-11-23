import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import { tokenManager } from "../../tokenManager";
import {
  ApiResponse,
  PaymentTransaction,
} from "../types";

/**
 * Payments Service
 * Handles all payment-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export interface KashierPaymentConfig {
  orderId: string;
  hash: string;
  amount: string;
  currency: string;
  merchantId: string;
  scriptUrl?: string;  // URL to kashier-checkout.js script (optional, can construct from baseUrl)
  hppUrl?: string;  // Fallback HPP URL for opening in new tab
  merchantRedirect: string;
  serverWebhook: string;
  mode: string;
  baseUrl: string;
  display: string;
  allowedMethods: string;
  customerReference?: string;  // User/Customer ID for Kashier
}

export class PaymentsService {
  /**
   * Initialize Kashier payment
   * POST /api/payments/initialize/
   */
  static async initializePayment(data: {
    event_id?: number | string;
    ticket_id?: number | string;
    amount: number;
    currency?: string;
    payment_type?: 'booking' | 'transfer';
    booking_data?: {
      category: string;
      quantity: number;
      ticket_details?: Array<{
        name?: string;
        mobile?: string;
        email?: string;
        is_owner?: boolean;
        category?: string;
        price?: number;
      }>;
    };
    transfer_data?: {
      recipient_mobile: string;
      recipient_name?: string;
      recipient_email?: string;
    };
  }): Promise<ApiResponse<KashierPaymentConfig>> {
    return retryRequest(async () => {
      // Use full path since payments endpoints are at /api/payments/ not /api/v1/payments/
      // Use apiClient but override baseURL to use absolute path
      const token = await tokenManager.getValidToken().catch(() => null);
      
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Use axios directly with full path and proper token handling
      const axios = (await import("axios")).default;
      const requestData: any = {
        amount: data.amount,
        currency: data.currency || 'EGP',
        payment_type: data.payment_type || 'booking',
      };
      
      if (data.payment_type === 'transfer') {
        // ticket_id is a UUID string, keep it as string
        requestData.ticket_id = data.ticket_id;
        requestData.transfer_data = data.transfer_data;
      } else {
        requestData.event_id = typeof data.event_id === 'string' ? parseInt(data.event_id, 10) : data.event_id;
        requestData.booking_data = data.booking_data;
      }
      
      const response = await axios.post("/api/payments/initialize/", requestData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true, // Include cookies for CSRF if needed
      });
      return handleApiResponse(response);
    });
  }
  /**
   * Process payment
   * POST /api/v1/payments/process/
   */
  static async processPayment(data: {
    transaction_id?: string;
    amount: number;
    payment_method: string;
    event_id?: string;
    ticket_ids?: string[];
    payment_details?: Record<string, any>;
  }): Promise<ApiResponse<{
    transaction_id: string;
    status: string;
    amount: number;
  }>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/payments/process/", data);
      const data_response = handleApiResponse(response);
      // Backend returns { transaction_id, status, amount } directly
      return {
        success: true,
        data: data_response as {
          transaction_id: string;
          status: string;
          amount: number;
        },
      };
    });
  }

  /**
   * Confirm payment
   * POST /api/v1/payments/confirm/
   */
  static async confirmPayment(data: {
    transaction_id: string;
    payment_confirmation?: Record<string, any>;
  }): Promise<ApiResponse<{
    message: string;
    transaction: PaymentTransaction;
  }>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/payments/confirm/", data);
      const data_response = handleApiResponse(response);
      // Backend returns { message, transaction } directly
      return {
        success: true,
        data: data_response as {
          message: string;
          transaction: PaymentTransaction;
        },
      };
    });
  }

  /**
   * Get payment status
   * GET /api/v1/payments/:transaction_id/status/
   */
  static async getPaymentStatus(transactionId: string): Promise<{
    transaction_id: string;
    status: "pending" | "completed" | "failed" | "refunded";
    amount: number;
    payment_method: string;
    created_at: string;
    updated_at: string;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/payments/${transactionId}/status/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Download invoice
   * GET /api/v1/invoices/:transaction_id/
   */
  static async downloadInvoice(transactionId: string): Promise<Blob> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/invoices/${transactionId}/`, {
        responseType: "blob",
      });
      return response.data;
    });
  }

  /**
   * Get user payment history
   * GET /api/v1/users/payment-history/
   */
  static async getPaymentHistory(params?: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    items: PaymentTransaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    return retryRequest(async () => {
      const queryString = buildQueryParams(params || {});
      const url = queryString ? `/users/payment-history/?${queryString}` : "/users/payment-history/";
      const response = await apiClient.get(url);
      return handleApiResponse(response);
    });
  }
}

