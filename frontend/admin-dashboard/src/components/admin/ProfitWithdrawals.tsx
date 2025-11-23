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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  DollarSign,
  TrendingDown,
  Calendar,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import i18n from "@/lib/i18n";
import { formatNumberForLocale, formatCurrencyForLocale } from "@/lib/utils";

interface Owner {
  id: string;
  name: string;
  email: string;
  profitShare: number;
  currentBalance: number;
  liability: number;
}

interface Withdrawal {
  id: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  paymentMethod: string;
  date: string;
  status: "pending" | "completed" | "rejected";
  notes: string;
  type: "profit" | "liability";
}

const ProfitWithdrawals = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch profit withdrawals from API
  const { data: withdrawalsData, isLoading: withdrawalsLoading, error: withdrawalsError } = useQuery({
    queryKey: ['profitWithdrawals', searchTerm, statusFilter, dateFrom, dateTo, currentPage, itemsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      return await financesApi.getProfitWithdrawals(params);
    },
  });

  // Transform API withdrawals to match Withdrawal interface
  const withdrawals: Withdrawal[] = useMemo(() => {
    if (!withdrawalsData?.results) return [];
    return withdrawalsData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      ownerId: item.owner?.id?.toString() || item.owner_id?.toString() || '',
      ownerName: item.owner?.name || item.owner_name || '',
      amount: parseFloat(item.amount) || 0,
      paymentMethod: item.payment_method || item.paymentMethod || '',
      date: item.date || item.withdrawal_date || item.created_at || '',
      status: (item.status || 'pending') as "pending" | "completed" | "rejected",
      notes: item.notes || '',
      type: (item.type || 'profit') as "profit" | "liability",
    }));
  }, [withdrawalsData]);

  // Extract unique owners from withdrawals
  const owners: Owner[] = useMemo(() => {
    const ownerMap = new Map<string, Owner>();
    withdrawals.forEach((withdrawal) => {
      if (withdrawal.ownerId && withdrawal.ownerName) {
        if (!ownerMap.has(withdrawal.ownerId)) {
          ownerMap.set(withdrawal.ownerId, {
            id: withdrawal.ownerId,
            name: withdrawal.ownerName,
            email: '',
            profitShare: 0,
            currentBalance: 0,
            liability: 0,
          });
        }
        const owner = ownerMap.get(withdrawal.ownerId)!;
        if (withdrawal.type === 'profit') {
          owner.profitShare += withdrawal.amount;
        } else {
          owner.liability += withdrawal.amount;
        }
      }
    });
    return Array.from(ownerMap.values());
  }, [withdrawals]);

  // Use API data only
  const ownersToUse = owners;
  const finalWithdrawals = withdrawals;

  const queryClient = useQueryClient();
  // Calculate company wallet from withdrawals data or use 0 if not available
  const companyWallet = useMemo(() => {
    // TODO: Get company wallet balance from API if available
    // For now, calculate from completed withdrawals or use 0
    return 0; // Will be updated when API provides this data
  }, [withdrawalsData]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [showWarning, setShowWarning] = useState(false);

  const totalWithdrawals = finalWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  const pendingWithdrawals = finalWithdrawals
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + w.amount, 0);
  const avgWithdrawal =
    finalWithdrawals.length > 0 ? totalWithdrawals / finalWithdrawals.length : 0;

  const handleWithdrawal = () => {
    if (!selectedOwner || !withdrawalAmount || !paymentMethod) {
      toast.error(t("admin.profitWithdrawals.fillRequiredFields"));
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    const owner = ownersToUse.find((o) => o.id === selectedOwner);

    if (!owner) {
      toast.error(t("admin.profitWithdrawals.ownerNotFound"));
      return;
    }

    // Check if withdrawal exceeds available profit share
    const availableBalance = owner.profitShare - owner.liability;
    const excessAmount =
      amount > availableBalance ? amount - availableBalance : 0;
    const withdrawalType = excessAmount > 0 ? "liability" : "profit";

    if (excessAmount > 0) {
      toast.warning(
        t("admin.profitWithdrawals.exceedsShareWarning", {
          amount: formatNumberForLocale(excessAmount, i18n.language),
        })
      );
    }

    // Create new withdrawal
    const newWithdrawal: Withdrawal = {
      id: Date.now().toString(),
      ownerId: selectedOwner,
      ownerName: owner.name,
      amount: amount,
      paymentMethod: paymentMethod,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      notes: notes,
      type: withdrawalType,
    };

    // Update owner's balance and liability
    const updatedOwners = ownersToUse.map((o) => {
      if (o.id === selectedOwner) {
        return {
          ...o,
          currentBalance: o.currentBalance + amount,
          liability: o.liability + excessAmount,
        };
      }
      return o;
    });

    // TODO: Implement API mutation to create withdrawal
    // This would require a POST endpoint for profit withdrawals
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['profitWithdrawals'] });

    // Reset form
    setSelectedOwner("");
    setWithdrawalAmount("");
    setPaymentMethod("");
    setNotes("");
    setShowWarning(false);
    setIsDialogOpen(false);

    toast.success(t("admin.profitWithdrawals.withdrawalCreated"));
  };

  const handleStatusChange = (
    withdrawalId: string,
    newStatus: "completed" | "rejected"
  ) => {
    // Invalidate queries to refetch data after status change
    queryClient.invalidateQueries({ queryKey: ['profitWithdrawals'] });
    toast.success(
      newStatus === "completed"
        ? t("admin.profitWithdrawals.withdrawalApproved")
        : t("admin.profitWithdrawals.withdrawalRejected")
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t("admin.profitWithdrawals.status.completed")}
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            {t("admin.profitWithdrawals.status.pending")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {t("admin.profitWithdrawals.status.rejected")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.profitWithdrawals")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.profitWithdrawals.subtitle")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.profitWithdrawals.newWithdrawal")}
              </span>
              <span className="sm:hidden">
                {t("admin.profitWithdrawals.newWithdrawal")}
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px]"
            dir={i18n.language === "ar" ? "rtl" : "ltr"}
          >
            <DialogHeader>
              <DialogTitle>
                {t("admin.profitWithdrawals.createWithdrawal")}
              </DialogTitle>
              <DialogDescription>
                {t("admin.profitWithdrawals.createWithdrawalDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="owner">
                  {t("admin.profitWithdrawals.owner")}
                </Label>
                <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.profitWithdrawals.selectOwner")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {ownersToUse.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>
                        {owner.name} -{" "}
                        {formatCurrencyForLocale(
                          owner.profitShare,
                          i18n.language
                        )}{" "}
                        {t("admin.profitWithdrawals.profitShare").toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">
                  {t("admin.profitWithdrawals.amount")}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={withdrawalAmount}
                  onChange={(e) => {
                    setWithdrawalAmount(e.target.value);
                    const amount = parseFloat(e.target.value) || 0;
                    const owner = ownersToUse.find((o) => o.id === selectedOwner);
                    if (owner && amount > owner.profitShare - owner.liability) {
                      setShowWarning(true);
                    } else {
                      setShowWarning(false);
                    }
                  }}
                  placeholder={t("admin.profitWithdrawals.enterAmount")}
                />
                {showWarning && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t("admin.profitWithdrawals.exceedsWarning")}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">
                  {t("admin.profitWithdrawals.paymentMethod")}
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "admin.profitWithdrawals.selectPaymentMethod"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bank Transfer">
                      {t("admin.profitWithdrawals.bankTransfer")}
                    </SelectItem>
                    <SelectItem value="PayPal">
                      {t("admin.profitWithdrawals.paypal")}
                    </SelectItem>
                    <SelectItem value="Check">
                      {t("admin.profitWithdrawals.check")}
                    </SelectItem>
                    <SelectItem value="Wire Transfer">
                      {t("admin.profitWithdrawals.wireTransfer")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">
                  {t("admin.profitWithdrawals.notes")}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("admin.profitWithdrawals.optionalNotes")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t("admin.profitWithdrawals.cancel")}
              </Button>
              <Button onClick={handleWithdrawal}>
                {t("admin.profitWithdrawals.createWithdrawalButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitWithdrawals.stats.totalWithdrawals")}
              </CardTitle>
            </div>
            <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(totalWithdrawals, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.profitWithdrawals.stats.allTimeWithdrawals")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitWithdrawals.stats.pendingWithdrawals")}
              </CardTitle>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(pendingWithdrawals, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.profitWithdrawals.stats.awaitingProcessing")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitWithdrawals.stats.companyWallet")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(companyWallet, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.profitWithdrawals.stats.availableBalance")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitWithdrawals.stats.avgWithdrawal")}
              </CardTitle>
            </div>
            <TrendingDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(avgWithdrawal, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.profitWithdrawals.stats.perWithdrawal")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Owner Balances */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.profitWithdrawals.ownerBalances")}</CardTitle>
          <CardDescription>
            {t("admin.profitWithdrawals.ownerBalancesDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownersToUse.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.profitWithdrawals.noOwners") || "No owners found"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownersToUse.map((owner) => (
              <Card key={owner.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">{owner.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {owner.email}
                    </p>
                  </div>
                  {owner.liability > 0 && (
                    <Badge className="bg-red-100 text-red-800">
                      {t("admin.profitWithdrawals.liability")}:{" "}
                      {formatCurrencyForLocale(owner.liability, i18n.language)}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">
                      {t("admin.profitWithdrawals.profitShare")}:
                    </span>
                    <span className="font-medium">
                      {formatCurrencyForLocale(
                        owner.profitShare,
                        i18n.language
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">
                      {t("admin.profitWithdrawals.currentBalance")}:
                    </span>
                    <span className="font-medium">
                      {formatCurrencyForLocale(
                        owner.currentBalance,
                        i18n.language
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">
                      {t("admin.profitWithdrawals.available")}:
                    </span>
                    <span className="font-medium">
                      {formatCurrencyForLocale(
                        owner.profitShare - owner.liability,
                        i18n.language
                      )}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("admin.profitWithdrawals.withdrawalHistory")}
          </CardTitle>
          <CardDescription>
            {t("admin.profitWithdrawals.withdrawalHistoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table dir={i18n.language === "ar" ? "rtl" : "ltr"}>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t("admin.profitWithdrawals.ownerColumn")}
                </TableHead>
                <TableHead>
                  {t("admin.profitWithdrawals.amountColumn")}
                </TableHead>
                <TableHead>
                  {t("admin.profitWithdrawals.paymentMethodColumn")}
                </TableHead>
                <TableHead>{t("admin.profitWithdrawals.dateColumn")}</TableHead>
                <TableHead>{t("admin.profitWithdrawals.typeColumn")}</TableHead>
                <TableHead>
                  {t("admin.profitWithdrawals.statusColumn")}
                </TableHead>
                <TableHead>
                  {t("admin.profitWithdrawals.notesColumn")}
                </TableHead>
                <TableHead>
                  {t("admin.profitWithdrawals.actionsColumn")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalsLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">{t("common.loading")}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : withdrawalsError ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-red-500">
                    {t("common.errorLoadingData")}
                  </TableCell>
                </TableRow>
              ) : finalWithdrawals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t("admin.profitWithdrawals.noWithdrawals")}
                  </TableCell>
                </TableRow>
              ) : (
                finalWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell className="font-medium">
                    {withdrawal.ownerName}
                  </TableCell>
                  <TableCell>
                    {formatCurrencyForLocale(withdrawal.amount, i18n.language)}
                  </TableCell>
                  <TableCell>{withdrawal.paymentMethod}</TableCell>
                  <TableCell>{withdrawal.date}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        withdrawal.type === "liability"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {withdrawal.type === "liability"
                        ? t("admin.profitWithdrawals.liabilityType")
                        : t("admin.profitWithdrawals.profitType")}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {withdrawal.notes}
                  </TableCell>
                  <TableCell>
                    {withdrawal.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(withdrawal.id, "completed")
                          }
                        >
                          {t("admin.profitWithdrawals.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusChange(withdrawal.id, "rejected")
                          }
                        >
                          {t("admin.profitWithdrawals.reject")}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitWithdrawals;
