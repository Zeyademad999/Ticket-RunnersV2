import {
  apiClient,
  handleApiResponse,
  retryRequest,
} from "../config";
import {
  ApiResponse,
  Ticket,
  TransferTicketRequest,
  TransferTicketResponse,
} from "../types";

/**
 * Tickets Service
 * Handles all ticket-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class TicketsService {
  /**
   * Book tickets
   * POST /api/v1/tickets/book/
   */
  static async bookTickets(data: {
    event_id: string | number;
    category: string;
    quantity: number;
    payment_method: string;
    ticket_details?: Array<{
      name?: string;
      mobile?: string;
      email?: string;
      is_owner?: boolean;
      category?: string;
      price?: number;
    }>;
  }): Promise<ApiResponse<any>> {
    return retryRequest(async () => {
      // Convert event_id to integer if it's a string
      const payload = {
        ...data,
        event_id: typeof data.event_id === 'string' ? parseInt(data.event_id, 10) : data.event_id,
      };
      const response = await apiClient.post("/tickets/book/", payload);
      return handleApiResponse(response);
    });
  }

  /**
   * Get user tickets list
   * GET /api/v1/users/tickets/
   */
  static async getUserTickets(): Promise<Ticket[]> {
    return retryRequest(async () => {
      const response = await apiClient.get("/users/tickets/");
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Get ticket details
   * GET /api/v1/users/tickets/:id/
   */
  static async getTicketDetail(ticketId: string): Promise<{
    ticket: Ticket;
    related_tickets: Ticket[];
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/users/tickets/${ticketId}/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Get ticket QR code
   * GET /api/v1/users/tickets/:id/qr-code/
   */
  static async getTicketQrCode(ticketId: string): Promise<{ qr_code: string; qr_code_url: string }> {
    return retryRequest(async () => {
      const response = await apiClient.get(`/users/tickets/${ticketId}/qr-code/`);
      return handleApiResponse(response);
    });
  }

  /**
   * Transfer ticket
   * POST /api/v1/users/tickets/:id/transfer/
   */
  static async transferTicket(
    ticketId: string,
    data: {
      recipient_mobile: string;
      recipient_name?: string;
      payment_method?: string;
    }
  ): Promise<TransferTicketResponse> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        `/users/tickets/${ticketId}/transfer/`,
        data
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Gift ticket
   * POST /api/v1/users/tickets/:id/gift/
   */
  static async giftTicket(
    ticketId: string,
    data: {
      recipient_email?: string;
      recipient_phone?: string;
      recipient_name: string;
      message?: string;
    }
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        `/users/tickets/${ticketId}/gift/`,
        data
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Request refund
   * POST /api/v1/users/tickets/:id/refund-request/
   */
  static async requestRefund(
    ticketId: string,
    data: {
      reason?: string;
    }
  ): Promise<ApiResponse<{ message: string; refund_request_id: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.post(
        `/users/tickets/${ticketId}/refund-request/`,
        data
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get event check-in status
   * GET /api/v1/users/events/:id/checkin-status/
   */
  static async getEventCheckinStatus(eventId: string | number): Promise<{
    checked_in: boolean;
    check_in_time?: string;
    tickets: Array<{
      ticket_id: string;
      checked_in: boolean;
      check_in_time?: string;
    }>;
  }> {
    return retryRequest(async () => {
      // Convert eventId to integer if it's a string
      const id = typeof eventId === 'string' ? parseInt(eventId, 10) : eventId;
      const response = await apiClient.get(`/users/events/${id}/checkin-status/`);
      return handleApiResponse(response);
    });
  }
}

