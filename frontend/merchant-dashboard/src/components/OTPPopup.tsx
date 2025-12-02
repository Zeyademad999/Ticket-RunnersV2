import React, { useState, useRef, useEffect } from "react";
import { X, RotateCcw } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTranslation } from "react-i18next";

interface OTPPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  mobile: string;
  isLoading?: boolean;
}

const RESEND_COOLDOWN_SECONDS = 20;

const OTPPopup: React.FC<OTPPopupProps> = ({
  isOpen,
  onClose,
  onVerify,
  onResend,
  mobile,
  isLoading = false,
}) => {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { isRTL } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      // Focus first input when popup opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } else {
      setCooldown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || cooldown === 0) return;

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, cooldown]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Move to previous input if value is deleted
    if (!value && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "");
    if (pastedData.length === 6) {
      const otpArray = pastedData.split("").slice(0, 6);
      setOtp(otpArray);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setError("");
    try {
      await onVerify(otpString);
      // If verification succeeds, onVerify will handle navigation
      // Don't clear OTP here - let parent component handle it
    } catch (error: any) {
      console.error("OTP verification error in popup:", error);
      const errorMessage = error?.message || error?.response?.data?.error?.message || error?.response?.data?.message || "OTP verification failed. Please try again.";
      setError(errorMessage);
      // Don't close popup on error - let user try again
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isLoading) return;

    setError("");
    try {
      await onResend();
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error: any) {
      const errorMessage = error?.message || error?.response?.data?.error?.message || error?.response?.data?.message || "Failed to resend OTP. Please try again.";
      setError(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {t("auth.otpVerification")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          {t("auth.otpMessage")} <span className="font-medium">{mobile}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 transition-colors"
                placeholder=""
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading || otp.join("").length !== 6}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div
                    className={`animate-spin rounded-full h-5 w-5 border-b-2 border-white ${
                      isRTL ? "ml-2" : "mr-2"
                    }`}
                  ></div>
                  {t("auth.verifying")}
                </div>
              ) : (
                t("auth.verifyOTP")
              )}
            </button>

            <div className="flex justify-center">
              <div className="flex flex-col items-center space-y-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isLoading || cooldown > 0}
                  className={`flex items-center text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    isRTL ? "space-x-reverse space-x-1" : "space-x-1"
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("auth.resendOTP")}
                </button>
                {cooldown > 0 && (
                  <p className="text-xs text-gray-500">
                    {t("auth.resendIn", { seconds: cooldown })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTPPopup;
