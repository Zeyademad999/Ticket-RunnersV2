import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Ticket,
  Send,
  ArrowRight,
  Users,
  User,
  Phone,
  CheckCircle,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { TicketsService } from "@/lib/api/services/tickets";
import { Ticket as TicketType } from "@/lib/api/types";
import { format } from "date-fns";
import { useAuth } from "@/Contexts/AuthContext";

export default function TicketDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [relatedTickets, setRelatedTickets] = useState<TicketType[]>([]);
  const [selectedTicketIndexes, setSelectedTicketIndexes] = useState<string[]>(
    []
  );
  const [showTransferDisabledModal, setShowTransferDisabledModal] = useState(false);

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch the ticket detail (now returns ticket and related_tickets)
        const response = await TicketsService.getTicketDetail(id);
        setTicket(response.ticket);
        
        // Use related_tickets from the API response (all tickets from same booking)
        // These include tickets assigned to others
        setRelatedTickets(response.related_tickets || []);
      } catch (error: any) {
        console.error("Error fetching ticket details:", error);
        toast({
          title: t("ticketDetails.error.title", "Error"),
          description:
            error?.message ||
            t("ticketDetails.error.description", "Failed to load ticket details"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [id, toast, t]);

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
        {t("ticketDetails.notFound")}
      </div>
    );
  }

  const allTickets = [ticket, ...relatedTickets.filter(t => t.id !== ticket.id)];
  const totalAmount = allTickets.reduce((sum, t) => {
    const price = typeof t.price === 'number' ? t.price : parseFloat(String(t.price || 0));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  const handleSelect = (ticketId: string) => {
    const ticket = allTickets.find((t) => t.id === ticketId);
    // Only allow selection of valid tickets that can be transferred (not used, refunded, banned, or transfer disabled)
    if (ticket && ticket.status === "valid" && ticket.ticket_transfer_enabled !== false) {
      setSelectedTicketIndexes((prev) =>
        prev.includes(ticketId)
          ? prev.filter((id) => id !== ticketId)
          : [...prev, ticketId]
      );
    } else if (ticket && ticket.ticket_transfer_enabled === false) {
      // Show modal if user tries to select a ticket that can't be transferred
      setShowTransferDisabledModal(true);
    }
  };

  const handleNavigateToTransfer = () => {
    // Check if transfer is enabled for any selected ticket
    const transferDisabled = selectedTicketIndexes.some((ticketId) => {
      const ticketItem = allTickets.find((t) => t.id === ticketId);
      return ticketItem && ticketItem.ticket_transfer_enabled === false;
    });

    if (transferDisabled) {
      setShowTransferDisabledModal(true);
      return;
    }

    navigate("/transfer-tickets", {
      state: { ticketIds: selectedTicketIndexes, bookingId: ticket.id },
    });
  };

  const handleTransfer = (ticketId: string) => {
    const ticketItem = allTickets.find((t) => t.id === ticketId);
    
    // Check if transfer is enabled for this event
    if (ticketItem && ticketItem.ticket_transfer_enabled === false) {
      setShowTransferDisabledModal(true);
      return;
    }

    navigate(`/transfer-ticket/${ticketId}`);
  };

  const getStatusBadge = (status: TicketType["status"]) => {
    if (status === "used") {
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("ticketDetails.status.used", "Used")}
        </Badge>
      );
    } else if (status === "valid") {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Clock className="h-3 w-3 mr-1" />
          {t("ticketDetails.status.valid", "Valid")}
        </Badge>
      );
    } else if (status === "refunded") {
      return (
        <Badge variant="destructive">
          {t("ticketDetails.status.refunded", "Refunded")}
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          {t("ticketDetails.status.banned", "Banned")}
        </Badge>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {t("ticketDetails.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("ticketDetails.reference", { id: ticket.id })}
            </p>
          </div>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" /> {ticket.eventTitle}
              </CardTitle>
              <CardDescription>
                {t("ticketDetails.eventInfo.title")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t("ticketDetails.eventInfo.category")}:{" "}
                  </span>
                  <span className="font-medium">{ticket.category}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("ticketDetails.eventInfo.purchaseDate")}:{" "}
                  </span>
                  <span className="font-medium">
                    {ticket.purchaseDate
                      ? format(new Date(ticket.purchaseDate), "MMM dd, yyyy")
                      : "-"}
                  </span>
                </div>
                {ticket.ticket_transfer_enabled === false && (
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
                      {t("ticketDetails.eventInfo.transferNotAllowed", "Ticket transfers are not permitted for this event")}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("ticketDetails.tickets.title")} ({allTickets.length})
              </CardTitle>
              <CardDescription>
                {t("ticketDetails.tickets.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allTickets.map((ticketItem, index) => (
                <div
                  key={ticketItem.id}
                  className="border border-border rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Allow selection for own tickets or tickets assigned to me */}
                      {ticketItem.status === "valid" && 
                       (!ticketItem.is_assigned_to_other || ticketItem.is_assigned_to_me) && 
                       ticketItem.ticket_transfer_enabled !== false && (
                        <input
                          type="checkbox"
                          checked={selectedTicketIndexes.includes(ticketItem.id)}
                          onChange={() => handleSelect(ticketItem.id)}
                          className="form-checkbox h-4 w-4 text-primary"
                        />
                      )}
                      <Badge variant="outline">
                        {t("ticketDetails.tickets.ticketNumber", {
                          index: index + 1,
                        })}
                      </Badge>
                      {getStatusBadge(ticketItem.status)}
                      {ticketItem.ticketNumber && (
                        <span className="text-xs text-muted-foreground">
                          #{ticketItem.ticketNumber}
                        </span>
                      )}
                    </div>

                    {/* Show transfer button for own tickets or tickets assigned to me */}
                    {ticketItem.status === "valid" && (!ticketItem.is_assigned_to_other || ticketItem.is_assigned_to_me) && (
                      <>
                        {ticketItem.ticket_transfer_enabled === false && (
                          <Badge variant="outline" className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700">
                            {t("ticketDetails.tickets.transferNotAllowed", "Transfer Not Allowed")}
                          </Badge>
                        )}
                        {ticketItem.ticket_transfer_enabled !== false && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransfer(ticketItem.id)}
                            className="group"
                          >
                            {t("ticketDetails.tickets.transfer")}
                            <Send className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Ticket Information */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {/* Check if this is the buyer's own ticket (not assigned to someone else) */}
                    {!ticketItem.is_assigned_to_other && ticketItem.buyer_name && ticketItem.buyer_name === ticketItem.customerName && (
                      <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                        <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                          {t("ticketDetails.tickets.myTicket", "My Ticket")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t("ticketDetails.tickets.thisIsMyTicket", "This is your ticket")}
                        </span>
                      </div>
                    )}
                    
                    {/* Show assigned person name if ticket was assigned to someone else (read-only for buyer) */}
                    {ticketItem.is_assigned_to_other && ticketItem.assigned_name && !ticketItem.is_assigned_to_me && (
                      <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">
                            {t("ticketDetails.tickets.assignedTo", "Assigned to")}:
                          </span>
                          <span className="font-medium text-amber-700 dark:text-amber-300 ml-1">
                            {ticketItem.assigned_name}
                          </span>
                          {ticketItem.assigned_mobile && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ticketItem.assigned_mobile})
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                          {t("ticketDetails.tickets.readOnly", "Read Only")}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Show assigned info if ticket was assigned to me (fully functional) */}
                    {ticketItem.is_assigned_to_me && ticketItem.assigned_name && (
                      <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">
                            {t("ticketDetails.tickets.assignedTo", "Assigned to")}:
                          </span>
                          <span className="font-medium text-blue-700 dark:text-blue-300 ml-1">
                            {ticketItem.assigned_name}
                          </span>
                          {ticketItem.assigned_mobile && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ticketItem.assigned_mobile})
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                          {t("ticketDetails.tickets.myTicket", "My Ticket")}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Show transfer info if ticket was transferred to current user */}
                    {ticketItem.is_transferred && ticketItem.transferred_from_name && (
                      <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
                        <Send className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">
                            {t("ticketDetails.tickets.transferredFrom", "Transferred from")}:
                          </span>
                          <span className="font-medium text-purple-700 dark:text-purple-300 ml-1">
                            {ticketItem.transferred_from_name}
                          </span>
                          {ticketItem.transferred_from_mobile && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ticketItem.transferred_from_mobile})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Show buyer info if ticket was assigned to current user (buyer is different from current user) */}
                    {ticketItem.is_assigned_to_me && ticketItem.buyer_name && ticketItem.buyer_name !== ticketItem.customerName && !ticketItem.is_transferred && (
                      <div className="flex items-center gap-2 text-sm mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                          <span className="text-xs text-muted-foreground">
                            {t("ticketDetails.tickets.purchasedBy", "Purchased by")}:
                          </span>
                          <span className="font-medium text-blue-700 dark:text-blue-300 ml-1">
                            {ticketItem.buyer_name}
                          </span>
                          {ticketItem.buyer_mobile && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({ticketItem.buyer_mobile})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Show ticket owner name if not already shown above */}
                    {!ticketItem.is_assigned_to_other && !ticketItem.is_assigned_to_me && !ticketItem.is_transferred && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {ticketItem.customerName || ticket.customerName}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("ticketDetails.tickets.category")}:
                      </span>
                      <span className="font-medium">{ticketItem.category || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("ticketDetails.tickets.price")}:
                      </span>
                      <span className="font-medium">{ticketItem.price || 0} EGP</span>
                    </div>
                    {ticketItem.checkInTime && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">
                          {t("ticketDetails.tickets.checkedIn")}:{" "}
                          {format(new Date(ticketItem.checkInTime), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {selectedTicketIndexes.length > 0 && (
                <div className="text-right pt-4">
                  <Button onClick={handleNavigateToTransfer}>
                    {t("ticketDetails.tickets.transferSelected")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transfer Disabled Modal */}
          <Dialog open={showTransferDisabledModal} onOpenChange={setShowTransferDisabledModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  {t("ticketDetails.transferDisabled.title", "Transfer Not Permitted")}
                </DialogTitle>
                <DialogDescription>
                  {t("ticketDetails.transferDisabled.message", "Transferring tickets in this event is not permitted.")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end mt-4">
                <Button onClick={() => setShowTransferDisabledModal(false)}>
                  {t("common.close", "Close")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t("ticketDetails.summary.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("ticketDetails.summary.subtotal")}</span>
                <span>{Number(totalAmount).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span>{t("ticketDetails.summary.vat")}</span>
                <span>{(Number(totalAmount) * 0.14).toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground">
                <span>{t("ticketDetails.summary.total")}</span>
                <span>{(Number(totalAmount) * 1.14).toFixed(2)} EGP</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

