import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OtpMessagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  type: "error" | "success";
  title?: string;
  message: string;
}

export const OtpMessagePopup: React.FC<OtpMessagePopupProps> = ({
  isOpen,
  onClose,
  type,
  title,
  message,
}) => {
  const { t } = useTranslation();

  const defaultTitle =
    type === "error"
      ? t("auth.otpErrorTitle", "OTP Verification Failed")
      : t("auth.otpSuccessTitle", "OTP Verified Successfully");

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {type === "error" ? (
              <AlertCircle className="h-6 w-6 text-red-500" />
            ) : (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            )}
            <AlertDialogTitle className="text-left">
              {title || defaultTitle}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-2">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={onClose}
            className={type === "error" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {t("common.ok", "OK")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

