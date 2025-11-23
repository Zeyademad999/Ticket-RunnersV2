import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/Contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface LoginFormProps {
  onClose: () => void;
  onSwitchToSignup: () => void;
  onSwitchToOtpLogin: () => void;
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onClose,
  onSwitchToSignup,
  onSwitchToOtpLogin,
  onSuccess,
}) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { loginWithCredentials, isLoading } = useAuth();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!login.trim() || !password.trim()) {
      setError(t("auth.fillAllFields"));
      return;
    }

    try {
      await loginWithCredentials(login.trim(), password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      // Error is already handled in AuthContext
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("auth.login")}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login">{t("auth.emailOrMobile")}</Label>
          <Input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder={t("auth.enterEmailOrMobile")}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.enterPassword")}
            disabled={isLoading}
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("auth.loggingIn")}
            </>
          ) : (
            t("auth.login")
          )}
        </Button>
      </form>

      <div className="text-center">
        <button
          onClick={onSwitchToOtpLogin}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-800 underline mb-2 block"
        >
          {t("auth.loginWithOtp")}
        </button>
      </div>

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
