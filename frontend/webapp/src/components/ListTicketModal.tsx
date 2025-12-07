import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { TicketsService } from "@/lib/api/services/tickets";
import { MarketplaceService } from "@/lib/api/services/marketplace";
import { Ticket as TicketType } from "@/lib/api/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate, formatTime } from "@/lib/utils";
import { useAuth } from "@/Contexts/AuthContext";

interface ListTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ListTicketModal({
  open,
  onClose,
  onSuccess,
}: ListTicketModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user's tickets
  useEffect(() => {
    if (open) {
      loadTickets();
    } else {
      // Reset state when modal closes
      setSelectedTicketId("");
      setTermsAccepted(false);
      setError(null);
    }
  }, [open]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const userTickets = await TicketsService.getUserTickets();
      // Filter only valid tickets that are transferable
      const listableTickets = userTickets.filter(
        (ticket) =>
          ticket.status === "valid" && ticket.ticket_transfer_enabled
      );
      setTickets(listableTickets);
      
      if (listableTickets.length === 0) {
        setError(t("marketplace.noListableTickets", "You don't have any tickets that can be listed on the marketplace. Only valid, transferable tickets can be listed."));
      }
    } catch (err: any) {
      setError(err?.message || t("marketplace.loadTicketsError", "Failed to load your tickets"));
      toast({
        title: t("marketplace.error", "Error"),
        description: err?.message || t("marketplace.loadTicketsError", "Failed to load your tickets"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTicketId) {
      toast({
        title: t("marketplace.error", "Error"),
        description: t("marketplace.selectTicket", "Please select a ticket to list"),
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: t("marketplace.error", "Error"),
        description: t("marketplace.acceptTerms", "You must accept the terms and conditions"),
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await MarketplaceService.listTicket(selectedTicketId, termsAccepted);
      toast({
        title: t("marketplace.success", "Success"),
        description: t("marketplace.ticketListed", "Your ticket has been listed on the marketplace"),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      // Handle specific error codes for past events or closed gates
      const errorCode = err?.response?.data?.error?.code;
      const errorMessage = err?.response?.data?.error?.message || err?.message || t("marketplace.listError", "Failed to list ticket");
      
      if (errorCode === 'EVENT_PAST_DATE' || errorCode === 'GATES_CLOSED' || errorCode === 'EVENT_STARTED') {
        toast({
          title: t("marketplace.cannotListTicket", "Cannot List Ticket"),
          description: errorMessage || t("marketplace.eventPastOrGatesClosed", "This ticket is for an event that has already passed or the gates have closed. You cannot list tickets for past events."),
          variant: "destructive",
        });
        setError(errorMessage);
      } else {
        // Handle other errors
        setError(errorMessage);
        toast({
          title: t("marketplace.error", "Error"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("marketplace.listTicket", "List Your Ticket")}</DialogTitle>
          <DialogDescription>
            {t("marketplace.listTicketDescription", "Select a ticket to list on the marketplace. Buyers will be able to contact you directly.")}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">
              {t("common.loading", "Loading...")}
            </span>
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && tickets.length > 0 && (
          <div className="space-y-6">
            {/* Ticket Selection */}
            <div className="space-y-2">
              <Label htmlFor="ticket-select">
                {t("marketplace.selectTicket", "Select Ticket")}
              </Label>
              <Select
                value={selectedTicketId}
                onValueChange={setSelectedTicketId}
              >
                <SelectTrigger id="ticket-select">
                  <SelectValue placeholder={t("marketplace.selectTicketPlaceholder", "Choose a ticket...")} />
                </SelectTrigger>
                <SelectContent>
                  {tickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      <div className="flex flex-col py-1">
                        <span className="font-semibold text-base">{ticket.eventTitle}</span>
                        <span className="text-sm text-muted-foreground mt-1">
                          <strong>Ticket:</strong> {ticket.ticketNumber} • <strong>Category:</strong> {ticket.category} • <strong>Price:</strong> {(parseFloat(String(ticket.price || 0))).toFixed(2)} EGP
                        </span>
                        <span className="text-sm text-muted-foreground">
                          <strong>Event Date:</strong> {formatDate(ticket.event_date || "", "en")} {ticket.event_time && ` • ${formatTime(ticket.event_time, "en")}`}
                        </span>
                        {ticket.event_location && (
                          <span className="text-sm text-muted-foreground">
                            <strong>Location:</strong> {ticket.event_location}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Ticket Details */}
            {selectedTicket && (
              <div className="p-4 bg-card rounded-lg border border-border">
                <div className="flex items-start gap-3">
                  <Ticket className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h4 className="font-bold text-lg mb-3">{selectedTicket.eventTitle}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <strong>{t("marketplace.ticketNumber")}:</strong> {selectedTicket.ticketNumber}
                      </div>
                      <div>
                        <strong>{t("marketplace.category")}:</strong> {selectedTicket.category}
                      </div>
                      <div>
                        <strong>{t("marketplace.price")}:</strong> {typeof selectedTicket.price === 'number' ? selectedTicket.price.toFixed(2) : parseFloat(String(selectedTicket.price || 0)).toFixed(2)} EGP
                      </div>
                      <div>
                        <strong>{t("marketplace.status")}:</strong> {selectedTicket.status}
                      </div>
                      {selectedTicket.event_date && (
                        <div className="col-span-2">
                          <strong>{t("eventCard.date")}:</strong> {formatDate(selectedTicket.event_date, "en")}
                          {selectedTicket.event_time && ` • ${formatTime(selectedTicket.event_time, "en")}`}
                        </div>
                      )}
                      {selectedTicket.event_location && (
                        <div className="col-span-2">
                          <strong>{t("eventCard.location")}:</strong> {selectedTicket.event_location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <Label
                  htmlFor="terms"
                  className="text-sm leading-relaxed cursor-pointer"
                >
                  {t("marketplace.termsAcceptance", "I understand that by listing this ticket, I agree to the marketplace terms and conditions. Buyers will contact me directly, and I am responsible for completing the transaction.")}
                </Label>
              </div>
            </div>

            {/* Important Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("marketplace.importantNotice", "Important: Once listed, buyers will be able to see your contact information. Make sure you're ready to respond to inquiries and complete the transaction.")}
              </AlertDescription>
            </Alert>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedTicketId || !termsAccepted || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("common.submitting", "Submitting...")}
                  </>
                ) : (
                  t("marketplace.listTicket", "List Ticket")
                )}
              </Button>
            </div>
          </div>
        )}

        {!loading && tickets.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {t("marketplace.noListableTickets", "You don't have any tickets that can be listed on the marketplace. Only valid, transferable tickets can be listed.")}
            </p>
            <Button onClick={onClose} className="mt-4">
              {t("common.close", "Close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

