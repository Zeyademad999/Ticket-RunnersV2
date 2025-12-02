import { useState, useEffect, useCallback } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { CustomerCardDetailsResponse } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { useDebouncedApi } from "./useDebouncedApi";
import { getSecureToken } from "@/lib/secureStorage";

interface UseCustomerCardDetailsReturn {
  cardDetails: CustomerCardDetailsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCustomerCardDetails = (): UseCustomerCardDetailsReturn => {
  const [cardDetails, setCardDetails] =
    useState<CustomerCardDetailsResponse | null>(null);

  const apiCall = useCallback(async () => {
    // Check if user is authenticated using secure storage
    const token = await getSecureToken();
    if (!token) {
      console.warn("No auth token found, skipping card details fetch");
      return null;
    }

    return await BookingsService.getCustomerCardDetails();
  }, []);

  const { data, loading, error, retry } = useDebouncedApi(apiCall, [], {
    delay: 300,
    maxRetries: 2,
  });

  const fetchCardDetails = useCallback(async () => {
    retry();
  }, [retry]);

  // Update card details when data changes
  useEffect(() => {
    if (data) {
      // Check if response exists and has required fields
      if (!data) {
        console.warn("Invalid response structure for card details");
        setCardDetails(null);
        return;
      }

      setCardDetails(data);
    }
  }, [data]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Error fetching customer card details:", error);

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
            error.message ||
            "Failed to fetch your card details. Please try again.",
          variant: "destructive",
        });
      } else if (error.message && error.message.includes("500")) {
        console.warn(
          "Server error fetching card details - this may be a temporary issue"
        );
        // Trigger server error banner
        window.dispatchEvent(
          new CustomEvent("server-error", {
            detail: { context: "Customer Card Details", error: error.message },
          })
        );
      }
    }
  }, [error]);

  return {
    cardDetails,
    loading,
    error: error?.message || null,
    refetch: fetchCardDetails,
  };
};
