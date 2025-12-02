import { useState, useCallback } from "react";
import { EventsService } from "../services/events";
import { EventData } from "../types";

export interface UseEventDetailsReturn {
  event: EventData | null;
  loading: boolean;
  error: string | null;
  fetchEvent: (id: string) => Promise<void>;
  clearEvent: () => void;
}

export function useEventDetails(): UseEventDetailsReturn {
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Fetching event details for ID:", id);
      const eventData = await EventsService.getEventDetails(id);
      console.log("Event details response:", eventData);
      setEvent(eventData);
    } catch (err) {
      console.error("Fetch event details error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch event details"
      );
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearEvent = useCallback(() => {
    setEvent(null);
    setError(null);
  }, []);

  return {
    event,
    loading,
    error,
    fetchEvent,
    clearEvent,
  };
}
