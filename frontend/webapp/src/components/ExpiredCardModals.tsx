import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface CardExpiredModalProps {
  open: boolean;
  onClose: () => void;
  cardStatus?: "expired" | "missing";
}

export const CardExpiredModal = ({ open, onClose, cardStatus = "expired" }: CardExpiredModalProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleRenewClick = () => {
    onClose(); // Close the modal
    navigate("/profile#nfc"); // Navigate to renewal/upgrade page
  };

  const title = cardStatus === "missing" 
    ? t("cardExpired.missingTitle", "NFC Card Required")
    : t("cardExpired.title");
  
  const message = cardStatus === "missing"
    ? t("cardExpired.missingMessage", "You need to upgrade or get an NFC card to access premium features. You can continue using the app normally.")
    : t("cardExpired.message");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {message}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            {t("cardExpired.laterButton", "Maybe Later")}
          </Button>
          <Button onClick={handleRenewClick}>
            {cardStatus === "missing" 
              ? t("cardExpired.upgradeButton", "Upgrade Now")
              : t("cardExpired.renewButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
