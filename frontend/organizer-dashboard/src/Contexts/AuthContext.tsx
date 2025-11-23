import { createContext, useContext, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import organizerApi, { OrganizerProfile } from "@/lib/api/organizerApi";

interface AuthProviderProps {
  children: ReactNode;
}

type AuthContextType = {
  isAuthenticated: boolean;
  organizer: OrganizerProfile | null;
  isLoading: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  verifyOTP: (mobile: string, otpCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState<boolean>(false);
  const { t } = useTranslation();

  // Check authentication status on mount (only once)
  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuthStatus();
      setHasCheckedAuth(true);
    }
  }, [hasCheckedAuth]);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("organizer_access_token");
      const storedProfile = localStorage.getItem("organizer_profile");

      if (token && storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        
        // Check if organizer is suspended from stored profile
        if (parsedProfile?.status === "suspended") {
          setIsAuthenticated(false);
          setOrganizer(null);
          localStorage.removeItem("organizer_access_token");
          localStorage.removeItem("organizer_refresh_token");
          localStorage.removeItem("organizer_authenticated");
          localStorage.removeItem("organizer_profile");
          setIsLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        setOrganizer(parsedProfile);
        
        // Try to refresh profile from API to verify token is still valid
        try {
          const profile = await organizerApi.getMe();
          
          // Check if organizer is suspended from API
          if (profile?.status === "suspended") {
            setIsAuthenticated(false);
            setOrganizer(null);
            localStorage.removeItem("organizer_access_token");
            localStorage.removeItem("organizer_refresh_token");
            localStorage.removeItem("organizer_authenticated");
            localStorage.removeItem("organizer_profile");
            setIsLoading(false);
            return;
          }
          
          setOrganizer(profile);
          localStorage.setItem("organizer_profile", JSON.stringify(profile));
        } catch (error: any) {
          // If API call fails with 401, token is invalid - clear auth
          if (error.response?.status === 401) {
            setIsAuthenticated(false);
            setOrganizer(null);
            localStorage.removeItem("organizer_access_token");
            localStorage.removeItem("organizer_refresh_token");
            localStorage.removeItem("organizer_authenticated");
            localStorage.removeItem("organizer_profile");
          } else {
            // Other errors - keep using stored profile but log error
            console.error("Failed to refresh profile:", error);
          }
        }
      } else {
        setIsAuthenticated(false);
        setOrganizer(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
      setOrganizer(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (mobile: string, password: string): Promise<void> => {
    try {
      await organizerApi.login({ mobile, password });
      // OTP will be sent, but we don't set authenticated yet
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        t("organizer.login.error.loginFailed");
      throw new Error(errorMessage);
    }
  };

  const verifyOTP = async (mobile: string, otpCode: string): Promise<void> => {
    try {
      const response = await organizerApi.verifyOTP({ mobile, otp_code: otpCode });
      
      // Check if organizer is suspended
      if (response.organizer?.status === "suspended") {
        // Clear any stored data
        localStorage.removeItem("organizer_access_token");
        localStorage.removeItem("organizer_refresh_token");
        localStorage.removeItem("organizer_authenticated");
        localStorage.removeItem("organizer_profile");
        setIsAuthenticated(false);
        setOrganizer(null);
        throw new Error(t("organizer.login.error.suspended") || "Your account has been suspended. Please contact support.");
      }
      
      // Set authenticated state immediately - don't wait for checkAuthStatus
      setIsAuthenticated(true);
      setOrganizer(response.organizer);
      setIsLoading(false);
      // Mark as checked so checkAuthStatus doesn't run again
      setHasCheckedAuth(true);
    } catch (error: any) {
      // If it's already our suspended error, re-throw it
      if (error.message && error.message.includes("suspended")) {
        throw error;
      }
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        t("organizer.login.error.invalidOtp");
      throw new Error(errorMessage);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await organizerApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticated(false);
      setOrganizer(null);
      setHasCheckedAuth(false); // Reset so auth check can run again on next mount
    }
  };

  const refreshProfile = async (): Promise<void> => {
    try {
      const profile = await organizerApi.getMe();
      setOrganizer(profile);
      localStorage.setItem("organizer_profile", JSON.stringify(profile));
    } catch (error) {
      console.error("Failed to refresh profile:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        organizer,
        isLoading,
        login,
        verifyOTP,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
