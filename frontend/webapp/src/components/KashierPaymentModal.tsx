import React, { useEffect, useRef, useState } from "react";
import { X, CreditCard, Shield, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { KashierPaymentConfig } from "@/lib/api/services/payments";

interface KashierPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentConfig: KashierPaymentConfig | null;
  amount: number;
  currency?: string;
  onPaymentSuccess?: (orderId: string) => void;
  onPaymentError?: (error: string) => void;
}

const KashierPaymentModal: React.FC<KashierPaymentModalProps> = ({
  isOpen,
  onClose,
  paymentConfig,
  amount,
  currency = "EGP",
  onPaymentSuccess,
  onPaymentError,
}) => {
  const { toast } = useToast();
  const [paymentStep, setPaymentStep] = useState<
    "loading" | "processing" | "success" | "error"
  >("loading");
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messageListenerRef = useRef<((e: MessageEvent) => void) | null>(null);

  // Set up message listener for payment redirects
  useEffect(() => {
    if (!isOpen) {
      cleanupMessageListener();
      setPaymentStep("loading");
      return;
    }

    // Listen for messages from Kashier script (following working example pattern)
    // The script-based integration sends {message: 'success'} or {message: 'failure'}
    const messageListener = (e: MessageEvent) => {
      // Handle payment success/failure messages from Kashier script
      if (e.data && typeof e.data === "object" && e.data.message) {
        if (e.data.message === "success") {
          console.log("Success payment", e.data);
          setPaymentStep("success");
          onPaymentSuccess?.(paymentConfig?.orderId || "");
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully.",
          });
          setTimeout(() => {
            onClose();
          }, 2000);
        } else if (e.data.message === "failure") {
          console.log("Failure payment", e.data);
          setPaymentStep("error");
          onPaymentError?.(e.data.message || "Payment failed");
          toast({
            title: "Payment Failed",
            description:
              e.data.message || "Your payment could not be processed.",
            variant: "destructive",
          });
        }
      }
    };

    messageListenerRef.current = messageListener;
    window.addEventListener("message", messageListener, false);

    return () => {
      cleanupMessageListener();
    };
  }, [isOpen, paymentConfig]);

  const cleanupScript = () => {
    if (scriptRef.current) {
      scriptRef.current.remove();
      scriptRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }
  };

  const loadKashierScript = React.useCallback(() => {
    if (!paymentConfig || !containerRef.current) {
      return;
    }

    // Clean up any existing script
    cleanupScript();

    // Determine script URL based on mode (script URL must match baseUrl domain)
    // For test mode: use payments.kashier.io (even if baseUrl is test-fep.kashier.io)
    // For live mode: use fep.kashier.io or checkout.kashier.io
    const scriptBaseUrl =
      paymentConfig.mode === "test"
        ? "https://payments.kashier.io"
        : "https://fep.kashier.io";
    const scriptUrl = `${scriptBaseUrl}/kashier-checkout.js`;

    console.log("Loading Kashier script from:", scriptUrl);
    console.log(
      "Payment mode:",
      paymentConfig.mode,
      "Base URL from config:",
      paymentConfig.baseUrl
    );

    // Create script element (following working example pattern)
    const script = document.createElement("script");
    script.id = "kashier-iFrame";
    script.src = scriptUrl;

    // Set data attributes exactly like working example
    script.setAttribute("data-amount", paymentConfig.amount);
    script.setAttribute("data-hash", paymentConfig.hash);
    script.setAttribute("data-currency", paymentConfig.currency);
    script.setAttribute("data-orderId", paymentConfig.orderId);
    script.setAttribute("data-merchantId", paymentConfig.merchantId);
    script.setAttribute(
      "data-merchantRedirect",
      paymentConfig.merchantRedirect
    );
    script.setAttribute("data-display", paymentConfig.display || "en");
    script.setAttribute("data-mode", paymentConfig.mode);
    script.setAttribute(
      "data-metaData",
      JSON.stringify({
        "Customer Name": "Ticket Runner Customer",
        "Customer Email": "customer@ticketrunners.com",
        "Order ID": paymentConfig.orderId,
      })
    );
    script.setAttribute("data-redirectMethod", "get");
    script.setAttribute("data-failureRedirect", "true");
    script.setAttribute(
      "data-allowedMethods",
      paymentConfig.allowedMethods || "card"
    );
    script.setAttribute("data-brandcolor", "rgba(59, 130, 246, 1)");

    script.onload = () => {
      console.log("Kashier checkout script loaded successfully");
    };

    script.onerror = () => {
      console.error("Failed to load Kashier checkout script");
      setPaymentStep("error");
      onPaymentError?.("Failed to load payment interface");
      toast({
        title: "Payment Error",
        description:
          "Failed to load payment interface. Please check your connection and try again.",
        variant: "destructive",
      });
    };

    containerRef.current.appendChild(script);
    scriptRef.current = script;
  }, [paymentConfig, onPaymentError, toast]);

  // Set to processing when config is available (so container renders)
  useEffect(() => {
    if (isOpen && paymentConfig && paymentStep === "loading") {
      setPaymentStep("processing");
    }
  }, [isOpen, paymentConfig, paymentStep]);

  // Load Kashier script AFTER container is rendered (when step is processing and container exists)
  useEffect(() => {
    if (
      isOpen &&
      paymentConfig &&
      paymentStep === "processing" &&
      containerRef.current
    ) {
      // Small delay to ensure container is fully rendered
      const timer = setTimeout(() => {
        if (containerRef.current) {
          loadKashierScript();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, paymentConfig, paymentStep, loadKashierScript]);

  const cleanupMessageListener = () => {
    if (messageListenerRef.current) {
      window.removeEventListener("message", messageListenerRef.current, false);
      messageListenerRef.current = null;
    }
  };

  const handleClose = () => {
    cleanupMessageListener();
    cleanupScript();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">
                  {amount.toFixed(2)} {currency}
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-3">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <Shield className="h-4 w-4" />
              <span>
                Protected by Kashier. Your payment information is encrypted and
                secure.
              </span>
            </div>
          </div>

          {/* Payment Container */}
          {paymentStep === "loading" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Loading payment interface...
              </p>
            </div>
          )}

          {paymentStep === "processing" && paymentConfig && (
            <div className="space-y-4">
              <div
                ref={containerRef}
                id="kashier-payment-container"
                className="min-h-[500px] border border-border rounded-lg overflow-hidden bg-white p-4"
              />
            </div>
          )}

          {paymentStep === "success" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-full p-4 mb-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Payment Successful!
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Your payment has been processed successfully. Your tickets will
                be available shortly.
              </p>
            </div>
          )}

          {paymentStep === "error" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                <X className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Failed</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                We encountered an issue processing your payment. Please try
                again.
              </p>
              {paymentConfig?.hppUrl && (
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    onClick={() => {
                      if (paymentConfig.hppUrl) {
                        window.open(paymentConfig.hppUrl, "_blank");
                      }
                    }}
                    className="w-full"
                  >
                    Open Payment Page in New Tab
                  </Button>
                  <Button
                    onClick={() => {
                      if (paymentConfig.hppUrl) {
                        window.location.href = paymentConfig.hppUrl;
                      }
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Continue Payment in Same Tab
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {paymentStep !== "success" && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4 border-t">
              <Shield className="h-3 w-3" />
              <span>Secured by Kashier</span>
              <span>•</span>
              <span>256-bit SSL encryption</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KashierPaymentModal;
