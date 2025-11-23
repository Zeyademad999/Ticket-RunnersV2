import React from "react";
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
} from "lucide-react";
import { useCustomerBookings } from "@/hooks/useCustomerBookings";
import { format } from "date-fns";

export const ProfileBookingsTab = (props: any) => {
  const { t, handleViewDetails } = props;
  const { bookings, loading, error, fetchBookings, hasMore, pagination } = useCustomerBookings(1, 10);

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
          ) : bookings.length === 0 ? (
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
                    className="border border-border rounded-lg p-4 space-y-3"
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
                          {/* Calculate subtotal, VAT, and additional fees */}
                          {(() => {
                            // Get additional fees from booking (if available)
                            const fees = booking.additional_fees || {};
                            const ticketSubtotal = fees.subtotal || booking.total_amount || 0;
                            const ticketVat = fees.vat_amount || (ticketSubtotal * 0.14);
                            
                            // Additional fees (card cost, renewal cost) - these don't have VAT
                            const cardCost = fees.card_cost || 0;
                            const renewalCost = fees.renewal_cost || 0;
                            
                            // Calculate totals
                            const subtotal = ticketSubtotal + cardCost + renewalCost;
                            const totalVat = ticketVat; // Only tickets have VAT, additional fees don't
                            const grandTotal = subtotal + totalVat;
                            
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
                                  <span className="text-muted-foreground">
                                    {t("booking.vat", "VAT (14%)")}:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {totalVat.toFixed(2)} EGP
                                  </span>
                                </div>
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
        </CardContent>
      </Card>
    </TabsContent>
  );
};
