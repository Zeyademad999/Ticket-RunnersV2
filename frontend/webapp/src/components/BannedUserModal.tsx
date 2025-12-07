import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { AlertCircle, X } from "lucide-react";
import { useAuth } from "@/Contexts/AuthContext";

export const BannedUserModal: React.FC = () => {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleBannedEvent = () => {
      setOpen(true);
    };

    window.addEventListener("account-banned", handleBannedEvent);

    return () => {
      window.removeEventListener("account-banned", handleBannedEvent);
    };
  }, []);

  const handleClose = async () => {
    setOpen(false);
    // Logout the user when modal is closed
    await logout();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl text-red-500">
            {t("auth.accountBanned") || "Account Banned"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("auth.accountBannedMessage") || "Your account has been banned. Please contact support for more information."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            variant="default"
            className="w-full"
            onClick={handleClose}
          >
            {t("common.close", "Close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

