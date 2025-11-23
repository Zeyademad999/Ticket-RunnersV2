import {
  apiClient,
  handleApiResponse,
  retryRequest,
  buildQueryParams,
} from "../config";
import {
  ApiResponse,
  PaginatedResponse,
  AdminUser,
  Permission,
  Role,
  DashboardStats,
  Customer,
  CustomerActivity,
  UserFilters,
  NFCCard,
} from "../types";

export class AdminService {
  /**
   * Get admin dashboard statistics
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<DashboardStats>>(
        "/admin/dashboard/stats"
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get all admin users with pagination
   */
  static async getAdminUsers(
    page: number = 1,
    limit: number = 10,
    filters?: {
      role?: string;
      status?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<AdminUser>> {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<AdminUser>>(
        `/admin/users?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get admin user by ID
   */
  static async getAdminUserById(id: string): Promise<AdminUser> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<AdminUser>>(
        `/admin/users/${id}`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Create new admin user
   */
  static async createAdminUser(
    userData: Partial<AdminUser>
  ): Promise<AdminUser> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<AdminUser>>(
        "/admin/users",
        userData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update admin user
   */
  static async updateAdminUser(
    id: string,
    userData: Partial<AdminUser>
  ): Promise<AdminUser> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<AdminUser>>(
        `/admin/users/${id}`,
        userData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete admin user
   */
  static async deleteAdminUser(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/admin/users/${id}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get all permissions
   */
  static async getPermissions(): Promise<Permission[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Permission[]>>(
        "/admin/permissions"
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get all roles
   */
  static async getRoles(): Promise<Role[]> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Role[]>>("/admin/roles");
      return handleApiResponse(response).data;
    });
  }

  /**
   * Create new role
   */
  static async createRole(roleData: Partial<Role>): Promise<Role> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<Role>>(
        "/admin/roles",
        roleData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update role
   */
  static async updateRole(id: string, roleData: Partial<Role>): Promise<Role> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<Role>>(
        `/admin/roles/${id}`,
        roleData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete role
   */
  static async deleteRole(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/admin/roles/${id}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get all customers with pagination and filtering
   */
  static async getCustomers(
    page: number = 1,
    limit: number = 10,
    filters?: UserFilters
  ): Promise<PaginatedResponse<Customer>> {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<Customer>>(
        `/admin/customers?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(id: string): Promise<Customer> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<Customer>>(
        `/admin/customers/${id}`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update customer status
   */
  static async updateCustomerStatus(
    id: string,
    status: "active" | "inactive" | "banned"
  ): Promise<Customer> {
    return retryRequest(async () => {
      const response = await apiClient.patch<ApiResponse<Customer>>(
        `/admin/customers/${id}/status`,
        {
          status,
        }
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Get customer activities
   */
  static async getCustomerActivities(
    customerId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<CustomerActivity>> {
    return retryRequest(async () => {
      const params = { page, limit };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<CustomerActivity>>(
        `/admin/customers/${customerId}/activities?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get all NFC cards with pagination
   */
  static async getNFCCards(
    page: number = 1,
    limit: number = 10,
    filters?: {
      status?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<NFCCard>> {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<PaginatedResponse<NFCCard>>(
        `/admin/nfc-cards?${queryString}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get NFC card by ID
   */
  static async getNFCCardById(id: string): Promise<NFCCard> {
    return retryRequest(async () => {
      const response = await apiClient.get<ApiResponse<NFCCard>>(
        `/admin/nfc-cards/${id}`
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Create new NFC card
   */
  static async createNFCCard(cardData: Partial<NFCCard>): Promise<NFCCard> {
    return retryRequest(async () => {
      const response = await apiClient.post<ApiResponse<NFCCard>>(
        "/admin/nfc-cards",
        cardData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update NFC card
   */
  static async updateNFCCard(
    id: string,
    cardData: Partial<NFCCard>
  ): Promise<NFCCard> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<NFCCard>>(
        `/admin/nfc-cards/${id}`,
        cardData
      );
      return handleApiResponse(response).data;
    });
  }

  /**
   * Delete NFC card
   */
  static async deleteNFCCard(
    id: string
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete<ApiResponse<{ message: string }>>(
        `/admin/nfc-cards/${id}`
      );
      return handleApiResponse(response);
    });
  }

  /**
   * Get system logs
   */
  static async getSystemLogs(
    page: number = 1,
    limit: number = 10,
    filters?: {
      level?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    }
  ): Promise<
    PaginatedResponse<{
      id: string;
      level: string;
      message: string;
      timestamp: string;
      userId?: string;
      action?: string;
    }>
  > {
    return retryRequest(async () => {
      const params = {
        page,
        limit,
        ...filters,
      };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get<
        PaginatedResponse<{
          id: string;
          level: string;
          message: string;
          timestamp: string;
          userId?: string;
          action?: string;
        }>
      >(`/admin/system-logs?${queryString}`);
      return handleApiResponse(response);
    });
  }

  /**
   * Get admin analytics
   */
  static async getAdminAnalytics(): Promise<{
    userGrowth: Array<{ date: string; count: number }>;
    revenueGrowth: Array<{ date: string; amount: number }>;
    eventPerformance: Array<{
      eventId: string;
      title: string;
      ticketsSold: number;
      revenue: number;
    }>;
    topCustomers: Array<{
      customerId: string;
      name: string;
      totalSpent: number;
      bookings: number;
    }>;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get<
        ApiResponse<{
          userGrowth: Array<{ date: string; count: number }>;
          revenueGrowth: Array<{ date: string; amount: number }>;
          eventPerformance: Array<{
            eventId: string;
            title: string;
            ticketsSold: number;
            revenue: number;
          }>;
          topCustomers: Array<{
            customerId: string;
            name: string;
            totalSpent: number;
            bookings: number;
          }>;
        }>
      >("/admin/analytics");
      return handleApiResponse(response).data;
    });
  }

  /**
   * Export admin data
   */
  static async exportAdminData(
    type: "users" | "customers" | "events" | "bookings" | "nfc-cards",
    format: "csv" | "excel" = "csv",
    filters?: Record<string, any>
  ): Promise<Blob> {
    return retryRequest(async () => {
      const params = { type, format, ...filters };
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/admin/export?${queryString}`, {
        responseType: "blob",
      });
      return response.data;
    });
  }

  /**
   * Get admin settings
   */
  static async getAdminSettings(): Promise<{
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportPhone: string;
    commissionRate: number;
    maxTicketsPerBooking: number;
    allowTicketTransfers: boolean;
    requireEmailVerification: boolean;
    requirePhoneVerification: boolean;
  }> {
    return retryRequest(async () => {
      const response = await apiClient.get<
        ApiResponse<{
          siteName: string;
          siteDescription: string;
          contactEmail: string;
          supportPhone: string;
          commissionRate: number;
          maxTicketsPerBooking: number;
          allowTicketTransfers: boolean;
          requireEmailVerification: boolean;
          requirePhoneVerification: boolean;
        }>
      >("/admin/settings");
      return handleApiResponse(response).data;
    });
  }

  /**
   * Update admin settings
   */
  static async updateAdminSettings(
    settings: Partial<{
      siteName: string;
      siteDescription: string;
      contactEmail: string;
      supportPhone: string;
      commissionRate: number;
      maxTicketsPerBooking: number;
      allowTicketTransfers: boolean;
      requireEmailVerification: boolean;
      requirePhoneVerification: boolean;
    }>
  ): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.put<ApiResponse<{ message: string }>>(
        "/admin/settings",
        settings
      );
      return handleApiResponse(response);
    });
  }
}
