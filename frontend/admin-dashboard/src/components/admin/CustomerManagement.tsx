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
  Mail,
  Phone,
  Calendar,
  DollarSign,
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
  TrendingUp,
  CreditCard,
  Ticket,
  MapPin,
  Star,
  StarOff,
  Repeat,
  Activity,
  Ban,
  Tag,
  Tags,
  Crown,
  Award,
  Shield,
  Heart,
  Zap,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import {
  formatNumberForLocale,
  formatCurrencyForLocale,
  formatPhoneNumberForLocale,
} from "@/lib/utils";
import { COUNTRY_DIAL_CODES } from "@/constants/countryCodes";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi, nfcCardsApi } from "@/lib/api/adminApi";

type CustomerLabel = {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "banned";
  registrationDate: string;
  lastLogin: string;
  totalBookings: number;
  totalSpent: number;
  nfcCardId?: string;
  attendedEvents: number;
  recurrentUser: boolean;
  location: string;
  profileImage?: string;
  labels: CustomerLabel[];
};

type CustomerBooking = {
  id: string;
  eventTitle: string;
  date: string;
  amount: number;
  status: "confirmed" | "cancelled" | "refunded";
};

type CustomerActivity = {
  id: string;
  type: "login" | "booking" | "checkin" | "payment" | "refund";
  description: string;
  timestamp: string;
  eventTitle?: string;
  amount?: number;
};

const CustomerManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { hasPermission, requirePermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [vipFilter, setVipFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showBookingsDialog, setShowBookingsDialog] = useState(false);
  const [showNfcCardDialog, setShowNfcCardDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showEditBookingDialog, setShowEditBookingDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<CustomerBooking | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const resetNewCustomerForm = () => {
    setNewCustomer((prev) => {
      if (prev.profileImagePreview) {
        URL.revokeObjectURL(prev.profileImagePreview);
      }
      return createInitialCustomerState();
    });
  };

  const nationalityOptions = useMemo(() => {
    const uniqueNames = Array.from(
      new Set(COUNTRY_DIAL_CODES.map((country) => country.name))
    );
    const rest = uniqueNames
      .filter((name) => name.toLowerCase() !== "egypt")
      .sort((a, b) => a.localeCompare(b));
    const egypt =
      uniqueNames.find((name) => name.toLowerCase() === "egypt") || null;
    return egypt ? [egypt, ...rest] : rest;
  }, []);

  const genderOptions = useMemo(
    () => [
      { value: "male", label: "admin.customers.form.genderMale" },
      { value: "female", label: "admin.customers.form.genderFemale" },
      { value: "other", label: "admin.customers.form.genderOther" },
    ],
    []
  );

  const bloodTypeOptions = useMemo(
    () => ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    []
  );

  const maxBirthDate = useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  );

  const createInitialCustomerState = () => ({
    name: "",
    email: "",
    phone: "",
    mobile_number: "",
    password: "",
    confirmPassword: "",
    status: "active" as "active" | "inactive" | "banned",
    nationality: "",
    gender: "",
    date_of_birth: "",
    emergency_contact_name: "",
    emergency_contact_mobile: "",
    blood_type: "",
    profileImageFile: null as File | null,
    profileImagePreview: "",
  });

  // Add customer form state
  const [newCustomer, setNewCustomer] = useState(
    () => createInitialCustomerState()
  );

  // Label management state
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [showManageLabelsDialog, setShowManageLabelsDialog] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<CustomerLabel[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [newLabel, setNewLabel] = useState({
    name: "",
    color: "#3B82F6",
    description: "",
    icon: "Tag",
  });

  // Available label colors and icons
  const labelColors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
  ];

  const labelIcons = [
    { name: "Tag", icon: Tag },
    { name: "Crown", icon: Crown },
    { name: "Award", icon: Award },
    { name: "Shield", icon: Shield },
    { name: "Heart", icon: Heart },
    { name: "Zap", icon: Zap },
    { name: "Star", icon: Star },
    { name: "CheckCircle", icon: CheckCircle },
  ];

  // Get current locale for date formatting
  const currentLocale = i18n.language === "ar" ? ar : enUS;

  // Format date for current locale
  const formatDateForLocale = (
    dateString: string,
    formatString: string = "MMM dd, yyyy"
  ) => {
    try {
      return format(parseISO(dateString), formatString, {
        locale: currentLocale,
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format time for current locale
  const formatTimeForLocale = (
    dateString: string,
    formatString: string = "HH:mm"
  ) => {
    try {
      return format(parseISO(dateString), formatString, {
        locale: currentLocale,
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format number for current locale
  const formatNumber = (number: number) => {
    return formatNumberForLocale(number, i18n.language);
  };

  // Format currency for current locale
  const formatCurrency = (amount: number) => {
    return formatCurrencyForLocale(amount, i18n.language);
  };

  // Format phone number for current locale
  const formatPhone = (phoneNumber: string) => {
    return formatPhoneNumberForLocale(phoneNumber, i18n.language);
  };

  const queryClient = useQueryClient();

  // Fetch customers from API
  const {
    data: customersData,
    isLoading: customersLoading,
    error: customersError,
  } = useQuery({
    queryKey: [
      "customers",
      searchTerm,
      statusFilter,
      vipFilter,
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
      if (vipFilter === "recurrent") params.is_recurrent = true;
      if (vipFilter === "non-recurrent") params.is_recurrent = false;

      const response = await customersApi.getCustomers(params);
      return response;
    },
  });

  // Transform API customers to match Customer interface
  const customers: Customer[] = useMemo(() => {
    if (!customersData?.results) return [];
    return customersData.results.map((item: any) => ({
      id: item.id?.toString() || "",
      name: item.name || "",
      email: item.email || "",
      phone: item.phone || item.mobile_number || "",
      status: item.status as "active" | "inactive" | "banned",
      registrationDate: item.registration_date || item.created_at || "",
      lastLogin: item.last_login || "",
      totalBookings: item.total_bookings || 0,
      totalSpent: parseFloat(item.total_spent) || 0,
      nfcCardId: item.nfc_card_id || undefined,
      attendedEvents: item.attended_events || 0,
      recurrentUser: item.is_recurrent || false,
      location: "", // Not in backend model
      profileImage: item.profile_image || undefined, // Use actual profile image from backend
      labels: [], // Labels are not in backend API yet
    }));
  }, [customersData]);

  // Compute unique locations from customers
  const uniqueLocations = useMemo(() => {
    const locations = customers
      .map((customer) => customer.location)
      .filter((location) => location && location.trim() !== "");
    return Array.from(new Set(locations)).sort();
  }, [customers]);

  // Mock customers data (removed - using API now)
  /*
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: "C001",
      name: "Ahmed Hassan",
      email: "ahmed.hassan@example.com",
      phone: "+20 10 1234 5678",
      status: "active",
      registrationDate: "2024-01-15",
      lastLogin: "2025-08-16T10:30:00",
      totalBookings: 8,
      totalSpent: 2500,
      nfcCardId: "NFC-001-2025",
      attendedEvents: 6,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      labels: [
        {
          id: "label-1",
          name: "VIP",
          color: "#F59E0B",
          description: "Very Important Person",
          icon: "Crown",
        },
        {
          id: "label-2",
          name: "Front Row",
          color: "#10B981",
          description: "Front row seating preference",
          icon: "Star",
        },
      ],
    },
    {
      id: "C002",
      name: "Sarah Mohamed",
      email: "sarah.mohamed@example.com",
      phone: "+20 10 2345 6789",
      status: "active",
      registrationDate: "2024-02-20",
      lastLogin: "2025-08-15T15:45:00",
      totalBookings: 5,
      totalSpent: 1800,
      nfcCardId: "NFC-002-2025",
      attendedEvents: 4,
      recurrentUser: true,
      location: "Alexandria, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      labels: [
        {
          id: "label-3",
          name: "Premium",
          color: "#8B5CF6",
          description: "Premium customer",
          icon: "Award",
        },
      ],
    },
    {
      id: "C003",
      name: "Omar Ali",
      email: "omar.ali@example.com",
      phone: "+20 10 3456 7890",
      status: "inactive",
      registrationDate: "2024-03-10",
      lastLogin: "2025-07-20T09:15:00",
      totalBookings: 3,
      totalSpent: 900,
      attendedEvents: 2,
      recurrentUser: false,
      location: "Giza, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C004",
      name: "Fatima Ahmed",
      email: "fatima.ahmed@example.com",
      phone: "+20 10 4567 8901",
      status: "banned",
      registrationDate: "2024-04-05",
      lastLogin: "2025-06-15T14:20:00",
      totalBookings: 2,
      totalSpent: 600,
      attendedEvents: 1,
      recurrentUser: false,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C005",
      name: "Youssef Ibrahim",
      email: "youssef.ibrahim@example.com",
      phone: "+20 10 5678 9012",
      status: "active",
      registrationDate: "2024-05-12",
      lastLogin: "2025-08-16T11:00:00",
      totalBookings: 12,
      totalSpent: 4200,
      nfcCardId: "NFC-005-2025",
      attendedEvents: 10,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C006",
      name: "Mariam Khalil",
      email: "mariam.khalil@example.com",
      phone: "+20 10 6789 0123",
      status: "active",
      registrationDate: "2024-06-18",
      lastLogin: "2025-08-17T14:30:00",
      totalBookings: 6,
      totalSpent: 1800,
      nfcCardId: "NFC-006-2025",
      attendedEvents: 5,
      recurrentUser: true,
      location: "Alexandria, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C007",
      name: "Karim Hassan",
      email: "karim.hassan@example.com",
      phone: "+20 10 7890 1234",
      status: "inactive",
      registrationDate: "2024-07-05",
      lastLogin: "2025-07-25T16:45:00",
      totalBookings: 4,
      totalSpent: 1200,
      attendedEvents: 3,
      recurrentUser: false,
      location: "Giza, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C008",
      name: "Layla Ahmed",
      email: "layla.ahmed@example.com",
      phone: "+20 10 8901 2345",
      status: "banned",
      registrationDate: "2024-08-20",
      lastLogin: "2025-07-10T12:20:00",
      totalBookings: 2,
      totalSpent: 600,
      attendedEvents: 1,
      recurrentUser: false,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C009",
      name: "Hassan Ali",
      email: "hassan.ali@example.com",
      phone: "+20 10 9012 3456",
      status: "active",
      registrationDate: "2024-09-01",
      lastLogin: "2025-08-18T09:15:00",
      totalBookings: 9,
      totalSpent: 2700,
      nfcCardId: "NFC-008-2025",
      attendedEvents: 7,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C010",
      name: "Nour Ibrahim",
      email: "nour.ibrahim@example.com",
      phone: "+20 10 0123 4567",
      status: "active",
      registrationDate: "2024-10-15",
      lastLogin: "2025-08-19T10:30:00",
      totalBookings: 7,
      totalSpent: 2100,
      nfcCardId: "NFC-010-2025",
      attendedEvents: 6,
      recurrentUser: true,
      location: "Alexandria, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C011",
      name: "Amira Mohamed",
      email: "amira.mohamed@example.com",
      phone: "+20 10 1234 5678",
      status: "inactive",
      registrationDate: "2024-11-08",
      lastLogin: "2025-08-15T11:00:00",
      totalBookings: 3,
      totalSpent: 900,
      attendedEvents: 2,
      recurrentUser: false,
      location: "Giza, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C012",
      name: "Omar Khalil",
      email: "omar.khalil@example.com",
      phone: "+20 10 2345 6789",
      status: "active",
      registrationDate: "2024-12-12",
      lastLogin: "2025-08-20T15:45:00",
      totalBookings: 11,
      totalSpent: 3300,
      nfcCardId: "NFC-013-2025",
      attendedEvents: 9,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C013",
      name: "Fatima Hassan",
      email: "fatima.hassan@example.com",
      phone: "+20 10 3456 7890",
      status: "active",
      registrationDate: "2025-01-20",
      lastLogin: "2025-08-21T13:20:00",
      totalBookings: 5,
      totalSpent: 1500,
      nfcCardId: "NFC-014-2025",
      attendedEvents: 4,
      recurrentUser: true,
      location: "Alexandria, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C014",
      name: "Youssef Ali",
      email: "youssef.ali@example.com",
      phone: "+20 10 4567 8901",
      status: "banned",
      registrationDate: "2025-02-14",
      lastLogin: "2025-08-05T09:30:00",
      totalBookings: 1,
      totalSpent: 300,
      attendedEvents: 0,
      recurrentUser: false,
      location: "Giza, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
    {
      id: "C015",
      name: "Sara Khalil",
      email: "sara.khalil@example.com",
      phone: "+20 10 5678 9012",
      status: "active",
      registrationDate: "2025-03-10",
      lastLogin: "2025-08-22T16:10:00",
      totalBookings: 8,
      totalSpent: 2400,
      nfcCardId: "NFC-015-2025",
      attendedEvents: 6,
      recurrentUser: true,
      location: "Cairo, Egypt",
      profileImage:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      labels: [],
    },
  ]);
  */

  // Customer bookings are now fetched from API (see useQuery above)

  // Customer activities - empty for now (can be fetched from backend later)
  const customerActivities: CustomerActivity[] = [];

  // Filtered customers (API handles most filtering, but we filter location client-side if needed)
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Client-side location filter (if backend doesn't support it)
    if (locationFilter !== "all") {
      filtered = filtered.filter((customer) =>
        customer.location.includes(locationFilter)
      );
    }

    return filtered;
  }, [customers, locationFilter]);

  // Pagination from API response
  const totalPages = customersData?.total_pages || 1;
  const startIndex = customersData?.page
    ? (customersData.page - 1) * customersData.page_size
    : 0;
  const endIndex = startIndex + (customersData?.page_size || itemsPerPage);
  const paginatedCustomers = filteredCustomers;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, vipFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "banned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.customers.status.active");
      case "inactive":
        return t("admin.customers.status.inactive");
      case "banned":
        return t("admin.customers.status.banned");
      default:
        return status;
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case "login":
        return <User className="h-4 w-4" />;
      case "booking":
        return <Ticket className="h-4 w-4" />;
      case "checkin":
        return <CheckCircle className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      case "refund":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await customersApi.updateCustomer(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: t("admin.customers.toast.customerUpdated"),
        description: t("admin.customers.toast.customerUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          t("admin.customers.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Update customer status mutation
  const updateCustomerStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await customersApi.updateCustomerStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: t("admin.customers.toast.customerUpdated"),
        description: t("admin.customers.toast.customerUpdatedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          t("admin.customers.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await customersApi.createCustomer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: t("admin.customers.toast.customerAdded"),
        description: t("admin.customers.toast.customerAddedDesc"),
      });
      setIsAddDialogOpen(false);
      resetNewCustomerForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message ||
          t("admin.customers.toast.error"),
        variant: "destructive",
      });
    },
  });

  const handleEditCustomer = (customer: Customer) => {
    if (!requirePermission("customers_edit")) {
      return;
    }
    setSelectedCustomer(customer);
    setIsEditDialogOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    if (!requirePermission("customers_view")) {
      return;
    }
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: t("admin.customers.toast.customerDeleted"),
        description: t("admin.customers.toast.customerDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.message ||
          error.message ||
          t("admin.customers.toast.error"),
        variant: "destructive",
      });
    },
  });

  const handleDeleteCustomer = (customerId: string | number) => {
    if (!requirePermission("customers_delete")) {
      return;
    }
    
    // Convert customerId to string for comparison (since customers array uses string IDs)
    const customerIdStr = String(customerId);
    
    // Try to find in customers array first (mapped data)
    let customer = customers.find((c) => String(c.id) === customerIdStr);
    let rawCustomer: any = null;
    
    // If not found, try in customersData.results (raw API data)
    if (!customer) {
      rawCustomer = customersData?.results?.find((c: any) => String(c.id) === customerIdStr);
    }
    
    if (customer) {
      // Use mapped customer data (camelCase)
      setCustomerToDelete({
        id: String(customer.id),
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        status: customer.status || "active",
        registrationDate: customer.registrationDate || "",
        lastLogin: customer.lastLogin || "",
        totalBookings: customer.totalBookings || 0,
        totalSpent: customer.totalSpent || 0,
        attendedEvents: customer.attendedEvents || 0,
        recurrentUser: customer.recurrentUser || false,
        location: customer.location || "",
        labels: customer.labels || [],
      });
    } else if (rawCustomer) {
      // Use raw API data (snake_case)
      setCustomerToDelete({
        id: String(rawCustomer.id),
        name: rawCustomer.name || "",
        email: rawCustomer.email || "",
        phone: rawCustomer.mobile_number || rawCustomer.phone || "",
        status: rawCustomer.status || "active",
        registrationDate: rawCustomer.registration_date || rawCustomer.created_at || "",
        lastLogin: rawCustomer.last_login || "",
        totalBookings: rawCustomer.total_bookings || 0,
        totalSpent: parseFloat(rawCustomer.total_spent) || 0,
        attendedEvents: rawCustomer.attended_events || 0,
        recurrentUser: rawCustomer.is_recurrent || false,
        location: "",
        labels: [],
      });
    } else {
      // Fallback: create customer object from ID if not found
      setCustomerToDelete({
        id: customerIdStr,
        name: "",
        email: "",
        phone: "",
        status: "active",
        registrationDate: "",
        lastLogin: "",
        totalBookings: 0,
        totalSpent: 0,
        attendedEvents: 0,
        recurrentUser: false,
        location: "",
        labels: [],
      });
    }
    
    // Always open the dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  const handleExportCustomers = () => {
    toast({
      title: t("admin.customers.toast.exportSuccess"),
      description: t("admin.customers.toast.exportSuccessDesc"),
    });
  };

  const handleDeactivateCustomer = (customerId: string) => {
    updateCustomerStatusMutation.mutate({ id: customerId, status: "inactive" });
  };

  const handleReactivateCustomer = (customerId: string) => {
    updateCustomerStatusMutation.mutate({ id: customerId, status: "active" });
  };

  const handleBanCustomer = (customerId: string) => {
    if (!requirePermission("customers_ban")) {
      return;
    }
    updateCustomerStatusMutation.mutate({ id: customerId, status: "banned" });
  };

  const handleUnbanCustomer = (customerId: string) => {
    if (!requirePermission("customers_ban")) {
      return;
    }
    updateCustomerStatusMutation.mutate({ id: customerId, status: "active" });
  };

  const handleForcePasswordReset = (customerId: string) => {
    toast({
      title: t("admin.customers.toast.passwordReset"),
      description: t("admin.customers.toast.passwordResetDesc"),
    });
  };

  // Fetch customer bookings
  const { data: customerBookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["customerBookings", selectedCustomer?.id],
    queryFn: () => {
      if (!selectedCustomer?.id) return null;
      return customersApi.getCustomerBookings(selectedCustomer.id);
    },
    enabled: !!selectedCustomer?.id && showBookingsDialog,
  });

  // Transform bookings data
  const customerBookings: CustomerBooking[] = useMemo(() => {
    if (!customerBookingsData) return [];
    return customerBookingsData.map((ticket: any) => ({
      id: ticket.id?.toString() || "",
      eventTitle: ticket.event?.title || ticket.event_name || "Unknown Event",
      date: ticket.purchase_date || ticket.event?.date || "",
      amount: ticket.price || ticket.amount || 0,
      status:
        ticket.status === "checked_in"
          ? "confirmed"
          : ticket.status === "cancelled"
          ? "cancelled"
          : ticket.status === "refunded"
          ? "refunded"
          : "confirmed",
    }));
  }, [customerBookingsData]);

  const handleViewBookings = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setShowBookingsDialog(true);
    }
  };

  // Fetch customer NFC card
  const { data: customerNfcCardData, isLoading: nfcCardLoading } = useQuery({
    queryKey: ["customerNfcCard", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return null;
      // Get cards filtered by customer
      const response = await nfcCardsApi.getCards({
        customer: selectedCustomer.id,
        page_size: 1,
      });
      return response.results?.[0] || null;
    },
    enabled: !!selectedCustomer?.id && showNfcCardDialog,
  });

  const handleViewNfcCard = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setShowNfcCardDialog(true);
    }
  };

  const handleViewActivity = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setShowActivityDialog(true);
    }
  };

  const handleProfileImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] || null;
    setNewCustomer((prev) => {
      if (prev.profileImagePreview) {
        URL.revokeObjectURL(prev.profileImagePreview);
      }
      return {
        ...prev,
        profileImageFile: file,
        profileImagePreview: file ? URL.createObjectURL(file) : "",
      };
    });
  };

  const handleRemoveProfileImage = () => {
    setNewCustomer((prev) => {
      if (prev.profileImagePreview) {
        URL.revokeObjectURL(prev.profileImagePreview);
      }
      return { ...prev, profileImageFile: null, profileImagePreview: "" };
    });
  };

  const handleAddCustomer = () => {
    if (!requirePermission("customers_create")) {
      return;
    }
    // Validate required fields
    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
      toast({
        title: t("common.error"),
        description: t("admin.customers.form.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    if (!newCustomer.nationality || !newCustomer.gender || !newCustomer.date_of_birth) {
      toast({
        title: t("common.error"),
        description: t("admin.customers.form.requiredDemographics"),
        variant: "destructive",
      });
      return;
    }

    // Validate password if provided
    if (
      newCustomer.password &&
      newCustomer.password !== newCustomer.confirmPassword
    ) {
      toast({
        title: t("common.error"),
        description: t("admin.customers.form.passwordsDoNotMatch"),
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    const appendIfValue = (key: string, value?: string | null) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      }
    };

    appendIfValue("name", newCustomer.name.trim());
    appendIfValue("email", newCustomer.email.trim());
    appendIfValue("phone", newCustomer.phone.trim());
    appendIfValue("mobile_number", newCustomer.mobile_number.trim());
    appendIfValue("status", newCustomer.status);
    appendIfValue("nationality", newCustomer.nationality);
    appendIfValue("gender", newCustomer.gender);
    appendIfValue("date_of_birth", newCustomer.date_of_birth);
    appendIfValue(
      "emergency_contact_name",
      newCustomer.emergency_contact_name.trim()
    );
    appendIfValue(
      "emergency_contact_mobile",
      newCustomer.emergency_contact_mobile.trim()
    );
    appendIfValue("blood_type", newCustomer.blood_type);
    appendIfValue("password", newCustomer.password);

    if (newCustomer.profileImageFile) {
      formData.append("profile_image", newCustomer.profileImageFile);
    }

    createCustomerMutation.mutate(formData);
  };

  const handleSaveCustomerChanges = () => {
    if (!selectedCustomer) return;

    // Get form values (you'll need to add state for form fields)
    // For now, just update status if changed
    const formData = {
      name: selectedCustomer.name,
      email: selectedCustomer.email,
      phone: selectedCustomer.phone,
      status: selectedCustomer.status,
      // Add other fields as needed
    };

    updateCustomerMutation.mutate({ id: selectedCustomer.id, data: formData });
  };

  const handleEditBooking = (booking: CustomerBooking) => {
    setSelectedBooking(booking);
    setShowEditBookingDialog(true);
  };

  const handleSaveBookingChanges = () => {
    toast({
      title: t("admin.customers.toast.bookingUpdated"),
      description: t("admin.customers.toast.bookingUpdatedDesc"),
    });
    setShowEditBookingDialog(false);
    setSelectedBooking(null);
  };

  const handleCancelBooking = (bookingId: string) => {
    toast({
      title: t("admin.customers.toast.bookingCancelled"),
      description: t("admin.customers.toast.bookingCancelledDesc"),
    });
  };

  const handleRefundBooking = (bookingId: string) => {
    toast({
      title: t("admin.customers.toast.bookingRefunded"),
      description: t("admin.customers.toast.bookingRefundedDesc"),
    });
  };

  // Label management functions
  const handleManageLabels = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedLabels(customer.labels);
    setShowManageLabelsDialog(true);
  };

  const handleSetVIP = (customer: Customer) => {
    const vipLabel: CustomerLabel = {
      id: "vip-label",
      name: "VIP",
      color: "#F59E0B",
      description: "Very Important Person",
      icon: "Crown",
    };

    // Check if customer already has VIP label
    const hasVIP = customer.labels.some((label) => label.name === "VIP");

    if (hasVIP) {
      toast({
        title: t("admin.customers.vip.alreadyVIP"),
        description: t("admin.customers.vip.alreadyVIPDesc"),
        variant: "default",
      });
      return;
    }

    // Add VIP label to customer
    const updatedCustomer = {
      ...customer,
      labels: [...customer.labels, vipLabel],
    };

    // Update selected customer if it's the same one
    if (selectedCustomer && selectedCustomer.id === customer.id) {
      setSelectedCustomer(updatedCustomer);
    }

    // Invalidate queries to refetch from API
    queryClient.invalidateQueries({ queryKey: ["customers"] });

    toast({
      title: t("admin.customers.vip.setVIPSuccess"),
      description: t("admin.customers.vip.setVIPSuccessDesc"),
    });
  };

  const handleRemoveVIP = (customer: Customer) => {
    // Remove VIP label from customer
    const updatedCustomer = {
      ...customer,
      labels: customer.labels.filter((label) => label.name !== "VIP"),
    };

    // Update selected customer if it's the same one
    if (selectedCustomer && selectedCustomer.id === customer.id) {
      setSelectedCustomer(updatedCustomer);
    }

    // Invalidate queries to refetch from API
    queryClient.invalidateQueries({ queryKey: ["customers"] });

    toast({
      title: t("admin.customers.vip.removeVIPSuccess"),
      description: t("admin.customers.vip.removeVIPSuccessDesc"),
    });
  };

  const handleAddLabel = () => {
    if (!newLabel.name.trim()) {
      toast({
        title: t("admin.customers.labels.error.nameRequired"),
        description: t("admin.customers.labels.error.nameRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    const label: CustomerLabel = {
      id: `label-${Date.now()}`,
      name: newLabel.name,
      color: newLabel.color,
      description: newLabel.description,
      icon: newLabel.icon,
    };

    if (selectedCustomer) {
      const updatedCustomer = {
        ...selectedCustomer,
        labels: [...selectedCustomer.labels, label],
      };
      setSelectedCustomer(updatedCustomer);
      setSelectedLabels(updatedCustomer.labels);

      // Invalidate queries to refetch from API
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }

    setNewLabel({
      name: "",
      color: "#3B82F6",
      description: "",
      icon: "Tag",
    });

    toast({
      title: t("admin.customers.labels.toast.labelAdded"),
      description: t("admin.customers.labels.toast.labelAddedDesc"),
    });
  };

  const handleRemoveLabel = (labelId: string) => {
    if (selectedCustomer) {
      const updatedCustomer = {
        ...selectedCustomer,
        labels: selectedCustomer.labels.filter((label) => label.id !== labelId),
      };
      setSelectedCustomer(updatedCustomer);
      setSelectedLabels(updatedCustomer.labels);

      // Invalidate queries to refetch from API
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    }

    toast({
      title: t("admin.customers.labels.toast.labelRemoved"),
      description: t("admin.customers.labels.toast.labelRemovedDesc"),
    });
  };

  const handleSaveLabels = () => {
    if (selectedCustomer) {
      // Invalidate queries to refetch from API
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      // Update selected customer
      const updatedSelectedCustomer = {
        ...selectedCustomer,
        labels: selectedLabels,
      };
      setSelectedCustomer(updatedSelectedCustomer);

      toast({
        title: t("admin.customers.labels.toast.labelsSaved"),
        description: t("admin.customers.labels.toast.labelsSavedDesc"),
      });
    }
    setShowManageLabelsDialog(false);
  };

  const getLabelIcon = (iconName: string | undefined) => {
    const iconObj = labelIcons.find((icon) => icon.name === iconName);
    return iconObj ? iconObj.icon : Tag;
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.customers.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.customers.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredCustomers}
            columns={commonColumns.customers}
            title={t("admin.customers.title")}
            subtitle={t("admin.customers.subtitle")}
            filename="customers"
            filters={{
              search: searchTerm,
              status: statusFilter,
              location: locationFilter,
              vip: vipFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.customers.toast.exportSuccess"),
                description: t("admin.customers.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.customers.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => {
              if (requirePermission("customers_create")) {
                setIsAddDialogOpen(true);
              }
            }}
            className="text-xs sm:text-sm"
            disabled={!hasPermission("customers_create")}
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.customers.actions.addCustomer")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* VIP Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.customers.stats.totalCustomers")}
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(customers.length)}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.customers.stats.vipCustomers")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(
                    customers.filter((c) =>
                      c.labels.some((label) => label.name === "VIP")
                    ).length
                  )}
                </p>
              </div>
              <Crown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.customers.stats.activeCustomers")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(
                    customers.filter((c) => c.status === "active").length
                  )}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.customers.stats.recurrentUsers")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatNumber(
                    customers.filter((c) => c.recurrentUser).length
                  )}
                </p>
              </div>
              <Repeat className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.customers.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.customers.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.customers.filters.status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.customers.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.customers.filters.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.customers.filters.inactive")}
                </SelectItem>
                <SelectItem value="banned">
                  {t("admin.customers.filters.banned")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.customers.filters.location")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.customers.filters.allLocations")}
                </SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={vipFilter} onValueChange={setVipFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.customers.filters.vipStatus")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.customers.filters.allCustomers")}
                </SelectItem>
                <SelectItem value="vip">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-600" />
                    {t("admin.customers.filters.vipOnly")}
                  </div>
                </SelectItem>
                <SelectItem value="non-vip">
                  {t("admin.customers.filters.nonVipOnly")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.customers.table.customer")} (
            {formatNumber(filteredCustomers.length)})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.customers.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredCustomers.length)}{" "}
              {t("admin.customers.pagination.of")} {filteredCustomers.length}
            </span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => setItemsPerPage(parseInt(value))}
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
                    {t("admin.customers.table.customer")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.contact")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.registration")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.lastLogin")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.bookings")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.spent")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.labels")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.customers.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">
                        {t("common.loading")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : customersError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <span className="ml-2 text-red-500">
                        {t("common.error")}:{" "}
                        {customersError instanceof Error
                          ? customersError.message
                          : t("admin.customers.toast.error")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : paginatedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {t("admin.customers.noCustomersFound")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <img
                            src={
                              customer.profileImage ||
                              "/Portrait_Placeholder.png"
                            }
                            alt={customer.name}
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              e.currentTarget.src = "/Portrait_Placeholder.png";
                            }}
                          />
                          <div className="rtl:text-right ltr:text-left">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.customers.table.id")}: {customer.id}
                            </p>
                            {customer.recurrentUser && (
                              <Badge variant="outline" className="mt-1">
                                <Repeat className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {t("admin.customers.table.recurrent")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="text-sm">{customer.email}</p>
                          <p
                            className="text-sm text-muted-foreground"
                            dir="ltr"
                          >
                            {formatPhone(customer.phone)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(customer.status)}>
                          {getStatusText(customer.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right ltr:text-left">
                          {formatDateForLocale(customer.registrationDate)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right ltr:text-left">
                          {customer.lastLogin
                            ? formatDateForLocale(
                                customer.lastLogin,
                                "MMM dd, HH:mm"
                              )
                            : t("admin.customers.details.never")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="font-medium">
                            {formatNumber(customer.totalBookings)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("admin.customers.table.attended")}:{" "}
                            {formatNumber(customer.attendedEvents)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="font-medium">
                            {formatCurrency(customer.totalSpent)}
                          </p>
                          {customer.nfcCardId && (
                            <p className="text-sm text-muted-foreground">
                              {t("admin.customers.table.nfcCard")}:{" "}
                              {customer.nfcCardId}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.labels.map((label) => {
                            const IconComponent = getLabelIcon(label.icon);
                            return (
                              <Badge
                                key={label.id}
                                className="text-xs"
                                style={{
                                  backgroundColor: label.color,
                                  color: "white",
                                }}
                              >
                                <IconComponent className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                                {label.name}
                              </Badge>
                            );
                          })}
                          {customer.labels.length === 0 && (
                            <span className="text-xs text-muted-foreground">
                              {t("admin.customers.table.noLabels")}
                            </span>
                          )}
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
                              {t("admin.customers.table.actions")}
                            </DropdownMenuLabel>
                            {hasPermission("customers_view") && (
                              <DropdownMenuItem
                                onClick={() => handleViewCustomer(customer)}
                              >
                                <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.customers.actions.viewDetails")}
                              </DropdownMenuItem>
                            )}
                            {hasPermission("customers_edit") && (
                              <DropdownMenuItem
                                onClick={() => handleEditCustomer(customer)}
                              >
                                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.customers.actions.editCustomer")}
                              </DropdownMenuItem>
                            )}
                            {(hasPermission("customers_view") ||
                              hasPermission("customers_edit")) && (
                              <DropdownMenuSeparator />
                            )}
                            {hasPermission("customers_view") && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleViewBookings(customer.id)
                                  }
                                >
                                  <Ticket className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.customers.actions.viewBookings")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleViewNfcCard(customer.id)}
                                >
                                  <CreditCard className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.customers.actions.viewNfcCard")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {hasPermission("customers_view") &&
                              hasPermission("customers_ban") && (
                                <DropdownMenuSeparator />
                              )}
                            {hasPermission("customers_ban") &&
                              (customer.status === "banned" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUnbanCustomer(customer.id)
                                  }
                                  className="text-green-600"
                                >
                                  <Unlock className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.customers.actions.unbanCustomer") ||
                                    "Unban Customer"}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleBanCustomer(customer.id)}
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.customers.actions.banCustomer")}
                                </DropdownMenuItem>
                              ))}
                            {hasPermission("customers_delete") && (
                              <>
                                {hasPermission("customers_ban") && (
                                  <DropdownMenuSeparator />
                                )}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteCustomer(customer.id)
                                  }
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t("admin.customers.actions.deleteCustomer")}
                                </DropdownMenuItem>
                              </>
                            )}
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
          {!customersLoading && !customersError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.customers.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, customersData?.count || 0)} ${t(
                "admin.customers.pagination.of"
              )} ${customersData?.count || 0} ${t(
                "admin.customers.pagination.results"
              )}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={customersData?.count || 0}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.customerDetails")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.customerDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="text-center">
                    <img
                      src={
                        selectedCustomer.profileImage ||
                        "/Portrait_Placeholder.png"
                      }
                      alt={selectedCustomer.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        e.currentTarget.src = "/Portrait_Placeholder.png";
                      }}
                    />
                    <h3 className="text-xl font-bold rtl:text-right ltr:text-left">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-muted-foreground rtl:text-right ltr:text-left">
                      {selectedCustomer.email}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        className={getStatusColor(selectedCustomer.status)}
                      >
                        {getStatusText(selectedCustomer.status)}
                      </Badge>
                      {selectedCustomer.labels.some(
                        (label) => label.name === "VIP"
                      ) && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          <Crown className="h-3 w-3 mr-1 rtl:ml-1 rtl:mr-0" />
                          VIP
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.phone")}
                      </p>
                      <p className="text-sm text-muted-foreground" dir="ltr">
                        {formatPhone(selectedCustomer.phone)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.location")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.location}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.registrationDate")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateForLocale(selectedCustomer.registrationDate)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.lastLogin")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.lastLogin
                          ? formatDateForLocale(
                              selectedCustomer.lastLogin,
                              "MMM dd, yyyy HH:mm"
                            )
                          : t("admin.customers.details.never")}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.totalBookings")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(selectedCustomer.totalBookings)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.totalSpent")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(selectedCustomer.totalSpent)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.attendedEvents")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(selectedCustomer.attendedEvents)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.customers.details.nfcCard")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.nfcCardId ||
                          t("admin.customers.details.noNfcCard")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.customers.details.recentActivity")}
                </h4>
                <div className="space-y-2">
                  {customerActivities.map((activity: CustomerActivity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg rtl:space-x-reverse"
                    >
                      {getActivityTypeIcon(activity.type)}
                      <div className="flex-1 rtl:text-right ltr:text-left">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        {activity.eventTitle && (
                          <p className="text-xs text-muted-foreground">
                            {activity.eventTitle}
                          </p>
                        )}
                      </div>
                      <div className="rtl:text-left ltr:text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDateForLocale(
                            activity.timestamp,
                            "MMM dd, HH:mm"
                          )}
                        </p>
                        {activity.amount && (
                          <p className="text-xs font-medium">
                            {formatCurrency(activity.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomerDetails(false)}
            >
              {t("admin.customers.dialogs.close")}
            </Button>
            {selectedCustomer && (
              <>
                {selectedCustomer.labels.some(
                  (label) => label.name === "VIP"
                ) ? (
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveVIP(selectedCustomer)}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    <Crown className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {t("admin.customers.actions.removeVIP")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleSetVIP(selectedCustomer)}
                    className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                  >
                    <Crown className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {t("admin.customers.actions.setVIP")}
                  </Button>
                )}
                <Button onClick={() => handleEditCustomer(selectedCustomer)}>
                  {t("admin.customers.actions.editCustomer")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.editCustomer")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.editCustomerSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.name")}
                  </label>
                  <Input defaultValue={selectedCustomer.name} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.email")}
                  </label>
                  <Input type="email" defaultValue={selectedCustomer.email} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.phone")}
                  </label>
                  <Input defaultValue={selectedCustomer.phone} dir="ltr" />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.location")}
                  </label>
                  <Input defaultValue={selectedCustomer.location} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.status")}
                  </label>
                  <Select defaultValue={selectedCustomer.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.customers.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.customers.status.inactive")}
                      </SelectItem>
                      <SelectItem value="banned">
                        {t("admin.customers.status.banned")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Password Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right ltr:text-left">
                  {t("admin.customers.form.passwordSection")}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium rtl:text-right ltr:text-left">
                      {t("admin.customers.form.newPassword")}
                    </label>
                    <Input
                      type="password"
                      placeholder={t(
                        "admin.customers.form.newPasswordPlaceholder"
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right ltr:text-left">
                      {t("admin.customers.form.confirmPassword")}
                    </label>
                    <Input
                      type="password"
                      placeholder={t(
                        "admin.customers.form.confirmPasswordPlaceholder"
                      )}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 rtl:text-right ltr:text-left">
                  {t("admin.customers.form.passwordNote")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.customers.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveCustomerChanges}>
              {t("admin.customers.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left max-w-4xl w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.addCustomer")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.addCustomerSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.name")} *
                </label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder={t("admin.customers.form.namePlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.email")} *
                </label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, email: e.target.value })
                  }
                  placeholder={t("admin.customers.form.emailPlaceholder")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.phone")} *
                </label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder={t("admin.customers.form.phonePlaceholder")}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.mobileNumber")}
                </label>
                <Input
                  value={newCustomer.mobile_number}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      mobile_number: e.target.value,
                    })
                  }
                  placeholder={t(
                    "admin.customers.form.mobileNumberPlaceholder"
                  )}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Status Selection */}
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.customers.form.status")}
              </label>
              <Select
                value={newCustomer.status}
                onValueChange={(value: "active" | "inactive" | "banned") =>
                  setNewCustomer({ ...newCustomer, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    {t("admin.customers.status.active")}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t("admin.customers.status.inactive")}
                  </SelectItem>
                  <SelectItem value="banned">
                    {t("admin.customers.status.banned")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.nationality")} *
                </label>
                <Select
                  value={newCustomer.nationality}
                  onValueChange={(value) =>
                    setNewCustomer({ ...newCustomer, nationality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "admin.customers.form.selectNationality"
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalityOptions.map((nation) => (
                      <SelectItem key={nation} value={nation}>
                        {nation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.gender")} *
                </label>
                <Select
                  value={newCustomer.gender}
                  onValueChange={(value) =>
                    setNewCustomer({ ...newCustomer, gender: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.customers.form.selectGender")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.dateOfBirth")} *
                </label>
                <Input
                  type="date"
                  max={maxBirthDate}
                  value={newCustomer.date_of_birth}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      date_of_birth: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.bloodType")}
                </label>
                <Select
                  value={newCustomer.blood_type}
                  onValueChange={(value) =>
                    setNewCustomer({ ...newCustomer, blood_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.customers.form.selectBloodType")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.emergencyContactName")}
                </label>
                <Input
                  value={newCustomer.emergency_contact_name}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      emergency_contact_name: e.target.value,
                    })
                  }
                  placeholder={t(
                    "admin.customers.form.emergencyContactNamePlaceholder"
                  )}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.customers.form.emergencyContactPhone")}
                </label>
                <Input
                  value={newCustomer.emergency_contact_mobile}
                  onChange={(e) =>
                    setNewCustomer({
                      ...newCustomer,
                      emergency_contact_mobile: e.target.value,
                    })
                  }
                  placeholder={t(
                    "admin.customers.form.emergencyContactPhonePlaceholder"
                  )}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Profile Photo */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.customers.form.profilePhoto")}
              </label>
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {t("admin.customers.form.profilePhotoDescription")}
              </p>
              {newCustomer.profileImagePreview && (
                <div className="flex items-center gap-4 mt-3">
                  <img
                    src={newCustomer.profileImagePreview}
                    alt={newCustomer.name || "Customer preview"}
                    className="h-16 w-16 rounded-full object-cover border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveProfileImage}
                  >
                    {t("admin.customers.form.removePhoto")}
                  </Button>
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                className="mt-3"
                onChange={handleProfileImageChange}
              />
            </div>

            {/* Password Section */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right ltr:text-left">
                {t("admin.customers.form.passwordSection")}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.newPassword")}
                  </label>
                  <Input
                    type="password"
                    value={newCustomer.password}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        password: e.target.value,
                      })
                    }
                    placeholder={t(
                      "admin.customers.form.newPasswordPlaceholder"
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.form.confirmPassword")}
                  </label>
                  <Input
                    type="password"
                    value={newCustomer.confirmPassword}
                    onChange={(e) =>
                      setNewCustomer({
                        ...newCustomer,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder={t(
                      "admin.customers.form.confirmPasswordPlaceholder"
                    )}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 rtl:text-right ltr:text-left">
                {t("admin.customers.form.passwordOptional")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                // Reset form when closing
                setNewCustomer({
                  name: "",
                  email: "",
                  phone: "",
                  mobile_number: "",
                  password: "",
                  confirmPassword: "",
                  status: "active",
                });
              }}
            >
              {t("admin.customers.dialogs.cancel")}
            </Button>
            <Button
              onClick={handleAddCustomer}
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending
                ? t("common.loading")
                : t("admin.customers.dialogs.addCustomerButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bookings Dialog */}
      <Dialog open={showBookingsDialog} onOpenChange={setShowBookingsDialog}>
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.viewBookings")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedCustomer &&
                `${t("admin.customers.dialogs.viewBookingsFor")} ${
                  selectedCustomer.name
                }`}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <img
                    src={
                      selectedCustomer.profileImage ||
                      "/Portrait_Placeholder.png"
                    }
                    alt={selectedCustomer.name}
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      e.currentTarget.src = "/Portrait_Placeholder.png";
                    }}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.email}
                    </p>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <p className="text-sm font-medium">
                    {t("admin.customers.bookings.totalBookings")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatNumber(selectedCustomer.totalBookings)}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.customers.bookings.event")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.customers.bookings.date")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.customers.bookings.amount")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.customers.bookings.statusLabel")}
                      </TableHead>
                      <TableHead className="rtl:text-right ltr:text-left">
                        {t("admin.customers.table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="rtl:text-right ltr:text-left">
                          <div>
                            <p className="font-medium">{booking.eventTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              ID: {booking.id}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="rtl:text-right ltr:text-left">
                          {formatDateForLocale(booking.date)}
                        </TableCell>
                        <TableCell className="rtl:text-right ltr:text-left">
                          {formatCurrency(booking.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              booking.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : booking.status === "cancelled"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {t(
                              `admin.customers.bookings.status.${booking.status}`
                            )}
                          </Badge>
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
                                {t("admin.customers.bookings.actions.title")}
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleEditBooking(booking)}
                              >
                                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.customers.bookings.actions.edit")}
                              </DropdownMenuItem>
                              {booking.status === "confirmed" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCancelBooking(booking.id)
                                    }
                                    className="text-yellow-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                    {t(
                                      "admin.customers.bookings.actions.cancel"
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleRefundBooking(booking.id)
                                    }
                                    className="text-red-600"
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                    {t(
                                      "admin.customers.bookings.actions.refund"
                                    )}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {booking.status === "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => handleEditBooking(booking)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                  {t(
                                    "admin.customers.bookings.actions.reactivate"
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {bookingsLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              )}
              {!bookingsLoading && customerBookings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("admin.customers.bookings.noBookings") ||
                    "No bookings found"}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBookingsDialog(false)}
            >
              {t("admin.customers.dialogs.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View NFC Card Dialog */}
      <Dialog open={showNfcCardDialog} onOpenChange={setShowNfcCardDialog}>
        <DialogContent className="max-w-2xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.viewNfcCard")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedCustomer &&
                `${t("admin.customers.dialogs.viewNfcCardFor")} ${
                  selectedCustomer.name
                }`}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <img
                  src={
                    selectedCustomer.profileImage ||
                    "/public/Portrait_Placeholder.png"
                  }
                  alt={selectedCustomer.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedCustomer.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedCustomer.email}
                  </p>
                </div>
              </div>

              {nfcCardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              ) : customerNfcCardData ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
                        <CreditCard className="h-5 w-5" />
                        {t("admin.customers.nfcCard.details")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rtl:text-right ltr:text-left">
                          <p className="text-sm font-medium">
                            {t("admin.customers.nfcCard.cardId") || "Card ID"}
                          </p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {customerNfcCardData.serial_number ||
                              customerNfcCardData.id}
                          </p>
                        </div>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="text-sm font-medium">
                            {t("admin.customers.nfcCard.status") || "Status"}
                          </p>
                          <Badge
                            className={
                              customerNfcCardData.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {customerNfcCardData.status || "N/A"}
                          </Badge>
                        </div>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="text-sm font-medium">
                            {t("admin.customers.nfcCard.issuedDate") ||
                              "Issued Date"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {customerNfcCardData.assigned_at
                              ? formatDateForLocale(
                                  customerNfcCardData.assigned_at
                                )
                              : customerNfcCardData.created_at
                              ? formatDateForLocale(
                                  customerNfcCardData.created_at
                                )
                              : "N/A"}
                          </p>
                        </div>
                        <div className="rtl:text-right ltr:text-left">
                          <p className="text-sm font-medium">
                            {t("admin.customers.nfcCard.lastUsed") ||
                              "Last Used"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {customerNfcCardData.last_used_at
                              ? formatDateForLocale(
                                  customerNfcCardData.last_used_at,
                                  "MMM dd, yyyy HH:mm"
                                )
                              : t("admin.customers.details.never") || "Never"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="rtl:text-right ltr:text-left">
                        {t("admin.customers.nfcCard.usage")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatNumber(selectedCustomer.attendedEvents)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("admin.customers.nfcCard.eventsAttended")}
                          </p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatNumber(selectedCustomer.totalBookings)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("admin.customers.nfcCard.totalBookings")}
                          </p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatCurrency(selectedCustomer.totalSpent)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("admin.customers.nfcCard.totalSpent")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t("admin.customers.nfcCard.noCard")}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t("admin.customers.nfcCard.noCardDesc")}
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {t("admin.customers.nfcCard.issueCard")}
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNfcCardDialog(false)}
            >
              {t("admin.customers.dialogs.close")}
            </Button>
            {selectedCustomer?.nfcCardId && (
              <Button variant="destructive">
                <Ban className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t("admin.customers.nfcCard.deactivate")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.viewActivity")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedCustomer &&
                `${t("admin.customers.dialogs.viewActivityFor")} ${
                  selectedCustomer.name
                }`}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <img
                    src={
                      selectedCustomer.profileImage ||
                      "/Portrait_Placeholder.png"
                    }
                    alt={selectedCustomer.name}
                    onError={(e) => {
                      // Fallback to placeholder if image fails to load
                      e.currentTarget.src = "/Portrait_Placeholder.png";
                    }}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.email}
                    </p>
                  </div>
                </div>
                <div className="text-right rtl:text-left">
                  <p className="text-sm font-medium">
                    {t("admin.customers.activity.totalActivities")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatNumber(customerActivities.length)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">
                    {t("admin.customers.activity.recentActivity")}
                  </h3>
                </div>

                <div className="space-y-3">
                  {customerActivities.map((activity: CustomerActivity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 rtl:space-x-reverse"
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          {getActivityTypeIcon(activity.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateForLocale(
                              activity.timestamp,
                              "MMM dd, HH:mm"
                            )}
                          </p>
                        </div>
                        {activity.eventTitle && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("admin.customers.activity.event")}:{" "}
                            {activity.eventTitle}
                          </p>
                        )}
                        {activity.amount && (
                          <p className="text-sm font-medium text-green-600 mt-1">
                            {formatCurrency(activity.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right ltr:text-left">
                      {t("admin.customers.activity.activityTypes")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.logins")}
                        </span>
                        <Badge variant="outline">1</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.bookings")}
                        </span>
                        <Badge variant="outline">1</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.checkins")}
                        </span>
                        <Badge variant="outline">1</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.payments")}
                        </span>
                        <Badge variant="outline">1</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right ltr:text-left">
                      {t("admin.customers.activity.timeStats")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.lastActivity")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          2 hours ago
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.avgSession")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          45 min
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.totalSessions")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          12
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right ltr:text-left">
                      {t("admin.customers.activity.deviceInfo")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.lastDevice")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          iPhone 15
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.browser")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Safari
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {t("admin.customers.activity.location")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Cairo, EG
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActivityDialog(false)}
            >
              {t("admin.customers.dialogs.close")}
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("admin.customers.activity.exportActivity")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog
        open={showEditBookingDialog}
        onOpenChange={setShowEditBookingDialog}
      >
        <DialogContent className="max-w-2xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.editBooking")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedBooking &&
                `${t("admin.customers.dialogs.editBookingFor")} ${
                  selectedBooking.eventTitle
                }`}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.bookings.event")}
                  </label>
                  <Input defaultValue={selectedBooking.eventTitle} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.bookings.date")}
                  </label>
                  <Input type="date" defaultValue={selectedBooking.date} />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.bookings.amount")}
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={selectedBooking.amount.toString()}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.customers.bookings.statusLabel")}
                  </label>
                  <Select defaultValue={selectedBooking.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">
                        {t("admin.customers.bookings.status.confirmed")}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("admin.customers.bookings.status.cancelled")}
                      </SelectItem>
                      <SelectItem value="refunded">
                        {t("admin.customers.bookings.status.refunded")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditBookingDialog(false)}
            >
              {t("admin.customers.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveBookingChanges}>
              {t("admin.customers.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Labels Dialog */}
      <Dialog
        open={showManageLabelsDialog}
        onOpenChange={setShowManageLabelsDialog}
      >
        <DialogContent className="max-w-2xl rtl:text-right ltr:text-left max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.labels.manageLabels")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedCustomer &&
                `${t("admin.customers.labels.manageLabelsFor")} ${
                  selectedCustomer.name
                }`}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6 flex-1 overflow-y-auto">
              {/* Current Labels */}
              <div>
                <h4 className="text-sm font-medium mb-3 rtl:text-right ltr:text-left">
                  {t("admin.customers.labels.currentLabels")}
                </h4>
                <div className="space-y-2">
                  {selectedLabels.map((label) => {
                    const IconComponent = getLabelIcon(label.icon);
                    return (
                      <div
                        key={label.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3 rtl:gap-reverse">
                          <Badge
                            className="text-sm"
                            style={{
                              backgroundColor: label.color,
                              color: "white",
                            }}
                          >
                            <IconComponent className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {label.name}
                          </Badge>
                          {label.description && (
                            <span className="text-sm text-muted-foreground">
                              {label.description}
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLabel(label.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {selectedLabels.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("admin.customers.labels.noLabels")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Label */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium mb-4 rtl:text-right ltr:text-left">
                  {t("admin.customers.labels.addNewLabel")}
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.customers.labels.labelName")}
                      </label>
                      <Input
                        value={newLabel.name}
                        onChange={(e) =>
                          setNewLabel({ ...newLabel, name: e.target.value })
                        }
                        placeholder={t(
                          "admin.customers.labels.labelNamePlaceholder"
                        )}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.customers.labels.labelColor")}
                      </label>
                      <div className="flex gap-2 mt-1">
                        {labelColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              newLabel.color === color
                                ? "border-gray-900"
                                : "border-gray-300"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewLabel({ ...newLabel, color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium rtl:text-right ltr:text-left">
                      {t("admin.customers.labels.labelIcon")}
                    </label>
                    <div className="grid grid-cols-4 gap-2 mt-1">
                      {labelIcons.map((iconObj) => {
                        const IconComponent = iconObj.icon;
                        return (
                          <button
                            key={iconObj.name}
                            type="button"
                            className={`p-2 rounded border-2 ${
                              newLabel.icon === iconObj.name
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-300 hover:border-gray-400"
                            }`}
                            onClick={() =>
                              setNewLabel({ ...newLabel, icon: iconObj.name })
                            }
                          >
                            <IconComponent className="h-5 w-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium rtl:text-right ltr:text-left">
                      {t("admin.customers.labels.labelDescription")}
                    </label>
                    <Input
                      value={newLabel.description}
                      onChange={(e) =>
                        setNewLabel({
                          ...newLabel,
                          description: e.target.value,
                        })
                      }
                      placeholder={t(
                        "admin.customers.labels.labelDescriptionPlaceholder"
                      )}
                      className="mt-1"
                    />
                  </div>

                  <Button onClick={handleAddLabel} className="w-full">
                    <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {t("admin.customers.labels.addLabel")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowManageLabelsDialog(false)}
            >
              {t("admin.customers.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveLabels}>
              {t("admin.customers.labels.saveLabels")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.deleteCustomer") || "Delete Customer"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.customers.dialogs.deleteCustomerConfirm") || "Are you sure you want to delete this customer? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {customerToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.customers.table.name")}:</strong> {customerToDelete.name}
              </p>
              {customerToDelete.email && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.customers.table.email")}:</strong> {customerToDelete.email}
                </p>
              )}
              {customerToDelete.phone && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.customers.table.phone")}:</strong> {customerToDelete.phone}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCustomerToDelete(null);
              }}
            >
              {t("admin.customers.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCustomer}
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.customers.actions.deleteCustomer") || "Delete Customer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;
