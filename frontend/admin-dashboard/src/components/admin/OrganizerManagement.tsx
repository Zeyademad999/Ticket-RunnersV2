import React, { useState, useMemo, useEffect } from "react";

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
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
  User,
  MoreHorizontal,
  UserCheck,
  UserX,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Key,
  Calendar,
  Star,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Building,
  Briefcase,
  GraduationCap,
  Music,
  Palette,
  Utensils,
  Upload,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatNumberForLocale, formatPhoneNumberForLocale, formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, eventsApi } from "@/lib/api/adminApi";

type Organizer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  status: "active" | "inactive" | "suspended" | "pending";
  registrationDate: string;
  lastLogin: string;
  totalEvents: number;
  totalRevenue: number;
  commissionRate: number;
  commission: number;
  netRevenue: number;
  rating: number;
  verified: boolean;
  category:
    | "music"
    | "sports"
    | "technology"
    | "art"
    | "food"
    | "education"
    | "business"
    | "other";
  location: string;
  description: string;
  profileImage?: string;
  contactPerson: string;
  businessLicense?: string;
  taxId?: string;
  bankAccount?: string;
  contactMobile?: string; // Mobile number for portal authentication
  payoutMethod: "bank" | "paypal" | "stripe";
  payoutEmail?: string;
  minimumPayout: number;
  totalPayouts: number;
  pendingPayout: number;
  eventsThisMonth: number;
  eventsLastMonth: number;
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  responseTime: number; // in hours
  cancellationRate: number;
  refundRate: number;
  customerSatisfaction: number;
  repeatCustomers: number;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
};

type OrganizerEvent = {
  id: string;
  title: string;
  date: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  commission: number;
  rating?: number;
  image?: string;
  description?: string;
  location?: string;
  price?: number;
};


const OrganizersManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(
    null
  );
  const [eventsDialogOrganizerFilter, setEventsDialogOrganizerFilter] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showOrganizerDetails, setShowOrganizerDetails] = useState(false);
  const [isEventsDialogOpen, setIsEventsDialogOpen] = useState(false);
  const [isAddEventDialogOpen, setIsAddEventDialogOpen] = useState(false);
  const [isEditEventDialogOpen, setIsEditEventDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingOrganizer, setEditingOrganizer] = useState<Organizer | null>(
    null
  );
  const [newOrganizer, setNewOrganizer] = useState<Partial<Organizer>>({});
  const [editingEvent, setEditingEvent] = useState<OrganizerEvent | null>(null);
  const [newlyCreatedOrganizerId, setNewlyCreatedOrganizerId] = useState<string | null>(null);
  const [isCreateCredentialsDialogOpen, setIsCreateCredentialsDialogOpen] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({ mobile: "", password: "" });
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [organizerToDelete, setOrganizerToDelete] = useState<Organizer | null>(null);
  const [newEvent, setNewEvent] = useState<
    Partial<OrganizerEvent> & {
      time?: string;
      category?: string;
      ticketLimit?: number;
      ticketTransferEnabled?: boolean;
      commissionRate?: {
        type: "percentage" | "flat";
        value: number;
      };
      transferFee?: {
        type: "percentage" | "flat";
        value: number;
      };
      imageUrl?: string;
    }
  >({
    commissionRate: {
      type: "percentage",
      value: 10,
    },
    transferFee: {
      type: "percentage",
      value: 5,
    },
    ticketTransferEnabled: false,
    ticketLimit: 1,
  });
  const queryClient = useQueryClient();

  // Fetch ALL organizers from API (we'll filter client-side since backend filtering is unreliable)
  const {
    data: organizersData,
    isLoading: organizersLoading,
    error: organizersError,
  } = useQuery({
    queryKey: [
      "organizers",
      "all", // Fetch all organizers for client-side filtering
    ],
    queryFn: async () => {
      // Fetch all organizers with a large page size
      const params: any = {
        page: 1,
        page_size: 10000, // Get all organizers
      };

      return await usersApi.getOrganizers(params);
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale to ensure fresh fetches
    gcTime: 0, // Don't cache results
  });

  // State to track if export dialog is open
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Fetch all organizers for export (without pagination) when dialog opens
  const {
    data: allOrganizersData,
  } = useQuery({
    queryKey: [
      "organizers",
      "all",
      "export",
      debouncedSearchTerm,
      statusFilter,
      locationFilter,
      verifiedFilter,
    ],
    queryFn: async () => {
      const params: any = {
        page: 1,
        page_size: 10000, // Large number to get all organizers
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (locationFilter !== "all") params.location = locationFilter;
      if (verifiedFilter !== "all") params.verified = verifiedFilter === "verified";

      return await usersApi.getOrganizers(params);
    },
    enabled: isExportDialogOpen, // Only fetch when export dialog is open
  });

  // Helper function to transform API organizer data
  const transformOrganizer = (item: any): Organizer => {
    // Parse totalEvents - handle null, undefined, string, or number
    const totalEvents = item.total_events !== null && item.total_events !== undefined
      ? (typeof item.total_events === 'string' ? parseInt(item.total_events, 10) : Number(item.total_events)) || 0
      : 0;
    
    // Parse totalRevenue - handle null, undefined, string, or number
    const totalRevenue = item.total_revenue !== null && item.total_revenue !== undefined
      ? (typeof item.total_revenue === 'string' ? parseFloat(item.total_revenue) : Number(item.total_revenue)) || 0
      : 0;
    
    return {
    id: item.id?.toString() || "",
    name: item.name || "",
    email: item.email || "",
    phone: item.phone || item.contact_mobile || "",
    website: item.website || "",
    status: (item.status || "active") as
      | "active"
      | "inactive"
      | "suspended"
      | "pending",
    registrationDate: item.registration_date || item.created_at || "",
    lastLogin: item.last_login || "",
    totalEvents: totalEvents,
    totalRevenue: totalRevenue,
    commissionRate: parseFloat(item.commission_rate || 0) * 100, // Convert to percentage
    commission: (() => {
      const rate = parseFloat(item.commission_rate || 0);
      return totalRevenue * rate; // Calculate commission from revenue and rate
    })(),
    netRevenue: (() => {
      const rate = parseFloat(item.commission_rate || 0);
      return totalRevenue - (totalRevenue * rate); // Net revenue = total revenue - commission
    })(),
    rating: parseFloat(item.rating || 0),
    verified: item.verified || false,
    category: (
      item.category || "other"
    ).toLowerCase() as Organizer["category"],
    location: item.location || "",
    description: item.about || item.description || "",
    profileImage: item.profile_image || "/public/Portrait_Placeholder.png",
    contactPerson: item.name || "",
    businessLicense: item.commercial_registration || "",
    taxId: item.tax_id || "",
    bankAccount: item.bank_account || "",
    contactMobile: item.contact_mobile || "",
    payoutMethod: "bank" as "bank" | "paypal" | "stripe",
    payoutEmail: item.email || "",
    minimumPayout: 0,
    totalPayouts: 0,
    pendingPayout: 0,
    eventsThisMonth: 0,
    eventsLastMonth: 0,
    averageRating: parseFloat(item.rating || 0),
    totalReviews: 0,
    responseRate: 0,
    responseTime: 0,
    cancellationRate: 0,
    refundRate: 0,
    customerSatisfaction: 0,
    repeatCustomers: 0,
    socialMedia: {},
  };
  };

  // Fetch all events to calculate totals for organizers
  const { data: allEventsData } = useQuery({
    queryKey: ["allEventsForOrganizerStats"],
    queryFn: async () => {
      return await eventsApi.getEvents({
        page_size: 10000, // Get all events
      });
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Calculate organizer stats from events
  const organizerStatsMap = useMemo(() => {
    const statsMap = new Map<string, { totalEvents: number; totalRevenue: number }>();
    
    if (!allEventsData) return statsMap;
    
    const eventsArray = Array.isArray(allEventsData)
      ? allEventsData
      : (allEventsData.results || []);
    
    // Create a map of organizer names to IDs from the current organizers list
    const organizerNameToIdMap = new Map<string, string>();
    if (organizersData && 'results' in organizersData && organizersData.results) {
      organizersData.results.forEach((org: any) => {
        if (org.name && org.id) {
          organizerNameToIdMap.set(org.name.toLowerCase().trim(), String(org.id));
        }
      });
    }
    
    eventsArray.forEach((event: any) => {
      const eventRevenue = parseFloat(event.revenue || 0);
      
      // Try to get organizer IDs from organizers array (if available in detail view)
      const eventOrganizers = event.organizers || [];
      if (Array.isArray(eventOrganizers) && eventOrganizers.length > 0) {
        // Handle multiple organizers per event
        eventOrganizers.forEach((org: any) => {
          const orgId = typeof org === 'object' ? (org.id || org.organizer_id) : org;
          if (orgId) {
            const orgIdStr = String(orgId);
            const current = statsMap.get(orgIdStr) || { totalEvents: 0, totalRevenue: 0 };
            statsMap.set(orgIdStr, {
              totalEvents: current.totalEvents + 1,
              totalRevenue: current.totalRevenue + eventRevenue,
            });
          }
        });
      } else if (event.organizer) {
        // Single organizer (backward compatibility)
        const orgId = typeof event.organizer === 'object' ? (event.organizer.id || event.organizer.organizer_id) : event.organizer;
        if (orgId) {
          const orgIdStr = String(orgId);
          const current = statsMap.get(orgIdStr) || { totalEvents: 0, totalRevenue: 0 };
          statsMap.set(orgIdStr, {
            totalEvents: current.totalEvents + 1,
            totalRevenue: current.totalRevenue + eventRevenue,
          });
        }
      } else if (event.organizer_name) {
        // Fallback: match by organizer name (less reliable but works if IDs not available)
        const organizerNames = event.organizer_name.split(',').map((name: string) => name.trim());
        organizerNames.forEach((name: string) => {
          const orgId = organizerNameToIdMap.get(name.toLowerCase());
          if (orgId) {
            const current = statsMap.get(orgId) || { totalEvents: 0, totalRevenue: 0 };
            statsMap.set(orgId, {
              totalEvents: current.totalEvents + 1,
              totalRevenue: current.totalRevenue + eventRevenue,
            });
          }
        });
      }
    });
    
    return statsMap;
  }, [allEventsData, organizersData]);

  // Transform API organizers to match Organizer interface
  const organizers: Organizer[] = useMemo(() => {
    if (!organizersData || !('results' in organizersData) || !organizersData.results) return [];
    return organizersData.results.map((item: any) => {
      const transformed = transformOrganizer(item);
      // Override with calculated stats from events if available
      const stats = organizerStatsMap.get(transformed.id);
      if (stats) {
        transformed.totalEvents = stats.totalEvents;
        transformed.totalRevenue = stats.totalRevenue;
        // Recalculate commission and netRevenue with updated totalRevenue
        const rate = transformed.commissionRate / 100; // Convert back to decimal
        transformed.commission = transformed.totalRevenue * rate;
        transformed.netRevenue = transformed.totalRevenue - transformed.commission;
      }
      return transformed;
    });
  }, [organizersData, organizerStatsMap]);

  // Transform all organizers for export
  const allOrganizersForExport: Organizer[] = useMemo(() => {
    if (!allOrganizersData || !('results' in allOrganizersData) || !allOrganizersData.results) return organizers; // Fallback to current page if export data not loaded
    return allOrganizersData.results.map(transformOrganizer);
  }, [allOrganizersData, organizers]);

  // Fetch organizer events when an organizer is selected or filter is set
  const {
    data: organizerEventsData,
    isLoading: organizerEventsLoading,
    error: organizerEventsError,
  } = useQuery({
    queryKey: ["organizerEvents", eventsDialogOrganizerFilter || selectedOrganizer?.id],
    queryFn: async () => {
      const organizerId = eventsDialogOrganizerFilter || selectedOrganizer?.id;
      if (!organizerId) return { results: [] };
      return await eventsApi.getEvents({
        organizer: organizerId,
        page_size: 1000,
      });
    },
    enabled: (!!eventsDialogOrganizerFilter || !!selectedOrganizer?.id) && isEventsDialogOpen,
  });

  // Transform API events to match OrganizerEvent interface
  const organizerEvents: OrganizerEvent[] = useMemo(() => {
    if (!organizerEventsData) return [];
    
    // Handle both paginated response (with results) and direct array response
    const eventsArray = Array.isArray(organizerEventsData) 
      ? organizerEventsData 
      : (organizerEventsData.results || []);
    
    return eventsArray.map((item: any) => ({
      id: item.id?.toString() || "",
      title: item.title || "",
      date: item.date || item.start_date || "",
      status: (item.status || "upcoming") as "upcoming" | "ongoing" | "completed" | "cancelled",
      ticketsSold: item.tickets_sold || item.sold_tickets || 0,
      totalTickets: item.total_tickets || 0,
      revenue: parseFloat(item.revenue || item.total_revenue || 0),
      commission: parseFloat(item.commission || 0),
      rating: item.rating ? parseFloat(item.rating) : undefined,
      image: item.image || item.image_url || item.thumbnail_path || "/public/Portrait_Placeholder.png",
      description: item.description || "",
      location: item.location || item.venue?.name || item.venue?.address || "",
      price: parseFloat(item.price || item.starting_price || 0),
    }));
  }, [organizerEventsData]);

  // Apply client-side filtering as fallback (backend may not filter correctly)
  const filteredOrganizers = useMemo(() => {
    let filtered = [...organizers];
    
    // Filter by status (client-side fallback)
    if (statusFilter !== "all") {
      filtered = filtered.filter((org) => org.status === statusFilter);
    }
    
    // Filter by location (client-side fallback)
    if (locationFilter !== "all") {
      filtered = filtered.filter((org) => org.location === locationFilter);
    }
    
    // Filter by verification status (client-side fallback)
    if (verifiedFilter !== "all") {
      if (verifiedFilter === "verified") {
        filtered = filtered.filter((org) => org.verified === true);
      } else if (verifiedFilter === "unverified") {
        filtered = filtered.filter((org) => org.verified === false);
      }
    }
    
    // Filter by search term (client-side fallback)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((org) => 
        org.name.toLowerCase().includes(searchLower) ||
        org.email.toLowerCase().includes(searchLower) ||
        org.phone.includes(searchLower) ||
        (org.location && org.location.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  }, [organizers, statusFilter, locationFilter, verifiedFilter, debouncedSearchTerm]);

  // Get unique locations from organizers for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    organizers.forEach((organizer) => {
      if (organizer.location && organizer.location.trim() !== "") {
        locations.add(organizer.location);
      }
    });
    return Array.from(locations).sort();
  }, [organizers]);

  // Pagination - client-side pagination on filtered results
  const totalFilteredCount = filteredOrganizers.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrganizers = filteredOrganizers.slice(startIndex, endIndex);

  // Reset to first page when filters change (using debounced search)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, locationFilter, verifiedFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.organizers.status.active");
      case "inactive":
        return t("admin.organizers.status.inactive");
      case "suspended":
        return t("admin.organizers.status.suspended");
      case "pending":
        return t("admin.organizers.status.pending");
      default:
        return status;
    }
  };

  const getEventStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return t("admin.events.status.upcoming");
      case "ongoing":
        return t("admin.events.status.ongoing");
      case "completed":
        return t("admin.events.status.completed");
      case "cancelled":
        return t("admin.events.status.cancelled");
      default:
        return status;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "music":
        return "bg-purple-100 text-purple-800";
      case "sports":
        return "bg-green-100 text-green-800";
      case "technology":
        return "bg-blue-100 text-blue-800";
      case "art":
        return "bg-pink-100 text-pink-800";
      case "food":
        return "bg-orange-100 text-orange-800";
      case "education":
        return "bg-indigo-100 text-indigo-800";
      case "business":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case "music":
        return t("admin.organizers.categories.music");
      case "sports":
        return t("admin.organizers.categories.sports");
      case "technology":
        return t("admin.organizers.categories.technology");
      case "art":
        return t("admin.organizers.categories.art");
      case "food":
        return t("admin.organizers.categories.food");
      case "education":
        return t("admin.organizers.categories.education");
      case "business":
        return t("admin.organizers.categories.business");
      case "other":
        return t("admin.organizers.categories.other");
      default:
        return category;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "music":
        return <Music className="h-4 w-4" />;
      case "sports":
        return <Target className="h-4 w-4" />;
      case "technology":
        return <Zap className="h-4 w-4" />;
      case "art":
        return <Palette className="h-4 w-4" />;
      case "food":
        return <Utensils className="h-4 w-4" />;
      case "education":
        return <GraduationCap className="h-4 w-4" />;
      case "business":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  const handleEditOrganizer = (organizer: Organizer) => {
    setEditingOrganizer(organizer);
    setIsEditDialogOpen(true);
  };

  const handleViewOrganizer = (organizer: Organizer) => {
    setSelectedOrganizer(organizer);
    setShowOrganizerDetails(true);
  };

  const handleCreateCredentialsForOrganizer = (organizer: Organizer) => {
    setNewlyCreatedOrganizerId(organizer.id);
    const hasExistingCredentials = hasCredentials(organizer);
    setIsEditingCredentials(hasExistingCredentials);
    setIsCreateCredentialsDialogOpen(true);
    // Pre-fill with existing contact_mobile if credentials exist, otherwise use phone
    setCredentialsForm({ 
      mobile: organizer.contactMobile || organizer.phone || "", 
      password: "" 
    });
  };

  // Check if organizer has credentials (has contact_mobile set)
  const hasCredentials = (organizer: Organizer) => {
    return !!organizer.contactMobile && organizer.contactMobile.trim() !== "";
  };

  // Delete organizer mutation
  const deleteOrganizerMutation = useMutation({
    mutationFn: async (id: string) => {
      return await usersApi.deleteOrganizer(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizers"] });
      toast({
        title: t("admin.organizers.toast.organizerDeleted"),
        description: t("admin.organizers.toast.organizerDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setOrganizerToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error?.response?.data?.error?.message ||
          error?.message ||
          "Failed to delete organizer",
        variant: "destructive",
      });
    },
  });

  const handleDeleteOrganizer = (organizerId: string | number) => {
    // Convert organizerId to string for comparison (since organizers array uses string IDs)
    const organizerIdStr = String(organizerId);
    
    // Try to find in organizers array first (mapped data)
    let organizer = organizers.find((o) => String(o.id) === organizerIdStr);
    let rawOrganizer: any = null;
    
    // If not found, try in organizersData.results (raw API data)
    if (!organizer) {
      rawOrganizer = organizersData?.results?.find((o: any) => String(o.id) === organizerIdStr);
    }
    
    if (organizer) {
      // Use mapped organizer data (camelCase)
      setOrganizerToDelete({
        id: String(organizer.id),
        name: organizer.name || "",
        email: organizer.email || "",
        phone: organizer.phone || "",
        status: organizer.status || "active",
        category: organizer.category || "other",
        totalEvents: organizer.totalEvents || 0,
        totalRevenue: organizer.totalRevenue || 0,
        commission: organizer.commission || 0,
        netRevenue: organizer.netRevenue || 0,
        registrationDate: organizer.registrationDate || "",
        lastLogin: organizer.lastLogin || "",
        location: organizer.location || "",
        rating: organizer.rating || 0,
        verified: organizer.verified || false,
        commissionRate: organizer.commissionRate || 0,
        description: organizer.description || "",
        website: organizer.website,
        profileImage: organizer.profileImage,
        contactPerson: organizer.contactPerson || "",
        businessLicense: organizer.businessLicense,
        taxId: organizer.taxId,
        bankAccount: organizer.bankAccount,
        contactMobile: organizer.contactMobile,
        payoutMethod: organizer.payoutMethod,
        payoutEmail: organizer.payoutEmail,
        minimumPayout: organizer.minimumPayout,
        totalPayouts: organizer.totalPayouts,
        pendingPayout: organizer.pendingPayout,
        eventsThisMonth: organizer.eventsThisMonth,
        eventsLastMonth: organizer.eventsLastMonth,
        averageRating: organizer.averageRating,
        totalReviews: organizer.totalReviews,
        responseRate: organizer.responseRate,
        responseTime: organizer.responseTime,
        cancellationRate: organizer.cancellationRate,
        refundRate: organizer.refundRate,
        customerSatisfaction: organizer.customerSatisfaction,
        repeatCustomers: organizer.repeatCustomers,
        socialMedia: organizer.socialMedia,
      });
    } else if (rawOrganizer) {
      // Use raw API data (snake_case) - transform to Organizer type
      const transformed = transformOrganizer(rawOrganizer);
      setOrganizerToDelete(transformed);
    } else {
      // Fallback: create minimal organizer object from ID if not found
      setOrganizerToDelete({
        id: organizerIdStr,
        name: "",
        email: "",
        phone: "",
        status: "active",
        category: "other",
        totalEvents: 0,
        totalRevenue: 0,
        commission: 0,
        netRevenue: 0,
        registrationDate: "",
        lastLogin: "",
        location: "",
        rating: 0,
        verified: false,
        commissionRate: 0,
        description: "",
        contactPerson: "",
        payoutMethod: "bank",
        minimumPayout: 0,
        totalPayouts: 0,
        pendingPayout: 0,
        eventsThisMonth: 0,
        eventsLastMonth: 0,
        averageRating: 0,
        totalReviews: 0,
        responseRate: 0,
        responseTime: 0,
        cancellationRate: 0,
        refundRate: 0,
        customerSatisfaction: 0,
        repeatCustomers: 0,
        socialMedia: {},
      });
    }
    
    // Always open the dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteOrganizer = () => {
    if (organizerToDelete) {
      deleteOrganizerMutation.mutate(organizerToDelete.id);
    }
  };


  // Update organizer mutation
  const updateOrganizerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await usersApi.updateOrganizer(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizers"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error?.response?.data?.error?.message ||
          error?.message ||
          "Failed to update organizer",
        variant: "destructive",
      });
    },
  });

  const handleSuspendOrganizer = (organizerId: string) => {
    updateOrganizerMutation.mutate(
      { id: organizerId, data: { status: "suspended" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["organizers"] });
          toast({
            title: t("admin.organizers.toast.organizerSuspended"),
            description: t("admin.organizers.toast.organizerSuspendedDesc"),
          });
        },
        onError: (error: any) => {
          toast({
            title: t("common.error"),
            description: error?.response?.data?.error?.message || error?.message || t("admin.organizers.toast.suspendError") || "Failed to suspend organizer",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleActivateOrganizer = (organizerId: string) => {
    updateOrganizerMutation.mutate(
      { id: organizerId, data: { status: "active" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["organizers"] });
          toast({
            title: t("admin.organizers.toast.organizerActivated"),
            description: t("admin.organizers.toast.organizerActivatedDesc"),
          });
        },
        onError: (error: any) => {
          toast({
            title: t("common.error"),
            description: error?.response?.data?.error?.message || error?.message || t("admin.organizers.toast.activateError") || "Failed to activate organizer",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleVerifyOrganizer = (organizerId: string) => {
    updateOrganizerMutation.mutate(
      { id: organizerId, data: { verified: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["organizers"] });
          toast({
            title: t("admin.organizers.toast.organizerVerified"),
            description: t("admin.organizers.toast.organizerVerifiedDesc"),
          });
        },
        onError: (error: any) => {
          toast({
            title: t("common.error"),
            description: error?.response?.data?.error?.message || error?.message || t("admin.organizers.toast.verifyError") || "Failed to verify organizer",
            variant: "destructive",
          });
        },
      }
    );
  };


  const handleViewEvents = (organizerId: string) => {
    const organizer = organizers.find((o) => o.id === organizerId);
    if (organizer) {
      setSelectedOrganizer(organizer);
      setEventsDialogOrganizerFilter(organizer.id);
      setIsEventsDialogOpen(true);
    }
  };

  // Create organizer mutation
  const createOrganizerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await usersApi.createOrganizer(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["organizers"] });
      toast({
        title: t("admin.organizers.toast.organizerAdded"),
        description: t("admin.organizers.toast.organizerAddedDesc"),
      });
      setIsAddDialogOpen(false);
      // Store the newly created organizer ID and open credentials dialog
      setNewlyCreatedOrganizerId(data.id?.toString() || null);
      setIsCreateCredentialsDialogOpen(true);
      setNewOrganizer({});
    },
    onError: (error: any) => {
      console.error("Create organizer error:", error);
      const errorMessage = 
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        (error?.response?.data && typeof error.response.data === 'object' && !error.response.data.error 
          ? JSON.stringify(error.response.data) 
          : null) ||
        error?.message ||
        "Failed to create organizer";
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Create/Edit credentials mutation
  const createCredentialsMutation = useMutation({
    mutationFn: async (data: { mobile: string; password: string }) => {
      if (!newlyCreatedOrganizerId) throw new Error("Organizer ID not found");
      return await usersApi.createOrganizerCredentials(newlyCreatedOrganizerId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizers"] });
      toast({
        title: isEditingCredentials 
          ? t("admin.organizers.toast.credentialsUpdated") || "Credentials Updated"
          : t("admin.organizers.toast.credentialsCreated"),
        description: isEditingCredentials
          ? t("admin.organizers.toast.credentialsUpdatedDesc") || "Organizer credentials have been updated successfully"
          : t("admin.organizers.toast.credentialsCreatedDesc"),
      });
      setIsCreateCredentialsDialogOpen(false);
      setNewlyCreatedOrganizerId(null);
      setIsEditingCredentials(false);
      setCredentialsForm({ mobile: "", password: "" });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error?.response?.data?.error?.message ||
          error?.message ||
          (isEditingCredentials ? "Failed to update credentials" : "Failed to create credentials"),
        variant: "destructive",
      });
    },
  });

  const handleAddOrganizer = () => {
    if (!newOrganizer.name || !newOrganizer.email || !newOrganizer.phone) {
      toast({
        title: t("admin.organizers.toast.validationError"),
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Ensure required fields have valid values
    if (!newOrganizer.category) {
      toast({
        title: t("admin.organizers.toast.validationError"),
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    if (!newOrganizer.location || newOrganizer.location.trim() === "") {
      toast({
        title: t("admin.organizers.toast.validationError"),
        description: "Location is required",
        variant: "destructive",
      });
      return;
    }

    const organizerData = {
      name: newOrganizer.name.trim(),
      email: newOrganizer.email.trim(),
      phone: newOrganizer.phone.trim(),
      category: newOrganizer.category,
      location: newOrganizer.location.trim(),
      about: newOrganizer.description?.trim() || "",
      status: newOrganizer.status || "pending",
      contact_mobile: newOrganizer.phone.trim(),
    };

    createOrganizerMutation.mutate(organizerData);
  };

  const handleCreateCredentials = () => {
    if (!credentialsForm.mobile || !credentialsForm.password) {
      toast({
        title: t("admin.organizers.toast.validationError"),
        description: "Mobile number and password are required",
        variant: "destructive",
      });
      return;
    }

    if (credentialsForm.password.length < 6) {
      toast({
        title: t("admin.organizers.toast.validationError"),
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    createCredentialsMutation.mutate(credentialsForm);
  };

  const handleSkipCredentials = () => {
    setIsCreateCredentialsDialogOpen(false);
    setNewlyCreatedOrganizerId(null);
    setIsEditingCredentials(false);
    setCredentialsForm({ mobile: "", password: "" });
  };

  const handleSaveOrganizerChanges = () => {
    if (editingOrganizer) {
      const organizerData = {
        name: editingOrganizer.name,
        email: editingOrganizer.email,
        phone: editingOrganizer.phone,
        category: editingOrganizer.category,
        location: editingOrganizer.location,
        about: editingOrganizer.description,
        status: editingOrganizer.status,
        verified: editingOrganizer.verified,
        commission_rate: editingOrganizer.commissionRate / 100, // Convert percentage to decimal
        contact_mobile: editingOrganizer.phone,
        tax_id: editingOrganizer.taxId,
        commercial_registration: editingOrganizer.businessLicense,
      };

      updateOrganizerMutation.mutate(
        { id: editingOrganizer.id, data: organizerData },
        {
          onSuccess: () => {
            toast({
              title: t("admin.organizers.toast.organizerUpdated"),
              description: t("admin.organizers.toast.organizerUpdatedDesc"),
            });
            setEditingOrganizer(null);
            setIsEditDialogOpen(false);
          },
        }
      );
    }
  };

  const formatDateForLocale = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy", {
        locale: i18n.language === "ar" ? ar : undefined,
      });
    } catch (error) {
      return dateString;
    }
  };


  const formatPhone = (phoneNumber: string) => {
    return formatPhoneNumberForLocale(phoneNumber, i18n.language);
  };


  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.organizers.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.organizers.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={allOrganizersForExport}
            columns={commonColumns.organizers}
            title={t("admin.organizers.title")}
            subtitle={t("admin.organizers.subtitle")}
            filename="organizers"
            filters={{
              search: debouncedSearchTerm,
              status: statusFilter,
              location: locationFilter,
              verified: verifiedFilter,
            }}
            onExport={async () => {
              // Ensure we have all organizers data before exporting
              if (!allOrganizersData || allOrganizersForExport.length === 0) {
                await queryClient.fetchQuery({
                  queryKey: [
                    "organizers",
                    "all",
                    "export",
                    debouncedSearchTerm,
                    statusFilter,
                    locationFilter,
                    verifiedFilter,
                  ],
                  queryFn: async () => {
                    const params: any = {
                      page: 1,
                      page_size: 10000,
                    };
                    if (debouncedSearchTerm) params.search = debouncedSearchTerm;
                    if (statusFilter !== "all") params.status = statusFilter;
                    if (locationFilter !== "all") params.location = locationFilter;
                    if (verifiedFilter !== "all") params.verified = verifiedFilter === "verified";
                    return await usersApi.getOrganizers(params);
                  },
                });
              }
              toast({
                title: t("admin.organizers.toast.exportSuccess"),
                description: t("admin.organizers.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button 
              variant="outline" 
              className="text-xs sm:text-sm"
              onClick={() => {
                setIsExportDialogOpen(true);
                // Pre-fetch all organizers when button is clicked
                queryClient.prefetchQuery({
                  queryKey: [
                    "organizers",
                    "all",
                    "export",
                    debouncedSearchTerm,
                    statusFilter,
                    locationFilter,
                    verifiedFilter,
                  ],
                  queryFn: async () => {
                    const params: any = {
                      page: 1,
                      page_size: 10000,
                    };
                    if (debouncedSearchTerm) params.search = debouncedSearchTerm;
                    if (statusFilter !== "all") params.status = statusFilter;
                    if (locationFilter !== "all") params.location = locationFilter;
                    if (verifiedFilter !== "all") params.verified = verifiedFilter === "verified";
                    return await usersApi.getOrganizers(params);
                  },
                });
              }}
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.organizers.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.organizers.actions.addOrganizer")}
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
            {t("admin.organizers.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.organizers.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.organizers.filters.status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.organizers.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.organizers.filters.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.organizers.filters.inactive")}
                </SelectItem>
                <SelectItem value="suspended">
                  {t("admin.organizers.filters.suspended")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.organizers.filters.pending")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.organizers.filters.location")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.organizers.filters.allLocations")}
                </SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location || "unknown"}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.organizers.filters.verified") || "Verification Status"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.organizers.filters.allVerification") || "All Verification Status"}
                </SelectItem>
                <SelectItem value="verified">
                  {t("admin.organizers.filters.verified") || "Verified"}
                </SelectItem>
                <SelectItem value="unverified">
                  {t("admin.organizers.filters.unverified") || "Unverified"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.organizers.table.organizer")} (
            {formatNumberForLocale(
              totalFilteredCount,
              i18n.language
            )}
            )
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {organizersLoading
                ? t("common.loading")
                : `${t("admin.organizers.pagination.showing")} ${
                    totalFilteredCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
                  }-${Math.min(
                    currentPage * itemsPerPage,
                    totalFilteredCount
                  )} ${t(
                    "admin.organizers.pagination.of"
                  )} ${formatNumberForLocale(
                    totalFilteredCount,
                    i18n.language
                  )} ${t("admin.organizers.pagination.results")}`}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(Number(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.organizer")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.contact")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.category")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.events")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.revenue") || "Revenue"}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.organizers.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">
                        {t("common.loading")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : organizersError ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-red-500"
                    >
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      {t("common.errorLoadingData")}
                    </TableCell>
                  </TableRow>
                ) : paginatedOrganizers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {t("admin.organizers.noOrganizers") || "No organizers found"}
                        </p>
                        {(debouncedSearchTerm || statusFilter !== "all" || locationFilter !== "all" || verifiedFilter !== "all") && (
                          <p className="text-xs text-muted-foreground">
                            {t("admin.organizers.noOrganizersWithFilters") || "Try adjusting your filters to see more results"}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrganizers.map((organizer) => (
                    <TableRow key={organizer.id}>
                      <TableCell>
                        <div className="rtl:text-right ltr:text-left">
                          <div className="flex items-center gap-2 rtl:flex-row-reverse">
                            <p className="font-medium">{organizer.name}</p>
                            {organizer.verified && (
                              <Badge variant="outline" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {t("admin.organizers.verified")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {organizer.location}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="text-sm">{organizer.email}</p>
                          <p
                            className="text-sm text-muted-foreground"
                            dir="ltr"
                          >
                            {formatPhone(organizer.phone)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(organizer.category)}>
                          <div className="flex items-center gap-1 rtl:flex-row-reverse">
                            {getCategoryIcon(organizer.category)}
                            {getCategoryText(organizer.category)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(organizer.status)}>
                          {getStatusText(organizer.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        <p className="text-sm font-medium">
                          {formatNumberForLocale(
                            organizer.totalEvents || 0,
                            i18n.language
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        <p className="text-sm font-medium text-green-600">
                          {formatCurrencyForLocale(
                            organizer.netRevenue || 0,
                            i18n.language
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rtl:text-right ltr:text-left"
                          >
                            <DropdownMenuLabel>
                              {t("admin.organizers.table.actions")}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleViewOrganizer(organizer)}
                            >
                              <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.organizers.actions.viewDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEditOrganizer(organizer)}
                            >
                              <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.organizers.actions.editOrganizer")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleCreateCredentialsForOrganizer(organizer)}
                            >
                              <Key className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {hasCredentials(organizer) 
                                ? t("admin.organizers.actions.editCredentials") || "Edit Credentials"
                                : t("admin.organizers.actions.createCredentials")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleViewEvents(organizer.id)}
                            >
                              <Calendar className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.organizers.actions.viewEvents")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {!organizer.verified && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleVerifyOrganizer(organizer.id)
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.organizers.actions.verify")}
                              </DropdownMenuItem>
                            )}
                            {organizer.status === "active" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSuspendOrganizer(organizer.id)
                                }
                                className="text-yellow-600"
                              >
                                <UserX className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.organizers.actions.suspend")}
                              </DropdownMenuItem>
                            )}
                            {organizer.status === "suspended" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleActivateOrganizer(organizer.id)
                                }
                                className="text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.organizers.actions.activate")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteOrganizer(organizer.id)
                              }
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                              {t("admin.organizers.actions.deleteOrganizer")}
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
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.organizers.pagination.showing")} ${
                totalFilteredCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
              }-${Math.min(
                currentPage * itemsPerPage,
                totalFilteredCount
              )} ${t("admin.organizers.pagination.of")} ${formatNumberForLocale(
                totalFilteredCount,
                i18n.language
              )} ${t("admin.organizers.pagination.results")}`}
              startIndex={totalFilteredCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              endIndex={Math.min(
                currentPage * itemsPerPage,
                totalFilteredCount
              )}
              totalItems={totalFilteredCount}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* View Organizer Details Dialog */}
      <Dialog
        open={showOrganizerDetails}
        onOpenChange={setShowOrganizerDetails}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <User className="h-5 w-5" />
              {t("admin.organizers.details.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.organizers.details.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedOrganizer && (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
                    <User className="h-5 w-5" />
                    {t("admin.organizers.details.basicInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rtl:text-right ltr:text-left">
                      <h3 className="text-lg font-semibold">
                        {selectedOrganizer.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrganizer.location}
                      </p>
                      <div className="flex items-center gap-2 mt-1 rtl:flex-row-reverse">
                        <Badge
                          className={getStatusColor(selectedOrganizer.status)}
                        >
                          {getStatusText(selectedOrganizer.status)}
                        </Badge>
                        {selectedOrganizer.verified && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                            {t("admin.organizers.verified")}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 rtl:text-right ltr:text-left">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t("admin.organizers.details.email")}
                        </label>
                        <p className="text-sm">{selectedOrganizer.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t("admin.organizers.details.phone")}
                        </label>
                        <p className="text-sm" dir="ltr">
                          {formatPhone(selectedOrganizer.phone)}
                        </p>
                      </div>
                      {selectedOrganizer.website && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            {t("admin.organizers.details.website")}
                          </label>
                          <p className="text-sm">{selectedOrganizer.website}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOrganizerDetails(false)}
            >
              {t("admin.organizers.details.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organizer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Edit className="h-5 w-5" />
              {t("admin.organizers.edit.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.organizers.edit.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {editingOrganizer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.name")}
                  </label>
                  <Input
                    value={editingOrganizer.name}
                    onChange={(e) =>
                      setEditingOrganizer({
                        ...editingOrganizer,
                        name: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.profileImage")}
                  </label>
                  <div className="flex items-center space-x-3 mt-1 rtl:space-x-reverse">
                    <img
                      src={
                        editingOrganizer.profileImage ||
                        "/public/Portrait_Placeholder.png"
                      }
                      alt={editingOrganizer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <Input
                      value={editingOrganizer.profileImage}
                      onChange={(e) =>
                        setEditingOrganizer({
                          ...editingOrganizer,
                          profileImage: e.target.value,
                        })
                      }
                      placeholder="Enter image URL"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = prompt("Enter image URL:");
                        if (url) {
                          setEditingOrganizer({
                            ...editingOrganizer,
                            profileImage: url,
                          });
                        }
                      }}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.email")}
                  </label>
                  <Input
                    value={editingOrganizer.email}
                    onChange={(e) =>
                      setEditingOrganizer({
                        ...editingOrganizer,
                        email: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.phone")}
                  </label>
                  <Input
                    value={editingOrganizer.phone}
                    onChange={(e) =>
                      setEditingOrganizer({
                        ...editingOrganizer,
                        phone: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.status")}
                  </label>
                  <Select
                    value={editingOrganizer.status}
                    onValueChange={(value) =>
                      setEditingOrganizer({
                        ...editingOrganizer,
                        status: value as any,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.organizers.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.organizers.status.inactive")}
                      </SelectItem>
                      <SelectItem value="suspended">
                        {t("admin.organizers.status.suspended")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("admin.organizers.status.pending")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.category")}
                  </label>
                  <Select
                    value={editingOrganizer.category}
                    onValueChange={(value) =>
                      setEditingOrganizer({
                        ...editingOrganizer,
                        category: value as any,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="music">
                        {t("admin.organizers.categories.music")}
                      </SelectItem>
                      <SelectItem value="sports">
                        {t("admin.organizers.categories.sports")}
                      </SelectItem>
                      <SelectItem value="technology">
                        {t("admin.organizers.categories.technology")}
                      </SelectItem>
                      <SelectItem value="art">
                        {t("admin.organizers.categories.art")}
                      </SelectItem>
                      <SelectItem value="food">
                        {t("admin.organizers.categories.food")}
                      </SelectItem>
                      <SelectItem value="education">
                        {t("admin.organizers.categories.education")}
                      </SelectItem>
                      <SelectItem value="business">
                        {t("admin.organizers.categories.business")}
                      </SelectItem>
                      <SelectItem value="other">
                        {t("admin.organizers.categories.other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.edit.location")}
                  </label>
                  <Input
                    value={editingOrganizer.location}
                    onChange={(e) =>
                      setEditingOrganizer({
                        ...editingOrganizer,
                        location: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.edit.description")}
                </label>
                <textarea
                  value={editingOrganizer.description}
                  onChange={(e) =>
                    setEditingOrganizer({
                      ...editingOrganizer,
                      description: e.target.value,
                    })
                  }
                  className="w-full mt-1 p-3 border rounded-md resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.organizers.edit.cancel")}
            </Button>
            <Button onClick={handleSaveOrganizerChanges}>
              {t("admin.organizers.edit.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Organizer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Plus className="h-5 w-5" />
              {t("admin.organizers.add.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.organizers.add.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.add.name")}
                </label>
                <Input
                  value={newOrganizer.name}
                  onChange={(e) =>
                    setNewOrganizer({ ...newOrganizer, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.add.email")}
                </label>
                <Input
                  value={newOrganizer.email}
                  onChange={(e) =>
                    setNewOrganizer({ ...newOrganizer, email: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.add.phone")}
                </label>
                <Input
                  value={newOrganizer.phone}
                  onChange={(e) =>
                    setNewOrganizer({ ...newOrganizer, phone: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.add.status")}
                </label>
                <Select
                  value={newOrganizer.status}
                  onValueChange={(value) =>
                    setNewOrganizer({ ...newOrganizer, status: value as any })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      {t("admin.organizers.status.active")}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t("admin.organizers.status.inactive")}
                    </SelectItem>
                    <SelectItem value="suspended">
                      {t("admin.organizers.status.suspended")}
                    </SelectItem>
                    <SelectItem value="pending">
                      {t("admin.organizers.status.pending")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.add.category")}
                </label>
                <Select
                  value={newOrganizer.category}
                  onValueChange={(value) =>
                    setNewOrganizer({ ...newOrganizer, category: value as any })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">
                      {t("admin.organizers.categories.music")}
                    </SelectItem>
                    <SelectItem value="sports">
                      {t("admin.organizers.categories.sports")}
                    </SelectItem>
                    <SelectItem value="technology">
                      {t("admin.organizers.categories.technology")}
                    </SelectItem>
                    <SelectItem value="art">
                      {t("admin.organizers.categories.art")}
                    </SelectItem>
                    <SelectItem value="food">
                      {t("admin.organizers.categories.food")}
                    </SelectItem>
                    <SelectItem value="education">
                      {t("admin.organizers.categories.education")}
                    </SelectItem>
                    <SelectItem value="business">
                      {t("admin.organizers.categories.business")}
                    </SelectItem>
                    <SelectItem value="other">
                      {t("admin.organizers.categories.other")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {t("admin.organizers.add.location")}
                </label>
                <Input
                  value={newOrganizer.location}
                  onChange={(e) =>
                    setNewOrganizer({
                      ...newOrganizer,
                      location: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                {t("admin.organizers.add.description")}
              </label>
              <textarea
                value={newOrganizer.description}
                onChange={(e) =>
                  setNewOrganizer({
                    ...newOrganizer,
                    description: e.target.value,
                  })
                }
                className="w-full mt-1 p-3 border rounded-md resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("admin.organizers.add.cancel")}
            </Button>
            <Button onClick={handleAddOrganizer}>
              {t("admin.organizers.add.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Credentials Dialog */}
      <Dialog open={isCreateCredentialsDialogOpen} onOpenChange={setIsCreateCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Key className="h-5 w-5" />
              {isEditingCredentials
                ? t("admin.organizers.credentials.editTitle") || "Edit Credentials"
                : t("admin.organizers.credentials.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {isEditingCredentials
                ? t("admin.organizers.credentials.editSubtitle") || "Update the organizer's portal credentials. The old password will be replaced."
                : t("admin.organizers.credentials.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.organizers.credentials.mobile")} *
              </label>
              <Input
                type="tel"
                placeholder={t("admin.organizers.credentials.mobilePlaceholder")}
                value={credentialsForm.mobile}
                onChange={(e) =>
                  setCredentialsForm({ ...credentialsForm, mobile: e.target.value })
                }
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.organizers.credentials.password")} *
              </label>
              <Input
                type="password"
                placeholder={t("admin.organizers.credentials.passwordPlaceholder")}
                value={credentialsForm.password}
                onChange={(e) =>
                  setCredentialsForm({ ...credentialsForm, password: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {t("admin.organizers.credentials.passwordHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            {!isEditingCredentials ? (
              <Button variant="outline" onClick={handleSkipCredentials}>
                {t("admin.organizers.credentials.skip")}
              </Button>
            ) : null}
            <Button
              onClick={handleCreateCredentials}
              disabled={createCredentialsMutation.isPending}
            >
              {createCredentialsMutation.isPending
                ? t("common.loading")
                : isEditingCredentials
                  ? t("admin.organizers.credentials.update") || "Update Credentials"
                  : t("admin.organizers.credentials.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Events Dialog */}
      <Dialog open={isEventsDialogOpen} onOpenChange={setIsEventsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Calendar className="h-5 w-5" />
              {t("admin.organizers.events.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.organizers.events.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Organizer Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium rtl:text-right ltr:text-left whitespace-nowrap">
                {t("admin.organizers.events.filterByOrganizer") || "Filter by Organizer:"}
              </label>
              <Select 
                value={eventsDialogOrganizerFilter || selectedOrganizer?.id || "all"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    setEventsDialogOrganizerFilter("");
                  } else {
                    setEventsDialogOrganizerFilter(value);
                    // Update selected organizer if needed
                    const org = organizers.find(o => o.id === value);
                    if (org) {
                      setSelectedOrganizer(org);
                    }
                  }
                }}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder={t("admin.organizers.events.selectOrganizer")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.organizers.events.allOrganizers")}
                  </SelectItem>
                  {organizers.map((organizer) => (
                    <SelectItem key={organizer.id} value={organizer.id}>
                      {organizer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(selectedOrganizer || eventsDialogOrganizerFilter) && (() => {
              // Get the current organizer (either from selectedOrganizer or from organizers array)
              const currentOrganizer = selectedOrganizer || (eventsDialogOrganizerFilter ? organizers.find(o => o.id === eventsDialogOrganizerFilter) : null);
              
              // Calculate stats from actual events data
              const totalEventsCount = organizerEvents.length;
              const totalRevenue = organizerEvents.reduce((sum, event) => sum + (event.revenue || 0), 0);
              const totalCommission = organizerEvents.reduce((sum, event) => sum + (event.commission || 0), 0);
              const netRevenue = totalRevenue - totalCommission; // Revenue after deductions/commission
              const averageRevenue = totalEventsCount > 0 ? totalRevenue / totalEventsCount : 0;
              
              return (
                <>
                {/* Revenue Summary Card */}
                {currentOrganizer && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium rtl:text-right ltr:text-left">
                      {t("admin.organizers.events.viewingEventsFor")} <span className="font-bold">{currentOrganizer.name}</span>
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.totalRevenue")}
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="rtl:text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {organizerEventsLoading ? (
                          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                        ) : (
                          formatCurrencyForLocale(totalRevenue, i18n.language)
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentOrganizer 
                          ? `${t("admin.organizers.events.fromAllEvents")} - ${currentOrganizer.name}`
                          : t("admin.organizers.events.fromAllEvents")}
                      </p>
                      {!organizerEventsLoading && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Net: {formatCurrencyForLocale(netRevenue, i18n.language)} (after deductions)
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.totalEvents")}
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="rtl:text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {organizerEventsLoading ? (
                          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                        ) : (
                          formatNumberForLocale(totalEventsCount, i18n.language)
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.organizers.events.eventsCount")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.avgRevenue")}
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="rtl:text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {organizerEventsLoading ? (
                          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                        ) : (
                          formatCurrencyForLocale(averageRevenue, i18n.language)
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.organizers.events.perEvent")}
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.event")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.date")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.statusLabel")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.tickets")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.revenue")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.rating")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.organizers.events.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizerEventsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">
                              {t("common.loading")}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : organizerEventsError ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>
                              {t("common.error")}: {organizerEventsError instanceof Error ? organizerEventsError.message : t("admin.organizers.events.loadError")}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : organizerEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("admin.organizers.events.noEvents")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      organizerEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="rtl:text-right ltr:text-left">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <img
                              src={
                                event.image ||
                                "/public/Portrait_Placeholder.png"
                              }
                              alt={event.title}
                              className="w-10 h-10 rounded-md object-cover"
                            />
                            <p className="font-medium">{event.title}</p>
                          </div>
                        </TableCell>
                        <TableCell className="rtl:text-right ltr:text-left">
                          {formatDateForLocale(event.date)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(event.status)}>
                            {getEventStatusText(event.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="rtl:text-right ltr:text-left">
                          {formatNumberForLocale(
                            event.ticketsSold,
                            i18n.language
                          )}{" "}
                          /{" "}
                          {formatNumberForLocale(
                            event.totalTickets,
                            i18n.language
                          )}
                        </TableCell>
                        <TableCell className="rtl:text-right ltr:text-left">
                          <span className="font-medium text-green-600">
                            {formatCurrencyForLocale(event.revenue, i18n.language)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {event.rating ? (
                            <div className="flex items-center gap-1 rtl:flex-row-reverse">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{event.rating}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="rtl:text-right ltr:text-left"
                            >
                              <DropdownMenuLabel>
                                {t("admin.organizers.events.actions")}
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingEvent(event);
                                  setIsEditEventDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.organizers.actions.editEvent")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (window.confirm(t("admin.organizers.events.confirmDelete") || "Are you sure you want to delete this event?")) {
                                    try {
                                      await eventsApi.deleteEvent(event.id);
                                      queryClient.invalidateQueries({ queryKey: ["organizerEvents", selectedOrganizer?.id] });
                                      toast({
                                        title: t("admin.organizers.toast.eventDeleted"),
                                        description: t("admin.organizers.toast.eventDeletedDesc"),
                                      });
                                    } catch (error: any) {
                                      toast({
                                        title: t("common.error"),
                                        description: error?.response?.data?.error?.message || error?.message || t("admin.organizers.toast.deleteEventError") || "Failed to delete event",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.organizers.actions.deleteEvent")}
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
                </>
              );
            })()}
            {!selectedOrganizer && !eventsDialogOrganizerFilter && (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t("admin.organizers.events.selectOrganizerToView")}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEventsDialogOpen(false);
                setEventsDialogOrganizerFilter("");
              }}
            >
              {t("admin.organizers.events.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog
        open={isAddEventDialogOpen}
        onOpenChange={setIsAddEventDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle>{t("admin.organizers.events.add.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.organizers.events.add.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.name")} *
                </label>
                <Input
                  value={newEvent.title || ""}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  placeholder={t("admin.organizers.events.add.namePlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.category")} *
                </label>
                <Select
                  value={newEvent.category || ""}
                  onValueChange={(value) =>
                    setNewEvent({ ...newEvent, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "admin.organizers.events.add.selectCategory"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Art">Art</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.date")} *
                </label>
                <Input
                  type="date"
                  value={newEvent.date || ""}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.time")}
                </label>
                <Input
                  type="time"
                  value={newEvent.time || ""}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, time: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.totalTickets")}
                </label>
                <Input
                  type="number"
                  value={newEvent.totalTickets || 0}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      totalTickets: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.ticketLimit")}
                </label>
                <Input
                  type="number"
                  value={newEvent.ticketLimit || 1}
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      ticketLimit: parseInt(e.target.value) || 1,
                    })
                  }
                  placeholder="1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.location")} *
                </label>
                <Input
                  value={newEvent.location || ""}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, location: e.target.value })
                  }
                  placeholder={t(
                    "admin.organizers.events.add.locationPlaceholder"
                  )}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.description")}
                </label>
                <Input
                  value={newEvent.description || ""}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                  placeholder={t(
                    "admin.organizers.events.add.descriptionPlaceholder"
                  )}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
              <Switch
                checked={newEvent.ticketTransferEnabled || false}
                onCheckedChange={(checked) =>
                  setNewEvent({ ...newEvent, ticketTransferEnabled: checked })
                }
              />
              <span className="text-sm">
                {t("admin.organizers.events.add.enableTicketTransfers")}
              </span>
            </div>

            {/* Commission Rate Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                {t("admin.organizers.events.add.commissionRateConfig")}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.organizers.events.add.commissionType")}
                  </label>
                  <Select
                    value={newEvent.commissionRate?.type || "percentage"}
                    onValueChange={(value) =>
                      setNewEvent({
                        ...newEvent,
                        commissionRate: {
                          type: value as "percentage" | "flat",
                          value: newEvent.commissionRate?.value || 10,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Fee (E£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.organizers.events.add.commissionValue")}
                  </label>
                  <Input
                    type="number"
                    value={newEvent.commissionRate?.value || 10}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        commissionRate: {
                          type: newEvent.commissionRate?.type || "percentage",
                          value: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder={
                      newEvent.commissionRate?.type === "percentage"
                        ? "10"
                        : "50"
                    }
                  />
                </div>
              </div>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-800">
                  <strong>
                    {t("admin.organizers.events.add.commissionCalculation")}:
                  </strong>
                  {newEvent.commissionRate?.type === "percentage" ? (
                    <span>
                      {" "}
                      {newEvent.commissionRate?.value || 10}%{" "}
                      {t("admin.organizers.events.add.ofTotalRevenue")}
                    </span>
                  ) : (
                    <span>
                      {" "}
                      E£{newEvent.commissionRate?.value || 50} ×{" "}
                      {t("admin.organizers.events.add.numberOfTicketsSold")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer Fee Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                {t("admin.organizers.events.add.transferFeeConfig")}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.organizers.events.add.transferFeeType")}
                  </label>
                  <Select
                    value={newEvent.transferFee?.type || "percentage"}
                    onValueChange={(value) =>
                      setNewEvent({
                        ...newEvent,
                        transferFee: {
                          type: value as "percentage" | "flat",
                          value: newEvent.transferFee?.value || 5,
                        },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Fee (E£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.organizers.events.add.transferFeeValue")}
                  </label>
                  <Input
                    type="number"
                    value={newEvent.transferFee?.value || 5}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        transferFee: {
                          type: newEvent.transferFee?.type || "percentage",
                          value: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder={
                      newEvent.transferFee?.type === "percentage" ? "5" : "25"
                    }
                  />
                </div>
              </div>
              <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-xs text-orange-800">
                  <strong>
                    {t("admin.organizers.events.add.transferFeeCalculation")}:
                  </strong>
                  {newEvent.transferFee?.type === "percentage" ? (
                    <span>
                      {" "}
                      {newEvent.transferFee?.value || 5}%{" "}
                      {t(
                        "admin.organizers.events.add.ofTicketPriceWhenTransferred"
                      )}
                    </span>
                  ) : (
                    <span>
                      {" "}
                      E£{newEvent.transferFee?.value || 25}{" "}
                      {t("admin.organizers.events.add.perTicketTransfer")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Event Image */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                {t("admin.organizers.events.add.eventImage")}
              </h4>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.organizers.events.add.imageUrl")}
                </label>
                <Input
                  type="url"
                  value={newEvent.imageUrl || ""}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, imageUrl: e.target.value })
                  }
                  placeholder={t(
                    "admin.organizers.events.add.imageUrlPlaceholder"
                  )}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddEventDialogOpen(false);
                setNewEvent({
                  commissionRate: {
                    type: "percentage",
                    value: 10,
                  },
                  transferFee: {
                    type: "percentage",
                    value: 5,
                  },
                  ticketTransferEnabled: false,
                  ticketLimit: 1,
                });
              }}
            >
              {t("admin.organizers.events.add.cancel")}
            </Button>
            <Button
              onClick={async () => {
                // Validate required fields
                if (
                  !newEvent.title ||
                  !newEvent.date ||
                  !newEvent.location ||
                  !newEvent.category
                ) {
                  toast({
                    title: t("admin.organizers.toast.validationError"),
                    description: t(
                      "admin.organizers.toast.validationErrorDesc"
                    ),
                    variant: "destructive",
                  });
                  return;
                }

                // Create event via API
                if (!selectedOrganizer?.id) {
                  toast({
                    title: t("admin.organizers.toast.validationError"),
                    description: "Please select an organizer first",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const eventData: any = {
                    title: newEvent.title,
                    date: newEvent.date,
                    location: newEvent.location,
                    category: newEvent.category,
                    description: newEvent.description || "",
                    total_tickets: newEvent.totalTickets || 0,
                    ticket_limit: newEvent.ticketLimit || 1,
                    ticket_transfer_enabled: newEvent.ticketTransferEnabled || false,
                    image_url: newEvent.imageUrl || "",
                    organizer: selectedOrganizer.id,
                  };

                  if (newEvent.time) {
                    eventData.time = newEvent.time;
                  }

                  if (newEvent.commissionRate) {
                    eventData.commission_rate_type = newEvent.commissionRate.type;
                    eventData.commission_rate_value = newEvent.commissionRate.value;
                  }

                  if (newEvent.transferFee) {
                    eventData.transfer_fee_type = newEvent.transferFee.type;
                    eventData.transfer_fee_value = newEvent.transferFee.value;
                  }

                  await eventsApi.createEvent(eventData);
                  
                  // Invalidate queries to refresh the events list
                  queryClient.invalidateQueries({ queryKey: ["organizerEvents", selectedOrganizer.id] });
                  
                  toast({
                    title: t("admin.organizers.toast.eventAdded"),
                    description: t("admin.organizers.toast.eventAddedDesc"),
                  });
                  setIsAddEventDialogOpen(false);
                  setNewEvent({
                    commissionRate: {
                      type: "percentage",
                      value: 10,
                    },
                    transferFee: {
                      type: "percentage",
                      value: 5,
                    },
                    ticketTransferEnabled: false,
                    ticketLimit: 1,
                  });
                } catch (error: any) {
                  toast({
                    title: t("common.error"),
                    description: error?.response?.data?.error?.message || error?.message || "Failed to create event",
                    variant: "destructive",
                  });
                }
              }}
            >
              {t("admin.organizers.events.add.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog
        open={isEditEventDialogOpen}
        onOpenChange={setIsEditEventDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Edit className="h-5 w-5" />
              {t("admin.organizers.events.edit.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.organizers.events.edit.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.title")}
                  </label>
                  <Input
                    value={editingEvent.title}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        title: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.date")}
                  </label>
                  <Input
                    type="date"
                    value={editingEvent.date}
                    onChange={(e) =>
                      setEditingEvent({ ...editingEvent, date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.status")}
                  </label>
                  <Select
                    value={editingEvent.status}
                    onValueChange={(value) =>
                      setEditingEvent({ ...editingEvent, status: value as any })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">
                        {t("admin.organizers.events.status.upcoming")}
                      </SelectItem>
                      <SelectItem value="ongoing">
                        {t("admin.organizers.events.status.ongoing")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {t("admin.organizers.events.status.completed")}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("admin.organizers.events.status.cancelled")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.ticketsSold")}
                  </label>
                  <Input
                    type="number"
                    value={editingEvent.ticketsSold}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        ticketsSold: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.totalTickets")}
                  </label>
                  <Input
                    type="number"
                    value={editingEvent.totalTickets}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        totalTickets: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.revenue")}
                  </label>
                  <Input
                    type="number"
                    value={editingEvent.revenue}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        revenue: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.commission")}
                  </label>
                  <Input
                    type="number"
                    value={editingEvent.commission}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        commission: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.rating")}
                  </label>
                  <Input
                    type="number"
                    value={editingEvent.rating}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        rating: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.image")}
                  </label>
                  <Input
                    type="url"
                    value={editingEvent.image}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        image: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.description")}
                  </label>
                  <textarea
                    value={editingEvent.description}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        description: e.target.value,
                      })
                    }
                    className="w-full mt-1 p-3 border rounded-md resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.location")}
                  </label>
                  <Input
                    value={editingEvent.location}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        location: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.organizers.events.edit.price")}
                  </label>
                  <Input
                    type="number"
                    value={editingEvent.price}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        price: Number(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditEventDialogOpen(false)}
            >
              {t("admin.organizers.events.edit.cancel")}
            </Button>
            <Button
              onClick={async () => {
                if (!editingEvent) return;
                
                try {
                  const eventData: any = {
                    title: editingEvent.title,
                    date: editingEvent.date,
                    status: editingEvent.status,
                    tickets_sold: editingEvent.ticketsSold,
                    total_tickets: editingEvent.totalTickets,
                    revenue: editingEvent.revenue,
                    commission: editingEvent.commission,
                    rating: editingEvent.rating,
                    image_url: editingEvent.image,
                    description: editingEvent.description,
                    location: editingEvent.location,
                    price: editingEvent.price,
                  };

                  await eventsApi.updateEvent(editingEvent.id, eventData);
                  
                  // Invalidate queries to refresh the events list
                  const organizerId = eventsDialogOrganizerFilter || selectedOrganizer?.id;
                  if (organizerId) {
                    queryClient.invalidateQueries({ queryKey: ["organizerEvents", organizerId] });
                  }
                  
                  toast({
                    title: t("admin.organizers.toast.eventUpdated"),
                    description: t("admin.organizers.toast.eventUpdatedDesc"),
                  });
                  setIsEditEventDialogOpen(false);
                  setEditingEvent(null);
                } catch (error: any) {
                  toast({
                    title: t("common.error"),
                    description: error?.response?.data?.error?.message || error?.message || "Failed to update event",
                    variant: "destructive",
                  });
                }
              }}
            >
              {t("admin.organizers.events.edit.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.organizers.dialogs.deleteOrganizer") || "Delete Organizer"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.organizers.dialogs.deleteOrganizerConfirm") || "Are you sure you want to delete this organizer? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {organizerToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.organizers.table.name")}:</strong> {organizerToDelete.name}
              </p>
              {organizerToDelete.email && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.organizers.table.email")}:</strong> {organizerToDelete.email}
                </p>
              )}
              {organizerToDelete.phone && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.organizers.table.phone")}:</strong> {organizerToDelete.phone}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setOrganizerToDelete(null);
              }}
            >
              {t("admin.organizers.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrganizer}
              disabled={deleteOrganizerMutation.isPending}
            >
              {deleteOrganizerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.organizers.actions.deleteOrganizer") || "Delete Organizer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizersManagement;
