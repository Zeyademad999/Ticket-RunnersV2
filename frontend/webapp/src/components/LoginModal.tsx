import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "./loginForm";
import { OtpLoginForm } from "./OtpLoginForm";
import { useAuth } from "@/Contexts/AuthContext";

interface LoginModalProps {
  onLoginSuccess?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const { isLoginOpen, closeLogin, switchToSignup } = useAuth();
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");

  const handleClose = () => {
    setLoginMode("password");
    closeLogin();
  };

  const handleSwitchToOtp = () => {
    setLoginMode("otp");
  };

  const handleBackToPassword = () => {
    setLoginMode("password");
  };

  const handleLoginSuccess = () => {
    onLoginSuccess?.();
    handleClose();
  };

  return (
    <Dialog open={isLoginOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {loginMode === "password" ? "Login" : "Login with OTP"}
          </DialogTitle>
        </DialogHeader>

        {loginMode === "password" ? (
          <LoginForm
            onClose={handleClose}
            onSwitchToSignup={switchToSignup}
            onSwitchToOtpLogin={handleSwitchToOtp}
            onSuccess={handleLoginSuccess}
          />
        ) : (
          <OtpLoginForm
            onClose={handleClose}
            onSwitchToSignup={switchToSignup}
            onBackToPasswordLogin={handleBackToPassword}
            onSuccess={handleLoginSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
