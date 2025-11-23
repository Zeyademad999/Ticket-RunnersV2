import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ProfileCompletionModal: React.FC<Props> = ({ open, onClose }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bloodType, setBloodType] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactNumber, setEmergencyContactNumber] = useState("");

  // Helper function for RTL-compatible error messages
  const ErrorMessage = ({ message }: { message: string }) => (
    <p
      className="text-sm text-red-500"
      dir={i18n.dir()}
      style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
    >
      {message}
    </p>
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (!image) {
      toast({ title: t("profileSetup.errors.image_required") });
      return;
    }
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = () => {
    // Submit logic here (blood type and emergency contact info are optional)
    toast({ title: t("profileSetup.submitted") });
    onClose();
    // Reset form
    setCurrentStep(1);
    setImage(null);
    setImagePreview(null);
    setBloodType("");
    setEmergencyContactName("");
    setEmergencyContactNumber("");
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setCurrentStep(1);
    setImage(null);
    setImagePreview(null);
    setBloodType("");
    setEmergencyContactName("");
    setEmergencyContactNumber("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            {currentStep === 1
              ? t("profileSetup.step1_title")
              : t("profileSetup.step2_title")}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 1 ? (
          // Step 1: Image Upload
          <div className="space-y-4">
            <p
              className="text-sm text-muted-foreground"
              dir={i18n.dir()}
              style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
            >
              {t("profileSetup.image_disclaimer")}
            </p>

            <div className="space-y-3">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="cursor-pointer"
              />

              {imagePreview && (
                <div className="space-y-2">
                  <p
                    className="text-sm font-medium"
                    dir={i18n.dir()}
                    style={{
                      textAlign: i18n.dir() === "rtl" ? "right" : "left",
                    }}
                  >
                    {t("profileSetup.image_preview")}
                  </p>
                  <div className="flex justify-center">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleNext} className="w-full" disabled={!image}>
                {t("profileSetup.next")}
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: Additional Information
          <div className="space-y-4">
            <p
              className="text-sm text-muted-foreground"
              dir={i18n.dir()}
              style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
            >
              {t("profileSetup.image_disclaimer")}
            </p>

            <div className="space-y-3">
              <Select onValueChange={setBloodType} value={bloodType}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("profileSetup.select_blood_type")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder={t("profileSetup.emergency_contact_name")}
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                dir={i18n.dir()}
                style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
              />

              <Input
                type="tel"
                placeholder={t("profileSetup.emergency_contact_number")}
                value={emergencyContactNumber}
                onChange={(e) => setEmergencyContactNumber(e.target.value)}
                dir={i18n.dir()}
                style={{ textAlign: i18n.dir() === "rtl" ? "right" : "left" }}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  {t("profileSetup.back")}
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  {t("profileSetup.submit")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
