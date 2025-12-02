import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";
import { useAuth, User } from "@/Contexts/AuthContext";
import { ProfileCompletionModal } from "./ui/profileCompletionModal";
import { CardExpiredModal } from "./ExpiredCardModals";
import { SignupForm } from "./SignupForm";
import { ValidationService, PASSWORD_RULES } from "@/lib/validation";
import { secureStorage } from "@/lib/secureStorage";
import { BookingsService } from "@/lib/api/services/bookings";
import { isBefore, parseISO } from "date-fns";

import ReCAPTCHA from "react-google-recaptcha";
import { OtpInput } from "@/components/ui/input-otp";

interface AuthModalsProps {
  onLoginSuccess?: () => void;
}

const RESEND_COOLDOWN_SECONDS = 20;

export const AuthModals: React.FC<AuthModalsProps> = ({ onLoginSuccess }) => {
  const {
    isLoginOpen,
    isSignupOpen,
    closeLogin,
    closeSignup,
    login,
    loginWithCredentials,
    verifyLoginOtp,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
    confirmPasswordReset,
  } = useAuth();

  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Helper function for RTL-compatible error messages
  const ErrorMessage = ({ message }: { message: string }) => (
    <p
      className="text-sm text-red-500"
      dir={i18n.dir()}
      style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
    >
      {message}
    </p>
  );
  const [isSignup, setIsSignup] = useState(false);
  const [showCardExpiredModal, setShowCardExpiredModal] = useState(false);
  const [cardStatus, setCardStatus] = useState<"expired" | "missing">("expired");

  // Add state for login identifier
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginIdentifierError, setLoginIdentifierError] = useState("");
  const [loginPasswordError, setLoginPasswordError] = useState("");
  
  // Add state for login OTP step
  const [showLoginOtp, setShowLoginOtp] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [loginOtpError, setLoginOtpError] = useState("");
const [loginOtpCooldown, setLoginOtpCooldown] = useState(0);
const [isResendingLoginOtp, setIsResendingLoginOtp] = useState(false);

  // Add state for captcha
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const recaptchaSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

  // Add state for forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordPhone, setForgotPasswordPhone] = useState("");
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState("");
  const [forgotPasswordOtpSent, setForgotPasswordOtpSent] = useState(false);
  const [forgotPasswordOtpVerified, setForgotPasswordOtpVerified] =
    useState(false);
  const [forgotPasswordOtpError, setForgotPasswordOtpError] = useState("");
  const [showForgotPasswordOtpModal, setShowForgotPasswordOtpModal] =
    useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotPasswordErrors, setForgotPasswordErrors] = useState<
    Record<string, string>
  >({});

  const checkCardExpiration = async () => {
    // DISABLED - Don't check card expiration during login
    // This function is kept for potential future use but is not called
    return;
    
    try {
      // Wait longer to ensure login is completely done
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if user is authenticated before making the API call
      const refreshToken = await secureStorage.getItem("refreshToken");
      
      if (!refreshToken) {
        // User is not authenticated, skip card check silently
        return;
      }

      // Fetch the user's NFC card details
      // Note: This endpoint may not exist yet, so we'll gracefully handle errors
      const cardDetails = await BookingsService.getCustomerCardDetails();

      // Check if user has an NFC card
      if (!cardDetails?.nfc_card) {
        // No card at all - show upgrade message
        setCardStatus("missing");
        setShowCardExpiredModal(true);
        // Show toast notification as well
        toast({
          title: t("cardExpired.missingTitle", "NFC Card Required"),
          description: t("cardExpired.missingToast", "Consider upgrading to an NFC card for premium features."),
          variant: "default",
        });
      } else if (cardDetails.nfc_card.card_expiry_date) {
        const now = new Date();
        const expiry = parseISO(cardDetails.nfc_card.card_expiry_date);
        const isExpired = isBefore(expiry, now);

        if (isExpired) {
          setCardStatus("expired");
          setShowCardExpiredModal(true);
          // Show toast notification as well
          toast({
            title: t("cardExpired.title"),
            description: t("cardExpired.toastMessage", "Your card has expired. Please renew to continue using premium features."),
            variant: "default",
          });
        }
      }
    } catch (error: any) {
      // Silently handle errors - card check is optional
      // Don't show errors for 401 (auth), 404 (no card/endpoint), or network issues
      // This prevents showing the modal when the user doesn't have a card or the endpoint doesn't exist
      if (error?.status && error.status !== 404 && error.status !== 401) {
        // Only log unexpected errors (not auth or not found)
      console.log("Could not check card expiration:", error);
      }
    }
  };

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  useEffect(() => {
    setIsSignup(isSignupOpen);
  }, [isSignupOpen, isLoginOpen]);

  // Pre-fill phone number from sessionStorage when login modal opens
  useEffect(() => {
    if (isLoginOpen && !isSignupOpen) {
      const storedPhone = sessionStorage.getItem('loginPhoneNumber');
      if (storedPhone) {
        setLoginIdentifier(storedPhone);
        // Clear it after using
        sessionStorage.removeItem('loginPhoneNumber');
      }
    }
  }, [isLoginOpen, isSignupOpen]);

useEffect(() => {
  if (showLoginOtp) {
    setLoginOtpCooldown(RESEND_COOLDOWN_SECONDS);
  } else {
    setLoginOtpCooldown(0);
  }
}, [showLoginOtp]);

useEffect(() => {
  if (!showLoginOtp || loginOtpCooldown === 0) return;

  const timer = window.setInterval(() => {
    setLoginOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
  }, 1000);

  return () => window.clearInterval(timer);
}, [showLoginOtp, loginOtpCooldown]);

  useEffect(() => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    });
    // Reset login fields when switching between login/signup
    setLoginIdentifier("");
    setLoginPassword("");
    setLoginIdentifierError("");
    setLoginPasswordError("");
    setShowLoginOtp(false);
    setLoginOtpCode("");
    setLoginOtpError("");
  }, [isSignup]);

  // Reset forgot password state when modal closes
  useEffect(() => {
    if (!isLoginOpen && !isSignupOpen) {
      setShowForgotPassword(false);
      setForgotPasswordPhone("");
      setForgotPasswordOtp("");
      setForgotPasswordOtpSent(false);
      setForgotPasswordOtpVerified(false);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setForgotPasswordErrors({});
      // Reset login fields when modal closes
      setLoginIdentifier("");
      setLoginPassword("");
      setLoginIdentifierError("");
      setLoginPasswordError("");
      setShowLoginOtp(false);
      setLoginOtpCode("");
      setLoginOtpError("");
      setLoginOtpCooldown(0);
      setIsResendingLoginOtp(false);
    }
  }, [isLoginOpen, isSignupOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.email) newErrors.email = t("auth.errors.email_required");
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = t("auth.errors.email_invalid");

    if (!form.password) newErrors.password = t("auth.errors.password_required");
    else {
      const passwordValidation = ValidationService.validatePassword(
        form.password,
        PASSWORD_RULES
      );
      if (!passwordValidation.isValid) {
        newErrors.password =
          passwordValidation.errors[0] || t("auth.errors.password_invalid");
      }
    }

    if (isSignup) {
      if (!form.firstName)
        newErrors.firstName = t("auth.errors.first_name_required");
      else if (form.firstName.length < 3)
        newErrors.firstName = t("auth.errors.first_name_min");

      if (!form.lastName)
        newErrors.lastName = t("auth.errors.last_name_required");
      else if (form.lastName.length < 3)
        newErrors.lastName = t("auth.errors.last_name_min");

      if (!form.phone) newErrors.phone = t("auth.errors.phone_required");
      else if (!/^\+?\d{10,15}$/.test(form.phone))
        newErrors.phone = t("auth.errors.phone_invalid");

      if (!form.confirmPassword)
        newErrors.confirmPassword = t("auth.errors.confirm_password_required");
      else if (form.password !== form.confirmPassword)
        newErrors.confirmPassword = t("auth.errors.confirm_password_mismatch");
    }

    return Object.keys(newErrors).length === 0;
  };

  // Validate forgot password form
  const validateForgotPassword = () => {
    const newErrors: Record<string, string> = {};

    if (!forgotPasswordPhone) {
      newErrors.phone = t("auth.errors.phone_required");
    } else if (!/^\+?\d{10,15}$/.test(forgotPasswordPhone)) {
      newErrors.phone = t("auth.errors.phone_invalid");
    }

    if (forgotPasswordOtpVerified) {
      if (!newPassword) {
        newErrors.newPassword = t("auth.errors.password_required");
      } else {
        const passwordValidation = ValidationService.validatePassword(
          newPassword,
          PASSWORD_RULES
        );
        if (!passwordValidation.isValid) {
          newErrors.newPassword =
            passwordValidation.errors[0] || t("auth.errors.password_invalid");
        }
      }

      if (!confirmNewPassword) {
        newErrors.confirmNewPassword = t(
          "auth.errors.confirm_password_required"
        );
      } else if (newPassword !== confirmNewPassword) {
        newErrors.confirmNewPassword = t(
          "auth.errors.confirm_password_mismatch"
        );
      }
    }

    setForgotPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update validation for login (not signup)
  const validateLogin = () => {
    // Reset previous errors
    setLoginIdentifierError("");
    setLoginPasswordError("");

    if (!loginIdentifier) {
      setLoginIdentifierError(t("auth.errors.email_or_phone_required"));
      return false;
    }
    const isEmail = /\S+@\S+\.\S+/.test(loginIdentifier);
    const isPhone = /^\+?\d{10,15}$/.test(loginIdentifier);
    if (!isEmail && !isPhone) {
      setLoginIdentifierError(t("auth.errors.email_or_phone_invalid"));
      return false;
    }
    if (!loginPassword) {
      setLoginPasswordError(t("auth.errors.password_required"));
      return false;
    }
    return true;
  };

  // Forgot password functions
  const sendForgotPasswordOtp = async () => {
    if (!forgotPasswordPhone || !/^\+?\d{10,15}$/.test(forgotPasswordPhone)) {
      setForgotPasswordErrors((prev) => ({
        ...prev,
        phone: t("auth.errors.phone_invalid"),
      }));
      return;
    }

    try {
      await requestPasswordResetOtp(forgotPasswordPhone);
      setForgotPasswordOtpSent(true);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(true);
    } catch (error) {
      console.error("Failed to send password reset OTP:", error);
      // Error is already handled in AuthContext
    }
  };

  const verifyForgotPasswordOtp = async () => {
    if (!forgotPasswordOtp || forgotPasswordOtp.length !== 6) {
      setForgotPasswordOtpError(t("auth.errors.otp_invalid"));
      return;
    }

    // Don't verify OTP here - just mark as ready to proceed
    // OTP will be verified when resetting the password
    setForgotPasswordOtpVerified(true);
    setForgotPasswordOtpError("");
    setShowForgotPasswordOtpModal(false);
  };

  const handleForgotPasswordSubmit = async () => {
    if (!validateForgotPassword()) return;

    if (!forgotPasswordOtpVerified) {
      if (!forgotPasswordOtpSent) {
        await sendForgotPasswordOtp();
      } else {
        setShowForgotPasswordOtpModal(true);
      }
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      setForgotPasswordErrors({
        confirmNewPassword: t("auth.passwordsDoNotMatch"),
      });
      return;
    }

    // Validate required fields
    if (!forgotPasswordPhone || !forgotPasswordOtp || !newPassword) {
      toast({
        title: t("auth.password_reset_error"),
        description: t("auth.provideAllFields"),
        variant: "destructive",
      });
      return;
    }

    try {
      await confirmPasswordReset(
        forgotPasswordPhone,
        forgotPasswordOtp,
        newPassword
      );

      // Clear stored tokens (if any)
      localStorage.removeItem("passwordResetToken");
      secureStorage.removeItem("passwordResetExpires");

      // Reset form and go back to login
      setShowForgotPassword(false);
      setForgotPasswordPhone("");
      setForgotPasswordOtp("");
      setForgotPasswordOtpSent(false);
      setForgotPasswordOtpVerified(false);
      setForgotPasswordOtpError("");
      setShowForgotPasswordOtpModal(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setForgotPasswordErrors({});
    } catch (error) {
      console.error("Failed to reset password:", error);
      // Error is already handled in AuthContext
    }
  };

  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleSuccessfulSignup = async (signupId: string) => {
    // Store the signup ID securely for the next step in the signup process
    await secureStorage.setItem("signup_id", signupId, { encrypt: true });
    closeSignup();
    
    // Check if user already has a profile image (profile setup was completed during signup)
    try {
      const userDataStr = await secureStorage.getItem("user_data", { decrypt: true });
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        // If user already has a profile image, don't show the modal
        if (userData.profile_image) {
          return; // Profile already set up, skip modal
        }
      }
    } catch (error) {
      // If we can't check, show the modal as fallback
      console.log("Could not check user data:", error);
    }
    
    // Only show modal if profile image is not already set
    setShowProfileModal(true);
  };

  const handleSubmit = async () => {
    if (!captchaToken) {
      setCaptchaError(t("auth.errors.captcha_required"));
      return;
    }
    setCaptchaError("");

    if (isSignup) {
      if (!validate()) return;
      // Replace with actual backend call
      const newUser: User = {
        id: "user-" + Date.now(),
        first_name: form.firstName,
        last_name: form.lastName,
        mobile_number: form.phone,
        email: form.email,
        profile_image_id: "",
        type: "regular",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy fields for backward compatibility
        name: `${form.firstName} ${form.lastName}`,
        isVip: false,
      };
      login(newUser);
      toast({
        title: t("auth.sign_up"),
        description: `${t("auth.welcome")}, ${form.email}`,
      });
      handleSuccessfulSignup("user-" + Date.now());
    } else {
      if (!validateLogin()) return;

      try {
        // Use the real API call from AuthContext
        await loginWithCredentials(loginIdentifier, loginPassword);

        // Login successful - reset form state and close modal immediately
        setLoginIdentifier("");
        setLoginPassword("");
        setLoginIdentifierError("");
        setLoginPasswordError("");
        setShowLoginOtp(false);
        setLoginOtpCode("");
        setLoginOtpError("");
        closeLogin();
        closeSignup(); // Ensure signup modal is also closed
        onLoginSuccess?.();
      } catch (error: any) {
        // Check if OTP is required (password login sends OTP)
        if (error.otpRequired) {
          // Show OTP input form
          setShowLoginOtp(true);
          setLoginOtpCooldown(RESEND_COOLDOWN_SECONDS);
          setLoginOtpCode("");
          setLoginOtpError("");
          toast({
            title: t("auth.otpSent"),
            description: error.message || t("auth.otpSentDescription"),
          });
        } else {
        // Error is already handled in AuthContext
        console.error("Login failed:", error);
        }
      }
    }
  };

  const handleClose = () => {
    setIsSignup(false);
    setShowForgotPassword(false);
    setLoginIdentifier("");
    setLoginPassword("");
    setLoginIdentifierError("");
    setLoginPasswordError("");
    setShowLoginOtp(false);
    setLoginOtpCode("");
    setLoginOtpError("");
    setLoginOtpCooldown(0);
    setIsResendingLoginOtp(false);
    closeLogin();
    closeSignup();
  };

  const handleResendLoginOtp = async () => {
    if (loginOtpCooldown > 0 || isResendingLoginOtp) return;

    if (!loginIdentifier || !loginPassword) {
      setLoginOtpError(
        t(
          "auth.resendOtpMissingCredentials",
          "Please re-enter your credentials to resend the code."
        )
      );
      return;
    }

    setIsResendingLoginOtp(true);
    setLoginOtpError("");
    try {
      await loginWithCredentials(loginIdentifier, loginPassword);
      setLoginOtpCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error: any) {
      if (error?.otpRequired) {
        setLoginOtpCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setLoginOtpError(
          error?.message || t("auth.otpSendErrorMessage", "Unable to resend OTP.")
        );
      }
    } finally {
      setIsResendingLoginOtp(false);
    }
  };

  // Render forgot password form
  const renderForgotPasswordForm = () => (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        handleForgotPasswordSubmit();
      }}
    >
      <div className="space-y-1">
        <Input
          type="text"
          value={forgotPasswordPhone}
          placeholder={t("auth.placeholders.phone", t("auth.phone_number"))}
          onChange={(e) => setForgotPasswordPhone(e.target.value)}
          autoComplete="off"
          disabled={forgotPasswordOtpVerified}
        />
        {forgotPasswordErrors.phone && (
          <ErrorMessage message={forgotPasswordErrors.phone} />
        )}
      </div>

      {forgotPasswordOtpVerified && (
        <>
          <div className="space-y-1">
            <Input
              type="password"
              value={newPassword}
              placeholder={t("auth.placeholders.new_password", "New Password")}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {forgotPasswordErrors.newPassword && (
              <ErrorMessage message={forgotPasswordErrors.newPassword} />
            )}
          </div>

          <div className="space-y-1">
            <Input
              type="password"
              value={confirmNewPassword}
              placeholder={t(
                "auth.placeholders.confirm_new_password",
                "Confirm New Password"
              )}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            {forgotPasswordErrors.confirmNewPassword && (
              <ErrorMessage message={forgotPasswordErrors.confirmNewPassword} />
            )}
          </div>
        </>
      )}

      <Button className="w-full mt-4" type="submit">
        {forgotPasswordOtpVerified
          ? t("auth.reset_password")
          : t("auth.continue")}
      </Button>
    </form>
  );

  return (
    <>
      <Dialog open={isLoginOpen || isSignupOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {showForgotPassword
                ? t("auth.forgot_password")
                : isSignup
                ? t("auth.sign_up")
                : t("auth.sign_in")}
            </DialogTitle>
          </DialogHeader>

          {showForgotPassword ? (
            renderForgotPasswordForm()
          ) : isSignup ? (
            <SignupForm
              onClose={closeSignup}
              onSwitchToLogin={() => setIsSignup(false)}
              onSignupSuccess={handleSuccessfulSignup}
            />
          ) : showLoginOtp ? (
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setLoginOtpError("");
                
                if (!loginOtpCode.trim()) {
                  setLoginOtpError(t("auth.enterOtp", "Please enter the OTP code"));
                  return;
                }

                try {
                  await verifyLoginOtp(loginIdentifier, loginOtpCode.trim());
                  // Login successful - reset form state and close modal immediately
                  setLoginOtpCode("");
                  setLoginOtpError("");
                  setShowLoginOtp(false);
                  closeLogin();
                  closeSignup(); // Ensure signup modal is also closed
                  
                  // Check for redirect URL and navigate
                  const redirectUrl = sessionStorage.getItem('authRedirectUrl');
                  if (redirectUrl) {
                    sessionStorage.removeItem('authRedirectUrl');
                    navigate(redirectUrl, { replace: true });
                  } else {
                    onLoginSuccess?.();
                  }
                } catch (error: any) {
                  setLoginOtpError(error.message || t("auth.otpLoginErrorMessage", "Failed to verify OTP"));
                }
              }}
            >
              <div className="space-y-1">
                <p className="text-sm text-gray-600">
                  {t("auth.otpSentDescription", "We've sent a verification code to")} {loginIdentifier}
                </p>
                <OtpInput
                  value={loginOtpCode}
                  onChange={(value) => setLoginOtpCode(value)}
                  length={6}
                />
                {loginOtpError && (
                  <ErrorMessage message={loginOtpError} />
                )}
              </div>

              <Button className="w-full mt-4" type="submit">
                {t("auth.verify", "Verify OTP")}
              </Button>

              <div className="flex flex-col items-center space-y-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendLoginOtp}
                  disabled={loginOtpCooldown > 0 || isResendingLoginOtp}
                  className="text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("auth.resendOtp", "Resend OTP")}
                </Button>
                {loginOtpCooldown > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t("auth.resendIn", { seconds: loginOtpCooldown })}
                  </p>
                )}
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowLoginOtp(false);
                  setLoginOtpCode("");
                  setLoginOtpError("");
                }}
              >
                {t("auth.back", "Back")}
              </Button>
            </form>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div className="space-y-1">
                <Input
                  type="text"
                  value={loginIdentifier}
                  placeholder={t(
                    "auth.placeholders.email_or_phone",
                    "Email or Mobile Number"
                  )}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  autoComplete="off"
                />
                {loginIdentifierError && (
                  <ErrorMessage message={loginIdentifierError} />
                )}
              </div>
              <div className="space-y-1 relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  placeholder={t("auth.placeholders.password", "Password")}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                {loginPasswordError && (
                  <ErrorMessage message={loginPasswordError} />
                )}
              </div>

              <ReCAPTCHA
                sitekey={recaptchaSiteKey}
                onChange={(token: any) => setCaptchaToken(token || "")}
                className="my-2"
              />
              {captchaError && <ErrorMessage message={captchaError} />}

              <Button className="w-full mt-4" type="submit">
                {t("auth.continue")}
              </Button>
            </form>
          )}

          <div className="text-sm text-center mt-2">
            {showForgotPassword ? (
              <>
                {t("auth.remember_password")}{" "}
                <button
                  className="underline text-primary"
                  onClick={() => setShowForgotPassword(false)}
                >
                  {t("auth.back_to_signin")}
                </button>
              </>
            ) : isSignup ? (
              <>
                {t("auth.already_account")}{" "}
                <button
                  className="underline text-primary"
                  onClick={() => setIsSignup(false)}
                >
                  {t("auth.sign_in")}
                </button>
              </>
            ) : (
              <>
                {t("auth.no_account")}{" "}
                <button
                  className="underline text-primary"
                  onClick={() => setIsSignup(true)}
                >
                  {t("auth.sign_up")}
                </button>
                <br />
                <button
                  className="underline text-primary mt-1"
                  onClick={() => setShowForgotPassword(true)}
                >
                  {t("auth.forgot_password")}
                </button>
              </>
            )}
          </div>
        </DialogContent>

        <ProfileCompletionModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
        <CardExpiredModal
          open={showCardExpiredModal}
          onClose={() => setShowCardExpiredModal(false)}
          cardStatus={cardStatus}
        />
      </Dialog>

      {/* Forgot Password OTP Modal - Separate Dialog */}
      <Dialog
        open={showForgotPasswordOtpModal}
        onOpenChange={setShowForgotPasswordOtpModal}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {t("auth.enter_otp")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {t("auth.otp_sent")} {forgotPasswordPhone}
            </div>

            <OtpInput
              value={forgotPasswordOtp}
              onChange={setForgotPasswordOtp}
              autoFocus
            />

            {forgotPasswordOtpError && (
              <ErrorMessage message={forgotPasswordOtpError} />
            )}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={verifyForgotPasswordOtp}>
                {t("auth.verify_otp")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForgotPasswordOtpModal(false)}
              >
                {t("auth.cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
