import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Smartphone, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import OTPPopup from "../components/OTPPopup";
import LanguageToggle from "../components/LanguageToggle";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

const Login: React.FC = () => {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [error, setError] = useState("");

  const { sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    
    if (!mobile || !password) {
      const errorMsg = "Please fill in all fields";
      setError(errorMsg);
      toast.error(errorMsg, { duration: 4000 });
      return;
    }

    // Clear any old tokens before login
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("merchantData");

    setIsLoading(true);
    try {
      await sendOTP(mobile, password);
      setError(""); // Clear any previous errors
      setShowOTPPopup(true);
      toast.success("OTP sent to your mobile number", { duration: 3000 });
      // Don't clear form fields - keep them for OTP verification
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error?.message || error?.response?.data?.error?.message || error?.response?.data?.message || "Failed to send OTP. Please check your credentials and try again.";
      setError(errorMessage);
      // Show toast with longer duration so user can see it
      toast.error(errorMessage, { 
        duration: 6000,
        style: {
          maxWidth: '500px',
        },
      });
      // Keep form fields filled so user can try again
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    try {
      await verifyOTP(mobile, otp);
      setError(""); // Clear any errors
      toast.success("Login successful!", { duration: 3000 });
      setShowOTPPopup(false);
      // Clear form only after successful login
      setMobile("");
      setPassword("");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const errorMessage = error?.message || error?.response?.data?.error?.message || error?.response?.data?.message || "OTP verification failed. Please try again.";
      toast.error(errorMessage, { 
        duration: 6000,
        style: {
          maxWidth: '500px',
        },
      });
      // Don't close popup on error - let user try again
      throw error;
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTP(mobile, password);
      toast.success("OTP resent successfully", { duration: 3000 });
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.error?.message || error?.response?.data?.message || "Failed to resend OTP. Please try again.";
      toast.error(errorMessage, { 
        duration: 6000,
        style: {
          maxWidth: '500px',
        },
      });
      throw error;
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <LanguageToggle />
        </div>

        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto flex justify-center">
              <img
                src="/ticket-logo-secondary.png"
                alt="Ticket Runners Logo"
                className="h-16 w-auto"
              />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t("auth.loginTitle")}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleCredentialsSubmit}>
            <div className="space-y-4">
              {/* Error Message Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Mobile Number Field */}
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("auth.mobileNumber")}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      setError(""); // Clear error when user starts typing
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm ${
                      error ? "border-red-300" : "border-gray-300"
                    }`}
                    style={{
                      paddingLeft: isRTL ? "1rem" : "2.5rem",
                      paddingRight: isRTL ? "2.5rem" : "1rem",
                    }}
                    placeholder="Enter your mobile number"
                    disabled={isLoading}
                  />
                  <Smartphone
                    className={`absolute top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 ${
                      isRTL ? "left-3" : "left-3"
                    }`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t("auth.password")}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(""); // Clear error when user starts typing
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm ${
                      error ? "border-red-300" : "border-gray-300"
                    }`}
                    style={{
                      paddingLeft: isRTL ? "1rem" : "1rem",
                      paddingRight: isRTL ? "2.5rem" : "2.5rem",
                    }}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                      isRTL ? "left-3" : "right-3"
                    }`}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    {t("common.continue")}
                    <ArrowRight
                      className={`h-4 w-4 ${
                        isRTL ? "mr-2 rotate-180" : "ml-2"
                      }`}
                    />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <OTPPopup
        isOpen={showOTPPopup}
        onClose={() => {
          // Only allow closing if not currently loading
          if (!isLoading) {
            setShowOTPPopup(false);
          }
        }}
        onVerify={handleOTPVerify}
        onResend={handleResendOTP}
        mobile={mobile}
        isLoading={isLoading}
      />
    </>
  );
};

export default Login;
