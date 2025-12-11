import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isBefore, parseISO } from "date-fns";
import { ProfileTabsNav } from "@/components/ProfileTabsNav";
import { ProfileTabsContent } from "@/components/ProfileTabsContent";
import { useAuth } from "@/Contexts/AuthContext";
import { ProfileProvider, useProfile } from "@/contexts/ProfileContext";
import { tokenManager } from "@/lib/tokenManager";
import { clearSecureAuth, secureStorage } from "@/lib/secureStorage";
import { normalizeImageUrl } from "@/lib/utils";
// Inner component that uses ProfileContext
const ProfileContent = () => {
  const [showCardDetails, setShowCardDetails] = useState(false);
  // ① read the URL hash (#nfc, #bookings …)
  const { hash } = useLocation();
  const { t } = useTranslation();
  const { user, getCurrentUser, isLoading, logout, openLogin } = useAuth();

  // Get data from ProfileContext
  const {
    profileData,
    loading: dataLoading,
    error: dataError,
    refetch,
  } = useProfile();

  const initialTab = (() => {
    const h = hash.replace("#", "");
    const valid = [
      "bookings",
      "favorites",
      "dependants",
      "visits",
      "billing",
      "nfc",
      "settings",
    ];
    return valid.includes(h) ? h : "bookings";
  })();
  // ② keep Tabs state in React so the URL can update as the user clicks tabs
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [openFeedbackId, setOpenFeedbackId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  // Get navigate function early to avoid initialization issues
  const navigate = useNavigate();

  // Fetch user data on component mount
  useEffect(() => {
    console.log(
      "Profile component mounted, user state:",
      user ? "exists" : "null"
    );
    if (!user) {
      console.log("No user found, attempting to get current user...");
      getCurrentUser();
    }
  }, [user, getCurrentUser]);

  // Check authentication status and prevent infinite loops
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Only check if we have a user but no valid tokens
      if (user) {
        console.log("Checking authentication status for user:", user.id);
        const isAuthenticated = await tokenManager.isAuthenticated();
        console.log("User authentication status:", isAuthenticated);
        if (!isAuthenticated) {
          console.log("User exists but tokens are invalid, clearing session");
          clearSecureAuth();
          // Use the logout function from AuthContext instead of setUser
          await logout();
          navigate("/");
        }
      }
    };

    // Only run this check once when user changes, not on every render
    if (user) {
      checkAuthStatus();
    }
  }, [user, navigate, logout]);

  // Handle authentication errors
  useEffect(() => {
    const handleAuthError = () => {
      console.warn("Authentication error detected, redirecting to login");
      // Clear any stored auth data using secure storage
      clearSecureAuth();
      // Redirect to login or show login modal
      navigate("/");
    };

    // Listen for auth-required events
    window.addEventListener("auth-required", handleAuthError);

    return () => {
      window.removeEventListener("auth-required", handleAuthError);
    };
  }, [navigate]);

  // Use real user data from AuthContext
  console.log("Profile page - user object:", user);
  console.log("Profile page - user.profile_image:", user?.profile_image);
  
  const userInfo = user
    ? {
        id: user.id,
        name: user.name || `${user.first_name} ${user.last_name}`.trim(),
        phone: user.mobile_number || "",
        email: user.email,
        emergencyContact: user.emergency_contact_mobile || "",
        emergencyContactName: user.emergency_contact_name || "",
        bloodType: user.blood_type || "",
        profileImage: normalizeImageUrl(user.profile_image),
        CardActive: user.isVip || false,
      }
    : {
        id: "",
        name: "",
        phone: "",
        email: "",
        emergencyContact: "",
        emergencyContactName: "",
        bloodType: "",
        profileImage: "/Portrait_Placeholder.png",
        CardActive: false,
      };
  
  console.log("Profile page - userInfo.profileImage:", userInfo.profileImage);

  // Determine if user has an active NFC card based on API data
  const hasActiveNfcCard =
    profileData.cardDetails?.nfc_card?.card_status === "active" ||
    profileData.cardDetails?.nfc_card?.card_status === "Active";

  // Debug logging to help troubleshoot
  console.log("Profile Data:", profileData);
  console.log("Card Details:", profileData.cardDetails);
  console.log("NFC Card:", profileData.cardDetails?.nfc_card);
  console.log("Card Status:", profileData.cardDetails?.nfc_card?.card_status);
  console.log("Has Active NFC Card:", hasActiveNfcCard);

  const [profileImage, setProfileImage] = useState<string>(() => {
    return userInfo.profileImage;
  });
  const [bloodType, setBloodType] = useState(userInfo.bloodType || "");
  const [emergencyContact, setEmergencyContact] = useState(
    userInfo.emergencyContact || ""
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    userInfo.emergencyContactName || ""
  );

  // Update profile state when user data changes
  useEffect(() => {
    if (user) {
      const updatedUserInfo = {
        id: user.id,
        name: user.name || `${user.first_name} ${user.last_name}`.trim(),
        phone: user.mobile_number || "",
        email: user.email,
        emergencyContact: user.emergency_contact_mobile || "",
        emergencyContactName: user.emergency_contact_name || "",
        bloodType: user.blood_type || "",
        profileImage: normalizeImageUrl(user.profile_image),
        CardActive: user.isVip || false,
      };
      setProfileImage(updatedUserInfo.profileImage);
      setBloodType(updatedUserInfo.bloodType);
      setEmergencyContact(updatedUserInfo.emergencyContact);
      setEmergencyContactName(updatedUserInfo.emergencyContactName);
    }
  }, [user]);

  // Real data is now fetched by the API hooks above

  // Use real NFC card data from API with proper null checking
  const nfcCard = profileData.cardDetails?.nfc_card
    ? {
        status: profileData.cardDetails.nfc_card.card_status || "Inactive",
        cardNumber:
          profileData.cardDetails.nfc_card.card_number || "**** **** **** ****",
        issueDate:
          profileData.cardDetails.nfc_card.card_issue_date ||
          new Date().toISOString().split("T")[0],
        expiryDate:
          profileData.cardDetails.nfc_card.card_expiry_date ||
          new Date().toISOString().split("T")[0],
        isVirtual: profileData.cardDetails.nfc_card.is_virtual || false,
      }
    : {
        status: "Inactive",
        cardNumber: "**** **** **** ****",
        issueDate: new Date().toISOString().split("T")[0],
        expiryDate: new Date().toISOString().split("T")[0],
        isVirtual: false,
      };

  const [addedToWallet, setAddedToWallet] = useState(false);
  const now = new Date();
  const expiry = parseISO(nfcCard.expiryDate);
  const isExpired = isBefore(expiry, now);
  // ③ whenever the tab changes, push the new hash to the URL (nice for reload / share)

  useEffect(() => {
    navigate(`#${activeTab}`, { replace: true });
  }, [activeTab, navigate]);

  const handleViewDetails = (ticketID: number | string) => {
    navigate(`/ticket/${ticketID}`);
  };
  const handleAddCalendar = (b: (typeof profileData.bookings)[number]) => {
    const start = new Date(`${b.date} ${b.time}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]|\.\d{3}/g, "")
        .slice(0, 15);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ticket Runners//EN",
      "BEGIN:VEVENT",
      `UID:${b.id}@ticketrunners.com`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${b.eventTitle}`,
      `LOCATION:${b.location}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${b.eventTitle.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Calendar file downloaded" });
  };
  const handleSubmitFeedback = () => {
    if (!openFeedbackId) return;
    // TODO: Submit feedback to API
    console.log({
      visitId: openFeedbackId,
      feedback: feedbackText,
      rating,
    });
    setOpenFeedbackId(null);
    setFeedbackText("");
    setRating(0);
  };

  const handleRenewTemporaryAccess = () => {
    toast({
      title: "Temporary Access Renewal",
      description: "Your request to renew temporary access has been submitted.",
      variant: "default", // You can use "destructive" or "success" if your UI supports it
      duration: 4000, // Optional: time in ms the toast is shown
    });
  };

  const handleAddToWallet = () => {
    // Add any actual logic here (e.g. Apple/Google Wallet API)
    setAddedToWallet(true);
  };

  const [phone, setPhone] = useState(userInfo.phone);
  const [email, setEmail] = useState(userInfo.email);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleSendPhoneOtp = () => {
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    toast({ title: "OTP sent (mock)", description: generated });
  };
  const handleSendEmailOtp = () => {
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    toast({ title: "Verification code sent (mock)", description: generated });
  };

  // Add state for password OTP verification
  const [passwordOtpVerified, setPasswordOtpVerified] = useState(false);

  const handleSendPasswordOtp = () => {
    const generated = Math.floor(100000 + Math.random() * 900000).toString();
    toast({ title: "Verification code sent (mock)", description: generated });
  };

  // Add state for password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Add state for notification preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(true);

  // Add state for NFC card status
  const [nfcCardStatus, setNfcCardStatus] = useState(nfcCard.status);

  // NFC Card button handlers
  const handleBuyNewCard = () => {
    // Navigate to the dedicated NFC card payment page
    navigate("/nfc-payment");
  };
  const handleDeactivateCard = () => {
    setNfcCardStatus("Inactive");
    toast({
      title: "NFC Card Deactivated",
      description: "Your NFC card is now inactive.",
    });
  };

  // Add handler for settings save
  const handleSettingsSave = async () => {
    // Save all settings using secure storage
    const settings = {
      bloodType,
      emergencyContact,
      emergencyContactName,
      notifyEmail,
      notifySMS,
    };
    try {
      await secureStorage.setItem("userSettings", JSON.stringify(settings), {
        encrypt: true,
      });
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved securely.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Save failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Transform fetched favorites data to match the expected format
  const favoriteEvents = (profileData.favoriteEvents || []).map((favorite) => ({
    id: favorite.event_id?.toString() || favorite.id?.toString(),
    title: favorite.event_title,
    date: favorite.event_date,
    time: favorite.event_time,
    location: favorite.event_location,
    price: favorite.event_price,
    category: favorite.event_category,
    image: favorite.event_image,
  }));

  // Show loading state while fetching user data or profile data
  if ((isLoading && !user) || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">{t("profilepage.loading")}</p>
        </div>
      </div>
    );
  }

  // Show error state if there's a critical data error
  if (dataError && !(profileData.bookings?.length) && !profileData.cardDetails) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            {t("profilepage.error.title", "Unable to Load Profile")}
          </h2>
          <p className="text-gray-300 mb-4">
            {t(
              "profilepage.error.description",
              "We're having trouble loading your profile data. This might be a temporary issue."
            )}
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {t("profilepage.error.retry", "Try Again")}
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="text-gray-300 hover:text-white"
            >
              {t("profilepage.error.home", "Go to Home")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no user data is available
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-yellow-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-300 mb-4">
            You need to be logged in to view your profile. Please log in to
            continue.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => {
                // Store current URL for redirect after login
                const currentPath = window.location.pathname + window.location.hash;
                sessionStorage.setItem('authRedirectUrl', currentPath);
                // Open login modal
                openLogin();
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {t("auth.sign_in", "Sign In")}
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="text-gray-300 hover:text-white"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="mx-10 flex gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <img
            src={userInfo.profileImage}
            alt="Profile"
            className="w-24 h-24 rounded-full object-contain border"
            onError={(e) => {
              // Only try placeholder once to prevent infinite loop
              if (!e.currentTarget.dataset.fallback) {
                e.currentTarget.dataset.fallback = "true";
                e.currentTarget.src = "/Portrait_Placeholder.png";
              } else {
                // If placeholder also fails, hide and show SVG avatar
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent && !parent.querySelector(".default-avatar")) {
                  const avatar = document.createElement("div");
                  avatar.className = "default-avatar w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center border";
                  avatar.innerHTML = `<svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path></svg>`;
                  parent.insertBefore(avatar, e.currentTarget);
                }
              }
            }}
          />
          <div>
            <CardTitle> {t("profilepage.settingsTab.ID")}</CardTitle>
            <div className="flex items-center gap-2">
              <CardTitle> {userInfo.id}</CardTitle>
              {user?.labels?.some((label: any) => 
                (typeof label === 'string' && label === 'Black Card Customer') ||
                (typeof label === 'object' && label?.name === 'Black Card Customer')
              ) && (
                <span className="bg-black text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  Black Card Customer
                </span>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={() => getCurrentUser()}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? t("profilepage.refreshing") : t("profilepage.refresh")}
        </Button>
      </div>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {t("profilepage.profileTabs.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("profilepage.profileTabs.description")}
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <ProfileTabsNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              t={t as (key: string, defaultValue?: string) => string}
            />
            <ProfileTabsContent
              t={t as (key: string, defaultValue?: string) => string}
              favoriteEvents={favoriteEvents}
              openFeedbackId={openFeedbackId}
              setOpenFeedbackId={setOpenFeedbackId}
              feedbackText={feedbackText}
              setFeedbackText={setFeedbackText}
              handleSubmitFeedback={handleSubmitFeedback}
              handleAddCalendar={handleAddCalendar}
              handleViewDetails={handleViewDetails}
              userInfo={userInfo}
              nfcCard={nfcCard}
              nfcCardStatus={nfcCardStatus}
              hasActiveNfcCard={hasActiveNfcCard}
              showCardDetails={showCardDetails}
              setShowCardDetails={setShowCardDetails}
              handleBuyNewCard={handleBuyNewCard}
              handleDeactivateCard={handleDeactivateCard}
              handleAddToWallet={handleAddToWallet}
              addedToWallet={addedToWallet}
              expiry={expiry}
              isExpired={isExpired}
              handleRenewTemporaryAccess={handleRenewTemporaryAccess}
              profileImage={profileImage}
              setProfileImage={setProfileImage}
              phone={phone}
              setPhone={setPhone}
              phoneVerified={phoneVerified}
              setPhoneVerified={setPhoneVerified}
              handleSendPhoneOtp={handleSendPhoneOtp}
              email={email}
              setEmail={setEmail}
              emailVerified={emailVerified}
              setEmailVerified={setEmailVerified}
              handleSendEmailOtp={handleSendEmailOtp}
              oldPassword={oldPassword}
              setOldPassword={setOldPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              notifyEmail={notifyEmail}
              setNotifyEmail={setNotifyEmail}
              notifySMS={notifySMS}
              setNotifySMS={setNotifySMS}
              bloodType={bloodType}
              setBloodType={setBloodType}
              emergencyContact={emergencyContact}
              setEmergencyContact={setEmergencyContact}
              emergencyContactName={emergencyContactName}
              setEmergencyContactName={setEmergencyContactName}
              passwordOtpVerified={passwordOtpVerified}
              setPasswordOtpVerified={setPasswordOtpVerified}
              passwordOtpError=""
              handleSendPasswordOtp={handleSendPasswordOtp}
              handleVerifyPasswordOtp={() => {}}
              handleSettingsSave={handleSettingsSave}
              notificationWarning=""
              // Unified data loading and error states
              dataLoading={dataLoading}
              dataError={dataError}
              refetch={refetch}
            />
          </Tabs>
        </div>
      </main>
    </div>
  );
};

// Main Profile component that provides context
const Profile = () => {
  return (
    <ProfileProvider>
      <ProfileContent />
    </ProfileProvider>
  );
};

export default Profile;
