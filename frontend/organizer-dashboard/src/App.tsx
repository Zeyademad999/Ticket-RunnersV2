import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import OrganizerLogin from "./pages/OrganizerLogin";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import OrganizerEventDetail from "./pages/OrganizerEventDetail";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "./Contexts/AuthContext";
import { ThemeProvider } from "./hooks/useTheme";

/* -------------------------------------------------------------------------- */
/*                                MainLayout                                  */
/* -------------------------------------------------------------------------- */

const MainLayout = () => (
  <>
    <Outlet />
  </>
);

/* -------------------------------------------------------------------------- */
/*                                   App                                      */
/* -------------------------------------------------------------------------- */

const queryClient = new QueryClient();

export default function App() {
  const { i18n } = useTranslation();

  //direction switch for arabic
  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [i18n.language]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />

              <Routes>
                {/* Public routes */}
                <Route path="/" element={<OrganizerLogin />} />
                <Route path="/login" element={<OrganizerLogin />} />
                
                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <OrganizerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/event/:id"
                  element={
                    <ProtectedRoute>
                      <OrganizerEventDetail />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
