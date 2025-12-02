import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Lock, User } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import i18n from "@/lib/i18n";
import { authApi } from "@/lib/api/adminApi";

const AdminLogin: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Call real API
      const response = await authApi.login(formData.username, formData.password);
      
      // Store tokens and user data
      localStorage.setItem("admin_access_token", response.access_token);
      localStorage.setItem("admin_refresh_token", response.refresh_token);
      localStorage.setItem("admin_user", JSON.stringify(response.user));
      localStorage.setItem("admin_authenticated", "true");

      toast({
        title: t("admin.login.signIn"),
        description: t("admin.login.subtitle"),
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      // Log full error for debugging
      console.error("Login error:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      // Handle API errors
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.detail || 
                          error.response?.data?.message ||
                          error.message || 
                          t("auth.errors.invalidCredentials");
      
      toast({
        title: t("common.error"),
        description: errorMessage || `Login failed: ${error.response?.status || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-dark flex items-center justify-center p-4"
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              {isDark ? (
                <img
                  src="/ticket-logo.png"
                  alt="Ticket Runners Logo"
                  className="h-12 w-auto rtl:ml-4 ltr:mr-4"
                />
              ) : (
                <img
                  src="/ticket-logo-secondary.png"
                  alt="Ticket Runners Logo"
                  className="h-12 w-auto rtl:ml-4 ltr:mr-4"
                />
              )}
            </div>
            <CardTitle className="text-2xl text-center">
              {t("admin.login.title")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("admin.login.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("admin.login.username")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                  <Input
                    id="username"
                    type="text"
                    placeholder={t("admin.login.usernamePlaceholder")}
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className="pl-10 rtl:pl-0 rtl:pr-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("admin.login.password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t("admin.login.passwordPlaceholder")}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className="pl-10 pr-10 rtl:pl-10 rtl:pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent rtl:right-auto rtl:left-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center gap-2 rtl:flex-row-reverse">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t("admin.login.signingIn")}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Shield className="h-4 w-4" />
                    {t("admin.login.signIn")}
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
