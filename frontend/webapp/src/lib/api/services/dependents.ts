import {
  apiClient,
  handleApiResponse,
  retryRequest,
} from "../config";
import {
  ApiResponse,
  Dependent,
} from "../types";

/**
 * Dependents Service
 * Handles all dependent-related operations for the WebApp portal
 * Base URL: /api/v1/
 */
export class DependentsService {
  /**
   * Get user dependents list
   * GET /api/v1/users/dependents/
   */
  static async getDependents(): Promise<Dependent[]> {
    return retryRequest(async () => {
      const response = await apiClient.get("/users/dependents/");
      const data = handleApiResponse(response);
      return Array.isArray(data) ? data : [];
    });
  }

  /**
   * Add dependent
   * POST /api/v1/users/dependents/
   */
  static async addDependent(data: {
    name: string;
    date_of_birth?: string;
    relationship?: string;
    mobile_number?: string;
    email?: string;
  }): Promise<ApiResponse<Dependent>> {
    return retryRequest(async () => {
      const response = await apiClient.post("/users/dependents/", data);
      return handleApiResponse(response);
    });
  }

  /**
   * Update dependent
   * PUT /api/v1/users/dependents/:id/
   */
  static async updateDependent(
    dependentId: string,
    data: {
      name?: string;
      date_of_birth?: string;
      relationship?: string;
      mobile_number?: string;
      email?: string;
    }
  ): Promise<ApiResponse<Dependent>> {
    return retryRequest(async () => {
      const response = await apiClient.put(`/users/dependents/${dependentId}/`, data);
      return handleApiResponse(response);
    });
  }

  /**
   * Delete dependent
   * DELETE /api/v1/users/dependents/:id/
   */
  static async deleteDependent(dependentId: string): Promise<ApiResponse<{ message: string }>> {
    return retryRequest(async () => {
      const response = await apiClient.delete(`/users/dependents/${dependentId}/`);
      return handleApiResponse(response);
    });
  }
}

