import {
  Merchant,
  NFCCard,
  Customer,
  CardAssignment,
  LoginCredentials,
  OTPVerification,
  PasswordChange,
  MobileChange,
  DashboardStats,
  ApiResponse,
} from "../types";

// Mock merchant data
const mockMerchant: Merchant = {
  id: "1",
  name: "Tech Solutions Store",
  address: "123 Main Street, Downtown, City",
  gmaps_location: "https://maps.google.com/?q=123+Main+Street",
  mobile_number: "01104484492",
  contact_name: "Ahmed Al Mansouri",
  status: "active",
  created_at: "2024-01-15T10:30:00Z",
  updated_at: "2024-01-15T10:30:00Z",
};

// Mock NFC cards data
const mockCards: NFCCard[] = [
  {
    id: "1",
    serial_number: "TR001234567890",
    status: "available",
    merchant_id: "1",
    merchant_name: "Tech Solutions Store",
    customer_id: undefined,
    customer_name: undefined,
    customer_mobile: undefined,
    assigned_at: undefined,
    delivered_at: undefined,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-10T09:00:00Z",
  },
  {
    id: "2",
    serial_number: "TR001234567891",
    status: "assigned",
    merchant_id: "1",
    merchant_name: "Tech Solutions Store",
    customer_id: "101",
    customer_name: "Fatima Al Zahra",
    customer_mobile: "+971507654321",
    assigned_at: "2024-01-12T14:30:00Z",
    delivered_at: undefined,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-12T14:30:00Z",
  },
  {
    id: "3",
    serial_number: "TR001234567892",
    status: "delivered",
    merchant_id: "1",
    merchant_name: "Tech Solutions Store",
    customer_id: "102",
    customer_name: "Omar Al Rashid",
    customer_mobile: "+971509876543",
    assigned_at: "2024-01-08T11:15:00Z",
    delivered_at: "2024-01-08T11:20:00Z",
    created_at: "2024-01-05T08:00:00Z",
    updated_at: "2024-01-08T11:20:00Z",
  },
  {
    id: "4",
    serial_number: "TR001234567893",
    status: "available",
    merchant_id: "1",
    merchant_name: "Tech Solutions Store",
    customer_id: undefined,
    customer_name: undefined,
    customer_mobile: undefined,
    assigned_at: undefined,
    delivered_at: undefined,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-10T09:00:00Z",
  },
  {
    id: "5",
    serial_number: "TR001234567894",
    status: "delivered",
    merchant_id: "1",
    merchant_name: "Tech Solutions Store",
    customer_id: "103",
    customer_name: "Aisha Al Qasimi",
    customer_mobile: "+971501112223",
    assigned_at: "2024-01-06T16:45:00Z",
    delivered_at: "2024-01-06T16:50:00Z",
    created_at: "2024-01-05T08:00:00Z",
    updated_at: "2024-01-06T16:50:00Z",
  },
  {
    id: "6",
    serial_number: "TR001234567895",
    status: "assigned",
    merchant_id: "1",
    merchant_name: "Tech Solutions Store",
    customer_id: "104",
    customer_name: "Khalid Al Falasi",
    customer_mobile: "+971504445556",
    assigned_at: "2024-01-14T10:20:00Z",
    delivered_at: undefined,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-14T10:20:00Z",
  },
];

// Mock customers data
const mockCustomers: Customer[] = [
  {
    id: "101",
    name: "Fatima Al Zahra",
    mobile_number: "+971507654321",
    email: "fatima.alzahra@email.com",
    status: "active",
    fees_paid: true,
    created_at: "2024-01-01T12:00:00Z",
    updated_at: "2024-01-01T12:00:00Z",
  },
  {
    id: "102",
    name: "Omar Al Rashid",
    mobile_number: "+971509876543",
    email: "omar.alrashid@email.com",
    status: "active",
    fees_paid: true,
    created_at: "2024-01-02T14:30:00Z",
    updated_at: "2024-01-02T14:30:00Z",
  },
  {
    id: "103",
    name: "Aisha Al Qasimi",
    mobile_number: "+971501112223",
    email: "aisha.alqasimi@email.com",
    status: "active",
    fees_paid: true,
    created_at: "2024-01-03T09:15:00Z",
    updated_at: "2024-01-03T09:15:00Z",
  },
  {
    id: "104",
    name: "Khalid Al Falasi",
    mobile_number: "+971504445556",
    email: "khalid.alfalasi@email.com",
    status: "active",
    fees_paid: true,
    created_at: "2024-01-04T16:45:00Z",
    updated_at: "2024-01-04T16:45:00Z",
  },
  {
    id: "105",
    name: "Mariam Al Suwaidi",
    mobile_number: "+971507778889",
    email: "mariam.alsuwaidi@email.com",
    status: "active",
    fees_paid: false,
    created_at: "2024-01-05T11:20:00Z",
    updated_at: "2024-01-05T11:20:00Z",
  },
  {
    id: "106",
    name: "Yusuf Al Maktoum",
    mobile_number: "+971501234567",
    email: "yusuf.almaktoum@email.com",
    status: "active",
    fees_paid: true,
    created_at: "2024-01-06T13:45:00Z",
    updated_at: "2024-01-06T13:45:00Z",
  },
  {
    id: "107",
    name: "Layla Al Nahyan",
    mobile_number: "+971509999999",
    email: "layla.alnahyan@email.com",
    status: "inactive",
    fees_paid: false,
    created_at: "2024-01-07T10:30:00Z",
    updated_at: "2024-01-07T10:30:00Z",
  },
];

// Mock dashboard stats
const mockDashboardStats: DashboardStats = {
  total_available_cards: 2,
  total_delivered_cards: 2,
  total_assigned_cards: 2,
  total_cards: 6,
  recent_activity: [
    {
      id: 1,
      action: "Card assigned",
      card_serial: "TR001234567891",
      customer_name: "Fatima Al Zahra",
      timestamp: "2024-01-12T14:30:00Z",
    },
    {
      id: 2,
      action: "Card delivered",
      card_serial: "TR001234567892",
      customer_name: "Omar Al Rashid",
      timestamp: "2024-01-08T11:20:00Z",
    },
    {
      id: 3,
      action: "Card assigned",
      card_serial: "TR001234567895",
      customer_name: "Khalid Al Falasi",
      timestamp: "2024-01-14T10:20:00Z",
    },
  ],
};

// Helper function to simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to create success response
const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  data,
  message: "Operation completed successfully",
});

// Helper function to create error response
const createErrorResponse = (message: string): never => {
  throw new Error(message);
};

// Mock API service class
class MockApiService {
  private currentMerchant: Merchant | null = null;

  // Helper method to check authentication
  private checkAuthentication(): boolean {
    const token = localStorage.getItem("authToken");
    return !!token;
  }

  // Authentication
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<{ token: string; merchant: Merchant }>> {
    await delay(1000); // Simulate network delay

    // Mock validation
    if (
      credentials.mobile_number !== "01104484492" ||
      credentials.password !== "password"
    ) {
      createErrorResponse("Invalid mobile number or password");
    }

    const token = "mock-jwt-token-" + Date.now();
    this.currentMerchant = mockMerchant;

    return createSuccessResponse({
      token,
      merchant: mockMerchant,
    });
  }

  async verifyOTP(
    verification: OTPVerification
  ): Promise<ApiResponse<{ token: string; merchant: Merchant }>> {
    await delay(800);

    // Mock OTP validation
    if (verification.otp !== "123456") {
      createErrorResponse("Invalid OTP code");
    }

    const token = "mock-jwt-token-" + Date.now();
    this.currentMerchant = mockMerchant;

    return createSuccessResponse({
      token,
      merchant: mockMerchant,
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    await delay(500);
    this.currentMerchant = null;
    return createSuccessResponse(undefined);
  }

  // Card Assignment
  async assignCard(
    assignment: CardAssignment
  ): Promise<ApiResponse<{ hashed_code: string }>> {
    await delay(1200);

    if (!this.checkAuthentication()) {
      createErrorResponse("Authentication required");
    }

    // Mock card assignment logic
    const card = mockCards.find(
      (c) => c.serial_number === assignment.card_serial
    );
    if (!card) {
      createErrorResponse("Card not found");
    }

    // Check if card is available or can be rewritten
    if (card?.status === "delivered") {
      createErrorResponse("Card is already delivered and cannot be reassigned");
    }

    // Generate a realistic hashed code
    const timestamp = Date.now();
    const customerId =
      mockCustomers.find((c) => c.mobile_number === assignment.customer_mobile)
        ?.id || "UNKNOWN";
    const hashedCode = `TR_${
      assignment.card_serial
    }_${customerId}_${timestamp}_${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    // Update card status in mock data
    if (card) {
      card.status = "assigned";
      card.customer_id = customerId;
      card.customer_mobile = assignment.customer_mobile;
      card.customer_name = mockCustomers.find(
        (c) => c.mobile_number === assignment.customer_mobile
      )?.name;
      card.assigned_at = new Date().toISOString();
      card.updated_at = new Date().toISOString();
      card.hashed_code = hashedCode;
    }

    return createSuccessResponse({
      hashed_code: hashedCode,
    });
  }

  async verifyCustomerMobile(mobile: string): Promise<ApiResponse<Customer>> {
    await delay(600);

    const customer = mockCustomers.find((c) => c.mobile_number === mobile);
    if (!customer) {
      createErrorResponse("Customer not found or not registered");
    }

    if (customer?.status !== "active") {
      createErrorResponse("Customer account is not active");
    }

    // Fees are paid in person to merchant, no check needed
    return createSuccessResponse(customer!);
  }

  async sendCustomerOTP(
    mobile: string
  ): Promise<ApiResponse<{ message: string }>> {
    await delay(800);

    const customer = mockCustomers.find((c) => c.mobile_number === mobile);
    if (!customer) {
      createErrorResponse("Customer not found");
    }

    return createSuccessResponse({
      message: "OTP sent successfully to customer mobile",
    });
  }

  // Card Inventory
  async getCards(): Promise<ApiResponse<NFCCard[]>> {
    await delay(700);

    if (!this.checkAuthentication()) {
      createErrorResponse("Authentication required");
    }

    return createSuccessResponse(mockCards);
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    await delay(500);

    if (!this.checkAuthentication()) {
      createErrorResponse("Authentication required");
    }

    return createSuccessResponse(mockDashboardStats);
  }

  // User Settings
  async changePassword(
    passwordChange: PasswordChange
  ): Promise<ApiResponse<{ message: string }>> {
    await delay(1000);

    if (!this.checkAuthentication()) {
      createErrorResponse("Authentication required");
    }

    // Mock password validation
    if (passwordChange.current_password !== "password") {
      createErrorResponse("Current password is incorrect");
    }

    if (passwordChange.new_password !== passwordChange.confirm_password) {
      createErrorResponse("New passwords do not match");
    }

    if (passwordChange.new_password.length < 8) {
      createErrorResponse("Password must be at least 8 characters long");
    }

    return createSuccessResponse({
      message: "Password changed successfully",
    });
  }

  async changeMobile(
    mobileChange: MobileChange
  ): Promise<ApiResponse<{ message: string }>> {
    await delay(1000);

    if (!this.checkAuthentication()) {
      createErrorResponse("Authentication required");
    }

    // Mock OTP validation
    if (mobileChange.otp !== "123456") {
      createErrorResponse("Invalid OTP code");
    }

    return createSuccessResponse({
      message: "Mobile number changed successfully",
    });
  }

  async sendMobileChangeOTP(
    newMobile: string
  ): Promise<ApiResponse<{ message: string }>> {
    await delay(800);

    if (!this.checkAuthentication()) {
      createErrorResponse("Authentication required");
    }

    // Mock mobile number validation
    if (!newMobile.match(/^\+971\d{9}$/)) {
      createErrorResponse("Invalid mobile number format");
    }

    return createSuccessResponse({
      message: "OTP sent successfully to new mobile number",
    });
  }
}

export const mockApiService = new MockApiService();
export default mockApiService;
