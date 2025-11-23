import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financesApi, eventsApi } from "@/lib/api/adminApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { ExportDialog } from "@/components/ui/export-dialog";
import { formatCurrency } from "@/lib/exportUtils";
import {
  formatCurrencyForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import i18n from "@/lib/i18n";

const CompanyFinances = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch all events to calculate total commissions
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'all', dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {
        page: 1,
        page_size: 10000, // Get all events
      };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      return await eventsApi.getEvents(params);
    },
  });

  // Fetch all expenses
  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', 'all', dateFrom, dateTo],
    queryFn: async () => {
      const params: any = {
        page: 1,
        page_size: 10000, // Get all expenses
      };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      return await financesApi.getExpenses(params);
    },
  });

  // Calculate total commissions from all events
  const totalCommissions = useMemo(() => {
    if (!eventsData?.results) return 0;
    return eventsData.results.reduce((sum: number, event: any) => {
      const commission = parseFloat(event.commission || 0);
      return sum + commission;
    }, 0);
  }, [eventsData]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    if (!expensesData?.results) return 0;
    return expensesData.results.reduce((sum: number, expense: any) => {
      const amount = parseFloat(expense.amount || 0);
      return sum + amount;
    }, 0);
  }, [expensesData]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalRevenue = totalCommissions;
    const expenses = totalExpenses;
    const netProfit = totalRevenue - expenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    return {
      totalRevenue,
      totalExpenses: expenses,
      netProfit,
      profitMargin,
    };
  }, [totalCommissions, totalExpenses]);

  const isLoading = eventsLoading || expensesLoading;

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.companyFinances")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.companyFinances.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={[summaryStats]}
            columns={[
              {
                header: t("admin.companyFinances.export.totalRevenueCommissions"),
                key: "totalRevenue",
                width: 30,
                formatter: formatCurrency,
              },
              {
                header: t("admin.companyFinances.export.totalExpenses"),
                key: "totalExpenses",
                width: 30,
                formatter: formatCurrency,
              },
              {
                header: t("admin.companyFinances.export.netProfit"),
                key: "netProfit",
                width: 30,
                formatter: formatCurrency,
              },
              { header: t("admin.companyFinances.export.profitMargin"), key: "profitMargin", width: 20, formatter: (val: number) => `${val.toFixed(2)}%` },
            ]}
            title={t("admin.dashboard.tabs.companyFinances")}
            subtitle={t("admin.companyFinances.subtitle")}
            filename="company-finances"
          >
            <Button className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.export.title")}
              </span>
              <span className="sm:hidden">{t("admin.export.title")}</span>
            </Button>
          </ExportDialog>
        </div>
      </div>

      {/* Overview Section */}
      <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.totalRevenue")}
                  </CardTitle>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold">
                  {formatCurrencyForLocale(summaryStats.totalRevenue, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  {t("admin.companyFinances.stats.commissionsFromTickets")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.totalExpenses")}
                  </CardTitle>
                </div>
                <TrendingDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold">
                  {formatCurrencyForLocale(summaryStats.totalExpenses, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  {t("admin.companyFinances.stats.totalExpensesAdded")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.netProfit")}
                  </CardTitle>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold">
                  {formatCurrencyForLocale(summaryStats.netProfit, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  {t("admin.companyFinances.stats.revenueMinusExpenses")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                <div className="flex-1 rtl:text-right">
                  <CardTitle className="text-sm font-medium">
                    {t("admin.companyFinances.stats.profitMargin")}
                  </CardTitle>
                </div>
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardHeader>
              <CardContent className="rtl:text-right">
                <div className="text-2xl font-bold number-container">
                  {formatPercentageForLocale(summaryStats.profitMargin, i18nInstance.language)}
                </div>
                <p className="text-xs text-muted-foreground rtl:text-right">
                  {t("admin.companyFinances.stats.calculatedMargin")}
                </p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.companyFinances.summaryDescription")}
            </div>
          )}
      </div>
    </div>
  );
};

export default CompanyFinances;
