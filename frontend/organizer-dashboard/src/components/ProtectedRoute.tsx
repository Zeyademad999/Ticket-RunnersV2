import { Navigate } from "react-router-dom";
import { useAuth } from "@/Contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, organizer } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{/* Loading spinner can be added here */}</div>
      </div>
    );
  }

  // Check if organizer is suspended
  if (organizer?.status === "suspended") {
    return <Navigate to="/login" replace state={{ suspended: true }} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

