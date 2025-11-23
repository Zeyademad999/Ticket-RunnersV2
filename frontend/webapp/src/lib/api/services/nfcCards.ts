import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import {
  ApiResponse,
  NFCCard,
} from "../types";

/**
 * NFC Cards Service
 * Handles all NFC card-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class NFCCardsService {
  /**
   * Request NFC card
   * POST /api/v1/users/nfc-cards/request/
   */
  static async requestCard(data?: {
    preferred_location?: string;
  }): Promise<ApiResponse<{ message: string; card_request_id: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/nfc-cards/request/", data || {});
      return handleApiResponse(response);
    });
  }

  /**
   * Get user NFC cards list
   * GET /api/v1/users/nfc-cards/
   */
  static async getUserCards(): Promise<NFCCard[]> {
    return retryRequest(async () => {
      const response = await apiClient.get("/users/nfc-cards/");
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Check if user has NFC card (to determine if card fee and renewal cost should be charged)
   * GET /api/v1/users/nfc-cards/status/
   */
  static async getCardStatus(): Promise<{
    has_nfc_card: boolean;
    has_paid_card_fee?: boolean;
    needs_card_fee: boolean;
    needs_renewal_cost: boolean;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get("/users/nfc-cards/status/");
      return handleApiResponse(response);
    });
  }

  /**
   * Reload card balance
   * POST /api/v1/users/nfc-cards/:id/reload/
   */
  static async reloadCard(
    cardId: string,
    data: {
      amount: number;
      payment_method: string;
    }
  ): Promise<ApiResponse<{
    card_id: string;
    new_balance: number;
    transaction_id: string;
  }>> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        `/users/nfc-cards/${cardId}/reload/`,
        data
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get card transaction history
   * GET /api/v1/users/nfc-cards/:id/transactions/
   */
  static async getCardTransactions(
    cardId: string,
    params?: {
      page?: number;
      limit?: number;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<{
    items: Array<{
      id: string;
      transaction_type: "reload" | "purchase" | "refund";
      amount: number;
      balance_after: number;
      description: string;
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
      const queryString = buildQueryParams(params || {});
      const url = queryString
        ? `/users/nfc-cards/${cardId}/transactions/?${queryString}`
        : `/users/nfc-cards/${cardId}/transactions/`;
      const response = await apiClient.get(url);
      return handleApiResponse(response);
    });
  }

  /**
   * Update auto-reload settings
   * POST /api/v1/users/nfc-cards/:id/auto-reload-settings/
   */
  static async updateAutoReloadSettings(
    cardId: string,
    data: {
      enabled: boolean;
      threshold_amount?: number;
      reload_amount?: number;
      payment_method?: string;
    }
  ): Promise<ApiResponse<{
    auto_reload_enabled: boolean;
    threshold_amount?: number;
    reload_amount?: number;
  }>> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        `/users/nfc-cards/${cardId}/auto-reload-settings/`,
        data
      );
      return handleApiResponse(response);
    });
  }
}

