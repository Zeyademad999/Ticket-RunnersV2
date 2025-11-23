import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

interface LogoutConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onLogoutAll?: () => void;
  isLoading?: boolean;
}

export const LogoutConfirmationDialog: React.FC<
  LogoutConfirmationDialogProps
> = ({ open, onOpenChange, onConfirm, onLogoutAll, isLoading = false }) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleLogoutAll = () => {
    onLogoutAll?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("auth.logoutConfirmationTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("auth.logoutConfirmationMessage")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isLoading} className="w-full sm:w-auto">
            {t("auth.cancel")}
          </AlertDialogCancel>
          {onLogoutAll && (
            <AlertDialogAction
              onClick={handleLogoutAll}
              disabled={isLoading}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 focus:ring-orange-600"
            >
              {isLoading ? t("auth.loggingOut") : t("auth.logoutAll")}
            </AlertDialogAction>
          )}
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? t("auth.loggingOut") : t("auth.logout", "Logout")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
