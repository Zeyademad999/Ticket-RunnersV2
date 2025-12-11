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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Ticket, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { OtpMessagePopup } from "@/components/OtpMessagePopup";
import { TicketsService } from "@/lib/api/services/tickets";
import { MarketplaceService } from "@/lib/api/services/marketplace";
import { EventsService } from "@/lib/api/services/events";
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
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [popupType, setPopupType] = useState<"error" | "success">("error");
  const [popupTitle, setPopupTitle] = useState("");
  
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
  const [sellerPrice, setSellerPrice] = useState<string>("");
  const [maxAllowedPrice, setMaxAllowedPrice] = useState<number | null>(null);
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);

  // Load user's tickets
  useEffect(() => {
    if (open) {
      loadTickets();
    } else {
      // Reset state when modal closes
      setSelectedTicketId("");
      setTermsAccepted(false);
      setError(null);
      setSellerPrice("");
      setMaxAllowedPrice(null);
      setShowPopup(false);
      setPopupMessage("");
      setPopupTitle("");
    }
  }, [open]);

  // Fetch event details when ticket is selected to get max price
  useEffect(() => {
    const fetchEventMaxPrice = async () => {
      if (!selectedTicketId) {
        setMaxAllowedPrice(null);
        return;
      }

      const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
      if (!selectedTicket || !selectedTicket.event_id) {
        setMaxAllowedPrice(null);
        return;
      }

      setLoadingEventDetails(true);
      try {
        const eventDetails = await EventsService.getEventDetails(selectedTicket.event_id);
        console.log("Event details:", eventDetails);
        console.log("marketplace_max_price from event:", eventDetails.marketplace_max_price);
        
        // ALWAYS check event-specific max price first
        // If event has marketplace_max_price set (even if null, we check the API response)
        // The API returns null if not set, or a number if set
        if (eventDetails.marketplace_max_price !== null && eventDetails.marketplace_max_price !== undefined) {
          // Event has a specific price set (could be 0, but that's still a valid setting)
          console.log("Using event-specific cap price:", eventDetails.marketplace_max_price);
          setMaxAllowedPrice(eventDetails.marketplace_max_price);
        } else {
          // Event doesn't have a specific price set, use global settings as fallback
          console.log("Event doesn't have specific cap price, fetching global settings...");
          try {
            const settings = await MarketplaceService.getMarketplaceSettings();
            console.log("Marketplace settings:", settings);
            if (settings.success && settings.data && settings.data.max_allowed_price) {
              console.log("Using global cap price:", settings.data.max_allowed_price);
              setMaxAllowedPrice(settings.data.max_allowed_price);
            } else {
              // Use default if nothing is set
              console.log("Using default cap price: 10000");
              setMaxAllowedPrice(10000); // Default fallback
            }
          } catch (err) {
            // If we can't fetch global settings, use a default
            console.warn("Could not fetch global marketplace settings:", err);
            setMaxAllowedPrice(10000); // Default fallback
          }
        }
      } catch (err) {
        console.error("Error fetching event details:", err);
        // Even on error, try to fetch global settings
        try {
          const settings = await MarketplaceService.getMarketplaceSettings();
          if (settings.success && settings.data && settings.data.max_allowed_price) {
            setMaxAllowedPrice(settings.data.max_allowed_price);
          } else {
            setMaxAllowedPrice(10000); // Default fallback
          }
        } catch (settingsErr) {
          console.warn("Could not fetch global marketplace settings:", settingsErr);
          setMaxAllowedPrice(10000); // Default fallback
        }
      } finally {
        setLoadingEventDetails(false);
      }
    };

    fetchEventMaxPrice();
  }, [selectedTicketId, tickets]);

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
      const errorMessage = err?.message || t("marketplace.loadTicketsError", "Failed to load your tickets");
      setError(errorMessage);
      setPopupTitle(t("marketplace.error", "Error"));
      setPopupMessage(errorMessage);
      setPopupType("error");
      setShowPopup(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTicketId) {
      setPopupTitle(t("marketplace.error", "Error"));
      setPopupMessage(t("marketplace.selectTicket", "Please select a ticket to list"));
      setPopupType("error");
      setShowPopup(true);
      return;
    }

    if (!termsAccepted) {
      setPopupTitle(t("marketplace.error", "Error"));
      setPopupMessage(t("marketplace.acceptTerms", "You must accept the terms and conditions"));
      setPopupType("error");
      setShowPopup(true);
      return;
    }

    // Validate seller price - REQUIRED
    if (!sellerPrice || !sellerPrice.trim()) {
      setPopupTitle(t("marketplace.error", "Error"));
      setPopupMessage(t("marketplace.priceRequired", "Please enter your asking price. This will be the price displayed to buyers."));
      setPopupType("error");
      setShowPopup(true);
      return;
    }

    const priceValue = parseFloat(sellerPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      setPopupTitle(t("marketplace.error", "Error"));
      setPopupMessage(t("marketplace.invalidPrice", "Please enter a valid price"));
      setPopupType("error");
      setShowPopup(true);
      return;
    }

    if (maxAllowedPrice !== null && priceValue > maxAllowedPrice) {
      setPopupTitle(t("marketplace.error", "Error"));
      setPopupMessage(t("marketplace.priceExceedsMax", { max: maxAllowedPrice.toFixed(2) }));
      setPopupType("error");
      setShowPopup(true);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await MarketplaceService.listTicket(selectedTicketId, termsAccepted, priceValue);
      setPopupTitle(t("marketplace.success", "Success"));
      setPopupMessage(t("marketplace.ticketListed", "Your ticket has been listed on the marketplace"));
      setPopupType("success");
      setShowPopup(true);
    } catch (err: any) {
      // Handle specific error codes for past events or closed gates
      const errorCode = err?.response?.data?.error?.code;
      const errorMessage = err?.response?.data?.error?.message || err?.message || t("marketplace.listError", "Failed to list ticket");
      
      if (errorCode === 'EVENT_PAST_DATE' || errorCode === 'GATES_CLOSED' || errorCode === 'EVENT_STARTED') {
        setPopupTitle(t("marketplace.cannotListTicket", "Cannot List Ticket"));
        setPopupMessage(errorMessage || t("marketplace.eventPastOrGatesClosed", "This ticket is for an event that has already passed or the gates have closed. You cannot list tickets for past events."));
        setPopupType("error");
        setShowPopup(true);
        setError(errorMessage);
      } else {
        // Handle other errors
        setError(errorMessage);
        setPopupTitle(t("marketplace.error", "Error"));
        setPopupMessage(errorMessage);
        setPopupType("error");
        setShowPopup(true);
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

            {/* Seller Price Input - REQUIRED */}
            {selectedTicket && (
              <div className="space-y-2">
                <Label htmlFor="seller-price" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t("marketplace.sellerPrice", "Your Asking Price (EGP)")}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="seller-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sellerPrice}
                  onChange={(e) => setSellerPrice(e.target.value)}
                  placeholder={t("marketplace.enterPrice", "Enter your asking price...")}
                  disabled={loadingEventDetails}
                  required
                  className={sellerPrice && maxAllowedPrice !== null && parseFloat(sellerPrice) > maxAllowedPrice ? "border-red-500" : ""}
                />
                {loadingEventDetails ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-xs text-blue-700">
                      {t("common.loading", "Loading price limit...")}
                    </p>
                  </div>
                ) : maxAllowedPrice !== null ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900">
                      <strong className="font-semibold">{t("marketplace.capPriceNote", "Note:")}</strong> {t("marketplace.capPriceInfo", "The cap price for this event is")} <strong className="text-primary font-bold text-base">{maxAllowedPrice.toFixed(2)} EGP</strong>
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800">
                      {t("marketplace.priceRequired", "Please enter your asking price. This will be the price displayed to buyers.")}
                    </p>
                  </div>
                )}
                {sellerPrice && maxAllowedPrice !== null && parseFloat(sellerPrice) > maxAllowedPrice && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("marketplace.priceExceedsMax", { max: maxAllowedPrice.toFixed(2) })}
                    </AlertDescription>
                  </Alert>
                )}
                {!sellerPrice && maxAllowedPrice !== null && (
                  <p className="text-xs text-muted-foreground">
                    {t("marketplace.priceRequired", "Please enter your asking price. This will be the price displayed to buyers.")}
                  </p>
                )}
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
                disabled={!selectedTicketId || !termsAccepted || !sellerPrice || submitting}
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
      
      {/* Error/Success Popup */}
      <OtpMessagePopup
        isOpen={showPopup}
        onClose={() => {
          setShowPopup(false);
          // If success, close modal and refresh on popup close
          if (popupType === "success") {
            onSuccess();
            onClose();
          }
        }}
        type={popupType}
        title={popupTitle}
        message={popupMessage}
      />
    </Dialog>
  );
}

