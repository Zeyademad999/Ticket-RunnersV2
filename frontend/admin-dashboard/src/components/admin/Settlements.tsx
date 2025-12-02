import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financesApi } from "@/lib/api/adminApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Handshake,
  DollarSign,
  Calendar,
  CheckCircle,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  Download,
  Trash2,
  AlertCircle,
  Clock,
  User,
  CreditCard,
  Banknote,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns, formatCurrency } from "@/lib/exportUtils";
import {
  formatCurrencyForLocale,
  formatNumberForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import i18n from "@/lib/i18n";

// Types
interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentBalance: number;
  owedAmount: number;
  totalDeposits: number;
  totalSettlements: number;
  status: "active" | "inactive";
}

type PaymentMethod = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

type Settlement = {
  id: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  paymentMethodId: string;
  paymentMethodName: string;
  date: string;
  notes?: string;
  status: "completed" | "pending" | "cancelled";
  referenceNumber: string;
  createdAt: string;
  updatedAt: string;
};

const Settlements = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [settlementsPerPage, setSettlementsPerPage] = useState(25);

  // Fetch settlements from API
  const { data: settlementsData, isLoading: settlementsLoading, error: settlementsError } = useQuery({
    queryKey: ['settlements', searchTerm, dateFrom, dateTo, currentPage, settlementsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: settlementsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      return await financesApi.getSettlements(params);
    },
  });

  // Transform API settlements to match Settlement interface
  const settlements: Settlement[] = useMemo(() => {
    if (!settlementsData?.results) return [];
    return settlementsData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      ownerId: item.owner?.id?.toString() || item.owner_id?.toString() || '',
      ownerName: item.owner?.name || item.owner_name || '',
      amount: parseFloat(item.amount) || 0,
      paymentMethodId: item.payment_method?.id?.toString() || item.payment_method_id?.toString() || '',
      paymentMethodName: item.payment_method?.name || item.payment_method_name || '',
      date: item.date || item.settlement_date || item.created_at || '',
      notes: item.notes || undefined,
      status: (item.status || 'completed') as "completed" | "pending" | "cancelled",
      referenceNumber: item.reference_number || item.reference || '',
      createdAt: item.created_at || item.createdAt || '',
      updatedAt: item.updated_at || item.updatedAt || '',
    }));
  }, [settlementsData]);

  // Extract unique owners and payment methods from settlements
  const owners: Owner[] = useMemo(() => {
    const ownerMap = new Map<string, Owner>();
    settlements.forEach((settlement) => {
      if (settlement.ownerId && settlement.ownerName) {
        if (!ownerMap.has(settlement.ownerId)) {
          ownerMap.set(settlement.ownerId, {
            id: settlement.ownerId,
            name: settlement.ownerName,
            email: '',
            phone: '',
            currentBalance: 0,
            owedAmount: 0,
            totalDeposits: 0,
            totalSettlements: 0,
            status: 'active',
          });
        }
        const owner = ownerMap.get(settlement.ownerId)!;
        owner.totalSettlements += settlement.amount;
      }
    });
    return Array.from(ownerMap.values());
  }, [settlements]);

  const paymentMethods: PaymentMethod[] = useMemo(() => {
    const methodMap = new Map<string, PaymentMethod>();
    settlements.forEach((settlement) => {
      if (settlement.paymentMethodId && settlement.paymentMethodName) {
        if (!methodMap.has(settlement.paymentMethodId)) {
          methodMap.set(settlement.paymentMethodId, {
            id: settlement.paymentMethodId,
            name: settlement.paymentMethodName,
            description: '',
            isActive: true,
          });
        }
      }
    });
    return Array.from(methodMap.values());
  }, [settlements]);

  // Dialog states
  const [showAddSettlement, setShowAddSettlement] = useState(false);
  const [showSettlementDetails, setShowSettlementDetails] = useState(false);
  const [selectedSettlement, setSelectedSettlement] =
    useState<Settlement | null>(null);

  // Form state
  const [settlementForm, setSettlementForm] = useState({
    ownerId: "",
    amount: "",
    paymentMethodId: "",
    date: "",
    notes: "",
  });

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18n.language === "ar" ? ar : enUS;
  };

  // Format date for current locale
  const formatDateForLocale = (dateString: string) => {
    if (!dateString) return t("common.notAvailable") || "N/A";
    try {
      const date = parseISO(dateString);
      return format(date, "PPP", { locale: getDateLocale() });
    } catch (error) {
      return dateString; // Return the original string if parsing fails
    }
  };


  // Filtered settlements (API handles most filtering, but we filter owner/status/payment method client-side if needed)
  const filteredSettlements = useMemo(() => {
    // API already handles search and date filtering
    // Filter by owner, status, and payment method client-side
    return settlements.filter((settlement) => {
      const matchesOwner =
        selectedOwner === "all" || settlement.ownerId === selectedOwner;
      const matchesStatus =
        selectedStatus === "all" || settlement.status === selectedStatus;
      const matchesPaymentMethod =
        selectedPaymentMethod === "all" ||
        settlement.paymentMethodId === selectedPaymentMethod;

      return matchesOwner && matchesStatus && matchesPaymentMethod;
    });
  }, [settlements, selectedOwner, selectedStatus, selectedPaymentMethod]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = settlementsData?.total_pages || 1;
  const startIndex = settlementsData?.page ? (settlementsData.page - 1) * settlementsData.page_size : 0;
  const endIndex = startIndex + (settlementsData?.page_size || settlementsPerPage);
  const paginatedSettlements = filteredSettlements; // API already paginates

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedOwner,
    selectedStatus,
    selectedPaymentMethod,
    dateFrom,
    dateTo,
  ]);

  // Calculate statistics
  const totalSettlements = settlements.length;
  const totalAmount = settlements.reduce(
    (sum, settlement) => sum + settlement.amount,
    0
  );
  const pendingSettlements = settlements.filter(
    (s) => s.status === "pending"
  ).length;
  const completedSettlements = settlements.filter(
    (s) => s.status === "completed"
  ).length;
  const totalOwedAmount = owners.reduce(
    (sum, owner) => sum + owner.owedAmount,
    0
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle form changes
  const handleFormChange = (field: string, value: string) => {
    setSettlementForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle add settlement
  const handleAddSettlement = () => {
    // Validate form
    if (
      !settlementForm.ownerId ||
      !settlementForm.amount ||
      !settlementForm.paymentMethodId ||
      !settlementForm.date
    ) {
      toast({
        title: t("admin.settlements.validation.error"),
        description: t("admin.settlements.validation.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(settlementForm.amount);
    if (amount <= 0) {
      toast({
        title: t("admin.settlements.validation.error"),
        description: t("admin.settlements.validation.invalidAmount"),
        variant: "destructive",
      });
      return;
    }

    // Check if owner has enough owed amount
    const owner = owners.find((o) => o.id === settlementForm.ownerId);
    if (owner && amount > owner.owedAmount) {
      toast({
        title: t("admin.settlements.validation.error"),
        description: t("admin.settlements.validation.insufficientOwedAmount"),
        variant: "destructive",
      });
      return;
    }

    // Create new settlement
    const paymentMethod = paymentMethods.find(
      (pm) => pm.id === settlementForm.paymentMethodId
    );
    const newSettlement: Settlement = {
      id: `SET${String(settlements.length + 1).padStart(3, "0")}`,
      ownerId: settlementForm.ownerId,
      ownerName: owner?.name || "",
      amount: amount,
      paymentMethodId: settlementForm.paymentMethodId,
      paymentMethodName: paymentMethod?.name || "",
      date: settlementForm.date,
      notes: settlementForm.notes,
      status: "completed",
      referenceNumber: `REF-${new Date().getFullYear()}-${String(
        settlements.length + 1
      ).padStart(3, "0")}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add settlement
    // Note: Settlement creation would need API endpoint
    // For now, invalidate query to refetch
    queryClient.invalidateQueries({ queryKey: ['settlements'] });

    // Update owner's owed amount and company wallet
    if (owner) {
      setOwners((prev) =>
        prev.map((o) =>
          o.id === owner.id
            ? {
                ...o,
                owedAmount: o.owedAmount - amount,
                totalSettlements: o.totalSettlements + amount,
              }
            : o
        )
      );
    }

    // Reset form
    setSettlementForm({
      ownerId: "",
      amount: "",
      paymentMethodId: "",
      date: "",
      notes: "",
    });

    setShowAddSettlement(false);

    toast({
      title: t("admin.settlements.settlementAdded"),
      description: t("admin.settlements.settlementAddedDesc"),
    });
  };

  // Handle view settlement details
  const handleViewSettlement = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setShowSettlementDetails(true);
  };

  // Handle delete settlement
  const handleDeleteSettlement = (settlementId: string) => {
    const settlement = settlements.find((s) => s.id === settlementId);
    if (settlement) {
      // Reverse the settlement effect
      setOwners((prev) =>
        prev.map((o) =>
          o.id === settlement.ownerId
            ? {
                ...o,
                owedAmount: o.owedAmount + settlement.amount,
                totalSettlements: o.totalSettlements - settlement.amount,
              }
            : o
        )
      );
    }

    // Note: Settlement deletion would need API endpoint
    // For now, invalidate query to refetch
    queryClient.invalidateQueries({ queryKey: ['settlements'] });
    toast({
      title: t("admin.settlements.settlementDeleted"),
      description: t("admin.settlements.settlementDeletedDesc"),
    });
  };

  // Handle export
  const handleExport = () => {
    toast({
      title: t("admin.settlements.exportSuccess"),
      description: t("admin.settlements.exportSuccessDesc"),
    });
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.settlements")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.settlements.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showAddSettlement} onOpenChange={setShowAddSettlement}>
            <DialogTrigger asChild>
              <Button className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
                <span className="hidden sm:inline">
                  {t("admin.settlements.actions.addSettlement")}
                </span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[500px]"
              dir={i18n.language === "ar" ? "rtl" : "ltr"}
            >
              <DialogHeader>
                <DialogTitle>
                  {t("admin.settlements.dialogs.addSettlement.title")}
                </DialogTitle>
                <DialogDescription className="rtl:text-right">
                  {t("admin.settlements.dialogs.addSettlement.subtitle")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="owner" className="rtl:text-right">
                    {t("admin.settlements.form.owner")}
                  </Label>
                  <Select
                    value={settlementForm.ownerId}
                    onValueChange={(value) =>
                      handleFormChange("ownerId", value)
                    }
                  >
                    <SelectTrigger className="rtl:text-right">
                      <SelectValue
                        placeholder={t("admin.settlements.form.selectOwner")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {owners
                        .filter((owner) => owner.owedAmount > 0)
                        .map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name} -{" "}
                            {formatCurrencyForLocale(
                              owner.owedAmount,
                              i18n.language
                            )}{" "}
                            {t("admin.settlements.form.owed")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount" className="rtl:text-right">
                    {t("admin.settlements.form.amount")}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={settlementForm.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                    placeholder={t("admin.settlements.form.amountPlaceholder")}
                    className="rtl:text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="rtl:text-right">
                    {t("admin.settlements.form.paymentMethod")}
                  </Label>
                  <Select
                    value={settlementForm.paymentMethodId}
                    onValueChange={(value) =>
                      handleFormChange("paymentMethodId", value)
                    }
                  >
                    <SelectTrigger className="rtl:text-right">
                      <SelectValue
                        placeholder={t(
                          "admin.settlements.form.selectPaymentMethod"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods
                        .filter((method) => method.isActive)
                        .map((method) => (
                          <SelectItem key={method.id} value={method.id}>
                            {method.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="rtl:text-right">
                    {t("admin.settlements.form.date")}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={settlementForm.date}
                    onChange={(e) => handleFormChange("date", e.target.value)}
                    className="rtl:text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="rtl:text-right">
                    {t("admin.settlements.form.notes")}
                  </Label>
                  <Textarea
                    id="notes"
                    value={settlementForm.notes}
                    onChange={(e) => handleFormChange("notes", e.target.value)}
                    placeholder={t("admin.settlements.form.notesPlaceholder")}
                    className="rtl:text-right"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="rtl:flex-row-reverse">
                <Button
                  variant="outline"
                  onClick={() => setShowAddSettlement(false)}
                >
                  {t("admin.common.cancel")}
                </Button>
                <Button onClick={handleAddSettlement}>
                  {t("admin.settlements.actions.addSettlement")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ExportDialog
            data={filteredSettlements}
            columns={[
              {
                header: t("admin.settlements.table.reference"),
                key: "referenceNumber",
              },
              { header: t("admin.settlements.table.owner"), key: "ownerName" },
              {
                header: t("admin.settlements.table.amount"),
                key: "amount",
                formatter: formatCurrency,
              },
              {
                header: t("admin.settlements.table.paymentMethod"),
                key: "paymentMethodName",
              },
              { header: t("admin.settlements.table.date"), key: "date" },
              { header: t("admin.settlements.table.status"), key: "status" },
              { header: t("admin.settlements.table.notes"), key: "notes" },
            ]}
            title={t("admin.settlements.title")}
            filename="settlements"
            onExport={handleExport}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.settlements.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.settlements.stats.totalSettlements")}
              </CardTitle>
            </div>
            <Handshake className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{totalSettlements}</div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.settlements.stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.settlements.stats.totalAmount")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(totalAmount, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.settlements.stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.settlements.stats.pendingSettlements")}
              </CardTitle>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{pendingSettlements}</div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.settlements.stats.awaitingProcessing")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.settlements.stats.totalOwed")}
              </CardTitle>
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(totalOwedAmount, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.settlements.stats.toOwners")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Filter className="h-5 w-5" />
            {t("admin.settlements.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="rtl:text-right">
                {t("admin.settlements.filters.search")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                <Input
                  placeholder={t("admin.settlements.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pl-3 rtl:pr-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="rtl:text-right">
                {t("admin.settlements.filters.owner")}
              </Label>
              <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue
                    placeholder={t("admin.settlements.filters.allOwners")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.settlements.filters.allOwners")}
                  </SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="rtl:text-right">
                {t("admin.settlements.filters.status")}
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue
                    placeholder={t("admin.settlements.filters.allStatuses")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.settlements.filters.allStatuses")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("admin.settlements.status.completed")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("admin.settlements.status.pending")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("admin.settlements.status.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="rtl:text-right">
                {t("admin.settlements.filters.paymentMethod")}
              </Label>
              <Select
                value={selectedPaymentMethod}
                onValueChange={setSelectedPaymentMethod}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue
                    placeholder={t("admin.settlements.filters.allMethods")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.settlements.filters.allMethods")}
                  </SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="rtl:text-right">
                {t("admin.settlements.filters.dateRange")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder={t("admin.settlements.filters.from")}
                  className="rtl:text-right"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder={t("admin.settlements.filters.to")}
                  className="rtl:text-right"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Handshake className="h-5 w-5" />
            {t("admin.settlements.title")}
          </CardTitle>
          <CardDescription className="rtl:text-right">
            {t("admin.settlements.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table dir={i18n.language === "ar" ? "rtl" : "ltr"}>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.reference")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.owner")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.amount")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.paymentMethod")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.date")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.settlements.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSettlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-medium rtl:text-right">
                      {settlement.referenceNumber}
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {settlement.ownerName}
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="font-medium currency-container">
                        {formatCurrencyForLocale(
                          settlement.amount,
                          i18n.language
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        {settlement.paymentMethodName === "Bank Transfer" && (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {settlement.paymentMethodName === "Cash" && (
                          <Banknote className="h-4 w-4" />
                        )}
                        {settlement.paymentMethodName === "Check" && (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {settlement.paymentMethodName === "PayPal" && (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {settlement.paymentMethodName}
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      {formatDateForLocale(settlement.date)}
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <Badge className={getStatusColor(settlement.status)}>
                        {settlement.status === "completed" && (
                          <CheckCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        )}
                        {settlement.status === "pending" && (
                          <Clock className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        )}
                        {settlement.status === "cancelled" && (
                          <AlertCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                        )}
                        {t(`admin.settlements.status.${settlement.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="rtl:text-right"
                        >
                          <DropdownMenuLabel>
                            {t("admin.settlements.actions.title")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewSettlement(settlement)}
                          >
                            <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.settlements.actions.view")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleDeleteSettlement(settlement.id)
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.settlements.actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!settlementsLoading && !settlementsError && totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4 rtl:space-x-reverse">
              <div className="text-sm text-muted-foreground rtl:text-right">
                {t("admin.settlements.pagination.showing")} {startIndex + 1}-
                {Math.min(endIndex, settlementsData?.count || 0)}{" "}
                {t("admin.settlements.pagination.of")}{" "}
                {settlementsData?.count || 0}{" "}
                {t("admin.settlements.pagination.results")}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setCurrentPage(totalPages)}
                          isActive={currentPage === totalPages}
                          className="cursor-pointer"
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Details Dialog */}
      <Dialog
        open={showSettlementDetails}
        onOpenChange={setShowSettlementDetails}
      >
        <DialogContent
          className="sm:max-w-[600px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>
              {t("admin.settlements.dialogs.details.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("admin.settlements.dialogs.details.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedSettlement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.reference")}
                  </Label>
                  <p className="text-sm font-medium rtl:text-right">
                    {selectedSettlement.referenceNumber}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.owner")}
                  </Label>
                  <p className="text-sm font-medium rtl:text-right">
                    {selectedSettlement.ownerName}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.amount")}
                  </Label>
                  <p className="text-sm font-medium rtl:text-right">
                    {formatCurrencyForLocale(
                      selectedSettlement.amount,
                      i18n.language
                    )}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.paymentMethod")}
                  </Label>
                  <p className="text-sm font-medium rtl:text-right">
                    {selectedSettlement.paymentMethodName}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.date")}
                  </Label>
                  <p className="text-sm font-medium rtl:text-right">
                    {formatDateForLocale(selectedSettlement.date)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.status")}
                  </Label>
                  <Badge className={getStatusColor(selectedSettlement.status)}>
                    {t(`admin.settlements.status.${selectedSettlement.status}`)}
                  </Badge>
                </div>
              </div>
              {selectedSettlement.notes && (
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.notes")}
                  </Label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {selectedSettlement.notes}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.createdAt")}
                  </Label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {formatDateForLocale(selectedSettlement.createdAt)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="rtl:text-right">
                    {t("admin.settlements.table.updatedAt")}
                  </Label>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {formatDateForLocale(selectedSettlement.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button onClick={() => setShowSettlementDetails(false)}>
              {t("admin.common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settlements;
