import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financesApi } from "@/lib/api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResponsivePagination } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import {
  DollarSign,
  Calendar,
  Users,
  Download,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  CreditCard,
  Wallet,
  RefreshCw,
  Search,
  Filter,
  Receipt,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ticketId?: string;
  ticketNumber?: string;
  ticketCategory?: string;
  eventTitle?: string;
  amount: number;
  paymentMethod: "credit_card" | "debit_card" | "nfc_card" | "digital_wallet" | "bank_transfer";
  status: "pending" | "processing" | "completed" | "failed" | "refunded";
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}

const PaymentsManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getDateLocale = () => {
    return i18n.language === "ar" ? ar : enUS;
  };

  // Fetch payments from API
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['payments', searchTerm, statusFilter, paymentMethodFilter, dateFrom, dateTo, currentPage, itemsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (paymentMethodFilter !== 'all') params.payment_method = paymentMethodFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      return await financesApi.getPayments(params);
    },
  });

  // Fetch payment statistics
  const { data: paymentStats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => financesApi.getPaymentStats(),
  });

  // Transform API payments to match Payment interface
  const payments: Payment[] = useMemo(() => {
    if (!paymentsData?.results) return [];
    return paymentsData.results.map((item: any) => ({
      id: String(item.id),
      customerId: String(item.customer || item.customer_id || ''),
      customerName: item.customer_name || '',
      customerEmail: item.customer_email || '',
      customerPhone: item.customer_phone || '',
      ticketId: item.ticket ? String(item.ticket) : undefined,
      ticketNumber: item.ticket_number || undefined,
      ticketCategory: item.ticket_category || undefined,
      eventTitle: item.event_title || undefined,
      amount: parseFloat(item.amount) || 0,
      paymentMethod: (item.payment_method || 'credit_card') as Payment['paymentMethod'],
      status: (item.status || 'pending') as Payment['status'],
      transactionId: item.transaction_id || '',
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || '',
    }));
  }, [paymentsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("admin.payments.status.completed") || "Completed";
      case "pending":
        return t("admin.payments.status.pending") || "Pending";
      case "processing":
        return t("admin.payments.status.processing") || "Processing";
      case "failed":
        return t("admin.payments.status.failed") || "Failed";
      case "refunded":
        return t("admin.payments.status.refunded") || "Refunded";
      default:
        return status;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "completed":
        return "Payment was successfully processed and tickets were issued";
      case "pending":
        return "Payment is awaiting confirmation from the payment gateway";
      case "processing":
        return "Payment is being processed by the payment gateway";
      case "failed":
        return "Payment failed or was declined";
      case "refunded":
        return "Payment was refunded to the customer";
      default:
        return "";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "credit_card":
        return t("admin.payments.methods.creditCard") || "Credit Card";
      case "debit_card":
        return t("admin.payments.methods.debitCard") || "Debit Card";
      case "nfc_card":
        return t("admin.payments.methods.nfcCard") || "NFC Card";
      case "digital_wallet":
        return t("admin.payments.methods.digitalWallet") || "Digital Wallet";
      case "bank_transfer":
        return t("admin.payments.methods.bankTransfer") || "Bank Transfer";
      default:
        return method;
    }
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  const totalPages = paymentsData?.total_pages || 1;
  const startIndex = paymentsData?.page ? (paymentsData.page - 1) * paymentsData.page_size : 0;
  const endIndex = startIndex + (paymentsData?.page_size || itemsPerPage);

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.payments.title") || "Payments"}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.payments.subtitle") || "View and manage customer payments"}
          </p>
        </div>
        <ExportDialog
          data={payments.length > 0 ? payments.map((payment) => ({
            ...payment,
            // Ensure all fields are properly formatted for export
            transactionId: payment.transactionId || '',
            customerName: payment.customerName || '',
            customerEmail: payment.customerEmail || '',
            customerPhone: payment.customerPhone || '',
            eventTitle: payment.eventTitle || 'N/A',
            ticketNumber: payment.ticketNumber || 'N/A',
            ticketCategory: payment.ticketCategory || 'N/A',
            amount: payment.amount || 0,
            paymentMethod: payment.paymentMethod || 'credit_card',
            status: payment.status || 'pending',
            createdAt: payment.createdAt || '',
            updatedAt: payment.updatedAt || '',
          })) : []}
          columns={commonColumns.payments || []}
          title={t("admin.payments.title") || "Payments"}
          filename="payments"
          filters={{
            search: searchTerm,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            payment_method: paymentMethodFilter !== 'all' ? paymentMethodFilter : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          }}
          onExport={() => {
            if (payments.length === 0) {
              toast({
                title: t("admin.payments.toast.exportError") || "Export Error",
                description: "No payment data available to export",
                variant: "destructive",
              });
              return;
            }
            toast({
              title: t("admin.payments.toast.exportSuccess") || "Export successful",
              description: t("admin.payments.toast.exportSuccessDesc") || "Payments data exported successfully",
            });
          }}
        >
          <Button variant="outline" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.payments.actions.export") || "Export"}
            </span>
            <span className="sm:hidden">Export</span>
          </Button>
        </ExportDialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.payments.stats.totalPayments") || "Total Payments"}
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{paymentStats?.total_payments || payments.length}</div>
            <p className="text-xs text-muted-foreground">
              {t("admin.payments.stats.allTime") || "All time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.payments.stats.totalAmount") || "Total Amount"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrencyForLocale(paymentStats?.total_amount || 0, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.payments.stats.completed") || "Completed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.payments.stats.completedPayments") || "Completed"}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-green-600">
              {paymentStats?.completed_payments || payments.filter(p => p.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrencyForLocale(paymentStats?.completed_amount || 0, i18n.language)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.payments.stats.pendingPayments") || "Pending"}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-yellow-600">
              {paymentStats?.pending_payments || payments.filter(p => p.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("admin.payments.stats.awaiting") || "Awaiting"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.payments.filters.title") || "Filters"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.payments.filters.searchPlaceholder") || "Search by transaction ID, customer..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.payments.filters.status") || "Status"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.payments.filters.allStatus") || "All Status"}
                </SelectItem>
                <SelectItem value="completed">
                  {t("admin.payments.status.completed") || "Completed"}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.payments.status.pending") || "Pending"}
                </SelectItem>
                <SelectItem value="processing">
                  {t("admin.payments.status.processing") || "Processing"}
                </SelectItem>
                <SelectItem value="failed">
                  {t("admin.payments.status.failed") || "Failed"}
                </SelectItem>
                <SelectItem value="refunded">
                  {t("admin.payments.status.refunded") || "Refunded"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.payments.filters.paymentMethod") || "Payment Method"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.payments.filters.allMethods") || "All Methods"}
                </SelectItem>
                <SelectItem value="credit_card">
                  {t("admin.payments.methods.creditCard") || "Credit Card"}
                </SelectItem>
                <SelectItem value="debit_card">
                  {t("admin.payments.methods.debitCard") || "Debit Card"}
                </SelectItem>
                <SelectItem value="nfc_card">
                  {t("admin.payments.methods.nfcCard") || "NFC Card"}
                </SelectItem>
                <SelectItem value="digital_wallet">
                  {t("admin.payments.methods.digitalWallet") || "Digital Wallet"}
                </SelectItem>
                <SelectItem value="bank_transfer">
                  {t("admin.payments.methods.bankTransfer") || "Bank Transfer"}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="date"
                placeholder={t("admin.payments.filters.dateFrom") || "From"}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1"
              />
              <Input
                type="date"
                placeholder={t("admin.payments.filters.dateTo") || "To"}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.payments.table.payments") || "Payments"} ({paymentsData?.count || payments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : paymentsError ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-500">
                {t("common.error")}: {paymentsError instanceof Error ? paymentsError.message : t("admin.payments.toast.error")}
              </span>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("admin.payments.noPaymentsFound") || "No payments found"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full rtl:text-right ltr:text-left">
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.transactionId") || "Transaction ID"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.customer") || "Customer"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.ticket") || "Ticket"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.event") || "Event"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.amount") || "Amount"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.method") || "Method"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.status") || "Status"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.date") || "Date"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.payments.table.actions") || "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="rtl:text-right">
                          <p className="font-medium font-mono text-xs">{payment.transactionId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          <p className="font-medium">{payment.customerName}</p>
                          <p className="text-sm text-muted-foreground">{payment.customerEmail}</p>
                          <p className="text-sm text-muted-foreground">{payment.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          {payment.ticketNumber ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="font-mono text-xs">
                                {payment.ticketNumber}
                              </Badge>
                              {payment.ticketCategory && (
                                <p className="text-xs text-muted-foreground">
                                  {payment.ticketCategory}
                                </p>
                              )}
                            </div>
                          ) : payment.ticketCategory ? (
                            <Badge variant="outline" className="text-xs">
                              {payment.ticketCategory}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          {payment.eventTitle ? (
                            <p className="text-sm font-medium">{payment.eventTitle}</p>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          <p className="font-medium">{formatCurrencyForLocale(payment.amount, i18n.language)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPaymentMethodText(payment.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(payment.status)}>
                                  {getStatusText(payment.status)}
                                </Badge>
                                <Info className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{getStatusDescription(payment.status)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          {payment.createdAt && (
                            <p className="text-sm">
                              {format(parseISO(payment.createdAt), "MMM dd, yyyy", {
                                locale: getDateLocale(),
                              })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!paymentsLoading && !paymentsError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.payments.pagination.showing") || "Showing"} ${
                startIndex + 1
              }-${Math.min(endIndex, paymentsData?.count || 0)} ${t(
                "admin.payments.pagination.of"
              ) || "of"} ${paymentsData?.count || 0} ${t(
                "admin.payments.pagination.results"
              ) || "results"}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={paymentsData?.count || 0}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* View Payment Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left max-w-2xl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.payments.dialogs.paymentDetails") || "Payment Details"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.payments.dialogs.paymentDetailsSubtitle") || "View detailed payment information"}
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.transactionId") || "Transaction ID"}
                  </label>
                  <p className="text-sm text-muted-foreground rtl:text-right font-mono">
                    {selectedPayment.transactionId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.status") || "Status"}
                  </label>
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(selectedPayment.status)}>
                      {getStatusText(selectedPayment.status)}
                    </Badge>
                    <p className="text-xs text-muted-foreground rtl:text-right">
                      {getStatusDescription(selectedPayment.status)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.amount") || "Amount"}
                  </label>
                  <p className="text-2xl font-bold rtl:text-right text-green-600">
                    {formatCurrencyForLocale(selectedPayment.amount, i18n.language)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.paymentMethod") || "Payment Method"}
                  </label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {getPaymentMethodText(selectedPayment.paymentMethod)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.customer") || "Customer"}
                  </label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {selectedPayment.customerName}
                  </p>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {selectedPayment.customerEmail}
                  </p>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {selectedPayment.customerPhone}
                  </p>
                </div>
                {(selectedPayment.ticketNumber || selectedPayment.ticketCategory) && (
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.payments.details.ticket") || "Ticket"}
                    </label>
                    {selectedPayment.ticketNumber && (
                      <p className="text-sm text-muted-foreground rtl:text-right font-mono">
                        {selectedPayment.ticketNumber}
                      </p>
                    )}
                    {selectedPayment.ticketCategory && (
                      <p className="text-sm text-muted-foreground rtl:text-right">
                        Category: {selectedPayment.ticketCategory}
                      </p>
                    )}
                  </div>
                )}
                {selectedPayment.eventTitle && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.payments.details.event") || "Event"}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedPayment.eventTitle}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.createdAt") || "Created At"}
                  </label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {selectedPayment.createdAt && format(parseISO(selectedPayment.createdAt), "PPP p", {
                      locale: getDateLocale(),
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.payments.details.updatedAt") || "Updated At"}
                  </label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {selectedPayment.updatedAt && format(parseISO(selectedPayment.updatedAt), "PPP p", {
                      locale: getDateLocale(),
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {t("common.close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsManagement;

