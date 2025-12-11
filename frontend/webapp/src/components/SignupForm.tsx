import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/input-otp";
import { OtpMessagePopup } from "./OtpMessagePopup";
import { AuthService } from "@/lib/api/services/auth";
import {
  SignupStartRequest,
  SendMobileOtpRequest,
  VerifyMobileOtpRequest,
  SetPasswordRequest,
  UploadProfileImageRequest,
  SaveOptionalInfoRequest,
  CompleteSignupRequest,
} from "@/lib/api/types";
import { toast } from "sonner";
import { ValidationService, PASSWORD_RULES } from "@/lib/validation";
import { setSecureToken, setSecureRefreshToken, setSecureUserData } from "@/lib/secureStorage";
import { normalizeImageUrl } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/Contexts/AuthContext";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { COUNTRY_DIAL_CODES, DEFAULT_DIAL_CODE } from "@/constants/countryCodes";

interface SignupFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSignupSuccess: (signupId: string) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onClose,
  onSwitchToLogin,
  onSignupSuccess,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, openLogin, loginWithCredentials, verifyLoginOtp } = useAuth();
  const [formData, setFormData] = useState<SignupStartRequest>({
    first_name: "",
    last_name: "",
    mobile_number: "",
    email: "",
    nationality: "",
    gender: "",
    date_of_birth: "",
  });
  const [isPhoneLocked, setIsPhoneLocked] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    event_name: string;
    purchaser_name: string;
  } | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupId, setSignupId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    | "signup"
    | "mobile-otp"
    | "password"
    | "profile-image"
    | "optional-info"
    | "completing"
  >("signup");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [optionalInfo, setOptionalInfo] = useState({
    blood_type: "",
    emergency_contact_name: "",
    emergency_contact_mobile: "",
  });
  const [isSavingOptional, setIsSavingOptional] = useState(false);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);
  const [showLoginInstead, setShowLoginInstead] = useState(false);
  const [prefilledPhone, setPrefilledPhone] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtpCode, setLoginOtpCode] = useState("");
  const [showLoginOtp, setShowLoginOtp] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [selectedDialCode, setSelectedDialCode] = useState<string>(DEFAULT_DIAL_CODE);
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState<"sms" | "email">("sms");
  const canUseEmailOtp = selectedDialCode !== "+20";
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otpPopupMessage, setOtpPopupMessage] = useState("");
  const [otpPopupType, setOtpPopupType] = useState<"error" | "success">("error");
  const nationalityOptions = useMemo(() => {
    const uniqueNames = Array.from(
      new Set(COUNTRY_DIAL_CODES.map((country) => country.name))
    ).sort((a, b) => a.localeCompare(b));

    const egyptIndex = uniqueNames.findIndex(
      (name) => name.toLowerCase() === "egypt"
    );
    if (egyptIndex > 0) {
      const [egypt] = uniqueNames.splice(egyptIndex, 1);
      uniqueNames.unshift(egypt);
    }

    return uniqueNames;
  }, []);

  // Validate registration token on mount if present in URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setIsValidatingToken(true);
      AuthService.validateRegistrationToken(token)
        .then(async (result) => {
          if (result.valid && result.phone_number) {
            // Check if user is already registered
            if (result.user_already_registered) {
              // Show info message
              toast.info(
                result.message ||
                  t("auth.signup.userAlreadyRegistered", "You are already registered. Please login to claim your ticket.")
              );
              
              // If already logged in, redirect to tickets
              if (isAuthenticated) {
                navigate('/profile#bookings', { replace: true });
                return;
              }
              
              // Store phone number and redirect URL for login form
              if (result.phone_number) {
                sessionStorage.setItem('loginPhoneNumber', result.phone_number);
                setPrefilledPhone(result.phone_number);
              }
              sessionStorage.setItem('authRedirectUrl', '/profile#bookings');
              
              // Show login form instead of signup form
              setShowLoginInstead(true);
              setIsValidatingToken(false);
              return;
            }
            
            // Pre-fill and lock phone number
            setFormData((prev) => ({
              ...prev,
              mobile_number: result.phone_number!,
            }));
            setIsPhoneLocked(true);
            setTokenInfo({
              event_name: result.event_name || '',
              purchaser_name: result.purchaser_name || '',
            });
            toast.success(
              t("auth.signup.tokenValid", {
                event: result.event_name,
                purchaser: result.purchaser_name,
              }) ||
                `Registering to claim your ticket for ${result.event_name}`
            );
          } else {
            toast.error(
              result.error?.message ||
                t("auth.signup.tokenInvalid") ||
                "Invalid or expired registration link"
            );
            // Remove invalid token from URL
            searchParams.delete('token');
            navigate(window.location.pathname, { replace: true });
          }
        })
        .catch((error) => {
          console.error("Token validation error:", error);
          toast.error(
            error.message ||
              t("auth.signup.tokenValidationError") ||
              "Failed to validate registration link"
          );
        })
        .finally(() => {
          setIsValidatingToken(false);
        });
    }
  }, [searchParams, navigate, t]);

  useEffect(() => {
    if (selectedDialCode === "+20" && otpDeliveryMethod === "email") {
      setOtpDeliveryMethod("sms");
    }
  }, [selectedDialCode, otpDeliveryMethod]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMobileNumberChange = (value: string) => {
    if (isPhoneLocked) return;
    setFormData((prev) => ({
      ...prev,
      mobile_number: value,
    }));
  };

  const handleEmergencyContactMobileChange = (value: string) => {
    setOptionalInfo((prev) => ({
      ...prev,
      emergency_contact_mobile: value,
    }));
  };
  
  const handleDialCodeChange = (dialCode: string) => {
    setSelectedDialCode(dialCode);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);

    try {
      const signupPayload: SignupStartRequest = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        mobile_number: formData.mobile_number,
        email: formData.email,
      };
      
      if (formData.nationality) {
        signupPayload.nationality = formData.nationality;
      }
      if (formData.gender) {
        signupPayload.gender = formData.gender;
      }
      if (formData.date_of_birth) {
        signupPayload.date_of_birth = formData.date_of_birth;
      }
      
      signupPayload.otp_delivery_method = otpDeliveryMethod;
      
      const response = await AuthService.signupStart(signupPayload);
      const signupIdValue = response.signup_id || response.mobile_number || formData.mobile_number;
      setSignupId(signupIdValue);

      // Backend sends OTP automatically during registration
      // Set otpSent to true so the OTP form is shown
      setOtpSent(true);
      toast.success(response.message || "OTP sent to your mobile number!");
      setCurrentStep("mobile-otp");
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to start signup process");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (signupId: string) => {
    setIsSendingOtp(true);
    try {
      if (otpDeliveryMethod === "email") {
        await AuthService.sendEmailOtp({
          signup_id: signupId,
          mobile_number: formData.mobile_number,
          email: formData.email,
        });
      } else {
        await AuthService.register({
          mobile_number: formData.mobile_number,
          password: "", // Not needed for resend
          name: formData.first_name + " " + formData.last_name,
          email: formData.email,
          otp_delivery_method: otpDeliveryMethod,
        });
      }
      setOtpSent(true);
      toast.success(
        otpDeliveryMethod === "email"
          ? t("auth.signup.otpSentToEmailToast") || "OTP sent to your email!"
          : "OTP sent to your mobile number!"
      );
    } catch (error: any) {
      console.error("OTP send error:", error);
      toast.error(
        error.message ||
          (otpDeliveryMethod === "email"
            ? t("auth.signup.otpSendEmailError") || "Failed to send OTP email"
            : "Failed to send OTP")
      );
    } finally {
      setIsSendingOtp(false);
    }
  };


  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      const errorMsg = "Please enter the OTP code";
      setOtpPopupMessage(errorMsg);
      setOtpPopupType("error");
      setShowOtpPopup(true);
      return;
    }

    setIsLoading(true);
    try {
      if (currentStep === "mobile-otp") {
        const verifyData: VerifyMobileOtpRequest = {
          signup_id: parseInt(signupId!),
          mobile_number: formData.mobile_number,
          otp_code: otpCode.trim(),
        };

        const response = await AuthService.verifyMobileOtp(verifyData);

        if (response.mobile_verified) {
          // Skip email OTP step, go directly to password
          setCurrentStep("password");
          setOtpCode(""); // Clear OTP code
        } else {
          const errorMsg = "Invalid OTP code. Please try again.";
          setOtpPopupMessage(errorMsg);
          setOtpPopupType("error");
          setShowOtpPopup(true);
        }
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          "Failed to verify OTP. Please try again.";
      setOtpPopupMessage(errorMessage);
      setOtpPopupType("error");
      setShowOtpPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordValidation = ValidationService.validatePassword(
      password,
      PASSWORD_RULES
    );
    if (!passwordValidation.isValid) {
      toast.error(
        passwordValidation.errors[0] || "Password does not meet requirements"
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSettingPassword(true);
    try {
      const passwordData: SetPasswordRequest = {
        signup_id: parseInt(signupId!),
        password: password.trim(),
        password_confirmation: confirmPassword.trim(),
        mobile_number: formData.mobile_number, // Add mobile_number for backend
      };

      const response = await AuthService.setPassword(passwordData);

      // Password is stored in cache, account is NOT created yet
      // Registration will be completed after all steps (profile image, optional info) are done
      if (response.password_set) {
        toast.success("Password set successfully!");
        setCurrentStep("profile-image");
      } else {
        toast.error("Failed to set password. Please try again.");
      }
    } catch (error: any) {
      console.error("Password setting error:", error);
      toast.error(error.message || "Failed to set password. Please try again.");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all common image formats
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/svg+xml",
      "image/tiff",
      "image/x-icon",
      "image/vnd.microsoft.icon",
      "image/x-ms-bmp",
      "image/x-png",
      "image/x-icon",
    ];
    // Also check file extension as fallback
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'tif', 'ico'];
    
    if (!allowedTypes.includes(file.type) && (!fileExtension || !allowedExtensions.includes(fileExtension))) {
      toast.error("Please select a valid image file");
      return;
    }

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Create preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately (like settings tab does)
    if (!signupId) {
      toast.error("Please complete previous steps first");
      return;
    }

    setIsUploadingImage(true);
    try {
      const imageData: UploadProfileImageRequest = {
        signup_id: signupId,
        file: file,
      };

      const response = await AuthService.uploadProfileImage(imageData);

      if (response.uploaded || response.profile_image_url) {
        toast.success("Profile image uploaded successfully!");
        setProfileImage(file);
        // Update preview with the uploaded URL if available
        if (response.profile_image_url) {
          setProfileImagePreview(normalizeImageUrl(response.profile_image_url));
        }
      } else {
        toast.error("Failed to upload profile image. Please try again.");
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      toast.error(
        error.message || "Failed to upload profile image. Please try again."
      );
    } finally {
      setIsUploadingImage(false);
    }
  };


  const skipImageUpload = () => {
    setCurrentStep("optional-info");
  };

  const handleOptionalInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setOptionalInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOptionalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSavingOptional(true);
    try {
      const optionalData: SaveOptionalInfoRequest = {
        signup_id: signupId!,
        blood_type: optionalInfo.blood_type,
        emergency_contact_name: optionalInfo.emergency_contact_name,
        emergency_contact_mobile: optionalInfo.emergency_contact_mobile,
      };

      const response = await AuthService.saveOptionalInfo(optionalData);

      if (response.optional_saved) {
        toast.success("Optional information saved successfully!");
        await completeSignupProcess();
      } else {
        toast.error("Failed to save optional information. Please try again.");
      }
    } catch (error: any) {
      console.error("Optional info save error:", error);
      toast.error(
        error.message ||
          "Failed to save optional information. Please try again."
      );
    } finally {
      setIsSavingOptional(false);
    }
  };

  const completeSignupProcess = async () => {
    setIsCompletingSignup(true);
    setCurrentStep("completing");

    try {
      const completeData: CompleteSignupRequest = {
        mobile_number: formData.mobile_number,
        password: password,
      };
      
      if (formData.nationality) {
        completeData.nationality = formData.nationality;
      }
      if (formData.gender) {
        completeData.gender = formData.gender;
      }
      if (formData.date_of_birth) {
        completeData.date_of_birth = formData.date_of_birth;
      }

      const response = await AuthService.completeSignup(completeData);

      if (response.access && response.refresh && response.user) {
        // Store both access and refresh tokens securely
        await setSecureToken(response.access);
        await setSecureRefreshToken(response.refresh);
        // Transform user data to match expected format
        console.log("Complete signup response.user:", response.user);
        console.log("Complete signup response.user.profile_image:", response.user.profile_image);
        console.log("Complete signup response.user keys:", Object.keys(response.user));
        
        const firstName = response.user.name?.split(' ')[0] || '';
        const lastName = response.user.name?.split(' ').slice(1).join(' ') || '';
        const fullName = response.user.name || `${firstName} ${lastName}`.trim();
        const userData = {
          id: response.user.id,
          first_name: firstName,
          last_name: lastName,
          mobile_number: response.user.mobile_number || response.user.phone || '',
          email: response.user.email || '',
          profile_image: normalizeImageUrl(response.user.profile_image),
          profile_image_id: response.user.profile_image_id || '',
          type: 'regular',
          status: response.user.status || 'active',
          created_at: response.user.created_at || new Date().toISOString(),
          updated_at: response.user.updated_at || new Date().toISOString(),
          // Legacy fields for backward compatibility
          name: fullName,
          isVip: false,
        };
        console.log("Complete signup - Normalized profile_image:", userData.profile_image);
        
        // Auto-login: Use AuthContext login function to properly authenticate the user
        // This stores user data in secure storage and sets the user state
        await login(userData);
        
        // Ensure tokens and user data are fully stored before proceeding
        // Small delay to ensure all async storage operations complete
        await new Promise(resolve => setTimeout(resolve, 100));

        toast.success(response.message || t("auth.signup.accountCreatedSuccess"));
        
        // Close modal
        onClose();
        
        // Check for redirect URL (stored when user was redirected to login/signup)
        const redirectUrl = sessionStorage.getItem('authRedirectUrl') || sessionStorage.getItem('redirectUrl');
        
        // Only call onSignupSuccess if profile image was not uploaded during signup
        // This prevents the ProfileCompletionModal from showing when profile is already complete
        const hasProfileImage = response.user?.profile_image || userData.profile_image || profileImage;
        if (!hasProfileImage) {
          // Profile not complete, trigger modal for profile completion
          onSignupSuccess(signupId!);
        }
        
        // Redirect to intended destination or default to My Tickets
        // Clear redirect URLs from storage
        if (redirectUrl) {
          sessionStorage.removeItem('authRedirectUrl');
          sessionStorage.removeItem('redirectUrl');
          // Use the stored redirect URL
          navigate(redirectUrl);
        } else {
          // Check if we're on a booking page - if so, stay there
          const currentPath = window.location.pathname;
          if (currentPath.includes('/booking/') || currentPath.includes('/event/')) {
            // Stay on the current page (booking page)
            // The page will automatically refresh and show authenticated state
            window.location.reload();
          } else {
            // Default redirect to My Tickets page
            navigate('/my-tickets');
          }
        }
      } else {
        toast.error("Failed to complete signup. Please try again.");
      }
    } catch (error: any) {
      console.error("Signup completion error:", error);

      // Handle specific database errors
      if (error.message && error.message.includes("Column not found")) {
        toast.error(
          "Account created but there was a database issue. Please try logging in manually."
        );
        // Still call onSignupSuccess since the account was likely created
        onSignupSuccess(signupId!);
        onClose();
      } else if (error.message && error.message.includes("SQLSTATE")) {
        toast.error(
          "Account created but there was a database issue. Please try logging in manually."
        );
        // Still call onSignupSuccess since the account was likely created
        onSignupSuccess(signupId!);
        onClose();
      } else {
        toast.error(
          error.message || t("auth.signup.failedToCompleteSignup")
        );
      }
    } finally {
      setIsCompletingSignup(false);
    }
  };

  // Handle login form when user is already registered
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!prefilledPhone || !loginPassword) {
      setLoginError(t("auth.errors.email_or_phone_required") || "Phone number and password are required");
      return;
    }

    try {
      await loginWithCredentials(prefilledPhone, loginPassword);
      // OTP will be shown automatically via error.otpRequired
    } catch (error: any) {
      if (error.otpRequired) {
        setShowLoginOtp(true);
        toast.success(error.message || t("auth.otpSentDescription") || "OTP sent to your phone");
      } else {
        setLoginError(error.message || t("auth.loginError") || "Login failed");
      }
    }
  };

  const handleLoginOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    if (!loginOtpCode.trim()) {
      setLoginError(t("auth.enterOtp", "Please enter the OTP code"));
      return;
    }

    try {
      await verifyLoginOtp(prefilledPhone, loginOtpCode.trim());
      // Login successful - redirect to tickets
      const redirectUrl = sessionStorage.getItem('authRedirectUrl') || '/profile#bookings';
      sessionStorage.removeItem('authRedirectUrl');
      navigate(redirectUrl, { replace: true });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          t("auth.otpLoginErrorMessage", "Failed to verify OTP");
      setLoginError(errorMessage);
      setOtpPopupMessage(errorMessage);
      setOtpPopupType("error");
      setShowOtpPopup(true);
    }
  };

  // Show login form if user is already registered
  if (showLoginInstead) {
    if (showLoginOtp) {
      return (
        <>
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("auth.sign_in") || "Sign In"}</h2>
            <p className="text-sm text-gray-600">
              {t("auth.otpSentTo", { contact: prefilledPhone }) || `OTP sent to ${prefilledPhone}`}
            </p>
            <form onSubmit={handleLoginOtpSubmit} className="space-y-4">
              <div>
                <Label htmlFor="loginOtp">{t("auth.enterOtp", "Enter OTP Code")}</Label>
                <OtpInput
                  value={loginOtpCode}
                  onChange={setLoginOtpCode}
                  length={6}
                />
                {loginError && (
                  <p className="text-sm text-red-500 mt-1">{loginError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={!loginOtpCode.trim()}>
                {t("auth.verify", "Verify")}
              </Button>
            </form>
          </div>
          <OtpMessagePopup
            isOpen={showOtpPopup}
            onClose={() => setShowOtpPopup(false)}
            type={otpPopupType}
            message={otpPopupMessage}
          />
        </>
      );
    }

    return (
      <>
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t("auth.sign_in") || "Sign In"}</h2>
          <p className="text-sm text-gray-600">
            {t("auth.signup.userAlreadyRegistered", "You are already registered. Please login to claim your ticket.")}
          </p>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <Label htmlFor="loginPhone">{t("auth.phone_number", "Phone Number")}</Label>
              <Input
                id="loginPhone"
                type="tel"
                value={prefilledPhone}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="loginPassword">{t("auth.password", "Password")}</Label>
              <Input
                id="loginPassword"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder={t("auth.password", "Password")}
                required
              />
              {loginError && (
                <p className="text-sm text-red-500 mt-1">{loginError}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              {t("auth.sign_in", "Sign In")}
            </Button>
          </form>
        </div>
        <OtpMessagePopup
          isOpen={showOtpPopup}
          onClose={() => setShowOtpPopup(false)}
          type={otpPopupType}
          message={otpPopupMessage}
        />
      </>
    );
  }

  if (currentStep === "completing" && signupId) {
    return (
      <>
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t("auth.signup.completingSignup")}</h2>
          <p className="text-sm text-gray-600">
            {t("auth.signup.completingDescription")}
          </p>

          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
        <OtpMessagePopup
          isOpen={showOtpPopup}
          onClose={() => setShowOtpPopup(false)}
          type={otpPopupType}
          message={otpPopupMessage}
        />
      </>
    );
  }

  if (currentStep === "optional-info" && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t("auth.signup.optionalInformation")}</h2>
        <p className="text-sm text-gray-600">
          {t("auth.signup.addMedicalInfo")}
        </p>

        <form onSubmit={handleOptionalInfoSubmit} className="space-y-4">
          <div>
            <Label htmlFor="blood_type">{t("auth.signup.bloodType")}</Label>
            <select
              id="blood_type"
              name="blood_type"
              value={optionalInfo.blood_type}
              onChange={handleOptionalInfoChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("auth.signup.selectBloodType")}</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div>
            <Label htmlFor="emergency_contact_name">
              {t("auth.signup.emergencyContactName")}
            </Label>
            <Input
              id="emergency_contact_name"
              name="emergency_contact_name"
              type="text"
              value={optionalInfo.emergency_contact_name}
              onChange={handleOptionalInfoChange}
              placeholder={t("auth.signup.enterEmergencyContactName")}
            />
          </div>

          <PhoneNumberInput
            id="emergency_contact_mobile"
            name="emergency_contact_mobile"
            label={t("auth.signup.emergencyContactMobile")}
            value={optionalInfo.emergency_contact_mobile}
            onChange={handleEmergencyContactMobileChange}
            placeholder={t("auth.signup.enterEmergencyContactMobile") || "Enter emergency contact number"}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSavingOptional}
              className="flex-1"
            >
              {isSavingOptional ? t("auth.signup.saving") : t("auth.signup.saveAndCreateAccount")}
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            {t("auth.signup.backToLogin")}
          </button>
        </p>
      </div>
    );
  }

  if (currentStep === "profile-image" && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t("auth.signup.uploadProfileImage")}</h2>
        <p className="text-sm text-gray-600">
          {t("auth.signup.addProfilePicture")}
        </p>

        <div className="space-y-4">
          {/* Reference Image Example */}
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <p className="text-sm font-semibold mb-2 text-gray-700">
              {t("auth.signup.imageShouldBeClear")}
            </p>
            <div className="flex justify-center">
              <img
                src="/profile-image-example.png"
                alt={t("auth.signup.exampleOfClearImage")}
                className="w-32 h-32 object-contain rounded-full border-2 border-gray-300"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="profile-image">{t("auth.signup.profileImage")}</Label>
            <Input
              id="profile-image"
              name="profile-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("auth.signup.supportsAllFormats")}
            </p>
          </div>

          {profileImagePreview && (
            <div className="flex justify-center">
              <img
                src={profileImagePreview}
                alt={t("auth.signup.profilePreview")}
                className="w-32 h-32 object-contain rounded-full border-2 border-gray-200"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.src = "/Portrait_Placeholder.png";
                }}
              />
            </div>
          )}

          {isUploadingImage && (
            <div className="flex justify-center">
              <div className="text-sm text-gray-500">{t("auth.signup.uploadingImage")}</div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setCurrentStep("optional-info");
              }}
              disabled={isUploadingImage || !profileImage}
              className="flex-1"
            >
              {t("auth.signup.continue")}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            {t("auth.signup.backToLogin")}
          </button>
        </p>
      </div>
    );
  }

  if (currentStep === "password" && signupId) {
    const passwordValidation = password ? ValidationService.validatePassword(password, PASSWORD_RULES) : null;
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">{t("auth.signup.setPassword")}</h2>
        <p className="text-sm text-gray-600">
          {t("auth.signup.createPassword")}
        </p>

        {/* Password Requirements */}
        <div className="bg-gray-50 p-3 rounded-md text-sm">
          <p className="font-semibold mb-2">{t("auth.signup.passwordRequirements")}</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li className={password && password.length >= 8 ? "text-green-600" : ""}>
              {t("auth.signup.atLeast8Chars")}
            </li>
            <li className={password && /[A-Z]/.test(password) ? "text-green-600" : ""}>
              {t("auth.signup.oneUppercase")}
            </li>
            <li className={password && /[a-z]/.test(password) ? "text-green-600" : ""}>
              {t("auth.signup.oneLowercase")}
            </li>
            <li className={password && /\d/.test(password) ? "text-green-600" : ""}>
              {t("auth.signup.oneNumber")}
            </li>
            <li className={password && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-600" : ""}>
              {t("auth.signup.oneSpecialChar")}
            </li>
          </ul>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.signup.enterPassword")}
              required
            />
            {passwordValidation && !passwordValidation.isValid && (
              <p className="text-sm text-red-500 mt-1">
                {passwordValidation.errors[0]}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">{t("auth.signup.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("auth.signup.confirmYourPassword")}
              required
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-500 mt-1">
                {t("auth.signup.passwordsDoNotMatch")}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSettingPassword} className="w-full">
            {isSettingPassword ? t("auth.signup.settingPassword") : t("auth.signup.continue")}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            {t("auth.signup.backToLogin")}
          </button>
        </p>
      </div>
    );
  }

  if (otpSent && signupId) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">
          {otpDeliveryMethod === "email"
            ? t("auth.signup.verifyEmail") || "Verify Email Address"
            : t("auth.signup.verifyMobile")}
        </h2>
        <p className="text-sm text-gray-600">
          {otpDeliveryMethod === "email"
            ? t("auth.signup.otpSentToEmail", { email: formData.email })
            : t("auth.signup.otpSentTo", { mobile: formData.mobile_number })}
        </p>

        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div>
            <Label htmlFor="otp_code">{t("auth.signup.enterOtpCode")}</Label>
            <OtpInput
              value={otpCode}
              onChange={setOtpCode}
              length={6}
              autoFocus
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || isSendingOtp}
            className="w-full"
          >
            {isLoading ? t("auth.signup.verifying") : t("auth.verifyOtp")}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => sendOtp(signupId)}
            disabled={isSendingOtp}
            className="text-sm"
          >
            {isSendingOtp ? t("auth.signup.sending") : t("auth.signup.resendOtp")}
          </Button>
        </div>

        <p className="text-center text-sm text-gray-600">
          <button className="underline" onClick={onSwitchToLogin}>
            {t("auth.signup.backToLogin")}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("auth.signup.title")}</h2>
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">{t("auth.first_name")}</Label>
            <Input
              id="first_name"
              name="first_name"
              type="text"
              value={formData.first_name}
              onChange={handleInputChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="last_name">{t("auth.last_name")}</Label>
            <Input
              id="last_name"
              name="last_name"
              type="text"
              value={formData.last_name}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          {tokenInfo && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              {t("auth.signup.claimingTicket", {
                event: tokenInfo.event_name,
                purchaser: tokenInfo.purchaser_name,
              }) || `Registering to claim your ticket for ${tokenInfo.event_name} from ${tokenInfo.purchaser_name}`}
            </div>
          )}
          {isValidatingToken && (
            <div className="text-sm text-gray-600">
              {t("auth.signup.validatingToken") || "Validating registration link..."}
            </div>
          )}
          <PhoneNumberInput
            id="mobile_number"
            name="mobile_number"
            label={t("auth.phone_number")}
            value={formData.mobile_number}
            onChange={handleMobileNumberChange}
            disabled={isPhoneLocked || isValidatingToken}
            readOnly={isPhoneLocked}
            required
            onDialCodeChange={handleDialCodeChange}
            error={
              formData.mobile_number && !ValidationService.validatePhone(formData.mobile_number)
                ? t("auth.signup.validPhoneNumber")
                : undefined
            }
          />
          {canUseEmailOtp && (
            <div className="mt-3 p-3 border border-dashed border-blue-300 rounded-md bg-blue-50">
              <Label htmlFor="otp_delivery_method" className="text-sm font-medium text-blue-900">
                {t("auth.signup.otpDeliveryMethodLabel") || "OTP Delivery Method"}
              </Label>
              <p className="text-xs text-blue-700 mb-2">
                {t("auth.signup.otpDeliveryMethodDescription") ||
                  "You're registering with an international number. You can receive your verification code via email instead of SMS."}
              </p>
              <select
                id="otp_delivery_method"
                name="otp_delivery_method"
                value={otpDeliveryMethod}
                onChange={(e) => setOtpDeliveryMethod(e.target.value as "sms" | "email")}
                className="w-full p-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="sms">{t("auth.signup.otpMethodSms") || "Send OTP via SMS"}</option>
                <option value="email">{t("auth.signup.otpMethodEmail") || "Send OTP via Email"}</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div>
          <Label htmlFor="nationality">{t("auth.signup.nationality") || "Nationality"}</Label>
          <select
            id="nationality"
            name="nationality"
            value={formData.nationality || ""}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">
              {t("auth.signup.selectNationality") || "Select your nationality"}
            </option>
            {nationalityOptions.map((nation) => (
              <option key={nation} value={nation}>
                {nation}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="gender">{t("auth.signup.gender") || "Gender"}</Label>
            <select
              id="gender"
              name="gender"
              value={formData.gender || ""}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t("auth.signup.selectGender") || "Select gender"}</option>
              <option value="male">{t("auth.signup.genderMale") || "Male"}</option>
              <option value="female">{t("auth.signup.genderFemale") || "Female"}</option>
              <option value="other">{t("auth.signup.genderOther") || "Prefer not to say"}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="date_of_birth">{t("auth.signup.dateOfBirth") || "Date of Birth"}</Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={formData.date_of_birth || ""}
              onChange={handleInputChange}
              placeholder={t("auth.signup.enterDateOfBirth") || "Select your birth date"}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              required
              className="w-4 h-4"
            />
            <span>
              {t("auth.signup.agreeToTerms")}{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
                onClick={(e) => {
                  e.preventDefault();
                  window.open("/terms", "_blank");
                }}
              >
                {t("auth.signup.termsAndConditions")}
              </a>
            </span>
          </label>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? t("auth.signup.creatingAccount") : t("auth.signup.continue")}
        </Button>
      </form>
    </div>
  );

  return (
    <>
      {mainContent}
      {/* OTP Message Popup */}
      <OtpMessagePopup
        isOpen={showOtpPopup}
        onClose={() => setShowOtpPopup(false)}
        type={otpPopupType}
        message={otpPopupMessage}
      />
    </>
  );
};
