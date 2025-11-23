import { useState } from "react";
import { FavoritesService } from "@/lib/api/services/favorites";
import {
  AddToFavoritesRequest,
  AddToFavoritesResponse,
  RemoveFromFavoritesResponse,
} from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";

interface UseFavoritesReturn {
  addToFavorites: (eventId: string) => Promise<boolean>;
  removeFromFavorites: (eventId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useFavorites = (): UseFavoritesReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToFavorites = async (eventId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate eventId
      if (!eventId || typeof eventId !== "string") {
        throw new Error("Invalid event ID");
      }

      // Convert string eventId to number for the API
      const eventIdNumber = parseInt(eventId, 10);
      if (isNaN(eventIdNumber) || eventIdNumber < 1) {
        throw new Error("Invalid event ID format");
      }

      const requestData: AddToFavoritesRequest = {
        event_id: eventIdNumber,
      };

      const response: AddToFavoritesResponse =
        await FavoritesService.addToFavorites(requestData);

      if (response.favorited) {
        toast({
          title: "Added to Favorites",
          description: "Event has been added to your favorites successfully.",
        });
        return true;
      } else {
        throw new Error("Failed to add event to favorites");
      }
    } catch (err: any) {
      console.error("Error adding to favorites:", err);
      setError(err.message || "Failed to add to favorites");

      toast({
        title: "Failed to Add to Favorites",
        description:
          err.message || "Failed to add event to favorites. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (eventId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate eventId
      if (!eventId || typeof eventId !== "string") {
        throw new Error("Invalid event ID");
      }

      // Convert string eventId to number for the API
      const eventIdNumber = parseInt(eventId, 10);
      if (isNaN(eventIdNumber) || eventIdNumber < 1) {
        throw new Error("Invalid event ID format");
      }

      const response: RemoveFromFavoritesResponse =
        await FavoritesService.removeFromFavorites(eventId);

      if (!response.favorited) {
        toast({
          title: "Removed from Favorites",
          description:
            "Event has been removed from your favorites successfully.",
        });
        return true;
      } else {
        throw new Error("Failed to remove event from favorites");
      }
    } catch (err: any) {
      console.error("Error removing from favorites:", err);
      setError(err.message || "Failed to remove from favorites");

      toast({
        title: "Failed to Remove from Favorites",
        description:
          err.message ||
          "Failed to remove event from favorites. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    addToFavorites,
    removeFromFavorites,
    loading,
    error,
  };
};
