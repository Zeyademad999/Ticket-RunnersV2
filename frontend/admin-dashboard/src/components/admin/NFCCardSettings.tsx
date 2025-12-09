import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Save, Settings, CreditCard, RefreshCw, Calendar, AlertCircle } from "lucide-react";
import { nfcCardsApi } from "@/lib/api/adminApi";

interface NFCCardSettingsData {
  id: number;
  first_purchase_cost: number;
  renewal_fee: number;
  deactivation_days_before_expiry: number;
  auto_deactivate_expired: boolean;
  card_validity_days: number;
  updated_at: string;
}

const NFCCardSettings: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NFCCardSettingsData | null>(null);
  const [formData, setFormData] = useState({
    first_purchase_cost: 50,
    renewal_fee: 30,
    deactivation_days_before_expiry: 30,
    auto_deactivate_expired: true,
    card_validity_days: 365,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await nfcCardsApi.getSettings();
      setSettings(data);
      setFormData({
        first_purchase_cost: data.first_purchase_cost || 50,
        renewal_fee: data.renewal_fee || 30,
        deactivation_days_before_expiry: data.deactivation_days_before_expiry || 30,
        auto_deactivate_expired: data.auto_deactivate_expired !== undefined ? data.auto_deactivate_expired : true,
        card_validity_days: data.card_validity_days || 365,
      });
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error.response?.data?.error?.message || error.message || t("common.errorOccurred", "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await nfcCardsApi.updateSettings(formData);
      setSettings(updated);
      toast({
        title: t("common.success", "Success"),
        description: t("admin.nfc.settings.saved", "NFC card settings saved successfully"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error.response?.data?.error?.message || error.message || t("common.errorOccurred", "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("admin.nfc.settings.title", "NFC Card Settings")}
          </CardTitle>
          <CardDescription>
            {t("admin.nfc.settings.description", "Configure NFC card pricing and deactivation settings")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pricing Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CreditCard className="h-4 w-4" />
              <h3 className="text-lg font-semibold">
                {t("admin.nfc.settings.pricing", "Pricing")}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_purchase_cost">
                  {t("admin.nfc.settings.firstPurchaseCost", "First Purchase Cost (EGP)")} *
                </Label>
                <Input
                  id="first_purchase_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.first_purchase_cost}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      first_purchase_cost: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.nfc.settings.firstPurchaseCostHint", "Cost for first-time NFC card purchase")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="renewal_fee">
                  {t("admin.nfc.settings.renewalFee", "Renewal Fee (EGP)")} *
                </Label>
                <Input
                  id="renewal_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.renewal_fee}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      renewal_fee: parseFloat(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.nfc.settings.renewalFeeHint", "Fee for renewing an NFC card")}
                </p>
              </div>
            </div>
          </div>

          {/* Deactivation Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <AlertCircle className="h-4 w-4" />
              <h3 className="text-lg font-semibold">
                {t("admin.nfc.settings.deactivation", "Deactivation Settings")}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deactivation_days_before_expiry">
                  {t("admin.nfc.settings.deactivationDays", "Deactivation Days Before Expiry")} *
                </Label>
                <Input
                  id="deactivation_days_before_expiry"
                  type="number"
                  min="0"
                  value={formData.deactivation_days_before_expiry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deactivation_days_before_expiry: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.nfc.settings.deactivationDaysHint", "Number of days before expiry when cards should be deactivated (0 = deactivate on expiry date)")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card_validity_days">
                  {t("admin.nfc.settings.cardValidityDays", "Card Validity Period (Days)")} *
                </Label>
                <Input
                  id="card_validity_days"
                  type="number"
                  min="1"
                  value={formData.card_validity_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      card_validity_days: parseInt(e.target.value) || 365,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.nfc.settings.cardValidityDaysHint", "Number of days a card is valid from issue date")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="auto_deactivate_expired">
                  {t("admin.nfc.settings.autoDeactivateExpired", "Auto-Deactivate Expired Cards")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("admin.nfc.settings.autoDeactivateExpiredHint", "Automatically deactivate cards when they expire")}
                </p>
              </div>
              <Switch
                id="auto_deactivate_expired"
                checked={formData.auto_deactivate_expired}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    auto_deactivate_expired: checked,
                  })
                }
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={fetchSettings}
              disabled={saving}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.reset", "Reset")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.saving", "Saving")}...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("common.save", "Save Settings")}
                </>
              )}
            </Button>
          </div>

          {/* Last Updated Info */}
          {settings?.updated_at && (
            <div className="text-xs text-muted-foreground text-right">
              {t("common.lastUpdated", "Last updated")}: {new Date(settings.updated_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NFCCardSettings;

