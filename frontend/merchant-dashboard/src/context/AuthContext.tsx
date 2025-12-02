import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Merchant } from "../types";
import { apiService } from "../services/api";

interface AuthContextType {
  merchant: Merchant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sendOTP: (mobile: string, password: string) => Promise<void>;
  verifyOTP: (mobile: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  updateMerchant: (merchant: Merchant) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on app start
    const accessToken = localStorage.getItem("access_token");
    const merchantData = localStorage.getItem("merchantData");

    if (accessToken && merchantData) {
      try {
        const parsedMerchant = JSON.parse(merchantData);
        setMerchant(parsedMerchant);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error parsing merchant data:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("merchantData");
      }
    }
    setIsLoading(false);
  }, []);

  const sendOTP = async (mobile: string, password: string) => {
    try {
      const response = await apiService.login({
        mobile_number: mobile,
        password,
      });
      if (response.success) {
        // OTP sent successfully, but not authenticated yet
        return;
      } else {
        throw new Error(response.message || "Failed to send OTP");
      }
    } catch (error) {
      throw error;
    }
  };

  const verifyOTP = async (mobile: string, otp: string) => {
    try {
      const response = await apiService.verifyOTP({
        mobile_number: mobile,
        otp,
      });
      if (response.success && response.data) {
        // Store access and refresh tokens
        localStorage.setItem("access_token", response.data.access);
        localStorage.setItem("refresh_token", response.data.refresh);
        
        // Transform backend merchant data to frontend format
        const merchantData: any = response.data.merchant;
        const transformedMerchant: Merchant = {
          id: merchantData.id?.toString() || "",
          name: merchantData.business_name || "",
          address: merchantData.address || "",
          gmaps_location: merchantData.gmaps_location || "",
          mobile_number: merchantData.mobile_number || "",
          contact_name: merchantData.contact_name || merchantData.owner_name || "",
          status: merchantData.status || "active",
          created_at: merchantData.registration_date || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        localStorage.setItem("merchantData", JSON.stringify(transformedMerchant));
        setMerchant(transformedMerchant);
        setIsAuthenticated(true);
      } else {
        throw new Error(response.message || "OTP verification failed");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("merchantData");
      setMerchant(null);
      setIsAuthenticated(false);
    }
  };

  const updateMerchant = (updatedMerchant: Merchant) => {
    setMerchant(updatedMerchant);
    localStorage.setItem("merchantData", JSON.stringify(updatedMerchant));
  };

  const value: AuthContextType = {
    merchant,
    isAuthenticated,
    isLoading,
    sendOTP,
    verifyOTP,
    logout,
    updateMerchant,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
