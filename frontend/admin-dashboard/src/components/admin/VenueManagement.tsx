import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  ResponsivePagination,
} from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  MoreHorizontal,
  MapPin,
  Building2,
  Wifi,
  Car,
  Accessibility,
  Coffee,
  Music,
  Camera,
  Users,
  Star,
  Shield,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatNumberForLocale } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { venuesApi } from "@/lib/api/adminApi";

interface Venue {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  capacity: number;
  facilities?: string[];
  status: "active" | "inactive" | "maintenance";
  rating?: number;
  totalEvents?: number;
  lastEventDate?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  images?: string[];
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

const VenueManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  // Test if the keys are working now
  console.log("=== TESTING VENUE MANAGEMENT KEYS ===");
  console.log(
    "venueManagement.header.title:",
    t("venueManagement.header.title")
  );
  console.log(
    "venueManagement.actions.addVenue:",
    t("venueManagement.actions.addVenue")
  );
  console.log(
    "venueManagement.filters.title:",
    t("venueManagement.filters.title")
  );
  console.log("testVenueKey:", t("testVenueKey"));

  // Try alternative access methods
  console.log(
    "Alternative method 1:",
    t("venueManagement.header.title", { defaultValue: "DEFAULT" })
  );
  console.log("Alternative method 2:", i18n.t("venueManagement.header.title"));
  console.log(
    "Alternative method 3:",
    i18n.t("venueManagement.header.title", { defaultValue: "DEFAULT" })
  );

  // Force reload translation resources
  React.useEffect(() => {
    i18n.reloadResources();
  }, [i18n]);

  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [editingVenue, setEditingVenue] = useState<Partial<Venue>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<Venue | null>(null);
  const [newVenue, setNewVenue] = useState<Partial<Venue>>({
    name: "",
    address: "",
    city: "",
    capacity: 0,
    status: "active",
  });

  // Fetch venues from API
  const { data: venuesData, isLoading: venuesLoading, error: venuesError } = useQuery({
    queryKey: ['venues', searchTerm, statusFilter, cityFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (cityFilter !== 'all') params.city = cityFilter;
      
      const response = await venuesApi.getVenues(params);
      return response;
    },
  });

  // Transform API venues to match Venue interface
  const venues: Venue[] = useMemo(() => {
    if (!venuesData?.results) return [];
    return venuesData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      name: item.name || '',
      description: item.description || '',
      address: item.address || '',
      city: item.city || '',
      capacity: item.capacity || 0,
      facilities: item.facilities || [],
      status: item.status as "active" | "inactive" | "maintenance",
      rating: item.rating || 0,
      totalEvents: item.total_events || 0,
      lastEventDate: item.last_event_date,
      contactPhone: item.contact_phone || '',
      contactEmail: item.contact_email || '',
      website: item.website,
      images: item.images || [],
      created_at: item.created_at,
      updated_at: item.updated_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }, [venuesData]);

  // API handles filtering, so we use venues directly
  const filteredVenues = venues;

  // Pagination from API response
  const totalPages = venuesData?.total_pages || 1;
  const startIndex = venuesData?.page ? (venuesData.page - 1) * venuesData.page_size : 0;
  const endIndex = startIndex + (venuesData?.page_size || itemsPerPage);
  const paginatedVenues = filteredVenues;

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(venues.map((venue) => venue.city).filter(city => city && city.trim() !== ''))];
    return uniqueCities.sort();
  }, [venues]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("venueManagement.status.active");
      case "inactive":
        return t("venueManagement.status.inactive");
      case "maintenance":
        return t("venueManagement.status.maintenance");
      default:
        return status;
    }
  };

  const getFacilityIcon = (facility: string) => {
    switch (facility.toLowerCase()) {
      case "wifi":
        return <Wifi className="h-4 w-4" />;
      case "parking":
        return <Car className="h-4 w-4" />;
      case "wheelchair access":
        return <Accessibility className="h-4 w-4" />;
      case "catering":
        return <Coffee className="h-4 w-4" />;
      case "audio/visual":
        return <Music className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      case "camera":
        return <Camera className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const handleAddVenue = () => {
    setIsAddDialogOpen(true);
  };

  const handleViewVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsViewDialogOpen(true);
  };

  // Create venue mutation
  const createVenueMutation = useMutation({
    mutationFn: async (data: any) => {
      return await venuesApi.createVenue(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast({
        title: t("venueManagement.toast.venueAdded"),
        description: t("venueManagement.toast.venueAddedDesc"),
      });
      setIsAddDialogOpen(false);
      // Reset form
      setNewVenue({
        name: "",
        address: "",
        city: "",
        capacity: 0,
        status: "active",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("venueManagement.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Update venue mutation
  const updateVenueMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await venuesApi.updateVenue(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast({
        title: t("venueManagement.toast.venueUpdated"),
        description: t("venueManagement.toast.venueUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
      setEditingVenue({});
      setSelectedVenue(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("venueManagement.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Delete venue mutation
  const deleteVenueMutation = useMutation({
    mutationFn: async (id: string) => {
      return await venuesApi.deleteVenue(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      toast({
        title: t("venueManagement.toast.venueDeleted"),
        description: t("venueManagement.toast.venueDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setVenueToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("venueManagement.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, cityFilter]);

  const handleEditVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setEditingVenue({
      name: venue.name,
      address: venue.address,
      city: venue.city,
      capacity: venue.capacity,
      status: venue.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteVenue = (venueId: string | number) => {
    // Convert venueId to string for comparison (since venues array uses string IDs)
    const venueIdStr = String(venueId);
    
    // Try to find in venues array first (mapped data)
    let venue = venues.find((v) => String(v.id) === venueIdStr);
    
    // If not found, try in venuesData.results (raw API data)
    if (!venue) {
      venue = venuesData?.results?.find((v: any) => String(v.id) === venueIdStr);
    }
    
    if (venue) {
      setVenueToDelete({
        id: String(venue.id),
        name: venue.name || "",
        address: venue.address || "",
        city: venue.city || "",
        capacity: venue.capacity || 0,
        status: venue.status || "active",
        description: venue.description,
        facilities: venue.facilities,
      });
    } else {
      // Fallback: create venue object from ID if not found
      setVenueToDelete({
        id: venueIdStr,
        name: "",
        address: "",
        city: "",
        capacity: 0,
        status: "active",
        description: undefined,
        facilities: undefined,
      });
    }
    
    // Always open the dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteVenue = () => {
    if (venueToDelete) {
      deleteVenueMutation.mutate(venueToDelete.id);
    }
  };

  const handleSaveNewVenue = () => {
    // Validate required fields
    if (!newVenue.name || !newVenue.address || !newVenue.city || !newVenue.capacity) {
      toast({
        title: t("common.error"),
        description: t("venueManagement.toast.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    // Prepare data for API
    const venueData: any = {
      name: newVenue.name,
      address: newVenue.address,
      city: newVenue.city,
      capacity: Number(newVenue.capacity),
      status: newVenue.status || "active",
    };

    // Create venue
    createVenueMutation.mutate(venueData);
  };

  const handleSaveVenueEdit = () => {
    if (!selectedVenue) return;

    // Validate required fields
    if (!editingVenue.name || !editingVenue.address || !editingVenue.city || !editingVenue.capacity) {
      toast({
        title: t("common.error"),
        description: t("venueManagement.toast.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    // Prepare data for API
    const venueData: any = {
      name: editingVenue.name,
      address: editingVenue.address,
      city: editingVenue.city,
      capacity: Number(editingVenue.capacity),
      status: editingVenue.status || selectedVenue.status,
    };

    // Update venue
    updateVenueMutation.mutate({ id: selectedVenue.id, data: venueData });
  };

  const handleNewVenueChange = (field: string, value: any) => {
    setNewVenue((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditVenueChange = (field: string, value: any) => {
    setEditingVenue((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddFacility = () => {
    const facility = prompt("Enter facility name:");
    if (facility) {
      setNewVenue((prev) => ({
        ...prev,
        facilities: [...(prev.facilities || []), facility],
      }));
    }
  };

  const handleRemoveFacility = (index: number) => {
    setNewVenue((prev) => ({
      ...prev,
      facilities: prev.facilities?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleEditAddFacility = () => {
    const facility = prompt("Enter facility name:");
    if (facility) {
      setEditingVenue((prev) => ({
        ...prev,
        facilities: [...(prev.facilities || []), facility],
      }));
    }
  };

  const handleEditRemoveFacility = (index: number) => {
    setEditingVenue((prev) => ({
      ...prev,
      facilities: prev.facilities?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleExportVenues = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Name,Description,Address,City,Capacity,Status,Rating,Total Events\n" +
      venues
        .map(
          (venue) =>
            `${venue.name},${venue.description},${venue.address},${venue.city},${venue.capacity},${venue.status},${venue.rating},${venue.totalEvents}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "venues.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: t("venueManagement.toast.exportSuccess"),
      description: t("venueManagement.toast.exportSuccessDesc"),
    });
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("venueManagement.header.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("venueManagement.header.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredVenues}
            columns={commonColumns.venues}
            title="Venues"
            subtitle="Manage event venues and locations"
            filename="venues"
            filters={{
              search: searchTerm,
              status: statusFilter,
              city: cityFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("venueManagement.toast.exportSuccess"),
                description: t("venueManagement.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("venueManagement.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button onClick={handleAddVenue} className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("venueManagement.actions.addVenue")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("venueManagement.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("venueManagement.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("venueManagement.filters.status.label")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("venueManagement.filters.status.all")}
                </SelectItem>
                <SelectItem value="active">
                  {t("venueManagement.filters.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("venueManagement.filters.status.inactive")}
                </SelectItem>
                <SelectItem value="maintenance">
                  {t("venueManagement.filters.status.maintenance")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("venueManagement.filters.city.label")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("venueManagement.filters.city.all")}
                </SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city || "unknown"}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Venues Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("venueManagement.table.title")}</CardTitle>
          <CardDescription>
            {t("venueManagement.table.subtitle", {
              count: filteredVenues.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {t("venueManagement.table.headers.venue")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.location")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.capacity")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.status")}
                  </TableHead>
                  <TableHead>
                    {t("venueManagement.table.headers.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {venuesLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">{t("common.loading")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : venuesError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-red-600">
                      {t("common.error")}: {venuesError instanceof Error ? venuesError.message : t("venueManagement.toast.error")}
                    </TableCell>
                  </TableRow>
                ) : paginatedVenues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {t("venueManagement.noVenuesFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedVenues.map((venue) => (
                    <TableRow key={venue.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{venue.name}</div>
                          {venue.description && (
                            <div className="text-sm text-muted-foreground">
                              {venue.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 rtl:flex-row-reverse">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{venue.city}</div>
                            <div className="text-sm text-muted-foreground">
                              {venue.address}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 rtl:flex-row-reverse">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {formatNumberForLocale(venue.capacity, i18n.language)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(venue.status)}>
                          {getStatusText(venue.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {t("venueManagement.table.headers.actions")}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleViewVenue(venue)}
                            >
                              <Eye className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                              {t("venueManagement.actions.viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditVenue(venue)}
                            >
                              <Edit className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                              {t("venueManagement.actions.editVenue")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteVenue(venue.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                              {t("venueManagement.actions.deleteVenue")}
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
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            showInfo={true}
            infoText={`Showing ${startIndex + 1}-${Math.min(
              endIndex,
              filteredVenues.length
            )} of ${filteredVenues.length} venues`}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredVenues.length}
            itemsPerPage={itemsPerPage}
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Add Venue Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.add.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.add.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.name")} *
                </label>
                <Input
                  value={newVenue.name || ""}
                  onChange={(e) => handleNewVenueChange("name", e.target.value)}
                  placeholder={t("venueManagement.form.placeholders.name")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.address")} *
                </label>
                <Textarea
                  value={newVenue.address || ""}
                  onChange={(e) =>
                    handleNewVenueChange("address", e.target.value)
                  }
                  placeholder={t("venueManagement.form.placeholders.address")}
                  rows={3}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.city")} *
                </label>
                <Input
                  value={newVenue.city || ""}
                  onChange={(e) => handleNewVenueChange("city", e.target.value)}
                  placeholder={t("venueManagement.form.placeholders.city")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.capacity")} *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={newVenue.capacity || ""}
                  onChange={(e) =>
                    handleNewVenueChange("capacity", parseInt(e.target.value) || 0)
                  }
                  placeholder={t("venueManagement.form.placeholders.capacity")}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("venueManagement.form.status")}
                </label>
                <Select
                  value={newVenue.status || "active"}
                  onValueChange={(value: "active" | "inactive" | "maintenance") =>
                    handleNewVenueChange("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {t("venueManagement.filters.status.active")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("venueManagement.filters.status.inactive")}
                    </SelectItem>
                    <SelectItem value="maintenance">
                      {t("venueManagement.filters.status.maintenance")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewVenue({
                  name: "",
                  address: "",
                  city: "",
                  capacity: 0,
                  status: "active",
                });
              }}
            >
              {t("venueManagement.actions.cancel")}
            </Button>
            <Button 
              onClick={handleSaveNewVenue}
              disabled={createVenueMutation.isPending}
            >
              {createVenueMutation.isPending 
                ? t("common.loading") 
                : t("venueManagement.actions.saveVenue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Venue Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.edit.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.edit.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("venueManagement.form.name")} *
                </label>
                <Input
                  value={editingVenue.name || ""}
                  onChange={(e) => handleEditVenueChange("name", e.target.value)}
                  placeholder={t("venueManagement.form.placeholders.name")}
                  className="rtl:text-right ltr:text-left"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("venueManagement.form.address")} *
                </label>
                <Textarea
                  value={editingVenue.address || ""}
                  onChange={(e) =>
                    handleEditVenueChange("address", e.target.value)
                  }
                  placeholder={t("venueManagement.form.placeholders.address")}
                  rows={3}
                  className="rtl:text-right ltr:text-left"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("venueManagement.form.city")} *
                </label>
                <Input
                  value={editingVenue.city || ""}
                  onChange={(e) => handleEditVenueChange("city", e.target.value)}
                  placeholder={t("venueManagement.form.placeholders.city")}
                  className="rtl:text-right ltr:text-left"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("venueManagement.form.capacity")} *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={editingVenue.capacity || ""}
                  onChange={(e) =>
                    handleEditVenueChange("capacity", parseInt(e.target.value) || 0)
                  }
                  placeholder={t("venueManagement.form.placeholders.capacity")}
                  className="rtl:text-right ltr:text-left"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("venueManagement.form.status")}
                </label>
                <Select
                  value={editingVenue.status || selectedVenue?.status || "active"}
                  onValueChange={(value: "active" | "inactive" | "maintenance") =>
                    handleEditVenueChange("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {t("venueManagement.filters.status.active")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("venueManagement.filters.status.inactive")}
                    </SelectItem>
                    <SelectItem value="maintenance">
                      {t("venueManagement.filters.status.maintenance")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingVenue({});
                setSelectedVenue(null);
              }}
            >
              {t("venueManagement.actions.cancel")}
            </Button>
            <Button 
              onClick={handleSaveVenueEdit}
              disabled={updateVenueMutation.isPending}
            >
              {updateVenueMutation.isPending 
                ? t("common.loading") 
                : t("venueManagement.actions.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Venue Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="max-w-4xl"
          dir={i18n.language === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {selectedVenue?.name}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedVenue?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedVenue && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.location")}
                  </h4>
                  <div className="flex items-center gap-2 rtl:flex-row-reverse mt-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {selectedVenue.address}, {selectedVenue.city}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.capacity")}
                  </h4>
                  <div className="flex items-center gap-2 rtl:flex-row-reverse mt-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatNumberForLocale(
                        selectedVenue.capacity,
                        i18n.language
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.contact")}
                  </h4>
                  <div className="space-y-1 mt-1">
                    <div>{selectedVenue.contactPhone}</div>
                    <div>{selectedVenue.contactEmail}</div>
                    {selectedVenue.website && (
                      <div>
                        <a
                          href={selectedVenue.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {selectedVenue.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.facilities")}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedVenue.facilities.map((facility, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {getFacilityIcon(facility)}
                        {facility}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.details.statistics")}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumberForLocale(
                          selectedVenue.rating,
                          i18n.language
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("venueManagement.details.rating")}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumberForLocale(
                          selectedVenue.totalEvents,
                          i18n.language
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("venueManagement.details.totalEvents")}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("venueManagement.table.headers.status")}
                  </h4>
                  <Badge className={getStatusColor(selectedVenue.status)}>
                    {getStatusText(selectedVenue.status)}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("venueManagement.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.deleteVenue") || "Delete Venue"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("venueManagement.dialogs.deleteVenueConfirm") || "Are you sure you want to delete this venue? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {venueToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("venueManagement.table.name")}:</strong> {venueToDelete.name}
              </p>
              {venueToDelete.address && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("venueManagement.table.address")}:</strong> {venueToDelete.address}
                </p>
              )}
              {venueToDelete.city && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("venueManagement.table.city")}:</strong> {venueToDelete.city}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setVenueToDelete(null);
              }}
            >
              {t("venueManagement.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteVenue}
              disabled={deleteVenueMutation.isPending}
            >
              {deleteVenueMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("venueManagement.actions.deleteVenue") || "Delete Venue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VenueManagement;
