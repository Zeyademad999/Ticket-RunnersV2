import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, CheckCircle } from "lucide-react";

interface TransferState {
  ticketIds: string[];
  bookingId: string;
}

export default function TransferTicketsPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const { ticketIds = [], bookingId = "" } = (state as TransferState) || {};
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [agree, setAgree] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTransferFee, setTotalTransferFee] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      if (!ticketIds.length) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch details for all tickets
        const ticketPromises = ticketIds.map((ticketId) =>
          TicketsService.getTicketDetail(ticketId)
        );
        const responses = await Promise.all(ticketPromises);
        const fetchedTickets = responses.map((r) => r.ticket);
        setTickets(fetchedTickets);
      } catch (error: any) {
        console.error("Error fetching tickets:", error);
        toast({
          title: t("transferTickets.error.title", "Error"),
          description:
            error?.message ||
            t("transferTickets.error.description", "Failed to load ticket details"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [ticketIds, toast, t]);

  if (!ticketIds.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        {t("transferTickets.missingData", "No tickets selected for transfer")}
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!recipientPhone || !agree) {
      toast({
        title: t("transferTickets.toast.incompleteTitle", "Incomplete Information"),
        description: t(
          "transferTickets.toast.incompleteDescription",
          "Please provide recipient phone number and agree to the terms"
        ),
        variant: "destructive",
      });
      return;
    }

    try {
      setTransferring(true);
      let totalFee = 0;
      const transferResults = [];

      // Transfer each ticket individually
      for (let i = 0; i < ticketIds.length; i++) {
        const ticketId = ticketIds[i];
        try {
          const response = await TicketsService.transferTicket(ticketId, {
            recipient_mobile: recipientPhone,
            recipient_name: recipientName || undefined,
          });

          transferResults.push({ ticketId, success: true, response });
          if (response.transfer_fee) {
            totalFee += response.transfer_fee;
          }
        } catch (error: any) {
          console.error(`Error transferring ticket ${ticketId}:`, error);
          transferResults.push({ ticketId, success: false, error });
        }
      }

      const successCount = transferResults.filter((r) => r.success).length;
      const failCount = transferResults.filter((r) => !r.success).length;

      setSuccessCount(successCount);
      setFailCount(failCount);

      if (successCount > 0) {
        // Show success modal
        setShowSuccessModal(true);
      }

      if (failCount > 0) {
        toast({
          title: t("transferTickets.toast.partialTitle", "Partial Transfer"),
          description: t(
            "transferTickets.toast.partialDescription",
            `${failCount} ticket(s) failed to transfer`
          ),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast({
        title: t("transferTickets.toast.errorTitle", "Error"),
        description:
          error?.message ||
          t("transferTickets.toast.errorDescription", "Failed to transfer tickets"),
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark text-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalTicketPrice = tickets.reduce((sum, ticket) => {
    const price = typeof ticket.price === 'number' ? ticket.price : parseFloat(String(ticket.price || 0));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto max-w-md py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("transferTickets.title", {
                count: ticketIds.length,
                plural: ticketIds.length > 1 ? "s" : "",
              })}
              {ticketIds.length > 1 ? ` (${ticketIds.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTickets.recipientPhone", "Recipient Phone Number")} *
              </label>
              <Input
                type="tel"
                placeholder={t("transferTickets.phonePlaceholder", "e.g., 01123456789")}
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                {t("transferTickets.recipientName", "Recipient Name")} (Optional)
              </label>
              <Input
                placeholder={t("transferTickets.namePlaceholder", "Recipient's name")}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
              <span className="text-sm text-muted-foreground">
                {t("transferTickets.checkboxLabel", "I agree to the transfer terms and conditions")}
              </span>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                {t("transferTickets.totalTickets", "Total Tickets")}: {ticketIds.length}
              </div>
              <div className="text-sm text-muted-foreground mb-1">
                {t("transferTickets.totalPrice", "Total Ticket Price")}:
              </div>
              <div className="text-lg font-semibold text-foreground">
                {totalTicketPrice.toFixed(2)} EGP
              </div>
              <div className="text-sm text-muted-foreground mt-2 mb-1">
                {t("transferTickets.transferFee", "Transfer Fee")} ({t("transferTickets.perTicket", "per ticket")}):
              </div>
              <div className="text-sm text-muted-foreground">
                {t("transferTickets.feeNote", "Fee will be calculated per ticket")}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!recipientPhone || !agree || transferring}
              onClick={handleConfirm}
            >
              {transferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("transferTickets.transferring", "Transferring...")}
                </>
              ) : (
                t("transferTickets.confirmButton", "Confirm Transfer")
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {t("transferTickets.success.title", "Transfer Successful!")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t(
                "transferTickets.success.description",
                `Successfully transferred ${successCount} ticket(s)${failCount > 0 ? `. ${failCount} ticket(s) failed to transfer.` : " to the recipient."}`
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
              {t("transferTickets.success.viewBookings", "View My Bookings")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
