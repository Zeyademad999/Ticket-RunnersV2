export interface Merchant {
  id: string;
  name: string;
  address: string;
  gmaps_location: string;
  mobile_number: string;
  contact_name: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface NFCCard {
  id: string;
  serial_number: string;
  status: "available" | "assigned" | "delivered" | "active";
  merchant_id?: string;
  merchant_name?: string;
  customer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  assigned_at?: string;
  delivered_at?: string;
  hashed_code?: string;
  issue_date?: string;
  expiry_date?: string;
  balance?: number;
  card_type?: string;
  usage_count?: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  mobile_number: string;
  name: string;
  email?: string;
  status: "active" | "inactive";
  fees_paid: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CardAssignment {
  card_serial: string;
  customer_mobile: string;
  otp: string;
  hashed_code?: string;
}

export interface LoginCredentials {
  mobile_number: string;
  password: string;
}

export interface OTPVerification {
  mobile_number: string;
  otp: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface MobileChange {
  current_mobile: string;
  new_mobile: string;
  otp: string;
}

export interface DashboardStats {
  total_available_cards: number;
  total_delivered_cards: number;
  total_assigned_cards: number;
  total_cards: number;
  recent_activity: {
    id: number;
    action: string;
    card_serial: string;
    customer_name: string;
    timestamp: string;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
