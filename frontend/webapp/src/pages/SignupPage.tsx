import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SignupForm } from "@/components/SignupForm";
import { useAuth } from "@/Contexts/AuthContext";

/**
 * Dedicated signup page that handles token-based registration
 * Accessible at /signup?token=...
 */
export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const token = searchParams.get('token');

  // If user is already authenticated, redirect to profile with bookings tab
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile#bookings', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleClose = () => {
    // If there's a token, don't allow closing - user must complete registration
    if (token) {
      return;
    }
    navigate('/', { replace: true });
  };

  const handleSwitchToLogin = () => {
    // If there's a token, don't allow switching to login - user must complete registration
    if (token) {
      return;
    }
    navigate('/login', { replace: true });
  };

  const handleSignupSuccess = (signupId: string) => {
    // After successful signup, SignupForm will handle the redirect
    // This is just a placeholder - the actual redirect logic is in SignupForm
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <SignupForm
            onClose={handleClose}
            onSwitchToLogin={handleSwitchToLogin}
            onSignupSuccess={handleSignupSuccess}
          />
        </div>
      </div>
    </div>
  );
}

