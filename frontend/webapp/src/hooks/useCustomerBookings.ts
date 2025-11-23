import { useState, useEffect, useCallback } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { CustomerBookingsResponse, CustomerBookingItem } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { useDebouncedApi } from "./useDebouncedApi";
import { getSecureToken } from "@/lib/secureStorage";

interface UseCustomerBookingsReturn {
  bookings: CustomerBookingItem[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    count: number;
  };
  fetchBookings: (page?: number, limit?: number) => Promise<void>;
  hasMore: boolean;
}

export const useCustomerBookings = (
  initialPage: number = 1,
  initialLimit: number = 10
): UseCustomerBookingsReturn => {
  const [bookings, setBookings] = useState<CustomerBookingItem[]>([]);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    count: 0,
  });

  const apiCall = useCallback(async () => {
    // Check if user is authenticated using secure storage
    const token = await getSecureToken();
    if (!token) {
      console.warn("No auth token found, skipping bookings fetch");
      return { items: [], page: "1", limit: "10", count: "0" };
    }

    return await BookingsService.getCustomerBookings(
      pagination.page,
      pagination.limit
    );
  }, [pagination.page, pagination.limit]);

  const { data, loading, error, retry } = useDebouncedApi(
    apiCall,
    [pagination.page, pagination.limit],
    { delay: 500, maxRetries: 2 }
  );

  const fetchBookings = useCallback(
    async (page: number = 1, limit: number = 10) => {
      setPagination((prev) => ({ ...prev, page, limit }));
    },
    []
  );

  // Update bookings when data changes
  useEffect(() => {
    if (data) {
      // Check if response and items exist
      if (!data || !data.items || !Array.isArray(data.items)) {
        console.warn("Invalid response structure for customer bookings");
        setBookings([]);
        return;
      }

      // Transform API response to match the expected format
      const transformedBookings: CustomerBookingItem[] = data.items.map(
        (item) => ({
          ...item,
          // Ensure all required fields are present
          id: item.id || "",
          event_id: item.event_id || "",
          event_title: item.event_title || "",
          event_date: item.event_date || "",
          event_time: item.event_time || "",
          event_location: item.event_location || "",
          order_id: item.order_id || "",
          ticket_category: item.ticket_category || "",
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          total_amount: item.total_amount || 0,
          purchase_date: item.purchase_date || "",
          status: item.status || "confirmed",
          qr_enabled: item.qr_enabled || false,
          check_in_time: item.check_in_time,
          dependents: item.dependents || [],
        })
      );

      if (pagination.page === 1) {
        setBookings(transformedBookings);
      } else {
        setBookings((prev) => [...prev, ...transformedBookings]);
      }

      setPagination((prev) => ({
        ...prev,
        page: parseInt(data.page || "1"),
        limit: parseInt(data.limit || "10"),
        count: parseInt(data.count || "0"),
      }));
    }
  }, [data, pagination.page]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Error fetching customer bookings:", error);

      // Don't show toast for authentication errors or server errors
      if (
        error.message &&
        !error.message.includes("401") &&
        !error.message.includes("403") &&
        !error.message.includes("500")
      ) {
        toast({
          title: "Error",
          description:
            error.message || "Failed to fetch your bookings. Please try again.",
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("500")) {
        console.warn(
          "Server error fetching customer bookings - this may be a temporary issue"
        );
        // Trigger server error banner
        window.dispatchEvent(
          new CustomEvent("server-error", {
            detail: { context: "Customer Bookings", error: error.message },
          })
        );
      }
    }
  }, [error]);

  const hasMore = bookings.length < pagination.count;

  return {
    bookings,
    loading,
    error: error?.message || null,
    pagination,
    fetchBookings,
    hasMore,
  };
};
