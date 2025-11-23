import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { OtpInput } from "@/components/ui/input-otp";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/Contexts/AuthContext";
import organizerApi from "@/lib/api/organizerApi";
import { useToast } from "@/hooks/use-toast";

const OrganizerLogin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login, verifyOTP } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<
    "login" | "otp" | "forgotPassword" | "resetOtp" | "newPassword"
  >("login");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [resetOtp, setResetOtp] = useState(""); // Separate OTP for password reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if redirected due to suspended account
  useEffect(() => {
    if (location.state?.suspended) {
      setError(t("organizer.login.error.suspended"));
      toast({
        title: t("organizer.login.error.suspended"),
        description: t("organizer.login.error.suspended"),
        variant: "destructive",
      });
    }
  }, [location.state, t, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!mobile || !password) {
      setError(t("organizer.login.error.missingFields"));
      return;
    }

    setIsLoading(true);
    try {
      await login(mobile, password);
      setSuccess(t("organizer.login.otpSent"));
      setStep("otp");
    } catch (err: any) {
      setError(err.message || t("organizer.login.error.loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp || otp.length !== 6) {
      setError(t("organizer.login.error.invalidOtp"));
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(mobile, otp);
      toast({
        title: t("organizer.login.success"),
        description: t("organizer.login.welcome"),
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || t("organizer.login.error.invalidOtp"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setStep("forgotPassword");
    setError("");
    setSuccess("");
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!mobile) {
      setError(t("auth.phone_required"));
      return;
    }

    setIsLoading(true);
    try {
      await organizerApi.forgotPassword({ mobile });
      setStep("resetOtp");
      setSuccess(t("auth.otp_sent"));
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          t("organizer.login.error.otpSendFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!resetOtp || resetOtp.length !== 6) {
      setError(t("organizer.login.error.invalidOtp"));
      return;
    }

    // OTP is verified when resetting password, so just proceed to password step
    setStep("newPassword");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError(t("auth.password_required"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.errors.confirm_password_mismatch"));
      return;
    }
    if (newPassword.length < 6) {
      setError(t("auth.errors.password_min"));
      return;
    }

    setIsLoading(true);
    try {
      await organizerApi.resetPassword({
        mobile,
        otp_code: resetOtp,
        new_password: newPassword,
      });
      setSuccess(t("auth.password_reset_success"));
      toast({
        title: t("auth.password_reset_success"),
        description: t("organizer.login.passwordResetSuccess"),
      });
      setTimeout(() => {
        setStep("login");
        setMobile("");
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setOtp("");
        setResetOtp("");
        setError("");
        setSuccess("");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          err.message ||
          t("organizer.login.error.passwordResetFailed")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep("login");
    setMobile("");
    setPassword("");
    setOtp("");
    setResetOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-dark"
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/ticket-logo-secondary.png"
                alt="Ticket Runner Logo"
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === "forgotPassword" ||
              step === "resetOtp" ||
              step === "newPassword"
                ? t("auth.forgot_password")
                : t("organizer.login.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="tel"
                  placeholder={t("organizer.login.mobilePlaceholder")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <Input
                  type="password"
                  placeholder={t("organizer.login.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-500 text-sm">{success}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("organizer.login.loginButton")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("auth.forgot_password")}
                  </button>
                </div>
              </form>
            )}
            {step === "otp" && (
              <form onSubmit={handleOtp} className="space-y-4">
                <div className="text-center mb-4">
                  {t("organizer.login.otpTitle")}
                </div>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  length={6}
                  autoFocus={true}
                  language={i18n.language}
                />
                {error && (
                  <div className="text-red-500 text-sm text-center">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-green-500 text-sm text-center">
                    {success}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("organizer.login.verifyButton")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
            {step === "forgotPassword" && (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div className="text-center mb-4 text-gray-600">
                  {t("auth.password_reset_description")}
                </div>
                <Input
                  type="tel"
                  placeholder={t("organizer.login.mobilePlaceholder")}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && <div className="text-green-500 text-sm">{success}</div>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("auth.send_otp")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
            {step === "resetOtp" && (
              <form onSubmit={handleResetOtp} className="space-y-4">
                <div className="text-center mb-4">
                  {t("organizer.login.otpTitle")}
                </div>
                <OtpInput
                  value={resetOtp}
                  onChange={setResetOtp}
                  length={6}
                  autoFocus={true}
                  language={i18n.language}
                />
                {error && (
                  <div className="text-red-500 text-sm text-center">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-green-500 text-sm text-center">
                    {success}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("auth.verify_otp")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
            {step === "newPassword" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="text-center mb-4 text-gray-600">
                  {t("auth.password_reset_description")}
                </div>
                <Input
                  type="password"
                  placeholder={t("auth.placeholders.new_password")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <Input
                  type="password"
                  placeholder={t("auth.placeholders.confirm_new_password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={i18n.language === "ar" ? "text-right" : ""}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                {success && (
                  <div className="text-green-500 text-sm">{success}</div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("common.loading") : t("auth.reset_password")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    {t("auth.back_to_signin")}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default OrganizerLogin;
