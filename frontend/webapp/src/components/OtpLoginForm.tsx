import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/Contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Loader2, ArrowLeft } from "lucide-react";

interface OtpLoginFormProps {
  onClose: () => void;
  onSwitchToSignup: () => void;
  onBackToPasswordLogin: () => void;
  onSuccess?: () => void;
}

export const OtpLoginForm: React.FC<OtpLoginFormProps> = ({
  onClose,
  onSwitchToSignup,
  onBackToPasswordLogin,
  onSuccess,
}) => {
  const [contact, setContact] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"contact" | "otp">("contact");
  const [countdown, setCountdown] = useState(0);
  const [contactType, setContactType] = useState<"mobile" | "email">("mobile");

  const { sendLoginOtp, loginWithOtp, isLoading } = useAuth();
  const { t } = useTranslation();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validateContact = (
    contact: string
  ): { isValid: boolean; type: "mobile" | "email" } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRegex = /^[\+]?[1-9][\d]{0,15}$/;

    if (emailRegex.test(contact)) {
      return { isValid: true, type: "email" };
    } else if (mobileRegex.test(contact.replace(/\s/g, ""))) {
      return { isValid: true, type: "mobile" };
    }
    return { isValid: false, type: "mobile" };
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact.trim()) {
      setError(t("auth.fillAllFields"));
      return;
    }

    const validation = validateContact(contact.trim());
    if (!validation.isValid) {
      setError(t("auth.invalidContactFormat"));
      return;
    }

    try {
      setContactType(validation.type);
      if (validation.type === "email") {
        await sendLoginOtp(undefined, contact.trim());
      } else {
        await sendLoginOtp(contact.trim(), undefined);
      }
      setStep("otp");
      setCountdown(60); // 60 seconds countdown
    } catch (error) {
      console.error("Send OTP failed:", error);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpCode.trim()) {
      setError(t("auth.enterOtp"));
      return;
    }

    try {
      if (contactType === "email") {
        await loginWithOtp(undefined, contact.trim(), otpCode.trim());
      } else {
        await loginWithOtp(contact.trim(), undefined, otpCode.trim());
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("OTP verification failed:", error);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    try {
      if (contactType === "email") {
        await sendLoginOtp(undefined, contact.trim());
      } else {
        await sendLoginOtp(contact.trim(), undefined);
      }
      setCountdown(60);
      setError("");
    } catch (error) {
      console.error("Resend OTP failed:", error);
    }
  };

  const handleBackToContact = () => {
    setStep("contact");
    setOtpCode("");
    setError("");
  };

  if (step === "otp") {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToContact}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold">{t("auth.verifyOtp")}</h2>
        </div>

        <p className="text-sm text-gray-600">
          {t("auth.otpSentTo", { contact: contact })}
        </p>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">{t("auth.enterOtp")}</Label>
            <Input
              id="otp"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder={t("auth.otpPlaceholder")}
              disabled={isLoading}
              maxLength={6}
              className="text-center text-lg tracking-widest"
              required
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.verifying")}
              </>
            ) : (
              t("auth.verifyOtp")
            )}
          </Button>
        </form>

        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-sm text-gray-500">
              {t("auth.resendIn", { seconds: countdown })}
            </p>
          ) : (
            <button
              onClick={handleResendOtp}
              disabled={isLoading}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {t("auth.resendOtp")}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBackToPasswordLogin}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold">{t("auth.loginWithOtp")}</h2>
      </div>

      <p className="text-sm text-gray-600">{t("auth.otpLoginDescription")}</p>

      <form onSubmit={handleSendOtp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact">{t("auth.emailOrMobile")}</Label>
          <Input
            id="contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t("auth.enterEmailOrMobile")}
            disabled={isLoading}
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("auth.sendingOtp")}
            </>
          ) : (
            t("auth.sendOtp")
          )}
        </Button>
      </form>

      <p className="text-sm text-center">
        {t("auth.noAccount")}{" "}
        <button
          className="underline text-blue-600 hover:text-blue-800"
          onClick={onSwitchToSignup}
          disabled={isLoading}
        >
          {t("auth.signUp")}
        </button>
      </p>
    </div>
  );
};
