import { useState, useEffect, useCallback, useRef } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import {
  CustomerBookingItem,
  CustomerCardDetailsResponse,
} from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { FallbackService } from "@/lib/api/fallbackService";
import { tokenManager } from "@/lib/tokenManager";

// Types for transformed data
interface DependantTicket {
  id: number;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  ticketPrice: number;
  quantity: number;
  qrEnabled: boolean;
  status: "pending" | "claimed";
  dependentName?: string;
  dependentMobile?: string;
}

interface Visit {
  id: number;
  eventTitle: string;
  date: string;
  location: string;
  entranceTime: string;
  dependents: string[];
}

interface BillingItem {
  id: number;
  date: string;
  eventTitle: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  invoiceId: string;
}

interface UnifiedProfileData {
  bookings: CustomerBookingItem[];
  dependants: DependantTicket[];
  visits: Visit[];
  billingHistory: BillingItem[];
  cardDetails: CustomerCardDetailsResponse | null;
  favoriteEvents: any[];
}

interface UseUnifiedProfileDataReturn {
  data: UnifiedProfileData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isDataLoaded: boolean;
}

export const useUnifiedProfileData = (): UseUnifiedProfileDataReturn => {
  const [data, setData] = useState<UnifiedProfileData>({
    bookings: [],
    dependants: [],
    visits: [],
    billingHistory: [],
    cardDetails: null,
    favoriteEvents: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  // Transform bookings data into different views - moved outside to prevent recreation
  const transformBookingsData = (bookings: CustomerBookingItem[]) => {
    const now = new Date();

    // Dependants are now fetched from a separate endpoint (user_dependants_tickets)
    // No need to transform from bookings anymore
    const dependants: DependantTicket[] = [];

    // Transform to visits (past events with confirmed status)
    const visits: Visit[] = bookings
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

    // Transform to billing history
    const billingHistory: BillingItem[] = bookings.map((item, index) => ({
      id: index + 1,
      date: item.event_date || "",
      eventTitle: item.event_title || "",
      amount: item.total_amount || 0,
      currency: "EGP",
      status:
        item.status === "confirmed"
          ? "paid"
          : item.status === "pending"
          ? "pending"
          : "failed",
      invoiceId: `INV-${(item.id || "").slice(-6).toUpperCase()}`,
    }));

    return { dependants, visits, billingHistory };
  };

  const fetchAllProfileData = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated using tokenManager
      const isAuthenticated = await tokenManager.isAuthenticated();

      if (!isAuthenticated) {
        console.log("User not authenticated, skipping profile data fetch");
        setData({
          bookings: [],
          dependants: [],
          visits: [],
          billingHistory: [],
          cardDetails: null,
          favoriteEvents: [],
        });
        return;
      }

      // Get valid token for API calls
      const token = await tokenManager.getValidToken();
      if (!token) {
        console.log("No valid token available, skipping profile data fetch");
        setData({
          bookings: [],
          dependants: [],
          visits: [],
          billingHistory: [],
          cardDetails: null,
          favoriteEvents: [],
        });
        return;
      }

      // Import services dynamically to avoid circular dependencies
      const { FavoritesService } = await import("@/lib/api/services/favorites");
      
      // Fetch bookings, dependants tickets, card details, and favorites in parallel
      const [bookingsResponse, dependantsResponse, cardDetailsResponse, favoritesResponse] =
        await Promise.allSettled([
          BookingsService.getCustomerBookings(1, 50),
          BookingsService.getDependantsTickets(1, 50),
          BookingsService.getCustomerCardDetails(), // Use the correct endpoint that returns dates
          FavoritesService.getFavorites({ page: 1, limit: 50 }),
        ]);

      // Process bookings data with better error handling
      let bookings: CustomerBookingItem[] = [];
      let useFallbackBookings = false;

      if (
        bookingsResponse.status === "fulfilled" &&
        bookingsResponse.value?.items
      ) {
        bookings = bookingsResponse.value.items;
      } else if (bookingsResponse.status === "rejected") {
        const error = bookingsResponse.reason;
        // Use fallback data for database errors
        if (FallbackService.shouldUseFallback(error)) {
          bookings = FallbackService.getFallbackBookings();
          useFallbackBookings = true;
        } else {
          bookings = [];
        }
      }

      // Process dependants tickets data with better error handling
      let dependantsTickets: CustomerBookingItem[] = [];
      let useFallbackDependants = false;

      if (
        dependantsResponse.status === "fulfilled" &&
        dependantsResponse.value?.items
      ) {
        dependantsTickets = dependantsResponse.value.items;
      } else if (dependantsResponse.status === "rejected") {
        const error = dependantsResponse.reason;
        // Use fallback data for database errors
        if (FallbackService.shouldUseFallback(error)) {
          dependantsTickets = [];
          useFallbackDependants = true;
        } else {
          dependantsTickets = [];
        }
      }

      // Process card details with better error handling
      let cardDetails: CustomerCardDetailsResponse | null = null;
      let useFallbackCard = false;

      if (cardDetailsResponse.status === "fulfilled") {
        cardDetails = cardDetailsResponse.value;
      } else if (cardDetailsResponse.status === "rejected") {
        const error = cardDetailsResponse.reason;
        // Use fallback data for database errors
        if (FallbackService.shouldUseFallback(error)) {
          cardDetails = FallbackService.getFallbackCardDetails();
          useFallbackCard = true;
        } else {
          cardDetails = null;
        }
      }

      // Process favorites data with better error handling
      let favoriteEvents: any[] = [];
      let useFallbackFavorites = false;

      if (favoritesResponse.status === "fulfilled") {
        const favoritesData = favoritesResponse.value;
        // Handle both array response (from backend) and GetFavoritesResponse format
        if (Array.isArray(favoritesData)) {
          favoriteEvents = favoritesData;
        } else if (favoritesData?.favorites && Array.isArray(favoritesData.favorites)) {
          favoriteEvents = favoritesData.favorites;
        } else {
          favoriteEvents = [];
        }
      } else if (favoritesResponse.status === "rejected") {
        const error = favoritesResponse.reason;
        // Use fallback data for database errors
        if (FallbackService.shouldUseFallback(error)) {
          favoriteEvents = FallbackService.getFallbackFavorites();
          useFallbackFavorites = true;
        } else {
          favoriteEvents = [];
        }
      }

      // Transform the data
      const transformed = transformBookingsData(bookings);

      // Transform dependants tickets to DependantTicket format (individual tickets, not grouped)
      const dependants: DependantTicket[] = dependantsTickets.map((item, index) => ({
        id: item.ticket_id || item.id || `ticket-${index}`,
        eventTitle: item.event_title || "",
        date: item.event_date || "",
        time: item.event_time || "",
        location: item.event_location || "TBD",
        ticketPrice: item.price || 0,  // Individual ticket price, not total
        quantity: 1,  // Each ticket is shown individually, so quantity is always 1
        qrEnabled: item.status === "confirmed" || item.status === "valid",
        status: item.is_claimed || item.status === "claimed" ? "claimed" : "pending",
        dependentName: item.dependent_name || item.assigned_name || "",
        dependentMobile: item.dependent_mobile || item.assigned_mobile || "",
        category: item.category || "",
      }));

      // Update state with all data (even if some failed)
      setData({
        bookings,
        dependants: dependants, // Use dependants from separate endpoint
        visits: transformed.visits,
        billingHistory: transformed.billingHistory,
        cardDetails,
        favoriteEvents,
      });

      // Show appropriate messages based on fallback usage
      if (useFallbackBookings || useFallbackDependants || useFallbackCard || useFallbackFavorites) {
        const message = FallbackService.getErrorMessage(
          useFallbackBookings
            ? bookingsResponse.reason
            : useFallbackDependants
            ? dependantsResponse.reason
            : useFallbackCard
            ? cardDetailsResponse.reason
            : favoritesResponse.reason
        );

        toast({
          title: "Limited Service",
          description: message,
          variant: "default",
        });
      } else if (
        bookingsResponse.status === "rejected" &&
        dependantsResponse.status === "rejected" &&
        cardDetailsResponse.status === "rejected" &&
        favoritesResponse.status === "rejected" &&
        !useFallbackBookings &&
        !useFallbackDependants &&
        !useFallbackCard &&
        !useFallbackFavorites
      ) {
        setError("Unable to load profile data. Please try again later.");
        toast({
          title: "Connection Error",
          description:
            "Unable to load your profile data. Some features may not be available.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error fetching unified profile data:", err);
      setError(err.message || "Failed to fetch profile data");

      // Show toast for non-authentication errors
      if (err.status !== 401 && err.status !== 403 && err.status !== 500) {
        toast({
          title: "Error",
          description:
            err.message || "Failed to fetch profile data. Please try again.",
          variant: "destructive",
        });
      } else if (err.status === 500) {
        console.warn(
          "Server error fetching profile data - this may be a temporary issue"
        );
        // Trigger server error banner
        window.dispatchEvent(
          new CustomEvent("server-error", {
            detail: { context: "Profile Data", error: err.message },
          })
        );
      }
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, []); // Remove dependency to prevent recreation

  // Initial fetch - only run once on mount
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAllProfileData();
    }
  }, []); // Empty dependency array to run only once

  const isDataLoaded = data.bookings.length > 0 || data.cardDetails !== null;

  return {
    data,
    loading,
    error,
    refetch: fetchAllProfileData,
    isDataLoaded,
  };
};
