import { useState } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import {
  UpdateProfileRequest,
  UpdateProfileResponse,
  BloodType,
} from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";
import { ValidationService, PASSWORD_RULES } from "@/lib/validation";

interface UseProfileUpdateReturn {
  updateProfile: (field: string, value: any) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useProfileUpdate = (): UseProfileUpdateReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (field: string, value: any): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate the field and value
      const updateData: UpdateProfileRequest = {};

      switch (field) {
        case "mobile_number":
          if (!value || typeof value !== "string") {
            throw new Error("Invalid mobile number");
          }
          updateData.mobile_number = value;
          break;

        case "email":
          if (!value || typeof value !== "string" || !value.includes("@")) {
            throw new Error("Invalid email address");
          }
          updateData.email = value;
          break;

        case "blood_type":
          const validBloodTypes: BloodType[] = [
            "A+",
            "A-",
            "B+",
            "B-",
            "AB+",
            "AB-",
            "O+",
            "O-",
            "Unknown",
          ];
          if (!value || !validBloodTypes.includes(value as BloodType)) {
            throw new Error("Invalid blood type");
          }
          updateData.blood_type = value as BloodType;
          break;

        case "emergency_contact_name":
          if (!value || typeof value !== "string" || value.length > 150) {
            throw new Error("Invalid emergency contact name");
          }
          updateData.emergency_contact_name = value;
          break;

        case "emergency_contact_mobile":
          if (!value || typeof value !== "string" || value.length > 30) {
            throw new Error("Invalid emergency contact mobile");
          }
          updateData.emergency_contact_mobile = value;
          break;

        case "password":
          if (!value || typeof value !== "string") {
            throw new Error("Password is required");
          }

          const passwordValidation = ValidationService.validatePassword(
            value,
            PASSWORD_RULES
          );
          if (!passwordValidation.isValid) {
            throw new Error(
              passwordValidation.errors[0] ||
                "Password does not meet requirements"
            );
          }

          updateData.password = value;
          break;

        default:
          throw new Error(`Invalid field: ${field}`);
      }

      const response: UpdateProfileResponse =
        await BookingsService.updateCustomerProfile(updateData);

      if (response.updated) {
        toast({
          title: "Profile Updated",
          description: `${field.replace(
            "_",
            " "
          )} has been updated successfully.`,
        });
        return true;
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile");

      toast({
        title: "Update Failed",
        description:
          err.message || "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateProfile,
    loading,
    error,
  };
};
