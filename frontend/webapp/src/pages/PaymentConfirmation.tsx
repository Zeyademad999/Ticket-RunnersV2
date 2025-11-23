import React from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

interface PaymentState {
  eventTitle?: string;
  ticketTitle?: string;
  totalAmount?: number;
  transactionId?: string;
  type?: 'booking' | 'transfer';
}

export default function PaymentConfirmation() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get data from state (if navigated with state) or from URL query params (if redirected)
  const paymentType = (state as PaymentState)?.type || searchParams.get('type') || 'booking';
  const eventTitle = (state as PaymentState)?.eventTitle || searchParams.get('eventTitle') || '';
  const ticketTitle = (state as PaymentState)?.ticketTitle || searchParams.get('ticketTitle') || '';
  const displayTitle = paymentType === 'transfer' ? (ticketTitle || 'Ticket Transfer') : (eventTitle || 'Event');
  const totalAmount = (state as PaymentState)?.totalAmount || parseFloat(searchParams.get('amount') || '0');
  const transactionId = (state as PaymentState)?.transactionId || searchParams.get('transactionId') || searchParams.get('orderId') || 'N/A';
  
  // Debug logging
  React.useEffect(() => {
    console.log('PaymentConfirmation page loaded');
    console.log('State:', state);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    console.log('Event title:', eventTitle);
    console.log('Total amount:', totalAmount);
    console.log('Transaction ID:', transactionId);
  }, [state, searchParams, eventTitle, totalAmount, transactionId]);

  // Show loading or error state if no data
  if (!transactionId || transactionId === 'N/A') {
    return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-xl mx-auto text-center">
          <CheckCircle className="h-14 w-14 text-primary mx-auto mb-6" />
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            {t("paymentConfirmation.title")}
          </h1>
          <p className="text-muted-foreground mb-8">
            {t("paymentConfirmation.thankYou")}
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Your payment has been processed successfully.
          </p>
          <Link to="/events">
            <button className="mt-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 rounded-xl transition">
              {t("paymentConfirmation.browseEvents")}
            </button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-xl mx-auto text-center">
        <CheckCircle className="h-14 w-14 text-primary mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          {t("paymentConfirmation.title")}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t("paymentConfirmation.thankYou")}
        </p>

        <Card className="text-left">
          <CardHeader>
            <CardTitle>{t("paymentConfirmation.detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">
                {paymentType === 'transfer' 
                  ? t("paymentConfirmation.ticket", "Ticket") 
                  : t("paymentConfirmation.event", "Event")}
              </span>
              <span>{displayTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">
                {t("paymentConfirmation.transactionId")}
              </span>
              <Badge variant="secondary">{transactionId}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">
                {paymentType === 'transfer'
                  ? t("paymentConfirmation.transferFee", "Transfer Fee")
                  : t("paymentConfirmation.totalPaid", "Total Paid")}
              </span>
              <span className="font-semibold">
                {totalAmount > 0 ? totalAmount.toFixed(2) : '0.00'} EGP
              </span>
            </div>
            {paymentType === 'transfer' && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  {t("paymentConfirmation.transferSuccess", "Your ticket has been successfully transferred!")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center mt-10">
          {paymentType === 'transfer' ? (
            <Link to="/profile#bookings">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 rounded-xl transition">
                {t("paymentConfirmation.viewBookings", "View My Bookings")}
              </button>
            </Link>
          ) : (
            <Link to="/events">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-3 rounded-xl transition">
                {t("paymentConfirmation.browseEvents")}
              </button>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
