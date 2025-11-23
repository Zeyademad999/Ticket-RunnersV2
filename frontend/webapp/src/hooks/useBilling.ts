import { useState, useEffect } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { CustomerBookingItem } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { getSecureToken } from "@/lib/secureStorage";

interface BillingItem {
  id: number;
  date: string;
  eventTitle: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  invoiceId: string;
}

interface UseBillingReturn {
  billingHistory: BillingItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useBilling = (): UseBillingReturn => {
  const [billingHistory, setBillingHistory] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBillingHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated using secure storage
      const token = await getSecureToken();
      if (!token) {
        console.warn("No auth token found, skipping billing history fetch");
        setBillingHistory([]);
        return;
      }

      // For now, we'll use the customer bookings to create billing history
      // In the future, this should be a dedicated API endpoint for billing/payment history
      const response = await BookingsService.getCustomerBookings(1, 50);

      // Check if response and items exist
      if (!response || !response.items || !Array.isArray(response.items)) {
        console.warn("Invalid response structure for billing history");
        setBillingHistory([]);
        return;
      }

      // Transform booking items to billing history
      const billingItems: BillingItem[] = response.items.map((item, index) => ({
        id: index + 1,
        date: item.event_date || "",
        eventTitle: item.event_title || "",
        amount: item.total_amount || 0,
        currency: "EGP", // This should come from the API
        status:
          item.status === "confirmed"
            ? "paid"
            : item.status === "pending"
            ? "pending"
            : "failed",
        invoiceId: `INV-${(item.id || "").slice(-6).toUpperCase()}`, // Generate invoice ID from booking ID
      }));

      setBillingHistory(billingItems);
    } catch (err: any) {
      console.error("Error fetching billing history:", err);
      setError(err.message || "Failed to fetch billing history");

      // Don't show toast for authentication errors or server errors
      if (err.status !== 401 && err.status !== 403 && err.status !== 500) {
        toast({
          title: "Error",
          description:
            err.message || "Failed to fetch billing history. Please try again.",
          variant: "destructive",
        });
      } else if (err.status === 500) {
        console.warn(
          "Server error fetching billing history - this may be a temporary issue"
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
    fetchBillingHistory();
  }, []);

  return {
    billingHistory,
    loading,
    error,
    refetch: fetchBillingHistory,
  };
};
