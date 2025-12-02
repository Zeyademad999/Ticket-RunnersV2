// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  status?: number;
}

// User Management Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "banned";
  registrationDate: string;
  lastLogin: string;
  totalBookings: number;
  totalSpent: number;
  nfcCardId?: string;
  attendedEvents: number;
  recurrentUser: boolean;
  location: string;
  profileImage?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
  emergencyContact: string;
  emergencyContactName: string;
  bloodType: string;
  profileImage: string;
  CardActive: boolean;
}

export interface CustomerBooking {
  id: string;
  eventTitle: string;
  date: string;
  tickets: number;
  amount: number;
  status: "confirmed" | "cancelled" | "refunded";
}

export interface CustomerActivity {
  id: string;
  type: "login" | "booking" | "checkin" | "payment" | "refund";
  description: string;
  timestamp: string;
  eventTitle?: string;
  amount?: number;
}

// Event Management Types
export interface EventData {
  id: string | undefined;
  title: string;
  artist_name?: string;
  videoUrl?: string;
  images: EventImage[];
  layoutImageUrl?: string;
  date: string;
  time: string;
  gatesOpenTime?: string;
  location: string;
  price: number;
  startingPrice?: number; // Default ticket price from event form
  originalPrice?: number;
  category: string;
  rating: number;
  attendees: number;
  description: string;
  venueInfo: string;
  termsAndConditions?: string;
  facilities?: Facility[];
  isFeatured?: boolean;
  organizer?: Organizer; // Optional for backward compatibility
  organizers?: Organizer[]; // New field for multiple organizers
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  peopleAdmitted: number;
  peopleRemaining: number;
  totalPayoutPending: number;
  totalPayoutPaid: number;
  ticketCategories: TicketCategory[];
  minimumAge?: string | number;
  childEligibilityEnabled?: boolean;
  childEligibilityRuleType?: string | null;
  childEligibilityMinAge?: number | null;
  childEligibilityMaxAge?: number | null;
  isUnseated?: boolean;
  // Additional fields for comprehensive event details
  gallery?: EventImage[];
  venue?: VenueDetails;
  gates?: Gate[];
  personalizedCardRequirements?: CardRequirements;
  walletRequirements?: WalletRequirements;
}

export interface EventImage {
  url: string;
  isPrimary?: boolean;
}

export interface Facility {
  name: string;
  icon: string;
  available: boolean;
}

export interface Organizer {
  id: string;
  name: string;
  logoUrl: string;
  bio: string;
  events: EventMetrics[];
}

export interface EventMetrics {
  id: string;
  title: string;
  date: string;
  venue: string;
  location: string;
  imageUrl: string;
  giftTicketIds: string[];
  ticketsSold: number;
  ticketsLeft: number;
  completionRate: number;
  netEarnings: number;
  receivedPayouts: number;
  pendingPayouts: number;
  freeTickets: number;
}

export interface TicketCategory {
  name: string;
  price: number;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  color?: string; // Hex color code (e.g., #10B981)
  description?: string;
}

// Comprehensive Event Details Types
export interface VenueDetails {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  capacity: number;
  facilities: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  images?: EventImage[];
  description?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

export interface Gate {
  id: string;
  name: string;
  location: string;
  type: "main" | "vip" | "general" | "emergency";
  status: "open" | "closed" | "maintenance";
  capacity: number;
  currentOccupancy: number;
  openingTime?: string;
  closingTime?: string;
  requirements?: string[];
}

export interface CardRequirements {
  required: boolean;
  cardTypes: string[];
  minimumBalance?: number;
  specialAccess?: boolean;
  description?: string;
}

export interface WalletRequirements {
  required: boolean;
  supportedWallets: string[];
  minimumBalance?: number;
  specialFeatures?: string[];
  description?: string;
}

export interface FeaturedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  image: string;
  isFeatured: boolean;
}

// Ticket Management Types
export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  event_date?: string;
  event_time?: string;
  event_location?: string;
  customerId: string;
  customerName: string;
  category: string;
  price: number;
  purchaseDate: string;
  status: "valid" | "used" | "refunded" | "banned";
  checkInTime?: string;
  dependents: number;
  ticketNumber: string;
  qrCode: string;
  // Buyer information (who purchased the ticket)
  buyer_name?: string;
  buyer_mobile?: string;
  buyer_email?: string;
  // Assigned person information (if ticket was assigned to someone else)
  assigned_name?: string;
  assigned_mobile?: string;
  assigned_email?: string;
  // Flags
  is_assigned_to_me?: boolean;
  is_assigned_to_other?: boolean;
  needs_claiming?: boolean;
  // Event transfer settings
  ticket_transfer_enabled?: boolean;
  // Transfer information (if ticket was transferred to current user)
  is_transferred?: boolean;
  transferred_from_name?: string;
  transferred_from_mobile?: string;
  // Child information (for owner tickets)
  has_child?: boolean;
  child_age?: number | null;
}

export interface TicketTier {
  key: "regular" | "gold" | "platinum";
  label: string;
  price: number;
  description: string;
}

export interface CheckInLog {
  id: string;
  ticketId: string;
  customerName: string;
  eventTitle: string;
  checkInTime: string;
  scanResult: "success" | "already_used" | "invalid" | "expired";
  location: string;
  usherName: string;
}

// Booking & Payment Types
export interface Booking {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  quantity: number;
}

export interface Dependent {
  name: string;
  mobile: string;
  socialMedia: string;
  email?: string;
  assignedTicketNumber: number;
  ticketType: string;
  assigned?: boolean;
  child?: boolean;
}

export interface CreateBookingRequest {
  eventId: string;
  ticketCategory: string;
  quantity: number;
  dependents?: Dependent[];
  paymentMethod: string;
}

export interface PaymentState {
  eventTitle: string;
  totalAmount: number;
  transactionId: string;
}

// NFC Card Management Types
export interface NFCCard {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  status: "active" | "inactive" | "expired";
  issueDate: string;
  expiryDate: string;
  balance: number;
  lastUsed: string;
  usageCount: number;
}

// Admin Management Types
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "usher" | "support";
  status: "active" | "inactive";
  lastLogin: string;
  permissions: string[];
  createdAt: string;
  profileImage?: string;
  fullName: string;
  phone?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

export interface DashboardStats {
  // Event Analytics
  totalEvents: number;
  totalTicketsSold: number;
  totalAttendees: number;

  // Financial Summary
  totalRevenues: number;
  cutCommissions: number;
  pendingPayouts: number;
  completedPayouts: number;
  cardSales: number;
  grossProfit: number;

  // User Summary
  totalVisitors: number;
  registeredUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recurrentUsers: number;

  // Card Summary
  totalCards: number;
  activeCards: number;
  inactiveCards: number;
  expiredCards: number;
}

// Organizer Management Types
export interface OrganizerProfile {
  taxId: string;
  commercialRegistration: string;
  legalBusinessName: string;
  tradeName: string;
  about: string;
  contactMobile: string;
}

export interface OrganizerDashboardStats {
  totalEvents: number;
  runningEvents: number;
  completedEvents: number;
  availableTickets: number;
  totalTicketsSold: number;
  totalAttendees: number;
  totalRevenues: number;
  netRevenues: number;
  totalProcessedPayouts: number;
  totalPendingPayouts: number;
}

export interface PayoutHistory {
  id: string;
  transactionId: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  invoiceUrl: string;
  description: string;
}

// Profile & Settings Types
export interface ProfileSettings {
  profileImage: string;
  phone: string;
  phoneVerified: boolean;
  email: string;
  emailVerified: boolean;
  bloodType: string;
  emergencyContact: string;
  emergencyContactName: string;
  oldPassword: string;
  newPassword: string;
  notifyEmail: boolean;
  notifySMS: boolean;
  passwordOtpVerified: boolean;
  passwordOtpError: string;
}

// Merchant Management Types
export interface Merchant {
  id: string;
  lat: number;
  lng: number;
}

// Authentication Types
export interface LoginRequest {
  login: string; // Can be email or mobile number
  password: string;
  device_fingerprint: string;
}

export interface OtpLoginRequest {
  mobile?: string;
  email?: string;
  otp_code: string;
  device_fingerprint: string;
}

export interface SendOtpRequest {
  mobile?: string;
  email?: string;
}

export interface SendOtpResponse {
  message: string;
  expires_at: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

// New signup start types for the API integration
export interface SignupStartRequest {
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  national_id?: string;
  nationality?: string;
  gender?: string;
  date_of_birth?: string;
  otp_delivery_method?: 'sms' | 'email';
}

export interface SignupStartResponse {
  signup_id: string;
  message?: string;
  mobile_number?: string;
}

// Mobile OTP types for signup process
export interface SendMobileOtpRequest {
  signup_id: number;
  mobile_number: string;
  otp_code: string;
}

export interface SendMobileOtpResponse {
  mobile_otp_sent: boolean;
}

// Mobile OTP verification types
export interface VerifyMobileOtpRequest {
  signup_id: number;
  mobile_number: string;
  otp_code: string;
}

export interface VerifyMobileOtpResponse {
  mobile_verified: boolean;
}

// Email OTP types for signup process
export interface SendEmailOtpRequest {
  signup_id: number | string;
  mobile_number?: string;
  email: string;
  otp_code?: string;
}

export interface SendEmailOtpResponse {
  email_otp_sent: boolean;
}

// Email OTP verification types
export interface VerifyEmailOtpRequest {
  signup_id: number;
  mobile_number?: string;
  email: string;
  otp_code: string;
}

export interface VerifyEmailOtpResponse {
  email_verified: boolean;
}

// Password setting types for signup process
export interface SetPasswordRequest {
  signup_id: number;
  password: string;
  password_confirmation: string;
  mobile_number?: string;
}

export interface SetPasswordResponse {
  password_set?: boolean;
  access?: string;
  refresh?: string;
  user?: any;
  message?: string;
}

// Profile image upload types for signup process
export interface UploadProfileImageRequest {
  signup_id: number;
  file: File;
}

export interface UploadProfileImageResponse {
  profile_image_id: string;
  uploaded: boolean;
  signup_id: number;
}

// Optional information types for signup process
export interface SaveOptionalInfoRequest {
  signup_id: string | number; // Can be string (mobile_number) or number (for backward compatibility)
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_mobile: string;
}

export interface SaveOptionalInfoResponse {
  optional_saved: boolean;
}

// Signup completion types
export interface CompleteSignupRequest {
  mobile_number: string;
  password: string;
  national_id?: string;
  nationality?: string;
  gender?: string;
  date_of_birth?: string;
}

export interface CustomerInfo {
  id: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  profile_image_id: string;
  profile_image?: string; // Full URL from backend
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CompleteSignupResponse {
  access: string;
  refresh: string;
  user: any; // UserProfileSerializer data
  message?: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
  customer?: UserInfo; // Support both user and customer properties
  refreshToken?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_at: string;
}

export interface LogoutResponse {
  message: string;
}

export interface LogoutAllResponse {
  message: string;
}

export interface CustomerInfo {
  id: string;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  profile_image_id: string;
  profile_image?: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  emergency_contact_name?: string;
  emergency_contact_mobile?: string;
  blood_type?: string;
}

export interface GetCurrentUserResponse {
  customer: CustomerInfo;
}

// Password Reset OTP Types
export interface PasswordResetOtpRequest {
  mobile_number: string;
}

export interface PasswordResetOtpResponse {
  message: string;
}

export interface VerifyPasswordResetOtpRequest {
  mobile_number: string;
  otp_code: string;
}

export interface VerifyPasswordResetOtpResponse {
  password_reset_token: string;
  expires_in_seconds: number;
}

export interface ConfirmPasswordResetRequest {
  password_reset_token: string;
  password: string;
  password_confirmation: string;
}

export interface ConfirmPasswordResetResponse {
  message: string;
}

// Search Events Types
export interface SearchEventsRequest {
  q: string; // Query string (2-100 characters)
  limit?: number; // 1-50, default 10
  page?: number; // >= 1, default 1
}

export interface SearchEventsResponse {
  data: EventData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Query Types
export interface EventFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  featured?: boolean;
  search?: string;
}

export interface UserFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface TicketFilters {
  status?: string;
  eventId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// File Upload Types
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Transfer & Sharing Types
export interface TransferTicketRequest {
  ticketId: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientName: string;
}

export interface TransferTicketResponse {
  transferId: string;
  status: "pending" | "completed" | "failed";
  message: string;
}

// Notification Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// Search Types
export interface SearchResult {
  events: EventData[];
  organizers: Organizer[];
  totalResults: number;
}

// Filter Events API Types
export interface FilterEventsRequest {
  category_id?: number;
  date_start?: string;
  date_end?: string;
  limit?: number;
  organizer_id?: number;
  page?: number;
  price_max?: number;
  price_min?: number;
  venue_id?: number;
  artist?: string;
}

export interface FilteredEvent {
  id: number;
  title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  thumbnail_id: number;
  category_id: number;
  featured: boolean;
  thumbnail_path: string;
  category_name: string;
  starting_price: string | null;
}

export interface FilterEventsResponse {
  events: FilteredEvent[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more: boolean;
  };
}

// Analytics Types
export interface EventAnalytics {
  eventId: string;
  ticketsSold: number;
  revenue: number;
  checkIns: number;
  attendanceRate: number;
  popularTicketCategories: TicketCategory[];
  dailySales: Array<{
    date: string;
    sales: number;
    tickets: number;
  }>;
}

// Customer Bookings API Types
export interface CustomerBookingItem {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  order_id: string;
  ticket_category: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  purchase_date: string;
  status: "confirmed" | "cancelled" | "refunded" | "claimed";
  qr_enabled: boolean;
  check_in_time?: string;
  dependents?: Dependent[];
  dependent_name?: string;
  dependent_mobile?: string;
  is_claimed?: boolean;
  additional_fees?: {
    card_cost?: number;
    renewal_cost?: number;
    subtotal?: number;
    vat_amount?: number;
  };
}

export interface CustomerBookingsResponse {
  page: string;
  limit: string;
  count: string;
  items: CustomerBookingItem[];
}

// Customer Card and Wallet Details API Types
export interface NFCCardDetails {
  card_number: string;
  card_status: string;
  card_issue_date: string;
  card_expiry_date: string;
}

export interface WalletDetails {
  wallet_status: string;
  wallet_expiry_date: string;
}

export interface CustomerCardDetailsResponse {
  customer_first_name: string;
  nfc_card: NFCCardDetails;
  wallet: WalletDetails;
}

// Customer Profile Update API Types
export type BloodType =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "Unknown";

export interface UpdateProfileRequest {
  mobile_number?: string;
  email?: string;
  blood_type?: BloodType;
  emergency_contact_name?: string;
  emergency_contact_mobile?: string;
  password?: string;
  password_confirmation?: string;
}

export interface UpdateProfileResponse {
  updated: boolean;
  field: string;
  updated_at: string;
}

// Mobile Number Verification API Types
export interface VerifyMobileRequest {
  new_mobile_number: string;
  otp_code: string;
}

export interface VerifyMobileResponse {
  mobile_number: string;
  verified: boolean;
}

// Email Verification API Types
export interface VerifyEmailRequest {
  new_email: string;
  otp_code: string;
}

export interface VerifyEmailResponse {
  email: string;
  verified: boolean;
}

// Event Favorites API Types
export interface AddToFavoritesRequest {
  event_id: number;
}

export interface AddToFavoritesResponse {
  event_id: number;
  favorited: boolean;
  favorite_time: string;
}

// Remove from Favorites API Types
export interface RemoveFromFavoritesResponse {
  event_id: number;
  favorited: boolean;
  removed_count: string;
}

// Get Favorites API Types
export interface FavoriteEvent {
  id: number;
  event_id: number;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_price: number;
  event_category: string;
  event_image: string;
  favorite_time: string;
}

export interface GetFavoritesResponse {
  favorites: FavoriteEvent[];
  total: number;
  page: number;
  limit: number;
}
