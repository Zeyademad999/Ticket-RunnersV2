import React, { useState, useEffect } from "react";
import { TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Ticket,
  CheckCircle,
  User,
} from "lucide-react";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { TicketsService } from "@/lib/api/services/tickets";
import { Ticket as TicketType } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export const ProfileBookingsTab: React.FC<any> = (props: any) => {
  const { t, handleViewDetails, refetch } = props;
  const { bookings, loading, error, fetchBookings, hasMore, pagination } = useCustomerBookings(1, 10);
  const [individualTickets, setIndividualTickets] = useState<TicketType[]>([]);
  const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const handleLoadMore = async () => {
    const nextPage = pagination.page + 1;
    await fetchBookings(nextPage, pagination.limit);
  };

  // Fetch individual tickets (assigned tickets)
  useEffect(() => {
    const fetchIndividualTickets = async () => {
      try {
        const tickets = await TicketsService.getUserTickets();
        // Filter to only show assigned tickets (tickets that need claiming or are assigned)
        const assignedTickets = tickets.filter(
          (ticket) => ticket.needs_claiming || (ticket.is_assigned_to_me && ticket.assigned_mobile)
        );
        setIndividualTickets(assignedTickets);
      } catch (error: any) {
        console.error("Error fetching individual tickets:", error);
        // Don't show error toast, just log it
      }
    };

    fetchIndividualTickets();
  }, []);

  const handleClaimTicket = async (ticketId: string) => {
    try {
      setClaimingTicketId(ticketId);
      await TicketsService.claimTicket(ticketId);
      
      toast({
        title: t("ticketDetails.claim.success.title", "Ticket Claimed"),
        description: t("ticketDetails.claim.success.description", "Ticket has been successfully claimed and activated. It will now appear in your bookings."),
        variant: "default",
      });
      
      // Small delay to ensure backend has processed the claim
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh individual tickets (assigned tickets - should no longer include the claimed ticket)
      const tickets = await TicketsService.getUserTickets();
      const assignedTickets = tickets.filter(
        (ticket) => ticket.needs_claiming || (ticket.is_assigned_to_me && ticket.assigned_mobile)
      );
      setIndividualTickets(assignedTickets);
      
      // Refresh bookings (the claimed ticket should now appear here)
      // Reset to page 1 to ensure we see the newly claimed ticket
      await fetchBookings(1, pagination.limit);
      
      // Also refresh profile data to update dependants tab (so it disappears from buyer's dependants)
      if (refetch) {
        await refetch();
      }
    } catch (error: any) {
      console.error("Error claiming ticket:", error);
      toast({
        title: t("ticketDetails.claim.error.title", "Error"),
        description: error?.response?.data?.error?.message || 
          t("ticketDetails.claim.error.description", "Failed to claim ticket. Please try again."),
        variant: "destructive",
      });
    } finally {
      setClaimingTicketId(null);
    }
  };

  return (
    <TabsContent value="bookings" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {t("profilepage.myBookings.title")}
          </CardTitle>
          <CardDescription>
            {t("profilepage.myBookings.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Individual Assigned Tickets Section */}
          {individualTickets.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {t("profilepage.myBookings.assignedTickets", "Assigned Tickets")}
              </h3>
              <div className="space-y-4">
                {individualTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {ticket.eventTitle}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {t("profilepage.myBookings.date")}:{" "}
                            </span>
                            {ticket.event_date ? format(new Date(ticket.event_date), "MMM dd, yyyy") : "-"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {t("profilepage.myBookings.time")}:{" "}
                            </span>
                            {ticket.event_time || "-"}
                          </div>
                        </div>
                        {ticket.buyer_name && (
                          <div className="flex items-center gap-2 text-sm mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-muted-foreground">
                              {t("ticketDetails.tickets.purchasedBy", "Purchased by")}:
                            </span>
                            <span className="font-medium text-blue-700 dark:text-blue-300">
                              {ticket.buyer_name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {ticket.needs_claiming ? (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              {t("profilepage.myBookings.pendingClaim", "Pending Claim")}
                            </Badge>
                            <Button
                              onClick={() => handleClaimTicket(ticket.id)}
                              disabled={claimingTicketId === ticket.id}
                              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white"
                              size="sm"
                            >
                              {claimingTicketId === ticket.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  {t("ticketDetails.claim.claiming", "Claiming...")}
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {t("ticketDetails.claim.button", "Claim Ticket")}
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="default" className="text-xs bg-green-600">
                              {t("profilepage.myBookings.claimed", "Claimed")}
                            </Badge>
                            <Badge variant="default" className="text-xs">
                              {t("profilepage.myBookings.active", "Active")}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 items-start sm:items-center">
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          {t("profilepage.myBookings.category")}:{" "}
                        </span>
                        <span className="font-medium">{ticket.category || "-"}</span>
                        <span className="text-muted-foreground ml-4">
                          {t("profilepage.myBookings.price")}:{" "}
                        </span>
                        <span className="font-medium">{ticket.price || 0} EGP</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        {t("profilepage.myBookings.viewDetails")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grouped Bookings Section */}
          <div>
            {individualTickets.length > 0 && (
              <h3 className="text-lg font-semibold mb-4">
                {t("profilepage.myBookings.myBookings", "My Bookings")}
              </h3>
            )}
            {loading && bookings.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>{t("profilepage.myBookings.loading")}</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">
                  {error || "Failed to load bookings"}
                </p>
                <Button
                  onClick={() => fetchBookings(1, pagination.limit)}
                  variant="outline"
                  size="sm"
                >
                  {t("profilepage.myBookings.retry")}
                </Button>
              </div>
            ) : bookings.length === 0 && individualTickets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t("profilepage.myBookings.noBookings")}
                </p>
              </div>
            ) : (
              <>
                {bookings.map((booking) => {
                return (
                  <div
                    key={booking.id}
                    className="border border-border rounded-lg p-4 space-y-3 mb-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {booking.event_title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {t("profilepage.myBookings.date")}:{" "}
                            </span>
                            {formatDate(booking.event_date)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {t("profilepage.myBookings.time")}:{" "}
                            </span>
                            {booking.event_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="font-medium">
                              {t("profilepage.myBookings.location")}:{" "}
                            </span>
                            {booking.event_location}
                          </div>
                        </div>
                      </div>
                      <div className="self-start sm:self-auto">
                        <Badge
                          variant={
                            booking.status === "confirmed"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {t(`profilepage.myBookings.status.${booking.status}`)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3 sm:gap-0 items-start sm:items-center">
                      <div className="text-sm space-y-1">
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-muted-foreground">
                            {t("profilepage.myBookings.quantity")}{" "}
                          </span>
                          <span className="font-medium">{booking.quantity}</span>
                          <span className="text-muted-foreground">
                            {t("profilepage.myBookings.category")}{" "}
                          </span>
                          <span className="font-medium">
                            {booking.ticket_category}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          {/* Calculate subtotal and additional fees */}
                          {(() => {
                            // Get additional fees from booking (if available)
                            const fees = booking.additional_fees || {};
                            const ticketSubtotal = fees.subtotal || booking.total_amount || 0;
                            
                            // Additional fees (card cost, renewal cost)
                            const cardCost = fees.card_cost || 0;
                            const renewalCost = fees.renewal_cost || 0;
                            
                            // Calculate totals
                            const subtotal = ticketSubtotal + cardCost + renewalCost;
                            const grandTotal = subtotal;
                            
                            return (
                              <>
                                <div>
                                  <span className="text-muted-foreground">
                                    {t("booking.subtotal", "Subtotal")}:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {ticketSubtotal.toFixed(2)} EGP
                                  </span>
                                </div>
                                {cardCost > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      NFC Card:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {cardCost.toFixed(2)} EGP
                                    </span>
                                  </div>
                                )}
                                {renewalCost > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Card Renewal:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {renewalCost.toFixed(2)} EGP
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground font-semibold">
                                    {t("profilepage.myBookings.total", "Total")}:{" "}
                                  </span>
                                  <span className="font-semibold text-primary">
                                    {grandTotal.toFixed(2)} EGP
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(booking.id)}
                        >
                          {t("profilepage.myBookings.viewDetails")}
                        </Button>
                      </div>
                    </div>
                    {booking.dependents && booking.dependents.length > 0 && (
                      <div className="mt-2 p-2 bg-muted rounded">
                        <p className="text-sm font-medium mb-1">
                          {t("profilepage.myBookings.dependents")}:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {booking.dependents.map((dependent, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {dependent.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {bookings.length > 0 && hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("profilepage.myBookings.loadingMore")}
                      </>
                    ) : (
                      t("profilepage.myBookings.loadMore")
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
};
