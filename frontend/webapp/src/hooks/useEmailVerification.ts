import { useState } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { VerifyEmailRequest, VerifyEmailResponse } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";

interface UseEmailVerificationReturn {
  verifyEmail: (newEmail: string, otpCode: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useEmailVerification = (): UseEmailVerificationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyEmail = async (
    newEmail: string,
    otpCode: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (
        !newEmail ||
        typeof newEmail !== "string" ||
        !newEmail.includes("@")
      ) {
        throw new Error("Invalid email address");
      }

      if (!otpCode || typeof otpCode !== "string" || otpCode.length !== 6) {
        throw new Error("OTP code must be exactly 6 characters");
      }

      const verifyData: VerifyEmailRequest = {
        new_email: newEmail,
        otp_code: otpCode,
      };

      const response: VerifyEmailResponse = await BookingsService.verifyEmail(
        verifyData
      );

      if (response.verified) {
        toast({
          title: "Email Verified",
          description: `Your email ${response.email} has been verified successfully.`,
        });
        return true;
      } else {
        throw new Error("Email verification failed");
      }
    } catch (err: any) {
      console.error("Error verifying email:", err);
      setError(err.message || "Failed to verify email");

      toast({
        title: "Verification Failed",
        description:
          err.message || "Failed to verify your email. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    verifyEmail,
    loading,
    error,
  };
};
