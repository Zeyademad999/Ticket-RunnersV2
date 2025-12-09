import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NFCCardsService } from "@/lib/api/services/nfcCards";
import { Loader2, AlertCircle, CheckCircle2, User, Edit2, Trash2 } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { PhoneNumberInput } from "./PhoneNumberInput";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/Contexts/AuthContext";

interface AssignCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
  hasPaidCardFee?: boolean;
  onPayCard?: () => void;
  isPaying?: boolean;
  existingCollector?: {
    id: string;
    name: string;
    phone?: string;
    mobile_number?: string;
    profile_image?: string | null;
  } | null;
}

export const AssignCollectorModal = ({
  isOpen,
  onClose,
  onSuccess,
  hasPaidCardFee = false,
  onPayCard,
  isPaying = false,
  existingCollector = null,
}: AssignCollectorModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<"view" | "info" | "payment" | "phone">(existingCollector ? "view" : "info");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleUnderstand = () => {
    // Check payment status after user clicks "I Understand"
    if (!hasPaidCardFee) {
      // User hasn't paid - show payment step
      setStep("payment");
    } else {
      // User has paid - go directly to phone input
      setStep("phone");
    }
  };

  // Normalize phone numbers for comparison (remove all non-digits)
  const normalizePhoneForComparison = (phone: string): string => {
    return phone.replace(/\D+/g, "");
  };

  // Check if the entered phone number matches the current user's phone
  const isSelfAssignment = (): boolean => {
    if (!user?.mobile_number || !phoneNumber) return false;
    
    const userPhoneNormalized = normalizePhoneForComparison(user.mobile_number);
    const enteredPhoneNormalized = normalizePhoneForComparison(phoneNumber);
    
    // Check if they match (with or without country code)
    return userPhoneNormalized === enteredPhoneNormalized ||
           userPhoneNormalized.endsWith(enteredPhoneNormalized) ||
           enteredPhoneNormalized.endsWith(userPhoneNormalized);
  };

  const handleAssign = async () => {
    if (!phoneNumber || phoneNumber.trim() === "") {
      setErrorMessage(t("profilepage.nfc.collectorModal.phoneRequired", "Please enter a phone number"));
      setShowErrorAlert(true);
      return;
    }

    // Check if user is trying to assign themselves
    if (isSelfAssignment()) {
      setErrorMessage(t("profilepage.nfc.collectorModal.cannotAssignSelf", "You cannot assign yourself as collector"));
      setShowErrorAlert(true);
      return;
    }

    setLoading(true);
    // Clear any previous error alerts
    setShowErrorAlert(false);
    setErrorMessage("");
    
    try {
      const response = await NFCCardsService.assignCollector({
        collector_phone: phoneNumber,
      });

      // Check if response has collector data (success case)
      if (response?.collector || response?.data?.collector) {
        const collector = response?.collector || response?.data?.collector;
        const successMsg = t("profilepage.nfc.collectorModal.successMessage", "Collector assigned successfully! {{name}} can now collect your card.", { name: collector?.name });
        setSuccessMessage(successMsg);
        setShowSuccessAlert(true);
        // Don't close modal yet - wait for user to click OK on success dialog
      } else {
        // If no collector data, treat as error
        throw new Error(response?.message || t("profilepage.nfc.collectorModal.errorMessage", "Failed to assign collector"));
      }
    } catch (error: any) {
      // Only show error alert for actual errors
      const errorCode = error.response?.data?.error?.code;
      let errorMsg =
        error.response?.data?.error?.message ||
        error.message ||
        t("profilepage.nfc.collectorModal.errorMessageRetry", "Failed to assign collector. Please try again.");
      
      // If payment is required, show payment step instead of error
      if (errorCode === 'PAYMENT_REQUIRED' && onPayCard) {
        setStep("payment");
        setErrorMessage("");
        setLoading(false);
        return;
      }
      
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(existingCollector ? "view" : "info");
    setPhoneNumber("");
    setLoading(false);
    setShowErrorAlert(false);
    setShowSuccessAlert(false);
    setErrorMessage("");
    setSuccessMessage("");
    setIsEditing(false);
    onClose();
  };

  const handleRemoveCollector = async () => {
    setLoading(true);
    setShowErrorAlert(false);
    setErrorMessage("");
    
    try {
      // Remove collector by assigning empty/null phone
      // We'll need to add a remove endpoint or use assign with null
      const response = await NFCCardsService.removeCollector();
      
      if (response?.message || response?.success !== false) {
        const successMsg = t("profilepage.nfc.collectorModal.collectorRemoved", "Collector removed successfully");
        setSuccessMessage(successMsg);
        setShowSuccessAlert(true);
      } else {
        throw new Error(response?.message || t("profilepage.nfc.collectorModal.removeError", "Failed to remove collector"));
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.message ||
        t("profilepage.nfc.collectorModal.removeErrorRetry", "Failed to remove collector. Please try again.");
      
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessOk = async () => {
    setShowSuccessAlert(false);
    // Call onSuccess and wait for it to complete (refetch)
    if (onSuccess) {
      await onSuccess();
    }
    handleClose();
  };

  // Reset to appropriate step when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingCollector) {
        setStep("view");
        setIsEditing(false);
      } else {
        setStep("info");
      }
      setPhoneNumber("");
    }
  }, [isOpen, existingCollector]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {step === "view" 
                ? t("profilepage.nfc.collectorModal.viewTitle", "View Collector")
                : t("profilepage.nfc.collectorModal.title")}
            </DialogTitle>
            <DialogDescription>
              {step === "view"
                ? t("profilepage.nfc.collectorModal.viewDescription", "View and manage your assigned collector")
                : step === "info"
                ? t("profilepage.nfc.collectorModal.description")
                : step === "payment"
                ? t("profilepage.nfc.collectorModal.descriptionPayment")
                : t("profilepage.nfc.collectorModal.descriptionPhone")}
            </DialogDescription>
          </DialogHeader>

        {step === "view" ? (
          existingCollector ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                {existingCollector.profile_image ? (
                  <ImageWithFallback
                    src={existingCollector.profile_image}
                    alt={existingCollector.name}
                    className="w-16 h-16 rounded-full object-cover"
                    fallbackSrc="/public/Portrait_Placeholder.png"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-lg">{existingCollector.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {existingCollector.phone || existingCollector.mobile_number}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditing(true);
                    setPhoneNumber(existingCollector.phone || existingCollector.mobile_number || "");
                    setStep("phone");
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {t("profilepage.nfc.collectorModal.editCollector", "Edit Collector")}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleRemoveCollector}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("profilepage.nfc.collectorModal.removing", "Removing...")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("profilepage.nfc.collectorModal.removeCollector", "Remove Collector")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg text-gray-600 dark:text-gray-400">
                    {t("profilepage.nfc.collectorModal.noCollector", "No Authorized Collector")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("profilepage.nfc.collectorModal.noCollectorDescription", "You haven't assigned anyone to collect your card yet.")}
                  </p>
                </div>
                <Button
                  variant="default"
                  onClick={() => {
                    setStep("info");
                  }}
                >
                  {t("profilepage.nfc.collectorModal.assignCollector", "Assign Collector")}
                </Button>
              </div>
            </div>
          )
        ) : step === "info" ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {t("profilepage.nfc.collectorModal.importantInfo")}
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {t("profilepage.nfc.collectorModal.infoText1")}
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  {t("profilepage.nfc.collectorModal.infoText2")}
                </p>
              </div>
            </div>
          </div>
        ) : step === "payment" ? (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  {t("profilepage.nfc.collectorModal.paymentRequired")}
                </p>
                <p className="text-yellow-800 dark:text-yellow-200">
                  {t("profilepage.nfc.collectorModal.paymentText")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collector-phone">{t("profilepage.nfc.collectorModal.collectorPhone")}</Label>
              <PhoneNumberInput
                id="collector-phone"
                name="collector_phone"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value)}
                placeholder={t("profilepage.nfc.collectorModal.collectorPhonePlaceholder")}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("profilepage.nfc.collectorModal.collectorPhoneHint")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "view" ? (
            <Button variant="outline" onClick={handleClose}>
              {t("common.close", "Close")}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (step === "payment") {
                    setStep("info");
                  } else if (step === "phone") {
                    if (existingCollector && !isEditing) {
                      setStep("view");
                    } else {
                      setStep("info");
                    }
                  } else {
                    handleClose();
                  }
                }} 
                disabled={loading || isPaying}
              >
                {step === "info" ? t("profilepage.nfc.collectorModal.cancel") : t("profilepage.nfc.collectorModal.back")}
              </Button>
              {step === "info" ? (
                <Button onClick={handleUnderstand}>{t("profilepage.nfc.collectorModal.iUnderstand")}</Button>
              ) : step === "payment" ? (
                <Button onClick={onPayCard} disabled={isPaying}>
                  {isPaying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("profilepage.nfc.collectorModal.processing")}
                    </>
                  ) : (
                    t("profilepage.nfc.collectorModal.payCard")
                  )}
                </Button>
              ) : (
                <Button onClick={handleAssign} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t("profilepage.nfc.collectorModal.assigning")}
                    </>
                  ) : isEditing ? (
                    t("profilepage.nfc.collectorModal.updateCollector", "Update Collector")
                  ) : (
                    t("profilepage.nfc.collectorModal.assignCollector")
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showErrorAlert} onOpenChange={setShowErrorAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {t("common.error", "Error")}
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2">
            {errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setShowErrorAlert(false)}>
            {t("common.ok", "OK")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            {t("common.success", "Success")}
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2">
            {successMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleSuccessOk} className="bg-green-600 hover:bg-green-700">
            {t("common.ok", "OK")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

