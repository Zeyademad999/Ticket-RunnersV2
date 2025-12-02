import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { TicketsService } from "@/lib/api/services/tickets";
import { PaymentsService, KashierPaymentConfig } from "@/lib/api/services/payments";
import KashierPaymentModal from "@/components/KashierPaymentModal";
import { Loader2, CheckCircle } from "lucide-react";

export default function TransferTicketPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [transferFee, setTransferFee] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<KashierPaymentConfig | null>(null);
  const currency = "EGP";

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await TicketsService.getTicketDetail(ticketId);
        setTicket(response.ticket);
        
        // Calculate transfer fee if event has transfer fee settings
        // For now, we'll fetch it from the backend response or calculate it
        // The backend will calculate and return it in the transfer response
      } catch (error: any) {
        console.error("Error fetching ticket:", error);
        toast({
          title: t("transferTicket.error.title", "Error"),
          description:
            error?.message ||
            t("transferTicket.error.description", "Failed to load ticket details"),
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, toast, t, navigate]);

  const calculateTransferFee = () => {
    if (!ticket) return 0;
    
    // Calculate transfer fee based on event settings (same logic as backend)
    // Use transfer fee fields directly from ticket (added to serializer)
    const transferFeeValue = ticket.transfer_fee_value;
    const transferFeeType = ticket.transfer_fee_type || 'flat';
    
    if (!transferFeeValue || transferFeeValue === 0) {
      return 0;
    }
    
    if (transferFeeType === 'percentage') {
      // Percentage of ticket price
      const ticketPrice = typeof ticket.price === 'number' ? ticket.price : parseFloat(String(ticket.price || 0));
      return (ticketPrice * transferFeeValue) / 100;
    } else {
      // Flat amount
      return typeof transferFeeValue === 'number' ? transferFeeValue : parseFloat(String(transferFeeValue || 0));
    }
  };

  const handleConfirm = async () => {
    if (!recipientPhone || !agreed) {
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description: t(
          "transferTicket.toast.errorDescription",
          "Please provide recipient phone number and agree to the terms"
        ),
        variant: "destructive",
      });
      return;
    }

    if (!ticketId) {
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description: t("transferTicket.toast.errorDescription", "Invalid ticket"),
        variant: "destructive",
      });
      return;
    }

    // Calculate transfer fee
    const fee = calculateTransferFee();
    
    if (fee <= 0) {
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description: t("transferTicket.toast.errorDescription", "Transfer fee must be greater than 0"),
        variant: "destructive",
      });
      return;
    }

    try {
      setTransferring(true);
      
      // Initialize Kashier payment (same as booking flow)
      // ticket_id is a UUID string, not an integer
      const paymentInitResponse = await PaymentsService.initializePayment({
        payment_type: 'transfer',
        ticket_id: ticketId, // Keep as UUID string
        amount: fee,
        currency: currency,
        transfer_data: {
          recipient_mobile: recipientPhone,
          recipient_name: recipientName || undefined,
        },
      });

      if (!paymentInitResponse.success || !paymentInitResponse.data) {
        throw new Error(paymentInitResponse.error || "Failed to initialize payment");
      }

      // Validate payment config has required fields
      if (!paymentInitResponse.data.orderId || !paymentInitResponse.data.hash) {
        throw new Error("Invalid payment configuration received from server");
      }

      // Set payment config and show modal (same as booking flow)
      console.log("Payment config received:", paymentInitResponse.data);
      console.log("HPP URL:", paymentInitResponse.data?.hppUrl);
      console.log("Setting payment config and opening payment modal...");
      
      // Set payment config first
      setPaymentConfig(paymentInitResponse.data);
      
      // Ensure payment modal opens - use setTimeout to ensure state updates are processed
      setTimeout(() => {
        if (paymentInitResponse.data) {
          setShowPaymentModal(true);
          console.log("Payment modal opened with config:", paymentInitResponse.data);
        } else {
          console.error("Payment config is null, cannot open payment modal");
          throw new Error("Payment configuration is missing");
        }
      }, 100);
      
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      // Extract error message from response
      let errorMessage = t("transferTicket.toast.errorDescription", "Failed to initialize payment");
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t("transferTicket.toast.errorTitle", "Error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const handlePaymentSuccess = (orderId: string) => {
    // Payment successful - transfer will be processed by the callback/webhook
    // Navigate to success page (same as booking flow)
    toast({
      title: t("transferTicket.success.title", "Transfer Successful!"),
      description: t("transferTicket.success.description", "Your payment has been processed successfully."),
    });

    navigate("/payment-confirmation", {
      state: {
        ticketTitle: ticket?.eventTitle || "Ticket Transfer",
        totalAmount: calculateTransferFee(),
        transactionId: orderId,
        type: 'transfer',
      },
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: t("transferTicket.toast.errorTitle", "Error"),
      description: error || t("transferTicket.toast.errorDescription", "Payment failed"),
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        {t("transferTicket.notFound", "Ticket not found")}
      </div>
    );
  }

  const fee = transferFee ?? calculateTransferFee();

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto py-12 px-4 max-w-xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("transferTicket.title", "Transfer Ticket")} - {ticket.eventTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTicket.phoneLabel", "Recipient Phone Number")} *
              </label>
              <Input
                type="tel"
                placeholder={t("transferTicket.phonePlaceholder", "e.g., 01123456789")}
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTicket.nameLabel", "Recipient Name")} (Optional)
              </label>
              <Input
                placeholder={t("transferTicket.namePlaceholder", "Recipient's name")}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="policy"
                checked={agreed}
                onCheckedChange={(val) => setAgreed(!!val)}
              />
              <label htmlFor="policy" className="text-sm text-muted-foreground">
                {t("transferTicket.policyLabel", "I agree to the transfer terms and conditions")}
              </label>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                {t("transferTicket.ticketPrice", "Ticket Price")}:
              </div>
              <div className="text-lg font-semibold text-foreground">
                {typeof ticket.price === 'number' ? ticket.price.toFixed(2) : parseFloat(String(ticket.price || 0)).toFixed(2)} EGP
              </div>
              <div className="text-sm text-muted-foreground mt-2 mb-1">
                {t("transferTicket.transferFee", "Transfer Fee")}:
              </div>
              <div className="text-lg font-semibold text-foreground">
                {fee.toFixed(2)} EGP
              </div>
              <div className="border-t border-border mt-3 pt-3">
                <div className="text-sm text-muted-foreground mb-1">
                  {t("transferTicket.total", "Total")}:
                </div>
                <div className="text-xl font-bold text-foreground">
                  {fee.toFixed(2)} EGP
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={!recipientPhone || !agreed || transferring}
            >
              {transferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("transferTicket.transferring", "Transferring...")}
                </>
              ) : (
                t("transferTicket.confirmButton", "Confirm Transfer")
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Success Modal - Only shown if payment is bypassed (shouldn't happen with payment flow) */}
      {/* This modal is kept for edge cases but should not be triggered in normal flow */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {t("transferTicket.success.title", "Transfer Successful!")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t(
                "transferTicket.success.description",
                "Your ticket has been successfully transferred to the recipient."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/profile#bookings");
              }}
              className="w-full sm:w-auto"
            >
              {t("transferTicket.success.viewBookings", "View My Bookings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal - Same as booking flow */}
      {paymentConfig && (
        <KashierPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentConfig(null);
          }}
          paymentConfig={paymentConfig}
          amount={calculateTransferFee()}
          currency={currency}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}
    </div>
  );
}
