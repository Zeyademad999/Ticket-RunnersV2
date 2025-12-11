import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Ticket, CreditCard, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { financesApi } from "@/lib/api/adminApi";
import { formatCurrencyForLocale } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  revenue?: number;
  commission?: number;
  ticketsSold?: number;
  organizers?: any[];
  deductions?: Array<{
    id?: string;
    name: string;
    type: 'percentage' | 'fixed_per_ticket';
    value: number;
    description?: string;
    appliesTo?: 'tickets' | 'nfc_cards';
    applies_to?: 'tickets' | 'nfc_cards';
  }>;
  commissionRate?: {
    type: 'percentage' | 'flat';
    value: number;
  };
}

interface EventFinancesReportProps {
  event: Event;
}

export const EventFinancesReport: React.FC<EventFinancesReportProps> = ({ event }) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ticketRunnerProfit, setTicketRunnerProfit] = useState<any>(null);

  useEffect(() => {
    const loadFinancialData = async () => {
      setLoading(true);
      try {
        // Load Ticket Runner profit (for admin view)
        try {
          const trProfit = await financesApi.getTicketRunnerProfit();
          setTicketRunnerProfit(trProfit);
        } catch (err) {
          console.error("Failed to load Ticket Runner profit:", err);
        }
      } catch (err: any) {
        toast({
          title: t("admin.events.finances.loadError", "Error"),
          description: err?.message || t("admin.events.finances.loadErrorDesc", "Failed to load financial data"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (event) {
      loadFinancialData();
    }
  }, [event, toast, t]);

  // Use event-specific deductions (not global)
  const eventDeductionsList = event.deductions || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate event-specific ticket revenue
  const eventTicketRevenue = event.revenue || 0;
  const eventTicketsSold = event.ticketsSold || 0;
  
  // Calculate commission from event's commissionRate (always use commissionRate if available)
  const commissionRate = event.commissionRate || { type: 'percentage' as const, value: 10 };
  let eventCommission = 0;
  if (commissionRate) {
    if (commissionRate.type === 'percentage') {
      eventCommission = (eventTicketRevenue * commissionRate.value) / 100;
    } else {
      eventCommission = commissionRate.value * eventTicketsSold;
    }
  } else if (event.commission) {
    // Fallback to event.commission only if commissionRate is not available
    eventCommission = event.commission;
  }

  // Calculate deductions for this event - only use event-specific deductions
  // Filter to only show deductions that apply to tickets (Part 1)
  const ticketDeductions = eventDeductionsList.filter((d: any) => {
    const appliesTo = d.appliesTo || d.applies_to || 'tickets';
    return appliesTo === 'tickets';
  });

  const eventDeductions = ticketDeductions.map(deduction => {
    let amount = 0;
    if (deduction.type === 'percentage') {
      amount = (eventTicketRevenue * deduction.value) / 100;
    } else if (deduction.type === 'fixed_per_ticket') {
      amount = deduction.value * eventTicketsSold;
    }
    return { ...deduction, calculatedAmount: amount };
  });

  const totalDeductions = eventDeductions.reduce((sum, d) => sum + d.calculatedAmount, 0) + eventCommission;
  const organizerNetProfit = eventTicketRevenue - totalDeductions;
  
  // Debug logging
  console.log("Event Finances Calculation:", {
    eventTicketRevenue,
    eventCommission,
    eventDeductions: eventDeductions.map(d => ({ name: d.name, amount: d.calculatedAmount })),
    totalDeductions,
    organizerNetProfit
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm rtl:text-right">
              {t("admin.events.finances.ticketRevenue", "Ticket Revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrencyForLocale(eventTicketRevenue, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {eventTicketsSold} {t("admin.events.finances.ticketsSold", "tickets sold")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm rtl:text-right">
              {t("admin.events.finances.totalDeductions", "Total Deductions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyForLocale(totalDeductions, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {eventDeductions.length + 1} {t("admin.events.finances.deductionItems", "deduction items")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm rtl:text-right">
              {t("admin.events.finances.organizerNetProfit", "Organizer Net Profit")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyForLocale(organizerNetProfit, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("admin.events.finances.shownToOrganizer", "Shown to organizer")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4">
        {/* Part 1: Ticket Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base rtl:text-right flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {t("admin.events.finances.part1TicketRevenue", "Part 1: Tickets Sold Revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium rtl:text-right">
                  {t("admin.events.finances.totalTicketRevenue", "Total Ticket Revenue")}:
                </span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrencyForLocale(eventTicketRevenue, i18n.language)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground rtl:text-right">
                {t("admin.events.finances.ticketRevenueDescription", "Money paid for tickets (excluding black card tickets)")}
              </p>
            </div>

            {/* Deductions Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold rtl:text-right">
                {t("admin.events.finances.deductions", "Deductions Applied")}:
              </h4>
              <div className="space-y-2">
                {/* Custom Deductions */}
                {eventDeductions.length === 0 ? (
                  <p className="text-xs text-muted-foreground rtl:text-right">
                    {t("admin.events.finances.noDeductions", "No deductions added yet")}
                  </p>
                ) : (
                  eventDeductions.map((deduction, index) => (
                    <div key={deduction.id || index} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                      <div>
                        <span className="text-sm font-medium">{deduction.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {deduction.type === 'percentage' 
                            ? `${deduction.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                            : `${formatCurrencyForLocale(deduction.value, i18n.language)} ${t("admin.events.finances.perTicket", "per ticket")}`
                          }
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrencyForLocale(deduction.calculatedAmount, i18n.language)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Organizer Net Profit */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold rtl:text-right">
                  {t("admin.events.finances.organizerNetProfit", "Organizer Net Profit")}:
                </span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrencyForLocale(organizerNetProfit, i18n.language)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                {t("admin.events.finances.organizerNetProfitDescription", "This amount will be shown to the organizer")}
              </p>
              
              {/* TR Commission Fee (Auto-added from form) - Displayed under Organizer Net Profit */}
              {event.commissionRate && (
                <div className="mt-4 p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold">TR Commission Fee</span>
                      <p className="text-xs text-muted-foreground">
                        {event.commissionRate.type === 'percentage' 
                          ? `${event.commissionRate.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                          : `${formatCurrencyForLocale(event.commissionRate.value, i18n.language)} ${t("admin.events.finances.perTicket", "per ticket")}`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {t("admin.events.finances.autoAdded", "Auto-added from form")}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrencyForLocale(eventCommission, i18n.language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Part 2: NFC Card Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base rtl:text-right flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("admin.events.finances.part2CardRevenue", "Part 2: NFC Card Revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium rtl:text-right">
                  {t("admin.events.finances.totalCardRevenue", "Total Card Revenue")}:
                </span>
                <span className="text-lg font-bold text-primary">
                  {ticketRunnerProfit?.card_revenue 
                    ? formatCurrencyForLocale(ticketRunnerProfit.card_revenue, i18n.language)
                    : t("admin.events.finances.calculatedSeparately", "Calculated separately")
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground rtl:text-right">
                {t("admin.events.finances.cardRevenueDescription", "Revenue from first-time NFC card purchases (not shown to organizer)")}
              </p>
            </div>

            {/* Note about card revenue */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200 rtl:text-right">
                <strong>{t("admin.events.finances.note", "Note")}:</strong>{" "}
                {t("admin.events.finances.cardRevenueNote", "NFC card revenue is calculated separately and is NOT included in the organizer's profit calculation. Only ticket revenue deductions apply to organizers.")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Runner Summary (Admin Only) */}
        {ticketRunnerProfit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base rtl:text-right flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("admin.events.finances.ticketRunnerSummary", "Ticket Runner Summary (Admin View)")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {t("admin.events.finances.totalRevenue", "Total Revenue")}:
                  </p>
                  <p className="text-lg font-bold">
                    {formatCurrencyForLocale(ticketRunnerProfit.total_revenue || 0, i18n.language)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {t("admin.events.finances.netProfit", "Net Profit")}:
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrencyForLocale(ticketRunnerProfit.ticket_runner_net_profit || 0, i18n.language)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

