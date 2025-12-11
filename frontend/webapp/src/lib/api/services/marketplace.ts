import {
  apiClient,
  handleApiResponse,
  retryRequest,
} from "../config";
import { ApiResponse } from "../types";

/**
 * Marketplace Service
 * Handles all marketplace-related operations
 * Base URL: /api/v1/
 */

export interface MarketplaceListing {
  id: string;
  ticket_id: string;
  ticket_number: string;
  ticket_category: string;
  ticket_price: number;
  ticket_status: string;
  event_id: number;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_category: string | null;
  event_image: string | null;
  seller_name: string;
  seller_mobile: string | null; // null for non-authenticated users
  seller_email: string | null; // null for non-authenticated users
  seller_price: number | null; // Price set by seller for this listing
  listed_at: string;
  is_active: boolean;
  terms_accepted_at: string | null;
  is_my_listing?: boolean; // true if this listing belongs to the current user
}

export interface MarketplaceListingsResponse {
  results: MarketplaceListing[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface MarketplaceFilterOptions {
  categories: Array<{ id: number; name: string }>;
  venues: Array<{ id: number; name: string; city: string }>;
  ticket_categories: string[];
  price_range: {
    min: number;
    max: number;
  };
}

export interface MarketplaceListingsParams {
  event_id?: number;
  event_category_id?: number;
  ticket_category?: string;
  price_min?: number;
  price_max?: number;
  event_date_start?: string;
  event_date_end?: string;
  venue_id?: number;
  location?: string;
  search?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc' | 'listed_recent';
  page?: number;
  limit?: number;
}

export class MarketplaceService {
  /**
   * Get marketplace listings
   * GET /api/v1/marketplace/listings/
   */
  static async getMarketplaceListings(
    params?: MarketplaceListingsParams
  ): Promise<ApiResponse<MarketplaceListingsResponse>> {
    return retryRequest(async () => {
      const response = await apiClient.get("/marketplace/listings/", {
        params,
      });
      return handleApiResponse(response);
    });
  }

  /**
   * List a ticket on marketplace
   * POST /api/v1/marketplace/listings/
   */
  static async listTicket(
    ticketId: string,
    termsAccepted: boolean,
    sellerPrice: number
  ): Promise<ApiResponse<MarketplaceListing>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/marketplace/listings/", {
        ticket_id: ticketId,
        terms_accepted: termsAccepted,
        seller_price: sellerPrice,
      });
      return handleApiResponse(response);
    });
  }

  /**
   * Remove a listing
   * DELETE /api/v1/marketplace/listings/:id/
   */
  static async removeListing(
    listingId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete(`/marketplace/listings/${listingId}/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Get current user's listings
   * GET /api/v1/marketplace/my-listings/
   */
  static async getMyListings(): Promise<ApiResponse<MarketplaceListing[]>> {
    return retryRequest(async () => {
      const response = await apiClient.get("/marketplace/my-listings/");
      return handleApiResponse(response);
    });
  }

  /**
   * Get filter options
   * GET /api/v1/marketplace/filter-options/
   */
  static async getFilterOptions(): Promise<ApiResponse<MarketplaceFilterOptions>> {
    return retryRequest(async () => {
      const response = await apiClient.get("/marketplace/filter-options/");
      return handleApiResponse(response);
    });
  }

  /**
   * Get marketplace settings (for public access to max price)
   * GET /api/v1/marketplace/settings/
   */
  static async getMarketplaceSettings(): Promise<ApiResponse<{
    max_allowed_price: number;
    updated_at?: string;
    updated_by?: string | null;
  }>> {
    return retryRequest(async () => {
      // Note: This endpoint requires admin auth, but we can make it public for read access
      // For now, we'll handle it in the component by fetching event details which include marketplace_max_price
      // If event doesn't have marketplace_max_price, we'll need to make this endpoint public
      const response = await apiClient.get("/marketplace/settings/");
      return handleApiResponse(response);
    });
  }
}

