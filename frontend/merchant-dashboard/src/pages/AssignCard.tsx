import React, { useState } from "react";
import {
  CreditCard,
  Smartphone,
  CheckCircle,
  Copy,
  Download,
  ArrowRight,
  AlertCircle,
  User,
  Scan,
  RefreshCw,
  X,
} from "lucide-react";
import { apiService } from "../services/api";
import { Customer } from "../types";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../context/LanguageContext";
import { useWebNFC } from "../hooks/useWebNFC";

type AssignmentStep = "input" | "verification" | "otp" | "success";

const AssignCard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [step, setStep] = useState<AssignmentStep>("input");
  const [cardSerial, setCardSerial] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [hashedCode, setHashedCode] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedSerial, setScannedSerial] = useState<string | null>(null);
  const [isScannedCardValid, setIsScannedCardValid] = useState<boolean | null>(null);
  const [cardValidationError, setCardValidationError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  
  // NFC scanning hook
  const {
    isScanning,
    isSupported,
    error: nfcError,
    scanCard,
    stopScanning,
    isConnected,
    bridgeAvailable,
  } = useWebNFC();

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Authentication required. Please log in first.");
      return;
    }

    if (!cardSerial || !customerMobile) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsVerifying(true);
    try {
      // First validate the card (normalize serial number)
      try {
        const normalizedCardSerial = cardSerial.trim().toUpperCase();
        const validationResponse = await apiService.validateCard(normalizedCardSerial);
        
        if (validationResponse.success && validationResponse.data) {
          if (!validationResponse.data.valid) {
            // Card is invalid (not found or already assigned)
            const errorMessage = validationResponse.data.error?.message || "Card validation failed";
            toast.error(errorMessage, { duration: 6000 });
            setIsVerifying(false);
            return;
          }
        }
      } catch (validationError: any) {
        // If validation fails, show error
        const errorMessage = validationError?.response?.data?.error?.message || 
                            validationError?.message || 
                            "Failed to validate card. Please check if the card is registered.";
        toast.error(errorMessage, { duration: 6000 });
        setIsVerifying(false);
        return;
      }

      // Then verify customer
      const customerResponse = await apiService.verifyCustomerMobile(customerMobile);
      
      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data);
        
        // Fees are paid in person to merchant, no check needed
        // Assign card (this sends OTP to customer automatically)
        try {
          // Use normalized serial number
          const normalizedCardSerial = cardSerial.trim().toUpperCase();
          await apiService.assignCard({
            card_serial: normalizedCardSerial,
            customer_mobile: customerMobile,
            otp: "",
            hashed_code: "",
          });
          
          setStep("otp");
          toast.success("Customer verified! OTP sent to customer mobile.");
        } catch (assignError: any) {
          // Handle card assignment errors specifically
          const errorMessage = assignError?.response?.data?.error?.message || 
                              assignError?.message || 
                              "Failed to assign card. Please check if the card is registered and not already assigned.";
          toast.error(errorMessage, { duration: 6000 });
          // Don't proceed to OTP step if assignment failed
          return;
        }
      } else {
        toast.error("Customer not found or not registered");
      }
    } catch (error: any) {
      // Handle customer verification errors
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.message || 
                          "Failed to verify customer";
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Authentication required. Please log in first.");
      return;
    }

    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      // Normalize card serial number
      const normalizedCardSerial = cardSerial.trim().toUpperCase();
      const response = await apiService.verifyCustomerOTP(
        normalizedCardSerial,
        customerMobile,
        otp
      );

      if (response.success && response.data) {
        setHashedCode(response.data.hashed_code);
        setStep("success");
        toast.success("Card assigned successfully!");
      } else {
        const errorMessage = response.message || "Failed to assign card";
        toast.error(errorMessage, { duration: 5000 });
      }
    } catch (error: any) {
      // Handle OTP verification errors with better messages
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.response?.data?.message ||
                          error?.message || 
                          "Failed to assign card. Please check the OTP and try again.";
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(hashedCode);
      toast.success("Hashed code copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const resetForm = () => {
    setStep("input");
    setCardSerial("");
    setCustomerMobile("");
    setOtp("");
    setHashedCode("");
    setCustomer(null);
    setScannedSerial(null);
    setShowScanModal(false);
    setIsScannedCardValid(null);
    setCardValidationError(null);
  };

  // Handle NFC scan
  const handleNFCScan = async () => {
    if (!isSupported && !bridgeAvailable) {
      toast.error("NFC scanning is not available. Please start the NFC Bridge Server (see nfc-bridge-server/README.md) or use Chrome/Edge on Android.");
      return;
    }

    setShowScanModal(true);
    setScannedSerial(null);
    setIsScannedCardValid(null);
    setCardValidationError(null);
    stopScanning();

    try {
      const result = await scanCard();
      
      if (result.success && result.serialNumber) {
        // Normalize serial number: trim whitespace and convert to uppercase
        const serialNumber = result.serialNumber.trim().toUpperCase();
        setScannedSerial(serialNumber);
        
        // Validate the card immediately after scanning
        if (isAuthenticated) {
          try {
            const validationResponse = await apiService.validateCard(serialNumber);
            
            if (validationResponse.success && validationResponse.data) {
              if (!validationResponse.data.valid) {
                // Card is invalid (not found or already assigned)
                const errorMessage = validationResponse.data.error?.message || "Card validation failed";
                setIsScannedCardValid(false);
                setCardValidationError(errorMessage);
                toast.error(errorMessage, { duration: 6000 });
                // Don't allow using this card - button will be disabled
                return;
              } else {
                // Card is valid and available
                setIsScannedCardValid(true);
                setCardValidationError(null);
                toast.success("Card scanned and validated successfully!");
              }
            }
          } catch (validationError: any) {
            // If validation fails, mark as invalid
            const errorMessage = validationError?.response?.data?.error?.message || 
                                validationError?.message || 
                                "Failed to validate card. Please check manually.";
            setIsScannedCardValid(false);
            setCardValidationError(errorMessage);
            toast.error(errorMessage, { duration: 6000 });
            return;
          }
        } else {
          // Not authenticated, can't validate - allow manual entry
          setIsScannedCardValid(null);
          setCardValidationError(null);
          toast.success("Card scanned successfully!");
        }
      } else {
        toast.error(result.error || "Failed to scan NFC card");
        setShowScanModal(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to scan NFC card");
      setShowScanModal(false);
    }
  };

  // Use scanned serial number
  const useScannedSerial = async () => {
    if (scannedSerial) {
      // Validate again before using (in case user manually entered or changed)
      if (isAuthenticated) {
        try {
          const validationResponse = await apiService.validateCard(scannedSerial);
          
          if (validationResponse.success && validationResponse.data) {
            if (!validationResponse.data.valid) {
              // Card is invalid (not found or already assigned)
              const errorMessage = validationResponse.data.error?.message || "Card validation failed";
              toast.error(errorMessage, { duration: 6000 });
              return;
            }
          }
        } catch (validationError: any) {
          // If validation fails, show error
          const errorMessage = validationError?.response?.data?.error?.message || 
                              validationError?.message || 
                              "Failed to validate card. Please check manually.";
          toast.error(errorMessage, { duration: 6000 });
          return;
        }
      }
      
      setCardSerial(scannedSerial);
      setShowScanModal(false);
      setScannedSerial(null);
      toast.success("Serial number added to form");
    }
  };

  const renderInputStep = () => (
    <div className="card max-w-md mx-auto relative">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
          <CreditCard className="h-6 w-6 text-primary-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("assignCard.title")}
        </h2>
        <p className="text-gray-600">
          {t("assignCard.selectCard")} {t("assignCard.selectCustomer")}
        </p>
      </div>

      <form onSubmit={handleInputSubmit} className="space-y-4">
        {!isAuthenticated && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center z-10">
            <p className="text-gray-600 font-medium">
              Please log in to continue
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="cardSerial"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("assignCard.cardNumber")}
          </label>
          <div className="flex gap-2">
            <input
              id="cardSerial"
              type="text"
              value={cardSerial}
              onChange={(e) => setCardSerial(e.target.value)}
              className="input-field mt-1 flex-1"
              placeholder="Enter card serial number"
              required
            />
            {(isSupported || bridgeAvailable) && (
              <button
                type="button"
                onClick={handleNFCScan}
                disabled={isScanning}
                className="mt-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                title="Scan NFC Card"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Scanning...</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4" />
                    <span className="hidden sm:inline">Scan</span>
                  </>
                )}
              </button>
            )}
          </div>
          {(isSupported || bridgeAvailable) && (
            <div className="mt-1 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {isConnected ? "Reader Connected" : "Reader Offline"}
              </span>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="customerMobile"
            className="block text-sm font-medium text-gray-700"
          >
            {t("assignCard.customerPhone")}
          </label>
          <input
            id="customerMobile"
            type="tel"
            value={customerMobile}
            onChange={(e) => setCustomerMobile(e.target.value)}
            className="input-field mt-1"
            placeholder="Enter customer mobile number"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isVerifying}
          className="btn-primary w-full flex justify-center items-center"
        >
          {isVerifying ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              {t("assignCard.selectCustomer")}
              <ArrowRight className={`${isRTL ? "mr-2" : "ml-2"} h-4 w-4`} />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderOTPStep = () => (
    <div className="card max-w-md mx-auto relative">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-warning-100 rounded-lg flex items-center justify-center mb-4">
          <Smartphone className="h-6 w-6 text-warning-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("auth.login")}
        </h2>
        <p className="text-gray-600">{t("auth.loginSubtitle")}</p>
      </div>

      {customer && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <User className={`h-5 w-5 text-gray-400 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {customer.name}
              </p>
              <p className="text-sm text-gray-500">{customer.mobile_number}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleOTPSubmit} className="space-y-4">
        {!isAuthenticated && (
          <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center z-10">
            <p className="text-gray-600 font-medium">
              Please log in to continue
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="otp"
            className="block text-sm font-medium text-gray-700"
          >
            {t("auth.password")}
          </label>
          <input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="input-field mt-1 text-center text-2xl tracking-widest"
            placeholder="000000"
            maxLength={6}
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the 6-digit code sent to {customerMobile}
          </p>
        </div>

        <div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            type="button"
            onClick={() => setStep("input")}
            className="btn-secondary flex-1"
          >
            {t("common.back")}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex-1 flex justify-center items-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>{t("assignCard.assignCard")}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="card max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 bg-success-100 rounded-lg flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          {t("assignCard.cardAssignedSuccess")}
        </h2>
        <p className="text-gray-600">{t("assignCard.cardAssignedSuccess")}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hashed Code for Card Writing
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <code className="text-sm font-mono text-gray-900 break-all">
              {hashedCode}
            </code>
          </div>
        </div>

        <div className={`flex ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
          <button
            onClick={copyToClipboard}
            className="btn-secondary flex-1 flex items-center justify-center"
          >
            <Copy className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
            {t("common.copy")}
          </button>
          <button
            onClick={() => {
              // This would integrate with local card writing software
              toast.success("Write command sent to local software");
            }}
            className="btn-success flex-1 flex items-center justify-center"
          >
            <Download className={`${isRTL ? "ml-2" : "mr-2"} h-4 w-4`} />
            {t("common.write")}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle
              className={`h-5 w-5 text-blue-400 ${
                isRTL ? "ml-2" : "mr-2"
              } mt-0.5`}
            />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Important Instructions:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Scan the NFC card with your reader</li>
                <li>Write the hashed code to the card</li>
                <li>If card was already assigned, it will be rewritten</li>
                <li>Verify the write operation was successful</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle
              className={`h-5 w-5 text-green-400 ${
                isRTL ? "ml-2" : "mr-2"
              } mt-0.5`}
            />
            <div className="text-sm text-green-800">
              <p className="font-medium">Card Assignment Complete!</p>
              <p>
                Card {cardSerial} has been assigned to {customer?.name} (
                {customerMobile})
              </p>
            </div>
          </div>
        </div>

        <button onClick={resetForm} className="btn-primary w-full">
          {t("assignCard.assignCard")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("assignCard.title")}
        </h1>
        <p className="text-gray-600">
          {t("assignCard.selectCard")} {t("assignCard.selectCustomer")}
        </p>
        {!isAuthenticated && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ You need to be logged in to assign cards. Please log in first.
            </p>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {["input", "otp", "success"].map((stepName, index) => (
            <div key={stepName} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName
                    ? "bg-primary-600 text-white"
                    : step === "success" ||
                      (step === "otp" && index < 2) ||
                      (step === "input" && index === 0)
                    ? "bg-primary-100 text-primary-600"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    step === "success" || (step === "otp" && index === 0)
                      ? "bg-primary-600"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === "input" && renderInputStep()}
      {step === "otp" && renderOTPStep()}
      {step === "success" && renderSuccessStep()}

      {/* NFC Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Scan NFC Card
              </h3>
              <button
                onClick={() => {
                  stopScanning();
                  setShowScanModal(false);
                  setScannedSerial(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!scannedSerial ? (
              <div className="text-center py-8">
                {isScanning ? (
                  <>
                    <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                      <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      Scanning for NFC card...
                    </p>
                    <p className="text-sm text-gray-500">
                      Place the card on the reader
                    </p>
                    <button
                      onClick={() => {
                        stopScanning();
                        setShowScanModal(false);
                      }}
                      className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Scan className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      Ready to scan
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Click the button below to start scanning
                    </p>
                    <button
                      onClick={handleNFCScan}
                      className="btn-primary"
                    >
                      Start Scanning
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                {isScannedCardValid === false ? (
                  <>
                    <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2 text-red-600">
                      Card Validation Failed
                    </p>
                    {cardValidationError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-800">{cardValidationError}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      Card Scanned Successfully!
                    </p>
                  </>
                )}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Serial Number:</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {scannedSerial}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      stopScanning();
                      setShowScanModal(false);
                      setScannedSerial(null);
                      setIsScannedCardValid(null);
                      setCardValidationError(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={useScannedSerial}
                    disabled={isScannedCardValid === false}
                    className={`flex-1 ${
                      isScannedCardValid === false
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed opacity-60"
                        : "btn-primary"
                    }`}
                  >
                    Use This Serial
                  </button>
                </div>
              </div>
            )}

            {nfcError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{nfcError}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignCard;
