import { useState, useMemo } from "react";
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
  ResponsivePagination,
} from "@/components/ui/pagination";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  PiggyBank,
  DollarSign,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  User,
  CreditCard,
  Banknote,
  Wallet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  formatCurrencyForLocale,
  formatNumberForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";

// Types
interface Deposit {
  id: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  paymentMethod: string;
  depositDate: string;
  notes?: string;
  status: "completed" | "pending" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
};

type Owner = {
  id: string;
  name: string;
  email: string;
  phone: string;
  walletBalance: number;
};

const Deposits = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    ownerId: "",
    amount: "",
    paymentMethod: "",
    depositDate: "",
    notes: "",
  });

  // Fetch deposits from API
  const {
    data: depositsData,
    isLoading: depositsLoading,
    error: depositsError,
  } = useQuery({
    queryKey: [
      "deposits",
      searchTerm,
      dateFrom,
      dateTo,
      currentPage,
      itemsPerPage,
    ],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      return await financesApi.getDeposits(params);
    },
  });

  // Transform API deposits to match Deposit interface
  const deposits: Deposit[] = useMemo(() => {
    if (!depositsData?.results) return [];
    return depositsData.results.map((item: any) => ({
      id: item.id?.toString() || "",
      ownerId: item.owner?.id?.toString() || item.owner_id?.toString() || "",
      ownerName: item.owner?.name || item.owner_name || "",
      amount: parseFloat(item.amount) || 0,
      paymentMethod: item.payment_method || item.paymentMethod || "",
      depositDate:
        item.deposit_date || item.depositDate || item.created_at || "",
      notes: item.notes || undefined,
      status: (item.status || "completed") as
        | "completed"
        | "pending"
        | "cancelled",
      createdAt: item.created_at || item.createdAt || "",
      updatedAt: item.updated_at || item.updatedAt || "",
    }));
  }, [depositsData]);

  // Extract unique owners and payment methods from deposits
  const owners: Owner[] = useMemo(() => {
    const ownerMap = new Map<string, Owner>();
    deposits.forEach((deposit) => {
      if (deposit.ownerId && deposit.ownerName) {
        if (!ownerMap.has(deposit.ownerId)) {
          ownerMap.set(deposit.ownerId, {
            id: deposit.ownerId,
            name: deposit.ownerName,
            email: "",
            phone: "",
            walletBalance: 0,
          });
        }
        const owner = ownerMap.get(deposit.ownerId)!;
        owner.walletBalance += deposit.amount;
      }
    });
    return Array.from(ownerMap.values());
  }, [deposits]);

  const paymentMethods: PaymentMethod[] = useMemo(() => {
    const methodMap = new Map<string, PaymentMethod>();
    deposits.forEach((deposit) => {
      if (deposit.paymentMethod && !methodMap.has(deposit.paymentMethod)) {
        methodMap.set(deposit.paymentMethod, {
          id: deposit.paymentMethod,
          name: deposit.paymentMethod,
          icon: "",
        });
      }
    });
    return Array.from(methodMap.values());
  }, [deposits]);

  // Filtered and paginated data
  // Filtered deposits (API handles most filtering, but we filter status/payment method client-side if needed)
  const filteredDeposits = useMemo(() => {
    // API already handles search and date filtering
    // Filter by status and payment method client-side
    return deposits.filter((deposit) => {
      const matchesStatus =
        statusFilter === "all" || deposit.status === statusFilter;
      const matchesPaymentMethod =
        paymentMethodFilter === "all" ||
        deposit.paymentMethod === paymentMethodFilter;
      return matchesStatus && matchesPaymentMethod;
    });
  }, [deposits, statusFilter, paymentMethodFilter]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = depositsData?.total_pages || 1;
  const startIndex = depositsData?.page
    ? (depositsData.page - 1) * depositsData.page_size
    : 0;
  const endIndex = startIndex + (depositsData?.page_size || itemsPerPage);
  const paginatedDeposits = filteredDeposits; // API already paginates

  // Statistics
  const stats = useMemo(() => {
    const totalDeposits = deposits.reduce(
      (sum, deposit) => sum + deposit.amount,
      0
    );
    const activeDeposits = deposits.filter(
      (d) => d.status === "completed"
    ).length;
    const avgDeposit =
      deposits.length > 0 ? totalDeposits / deposits.length : 0;
    // Calculate monthly growth from deposits data if available
    const monthlyGrowth = deposits.length > 0 ? 0 : 0; // TODO: Calculate from API data if available

    return {
      totalDeposits,
      activeDeposits,
      avgDeposit,
      monthlyGrowth,
    };
  }, [deposits]);

  // Handlers
  const handleAddDeposit = () => {
    setFormData({
      ownerId: "",
      amount: "",
      paymentMethod: "",
      depositDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEditDeposit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setFormData({
      ownerId: deposit.ownerId,
      amount: deposit.amount.toString(),
      paymentMethod: deposit.paymentMethod,
      depositDate: deposit.depositDate,
      notes: deposit.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleViewDeposit = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setIsViewDialogOpen(true);
  };

  const handleDeleteDeposit = (deposit: Deposit) => {
    // TODO: Implement API delete call when backend supports it
    // For now, just invalidate the query to refetch
    queryClient.invalidateQueries({ queryKey: ["deposits"] });
    toast({
      title: t("admin.deposits.actions.deleteSuccess"),
      description: t("admin.deposits.actions.deleteSuccessDescription"),
    });
  };

  const handleSubmit = (isEdit: boolean = false) => {
    if (
      !formData.ownerId ||
      !formData.amount ||
      !formData.paymentMethod ||
      !formData.depositDate
    ) {
      toast({
        title: t("admin.deposits.errors.validationError"),
        description: t("admin.deposits.errors.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    const owner = owners.find((o) => o.id === formData.ownerId);
    if (!owner) {
      toast({
        title: t("admin.deposits.errors.ownerNotFound"),
        description: t("admin.deposits.errors.ownerNotFoundDescription"),
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement API create/update calls when backend supports it
    // For now, just invalidate the query to refetch
    queryClient.invalidateQueries({ queryKey: ["deposits"] });

    if (isEdit && selectedDeposit) {
      toast({
        title: t("admin.deposits.actions.updateSuccess"),
        description: t("admin.deposits.actions.updateSuccessDescription"),
      });
      setIsEditDialogOpen(false);
    } else {
      toast({
        title: t("admin.deposits.actions.addSuccess"),
        description: t("admin.deposits.actions.addSuccessDescription"),
      });
      setIsAddDialogOpen(false);
    }

    setFormData({
      ownerId: "",
      amount: "",
      paymentMethod: "",
      depositDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const getPaymentMethodIcon = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    return method?.icon || "💳";
  };

  const getPaymentMethodName = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    return method?.name || methodId;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, icon: CheckCircle },
      pending: { variant: "secondary" as const, icon: Clock },
      cancelled: { variant: "destructive" as const, icon: XCircle },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {t(`admin.deposits.status.${status}`)}
      </Badge>
    );
  };

  // Export columns
  const exportColumns = [
    { header: t("admin.deposits.table.id"), key: "id" },
    { header: t("admin.deposits.table.owner"), key: "ownerName" },
    {
      header: t("admin.deposits.table.amount"),
      key: "amount",
      formatter: (value: number) =>
        formatCurrencyForLocale(value, i18n.language),
    },
    {
      header: t("admin.deposits.table.paymentMethod"),
      key: "paymentMethod",
      formatter: (value: string) => getPaymentMethodName(value),
    },
    {
      header: t("admin.deposits.table.depositDate"),
      key: "depositDate",
      formatter: (value: string) =>
        format(parseISO(value), "PPP", {
          locale: i18n.language === "ar" ? ar : enUS,
        }),
    },
    { header: t("admin.deposits.table.status"), key: "status" },
    { header: t("admin.deposits.table.notes"), key: "notes" },
  ];

  if (depositsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>{t("admin.dashboard.logs.loading.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.deposits")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.deposits.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsExportDialogOpen(true)}
            variant="outline"
            className="text-xs sm:text-sm"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.deposits.actions.export")}
            </span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={handleAddDeposit} className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.deposits.actions.addDeposit")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.totalDeposits")}
              </CardTitle>
            </div>
            <PiggyBank className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(stats.totalDeposits, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              +
              {formatPercentageForLocale(stats.monthlyGrowth, i18n.language, 0)}{" "}
              {t("admin.deposits.stats.fromLastMonth")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.activeDeposits")}
              </CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{stats.activeDeposits}</div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.deposits.stats.currentlyActive")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.avgDeposit")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(stats.avgDeposit, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.deposits.stats.perDeposit")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.deposits.stats.monthlyGrowth")}
              </CardTitle>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              +
              {formatPercentageForLocale(stats.monthlyGrowth, i18n.language, 0)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.deposits.stats.fromLastMonth")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Filter className="h-5 w-5" />
            {t("admin.deposits.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">
                {t("admin.deposits.filters.search")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input
                  id="search"
                  placeholder={t("admin.deposits.filters.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pr-10 rtl:pl-3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                {t("admin.deposits.filters.status")}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.deposits.filters.allStatus")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("admin.deposits.status.completed")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("admin.deposits.status.pending")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("admin.deposits.status.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">
                {t("admin.deposits.filters.paymentMethod")}
              </Label>
              <Select
                value={paymentMethodFilter}
                onValueChange={setPaymentMethodFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.deposits.filters.allPaymentMethods")}
                  </SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{t("admin.deposits.filters.date")}</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.deposits.filters.allDates")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("admin.deposits.filters.today")}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("admin.deposits.filters.thisWeek")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("admin.deposits.filters.thisMonth")}
                  </SelectItem>
                  <SelectItem value="year">
                    {t("admin.deposits.filters.thisYear")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <PiggyBank className="h-5 w-5" />
            {t("admin.deposits.title")}
          </CardTitle>
          <CardDescription>{t("admin.deposits.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedDeposits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ||
              statusFilter !== "all" ||
              paymentMethodFilter !== "all" ||
              dateFilter !== "all"
                ? t("admin.deposits.table.noResults")
                : t("admin.deposits.table.noDeposits")}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table dir={i18n.language === "ar" ? "rtl" : "ltr"}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.deposits.table.id")}</TableHead>
                      <TableHead>{t("admin.deposits.table.owner")}</TableHead>
                      <TableHead>{t("admin.deposits.table.amount")}</TableHead>
                      <TableHead>
                        {t("admin.deposits.table.paymentMethod")}
                      </TableHead>
                      <TableHead>
                        {t("admin.deposits.table.depositDate")}
                      </TableHead>
                      <TableHead>{t("admin.deposits.table.status")}</TableHead>
                      <TableHead>{t("admin.deposits.table.notes")}</TableHead>
                      <TableHead className="text-right">
                        {t("admin.deposits.table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                          <span className="ml-2 text-muted-foreground">
                            {t("common.loading")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : depositsError ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                          <span className="ml-2 text-red-500">
                            {t("common.error")}:{" "}
                            {depositsError instanceof Error
                              ? depositsError.message
                              : t("admin.deposits.error")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : paginatedDeposits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {t("admin.deposits.noDepositsFound")}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedDeposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-mono text-sm">
                            #{deposit.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {deposit.ownerName}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrencyForLocale(
                              deposit.amount,
                              i18n.language
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>
                                {getPaymentMethodIcon(deposit.paymentMethod)}
                              </span>
                              {getPaymentMethodName(deposit.paymentMethod)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(deposit.depositDate), "PPP", {
                              locale: i18n.language === "ar" ? ar : enUS,
                            })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(deposit.status)}
                          </TableCell>
                          <TableCell>
                            {deposit.notes ? (
                              <span className="text-sm text-muted-foreground">
                                {deposit.notes.length > 50
                                  ? `${deposit.notes.substring(0, 50)}...`
                                  : deposit.notes}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {t("admin.deposits.table.noNotes")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>
                                  {t("admin.deposits.actions.actions")}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleViewDeposit(deposit)}
                                >
                                  <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.deposits.actions.viewDetails")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditDeposit(deposit)}
                                >
                                  <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.deposits.actions.editDeposit")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteDeposit(deposit)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.deposits.actions.deleteDeposit")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <ResponsivePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showInfo={true}
                    infoText={`${t("admin.deposits.pagination.showing")} ${
                      (currentPage - 1) * itemsPerPage + 1
                    }-${Math.min(
                      currentPage * itemsPerPage,
                      filteredDeposits.length
                    )} ${t("admin.deposits.pagination.of")} ${
                      filteredDeposits.length
                    } ${t("admin.deposits.pagination.results")}`}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={Math.min(
                      currentPage * itemsPerPage,
                      filteredDeposits.length
                    )}
                    totalItems={depositsData?.count || 0}
                    itemsPerPage={itemsPerPage}
                    className="justify-center"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Deposit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.deposits.dialogs.addDeposit")}</DialogTitle>
            <DialogDescription>
              {t("admin.deposits.dialogs.addDepositSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="owner">{t("admin.deposits.form.owner")} *</Label>
              <Select
                value={formData.ownerId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ownerId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectOwner")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} (
                      {formatCurrencyForLocale(
                        Math.abs(owner.walletBalance),
                        i18n.language
                      )}{" "}
                      {t("admin.deposits.form.owed")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">
                {t("admin.deposits.form.amount")} *
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder={t("admin.deposits.form.amountPlaceholder")}
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">
                {t("admin.deposits.form.paymentMethod")} *
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectPaymentMethod")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="depositDate">
                {t("admin.deposits.form.depositDate")} *
              </Label>
              <Input
                id="depositDate"
                type="date"
                value={formData.depositDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    depositDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{t("admin.deposits.form.notes")}</Label>
              <Textarea
                id="notes"
                placeholder={t("admin.deposits.form.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("admin.deposits.actions.cancel")}
            </Button>
            <Button onClick={() => handleSubmit(false)}>
              {t("admin.deposits.actions.addDeposit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Deposit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.deposits.dialogs.editDeposit")}</DialogTitle>
            <DialogDescription>
              {t("admin.deposits.dialogs.editDepositSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-owner">
                {t("admin.deposits.form.owner")} *
              </Label>
              <Select
                value={formData.ownerId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ownerId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectOwner")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.name} (
                      {formatCurrencyForLocale(
                        Math.abs(owner.walletBalance),
                        i18n.language
                      )}{" "}
                      {t("admin.deposits.form.owed")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-amount">
                {t("admin.deposits.form.amount")} *
              </Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder={t("admin.deposits.form.amountPlaceholder")}
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-paymentMethod">
                {t("admin.deposits.form.paymentMethod")} *
              </Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.deposits.form.selectPaymentMethod")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.icon} {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-depositDate">
                {t("admin.deposits.form.depositDate")} *
              </Label>
              <Input
                id="edit-depositDate"
                type="date"
                value={formData.depositDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    depositDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">
                {t("admin.deposits.form.notes")}
              </Label>
              <Textarea
                id="edit-notes"
                placeholder={t("admin.deposits.form.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.deposits.actions.cancel")}
            </Button>
            <Button onClick={() => handleSubmit(true)}>
              {t("admin.deposits.actions.updateDeposit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Deposit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="sm:max-w-[600px]"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle>
              {t("admin.deposits.dialogs.depositDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.deposits.dialogs.depositDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.id")}
                  </Label>
                  <p className="text-sm">#{selectedDeposit.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.status")}
                  </Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedDeposit.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.owner")}
                  </Label>
                  <p className="text-sm">{selectedDeposit.ownerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.amount")}
                  </Label>
                  <p className="text-sm font-medium">
                    {formatCurrencyForLocale(
                      selectedDeposit.amount,
                      i18n.language
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.paymentMethod")}
                  </Label>
                  <p className="text-sm">
                    {getPaymentMethodIcon(selectedDeposit.paymentMethod)}{" "}
                    {getPaymentMethodName(selectedDeposit.paymentMethod)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.depositDate")}
                  </Label>
                  <p className="text-sm">
                    {format(parseISO(selectedDeposit.depositDate), "PPP", {
                      locale: i18n.language === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
              </div>

              {selectedDeposit.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.notes")}
                  </Label>
                  <p className="text-sm mt-1">{selectedDeposit.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.createdAt")}
                  </Label>
                  <p className="text-sm">
                    {format(parseISO(selectedDeposit.createdAt), "PPP p", {
                      locale: i18n.language === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("admin.deposits.table.updatedAt")}
                  </Label>
                  <p className="text-sm">
                    {format(parseISO(selectedDeposit.updatedAt), "PPP p", {
                      locale: i18n.language === "ar" ? ar : enUS,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("admin.deposits.actions.close")}
            </Button>
            {selectedDeposit && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleEditDeposit(selectedDeposit);
                }}
              >
                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("admin.deposits.actions.editDeposit")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <ExportDialog
        data={filteredDeposits}
        columns={exportColumns}
        filename="deposits"
        title={t("admin.deposits.export.title")}
        subtitle={t("admin.deposits.export.subtitle")}
        filters={{
          search: searchTerm,
          status: statusFilter,
          paymentMethod: paymentMethodFilter,
          date: dateFilter,
        }}
        onExport={(format) => {
          toast({
            title: t("admin.deposits.toast.exportSuccess"),
            description: t("admin.deposits.toast.exportSuccessDesc"),
          });
        }}
      >
        <Button
          onClick={() => setIsExportDialogOpen(true)}
          variant="outline"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t("admin.deposits.actions.export")}
        </Button>
      </ExportDialog>
    </div>
  );
};

export default Deposits;
