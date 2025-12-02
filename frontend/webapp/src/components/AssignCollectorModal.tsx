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
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { PhoneNumberInput } from "./PhoneNumberInput";
import { useTranslation } from "react-i18next";

interface AssignCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  hasPaidCardFee?: boolean;
  onPayCard?: () => void;
  isPaying?: boolean;
}

export const AssignCollectorModal = ({
  isOpen,
  onClose,
  onSuccess,
  hasPaidCardFee = false,
  onPayCard,
  isPaying = false,
}: AssignCollectorModalProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "payment" | "phone">("info");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const handleAssign = async () => {
    if (!phoneNumber || phoneNumber.trim() === "") {
      setErrorMessage(t("profilepage.nfc.collectorModal.phoneRequired", "Please enter a phone number"));
      setShowErrorAlert(true);
      return;
    }

    setLoading(true);
    try {
      const response = await NFCCardsService.assignCollector({
        collector_phone: phoneNumber,
      });

      if (response.success) {
        toast({
          title: t("common.success", "Success"),
          description: t("profilepage.nfc.collectorModal.successMessage", "Collector assigned successfully! {{name}} can now collect your card.", { name: response.data?.collector.name }),
        });
        onSuccess?.();
        handleClose();
      } else {
        throw new Error(response.message || t("profilepage.nfc.collectorModal.errorMessage", "Failed to assign collector"));
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message ||
        error.message ||
        t("profilepage.nfc.collectorModal.errorMessageRetry", "Failed to assign collector. Please try again.");
      
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("info");
    setPhoneNumber("");
    setLoading(false);
    onClose();
  };

  // Reset to info step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("info");
      setPhoneNumber("");
    }
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("profilepage.nfc.collectorModal.title")}</DialogTitle>
            <DialogDescription>
              {step === "info"
                ? t("profilepage.nfc.collectorModal.description")
                : step === "payment"
                ? t("profilepage.nfc.collectorModal.descriptionPayment")
                : t("profilepage.nfc.collectorModal.descriptionPhone")}
            </DialogDescription>
          </DialogHeader>

        {step === "info" ? (
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
          <Button 
            variant="outline" 
            onClick={() => {
              if (step === "payment") {
                setStep("info");
              } else if (step === "phone") {
                setStep("info");
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
              ) : (
                t("profilepage.nfc.collectorModal.assignCollector")
              )}
            </Button>
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
    </>
  );
};

