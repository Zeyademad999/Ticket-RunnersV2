import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/input-otp";
import { TabsContent } from "@/components/ui/tabs";
import { useProfileUpdate } from "@/hooks/useProfileUpdate";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthService } from "@/lib/api/services/auth";
import { apiClient, handleApiResponse } from "@/lib/api/config";
import { getSecureToken } from "@/lib/secureStorage";

interface ProfileSettingsTabProps {
  t: (key: string, defaultValue?: string) => string;
  userInfo: {
    name: string;
    profileImage?: string;
  };
  profileImage: string;
  setProfileImage: (img: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  phoneVerified: boolean;
  setPhoneVerified: (v: boolean) => void;
  handleSendPhoneOtp: () => void;
  email: string;
  setEmail: (email: string) => void;
  emailVerified: boolean;
  setEmailVerified: (v: boolean) => void;
  handleSendEmailOtp: () => void;
  bloodType: string;
  setBloodType: (v: string) => void;
  emergencyContact: string;
  setEmergencyContact: (v: string) => void;
  emergencyContactName: string;
  setEmergencyContactName: (v: string) => void;
  oldPassword: string;
  setOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  passwordOtpVerified: boolean;
  setPasswordOtpVerified: (v: boolean) => void;
  passwordOtpError: string;
  handleSendPasswordOtp: () => void;
  handleVerifyPasswordOtp: () => void;
  handleSettingsSave: () => void;
  notifyEmail: boolean;
  setNotifyEmail: (v: boolean) => void;
  notifySMS: boolean;
  setNotifySMS: (v: boolean) => void;
  notificationWarning: string;
}

export const ProfileSettingsTab: React.FC<ProfileSettingsTabProps> = (
  props
) => {
  const {
    t,
    userInfo,
    phone,
    setPhone,
    bloodType,
    setBloodType,
    emergencyContact,
    setEmergencyContact,
    emergencyContactName,
    setEmergencyContactName,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    passwordOtpVerified,
    passwordOtpError,
    handleSendPasswordOtp,
    handleVerifyPasswordOtp,
    handleSettingsSave,
  } = props;

  const { updateProfile, loading } = useProfileUpdate();
  const { toast } = useToast();

  // Phone number change flow state
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [currentPhoneOtp, setCurrentPhoneOtp] = useState("");
  const [showCurrentPhoneOtpModal, setShowCurrentPhoneOtpModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newPhoneOtp, setNewPhoneOtp] = useState("");
  const [showNewPhoneOtpModal, setShowNewPhoneOtpModal] = useState(false);
  const [showNewPhoneInputModal, setShowNewPhoneInputModal] = useState(false);
  const [currentPhoneVerified, setCurrentPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingCurrentOtp, setResendingCurrentOtp] = useState(false);
  const [resendingNewOtp, setResendingNewOtp] = useState(false);

  // Local state for OTP modals and values
  const [showPasswordOtpModal, setShowPasswordOtpModal] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState("");

  // Handle starting phone number change
  const handleStartPhoneChange = async () => {
    setIsChangingPhone(true);
    setSendingOtp(true);
    try {
      // Send OTP to current phone number using the dedicated endpoint
      const response = await AuthService.sendCurrentMobileOtp();
      if (response) {
        setShowCurrentPhoneOtpModal(true);
        toast({
          title: "OTP Sent",
          description: "Please enter the OTP sent to your current phone number",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.response?.data?.error?.message || error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle resending current phone OTP
  const handleResendCurrentOtp = async () => {
    setResendingCurrentOtp(true);
    try {
      const response = await AuthService.sendCurrentMobileOtp();
      if (response) {
        setCurrentPhoneOtp(""); // Clear previous OTP
        toast({
          title: "OTP Resent",
          description: "A new OTP has been sent to your current phone number",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to resend OTP",
        description: error.response?.data?.error?.message || error.message || "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendingCurrentOtp(false);
    }
  };

  // Handle verifying current phone OTP (just validate format, actual verification happens in final step)
  const handleVerifyCurrentPhoneOtp = async () => {
    if (currentPhoneOtp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    // Just validate the OTP format, don't verify yet (verification happens in final step)
    // This allows the user to proceed to enter new phone number
    setCurrentPhoneVerified(true);
    setShowCurrentPhoneOtpModal(false);
    setShowNewPhoneInputModal(true); // Show modal to enter new phone number
    toast({
      title: "Phone Verified",
      description: "Please enter your new phone number",
    });
  };

  // Handle sending OTP to new phone number
  const handleSendNewPhoneOtp = async () => {
    if (!newPhoneNumber || newPhoneNumber === phone) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a different phone number",
        variant: "destructive",
      });
      return;
    }

    setSendingOtp(true);
    try {
      // Send OTP to new phone number using the dedicated mobile change endpoint
      const response = await AuthService.sendNewMobileOtp(newPhoneNumber);
      if (response) {
        setShowNewPhoneInputModal(false); // Close new phone input modal
        setShowNewPhoneOtpModal(true); // Show OTP verification modal
        toast({
          title: "OTP Sent",
          description: "Please enter the OTP sent to your new phone number",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.response?.data?.error?.message || error.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Handle resending new phone OTP
  const handleResendNewOtp = async () => {
    if (!newPhoneNumber) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a new phone number first",
        variant: "destructive",
      });
      return;
    }

    setResendingNewOtp(true);
    try {
      const response = await AuthService.sendNewMobileOtp(newPhoneNumber);
      if (response) {
        setNewPhoneOtp(""); // Clear previous OTP
        toast({
          title: "OTP Resent",
          description: "A new OTP has been sent to your new phone number",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to resend OTP",
        description: error.response?.data?.error?.message || error.message || "Failed to resend OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendingNewOtp(false);
    }
  };

  // Handle verifying new phone OTP and updating phone number
  const handleVerifyNewPhoneOtp = async () => {
    if (newPhoneOtp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    if (currentPhoneOtp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please verify your current phone number first",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      // Verify both OTPs and change mobile number using the dedicated endpoint
      const response = await AuthService.verifyAndChangeMobile(
        currentPhoneOtp,
        newPhoneNumber,
        newPhoneOtp
      );

      if (response) {
        setPhone(response.mobile_number);
        setIsChangingPhone(false);
        setCurrentPhoneVerified(false);
        setNewPhoneNumber("");
        setNewPhoneOtp("");
        setCurrentPhoneOtp("");
        setShowNewPhoneOtpModal(false);
        toast({
          title: "Phone Number Updated",
          description: "Your phone number has been updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.response?.data?.error?.message || error.message || "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Handle canceling phone change
  const handleCancelPhoneChange = () => {
    setIsChangingPhone(false);
    setCurrentPhoneVerified(false);
    setNewPhoneNumber("");
    setNewPhoneOtp("");
    setCurrentPhoneOtp("");
    setShowCurrentPhoneOtpModal(false);
    setShowNewPhoneInputModal(false);
    setShowNewPhoneOtpModal(false);
  };

  // Handle individual field updates
  const handleBloodTypeUpdate = async () => {
    if (bloodType) {
      try {
        const success = await updateProfile("blood_type", bloodType);
        if (success) {
          toast({
            title: "Blood Type Updated",
            description: "Your blood type has been updated successfully",
          });
        }
      } catch (error) {
        console.error("Failed to update blood type:", error);
      }
    }
  };

  const handleEmergencyContactNameUpdate = async () => {
    if (emergencyContactName) {
      const success = await updateProfile("emergency_contact_name", emergencyContactName);
      if (success) {
        toast({
          title: "Emergency Contact Name Updated",
          description: "Emergency contact name has been updated successfully",
        });
      }
    }
  };

  const handleEmergencyContactUpdate = async () => {
    if (emergencyContact) {
      const success = await updateProfile("emergency_contact_mobile", emergencyContact);
      if (success) {
        toast({
          title: "Emergency Contact Updated",
          description: "Emergency contact number has been updated successfully",
        });
      }
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword && passwordOtpVerified) {
      await updateProfile("password", newPassword);
    }
  };

  return (
    <TabsContent value="settings" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("profilepage.settingsTab.tab")}
          </CardTitle>
          <CardDescription className="mb-2">
            {t("profilepage.settingsTab.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                {t("profilepage.settingsTab.fullName")}
              </Label>
              <Input id="fullName" disabled defaultValue={userInfo.name} />
            </div>
            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                {t("profilepage.settingsTab.phone", "Phone Number")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="phone"
                  value={phone || ""}
                  disabled
                  placeholder={t(
                    "profilepage.settingsTab.phonePlaceholder",
                    "Phone Number"
                  )}
                />
                {!isChangingPhone && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStartPhoneChange}
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("profilepage.settingsTab.changeNumber", "Change Number")
                    )}
                  </Button>
                )}
                {isChangingPhone && !currentPhoneVerified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelPhoneChange}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                {t("profilepage.settingsTab.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={props.email}
                disabled
                placeholder={t(
                  "profilepage.settingsTab.emailPlaceholder",
                  "Email Address"
                )}
              />
            </div>
            {/* Blood Type */}
            <div className="space-y-2">
              <Label htmlFor="bloodType">
                {t("profilepage.settingsTab.bloodType")}
              </Label>
              <div className="flex items-center gap-2">
                <select
                  id="bloodType"
                  className="flex-1 rounded-md border border-input bg-input px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                >
                  <option value="">
                    {t("profilepage.settingsTab.selectOption")}
                  </option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="Unknown">Unknown</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBloodTypeUpdate}
                  disabled={loading || !bloodType}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("profilepage.settingsTab.update", "Update")
                  )}
                </Button>
              </div>
            </div>
            {/* Emergency Contact Name */}
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">
                {t("profilepage.settingsTab.emergencyContactName")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="emergencyContactName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder={t(
                    "profilepage.settingsTab.emergencyContactNamePlaceholder",
                    "Contact Name"
                  )}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmergencyContactNameUpdate}
                  disabled={loading || !emergencyContactName}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("profilepage.settingsTab.update", "Update")
                  )}
                </Button>
              </div>
            </div>
            {/* Emergency Contact Number */}
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">
                {t("profilepage.settingsTab.emergencyContact")}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="emergencyContact"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder={t(
                    "profilepage.settingsTab.emergencyContactPlaceholder",
                    "Contact Number"
                  )}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEmergencyContactUpdate}
                  disabled={loading || !emergencyContact}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("profilepage.settingsTab.update", "Update")
                  )}
                </Button>
              </div>
            </div>
          </div>
          {/* Password Change Section */}
          <div className="space-y-2 pt-4">
            <Label>{t("profilepage.settingsTab.changePassword")}</Label>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t(
                    "profilepage.settingsTab.oldPasswordPlaceholder",
                    "Current Password"
                  )}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    props.setPasswordOtpVerified(false);
                  }}
                  placeholder={t(
                    "profilepage.settingsTab.newPasswordPlaceholder",
                    "New Password"
                  )}
                />
              </div>
              <div className="flex items-end">
                {/* For change password verification: */}
                {!passwordOtpVerified ? (
                  <>
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => {
                        setShowPasswordOtpModal(true);
                      }}
                      disabled={!oldPassword || !newPassword}
                    >
                      {t("auth.verify", "Send OTP")}
                    </Button>
                    <Dialog
                      open={showPasswordOtpModal}
                      onOpenChange={setShowPasswordOtpModal}
                    >
                      <DialogContent>
                        <DialogHeader>
                          {t(
                            "profilepage.settingsTab.passwordOtpTitle",
                            "Enter OTP"
                          )}
                        </DialogHeader>
                        <OtpInput
                          value={passwordOtp}
                          onChange={setPasswordOtp}
                          autoFocus
                        />
                        <Button
                          className="w-full mt-2"
                          onClick={() => {
                            if (passwordOtp.length === 6) {
                              // Mock verification - in real app, verify with API
                              setShowPasswordOtpModal(false);
                              props.setPasswordOtpVerified(true);
                            } else {
                              props.setPasswordOtpError(
                                "Please enter a valid 6-digit OTP"
                              );
                            }
                          }}
                          disabled={passwordOtp.length !== 6}
                        >
                          {t("auth.verifyOtp", "Verify OTP")}
                        </Button>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs font-semibold">
                      {t("auth.verified", "Verified")}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePasswordUpdate}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("profilepage.settingsTab.update", "Update")
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {passwordOtpError && (
              <p className="text-sm text-red-500">{passwordOtpError}</p>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button
              variant="gradient"
              onClick={handleSettingsSave}
              disabled={newPassword && !passwordOtpVerified}
            >
              {t("profilepage.settingsTab.saveChanges", "Save Changes")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Phone OTP Modal */}
      <Dialog
        open={showCurrentPhoneOtpModal}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelPhoneChange();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            {t("profilepage.settingsTab.phoneOtpTitle", "Enter OTP")}
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the OTP sent to your current phone number: {phone || ""}
          </p>
          <OtpInput
            value={currentPhoneOtp}
            onChange={setCurrentPhoneOtp}
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setShowCurrentPhoneOtpModal(false);
                handleCancelPhoneChange();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerifyCurrentPhoneOtp}
              disabled={currentPhoneOtp.length !== 6 || verifyingOtp}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                t("auth.verifyOtp", "Verify OTP")
              )}
            </Button>
          </div>
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCurrentOtp}
              disabled={resendingCurrentOtp}
              className="text-sm text-primary hover:text-primary/80"
            >
              {resendingCurrentOtp ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Resending...
                </>
              ) : (
                t("auth.resendOtp", "Resend OTP")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Phone Number Input Modal */}
      <Dialog
        open={showNewPhoneInputModal}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelPhoneChange();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            {t("profilepage.settingsTab.enterNewPhone", "Enter New Phone Number")}
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Please enter your new phone number
          </p>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPhone">
                {t("profilepage.settingsTab.newPhoneNumber", "New Phone Number")}
              </Label>
              <Input
                id="newPhone"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder={t(
                  "profilepage.settingsTab.phonePlaceholder",
                  "Phone Number"
                )}
                className="mt-2"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setShowNewPhoneInputModal(false);
                  handleCancelPhoneChange();
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSendNewPhoneOtp}
                disabled={sendingOtp || !newPhoneNumber || newPhoneNumber === phone}
              >
                {sendingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  t("auth.sendOtp", "Send OTP")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Phone OTP Modal */}
      <Dialog
        open={showNewPhoneOtpModal}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelPhoneChange();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            {t("profilepage.settingsTab.phoneOtpTitle", "Enter OTP")}
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the OTP sent to your new phone number: {newPhoneNumber || ""}
          </p>
          <OtpInput
            value={newPhoneOtp}
            onChange={setNewPhoneOtp}
            autoFocus
          />
          <div className="flex gap-2 mt-4">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => {
                setShowNewPhoneOtpModal(false);
                handleCancelPhoneChange();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerifyNewPhoneOtp}
              disabled={newPhoneOtp.length !== 6 || verifyingOtp}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                t("auth.verifyOtp", "Verify OTP")
              )}
            </Button>
          </div>
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendNewOtp}
              disabled={resendingNewOtp}
              className="text-sm text-primary hover:text-primary/80"
            >
              {resendingNewOtp ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Resending...
                </>
              ) : (
                t("auth.resendOtp", "Resend OTP")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
};
