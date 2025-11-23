import { useState, useEffect } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { CustomerBookingItem } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { getSecureToken } from "@/lib/secureStorage";

interface Visit {
  id: number;
  eventTitle: string;
  date: string;
  location: string;
  entranceTime: string;
  dependents: string[];
}

interface UseVisitsReturn {
  visits: Visit[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useVisits = (): UseVisitsReturn => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated using secure storage
      const token = await getSecureToken();
      if (!token) {
        console.warn("No auth token found, skipping visits fetch");
        setVisits([]);
        return;
      }

      // For now, we'll use the customer bookings and filter for past events
      // In the future, this should be a dedicated API endpoint for visit history
      const response = await BookingsService.getCustomerBookings(1, 50);

      // Check if response and items exist
      if (!response || !response.items || !Array.isArray(response.items)) {
        console.warn("Invalid response structure for visits");
        setVisits([]);
        return;
      }

      const now = new Date();

      // Transform booking items to visits (only past events)
      const visitHistory: Visit[] = response.items
        .filter((item) => {
          if (!item.event_date) return false;
          const eventDate = new Date(item.event_date);
          return eventDate < now && item.status === "confirmed";
        })
        .map((item, index) => ({
          id: index + 1,
          eventTitle: item.event_title || "",
          date: item.event_date || "",
          location: item.event_location || "TBD",
          entranceTime: item.event_time || "",
          dependents: [], // This would need to be fetched from a separate endpoint
        }));

      setVisits(visitHistory);
    } catch (err: any) {
      console.error("Error fetching visits:", err);
      setError(err.message || "Failed to fetch visit history");

      // Don't show toast for authentication errors or server errors
      if (err.status !== 401 && err.status !== 403 && err.status !== 500) {
        toast({
          title: "Error",
          description:
            err.message || "Failed to fetch visit history. Please try again.",
          variant: "destructive",
        });
      } else if (err.status === 500) {
        console.warn(
          "Server error fetching visits - this may be a temporary issue"
        );
        // Trigger server error banner
        window.dispatchEvent(new CustomEvent("server-error"));
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchVisits();
  }, []);

  return {
    visits,
    loading,
    error,
    refetch: fetchVisits,
  };
};
