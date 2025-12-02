import { useState, useEffect } from "react";
import { DependentsService } from "@/lib/api/services/dependents";
import { Dependent } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { getSecureToken } from "@/lib/secureStorage";

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
}

interface UseDependantsReturn {
  dependants: DependantTicket[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDependants = (): UseDependantsReturn => {
  const [dependants, setDependants] = useState<DependantTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDependants = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if user is authenticated using secure storage
      const token = await getSecureToken();
      if (!token) {
        console.warn("No auth token found, skipping dependants fetch");
        setDependants([]);
        return;
      }

      // Use the dedicated dependents API endpoint
      const dependents: Dependent[] = await DependentsService.getDependents();

      // Transform dependents to dependant tickets format
      const dependantTickets: DependantTicket[] = dependents.map((dependent, index) => ({
          id: index + 1,
        eventTitle: dependent.name || "",
        date: dependent.date_of_birth || "",
        time: "",
        location: "TBD",
        ticketPrice: 0,
        quantity: 1,
        qrEnabled: false,
        status: "pending" as const,
        }));

      setDependants(dependantTickets);
    } catch (err: any) {
      console.error("Error fetching dependants:", err);
      setError(err.message || "Failed to fetch dependant tickets");

      // Don't show toast for authentication errors or server errors
      if (err.status !== 401 && err.status !== 403 && err.status !== 500) {
        toast({
          title: "Error",
          description:
            err.message ||
            "Failed to fetch dependant tickets. Please try again.",
          variant: "destructive",
        });
      } else if (err.status === 500) {
        console.warn(
          "Server error fetching dependants - this may be a temporary issue"
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
    fetchDependants();
  }, []);

  return {
    dependants,
    loading,
    error,
    refetch: fetchDependants,
  };
};
