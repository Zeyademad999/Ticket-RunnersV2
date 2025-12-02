import { BookingsService } from "../bookings";

// Mock the API client
jest.mock("../../config", () => ({
  apiClient: {
    get: jest.fn(),
  },
  handleApiResponse: jest.fn((response) => response.data),
  retryRequest: jest.fn((fn) => fn()),
}));

describe("BookingsService", () => {
  describe("getCustomerBookings", () => {
    it("should fetch customer bookings with pagination", async () => {
      const mockResponse = {
        page: "1",
        limit: "10",
        count: "25",
        items: [
          {
            id: "1",
            event_id: "event1",
            event_title: "Test Event",
            event_date: "2024-02-15",
            event_time: "20:00",
            event_location: "Test Location",
            order_id: "order1",
            ticket_category: "General",
            quantity: 2,
            unit_price: 100,
            total_amount: 200,
            purchase_date: "2024-01-15",
            status: "confirmed",
            qr_enabled: true,
            dependents: [],
          },
        ],
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.get.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.getCustomerBookings(1, 10);

      expect(apiClient.get).toHaveBeenCalledWith(
        "/me/bookings?page=1&limit=10"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("API Error");
      apiClient.get.mockRejectedValue(error);

      await expect(BookingsService.getCustomerBookings(1, 10)).rejects.toThrow(
        "API Error"
      );
    });
  });

  describe("getCustomerCardDetails", () => {
    it("should fetch customer card and wallet details", async () => {
      const mockResponse = {
        customer_first_name: "John",
        nfc_card: {
          card_number: "1234567890123456",
          card_status: "active",
          card_issue_date: "2024-01-15",
          card_expiry_date: "2025-01-15",
        },
        wallet: {
          wallet_status: "active",
          wallet_expiry_date: "2025-01-15",
        },
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.get.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.getCustomerCardDetails();

      expect(apiClient.get).toHaveBeenCalledWith("/me/card-details");
      expect(result).toEqual(mockResponse);
    });

    it("should handle card details API errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("Card API Error");
      apiClient.get.mockRejectedValue(error);

      await expect(BookingsService.getCustomerCardDetails()).rejects.toThrow(
        "Card API Error"
      );
    });
  });

  describe("updateCustomerProfile", () => {
    it("should update customer profile successfully", async () => {
      const mockResponse = {
        updated: true,
        field: "mobile_number",
        updated_at: "2024-01-15T10:30:00Z",
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.patch.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.updateCustomerProfile({
        mobile_number: "1234567890",
      });

      expect(apiClient.patch).toHaveBeenCalledWith("/me/profile", {
        mobile_number: "1234567890",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle profile update errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("Profile Update Error");
      apiClient.patch.mockRejectedValue(error);

      await expect(
        BookingsService.updateCustomerProfile({ email: "test@example.com" })
      ).rejects.toThrow("Profile Update Error");
    });
  });

  describe("verifyMobileNumber", () => {
    it("should verify mobile number with OTP successfully", async () => {
      const mockResponse = {
        mobile_number: "1234567890",
        verified: true,
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.post.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.verifyMobileNumber({
        new_mobile_number: "1234567890",
        otp_code: "123456",
      });

      expect(apiClient.post).toHaveBeenCalledWith("/me/mobile/verify", {
        new_mobile_number: "1234567890",
        otp_code: "123456",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle mobile verification errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("Mobile Verification Error");
      apiClient.post.mockRejectedValue(error);

      await expect(
        BookingsService.verifyMobileNumber({
          new_mobile_number: "1234567890",
          otp_code: "123456",
        })
      ).rejects.toThrow("Mobile Verification Error");
    });
  });

  describe("verifyEmail", () => {
    it("should verify email with OTP successfully", async () => {
      const mockResponse = {
        email: "test@example.com",
        verified: true,
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.post.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.verifyEmail({
        new_email: "test@example.com",
        otp_code: "123456",
      });

      expect(apiClient.post).toHaveBeenCalledWith("/me/email/verify", {
        new_email: "test@example.com",
        otp_code: "123456",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle email verification errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("Email Verification Error");
      apiClient.post.mockRejectedValue(error);

      await expect(
        BookingsService.verifyEmail({
          new_email: "test@example.com",
          otp_code: "123456",
        })
      ).rejects.toThrow("Email Verification Error");
    });
  });

  describe("addToFavorites", () => {
    it("should add event to favorites successfully", async () => {
      const mockResponse = {
        event_id: 123,
        favorited: true,
        favorite_time: "2024-01-15T10:30:00Z",
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.post.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.addToFavorites("123", {
        event_id: 123,
      });

      expect(apiClient.post).toHaveBeenCalledWith("/events/123/favorite", {
        event_id: 123,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle favorites errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("Favorites Error");
      apiClient.post.mockRejectedValue(error);

      await expect(
        BookingsService.addToFavorites("123", { event_id: 123 })
      ).rejects.toThrow("Favorites Error");
    });
  });

  describe("removeFromFavorites", () => {
    it("should remove event from favorites successfully", async () => {
      const mockResponse = {
        event_id: 123,
        favorited: false,
        removed_count: "1",
      };

      const { apiClient, handleApiResponse } = require("../../config");
      apiClient.delete.mockResolvedValue({ data: mockResponse });
      handleApiResponse.mockReturnValue(mockResponse);

      const result = await BookingsService.removeFromFavorites("123", 123);

      expect(apiClient.delete).toHaveBeenCalledWith(
        "/events/123/favorite?event_id=123"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle remove favorites errors gracefully", async () => {
      const { apiClient } = require("../../config");
      const error = new Error("Remove Favorites Error");
      apiClient.delete.mockRejectedValue(error);

      await expect(
        BookingsService.removeFromFavorites("123", 123)
      ).rejects.toThrow("Remove Favorites Error");
    });
  });
});
