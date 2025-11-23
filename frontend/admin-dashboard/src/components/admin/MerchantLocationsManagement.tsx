import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
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
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantLocationsApi, merchantsApi } from "@/lib/api/adminApi";

type MerchantLocation = {
  id: string;
  merchant?: number | null;
  merchant_name?: string;
  merchant_name_display?: string;
  phone_number?: string;
  address: string;
  google_maps_link?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Merchant = {
  id: string;
  business_name: string;
};

const MerchantLocationsManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MerchantLocation | null>(null);
  const [merchantSelectionType, setMerchantSelectionType] = useState<"dropdown" | "manual">("dropdown");
  
  const [formData, setFormData] = useState({
    merchant: null as number | null,
    merchant_name: "",
    phone_number: "",
    address: "",
    google_maps_link: "",
    is_active: true,
  });

  // Fetch merchant locations
  const { data: locationsData, isLoading } = useQuery({
    queryKey: ["merchant-locations"],
    queryFn: () => merchantLocationsApi.getLocations(),
  });

  // Fetch merchants for dropdown
  const { data: merchantsData } = useQuery({
    queryKey: ["merchants"],
    queryFn: () => merchantsApi.getMerchants({ page_size: 1000 }),
  });

  const locations: MerchantLocation[] = useMemo(() => {
    if (!locationsData?.results) return [];
    return Array.isArray(locationsData.results) ? locationsData.results : [];
  }, [locationsData]);

  const merchants: Merchant[] = useMemo(() => {
    if (!merchantsData?.results) return [];
    return Array.isArray(merchantsData.results) ? merchantsData.results : [];
  }, [merchantsData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => merchantLocationsApi.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-locations"] });
      toast({
        title: t("admin.merchantLocations.created", "Location Created"),
        description: t("admin.merchantLocations.createdDesc", "Merchant location has been successfully created"),
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("admin.merchantLocations.error", "Error"),
        description: error.response?.data?.error?.message || t("admin.merchantLocations.createError", "Failed to create location"),
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      merchantLocationsApi.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-locations"] });
      toast({
        title: t("admin.merchantLocations.updated", "Location Updated"),
        description: t("admin.merchantLocations.updatedDesc", "Merchant location has been successfully updated"),
      });
      setIsEditDialogOpen(false);
      setSelectedLocation(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("admin.merchantLocations.error", "Error"),
        description: error.response?.data?.error?.message || t("admin.merchantLocations.updateError", "Failed to update location"),
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => merchantLocationsApi.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-locations"] });
      toast({
        title: t("admin.merchantLocations.deleted", "Location Deleted"),
        description: t("admin.merchantLocations.deletedDesc", "Merchant location has been successfully deleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("admin.merchantLocations.error", "Error"),
        description: error.response?.data?.error?.message || t("admin.merchantLocations.deleteError", "Failed to delete location"),
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      merchant: null,
      merchant_name: "",
      phone_number: "",
      address: "",
      google_maps_link: "",
      is_active: true,
    });
    setMerchantSelectionType("dropdown");
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (location: MerchantLocation) => {
    setSelectedLocation(location);
    setFormData({
      merchant: location.merchant || null,
      merchant_name: location.merchant_name || "",
      phone_number: location.phone_number || "",
      address: location.address,
      google_maps_link: location.google_maps_link || "",
      is_active: location.is_active,
    });
    setMerchantSelectionType(location.merchant ? "dropdown" : "manual");
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t("admin.merchantLocations.confirmDelete", "Are you sure you want to delete this location?"))) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = () => {
    if (!formData.address.trim()) {
      toast({
        title: t("admin.merchantLocations.error", "Error"),
        description: t("admin.merchantLocations.addressRequired", "Address is required"),
        variant: "destructive",
      });
      return;
    }

    if (merchantSelectionType === "dropdown" && !formData.merchant) {
      toast({
        title: t("admin.merchantLocations.error", "Error"),
        description: t("admin.merchantLocations.merchantRequired", "Please select a merchant"),
        variant: "destructive",
      });
      return;
    }

    if (merchantSelectionType === "manual" && !formData.merchant_name.trim()) {
      toast({
        title: t("admin.merchantLocations.error", "Error"),
        description: t("admin.merchantLocations.merchantNameRequired", "Merchant name is required"),
        variant: "destructive",
      });
      return;
    }

    const submitData: any = {
      address: formData.address.trim(),
      is_active: formData.is_active,
    };

    if (merchantSelectionType === "dropdown") {
      submitData.merchant = formData.merchant;
      submitData.merchant_name = null;
    } else {
      submitData.merchant = null;
      submitData.merchant_name = formData.merchant_name.trim();
    }

    if (formData.phone_number.trim()) {
      submitData.phone_number = formData.phone_number.trim();
    }

    if (formData.google_maps_link.trim()) {
      submitData.google_maps_link = formData.google_maps_link.trim();
    }

    if (selectedLocation) {
      updateMutation.mutate({ id: selectedLocation.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("admin.merchantLocations.title", "Merchant Locations")}
            </CardTitle>
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("admin.merchantLocations.addLocation", "Add Location")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.merchantLocations.noLocations", "No merchant locations found")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.merchantLocations.merchant", "Merchant")}</TableHead>
                  <TableHead>{t("admin.merchantLocations.address", "Address")}</TableHead>
                  <TableHead>{t("admin.merchantLocations.phone", "Phone")}</TableHead>
                  <TableHead>{t("admin.merchantLocations.status", "Status")}</TableHead>
                  <TableHead>{t("admin.merchantLocations.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.merchant_name_display || location.merchant_name || "N/A"}
                    </TableCell>
                    <TableCell>{location.address}</TableCell>
                    <TableCell>
                      {location.phone_number ? (
                        <a href={`tel:${location.phone_number}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="h-3 w-3" />
                          {location.phone_number}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.is_active ? "default" : "secondary"}>
                        {location.is_active
                          ? t("admin.merchantLocations.active", "Active")
                          : t("admin.merchantLocations.inactive", "Inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {location.google_maps_link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(location.google_maps_link, "_blank")}
                            title={t("admin.merchantLocations.viewMap", "View on Google Maps")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(location.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedLocation(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLocation
                ? t("admin.merchantLocations.editLocation", "Edit Location")
                : t("admin.merchantLocations.addLocation", "Add Location")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.merchantLocations.dialogDescription", "Manage merchant location information")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Merchant Selection Type */}
            <div className="space-y-2">
              <Label>{t("admin.merchantLocations.merchantSelection", "Merchant Selection")}</Label>
              <Select
                value={merchantSelectionType}
                onValueChange={(value: "dropdown" | "manual") => {
                  setMerchantSelectionType(value);
                  if (value === "dropdown") {
                    setFormData({ ...formData, merchant_name: "" });
                  } else {
                    setFormData({ ...formData, merchant: null });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dropdown">
                    {t("admin.merchantLocations.selectFromDropdown", "Select from dropdown")}
                  </SelectItem>
                  <SelectItem value="manual">
                    {t("admin.merchantLocations.manualEntry", "Manual entry")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Merchant Dropdown or Manual Input */}
            {merchantSelectionType === "dropdown" ? (
              <div className="space-y-2">
                <Label>{t("admin.merchantLocations.merchant", "Merchant")} *</Label>
                <Select
                  value={formData.merchant?.toString() || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, merchant: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.merchantLocations.selectMerchant", "Select merchant")} />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id.toString()}>
                        {merchant.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t("admin.merchantLocations.merchantName", "Merchant Name")} *</Label>
                <Input
                  value={formData.merchant_name}
                  onChange={(e) =>
                    setFormData({ ...formData, merchant_name: e.target.value })
                  }
                  placeholder={t("admin.merchantLocations.enterMerchantName", "Enter merchant name")}
                />
              </div>
            )}

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>{t("admin.merchantLocations.phoneNumber", "Phone Number")}</Label>
              <Input
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                placeholder={t("admin.merchantLocations.enterPhone", "Enter phone number")}
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>{t("admin.merchantLocations.address", "Address")} *</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder={t("admin.merchantLocations.enterAddress", "Enter full address")}
                rows={3}
              />
            </div>

            {/* Google Maps Link */}
            <div className="space-y-2">
              <Label>{t("admin.merchantLocations.googleMapsLink", "Google Maps Link")}</Label>
              <Input
                type="url"
                value={formData.google_maps_link}
                onChange={(e) =>
                  setFormData({ ...formData, google_maps_link: e.target.value })
                }
                placeholder={t("admin.merchantLocations.enterMapsLink", "Enter Google Maps URL")}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                {t("admin.merchantLocations.active", "Active")}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedLocation(null);
                resetForm();
              }}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending
                ? t("common.saving", "Saving...")
                : selectedLocation
                ? t("common.update", "Update")
                : t("common.create", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchantLocationsManagement;



