import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Loader2, Save, Settings, DollarSign, AlertCircle, Calendar } from "lucide-react";
import adminApi from "@/lib/api/adminApi";
import { eventsApi } from "@/lib/api/adminApi";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface MarketplaceSettingsData {
  max_allowed_price: number;
  updated_at?: string;
  updated_by?: string | null;
}

interface Event {
  id: string;
  title: string;
  date?: string;
  marketplace_max_price?: number | null;
}

const MarketplaceValidations: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [settings, setSettings] = useState<MarketplaceSettingsData | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventMarketplacePrice, setEventMarketplacePrice] = useState<string>("");
  const [formData, setFormData] = useState({
    max_allowed_price: 10000,
  });

  // Fetch all events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const response = await eventsApi.getEvents({ page_size: 1000 });
      return response;
    },
  });

  const events: Event[] = eventsData?.results || [];

  useEffect(() => {
    fetchSettings();
  }, []);

  // Load event marketplace price when event is selected
  useEffect(() => {
    if (selectedEventId) {
      const event = events.find((e) => e.id === selectedEventId);
      if (event) {
        setEventMarketplacePrice(
          event.marketplace_max_price?.toString() || ""
        );
      }
    } else {
      setEventMarketplacePrice("");
    }
  }, [selectedEventId, events]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get("/v1/marketplace/settings/");
      const data = response.data;
      setSettings(data);
      setFormData({
        max_allowed_price: data.max_allowed_price || 10000,
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
      const response = await adminApi.put("/v1/marketplace/settings/", {
        max_allowed_price: formData.max_allowed_price,
      });
      const data = response.data;
      setSettings(data);
      toast({
        title: t("common.success", "Success"),
        description: t("admin.marketplace.validations.saved", "Marketplace validation settings saved successfully"),
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

  const handleSaveEventPrice = async () => {
    if (!selectedEventId) {
      toast({
        title: t("common.error", "Error"),
        description: t("admin.marketplace.validations.selectEvent", "Please select an event first"),
        variant: "destructive",
      });
      return;
    }

    setSavingEvent(true);
    try {
      const priceValue = eventMarketplacePrice.trim()
        ? parseFloat(eventMarketplacePrice)
        : null;

      await eventsApi.updateEvent(selectedEventId, {
        marketplace_max_price: priceValue,
      });

      toast({
        title: t("common.success", "Success"),
        description: t("admin.marketplace.validations.eventPriceSaved", "Event marketplace price saved successfully"),
      });

      // Refresh events data
      queryClient.invalidateQueries({ queryKey: ["events", "all"] });
    } catch (error: any) {
      toast({
        title: t("common.error", "Error"),
        description: error.response?.data?.error?.message || error.message || t("common.errorOccurred", "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setSavingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Global Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t("admin.marketplace.validations.globalSettings", "Global Marketplace Settings")}
          </CardTitle>
          <CardDescription>
            {t("admin.marketplace.validations.globalDescription", "Configure default maximum allowed price for all marketplace ticket listings")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Validation Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <DollarSign className="h-4 w-4" />
              <h3 className="text-lg font-semibold">
                {t("admin.marketplace.validations.priceValidation", "Price Validation")}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_allowed_price">
                  {t("admin.marketplace.validations.maxAllowedPrice", "Maximum Allowed Price (EGP)")}
                </Label>
                <Input
                  id="max_allowed_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.max_allowed_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_allowed_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="10000"
                />
                <p className="text-sm text-muted-foreground">
                  {t("admin.marketplace.validations.maxAllowedPriceDescription", "Sellers cannot list tickets at a price higher than this amount. This is used as default for events without a specific limit.")}
                </p>
              </div>
            </div>

            {settings?.updated_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {t("admin.marketplace.validations.lastUpdated", "Last updated")}:{" "}
                  {new Date(settings.updated_at).toLocaleString()}
                  {settings.updated_by && ` ${t("admin.marketplace.validations.by", "by")} ${settings.updated_by}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving", "Saving")}...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("common.save", "Save")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-Event Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t("admin.marketplace.validations.perEventSettings", "Per-Event Marketplace Settings")}
          </CardTitle>
          <CardDescription>
            {t("admin.marketplace.validations.perEventDescription", "Configure maximum allowed price for specific events. Leave empty to use global default.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <DollarSign className="h-4 w-4" />
              <h3 className="text-lg font-semibold">
                {t("admin.marketplace.validations.eventPriceValidation", "Event-Specific Price Validation")}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_select">
                  {t("admin.marketplace.validations.selectEvent", "Select Event")}
                </Label>
                <Select
                  value={selectedEventId}
                  onValueChange={setSelectedEventId}
                  disabled={eventsLoading}
                >
                  <SelectTrigger id="event_select">
                    <SelectValue placeholder={t("admin.marketplace.validations.selectEventPlaceholder", "Choose an event...")} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventsLoading ? (
                      <SelectItem value="loading" disabled>
                        {t("common.loading", "Loading...")}
                      </SelectItem>
                    ) : events.length === 0 ? (
                      <SelectItem value="no-events" disabled>
                        {t("admin.marketplace.validations.noEvents", "No events found")}
                      </SelectItem>
                    ) : (
                      events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title} {event.date ? `(${new Date(event.date).toLocaleDateString()})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="event_marketplace_price">
                  {t("admin.marketplace.validations.eventMaxPrice", "Event Max Price (EGP)")}
                  <span className="text-muted-foreground text-xs ml-1">
                    {t("admin.events.form.optional", "(optional)")}
                  </span>
                </Label>
                <Input
                  id="event_marketplace_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={eventMarketplacePrice}
                  onChange={(e) => setEventMarketplacePrice(e.target.value)}
                  placeholder={t("admin.marketplace.validations.useGlobalDefault", "Leave empty to use global default")}
                  disabled={!selectedEventId}
                />
                <p className="text-sm text-muted-foreground">
                  {t("admin.marketplace.validations.eventMaxPriceDescription", "Maximum price sellers can set for this event. If empty, the global default will be used.")}
                </p>
              </div>
            </div>

            {selectedEvent && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                <AlertCircle className="h-4 w-4" />
                <span>
                  {t("admin.marketplace.validations.currentEventPrice", "Current price for this event")}:{" "}
                  {selectedEvent.marketplace_max_price
                    ? `${selectedEvent.marketplace_max_price} EGP`
                    : t("admin.marketplace.validations.usingGlobalDefault", "Using global default")}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              onClick={handleSaveEventPrice} 
              disabled={savingEvent || !selectedEventId}
            >
              {savingEvent ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.saving", "Saving")}...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t("admin.marketplace.validations.saveEventPrice", "Save Event Price")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceValidations;

