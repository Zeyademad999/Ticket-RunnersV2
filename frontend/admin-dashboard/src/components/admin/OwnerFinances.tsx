import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Loader2,
  AlertCircle,
  Share2,
  Edit,
  Trash2,
  Wallet as WalletIcon,
  UserCog,
  RotateCcw,
  UserX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import {
  formatCurrencyForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import i18n from "@/lib/i18n";
import OwnerWalletCard from "./OwnerWalletCard";

const OwnerFinances = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isRTL = i18n.language === "ar";

  // State for add owner dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");
  const [newOwnerPercentage, setNewOwnerPercentage] = useState("");

  // State for divide profits dialog
  const [isDivideProfitsDialogOpen, setIsDivideProfitsDialogOpen] = useState(false);
  const [profitDistribution, setProfitDistribution] = useState<Record<string, string>>({});
  
  // State for company wallet transaction modal
  const [isCompanyWalletModalOpen, setIsCompanyWalletModalOpen] = useState(false);
  const [companyWalletAmount, setCompanyWalletAmount] = useState("");
  const [companyWalletType, setCompanyWalletType] = useState<"credit" | "debit" | "transfer">("credit");
  const [companyWalletDescription, setCompanyWalletDescription] = useState("");
  const [companyWalletTransferTo, setCompanyWalletTransferTo] = useState<string>("");
  
  // State for owner wallet transaction modal
  const [isOwnerWalletModalOpen, setIsOwnerWalletModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [ownerWalletAmount, setOwnerWalletAmount] = useState("");
  const [ownerWalletType, setOwnerWalletType] = useState<"credit" | "debit" | "transfer">("credit");
  const [ownerWalletDescription, setOwnerWalletDescription] = useState("");
  const [ownerWalletTransferTo, setOwnerWalletTransferTo] = useState<string>("");
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<"wallets" | "owners">("wallets");
  
  // State for edit owner
  const [editingOwner, setEditingOwner] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteOwnerId, setDeleteOwnerId] = useState<string | null>(null);
  
  // Initialize profit distribution with auto-calculated values when dialog opens
  const initializeProfitDistribution = () => {
    if (!revenueSummary || !ownersWithRevenue.length) return;
    
    // Use undistributed profits for distribution
    const undistributed = revenueSummary.undistributed_profits || 0;
    const initialDistribution: Record<string, string> = {};
    
    ownersWithRevenue.forEach((owner: any) => {
      // Auto-calculate based on percentage of undistributed profits
      const calculatedAmount = (undistributed * owner.company_percentage) / 100;
      initialDistribution[owner.id] = calculatedAmount.toFixed(2);
    });
    
    setProfitDistribution(initialDistribution);
  };

  // Fetch owners
  const { data: ownersData, isLoading: ownersLoading } = useQuery({
    queryKey: ["owners"],
    queryFn: () => financesApi.getOwners(),
  });

  // Fetch revenue summary
  const {
    data: revenueSummary,
    isLoading: revenueLoading,
    refetch: refetchRevenue,
  } = useQuery({
    queryKey: ["owners-revenue-summary"],
    queryFn: () => financesApi.getOwnersRevenueSummary(),
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  });

  // Create owner mutation
  const createOwnerMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email?: string;
      phone?: string;
      company_percentage: number;
    }) => {
      return await financesApi.createOwner(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
      setIsAddDialogOpen(false);
      setNewOwnerName("");
      setNewOwnerEmail("");
      setNewOwnerPhone("");
      setNewOwnerPercentage("");
      toast({
        title: t("admin.ownerFinances.ownerAdded"),
        description: t("admin.ownerFinances.ownerAddedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          t("admin.ownerFinances.errorAddingOwner"),
        variant: "destructive",
      });
    },
  });

  // Company wallet transaction mutation
  const companyWalletTransactionMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      transaction_type: "credit" | "debit";
      description?: string;
    }) => {
      return await financesApi.companyWalletTransaction(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
      setIsCompanyWalletModalOpen(false);
      setCompanyWalletAmount("");
      setCompanyWalletDescription("");
      setCompanyWalletTransferTo("");
      toast({
        title: t("admin.ownerFinances.transactionSuccess"),
        description: t("admin.ownerFinances.transactionSuccessDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error ||
          error.message ||
          t("admin.ownerFinances.transactionError"),
        variant: "destructive",
      });
    },
  });

  // Update owner mutation
  const updateOwnerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await financesApi.updateOwner(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
      toast({
        title: t("admin.ownerFinances.ownerUpdated"),
        description: t("admin.ownerFinances.ownerUpdatedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          t("admin.ownerFinances.errorUpdatingOwner"),
        variant: "destructive",
      });
    },
  });

  // Delete owner mutation
  const deleteOwnerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await financesApi.deleteOwner(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
      toast({
        title: t("admin.ownerFinances.ownerDeleted"),
        description: t("admin.ownerFinances.ownerDeletedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          t("admin.ownerFinances.errorDeletingOwner"),
        variant: "destructive",
      });
    },
  });

  // Owner wallet transaction mutation
  const ownerWalletTransactionMutation = useMutation({
    mutationFn: async ({ ownerId, data }: { ownerId: string; data: {
      amount: number;
      transaction_type: "credit" | "debit";
      description?: string;
    }}) => {
      return await financesApi.ownerWalletTransaction(ownerId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      setIsOwnerWalletModalOpen(false);
      setSelectedOwner(null);
      setOwnerWalletAmount("");
      setOwnerWalletDescription("");
      setOwnerWalletTransferTo("");
      toast({
        title: t("admin.ownerFinances.transactionSuccess"),
        description: t("admin.ownerFinances.transactionSuccessDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error ||
          error.message ||
          t("admin.ownerFinances.transactionError"),
        variant: "destructive",
      });
    },
  });

  // Wallet transfer mutation
  const walletTransferMutation = useMutation({
    mutationFn: async (data: {
      from_wallet_type: "owner" | "company";
      from_wallet_id: string;
      to_wallet_type: "owner" | "company";
      to_wallet_id: string;
      amount: number;
      description?: string;
    }) => {
      return await financesApi.walletTransfer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
      queryClient.invalidateQueries({ queryKey: ["owners"] });
      setIsCompanyWalletModalOpen(false);
      setIsOwnerWalletModalOpen(false);
      setCompanyWalletAmount("");
      setCompanyWalletDescription("");
      setCompanyWalletTransferTo("");
      setOwnerWalletAmount("");
      setOwnerWalletDescription("");
      setOwnerWalletTransferTo("");
      setSelectedOwner(null);
      toast({
        title: t("admin.ownerFinances.transferSuccess"),
        description: t("admin.ownerFinances.transferSuccessDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error ||
          error.message ||
          t("admin.ownerFinances.transferError"),
        variant: "destructive",
      });
    },
  });

  // Combine owners with revenue data
  const ownersWithRevenue = useMemo(() => {
    if (!ownersData?.results && !ownersData) return [];
    const owners = ownersData.results || ownersData || [];
    const revenueOwners = revenueSummary?.owners || [];

    return owners.map((owner: any) => {
      const revenueData = revenueOwners.find(
        (r: any) => r.owner_id === owner.id
      );
      return {
        ...owner,
        wallet_balance: revenueData?.wallet_balance || owner.wallet?.balance || 0,
        owner_share: revenueData?.owner_share || 0,
        card_number: owner.card_number || revenueData?.card_number || "0000 0000 0000 0000",
      };
    });
  }, [ownersData, revenueSummary]);

  // Calculate total percentage
  const totalPercentage = useMemo(() => {
    return ownersWithRevenue.reduce(
      (sum: number, owner: any) => sum + parseFloat(owner.company_percentage || 0),
      0
    );
  }, [ownersWithRevenue]);

  // Handle add owner
  const handleAddOwner = () => {
    if (!newOwnerName.trim()) {
      toast({
        title: t("admin.ownerFinances.validation.error"),
        description: t("admin.ownerFinances.validation.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    const percentage = parseFloat(newOwnerPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      toast({
        title: t("admin.ownerFinances.validation.error"),
        description: t("admin.ownerFinances.validation.invalidPercentage"),
        variant: "destructive",
      });
      return;
    }

    if (totalPercentage + percentage > 100) {
      toast({
        title: t("admin.ownerFinances.validation.error"),
        description: t("admin.ownerFinances.validation.totalExceeded"),
        variant: "destructive",
      });
      return;
    }

    createOwnerMutation.mutate({
      name: newOwnerName.trim(),
      email: newOwnerEmail.trim() || undefined,
      phone: newOwnerPhone.trim() || undefined,
      company_percentage: percentage,
    });
  };

  const isLoading = ownersLoading || revenueLoading;
  const cardRevenue = revenueSummary?.card_revenue || 0;
  const ticketRunnerFee = revenueSummary?.ticket_runner_fee || 0;
  const companyWalletBalance = revenueSummary?.company_wallet_balance || 0;
  // Total TR Revenue = Commission + Card Revenue (not total ticket revenue)
  const totalTRRevenue = revenueSummary?.total_tr_revenue || (ticketRunnerFee + cardRevenue);
  const totalDistributedProfits = revenueSummary?.total_distributed_profits || 0;
  const undistributedProfits = revenueSummary?.undistributed_profits || 0;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.ownerFinances.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.ownerFinances.description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("admin.ownerFinances.addOwner")}
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t("admin.ownerFinances.addOwner")}</DialogTitle>
              <DialogDescription>
                {t("admin.ownerFinances.addOwnerDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {t("admin.ownerFinances.name")} *
                </Label>
                <Input
                  id="name"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder={t("admin.ownerFinances.namePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("admin.ownerFinances.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder={t("admin.ownerFinances.emailPlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t("admin.ownerFinances.phone")}</Label>
                <Input
                  id="phone"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  placeholder={t("admin.ownerFinances.phonePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="percentage">
                  {t("admin.ownerFinances.companyPercentage")} * (Remaining: {100 - totalPercentage}%)
                </Label>
                <Input
                  id="percentage"
                  type="number"
                  min="0"
                  max={100 - totalPercentage}
                  step="0.01"
                  value={newOwnerPercentage}
                  onChange={(e) => setNewOwnerPercentage(e.target.value)}
                  placeholder={t("admin.ownerFinances.percentagePlaceholder")}
                />
              </div>
              <Button
                onClick={handleAddOwner}
                disabled={createOwnerMutation.isPending}
              >
                {createOwnerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  t("admin.ownerFinances.addOwner")
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog 
          open={isDivideProfitsDialogOpen} 
          onOpenChange={(open) => {
            setIsDivideProfitsDialogOpen(open);
            if (open) {
              // Check if there are undistributed profits
              if (undistributedProfits <= 0) {
                toast({
                  title: t("admin.ownerFinances.noProfitsToDistribute"),
                  description: t("admin.ownerFinances.noProfitsToDistributeDesc"),
                  variant: "destructive",
                });
                setIsDivideProfitsDialogOpen(false);
                return;
              }
              initializeProfitDistribution();
            } else {
              setProfitDistribution({});
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("admin.ownerFinances.divideProfits")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px]" dir={isRTL ? "rtl" : "ltr"}>
            <DialogHeader>
              <DialogTitle>{t("admin.ownerFinances.divideProfits")}</DialogTitle>
              <DialogDescription>
                {t("admin.ownerFinances.divideProfitsDescription")}
              </DialogDescription>
            </DialogHeader>
            {undistributedProfits <= 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">{t("admin.ownerFinances.noProfitsToDistribute")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("admin.ownerFinances.noProfitsToDistributeDesc")}
                </p>
              </div>
            ) : (
            <div className="grid gap-4 py-4">
              {/* Total Revenue Display */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{t("admin.ownerFinances.totalRevenue")}:</span>
                  <span className="text-lg font-bold">
                    {formatCurrencyForLocale(totalTRRevenue, i18nInstance.language)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("admin.ownerFinances.stats.undistributedProfits")}:</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrencyForLocale(undistributedProfits, i18nInstance.language)}
                  </span>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-3">
                {ownersWithRevenue.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    {t("admin.ownerFinances.noOwnersToDivide")}
                  </p>
                ) : (
                  ownersWithRevenue.map((owner: any) => {
                    const calculatedAmount = (undistributedProfits * owner.company_percentage) / 100;
                    return (
                      <div key={owner.id} className="grid gap-2 p-3 border rounded-lg">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`profit-${owner.id}`} className="font-semibold block">
                              {owner.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {owner.company_percentage}% share ({formatCurrencyForLocale(calculatedAmount, i18nInstance.language)})
                            </p>
                          </div>
                          <div className="w-40 flex-shrink-0">
                            <Input
                              id={`profit-${owner.id}`}
                              type="number"
                              step="0.01"
                              value={profitDistribution[owner.id] || ""}
                              onChange={(e) =>
                                setProfitDistribution((prev) => ({
                                  ...prev,
                                  [owner.id]: e.target.value,
                                }))
                              }
                              placeholder="0.00"
                              className="text-right"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Company Wallet (Remaining Amount) */}
              {(() => {
                const totalDistributed = Object.values(profitDistribution).reduce(
                  (sum, val) => sum + parseFloat(val as string || "0"),
                  0
                );
                const remaining = undistributedProfits - totalDistributed;
                return (
                  <div className="p-4 bg-primary/10 border-2 border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{t("admin.ownerFinances.ticketRunnersWallet")}</span>
                        <p className="text-xs text-muted-foreground">
                          {t("admin.ownerFinances.remainingAmount")}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrencyForLocale(remaining, i18nInstance.language)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Summary */}
              {(() => {
                const totalDistributed = Object.values(profitDistribution).reduce(
                  (sum, val) => sum + parseFloat(val as string || "0"),
                  0
                );
                return (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-medium">{t("admin.ownerFinances.totalDistributed")}:</span>
                    <span className="font-semibold">
                      {formatCurrencyForLocale(totalDistributed, i18nInstance.language)}
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={async () => {
                    // Check if there are undistributed profits
                    if (undistributedProfits <= 0) {
                      toast({
                        title: t("admin.ownerFinances.noProfitsToDistribute"),
                        description: t("admin.ownerFinances.noProfitsToDistributeDesc"),
                        variant: "destructive",
                      });
                      return;
                    }

                    // Calculate total (allow negative totals for cases where someone receives more than their share)
                    const total = Object.values(profitDistribution).reduce(
                      (sum, val) => sum + parseFloat(val as string || "0"),
                      0
                    );
                    // Note: We allow negative totals and totals exceeding undistributed profits
                    // to support cases where someone receives more than their share

                    try {
                      // Prepare distributions
                      const distributions = Object.entries(profitDistribution).map(([ownerId, amount]) => ({
                        owner_id: ownerId,
                        amount: parseFloat(amount as string || "0"),
                      }));

                      // Call API
                      await financesApi.distributeProfits({
                        distributions,
                        total_revenue: undistributedProfits, // Use undistributed amount
                      });

                      // Refresh data
                      queryClient.invalidateQueries({ queryKey: ["owners"] });
                      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });

                      toast({
                        title: t("admin.ownerFinances.profitsDistributed"),
                        description: t("admin.ownerFinances.profitsDistributedDesc"),
                      });
                      setIsDivideProfitsDialogOpen(false);
                      setProfitDistribution({});
                    } catch (error: any) {
                      toast({
                        title: t("common.error"),
                        description:
                          error.response?.data?.error ||
                          error.message ||
                          t("admin.ownerFinances.errorDistributing"),
                        variant: "destructive",
                      });
                    }
                  }}
                  className="flex-1"
                >
                  {t("admin.ownerFinances.distribute")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDivideProfitsDialogOpen(false);
                    setProfitDistribution({});
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.ownerFinances.stats.totalTRRevenue")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                formatCurrencyForLocale(totalTRRevenue, i18nInstance.language)
              )}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.ownerFinances.stats.eventCommissionsAndCardRevenue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.ownerFinances.stats.distributedProfits")}
              </CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                formatCurrencyForLocale(totalDistributedProfits, i18nInstance.language)
              )}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.ownerFinances.stats.alreadyDistributed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.ownerFinances.stats.undistributedProfits")}
              </CardTitle>
            </div>
            <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className={`text-2xl font-bold ${undistributedProfits === 0 ? 'text-muted-foreground' : 'text-orange-600'}`}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                formatCurrencyForLocale(undistributedProfits, i18nInstance.language)
              )}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.ownerFinances.stats.availableToDistribute")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.ownerFinances.stats.eventCommissions")}
              </CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                formatCurrencyForLocale(ticketRunnerFee, i18nInstance.language)
              )}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.ownerFinances.stats.fromEventCommissions")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.ownerFinances.stats.cardRevenue")}
              </CardTitle>
            </div>
            <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                formatCurrencyForLocale(cardRevenue, i18nInstance.language)
              )}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.ownerFinances.stats.fromCardRevenue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.ownerFinances.stats.totalOwners")}
              </CardTitle>
            </div>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                ownersWithRevenue.length
              )}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.ownerFinances.stats.totalAllocated")}: {totalPercentage.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Percentage Warning */}
      {totalPercentage > 100 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">
              {t("admin.ownerFinances.validation.totalExceeded")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.ownerFinances.validation.totalExceededDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Tabs for Wallets and Owners Management */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "wallets" | "owners")}>
        <TabsList>
          <TabsTrigger value="wallets">
            <WalletIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t("admin.ownerFinances.wallets")}
          </TabsTrigger>
          <TabsTrigger value="owners">
            <UserCog className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
            {t("admin.ownerFinances.manageOwners")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="mt-6">
          {/* Wallet Cards Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Company Wallet Card (Ticket Runners Wallet) - Always shown first */}
              <OwnerWalletCard
                owner={{
                  id: "company-wallet",
                  name: "Ticket Runners",
                  company_percentage: 0,
                  wallet_balance: companyWalletBalance,
                  card_number: "0000 0000 0000 0000",
                }}
                isRTL={isRTL}
                isCompanyWallet={true}
                onClick={() => setIsCompanyWalletModalOpen(true)}
              />
              {/* Owner Wallet Cards */}
              {ownersWithRevenue.length === 0 ? (
                <Card className="col-span-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      {t("admin.ownerFinances.noOwners")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("admin.ownerFinances.noOwnersDescription")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                ownersWithRevenue.map((owner: any) => (
                  <OwnerWalletCard 
                    key={owner.id} 
                    owner={owner} 
                    isRTL={isRTL}
                    onClick={() => {
                      setSelectedOwner(owner);
                      setIsOwnerWalletModalOpen(true);
                    }}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="owners" className="mt-6">
          {/* Owners Management Table */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ownersWithRevenue.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {t("admin.ownerFinances.noOwners")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("admin.ownerFinances.noOwnersDescription")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-semibold">{t("admin.ownerFinances.name")}</th>
                          <th className="text-left p-4 font-semibold">{t("admin.ownerFinances.email")}</th>
                          <th className="text-left p-4 font-semibold">{t("admin.ownerFinances.phone")}</th>
                          <th className="text-left p-4 font-semibold">{t("admin.ownerFinances.companyPercentage")}</th>
                          <th className="text-left p-4 font-semibold">{t("admin.ownerFinances.walletBalance")}</th>
                          <th className="text-right p-4 font-semibold">{t("common.actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownersWithRevenue.map((owner: any) => (
                          <tr key={owner.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">{owner.name}</td>
                            <td className="p-4">{owner.email || "-"}</td>
                            <td className="p-4">{owner.phone || "-"}</td>
                            <td className="p-4">{owner.company_percentage}%</td>
                            <td className="p-4">
                              {formatCurrencyForLocale(owner.wallet_balance || 0, i18nInstance.language)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingOwner(owner);
                                    setIsEditDialogOpen(true);
                                  }}
                                  title={t("admin.ownerFinances.editOwner")}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await financesApi.resetOwnerWallet(owner.id);
                                      queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
                                      queryClient.invalidateQueries({ queryKey: ["owners"] });
                                      toast({
                                        title: t("admin.ownerFinances.walletReset"),
                                        description: t("admin.ownerFinances.walletResetDesc"),
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: t("common.error"),
                                        description: error.response?.data?.error || error.message || t("admin.ownerFinances.walletResetError"),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  title={t("admin.ownerFinances.resetWallet")}
                                >
                                  <RotateCcw className="h-4 w-4 text-orange-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    if (confirm(t("admin.ownerFinances.deleteWalletConfirmation"))) {
                                      try {
                                        await financesApi.deleteOwnerWallet(owner.id);
                                        queryClient.invalidateQueries({ queryKey: ["owners-revenue-summary"] });
                                        queryClient.invalidateQueries({ queryKey: ["owners"] });
                                        toast({
                                          title: t("admin.ownerFinances.walletDeleted"),
                                          description: t("admin.ownerFinances.walletDeletedDesc"),
                                        });
                                      } catch (error: any) {
                                        toast({
                                          title: t("common.error"),
                                          description: error.response?.data?.error || error.message || t("admin.ownerFinances.walletDeleteError"),
                                          variant: "destructive",
                                        });
                                      }
                                    }
                                  }}
                                  title={t("admin.ownerFinances.deleteWallet")}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteOwnerId(owner.id)}
                                  title={t("admin.ownerFinances.deleteOwner")}
                                >
                                  <UserX className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Company Wallet Transaction Modal */}
      <Dialog open={isCompanyWalletModalOpen} onOpenChange={setIsCompanyWalletModalOpen}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("admin.ownerFinances.companyWalletTransaction")}</DialogTitle>
            <DialogDescription>
              {t("admin.ownerFinances.companyWalletTransactionDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("admin.ownerFinances.transactionType")}</Label>
              <Select
                value={companyWalletType}
                onValueChange={(v) => {
                  setCompanyWalletType(v as "credit" | "debit" | "transfer");
                  if (v !== "transfer") {
                    setCompanyWalletTransferTo("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">{t("admin.ownerFinances.credit")}</SelectItem>
                  <SelectItem value="debit">{t("admin.ownerFinances.debit")}</SelectItem>
                  <SelectItem value="transfer">{t("admin.ownerFinances.transfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {companyWalletType === "transfer" && (
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.transferTo")}</Label>
                <Select
                  value={companyWalletTransferTo}
                  onValueChange={setCompanyWalletTransferTo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.ownerFinances.selectDestination")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ownersWithRevenue.map((owner: any) => (
                      <SelectItem key={owner.id} value={`owner-${owner.id}`}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t("admin.ownerFinances.amount")} *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={companyWalletAmount}
                onChange={(e) => setCompanyWalletAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("admin.ownerFinances.description")}</Label>
              <Textarea
                value={companyWalletDescription}
                onChange={(e) => setCompanyWalletDescription(e.target.value)}
                placeholder={t("admin.ownerFinances.descriptionPlaceholder")}
                rows={3}
              />
            </div>
            <Button
              onClick={() => {
                const amount = parseFloat(companyWalletAmount);
                if (isNaN(amount) || amount <= 0) {
                  toast({
                    title: t("admin.ownerFinances.validation.error"),
                    description: t("admin.ownerFinances.validation.invalidAmount"),
                    variant: "destructive",
                  });
                  return;
                }
                
                if (companyWalletType === "transfer") {
                  if (!companyWalletTransferTo) {
                    toast({
                      title: t("admin.ownerFinances.validation.error"),
                      description: t("admin.ownerFinances.validation.selectDestination"),
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (companyWalletBalance < amount) {
                    toast({
                      title: t("admin.ownerFinances.validation.error"),
                      description: t("admin.ownerFinances.validation.insufficientBalance"),
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const [toType, toId] = companyWalletTransferTo.split("-");
                  walletTransferMutation.mutate({
                    from_wallet_type: "company",
                    from_wallet_id: "company",
                    to_wallet_type: toType as "owner",
                    to_wallet_id: toId,
                    amount,
                    description: companyWalletDescription || undefined,
                  });
                } else {
                  companyWalletTransactionMutation.mutate({
                    amount,
                    transaction_type: companyWalletType as "credit" | "debit",
                    description: companyWalletDescription || undefined,
                  });
                }
              }}
              disabled={companyWalletTransactionMutation.isPending || walletTransferMutation.isPending}
            >
              {(companyWalletTransactionMutation.isPending || walletTransferMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                  {t("common.processing")}
                </>
              ) : (
                companyWalletType === "transfer" ? t("admin.ownerFinances.transfer") : t("admin.ownerFinances.processTransaction")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owner Wallet Transaction Modal */}
      <Dialog open={isOwnerWalletModalOpen} onOpenChange={(open) => {
        setIsOwnerWalletModalOpen(open);
        if (!open) {
          setSelectedOwner(null);
          setOwnerWalletAmount("");
          setOwnerWalletDescription("");
          setOwnerWalletTransferTo("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {t("admin.ownerFinances.ownerWalletTransaction")} - {selectedOwner?.name}
            </DialogTitle>
            <DialogDescription>
              {t("admin.ownerFinances.ownerWalletTransactionDesc")}
            </DialogDescription>
          </DialogHeader>
          {selectedOwner && (
            <div className="grid gap-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  {t("admin.ownerFinances.currentBalance")}
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrencyForLocale(selectedOwner.wallet_balance || 0, i18nInstance.language)}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.transactionType")}</Label>
                <Select
                  value={ownerWalletType}
                  onValueChange={(v) => setOwnerWalletType(v as "credit" | "debit")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">{t("admin.ownerFinances.credit")}</SelectItem>
                    <SelectItem value="debit">{t("admin.ownerFinances.debit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.amount")} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ownerWalletAmount}
                  onChange={(e) => setOwnerWalletAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.description")}</Label>
                <Textarea
                  value={ownerWalletDescription}
                  onChange={(e) => setOwnerWalletDescription(e.target.value)}
                  placeholder={t("admin.ownerFinances.descriptionPlaceholder")}
                  rows={3}
                />
              </div>
              <Button
                onClick={() => {
                  const amount = parseFloat(ownerWalletAmount);
                  if (isNaN(amount) || amount <= 0) {
                    toast({
                      title: t("admin.ownerFinances.validation.error"),
                      description: t("admin.ownerFinances.validation.invalidAmount"),
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  if (ownerWalletType === "transfer") {
                    if (!ownerWalletTransferTo) {
                      toast({
                        title: t("admin.ownerFinances.validation.error"),
                        description: t("admin.ownerFinances.validation.selectDestination"),
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    if ((selectedOwner.wallet_balance || 0) < amount) {
                      toast({
                        title: t("admin.ownerFinances.validation.error"),
                        description: t("admin.ownerFinances.validation.insufficientBalance"),
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    const [toType, toId] = ownerWalletTransferTo.split("-");
                    walletTransferMutation.mutate({
                      from_wallet_type: "owner",
                      from_wallet_id: selectedOwner.id,
                      to_wallet_type: toType as "owner" | "company",
                      to_wallet_id: toId,
                      amount,
                      description: ownerWalletDescription || undefined,
                    });
                  } else {
                    ownerWalletTransactionMutation.mutate({
                      ownerId: selectedOwner.id,
                      data: {
                        amount,
                        transaction_type: ownerWalletType as "credit" | "debit",
                        description: ownerWalletDescription || undefined,
                      },
                    });
                  }
                }}
                disabled={ownerWalletTransactionMutation.isPending || walletTransferMutation.isPending}
              >
                {(ownerWalletTransactionMutation.isPending || walletTransferMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                    {t("common.processing")}
                  </>
                ) : (
                  ownerWalletType === "transfer" ? t("admin.ownerFinances.transfer") : t("admin.ownerFinances.processTransaction")
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Owner Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("admin.ownerFinances.editOwner")}</DialogTitle>
            <DialogDescription>
              {t("admin.ownerFinances.editOwnerDescription")}
            </DialogDescription>
          </DialogHeader>
          {editingOwner && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.name")} *</Label>
                <Input
                  id="edit-name"
                  value={editingOwner.name || ""}
                  onChange={(e) =>
                    setEditingOwner({ ...editingOwner, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingOwner.email || ""}
                  onChange={(e) =>
                    setEditingOwner({ ...editingOwner, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("admin.ownerFinances.phone")}</Label>
                <Input
                  id="edit-phone"
                  value={editingOwner.phone || ""}
                  onChange={(e) =>
                    setEditingOwner({ ...editingOwner, phone: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>
                  {t("admin.ownerFinances.companyPercentage")} * (Remaining:{" "}
                  {100 -
                    totalPercentage +
                    parseFloat(editingOwner.company_percentage || 0)}
                  %)
                </Label>
                <Input
                  id="edit-percentage"
                  type="number"
                  min="0"
                  max={
                    100 -
                    totalPercentage +
                    parseFloat(editingOwner.company_percentage || 0)
                  }
                  step="0.01"
                  value={editingOwner.company_percentage || ""}
                  onChange={(e) =>
                    setEditingOwner({
                      ...editingOwner,
                      company_percentage: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                onClick={() => {
                  const percentage = parseFloat(editingOwner.company_percentage);
                  if (
                    isNaN(percentage) ||
                    percentage <= 0 ||
                    percentage > 100
                  ) {
                    toast({
                      title: t("admin.ownerFinances.validation.error"),
                      description: t("admin.ownerFinances.validation.invalidPercentage"),
                      variant: "destructive",
                    });
                    return;
                  }
                  const otherOwnersTotal =
                    totalPercentage - parseFloat(editingOwner.company_percentage || 0);
                  if (otherOwnersTotal + percentage > 100) {
                    toast({
                      title: t("admin.ownerFinances.validation.error"),
                      description: t("admin.ownerFinances.validation.totalExceeded"),
                      variant: "destructive",
                    });
                    return;
                  }
                  updateOwnerMutation.mutate({
                    id: editingOwner.id,
                    data: {
                      name: editingOwner.name.trim(),
                      email: editingOwner.email?.trim() || undefined,
                      phone: editingOwner.phone?.trim() || undefined,
                      company_percentage: percentage,
                    },
                  });
                  setIsEditDialogOpen(false);
                  setEditingOwner(null);
                }}
                disabled={updateOwnerMutation.isPending}
              >
                {updateOwnerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                    {t("common.saving")}
                  </>
                ) : (
                  t("common.save")
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Owner Confirmation */}
      <AlertDialog
        open={!!deleteOwnerId}
        onOpenChange={(open) => !open && setDeleteOwnerId(null)}
      >
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.ownerFinances.deleteOwner")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.ownerFinances.deleteOwnerDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteOwnerId) {
                  deleteOwnerMutation.mutate(deleteOwnerId);
                  setDeleteOwnerId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OwnerFinances;

