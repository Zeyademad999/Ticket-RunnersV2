import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import {
  ApiResponse,
  PaginatedResponse,
  EventData,
  EventAnalytics,
  EventImage,
  Facility,
  TicketCategory,
  SearchEventsResponse,
  FilterEventsRequest,
  FilterEventsResponse,
} from "../types";

export class EventsService {
  /**
   * Get all public events with filtering
   * GET /api/v1/public/events/
   */
  static async getEvents(
    filters?: {
      category?: string;
      location?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    }
  ): Promise<EventData[]> {
    return retryRequest(async () => {
      const params = buildQueryParams(filters || {});
      const url = params ? `/public/events/?${params}` : "/public/events/";
      const response = await apiClient.get(url);
      const data = handleApiResponse(response);
      // Backend returns array directly
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Get featured events
   * GET /api/v1/public/events/featured/
   */
  static async getFeaturedEvents(): Promise<EventData[]> {
    return retryRequest(async () => {
      const response = await apiClient.get("/public/events/featured/");
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Get event categories
   * GET /api/v1/public/events/categories/
   */
  static async getEventCategories(): Promise<string[]> {
    return retryRequest(async () => {
      const response = await apiClient.get("/public/events/categories/");
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Get event by ID
   * GET /api/v1/public/events/:id/
   */
  static async getEventById(id: string): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/public/events/${id}/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Get individual event details by ID
   * This uses the public event detail endpoint
   * GET /api/v1/public/events/:id/
   */
  static async getEventDetails(eventId: string | number): Promise<EventData> {
    return retryRequest(async () => {
      // Convert eventId to integer if it's a string (URL params come as strings)
      const id = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId;
      // Use the public event detail endpoint
      const response = await apiClient.get<any>(`/public/events/${id}/`);
      const apiData = handleApiResponse(response);

      // Transform API response to EventData format if needed
      // The backend returns PublicEventSerializer format
      return this.transformEventDetails(apiData);
    });
  }

  /**
   * Get full image URL from relative path
   */
  private static getFullImageUrl(path: string): string {
    if (!path) return "";
    // Convert localhost:8000 URLs to relative URLs for Vite proxy
    if (path.includes("localhost:8000")) {
      // Extract the path part after the domain
      const url = new URL(path);
      return url.pathname; // Returns /media/events/images/...
    }
    if (path.startsWith("http")) return path;
    // If path already starts with /media/ or /storage/, use it as-is
    if (path.startsWith("/media/") || path.startsWith("/storage/")) {
      return path;
    }
    // For Django media files, use /media/ path
    // For other storage paths, use /storage/
    if (path.startsWith("media/") || path.includes("events/images/") || path.includes("organizers/")) {
      return `/${path.startsWith("media/") ? path : `media/${path}`}`;
    }
    // Default to /storage/ for other paths
    return `/storage/${path}`;
  }

  /**
   * Transform API event details response to EventData format
   */
  private static transformEventDetails(apiData: any): EventData {
    return {
      id: apiData.id?.toString(),
      title: apiData.title || "",
      videoUrl: undefined, // Not provided in API
      images: (() => {
        const images: Array<{ url: string; isPrimary: boolean }> = [];
        
        // Add main event image first (if available)
        if (apiData.image) {
          images.push({
            url: this.getFullImageUrl(apiData.image),
            isPrimary: true,
          });
        } else if (apiData.thumbnail_path) {
          images.push({
            url: this.getFullImageUrl(apiData.thumbnail_path),
            isPrimary: true,
          });
        }
        
        // Add gallery images
        if (apiData.gallery && Array.isArray(apiData.gallery)) {
          apiData.gallery.forEach((img: any) => {
            const imgUrl = img.path || img.url || "";
            if (imgUrl) {
              images.push({
                url: this.getFullImageUrl(imgUrl),
          isPrimary: false,
              });
            }
          });
        }
        
        // If no images at all, return empty array (will show placeholder)
        return images.length > 0 ? images : [];
      })(),
      layoutImageUrl: apiData.venue?.layout_image?.path
        ? this.getFullImageUrl(apiData.venue.layout_image.path)
        : undefined,
      date: apiData.date || apiData.event_date || "",
      time: apiData.time || apiData.event_time || "",
      gatesOpenTime: apiData.gates_open_time || undefined,
      location: apiData.location || apiData.venue_address || apiData.event_location || "",
      price: parseFloat(apiData.starting_price) || 0,
      startingPrice: parseFloat(apiData.starting_price) || 300, // Default ticket price (300 if not set)
      originalPrice: undefined, // Not provided in API
      category: apiData.category_name || apiData.category?.name || "",
      rating: apiData.ratings?.event_rating || 0,
      attendees: 0, // Not provided in API
      description: apiData.description || apiData.about_event_html || "",
      venueInfo: apiData.about_venue || apiData.venue?.about_html || "",
      termsAndConditions: apiData.terms_and_conditions || undefined,
      facilities:
        apiData.venue?.facilities?.map((facility: any) => ({
          name: facility.name || facility,
          icon: facility.icon || "info",
          available: true,
        })) || [],
      isFeatured: apiData.featured || false,
      organizer: {
        id: (apiData.organizer?.id || apiData.organizer_id)?.toString() || "",
        name: apiData.organizer?.name || apiData.organizer_name || "",
        logoUrl: apiData.organizer?.logo 
          ? this.getFullImageUrl(apiData.organizer.logo)
          : (apiData.organizer?.logoUrl ? this.getFullImageUrl(apiData.organizer.logoUrl) : ""),
        bio: "", // Not provided in API
        events: [], // Not provided in API
      },
      totalTickets: apiData.venue?.capacity || 0,
      ticketsSold: 0, // Not provided in API
      ticketsAvailable: apiData.venue?.capacity || 0,
      peopleAdmitted: 0, // Not provided in API
      peopleRemaining: apiData.venue?.capacity || 0,
      totalPayoutPending: 0, // Not provided in API
      totalPayoutPaid: 0, // Not provided in API
      ticketCategories:
        apiData.ticket_categories?.map((cat: any) => {
          const price = parseFloat(cat.price);
          return {
            id: cat.id?.toString() || "",
            name: cat.name || "",
            price: (typeof price === 'number' && !isNaN(price)) ? price : 0,
            totalTickets: cat.total_tickets || 0,
            ticketsSold: cat.sold_tickets || 0,
            ticketsAvailable: cat.tickets_available || 0,
            description: cat.description || "",
          };
        }) || [],
      gallery:
        apiData.gallery?.map((img: any) => ({
          url: img.path || img.url || "",
          isPrimary: false,
        })) || [],
      venue: apiData.venue
        ? {
            id: apiData.venue.id?.toString() || "",
            name: apiData.venue.name || "",
            address: apiData.venue.address || "",
            city: apiData.venue.city || "",
            country: "", // Not provided in API
            capacity: apiData.venue.capacity || 0,
            facilities: apiData.venue.facilities || [],
            coordinates: undefined, // Not provided in API
            images: apiData.venue.layout_image
              ? [
                  {
                    url: this.getFullImageUrl(
                      apiData.venue.layout_image.path ||
                        apiData.venue.layout_image.url ||
                        ""
                    ),
                    isPrimary: true,
                  },
                ]
              : [],
            description: apiData.venue.about_html || "",
            contactInfo: {
              phone: apiData.venue.mobile_number || "",
              email: undefined, // Not provided in API
              website: apiData.venue.website || "",
            },
          }
        : undefined,
      gates:
        apiData.gates?.map((gate: any) => ({
          id: gate.id?.toString() || "",
          name: gate.name || "",
          location: gate.location || "",
          type: gate.type || "main",
          status: gate.status || "open",
          capacity: gate.capacity || 0,
          currentOccupancy: gate.current_occupancy || 0,
          openingTime: gate.opening_time || undefined,
          closingTime: gate.closing_time || undefined,
          requirements: gate.requirements || [],
        })) || [],
      personalizedCardRequirements: apiData.card_wallet_requirements
        ? {
            required: apiData.policies?.require_card || false,
            cardTypes: [], // Not provided in API
            minimumBalance: undefined, // Not provided in API
            specialAccess: false, // Not provided in API
            description: undefined, // Not provided in API
          }
        : undefined,
      walletRequirements: apiData.card_wallet_requirements
        ? {
            required: apiData.policies?.require_card || false,
            supportedWallets: [], // Not provided in API
            minimumBalance: undefined, // Not provided in API
            specialFeatures: [], // Not provided in API
            description: undefined, // Not provided in API
          }
        : undefined,
    };
  }

  /**
   * Create new event
   */
  static async createEvent(eventData: Partial<EventData>): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<EventData>>(
        "/events",
        eventData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update event
   */
  static async updateEvent(
    id: string,
    eventData: Partial<EventData>
  ): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<EventData>>(
        `/events/${id}`,
        eventData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete event
   */
  static async deleteEvent(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/events/${id}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by category
   */
  static async getEventsByCategory(
    category: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/category/${category}?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by organizer
   */
  static async getEventsByOrganizer(
    organizerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/organizer/${organizerId}?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Search events by title
   * Search for events matching the provided query string in the title
   * Returns lightweight event cards with thumbnail and category information
   */
  static async searchEvents(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<SearchEventsResponse> {
    return retryRequest(async () => {
      // Validate query string length (2-100 characters)
      if (query.length < 2 || query.length > 100) {
        throw new Error("Query string must be between 2 and 100 characters");
      }

      // Validate limit (1-50)
      if (limit < 1 || limit > 50) {
        throw new Error("Limit must be between 1 and 50");
      }

      // Validate page (>= 1)
      if (page < 1) {
        throw new Error("Page must be 1 or greater");
      }

      const params = { q: query, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<SearchEventsResponse>(
        `/search/events?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get event analytics
   */
  static async getEventAnalytics(eventId: string): Promise<EventAnalytics> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<EventAnalytics>>(
        `/events/${eventId}/analytics`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Upload event image
   */
  static async uploadEventImage(
    eventId: string,
    file: File,
    isPrimary: boolean = false
  ): Promise<EventImage> {
    return retryRequest(async () => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("isPrimary", String(isPrimary));

      const response = await apiClient.post<ApiResponse<EventImage>>(
        `/events/${eventId}/images`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete event image
   */
  static async deleteEventImage(
    eventId: string,
    imageId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/events/${eventId}/images/${imageId}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Update event facilities
   */
  static async updateEventFacilities(
    eventId: string,
    facilities: Facility[]
  ): Promise<Facility[]> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<Facility[]>>(
        `/events/${eventId}/facilities`,
        { facilities }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get event ticket categories
   */
  static async getEventTicketCategories(
    eventId: string
  ): Promise<TicketCategory[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<TicketCategory[]>>(
        `/events/${eventId}/ticket-categories`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update event ticket categories
   */
  static async updateEventTicketCategories(
    eventId: string,
    categories: TicketCategory[]
  ): Promise<TicketCategory[]> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<TicketCategory[]>>(
        `/events/${eventId}/ticket-categories`,
        { categories }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Toggle event featured status
   */
  static async toggleEventFeatured(eventId: string): Promise<EventData> {
    return retryRequest(async () => {
      const response = await apiClient.patch<ApiResponse<EventData>>(
        `/events/${eventId}/featured`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/upcoming?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by date range
   */
  static async getEventsByDateRange(
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { startDate, endDate, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/date-range?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by location
   */
  static async getEventsByLocation(
    location: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { location, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/location?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get events by price range
   */
  static async getEventsByPriceRange(
    minPrice: number,
    maxPrice: number,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<EventData>> {
    return retryRequest(async () => {
      const params = { minPrice, maxPrice, page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<EventData>>(
        `/events/price-range?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get event statistics
   */
  static async getEventStatistics(): Promise<{
    totalEvents: number;
    upcomingEvents: number;
    ongoingEvents: number;
    completedEvents: number;
    totalRevenue: number;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get<
        ApiResponse<{
          totalEvents: number;
          upcomingEvents: number;
          ongoingEvents: number;
          completedEvents: number;
          totalRevenue: number;
        }>
      >("/events/statistics");
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get public organizer details
   * GET /api/v1/public/organizers/:id/
   */
  static async getOrganizerDetail(organizerId: string): Promise<{
    id: string;
    name: string;
    logo?: string;
    bio?: string;
    contact_mobile?: string;
    events_count?: number;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/public/organizers/${organizerId}/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Get public venues list
   * GET /api/v1/public/venues/
   */
  static async getPublicVenues(params?: {
    search?: string;
    city?: string;
  }): Promise<Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    capacity: number;
  }>> {
    return retryRequest(async () => {
      const queryString = buildQueryParams(params || {});
      const url = queryString ? `/public/venues/?${queryString}` : "/public/venues/";
      const response = await apiClient.get(url);
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Filter events with advanced filtering options
   * Filter events by category, date range, venue, organizer, and price range
   * Returns event cards with thumbnail, category, and starting price information
   */
  static async filterEvents(
    filters: FilterEventsRequest
  ): Promise<FilterEventsResponse> {
    return retryRequest(async () => {
      // Validate parameters
      if (filters.limit && (filters.limit < 1 || filters.limit > 50)) {
        throw new Error("Limit must be between 1 and 50");
      }
      if (filters.page && filters.page < 1) {
        throw new Error("Page must be 1 or greater");
      }
      if (filters.category_id && filters.category_id < 1) {
        throw new Error("Category ID must be 1 or greater");
      }
      if (filters.organizer_id && filters.organizer_id < 1) {
        throw new Error("Organizer ID must be 1 or greater");
      }
      if (filters.venue_id && filters.venue_id < 1) {
        throw new Error("Venue ID must be 1 or greater");
      }
      if (filters.price_min && filters.price_min < 0) {
        throw new Error("Minimum price must be 0 or greater");
      }
      if (filters.price_max && filters.price_max < 0) {
        throw new Error("Maximum price must be 0 or greater");
      }

      const queryString = buildQueryParams(filters);
      const response = await apiClient.get<FilterEventsResponse>(
        `/events/filter?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get home page sections with events
   * GET /api/core/home-page-sections/public_list/
   */
  static async getHomePageSections(): Promise<Array<{
    section_key: string;
    title: string;
    subtitle: string;
    events: Array<{
      id: number | string;
      title: string;
      date?: string;
      time?: string;
      location?: string;
      venue_name?: string;
      thumbnail_path?: string;
      image_url?: string;
      category_name?: string;
      category?: string;
      starting_price?: number | string;
      price?: number;
    }>;
    order: number;
  }>> {
    return retryRequest(async () => {
      // Use the core API endpoint (public endpoint, no auth needed)
      // The endpoint is at /api/core/home-page-sections/public_list/
      const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
      // Ensure we use the correct base URL (remove /v1 if present, add /core)
      const apiBase = baseURL.replace(/\/v1$/, "");
      const response = await apiClient.get("/core/home-page-sections/public_list/", {
        baseURL: apiBase,
      });
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }
}
