import { useState, useCallback } from "react";
import { EventsService } from "../services/events";
import { FilterEventsRequest, FilterEventsResponse } from "../types";

export interface UseEventFiltersReturn {
  events: FilterEventsResponse["events"];
  pagination: FilterEventsResponse["pagination"];
  loading: boolean;
  error: string | null;
  filterEvents: (filters: FilterEventsRequest) => Promise<void>;
  clearFilters: () => void;
}

export function useEventFilters(): UseEventFiltersReturn {
  const [events, setEvents] = useState<FilterEventsResponse["events"]>([]);
  const [pagination, setPagination] = useState<
    FilterEventsResponse["pagination"]
  >({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
    has_more: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterEvents = useCallback(async (filters: FilterEventsRequest) => {
    setLoading(true);
    setError(null);

    try {
      console.log("Filtering events with:", filters);
      // Use the public events endpoint to fetch all events from admin dashboard
      const response = await EventsService.getEvents({
        category: filters.category_id?.toString(),
        location: filters.venue_id?.toString(),
        date_from: filters.date_from,
        date_to: filters.date_to,
        search: filters.search,
      });
      console.log("API response:", response);
      
      // Transform to FilterEventsResponse format
      const events = response.map((event: any) => ({
        id: event.id,
        title: event.title,
        event_date: event.date,
        event_time: event.time,
        event_location: event.location || event.venue_address || "",
        thumbnail_path: event.thumbnail_path || "",
        category_id: event.category_id,
        category_name: event.category_name,
        featured: event.featured || false,
        starting_price: event.starting_price || null,
      }));
      
      // Apply pagination manually
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEvents = events.slice(startIndex, endIndex);
      
      setEvents(paginatedEvents);
      setPagination({
        current_page: page,
        per_page: limit,
        total: events.length,
        last_page: Math.ceil(events.length / limit),
        has_more: endIndex < events.length,
      });
    } catch (err) {
      console.error("Filter events error:", err);
      setError(err instanceof Error ? err.message : "Failed to filter events");
      setEvents([]);
      setPagination({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        has_more: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setEvents([]);
    setPagination({
      current_page: 1,
      per_page: 20,
      total: 0,
      last_page: 1,
      has_more: false,
    });
    setError(null);
  }, []);

  return {
    events,
    pagination,
    loading,
    error,
    filterEvents,
    clearFilters,
  };
}
