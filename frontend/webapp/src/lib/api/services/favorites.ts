import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import {
  ApiResponse,
  AddToFavoritesRequest,
  AddToFavoritesResponse,
  RemoveFromFavoritesResponse,
  GetFavoritesResponse,
  FavoriteEvent,
} from "../types";

/**
 * Favorites Service
 * Handles all favorite-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class FavoritesService {
  /**
   * Get user favorites list
   * GET /api/v1/users/favorites/
   * Backend returns array directly, we transform it to match GetFavoritesResponse format
   */
  static async getFavorites(params?: {
    page?: number;
    limit?: number;
  }): Promise<GetFavoritesResponse> {
    return retryRequest(async () => {
      const queryString = buildQueryParams(params || {});
      const url = queryString ? `/users/favorites/?${queryString}` : "/users/favorites/";
      const response = await apiClient.get(url);
      const data = handleApiResponse(response);
      
      // Backend returns array directly, transform to GetFavoritesResponse format
      const favorites = Array.isArray(data) ? data : [];
      return {
        favorites: favorites.map((fav: any) => ({
          id: fav.id,
          event_id: fav.event?.id || fav.event_id,
          event_title: fav.event_title || fav.event?.title || "",
          event_date: fav.event?.date || "",
          event_time: fav.event?.time || "",
          event_location: fav.event?.location || "",
          event_price: fav.event?.price || 0,
          event_category: fav.event?.category?.name || "",
          event_image: fav.event?.thumbnail_path || "",
          favorite_time: fav.created_at || new Date().toISOString(),
        })),
        total: favorites.length,
        page: params?.page || 1,
        limit: params?.limit || 50,
      };
    });
  }

  /**
   * Add event to favorites
   * POST /api/v1/users/favorites/
   */
  static async addToFavorites(
    data: AddToFavoritesRequest
  ): Promise<AddToFavoritesResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/favorites/", data);
      return handleApiResponse(response);
    });
  }

  /**
   * Remove event from favorites
   * DELETE /api/v1/users/favorites/:event_id/
   */
  static async removeFromFavorites(
    eventId: string | number
  ): Promise<RemoveFromFavoritesResponse> {
    return retryRequest(async () => {
      // Convert eventId to integer if it's a string
      const id = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId;
      const response = await apiClient.delete(`/users/favorites/${id}/`);
      return handleApiResponse(response);
    });
  }
}

