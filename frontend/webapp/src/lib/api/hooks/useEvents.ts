import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EventsService } from "../services/events";
import {
  EventData,
  EventFilters,
  FeaturedEvent,
  EventImage,
  Facility,
  TicketCategory,
} from "../types";

// Query keys
export const eventKeys = {
  all: ["events"] as const,
  lists: () => [...eventKeys.all, "list"] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, "detail"] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  featured: () => [...eventKeys.all, "featured"] as const,
  categories: () => [...eventKeys.all, "categories"] as const,
  category: (category: string) =>
    [...eventKeys.categories(), category] as const,
  organizer: (organizerId: string) =>
    [...eventKeys.all, "organizer", organizerId] as const,
  search: (query: string) => [...eventKeys.all, "search", query] as const,
  analytics: (id: string) => [...eventKeys.detail(id), "analytics"] as const,
  ticketCategories: (id: string) =>
    [...eventKeys.detail(id), "ticket-categories"] as const,
  facilities: (id: string) => [...eventKeys.detail(id), "facilities"] as const,
  images: (id: string) => [...eventKeys.detail(id), "images"] as const,
  statistics: () => [...eventKeys.all, "statistics"] as const,
  upcoming: () => [...eventKeys.all, "upcoming"] as const,
  dateRange: (startDate: string, endDate: string) =>
    [...eventKeys.all, "date-range", startDate, endDate] as const,
  location: (location: string) =>
    [...eventKeys.all, "location", location] as const,
  priceRange: (minPrice: number, maxPrice: number) =>
    [...eventKeys.all, "price-range", minPrice, maxPrice] as const,
};

/**
 * Hook to get all events with pagination and filtering
 */
export const useEvents = (
  page: number = 1,
  limit: number = 10,
  filters?: EventFilters
) => {
  return useQuery({
    queryKey: eventKeys.list({ page, limit, ...filters }),
    queryFn: () => EventsService.getEvents(page, limit, filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get event by ID
 */
export const useEvent = (id: string) => {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => EventsService.getEventById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get featured events
 */
export const useFeaturedEvents = () => {
  return useQuery({
    queryKey: eventKeys.featured(),
    queryFn: () => EventsService.getFeaturedEvents(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get events by category
 */
export const useEventsByCategory = (
  category: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: eventKeys.category(category),
    queryFn: () => EventsService.getEventsByCategory(category, page, limit),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get events by organizer
 */
export const useEventsByOrganizer = (
  organizerId: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: eventKeys.organizer(organizerId),
    queryFn: () => EventsService.getEventsByOrganizer(organizerId, page, limit),
    enabled: !!organizerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to search events
 */
export const useSearchEvents = (
  query: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: eventKeys.search(query),
    queryFn: () => EventsService.searchEvents(query, page, limit),
    enabled: !!query && query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get event analytics
 */
export const useEventAnalytics = (eventId: string) => {
  return useQuery({
    queryKey: eventKeys.analytics(eventId),
    queryFn: () => EventsService.getEventAnalytics(eventId),
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get event ticket categories
 */
export const useEventTicketCategories = (eventId: string) => {
  return useQuery({
    queryKey: eventKeys.ticketCategories(eventId),
    queryFn: () => EventsService.getEventTicketCategories(eventId),
    enabled: !!eventId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to get upcoming events
 */
export const useUpcomingEvents = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: () => EventsService.getUpcomingEvents(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get events by date range
 */
export const useEventsByDateRange = (
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: eventKeys.dateRange(startDate, endDate),
    queryFn: () =>
      EventsService.getEventsByDateRange(startDate, endDate, page, limit),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get events by location
 */
export const useEventsByLocation = (
  location: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: eventKeys.location(location),
    queryFn: () => EventsService.getEventsByLocation(location, page, limit),
    enabled: !!location,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get events by price range
 */
export const useEventsByPriceRange = (
  minPrice: number,
  maxPrice: number,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: eventKeys.priceRange(minPrice, maxPrice),
    queryFn: () =>
      EventsService.getEventsByPriceRange(minPrice, maxPrice, page, limit),
    enabled: minPrice >= 0 && maxPrice > minPrice,
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

/**
 * Hook to get event statistics
 */
export const useEventStatistics = () => {
  return useQuery({
    queryKey: eventKeys.statistics(),
    queryFn: () => EventsService.getEventStatistics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Mutations

/**
 * Hook to create event
 */
export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventData: Partial<EventData>) =>
      EventsService.createEvent(eventData),
    onSuccess: () => {
      // Invalidate all event lists
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.featured() });
      queryClient.invalidateQueries({ queryKey: eventKeys.statistics() });
    },
    onError: (error: any) => {
      console.error("Create event failed:", error);
    },
  });
};

/**
 * Hook to update event
 */
export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      eventData,
    }: {
      id: string;
      eventData: Partial<EventData>;
    }) => EventsService.updateEvent(id, eventData),
    onSuccess: (data, { id }) => {
      // Update the specific event in cache
      queryClient.setQueryData(eventKeys.detail(id), data);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.featured() });
      queryClient.invalidateQueries({ queryKey: eventKeys.statistics() });
    },
    onError: (error: any) => {
      console.error("Update event failed:", error);
    },
  });
};

/**
 * Hook to delete event
 */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => EventsService.deleteEvent(id),
    onSuccess: (_, id) => {
      // Remove the event from cache
      queryClient.removeQueries({ queryKey: eventKeys.detail(id) });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventKeys.featured() });
      queryClient.invalidateQueries({ queryKey: eventKeys.statistics() });
    },
    onError: (error: any) => {
      console.error("Delete event failed:", error);
    },
  });
};

/**
 * Hook to upload event image
 */
export const useUploadEventImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      file,
      isPrimary,
    }: {
      eventId: string;
      file: File;
      isPrimary?: boolean;
    }) => EventsService.uploadEventImage(eventId, file, isPrimary),
    onSuccess: (_, { eventId }) => {
      // Invalidate event details and images
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.images(eventId) });
    },
    onError: (error: any) => {
      console.error("Upload event image failed:", error);
    },
  });
};

/**
 * Hook to delete event image
 */
export const useDeleteEventImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, imageId }: { eventId: string; imageId: string }) =>
      EventsService.deleteEventImage(eventId, imageId),
    onSuccess: (_, { eventId }) => {
      // Invalidate event details and images
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.images(eventId) });
    },
    onError: (error: any) => {
      console.error("Delete event image failed:", error);
    },
  });
};

/**
 * Hook to update event facilities
 */
export const useUpdateEventFacilities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      facilities,
    }: {
      eventId: string;
      facilities: Facility[];
    }) => EventsService.updateEventFacilities(eventId, facilities),
    onSuccess: (_, { eventId }) => {
      // Invalidate event details and facilities
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({
        queryKey: eventKeys.facilities(eventId),
      });
    },
    onError: (error: any) => {
      console.error("Update event facilities failed:", error);
    },
  });
};

/**
 * Hook to update event ticket categories
 */
export const useUpdateEventTicketCategories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      categories,
    }: {
      eventId: string;
      categories: TicketCategory[];
    }) => EventsService.updateEventTicketCategories(eventId, categories),
    onSuccess: (_, { eventId }) => {
      // Invalidate event details and ticket categories
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({
        queryKey: eventKeys.ticketCategories(eventId),
      });
    },
    onError: (error: any) => {
      console.error("Update event ticket categories failed:", error);
    },
  });
};

/**
 * Hook to toggle event featured status
 */
export const useToggleEventFeatured = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => EventsService.toggleEventFeatured(eventId),
    onSuccess: (data, eventId) => {
      // Update the specific event in cache
      queryClient.setQueryData(eventKeys.detail(eventId), data);

      // Invalidate featured events and lists
      queryClient.invalidateQueries({ queryKey: eventKeys.featured() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
    onError: (error: any) => {
      console.error("Toggle event featured failed:", error);
    },
  });
};
