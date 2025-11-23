import { useState } from "react";
import { BookingsService } from "@/lib/api/services/bookings";
import { VerifyMobileRequest, VerifyMobileResponse } from "@/lib/api/types";
import { toast } from "@/hooks/use-toast";

interface UseMobileVerificationReturn {
  verifyMobile: (newMobileNumber: string, otpCode: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export const useMobileVerification = (): UseMobileVerificationReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyMobile = async (
    newMobileNumber: string,
    otpCode: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!newMobileNumber || typeof newMobileNumber !== "string") {
        throw new Error("Invalid mobile number");
      }

      if (!otpCode || typeof otpCode !== "string" || otpCode.length !== 6) {
        throw new Error("OTP code must be exactly 6 characters");
      }

      const verifyData: VerifyMobileRequest = {
        new_mobile_number: newMobileNumber,
        otp_code: otpCode,
      };

      const response: VerifyMobileResponse =
        await BookingsService.verifyMobileNumber(verifyData);

      if (response.verified) {
        toast({
          title: "Mobile Number Verified",
          description: `Your mobile number ${response.mobile_number} has been verified successfully.`,
        });
        return true;
      } else {
        throw new Error("Mobile number verification failed");
      }
    } catch (err: any) {
      console.error("Error verifying mobile number:", err);
      setError(err.message || "Failed to verify mobile number");

      toast({
        title: "Verification Failed",
        description:
          err.message ||
          "Failed to verify your mobile number. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    verifyMobile,
    loading,
    error,
  };
};
