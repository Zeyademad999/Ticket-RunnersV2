import {
  apiClient,
  handleApiResponse,
  retryRequest,
} from "../config";

export interface MerchantLocation {
  id: string;
  merchant_name: string;
  phone_number?: string;
  address: string;
  google_maps_link?: string;
}

/**
 * Merchant Locations Service
 * Handles merchant location operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class MerchantLocationsService {
  /**
   * Get all active merchant locations (public endpoint)
   * GET /api/v1/public/merchant-locations/
   */
  static async getLocations(): Promise<MerchantLocation[]> {
    return retryRequest(async () => {
      const response = await apiClient.get("/public/merchant-locations/");
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }
}



