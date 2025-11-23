import React, { useState } from "react";
import {
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";

type SettingsTab = "password" | "mobile";

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("password");
  const { merchant } = useAuth();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Mobile change states
  const [currentMobile, setCurrentMobile] = useState(
    merchant?.mobile_number || ""
  );
  const [newMobile, setNewMobile] = useState("");
  const [mobileOTP, setMobileOTP] = useState("");
  const [isChangingMobile, setIsChangingMobile] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("settings.passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t("settings.passwordTooShort"));
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await apiService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (response.success) {
        toast.success(t("settings.passwordChangedSuccess"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(response.message || t("settings.failedToChangePassword"));
      }
    } catch (error: any) {
      toast.error(error.message || t("settings.failedToChangePassword"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSendMobileOTP = async () => {
    if (!newMobile) {
      toast.error(t("settings.enterNewMobileError"));
      return;
    }

    if (newMobile === currentMobile) {
      toast.error(t("settings.mobileSameAsCurrent"));
      return;
    }

    setIsSendingOTP(true);
    try {
      const response = await apiService.sendMobileChangeOTP(newMobile);
      if (response.success) {
        setOtpSent(true);
        toast.success(t("settings.otpSentSuccess"));
      } else {
        toast.error(response.message || t("settings.failedToSendOtp"));
      }
    } catch (error: any) {
      toast.error(error.message || t("settings.failedToSendOtp"));
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleMobileChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mobileOTP) {
      toast.error(t("settings.enterOtpError"));
      return;
    }

    setIsChangingMobile(true);
    try {
      const response = await apiService.changeMobile({
        current_mobile: currentMobile,
        new_mobile: newMobile,
        otp: mobileOTP,
      });

      if (response.success) {
        toast.success(t("settings.mobileChangedSuccess"));
        setNewMobile("");
        setMobileOTP("");
        setOtpSent(false);
        setCurrentMobile(newMobile);
      } else {
        toast.error(response.message || t("settings.failedToChangeMobile"));
      }
    } catch (error: any) {
      toast.error(error.message || t("settings.failedToChangeMobile"));
    } finally {
      setIsChangingMobile(false);
    }
  };

  const renderPasswordTab = () => (
    <div className="card max-w-md">
      <div className="flex items-center mb-6">
        <div
          className={`w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center ${
            isRTL ? "mr-3" : "mr-3"
          }`}
        >
          <Lock className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t("settings.changePassword")}
          </h3>
          <p className="text-sm text-gray-600">
            {t("settings.changePasswordSubtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-gray-700"
          >
            {t("settings.currentPassword")}
          </label>
          <div className="mt-1 relative">
            <input
              id="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`input-field ${isRTL ? "pl-10" : "pr-10"}`}
              placeholder={t("settings.enterCurrentPassword")}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                isRTL ? "left-3" : "right-3"
              }`}
            >
              {showCurrentPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-gray-700"
          >
            {t("settings.newPassword")}
          </label>
          <div className="mt-1 relative">
            <input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`input-field ${isRTL ? "pl-10" : "pr-10"}`}
              placeholder={t("settings.enterNewPassword")}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                isRTL ? "left-3" : "right-3"
              }`}
            >
              {showNewPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700"
          >
            {t("settings.confirmNewPassword")}
          </label>
          <div className="mt-1 relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`input-field ${isRTL ? "pl-10" : "pr-10"}`}
              placeholder={t("settings.confirmNewPasswordPlaceholder")}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${
                isRTL ? "left-3" : "right-3"
              }`}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isChangingPassword}
          className="btn-primary w-full flex justify-center items-center"
        >
          {isChangingPassword ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            t("settings.changePasswordButton")
          )}
        </button>
      </form>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle
            className={`h-5 w-5 text-blue-400 mt-0.5 ${
              isRTL ? "mr-2" : "mr-2"
            }`}
          />
          <div className="text-sm text-blue-800">
            <p className="font-medium">{t("settings.passwordRequirements")}</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>{t("settings.passwordRequirementsList.0")}</li>
              <li>{t("settings.passwordRequirementsList.1")}</li>
              <li>{t("settings.passwordRequirementsList.2")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileTab = () => (
    <div className="card max-w-md">
      <div className="flex items-center mb-6">
        <div
          className={`w-10 h-10 bg-warning-100 rounded-lg flex items-center justify-center ${
            isRTL ? "mr-3" : "mr-3"
          }`}
        >
          <Smartphone className="h-5 w-5 text-warning-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t("settings.changeMobile")}
          </h3>
          <p className="text-sm text-gray-600">
            {t("settings.changeMobileSubtitle")}
          </p>
        </div>
      </div>

      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{t("settings.currentMobile")}:</span>{" "}
          {currentMobile}
        </p>
      </div>

      <form onSubmit={handleMobileChange} className="space-y-4">
        <div>
          <label
            htmlFor="newMobile"
            className="block text-sm font-medium text-gray-700"
          >
            {t("settings.newMobile")}
          </label>
          <input
            id="newMobile"
            type="tel"
            value={newMobile}
            onChange={(e) => setNewMobile(e.target.value)}
            className="input-field mt-1"
            placeholder={t("settings.enterNewMobile")}
            required
          />
        </div>

        {!otpSent ? (
          <button
            type="button"
            onClick={handleSendMobileOTP}
            disabled={isSendingOTP || !newMobile}
            className="btn-secondary w-full flex justify-center items-center"
          >
            {isSendingOTP ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              t("settings.sendOtp")
            )}
          </button>
        ) : (
          <>
            <div>
              <label
                htmlFor="mobileOTP"
                className="block text-sm font-medium text-gray-700"
              >
                {t("settings.otpCode")}
              </label>
              <input
                id="mobileOTP"
                type="text"
                value={mobileOTP}
                onChange={(e) => setMobileOTP(e.target.value)}
                className="input-field mt-1 text-center text-2xl tracking-widest"
                placeholder={t("settings.enterOtpCode")}
                maxLength={6}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {t("settings.otpSentTo")} {newMobile}
              </p>
            </div>

            <div
              className={`flex ${
                isRTL ? "space-x-reverse space-x-3" : "space-x-3"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setMobileOTP("");
                }}
                className="btn-secondary flex-1"
              >
                {t("common.back")}
              </button>
              <button
                type="submit"
                disabled={isChangingMobile}
                className="btn-primary flex-1 flex justify-center items-center"
              >
                {isChangingMobile ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  t("settings.changeMobileButton")
                )}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle
            className={`h-5 w-5 text-yellow-400 mt-0.5 ${
              isRTL ? "mr-2" : "mr-2"
            }`}
          />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">{t("settings.mobileChangeImportant")}</p>
            <p>{t("settings.mobileChangeWarning")}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("settings.title")}
        </h1>
        <p className="text-gray-600">{t("settings.account")}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav
          className={`-mb-px flex ${
            isRTL ? "space-x-reverse space-x-8" : "space-x-8"
          }`}
        >
          <button
            onClick={() => setActiveTab("password")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "password"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Lock className={`inline h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`} />
            {t("auth.password")}
          </button>
          <button
            onClick={() => setActiveTab("mobile")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "mobile"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Smartphone
              className={`inline h-4 w-4 ${isRTL ? "ml-2" : "mr-2"}`}
            />
            {t("auth.mobileNumber")}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex justify-center">
        {activeTab === "password" && renderPasswordTab()}
        {activeTab === "mobile" && renderMobileTab()}
      </div>

      {/* Account Info */}
      <div className="card max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("settings.accountInformation")}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              {t("settings.merchantName")}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {merchant?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              {t("settings.contactPerson")}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {merchant?.contact_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              {t("settings.address")}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {merchant?.address}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">
              {t("settings.status")}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                merchant?.status === "active"
                  ? "bg-success-100 text-success-800"
                  : "bg-danger-100 text-danger-800"
              }`}
            >
              <CheckCircle className={`h-3 w-3 ${isRTL ? "ml-1" : "mr-1"}`} />
              {merchant?.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
