import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financesApi } from "@/lib/api/adminApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Share2,
  DollarSign,
  Users,
  TrendingUp,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  formatCurrencyForLocale,
  formatNumberForLocale,
  formatPercentageForLocale,
} from "@/lib/utils";
import i18n from "@/lib/i18n";

interface Owner {
  id: string;
  name: string;
  email: string;
  profitShare: number;
  currentBalance: number;
  isActive: boolean;
}

const ProfitShareManagement = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch profit share data from API
  const { data: profitShareData, isLoading: profitShareLoading, error: profitShareError } = useQuery({
    queryKey: ['profitShare', dateFrom, dateTo],
    queryFn: () => financesApi.getProfitShare({ start_date: dateFrom, end_date: dateTo }),
  });

  // Transform API data to match Owner interface
  const owners: Owner[] = useMemo(() => {
    if (!profitShareData?.owners && !profitShareData?.results) return [];
    const ownersData = profitShareData.owners || profitShareData.results || [];
    return ownersData.map((item: any) => ({
      id: item.id?.toString() || '',
      name: item.name || item.owner_name || '',
      email: item.email || item.owner_email || '',
      profitShare: parseFloat(item.profit_share || item.profitShare || 0),
      currentBalance: parseFloat(item.current_balance || item.currentBalance || 0),
      isActive: item.is_active !== false,
    }));
  }, [profitShareData]);

  // Use API data - show empty state if no data
  const ownersToUse = owners;

  const [editingOwner, setEditingOwner] = useState<string | null>(null);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerShare, setNewOwnerShare] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationError, setValidationError] = useState("");

  const totalProfit = profitShareData?.total_profit || profitShareData?.totalProfit || 0;
  const totalShareholders = ownersToUse.filter((owner) => owner.isActive).length;
  const totalDistributed = ownersToUse.reduce(
    (sum, owner) => sum + owner.currentBalance,
    0
  );
  const avgShare =
    totalShareholders > 0 ? totalDistributed / totalShareholders : 0;

  // Calculate total profit share percentage
  const totalProfitShare = ownersToUse.reduce(
    (sum, owner) => sum + owner.profitShare,
    0
  );

  // Real-time validation
  useEffect(() => {
    if (totalProfitShare > 100) {
      setValidationError(
        t("admin.profitShare.validationErrors.totalProfitShareExceeded")
      );
    } else if (totalProfitShare < 0) {
      setValidationError(
        t("admin.profitShare.validationErrors.totalProfitShareNegative")
      );
    } else {
      setValidationError("");
    }
  }, [totalProfitShare, t]);

  const handleProfitShareChange = (ownerId: string, newShare: number) => {
    // TODO: Implement API mutation to update profit share
    // This would require a PUT/PATCH endpoint for profit share
    setEditingOwner(null);
  };

  const handleSaveChanges = (ownerId: string) => {
    setEditingOwner(null);
    // TODO: Implement API mutation to save changes
    // This would require a PUT/PATCH endpoint for profit share
  };

  const handleCancelEdit = () => {
    setEditingOwner(null);
  };

  const handleAddOwner = () => {
    if (!newOwnerName || !newOwnerEmail || !newOwnerShare) {
      setValidationError(
        t("admin.profitShare.validationErrors.allFieldsRequired")
      );
      return;
    }

    const shareValue = parseFloat(newOwnerShare);
    if (isNaN(shareValue)) {
      setValidationError(
        t("admin.profitShare.validationErrors.invalidProfitShare")
      );
      return;
    }

    const newTotal = totalProfitShare + shareValue;
    if (newTotal > 100) {
      setValidationError(
        t("admin.profitShare.validationErrors.addingOwnerExceeds100")
      );
      return;
    }

    // TODO: Implement API mutation to add owner
    // This would require a POST endpoint for profit share owners
    setNewOwnerName("");
    setNewOwnerEmail("");
    setNewOwnerShare("");
    setShowAddForm(false);
    setValidationError("");
  };

  const handleRemoveOwner = (ownerId: string) => {
    // TODO: Implement API mutation to remove owner
    // This would require a DELETE endpoint for profit share owners
  };

  const handleToggleActive = (ownerId: string) => {
    // TODO: Implement API mutation to toggle active status
    // This would require a PUT/PATCH endpoint for profit share owners
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.tabs.profitShare")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.profitShare.subtitle")}
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs sm:text-sm"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
          <span className="hidden sm:inline">
            {t("admin.profitShare.addOwner")}
          </span>
          <span className="sm:hidden">
            {t("admin.profitShare.addOwnerShort")}
          </span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitShare.stats.totalProfit")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(totalProfit, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {totalProfit > 0 
                ? `${t("admin.profitShare.stats.fromLastPeriod")}`
                : t("admin.profitShare.stats.noData") || "No data available"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitShare.stats.shareholders")}
              </CardTitle>
            </div>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{totalShareholders}</div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.profitShare.stats.activeShareholders")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitShare.stats.totalDistributed")}
              </CardTitle>
            </div>
            <Share2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(totalDistributed, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {totalProfit > 0 
                ? `${((totalDistributed / totalProfit) * 100).toFixed(1)}% ${t("admin.profitShare.stats.ofTotalProfit")}`
                : t("admin.profitShare.stats.noData") || "No data available"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.profitShare.stats.avgShare")}
              </CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">
              {formatCurrencyForLocale(avgShare, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.profitShare.stats.perShareholder")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Total Profit Share Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Share2 className="h-5 w-5" />
            {t("admin.profitShare.totalProfitShareAllocation")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold">
                {totalProfitShare.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2">
                {totalProfitShare === 100 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : totalProfitShare > 100 ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {totalProfitShare === 100
                    ? t("admin.profitShare.perfectAllocation")
                    : totalProfitShare > 100
                    ? t("admin.profitShare.exceeds100")
                    : `${(100 - totalProfitShare).toFixed(1)}% ${t(
                        "admin.profitShare.remaining"
                      )}`}
                </span>
              </div>
            </div>
            <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totalProfitShare === 100
                    ? "bg-green-500"
                    : totalProfitShare > 100
                    ? "bg-red-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(totalProfitShare, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Owner Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.profitShare.addNewOwner")}</CardTitle>
            <CardDescription>
              {t("admin.profitShare.addNewOwnerDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ownerName">
                  {t("admin.profitShare.ownerName")}
                </Label>
                <Input
                  id="ownerName"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder={t("admin.profitShare.ownerNamePlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="ownerEmail">
                  {t("admin.profitShare.email")}
                </Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder={t("admin.profitShare.emailPlaceholder")}
                />
              </div>
              <div>
                <Label htmlFor="ownerShare">
                  {t("admin.profitShare.profitSharePercent")}
                </Label>
                <Input
                  id="ownerShare"
                  type="number"
                  step="0.1"
                  value={newOwnerShare}
                  onChange={(e) => setNewOwnerShare(e.target.value)}
                  placeholder={t("admin.profitShare.profitSharePlaceholder")}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddOwner}>
                {t("admin.profitShare.addOwner")}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                {t("admin.profitShare.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Owners List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.profitShare.profitShareOwners")}</CardTitle>
          <CardDescription>
            {t("admin.profitShare.profitShareOwnersDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profitShareLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("common.loading") || "Loading..."}
            </div>
          ) : profitShareError ? (
            <div className="text-center py-8 text-destructive">
              {t("common.error") || "Error"}: {profitShareError instanceof Error ? profitShareError.message : String(profitShareError)}
            </div>
          ) : ownersToUse.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.profitShare.noOwners") || "No profit share owners found"}
            </div>
          ) : (
            <div className="space-y-4">
              {ownersToUse.map((owner) => (
              <div
                key={owner.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{owner.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {owner.email}
                      </p>
                    </div>
                    <Badge variant={owner.isActive ? "default" : "secondary"}>
                      {owner.isActive
                        ? t("admin.profitShare.active")
                        : t("admin.profitShare.inactive")}
                    </Badge>
                    {owner.profitShare < 0 && (
                      <Badge variant="destructive">
                        {t("admin.profitShare.overdrawn")}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("admin.profitShare.currentBalance")}:{" "}
                    {formatCurrencyForLocale(
                      owner.currentBalance,
                      i18n.language
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {editingOwner === owner.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={owner.profitShare}
                        onChange={(e) =>
                          handleProfitShareChange(
                            owner.id,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-sm">%</span>
                      <Button
                        size="sm"
                        onClick={() => handleSaveChanges(owner.id)}
                      >
                        {t("admin.profitShare.save")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        {t("admin.profitShare.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{owner.profitShare}%</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingOwner(owner.id)}
                      >
                        {t("admin.profitShare.edit")}
                      </Button>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(owner.id)}
                  >
                    {owner.isActive
                      ? t("admin.profitShare.deactivate")
                      : t("admin.profitShare.activate")}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveOwner(owner.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitShareManagement;
