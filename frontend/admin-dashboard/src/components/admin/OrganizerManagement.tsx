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
  User,
  Shield,
  Settings,
  MoreHorizontal,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  Users,
  UserCog,
  Key,
  LogOut,
  Calendar,
  EyeOff,
  CheckSquare,
  Square,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  StarOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Ticket,
  CalendarDays,
  Award,
  FileText,
  CreditCard,
  Wallet,
  Target,
  Zap,
  Repeat,
  Clock3,
  CalendarX,
  Building,
  Home,
  Briefcase,
  GraduationCap,
  Music,
  Camera,
  Palette,
  Gamepad2,
  Utensils,
  Car,
  Plane,
  Train,
  Bus,
  Ship,
  Bike,
  Upload,
  Image,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatNumberForLocale, formatPhoneNumberForLocale } from "@/lib/utils";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedOrganizer, setSelectedOrganizer] = useState<Organizer | null>(
    null
  );
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

  // Fetch organizers from API
  const {
    data: organizersData,
    isLoading: organizersLoading,
    error: organizersError,
  } = useQuery({
    queryKey: [
      "organizers",
      searchTerm,
      statusFilter,
      categoryFilter,
      currentPage,
      itemsPerPage,
    ],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;

      return await usersApi.getOrganizers(params);
    },
  });

  // State to track if export dialog is open
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Fetch all organizers for export (without pagination) when dialog opens
  const {
    data: allOrganizersData,
    isLoading: allOrganizersLoading,
  } = useQuery({
    queryKey: [
      "organizers",
      "all",
      "export",
      searchTerm,
      statusFilter,
      categoryFilter,
    ],
    queryFn: async () => {
      const params: any = {
        page: 1,
        page_size: 10000, // Large number to get all organizers
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;

      return await usersApi.getOrganizers(params);
    },
    enabled: isExportDialogOpen, // Only fetch when export dialog is open
  });

  // Helper function to transform API organizer data
  const transformOrganizer = (item: any): Organizer => ({
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
    totalEvents: item.total_events || 0,
    totalRevenue: parseFloat(item.total_revenue || 0),
    commissionRate: parseFloat(item.commission_rate || 0) * 100, // Convert to percentage
    commission: (() => {
      const revenue = parseFloat(item.total_revenue || 0);
      const rate = parseFloat(item.commission_rate || 0);
      return revenue * rate; // Calculate commission from revenue and rate
    })(),
    netRevenue: (() => {
      const revenue = parseFloat(item.total_revenue || 0);
      const rate = parseFloat(item.commission_rate || 0);
      return revenue - (revenue * rate); // Net revenue = total revenue - commission
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
  });

  // Transform API organizers to match Organizer interface
  const organizers: Organizer[] = useMemo(() => {
    if (!organizersData?.results) return [];
    return organizersData.results.map(transformOrganizer);
  }, [organizersData]);

  // Transform all organizers for export
  const allOrganizersForExport: Organizer[] = useMemo(() => {
    if (!allOrganizersData?.results) return organizers; // Fallback to current page if export data not loaded
    return allOrganizersData.results.map(transformOrganizer);
  }, [allOrganizersData, organizers]);

  // Mock organizers data (fallback - will be removed once API is fully integrated)
  const mockOrganizers: Organizer[] = [
    {
      id: "ORG001",
      name: "Cairo Events Pro",
      email: "contact@cairoeventspro.com",
      phone: "+20 10 1234 5678",
      website: "https://cairoeventspro.com",
      status: "active",
      registrationDate: "2024-01-15",
      lastLogin: "2025-08-16T10:30:00",
      totalEvents: 45,
      totalRevenue: 1250000,
      commissionRate: 10,
      rating: 4.8,
      verified: true,
      category: "music",
      location: "Cairo, Egypt",
      description:
        "Premier event organizer specializing in music concerts and festivals across Egypt.",
      profileImage: "/public/Portrait_Placeholder.png",
      contactPerson: "Ahmed Hassan",
      businessLicense: "BL-2024-001",
      taxId: "TAX-123456789",
      bankAccount: "EG123456789012345678901234",
      payoutMethod: "bank",
      minimumPayout: 5000,
      totalPayouts: 1150000,
      pendingPayout: 15000,
      eventsThisMonth: 3,
      eventsLastMonth: 4,
      averageRating: 4.8,
      totalReviews: 156,
      responseRate: 98,
      responseTime: 2,
      cancellationRate: 2,
      refundRate: 1,
      customerSatisfaction: 95,
      repeatCustomers: 45,
      socialMedia: {
        facebook: "cairoeventspro",
        instagram: "cairoeventspro",
        twitter: "cairoeventspro",
      },
    },
    {
      id: "ORG002",
      name: "Tech Events Egypt",
      email: "info@techeventsegypt.com",
      phone: "+20 10 2345 6789",
      website: "https://techeventsegypt.com",
      status: "active",
      registrationDate: "2024-02-20",
      lastLogin: "2025-08-16T09:15:00",
      totalEvents: 28,
      totalRevenue: 850000,
      commissionRate: 12,
      rating: 4.6,
      verified: true,
      category: "technology",
      location: "Alexandria, Egypt",
      description:
        "Leading technology conference and workshop organizer in Egypt.",
      profileImage: "/public/Portrait_Placeholder.png",
      contactPerson: "Sarah Mohamed",
      businessLicense: "BL-2024-002",
      taxId: "TAX-987654321",
      bankAccount: "EG987654321098765432109876",
      payoutMethod: "paypal",
      payoutEmail: "payments@techeventsegypt.com",
      minimumPayout: 3000,
      totalPayouts: 748000,
      pendingPayout: 102000,
      eventsThisMonth: 2,
      eventsLastMonth: 3,
      averageRating: 4.6,
      totalReviews: 89,
      responseRate: 95,
      responseTime: 4,
      cancellationRate: 5,
      refundRate: 2,
      customerSatisfaction: 92,
      repeatCustomers: 32,
      socialMedia: {
        linkedin: "techeventsegypt",
        twitter: "techeventsegypt",
      },
    },
    {
      id: "ORG003",
      name: "Art & Culture Hub",
      email: "hello@artculturehub.com",
      phone: "+20 10 3456 7890",
      website: "https://artculturehub.com",
      status: "active",
      registrationDate: "2024-03-10",
      lastLogin: "2025-08-16T11:45:00",
      totalEvents: 15,
      totalRevenue: 320000,
      commissionRate: 8,
      rating: 4.9,
      verified: true,
      category: "art",
      location: "Giza, Egypt",
      description: "Curating exceptional art exhibitions and cultural events.",
      profileImage: "/public/Portrait_Placeholder.png",
      contactPerson: "Layla Ahmed",
      businessLicense: "BL-2024-003",
      taxId: "TAX-456789123",
      bankAccount: "EG456789123456789123456789",
      payoutMethod: "bank",
      minimumPayout: 2000,
      totalPayouts: 294400,
      pendingPayout: 25600,
      eventsThisMonth: 1,
      eventsLastMonth: 2,
      averageRating: 4.9,
      totalReviews: 67,
      responseRate: 100,
      responseTime: 1,
      cancellationRate: 0,
      refundRate: 0,
      customerSatisfaction: 98,
      repeatCustomers: 28,
      socialMedia: {
        instagram: "artculturehub",
        facebook: "artculturehub",
      },
    },
    {
      id: "ORG004",
      name: "Sports Events Plus",
      email: "contact@sportseventsplus.com",
      phone: "+20 10 4567 8901",
      website: "https://sportseventsplus.com",
      status: "inactive",
      registrationDate: "2024-04-05",
      lastLogin: "2025-07-20T14:20:00",
      totalEvents: 8,
      totalRevenue: 180000,
      commissionRate: 15,
      rating: 4.3,
      verified: false,
      category: "sports",
      location: "Sharm El Sheikh, Egypt",
      description:
        "Sports event organizer specializing in marathons and fitness events.",
      profileImage: "/public/Portrait_Placeholder.png",
      contactPerson: "Omar Khalil",
      businessLicense: "BL-2024-004",
      taxId: "TAX-789123456",
      bankAccount: "EG789123456789123456789123",
      payoutMethod: "stripe",
      minimumPayout: 1000,
      totalPayouts: 153000,
      pendingPayout: 27000,
      eventsThisMonth: 0,
      eventsLastMonth: 1,
      averageRating: 4.3,
      totalReviews: 34,
      responseRate: 85,
      responseTime: 6,
      cancellationRate: 8,
      refundRate: 3,
      customerSatisfaction: 87,
      repeatCustomers: 12,
    },
    {
      id: "ORG005",
      name: "Food Festival Masters",
      email: "info@foodfestivalmasters.com",
      phone: "+20 10 5678 9012",
      website: "https://foodfestivalmasters.com",
      status: "active",
      registrationDate: "2024-05-12",
      lastLogin: "2025-08-16T08:30:00",
      totalEvents: 22,
      totalRevenue: 680000,
      commissionRate: 10,
      rating: 4.7,
      verified: true,
      category: "food",
      location: "Luxor, Egypt",
      description: "Premier food festival and culinary event organizer.",
      profileImage: "/public/Portrait_Placeholder.png",
      contactPerson: "Fatima Ali",
      businessLicense: "BL-2024-005",
      taxId: "TAX-321654987",
      bankAccount: "EG321654987321654987321654",
      payoutMethod: "bank",
      minimumPayout: 4000,
      totalPayouts: 612000,
      pendingPayout: 68000,
      eventsThisMonth: 2,
      eventsLastMonth: 2,
      averageRating: 4.7,
      totalReviews: 123,
      responseRate: 96,
      responseTime: 3,
      cancellationRate: 3,
      refundRate: 1,
      customerSatisfaction: 94,
      repeatCustomers: 38,
      socialMedia: {
        instagram: "foodfestivalmasters",
        facebook: "foodfestivalmasters",
        twitter: "foodfestivalmasters",
      },
    },
  ];


  // Fetch organizer events when an organizer is selected
  const {
    data: organizerEventsData,
    isLoading: organizerEventsLoading,
    error: organizerEventsError,
  } = useQuery({
    queryKey: ["organizerEvents", selectedOrganizer?.id],
    queryFn: async () => {
      if (!selectedOrganizer?.id) return { results: [] };
      return await eventsApi.getEvents({
        organizer: selectedOrganizer.id,
        page_size: 1000,
      });
    },
    enabled: !!selectedOrganizer?.id && isEventsDialogOpen,
  });

  // Transform API events to match OrganizerEvent interface
  const organizerEvents: OrganizerEvent[] = useMemo(() => {
    if (!organizerEventsData?.results) return [];
    return organizerEventsData.results.map((item: any) => ({
      id: item.id?.toString() || "",
      title: item.title || "",
      date: item.date || item.start_date || "",
      status: (item.status || "upcoming") as "upcoming" | "ongoing" | "completed" | "cancelled",
      ticketsSold: item.tickets_sold || item.sold_tickets || 0,
      totalTickets: item.total_tickets || 0,
      revenue: parseFloat(item.revenue || item.total_revenue || 0),
      commission: parseFloat(item.commission || 0),
      rating: item.rating ? parseFloat(item.rating) : undefined,
      image: item.image || item.image_url || "/public/Portrait_Placeholder.png",
      description: item.description || "",
      location: item.location || item.venue?.name || "",
      price: parseFloat(item.price || item.starting_price || 0),
    }));
  }, [organizerEventsData]);

  // API handles filtering, so we use organizers directly
  // Client-side filtering only for fields not supported by API
  const filteredOrganizers = useMemo(() => {
    // API handles search, status, and category filtering
    // Only apply client-side filtering if needed for additional fields
    return organizers;
  }, [organizers]);

  // Pagination - use API pagination
  const totalPages = organizersData?.total_pages || 1;
  const paginatedOrganizers = filteredOrganizers; // API already paginates

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

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
        category: organizer.category || "",
        totalEvents: organizer.totalEvents || 0,
        totalRevenue: organizer.totalRevenue || 0,
        commission: organizer.commission || 0,
        payout: organizer.netRevenue || 0,
        registrationDate: organizer.registrationDate || "",
        lastLogin: organizer.lastLogin || "",
        location: organizer.location || "",
        rating: organizer.rating || 0,
        totalTicketsSold: 0,
      });
    } else if (rawOrganizer) {
      // Use raw API data (snake_case)
      setOrganizerToDelete({
        id: String(rawOrganizer.id),
        name: rawOrganizer.name || rawOrganizer.username || "",
        email: rawOrganizer.email || "",
        phone: rawOrganizer.mobile_number || rawOrganizer.phone || rawOrganizer.contact_mobile || "",
        status: rawOrganizer.status || "active",
        category: rawOrganizer.category?.name || rawOrganizer.category || "",
        totalEvents: rawOrganizer.total_events || 0,
        totalRevenue: parseFloat(rawOrganizer.total_revenue) || 0,
        commission: (() => {
          const revenue = parseFloat(rawOrganizer.total_revenue || 0);
          const rate = parseFloat(rawOrganizer.commission_rate || 0);
          return revenue * rate;
        })(),
        payout: (() => {
          const revenue = parseFloat(rawOrganizer.total_revenue || 0);
          const rate = parseFloat(rawOrganizer.commission_rate || 0);
          return revenue - (revenue * rate);
        })(),
        registrationDate: rawOrganizer.registration_date || rawOrganizer.created_at || "",
        lastLogin: rawOrganizer.last_login || "",
        location: rawOrganizer.location || "",
        rating: parseFloat(rawOrganizer.rating) || 0,
        totalTicketsSold: rawOrganizer.total_tickets_sold || 0,
      });
    } else {
      // Fallback: create organizer object from ID if not found
      setOrganizerToDelete({
        id: organizerIdStr,
        name: "",
        email: "",
        phone: "",
        status: "active",
        category: "",
        totalEvents: 0,
        totalRevenue: 0,
        commission: 0,
        payout: 0,
        registrationDate: "",
        lastLogin: "",
        location: "",
        rating: 0,
        totalTicketsSold: 0,
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

  const handleExportOrganizers = () => {
    toast({
      title: t("admin.organizers.toast.exportSuccess"),
      description: t("admin.organizers.toast.exportSuccessDesc"),
    });
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

  const formatDateTimeForLocale = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, HH:mm", {
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
              search: searchTerm,
              status: statusFilter,
              category: categoryFilter,
            }}
            onExport={async (format) => {
              // Ensure we have all organizers data before exporting
              if (!allOrganizersData || allOrganizersForExport.length === 0) {
                await queryClient.fetchQuery({
                  queryKey: [
                    "organizers",
                    "all",
                    "export",
                    searchTerm,
                    statusFilter,
                    categoryFilter,
                  ],
                  queryFn: async () => {
                    const params: any = {
                      page: 1,
                      page_size: 10000,
                    };
                    if (searchTerm) params.search = searchTerm;
                    if (statusFilter !== "all") params.status = statusFilter;
                    if (categoryFilter !== "all") params.category = categoryFilter;
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
                    searchTerm,
                    statusFilter,
                    categoryFilter,
                  ],
                  queryFn: async () => {
                    const params: any = {
                      page: 1,
                      page_size: 10000,
                    };
                    if (searchTerm) params.search = searchTerm;
                    if (statusFilter !== "all") params.status = statusFilter;
                    if (categoryFilter !== "all") params.category = categoryFilter;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.organizers.filters.category")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.organizers.filters.allCategories")}
                </SelectItem>
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
        </CardContent>
      </Card>

      {/* Organizers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.organizers.table.organizer")} (
            {formatNumberForLocale(
              organizersData?.count || paginatedOrganizers.length,
              i18n.language
            )}
            )
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {organizersLoading
                ? t("common.loading")
                : `${t("admin.organizers.pagination.showing")} ${
                    (currentPage - 1) * itemsPerPage + 1
                  }-${Math.min(
                    currentPage * itemsPerPage,
                    organizersData?.count || paginatedOrganizers.length
                  )} ${t(
                    "admin.organizers.pagination.of"
                  )} ${formatNumberForLocale(
                    organizersData?.count || paginatedOrganizers.length,
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
                    {t("admin.organizers.table.rating")}
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
                      {t("admin.organizers.noOrganizers")}
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
                      <TableCell>
                        <p className="text-sm rtl:text-right ltr:text-left">
                          {formatNumberForLocale(
                            organizer.totalEvents,
                            i18n.language
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 rtl:flex-row-reverse">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">{organizer.rating}</span>
                        </div>
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
                (currentPage - 1) * itemsPerPage + 1
              }-${Math.min(
                currentPage * itemsPerPage,
                organizersData?.count || paginatedOrganizers.length
              )} ${t("admin.organizers.pagination.of")} ${formatNumberForLocale(
                organizersData?.count || paginatedOrganizers.length,
                i18n.language
              )} ${t("admin.organizers.pagination.results")}`}
              startIndex={(currentPage - 1) * itemsPerPage + 1}
              endIndex={Math.min(
                currentPage * itemsPerPage,
                organizersData?.count || paginatedOrganizers.length
              )}
              totalItems={organizersData?.count || paginatedOrganizers.length}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <img
                        src={
                          selectedOrganizer.profileImage ||
                          "/public/Portrait_Placeholder.png"
                        }
                        alt={selectedOrganizer.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
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

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
                    <TrendingUp className="h-5 w-5" />
                    {t("admin.organizers.details.statistics")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {selectedOrganizer.totalEvents}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.organizers.details.totalEvents")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {formatNumberForLocale(
                          selectedOrganizer.totalRevenue,
                          i18n.language
                        )}{" "}
                        EGP
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.organizers.details.totalRevenue")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {selectedOrganizer.rating}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.organizers.details.rating")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {selectedOrganizer.commissionRate}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.organizers.details.commissionRate")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
                    <FileText className="h-5 w-5" />
                    {t("admin.organizers.details.description")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm rtl:text-right ltr:text-left">
                    {selectedOrganizer.description}
                  </p>
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
          {selectedOrganizer && (
            <div className="space-y-4">
              <div className="flex justify-end rtl:text-right ltr:text-left">
                <Button onClick={() => setIsAddEventDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("admin.organizers.events.addEvent")}
                </Button>
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
                              {t("common.error")}: {organizerEventsError instanceof Error ? organizerEventsError.message : t("admin.organizers.events.loadError") || "Failed to load events"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : organizerEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("admin.organizers.events.noEvents") || "No events found for this organizer"}
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
                          {formatNumberForLocale(event.revenue, i18n.language)}{" "}
                          EGP
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
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEventsDialogOpen(false)}
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
              onClick={() => {
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

                // Create new event object
                const eventToAdd: OrganizerEvent = {
                  id: `E${String(organizerEvents.length + 1).padStart(3, "0")}`,
                  title: newEvent.title,
                  date: newEvent.date,
                  status: "upcoming",
                  ticketsSold: 0,
                  totalTickets: newEvent.totalTickets || 0,
                  revenue: 0,
                  commission: 0,
                  rating: 0,
                  image:
                    newEvent.imageUrl || "/public/Portrait_Placeholder.png",
                  description: newEvent.description || "",
                  location: newEvent.location,
                  price: 0,
                };

                setOrganizerEvents((prevEvents) => [...prevEvents, eventToAdd]);
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
              onClick={() => {
                if (!editingEvent) return;
                setOrganizerEvents((prevEvents) =>
                  prevEvents.map((event) =>
                    event.id === editingEvent.id ? editingEvent : event
                  )
                );
                toast({
                  title: t("admin.organizers.toast.eventUpdated"),
                  description: t("admin.organizers.toast.eventUpdatedDesc"),
                });
                setIsEditEventDialogOpen(false);
                setEditingEvent(null);
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
