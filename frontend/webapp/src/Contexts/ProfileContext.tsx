import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useUnifiedProfileData } from "@/hooks/useUnifiedProfileData";

// Types for profile data
interface DependantTicket {
  id: number;
  eventTitle: string;
  date: string;
  time: string;
  location: string;
  ticketPrice: number;
  quantity: number;
  qrEnabled: boolean;
  status: "pending" | "claimed";
}

interface Visit {
  id: number;
  eventTitle: string;
  date: string;
  location: string;
  entranceTime: string;
  dependents: string[];
}

interface BillingItem {
  id: number;
  date: string;
  eventTitle: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  invoiceId: string;
}

interface ProfileData {
  bookings: CustomerBookingItem[];
  dependants: DependantTicket[];
  visits: Visit[];
  billingHistory: BillingItem[];
  favoriteEvents: any[];
  cardDetails: any;
}

interface ProfileContextType {
  // Data
  profileData: ProfileData;

  // Loading states
  loading: {
    bookings: boolean;
    dependants: boolean;
    visits: boolean;
    billing: boolean;
    favorites: boolean;
    cardDetails: boolean;
  };

  // Error states
  errors: {
    bookings: string | null;
    dependants: string | null;
    visits: string | null;
    billing: string | null;
    favorites: string | null;
    cardDetails: string | null;
  };

  // Actions
  refetchAll: () => Promise<void>;
  refetchBookings: () => Promise<void>;
  refetchDependants: () => Promise<void>;
  refetchVisits: () => Promise<void>;
  refetchBilling: () => Promise<void>;
  refetchFavorites: () => Promise<void>;
  refetchCardDetails: () => Promise<void>;

  // Utility functions
  isDataLoaded: boolean;
  hasErrors: boolean;

  // Additional properties for compatibility
  error: string | null;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({
  children,
}) => {
  // Use the unified profile data hook
  const {
    data: profileData,
    loading,
    error,
    refetch,
  } = useUnifiedProfileData();

  // Simple refetch functions that delegate to the unified hook
  const refetchAll = async () => {
    await refetch();
  };

  const refetchBookings = async () => {
    await refetch();
  };

  const refetchDependants = async () => {
    await refetch();
  };

  const refetchVisits = async () => {
    await refetch();
  };

  const refetchBilling = async () => {
    await refetch();
  };

  const refetchFavorites = async () => {
    // Refetch favorites using the unified hook
    await refetch();
  };

  const refetchCardDetails = async () => {
    await refetch();
  };

  // Utility computed values
  const isDataLoaded =
    profileData.bookings.length > 0 || profileData.cardDetails !== null;
  const hasErrors = error !== null;

  const contextValue: ProfileContextType = useMemo(
    () => ({
      profileData,
      loading,
      errors: {
        bookings: error,
        dependants: error,
        visits: error,
        billing: error,
        favorites: null,
        cardDetails: error,
      },
      refetchAll,
      refetchBookings,
      refetchDependants,
      refetchVisits,
      refetchBilling,
      refetchFavorites,
      refetchCardDetails,
      isDataLoaded,
      hasErrors,
      error,
      refetch,
    }),
    [profileData, loading, error, refetch]
  );

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
