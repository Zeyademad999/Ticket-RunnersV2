import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/Contexts/AuthContext";
import { Ticket, LogIn, UserPlus } from "lucide-react";

interface SignInPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export const SignInPromptModal: React.FC<SignInPromptModalProps> = ({
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const { openLogin, openSignup } = useAuth();

  const handleSignIn = () => {
    onClose();
    openLogin();
  };

  const handleSignUp = () => {
    onClose();
    openSignup();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {t("marketplace.signInRequired", "Sign In Required")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t(
              "marketplace.signInPrompt",
              "Please sign in or create an account to view seller contact details and ticket information."
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            variant="gradient"
            className="w-full"
            onClick={handleSignIn}
          >
            <LogIn className="h-4 w-4 mr-2" />
            {t("booking.signIn", "Sign In")}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignUp}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {t("booking.signUp", "Sign Up")}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={onClose}
          >
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};



