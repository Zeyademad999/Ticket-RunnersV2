import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "./Contexts/AuthContext";
import { ThemeProvider } from "./hooks/useTheme";

// Components
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { ServerStatusBanner } from "./components/ServerStatusBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalErrorHandler } from "./components/GlobalErrorHandler";

// Main App Pages
import Index from "./pages/Index";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import FAQsPage from "./pages/FAQsPage";
import HowItWorks from "./pages/HowItWorks";
import OrganizersPage from "./pages/OrganizersPage";
import ViewOrganizersPage from "./pages/ViewOrganizersPage";
import AllEvents from "./pages/AllEvents";
import EventDetail from "./pages/EventDetail";
import Booking from "./pages/Booking";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import Profile from "./pages/Profile";
import TicketDetail from "./pages/TicketDetail";
import TransferTicketsPage from "./pages/TransferTicketsPage";
import TransferTicketPage from "./pages/TransferTicketPage";
import GiftTicketPage from "./pages/GiftTicketPage";
import NFCcardPayment from "./pages/NFCcardPayment";
import NearbyMerchants from "./pages/NearbyMerchants";
import MerchantPage from "./pages/MerchantPage";
import ExpiredEvent from "./pages/ExpiredEvent";
import NotFound from "./pages/NotFound";
import ForgetPassword from "./pages/ForgetPassword";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/refundPolicy";
import SignupPage from "./pages/SignupPage";

// Note: Admin and Organizer dashboards are separate projects

/* -------------------------------------------------------------------------- */
/*                                   App                                      */
/* -------------------------------------------------------------------------- */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in newer versions)
    },
  },
});

export default function App() {
  const { i18n } = useTranslation();
  const [showServerBanner, setShowServerBanner] = useState(false);

  //direction switch for arabic
  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  // Check for server errors and show banner
  useEffect(() => {
    const handleServerError = () => {
      setShowServerBanner(true);
    };

    // Listen for server errors
    window.addEventListener("server-error", handleServerError);

    return () => {
      window.removeEventListener("server-error", handleServerError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />

              <div className="min-h-screen flex flex-col">
                <ScrollToTop />
                <GlobalErrorHandler />
                <ServerStatusBanner
                  show={showServerBanner}
                  onDismiss={() => setShowServerBanner(false)}
                />
                <Header />
                <ErrorBoundary>
                  <main className="flex-1">
                    <Routes>
                      {/* Main App Routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/about" element={<AboutUs />} />
                      <Route path="/contact" element={<ContactUs />} />
                      <Route path="/faqs" element={<FAQsPage />} />
                      <Route path="/how-it-works" element={<HowItWorks />} />
                      <Route path="/organizers" element={<OrganizersPage />} />
                      <Route
                        path="/view-organizers/:id"
                        element={<ViewOrganizersPage />}
                      />
                      <Route path="/events" element={<AllEvents />} />
                      <Route path="/event/:id" element={<EventDetail />} />
                      <Route path="/booking/:eventId" element={<Booking />} />
                      <Route
                        path="/payment-confirmation"
                        element={<PaymentConfirmation />}
                      />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/ticket/:id" element={<TicketDetail />} />
                      <Route
                        path="/transfer-tickets"
                        element={<TransferTicketsPage />}
                      />
                      <Route
                        path="/transfer-ticket/:ticketId"
                        element={<TransferTicketPage />}
                      />
                      <Route
                        path="/gift-ticket/:ticketId"
                        element={<GiftTicketPage />}
                      />
                      <Route path="/nfc-payment" element={<NFCcardPayment />} />
                      <Route
                        path="/nearby-merchants"
                        element={<NearbyMerchants />}
                      />
                      <Route path="/merchant/:id" element={<MerchantPage />} />
                      <Route path="/expired-event" element={<ExpiredEvent />} />
                      <Route
                        path="/forget-password"
                        element={<ForgetPassword />}
                      />
                      <Route path="/signup" element={<SignupPage />} />
                      {/* Redirect /my-tickets to profile bookings tab */}
                      <Route 
                        path="/my-tickets" 
                        element={<Navigate to="/profile#bookings" replace />} 
                      />
                      <Route path="/terms" element={<TermsAndConditions />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/refund-policy" element={<RefundPolicy />} />

                      {/* Note: Admin and Organizer routes are in separate projects */}

                      {/* Catch all other routes and redirect to home */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </ErrorBoundary>
                <Footer />
              </div>
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
