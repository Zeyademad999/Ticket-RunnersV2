import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import { ApiErrorHandler } from "../errorHandler";
import {
  ApiResponse,
  PaginatedResponse,
  Booking,
  CreateBookingRequest,
  Ticket,
  TicketFilters,
  CheckInLog,
  TransferTicketRequest,
  TransferTicketResponse,
  Dependent,
  PaymentState,
  CustomerBookingsResponse,
  CustomerBookingItem,
  CustomerCardDetailsResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  VerifyMobileRequest,
  VerifyMobileResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  AddToFavoritesRequest,
  AddToFavoritesResponse,
  RemoveFromFavoritesResponse,
  GetFavoritesResponse,
} from "../types";

export class BookingsService {
  /**
   * Create a new booking
   */
  static async createBooking(
    bookingData: CreateBookingRequest
  ): Promise<Booking> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<Booking>>(
        "/bookings",
        bookingData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get all bookings with pagination and filtering
   */
  static async getBookings(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: string;
      eventId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<PaginatedResponse<Booking>> {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        `/bookings?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get booking by ID
   */
  static async getBookingById(id: string): Promise<Booking> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Booking>>(
        `/bookings/${id}`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get user's bookings
   */
  static async getUserBookings(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Booking>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<Booking>>(
        `/bookings/my-bookings?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get customer's previous bookings (paginated list grouped by order and event)
   */
  static async getCustomerBookings(
    page: number = 1,
    limit: number = 10
  ): Promise<CustomerBookingsResponse> {
    return ApiErrorHandler.withRetry(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<CustomerBookingsResponse>(
        `/me/bookings?${queryString}`
      );
      return handleApiResponse(response);
    }, "Customer Bookings");
  }

  /**
   * Get customer's card and wallet details
   */
  static async getCustomerCardDetails(): Promise<CustomerCardDetailsResponse> {
    return ApiErrorHandler.withRetry(async () => {
      const response = await apiClient.get<CustomerCardDetailsResponse>(
        `/users/me/card-details/`
      );
      return handleApiResponse(response);
    }, "Customer Card Details");
  }

  /**
   * Update customer profile (one field at a time)
   */
  static async updateCustomerProfile(
    updateData: UpdateProfileRequest
  ): Promise<UpdateProfileResponse> {
    return retryRequest(async () => {
      const response = await apiClient.put<UpdateProfileResponse>(
        `/users/profile/`,
        updateData
      );
      const data = handleApiResponse(response);
      // Backend returns full profile data, convert to expected format
      return {
        updated: true,
        field: Object.keys(updateData)[0] || 'profile'
      };
    });
  }

  /**
   * Verify mobile number change with OTP
   */
  static async verifyMobileNumber(
    verifyData: VerifyMobileRequest
  ): Promise<VerifyMobileResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<VerifyMobileResponse>(
        `/me/mobile/verify`,
        verifyData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Verify email change with OTP
   */
  static async verifyEmail(
    verifyData: VerifyEmailRequest
  ): Promise<VerifyEmailResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<VerifyEmailResponse>(
        `/me/email/verify`,
        verifyData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Add event to customer favorites
   */
  static async addToFavorites(
    eventId: string,
    requestData: AddToFavoritesRequest
  ): Promise<AddToFavoritesResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<AddToFavoritesResponse>(
        `/events/${eventId}/favorite`,
        requestData
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Remove event from customer favorites
   */
  static async removeFromFavorites(
    eventId: string,
    eventIdNumber: number
  ): Promise<RemoveFromFavoritesResponse> {
    return retryRequest(async () => {
      const response = await apiClient.delete<RemoveFromFavoritesResponse>(
        `/events/${eventId}/favorite?event_id=${eventIdNumber}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get customer favorites
   */
  static async getCustomerFavorites(
    page: number = 1,
    limit: number = 50
  ): Promise<GetFavoritesResponse> {
    return retryRequest(async () => {
      const response = await apiClient.get<GetFavoritesResponse>(
        `/favorites?page=${page}&limit=${limit}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Cancel booking
   */
  static async cancelBooking(
    id: string,
    reason?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        `/bookings/${id}/cancel`,
        {
          reason,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Transfer booking tickets
   */
  static async transferBookingTickets(
    bookingId: string,
    transferData: TransferTicketRequest
  ): Promise<TransferTicketResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post<
        ApiResponse<TransferTicketResponse>
      >(`/bookings/${bookingId}/transfer`, transferData);
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get booking tickets
   */
  static async getBookingTickets(bookingId: string): Promise<Ticket[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Ticket[]>>(
        `/bookings/${bookingId}/tickets`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get all tickets with pagination and filtering
   */
  static async getTickets(
    page: number = 1,
    limit: number = 10,
    filters?: TicketFilters
  ): Promise<PaginatedResponse<Ticket>> {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<Ticket>>(
        `/tickets?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(id: string): Promise<Ticket> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Ticket>>(
        `/tickets/${id}`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get user's tickets
   */
  static async getUserTickets(
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Ticket>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<Ticket>>(
        `/tickets/my-tickets?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Check in ticket
   */
  static async checkInTicket(
    ticketId: string,
    location?: string
  ): Promise<CheckInLog> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<CheckInLog>>(
        `/tickets/${ticketId}/checkin`,
        {
          location,
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get ticket check-in logs
   */
  static async getTicketCheckInLogs(ticketId: string): Promise<CheckInLog[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<CheckInLog[]>>(
        `/tickets/${ticketId}/checkin-logs`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Validate ticket QR code
   */
  static async validateTicketQR(qrCode: string): Promise<Ticket> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<Ticket>>(
        "/tickets/validate-qr",
        {
          qrCode,
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get tickets by event
   */
  static async getTicketsByEvent(
    eventId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Ticket>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<Ticket>>(
        `/tickets/event/${eventId}?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Update ticket status
   */
  static async updateTicketStatus(
    ticketId: string,
    status: "valid" | "used" | "refunded" | "banned"
  ): Promise<Ticket> {
    return retryRequest(async () => {
      const response = await apiClient.patch<ApiResponse<Ticket>>(
        `/tickets/${ticketId}/status`,
        {
          status,
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Refund ticket
   */
  static async refundTicket(
    ticketId: string,
    reason?: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        `/tickets/${ticketId}/refund`,
        {
          reason,
        }
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get booking dependents
   */
  static async getBookingDependents(bookingId: string): Promise<Dependent[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Dependent[]>>(
        `/bookings/${bookingId}/dependents`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update booking dependents
   */
  static async updateBookingDependents(
    bookingId: string,
    dependents: Dependent[]
  ): Promise<Dependent[]> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<Dependent[]>>(
        `/bookings/${bookingId}/dependents`,
        {
          dependents,
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(bookingId: string): Promise<PaymentState> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<PaymentState>>(
        `/bookings/${bookingId}/payment-status`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Process payment
   */
  static async processPayment(
    bookingId: string,
    paymentMethod: string,
    paymentDetails: any
  ): Promise<PaymentState> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<PaymentState>>(
        `/bookings/${bookingId}/payment`,
        {
          paymentMethod,
          paymentDetails,
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get booking statistics
   */
  static async getBookingStatistics(): Promise<{
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get<
        ApiResponse<{
          totalBookings: number;
          confirmedBookings: number;
          cancelledBookings: number;
          totalRevenue: number;
          averageBookingValue: number;
        }>
      >("/bookings/statistics");
      return handleApiResponse(response).data;
    });
  }

  /**
   * Export booking data
   */
  static async exportBookings(
    format: "csv" | "excel" = "csv",
    filters?: {
      status?: string;
      eventId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<Blob> {
    return retryRequest(async () => {
      const params = { format, ...filters };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/bookings/export?${queryString}`, {
        responseType: "blob",
      });
      return response.data;
    });
  }

  /**
   * Get ticket analytics
   */
  static async getTicketAnalytics(eventId?: string): Promise<{
    totalTickets: number;
    soldTickets: number;
    usedTickets: number;
    refundedTickets: number;
    checkInRate: number;
    revenue: number;
  }> {
    return retryRequest(async () => {
      const params = eventId ? { eventId } : {};
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<
        ApiResponse<{
          totalTickets: number;
          soldTickets: number;
          usedTickets: number;
          refundedTickets: number;
          checkInRate: number;
          revenue: number;
        }>
      >(`/tickets/analytics?${queryString}`);
      return handleApiResponse(response).data;
    });
  }
}
