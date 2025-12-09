import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ResponsivePagination } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  BarChart3,
  Users,
  Ticket,
  DollarSign,
  MoreHorizontal,
  UserCheck,
  UserPlus,
  QrCode,
  Activity,
  Target,
  Image as ImageIcon,
  RefreshCw,
  Loader2,
  Accessibility,
  ShowerHead,
  ParkingCircle,
  Ban,
  Calculator,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  eventsApi,
  usersApi,
  venuesApi,
  ticketsApi,
  homePageSectionsApi,
  financesApi,
} from "@/lib/api/adminApi";
import { usePermissions } from "@/hooks/usePermissions";
import { formatNumberForLocale, formatCurrencyForLocale } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import * as XLSX from "xlsx";
import { EventFinancesReport } from "./EventFinancesReport";
import {
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Event {
  id: string;
  title: string;
  artist_name?: string;
  organizer: string; // Keep for backward compatibility with list view
  organizers?: string[]; // New field for multiple organizers
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  category: string;
  totalTickets: number;
  ticketsSold: number;
  revenue: number;
  commission: number;
  payout: number;
  commissionRate: {
    type: "percentage" | "flat";
    value: number;
  };
  transferFee: {
    type: "percentage" | "flat";
    value: number;
  };
  ticketTransferEnabled: boolean;
  childrenAllowed: boolean;
  childEligibilityEnabled: boolean;
  childEligibilityRuleType: "between" | "less_than" | "more_than" | "";
  childEligibilityMinAge: number | null;
  childEligibilityMaxAge: number | null;
  ticketLimit: number;
  usheringAccounts: number;
  imageUrl: string;
  venueLayoutImageUrl?: string;
  description: string;
  homePageSectionIds?: number[];
  aboutVenue?: string;
  gatesOpenTime?: string;
  closedDoorsTime?: string;
  termsAndConditions?: string;
  startingPrice?: string | number;
  gallery?: GalleryImage[];
  venueLayouts?: VenueLayout[];
  ticketCategories?: Array<{
    id: string;
    name: string;
    price: number;
    totalTickets: number;
    soldTickets?: number;
    description?: string;
    color?: string;
  }>;
  tickets?: Array<any>;
  salesTrend?: Array<any>;
  recentActivity?: Array<any>;
  ticketsUsed?: number;
  ticketsRefunded?: number;
  attendanceRate?: number;
  discounts?: Array<{
    id: string;
    name: string;
    type: string;
    value: number;
    code: string;
    validFrom: string;
    validTo: string;
    maxUses: number;
    usedCount: number;
    applicableCategories: string[];
    minQuantity?: number;
  }>;
  deductions?: Array<{
    id?: string;
    name: string;
    type: "percentage" | "fixed_per_ticket";
    value: number;
    description?: string;
    appliesTo?: "tickets" | "nfc_cards";
  }>;
}

interface GalleryImage {
  id: string;
  url: string;
  order: number;
  isThumbnail: boolean;
  alt?: string;
  file?: File; // Store original file for upload
}

interface VenueSection {
  id: string;
  name: string;
  capacity: number;
  price: number;
  color: string;
  description: string;
  isActive: boolean;
}

interface VenueLayout {
  id: string;
  name: string;
  description: string;
  sections: VenueSection[];
  totalCapacity: number;
  imageUrl?: string;
  gateOpeningTime?: string;
  gateClosingTime?: string;
}

const EventsManagement: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();
  const { hasPermission, requirePermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [organizerFilter, setOrganizerFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAnalyticsDialogOpen, setIsAnalyticsDialogOpen] = useState(false);
  const [isUsherManagementDialogOpen, setIsUsherManagementDialogOpen] =
    useState(false);
  const [isTicketManagementDialogOpen, setIsTicketManagementDialogOpen] =
    useState(false);
  const [isViewFinancesDialogOpen, setIsViewFinancesDialogOpen] = useState(false);
  const [selectedEventForAnalytics, setSelectedEventForAnalytics] =
    useState<Event | null>(null);
  const [selectedEventForUshers, setSelectedEventForUshers] =
    useState<Event | null>(null);
  const [selectedEventForTickets, setSelectedEventForTickets] =
    useState<Event | null>(null);
  const [selectedEventForFinances, setSelectedEventForFinances] = useState<Event | null>(null);
  const [totalTicketsInput, setTotalTicketsInput] = useState<string>("");
  const [newEvent, setNewEvent] = useState({
    title: "",
    artist_name: "",
    organizers: [] as string[],
    date: "",
    time: "",
    location: "",
    category: "",
    totalTickets: 0,
    ticketLimit: 1,
    isTicketLimitUnlimited: false,
    description: "",
    aboutVenue: "",
    gatesOpenTime: "",
    closedDoorsTime: "",
    termsAndConditions: "",
    startingPrice: "" as string,
    mainImageFile: null as File | null,
    venueLayoutImageFile: null as File | null,
    ticketTransferEnabled: false,
    childrenAllowed: true,
    childEligibilityEnabled: false,
    childEligibilityRuleType: "" as "between" | "less_than" | "more_than" | "",
    childEligibilityMinAge: null as number | null,
    childEligibilityMaxAge: null as number | null,
    wheelchairAccess: false,
    bathroom: false,
    parking: false,
    nonSmoking: false,
    commissionRate: {
      type: "percentage" as "percentage" | "flat",
      value: 10,
    },
    transferFee: {
      type: "percentage" as "percentage" | "flat",
      value: 5,
    },
    imageUrl: "",
    venueLayoutImageUrl: "",
    gallery: [] as GalleryImage[],
    ticketCategories: [] as Array<{
      id: string;
      name: string;
      price: number;
      totalTickets: number;
      soldTickets: number;
      description: string;
      color?: string;
    }>,
    homePageSectionIds: [] as number[], // Selected home page sections
    deductions: [] as Array<{
      id?: string;
      name: string;
      type: "percentage" | "fixed_per_ticket";
      value: number;
      description?: string;
      appliesTo?: "tickets" | "nfc_cards"; // Which part this deduction applies to
    }>,
  });

  // Edit event state for new features
  const [editEventData, setEditEventData] = useState({
    title: "",
    artist_name: "",
    organizers: [] as string[],
    date: "",
    time: "",
    location: "",
    category: "",
    totalTickets: 0,
    ticketLimit: 1,
    isTicketLimitUnlimited: false,
    description: "",
    aboutVenue: "",
    gatesOpenTime: "",
    closedDoorsTime: "",
    termsAndConditions: "",
    startingPrice: "",
    mainImageFile: null as File | null,
    venueLayoutImageFile: null as File | null,
    ticketTransferEnabled: false,
    childrenAllowed: true,
    childEligibilityEnabled: false,
    childEligibilityRuleType: "" as "between" | "less_than" | "more_than" | "",
    childEligibilityMinAge: null as number | null,
    childEligibilityMaxAge: null as number | null,
    wheelchairAccess: false,
    bathroom: false,
    parking: false,
    nonSmoking: false,
    commissionRate: {
      type: "percentage" as "percentage" | "flat",
      value: 10,
    },
    transferFee: {
      type: "percentage" as "percentage" | "flat",
      value: 5,
    },
    imageUrl: "",
    venueLayoutImageUrl: "",
    gallery: [] as GalleryImage[],
    homePageSectionIds: [] as number[],
    deductions: [] as Array<{
      id?: string;
      name: string;
      type: "percentage" | "fixed_per_ticket";
      value: number;
      description?: string;
      appliesTo?: "tickets" | "nfc_cards"; // Which part this deduction applies to
    }>,
    venueLayouts: [
      {
        id: "1",
        name: "Main Hall Layout",
        description: "Standard layout for the main event hall",
        totalCapacity: 500,
        imageUrl:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop",
        gateOpeningTime: "17:00",
        gateClosingTime: "23:00",
        sections: [
          {
            id: "1",
            name: "VIP Section",
            capacity: 100,
            price: 500,
            color: "#8B5CF6",
            description: "Premium seating with exclusive benefits",
            isActive: true,
          },
          {
            id: "2",
            name: "Regular Section",
            capacity: 300,
            price: 250,
            color: "#3B82F6",
            description: "Standard seating arrangement",
            isActive: true,
          },
          {
            id: "3",
            name: "Early Bird Section",
            capacity: 100,
            price: 200,
            color: "#10B981",
            description: "Limited time discounted seating",
            isActive: true,
          },
        ],
      },
    ] as VenueLayout[],
    ticketCategories: [
      {
        id: "1",
        name: "VIP",
        price: 500,
        totalTickets: 100,
        soldTickets: 0,
        description: "Premium seating with exclusive benefits",
      },
      {
        id: "2",
        name: "Regular",
        price: 250,
        totalTickets: 300,
        soldTickets: 0,
        description: "Standard seating",
      },
      {
        id: "3",
        name: "Early Bird",
        price: 200,
        totalTickets: 200,
        soldTickets: 0,
        description: "Limited time discounted tickets",
      },
    ],
    discounts: [
      {
        id: "1",
        name: "Student Discount",
        type: "percentage",
        value: 20,
        code: "STUDENT20",
        validFrom: "",
        validTo: "",
        maxUses: 100,
        usedCount: 0,
        applicableCategories: ["Regular", "Early Bird"],
      },
      {
        id: "2",
        name: "Group Discount",
        type: "percentage",
        value: 15,
        code: "GROUP15",
        validFrom: "",
        validTo: "",
        maxUses: 50,
        usedCount: 0,
        applicableCategories: ["VIP", "Regular"],
        minQuantity: 5,
      },
    ],
  });

  // Usher management state (removed unused ushers state - using API data instead)

  const [newUsher, setNewUsher] = useState({
    name: "",
    email: "",
    assignedArea: "",
  });

  const [selectedUsher, setSelectedUsher] = useState<any>(null);
  const [isEditUsherDialogOpen, setIsEditUsherDialogOpen] = useState(false);
  const [isViewUsherActivityDialogOpen, setIsViewUsherActivityDialogOpen] =
    useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<Event | null>(null);
  const [isAddDeductionDialogOpen, setIsAddDeductionDialogOpen] = useState(false);
  const [deductionAppliesTo, setDeductionAppliesTo] = useState<"tickets" | "nfc_cards">("tickets");
  const [newDeduction, setNewDeduction] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed_per_ticket",
    value: 0,
    description: "",
  });
  const queryClient = useQueryClient();

  // Fetch organizers and venues for form dropdowns
  const { data: organizersData } = useQuery({
    queryKey: ["organizers"],
    queryFn: () => usersApi.getOrganizers({ page_size: 1000 }),
  });

  const { data: venuesData } = useQuery({
    queryKey: ["venues"],
    queryFn: () => venuesApi.getVenues({ page_size: 1000 }),
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["eventCategories"],
    queryFn: () => eventsApi.getCategories(),
  });

  // Fetch home page sections
  const { data: homePageSections = [] } = useQuery({
    queryKey: ["homePageSections"],
    queryFn: () => homePageSectionsApi.getSections(),
  });

  // Debug: Log organizers and venues data
  useEffect(() => {
    if (organizersData) {
      console.log("Organizers data:", organizersData);
      console.log(
        "Organizers list:",
        organizersData?.results || organizersData
      );
    }
    if (venuesData) {
      console.log("Venues data:", venuesData);
      console.log("Venues list:", venuesData?.results || venuesData);
    }
  }, [organizersData, venuesData]);


  // Fetch events from API
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: [
      "events",
      searchTerm,
      statusFilter,
      categoryFilter,
      locationFilter,
      organizerFilter,
      currentPage,
    ],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (locationFilter !== "all") params.location = locationFilter;
      if (organizerFilter !== "all") params.organizer = organizerFilter;

      const response = await eventsApi.getEvents(params);
      return response;
    },
  });

  // Transform API events to match Event interface
  const events: Event[] = useMemo(() => {
    if (!eventsData?.results) return [];
    return eventsData.results.map((item: any) => ({
      id: item.id,
      title: item.title,
      organizer: item.organizer_name || "",
      date: item.date,
      time: item.time || "00:00",
      location: item.venue_name || "",
      status: item.status as "upcoming" | "ongoing" | "completed" | "cancelled",
      category: item.category_name || "",
      totalTickets: item.total_tickets || 0,
      ticketsSold: item.tickets_sold || 0,
      revenue: item.revenue || 0,
      commission: item.commission || 0,
      payout: (item.revenue || 0) - (item.commission || 0), // Organizer revenue (total - commission)
      commissionRate:
        item.commission_rate && typeof item.commission_rate === "object"
          ? {
              type:
                item.commission_rate.type ||
                ("percentage" as "percentage" | "flat"),
              value: item.commission_rate.value || 10,
            }
          : {
              type: "percentage" as "percentage" | "flat",
              value: item.commission_rate
                ? typeof item.commission_rate === "number"
                  ? item.commission_rate * 100
                  : 10
                : 10, // Fallback for old format
            },
      transferFee: {
        type: "percentage" as "percentage" | "flat",
        value: 5,
      },
      ticketTransferEnabled: true, // Default, will be fetched from detail
      childrenAllowed: item.child_eligibility_enabled || false, // Use actual value from API
      childEligibilityEnabled: item.child_eligibility_enabled || false, // Use actual value from API
      childEligibilityRuleType: (item.child_eligibility_rule_type || "") as
        | "between"
        | "less_than"
        | "more_than"
        | "",
      childEligibilityMinAge: item.child_eligibility_min_age || null,
      childEligibilityMaxAge: item.child_eligibility_max_age || null,
      ticketLimit: item.ticket_limit || 10,
      usheringAccounts: 0,
      imageUrl: item.thumbnail_path || "/public/placeholderLogo.png",
      description: item.description || "",
      aboutVenue: item.about_venue || "",
      gatesOpenTime: item.gates_open_time || "",
      closedDoorsTime: item.closed_doors_time || "",
      termsAndConditions: item.terms_and_conditions || "",
      gallery: [],
    }));
  }, [eventsData]);

  // Create event mutation
  const formatValidationMessages = (messages: any): string => {
    if (Array.isArray(messages)) {
      return messages
        .map((message) => formatValidationMessages(message))
        .filter(Boolean)
        .join(", ");
    }
    if (typeof messages === "object" && messages !== null) {
      return Object.entries(messages)
        .map(([key, value]) => {
          const formatted = formatValidationMessages(value);
          if (!formatted) return "";
          return key === "__all__" ? formatted : `${key}: ${formatted}`;
        })
        .filter(Boolean)
        .join(", ");
    }
    if (messages === undefined || messages === null) return "";
    return String(messages);
  };

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await eventsApi.createEvent(eventData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: t("admin.events.toast.eventAdded"),
        description: t("admin.events.toast.eventAddedDesc"),
      });
      setIsAddDialogOpen(false);
      setTotalTicketsInput("");
    },
    onError: (error: any) => {
      console.error("Event creation error:", error);
      console.error("Error response:", error?.response);
      console.error("Error response data:", error?.response?.data);

      // Extract validation errors from Django REST Framework format
      let errorMessage = "Failed to create event";
      const errorData = error?.response?.data;

      if (errorData) {
        // Check for DRF validation errors
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error?.details) {
          // Format validation errors
          const details = errorData.error.details;
          const errorList = Object.entries(details).map(
            ([field, messages]: [string, any]) => {
              const msg = formatValidationMessages(messages);
              return msg ? `${field}: ${msg}` : field;
            }
          );
          errorMessage = errorList.join("; ");
        } else if (typeof errorData === "object") {
          // Check for field-level errors (DRF format)
          const fieldErrors = Object.entries(errorData)
            .filter(([key]) => key !== "error")
            .map(([field, messages]: [string, any]) => {
              const msg = formatValidationMessages(messages);
              return msg ? `${field}: ${msg}` : field;
            });
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join("; ");
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } else if (typeof errorData === "string") {
          errorMessage = errorData;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      console.error("Formatted error message:", errorMessage);

      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await eventsApi.updateEvent(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: t("admin.events.toast.eventUpdated"),
        description: t("admin.events.toast.eventUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Update event error:", error);
      console.error("Error response data:", error.response?.data);

      // Extract detailed error messages
      let errorMessage = error.message || t("admin.events.toast.error");

      if (error.response?.data) {
        const errorData = error.response.data;

        // Handle field-level validation errors
        if (typeof errorData === "object") {
          const fieldErrors: string[] = [];
          for (const [field, messages] of Object.entries(errorData)) {
            if (Array.isArray(messages)) {
              fieldErrors.push(`${field}: ${messages.join(", ")}`);
            } else if (typeof messages === "string") {
              fieldErrors.push(`${field}: ${messages}`);
            } else if (typeof messages === "object" && messages !== null) {
              // Handle nested errors
              if ((messages as any).message) {
                fieldErrors.push(`${field}: ${(messages as any).message}`);
              }
            }
          }

          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join("; ");
          } else if (errorData.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === "string") {
            errorMessage = errorData;
          }
        }
      }

      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await eventsApi.deleteEvent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: t("admin.events.toast.eventDeleted"),
        description: t("admin.events.toast.eventDeletedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          t("admin.events.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Cancel event mutation
  const cancelEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return await eventsApi.cancelEvent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: t("admin.events.toast.eventCancelled") || "Event Cancelled",
        description: t("admin.events.toast.eventCancelledDesc") || "Event has been cancelled successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.response?.data?.error ||
          error.message ||
          t("admin.events.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Mock events data (fallback - will be removed) - commented out as we're using API now
  /*
  const mockEvents: Event[] = [
    {
      id: "1",
      title: t("admin.events.mock.summerMusicFestival.title"),
      organizer: t("admin.events.mock.summerMusicFestival.organizer"),
      date: "2025-08-15",
      time: "18:00",
      location: t("admin.events.mock.summerMusicFestival.location"),
      status: "upcoming",
      category: t("admin.events.mock.summerMusicFestival.category"),
      totalTickets: 500,
      ticketsSold: 470,
      revenue: 117500,
      commission: 11750,
      payout: 105750,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 5,
      usheringAccounts: 3,
      imageUrl:
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop",
      description: t("admin.events.mock.summerMusicFestival.description"),
    },
    {
      id: "2",
      title: t("admin.events.mock.techInnovatorsMeetup.title"),
      organizer: t("admin.events.mock.techInnovatorsMeetup.organizer"),
      date: "2025-09-01",
      time: "10:00",
      location: t("admin.events.mock.techInnovatorsMeetup.location"),
      status: "upcoming",
      category: t("admin.events.mock.techInnovatorsMeetup.category"),
      totalTickets: 200,
      ticketsSold: 150,
      revenue: 45000,
      commission: 4500,
      payout: 40500,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "flat",
        value: 25,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 2,
      usheringAccounts: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=400&h=300&fit=crop",
      description: t("admin.events.mock.techInnovatorsMeetup.description"),
    },
    {
      id: "3",
      title: t("admin.events.mock.standupComedyNight.title"),
      organizer: t("admin.events.mock.standupComedyNight.organizer"),
      date: "2025-08-22",
      time: "20:30",
      location: t("admin.events.mock.standupComedyNight.location"),
      status: "ongoing",
      category: t("admin.events.mock.standupComedyNight.category"),
      totalTickets: 150,
      ticketsSold: 120,
      revenue: 18000,
      commission: 1800,
      payout: 16200,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 3,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 4,
      usheringAccounts: 1,
      imageUrl:
        "https://images.unsplash.com/photo-1501281669025-7ec9d6aec993?w=400&h=300&fit=crop",
      description: t("admin.events.mock.standupComedyNight.description"),
    },
    {
      id: "4",
      title: t("admin.events.mock.modernArtExhibition.title"),
      organizer: t("admin.events.mock.modernArtExhibition.organizer"),
      date: "2025-07-10",
      time: "16:00",
      location: t("admin.events.mock.modernArtExhibition.location"),
      status: "completed",
      category: t("admin.events.mock.modernArtExhibition.category"),
      totalTickets: 300,
      ticketsSold: 280,
      revenue: 56000,
      commission: 5600,
      payout: 50400,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "flat",
        value: 15,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 3,
      usheringAccounts: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
      description: t("admin.events.mock.modernArtExhibition.description"),
    },
    {
      id: "5",
      title: "Football Championship Final",
      organizer: "Sports Events Egypt",
      date: "2025-10-05",
      time: "19:30",
      location: "Cairo International Stadium, Cairo",
      status: "upcoming",
      category: "Sports",
      totalTickets: 80000,
      ticketsSold: 75000,
      revenue: 1500000,
      commission: 150000,
      payout: 1350000,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 8,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 6,
      usheringAccounts: 15,
      imageUrl:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
      description:
        "The biggest football event of the year featuring top teams competing for the championship title.",
    },
    {
      id: "6",
      title: "International Film Festival",
      organizer: "Cinema Egypt Productions",
      date: "2025-11-15",
      time: "14:00",
      location: "Alexandria Opera House, Alexandria",
      status: "upcoming",
      category: "Entertainment",
      totalTickets: 1200,
      ticketsSold: 950,
      revenue: 285000,
      commission: 28500,
      payout: 256500,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "flat",
        value: 20,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 3,
      usheringAccounts: 8,
      imageUrl:
        "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=300&fit=crop",
      description:
        "A week-long celebration of international cinema with screenings, workshops, and celebrity appearances.",
    },
    {
      id: "7",
      title: "Tech Startup Conference",
      organizer: "Innovation Hub Egypt",
      date: "2025-09-20",
      time: "09:00",
      location: "Smart Village, Giza",
      status: "upcoming",
      category: "Technology",
      totalTickets: 500,
      ticketsSold: 420,
      revenue: 84000,
      commission: 8400,
      payout: 75600,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 4,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 4,
      usheringAccounts: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop",
      description:
        "Connecting entrepreneurs, investors, and tech enthusiasts in Egypt's premier startup ecosystem.",
    },
    {
      id: "8",
      title: "Classical Music Symphony",
      organizer: "Cairo Philharmonic Orchestra",
      date: "2025-12-01",
      time: "20:00",
      location: "Cairo Opera House, Cairo",
      status: "upcoming",
      category: "Music",
      totalTickets: 800,
      ticketsSold: 650,
      revenue: 130000,
      commission: 13000,
      payout: 117000,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "flat",
        value: 30,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 2,
      usheringAccounts: 4,
      imageUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      description:
        "An evening of classical masterpieces performed by Egypt's finest musicians.",
    },
    {
      id: "9",
      title: "Fashion Week Egypt",
      organizer: "Egyptian Fashion Council",
      date: "2025-10-25",
      time: "18:00",
      location: "Grand Nile Tower, Cairo",
      status: "upcoming",
      category: "Art",
      totalTickets: 600,
      ticketsSold: 480,
      revenue: 144000,
      commission: 14400,
      payout: 129600,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 6,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 3,
      usheringAccounts: 6,
      imageUrl:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
      description:
        "Showcasing the latest trends and designs from Egypt's top fashion designers.",
    },
    {
      id: "10",
      title: "Science and Innovation Expo",
      organizer: "Egyptian Academy of Sciences",
      date: "2025-11-08",
      time: "10:00",
      location: "Bibliotheca Alexandrina, Alexandria",
      status: "upcoming",
      category: "Education",
      totalTickets: 2000,
      ticketsSold: 1800,
      revenue: 180000,
      commission: 18000,
      payout: 162000,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 5,
      usheringAccounts: 10,
      imageUrl:
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop",
      description:
        "Exploring the latest scientific discoveries and technological innovations from around the world.",
    },
    {
      id: "11",
      title: "Jazz Under the Stars",
      organizer: "Cairo Jazz Club",
      date: "2025-08-30",
      time: "21:00",
      location: "Al-Azhar Park, Cairo",
      status: "ongoing",
      category: "Music",
      totalTickets: 300,
      ticketsSold: 280,
      revenue: 84000,
      commission: 8400,
      payout: 75600,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 4,
      usheringAccounts: 3,
      imageUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop",
      description:
        "An intimate evening of jazz music under the beautiful Cairo sky.",
    },
    {
      id: "12",
      title: "Photography Workshop",
      organizer: "Egyptian Photographers Association",
      date: "2025-09-12",
      time: "14:00",
      location: "Luxor Temple, Luxor",
      status: "upcoming",
      category: "Education",
      totalTickets: 50,
      ticketsSold: 45,
      revenue: 22500,
      commission: 2250,
      payout: 20250,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 3,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 1,
      usheringAccounts: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
      description:
        "Learn photography techniques while exploring the ancient wonders of Luxor.",
    },
    {
      id: "13",
      title: "Street Food Festival",
      organizer: "Cairo Food Network",
      date: "2025-10-12",
      time: "12:00",
      location: "Khan el-Khalili, Cairo",
      status: "upcoming",
      category: "Entertainment",
      totalTickets: 1000,
      ticketsSold: 850,
      revenue: 85000,
      commission: 8500,
      payout: 76500,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 6,
      usheringAccounts: 8,
      imageUrl:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
      description:
        "A culinary journey through Egypt's most delicious street food and traditional dishes.",
    },
    {
      id: "14",
      title: "Poetry Night",
      organizer: "Cairo Literary Society",
      date: "2025-09-25",
      time: "19:00",
      location: "Darb 1718, Cairo",
      status: "upcoming",
      category: "Entertainment",
      totalTickets: 100,
      ticketsSold: 75,
      revenue: 15000,
      commission: 1500,
      payout: 13500,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 3,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 2,
      usheringAccounts: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
      description:
        "An evening of poetry readings featuring both established and emerging Egyptian poets.",
    },
    {
      id: "15",
      title: "Yoga Retreat",
      organizer: "Egyptian Wellness Center",
      date: "2025-11-20",
      time: "07:00",
      location: "Red Sea Coast, Hurghada",
      status: "upcoming",
      category: "Sports",
      totalTickets: 80,
      ticketsSold: 65,
      revenue: 26000,
      commission: 2600,
      payout: 23400,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 2,
      usheringAccounts: 3,
      imageUrl:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop",
      description:
        "A peaceful retreat combining yoga, meditation, and the beautiful Red Sea environment.",
    },
    {
      id: "16",
      title: "Digital Art Exhibition",
      organizer: "Modern Art Gallery",
      date: "2025-08-05",
      time: "16:00",
      location: "Zamalek Art Gallery, Cairo",
      status: "completed",
      category: "Art",
      totalTickets: 200,
      ticketsSold: 180,
      revenue: 36000,
      commission: 3600,
      payout: 32400,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 3,
      usheringAccounts: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
      description:
        "Exploring the intersection of technology and art through digital installations and interactive exhibits.",
    },
    {
      id: "17",
      title: "Business Networking Event",
      organizer: "Egyptian Business Network",
      date: "2025-09-18",
      time: "18:30",
      location: "Four Seasons Hotel, Cairo",
      status: "upcoming",
      category: "Education",
      totalTickets: 150,
      ticketsSold: 120,
      revenue: 30000,
      commission: 3000,
      payout: 27000,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 2,
      usheringAccounts: 4,
      imageUrl:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
      description:
        "Connect with business leaders and entrepreneurs in an elegant networking environment.",
    },
    {
      id: "18",
      title: "Children's Theater Festival",
      organizer: "Cairo Children's Theater",
      date: "2025-10-30",
      time: "11:00",
      location: "Cairo Puppet Theater, Cairo",
      status: "upcoming",
      category: "Entertainment",
      totalTickets: 400,
      ticketsSold: 320,
      revenue: 32000,
      commission: 3200,
      payout: 28800,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 5,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 4,
      usheringAccounts: 5,
      imageUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
      description:
        "A week-long festival of children's theater performances and interactive workshops.",
    },
    {
      id: "19",
      title: "Rock Concert",
      organizer: "Egyptian Rock Society",
      date: "2025-09-28",
      time: "22:00",
      location: "Cairo Stadium, Cairo",
      status: "upcoming",
      category: "Music",
      totalTickets: 5000,
      ticketsSold: 4200,
      revenue: 840000,
      commission: 84000,
      payout: 756000,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 8,
      },
      ticketTransferEnabled: true,
      childrenAllowed: true,
      ticketLimit: 8,
      usheringAccounts: 20,
      imageUrl:
        "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop",
      description:
        "The biggest rock concert of the year featuring local and international rock bands.",
    },
    {
      id: "20",
      title: "Cooking Masterclass",
      organizer: "Egyptian Culinary Institute",
      date: "2025-11-05",
      time: "15:00",
      location: "Cairo Cooking School, Cairo",
      status: "upcoming",
      category: "Education",
      totalTickets: 60,
      ticketsSold: 55,
      revenue: 16500,
      commission: 1650,
      payout: 14850,
      commissionRate: {
        type: "percentage",
        value: 10,
      },
      transferFee: {
        type: "percentage",
        value: 3,
      },
      ticketTransferEnabled: false,
      childrenAllowed: true,
      ticketLimit: 2,
      usheringAccounts: 2,
      imageUrl:
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
      description:
        "Learn to cook traditional Egyptian dishes from master chefs in an intimate setting.",
    },
  ];
  */

  // Events are already filtered by API, so use them directly
  const filteredEvents = events;

  // Get unique values for filters
  const uniqueCategories = useMemo(() => {
    return [
      ...new Set(
        events
          .map((event) => event.category)
          .filter((cat) => cat && typeof cat === "string" && cat.trim() !== "")
      ),
    ];
  }, [events]);

  const uniqueLocations = useMemo(() => {
    return [
      ...new Set(
        events
          .map((event) => event.location?.split(",")[0]?.trim() || "")
          .filter((loc) => loc && typeof loc === "string" && loc.trim() !== "")
      ),
    ];
  }, [events]);

  const uniqueOrganizers = useMemo(() => {
    return [
      ...new Set(
        events
          .map((event) => event.organizer)
          .filter((org) => org && typeof org === "string" && org.trim() !== "")
      ),
    ];
  }, [events]);

  // Pagination logic - use backend pagination
  const totalPages = eventsData?.count
    ? Math.ceil(eventsData.count / itemsPerPage)
    : 1;
  const paginatedEvents = filteredEvents; // Already paginated by backend

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    locationFilter,
    organizerFilter,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Upcoming";
      case "ongoing":
        return "Ongoing";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const handleViewFinances = async (event: Event) => {
    // Fetch full event details including deductions
    try {
      const eventDetails = await eventsApi.getEvent(event.id);
      
      // Create event object with all details including deductions
      const commissionRate = eventDetails.commission_rate && typeof eventDetails.commission_rate === "object"
        ? {
            type: (eventDetails.commission_rate.type || "percentage") as "percentage" | "flat",
            value: parseFloat(eventDetails.commission_rate.value?.toString() || "10") || 10,
          }
        : {
            type: "percentage" as const,
            value: 10,
          };

      const eventWithDetails: Event = {
        ...event,
        revenue: eventDetails.revenue || event.revenue || 0,
        commission: eventDetails.commission || event.commission || 0,
        ticketsSold: eventDetails.tickets_sold || event.ticketsSold || 0,
        deductions: (eventDetails.deductions || []).map((d: any) => ({
          id: d.id?.toString(),
          name: d.name || "",
          type: (d.type || "percentage") as "percentage" | "fixed_per_ticket",
          value: parseFloat(d.value?.toString() || "0"),
          description: d.description || "",
          appliesTo: (d.appliesTo || d.applies_to || "tickets") as "tickets" | "nfc_cards",
        })),
        commissionRate,
      };
      
      setSelectedEventForFinances(eventWithDetails);
      setIsViewFinancesDialogOpen(true);
    } catch (error) {
      console.error("Error fetching event details for finances:", error);
      // Fallback to basic event data if API call fails
      setSelectedEventForFinances(event);
      setIsViewFinancesDialogOpen(true);
    }
  };

  const handleEditEvent = async (event: Event) => {
    if (!requirePermission("events_edit")) {
      return;
    }
    setSelectedEvent(event);

    // Fetch full event details including ticket categories
    try {
      const eventDetails = await eventsApi.getEvent(event.id);
      console.log("Event details from API:", eventDetails);

      // Map ticket categories from API response - use ticket_categories_read for read
      // Map ticket categories and preserve color field
      const ticketCategories =
        (
          eventDetails.ticket_categories_read ||
          eventDetails.ticket_categories ||
          []
        ).map((cat: any) => ({
          id: cat.id?.toString() || Date.now().toString(),
          name: cat.name || "",
          price: parseFloat(cat.price) || 0,
          totalTickets: cat.total_tickets || 0,
          soldTickets: cat.sold_tickets || 0,
          description: cat.description || "",
          color: cat.color || "#10B981", // Preserve color field, default to green
        })) || [];

      // Map gallery images if they exist in the response
      let galleryImages: GalleryImage[] = [];
      if (eventDetails.gallery && Array.isArray(eventDetails.gallery)) {
        galleryImages = eventDetails.gallery.map((img: any, index: number) => ({
          id: img.id?.toString() || Date.now().toString() + index,
          url: img.url || img.image_url || img,
          order: img.order !== undefined ? img.order : index,
          isThumbnail: img.isThumbnail || img.is_thumbnail || index === 0,
          alt: img.alt || img.description || "",
        }));
      } else if (eventDetails.image) {
        // If there's a main image but no gallery array, create gallery from main image
        galleryImages = [
          {
            id: Date.now().toString(),
            url: eventDetails.image,
            order: 0,
            isThumbnail: true,
            alt: eventDetails.title || "",
          },
        ];
      }

      // Get category - API returns category as object with id and name properties
      // Use the name for the text input
      let categoryName: string = "";
      if (eventDetails.category) {
        if (
          typeof eventDetails.category === "object" &&
          eventDetails.category !== null
        ) {
          // If category is an object, use the name
          if ("name" in eventDetails.category) {
            categoryName = eventDetails.category.name;
          }
        } else if (typeof eventDetails.category === "string") {
          categoryName = eventDetails.category;
        }
      }

      // Fallback to event.category if eventDetails.category is not available
      if (!categoryName) {
        categoryName = event.category || "";
      }

      // Get organizer IDs - API returns organizers as array of objects or single object
      let organizerIds: string[] = [];
      if (eventDetails.organizers && Array.isArray(eventDetails.organizers)) {
        // New format: array of organizer objects
        organizerIds = eventDetails.organizers
          .map((org: any) => org?.id?.toString() || org?.toString())
          .filter((id: string) => id);
      } else if (eventDetails.organizer) {
        // Old format: single organizer object or ID (for backward compatibility)
        const orgId =
          eventDetails.organizer?.id?.toString() ||
          (typeof eventDetails.organizer === "string"
            ? eventDetails.organizer
            : null);
        if (orgId) organizerIds = [orgId];
      }

      // Get venue ID - API returns venue as object with id property
      const venueId =
        eventDetails.venue?.id?.toString() ||
        (typeof eventDetails.venue === "string" ? eventDetails.venue : null) ||
        (event.location && event.location !== "none"
          ? event.location.toString()
          : null) ||
        "none";

      // Get commission rate - API returns as object
      const commissionRate =
        eventDetails.commission_rate &&
        typeof eventDetails.commission_rate === "object"
          ? {
              type: (eventDetails.commission_rate.type || "percentage") as
                | "percentage"
                | "flat",
              value:
                parseFloat(
                  eventDetails.commission_rate.value?.toString() || "10"
                ) || 10,
            }
          : event.commissionRate || {
              type: "percentage" as "percentage" | "flat",
              value: 10,
            };

      // Get transfer fee - API might return this
      const transferFee =
        eventDetails.transfer_fee &&
        typeof eventDetails.transfer_fee === "object"
          ? {
              type: (eventDetails.transfer_fee.type || "percentage") as
                | "percentage"
                | "flat",
              value:
                parseFloat(
                  eventDetails.transfer_fee.value?.toString() || "5"
                ) || 5,
            }
          : event.transferFee || {
              type: "percentage" as "percentage" | "flat",
              value: 5,
            };

      const totalTicketsValue =
        eventDetails.total_tickets || event.totalTickets || 0;
      const rawTicketLimit =
        eventDetails.ticket_limit || event.ticketLimit || 1;
      const isTicketLimitUnlimited =
        totalTicketsValue > 0 && rawTicketLimit >= totalTicketsValue;

      setEditEventData({
        title: eventDetails.title || event.title || "",
        artist_name: eventDetails.artist_name || event.artist_name || "",
        organizers: organizerIds,
        date: eventDetails.date || event.date || "",
        time: eventDetails.time || event.time || "",
        location: venueId,
        category: categoryName, // Store the category name
        totalTickets: totalTicketsValue,
        ticketLimit: rawTicketLimit,
        isTicketLimitUnlimited,
        description: eventDetails.description || event.description || "",
        aboutVenue: eventDetails.about_venue || event.aboutVenue || "",
        gatesOpenTime:
          eventDetails.gates_open_time || event.gatesOpenTime || "",
        closedDoorsTime:
          eventDetails.closed_doors_time || event.closedDoorsTime || "",
        termsAndConditions:
          eventDetails.terms_and_conditions || event.termsAndConditions || "",
        startingPrice:
          eventDetails.starting_price?.toString() ||
          (event.startingPrice ? event.startingPrice.toString() : null) ||
          "",
        mainImageFile: null,
        venueLayoutImageFile: null,
        ticketTransferEnabled:
          eventDetails.ticket_transfer_enabled !== undefined
            ? eventDetails.ticket_transfer_enabled
            : event.ticketTransferEnabled !== undefined
            ? event.ticketTransferEnabled
            : false,
        childrenAllowed: eventDetails.child_eligibility_enabled || false, // Use child_eligibility_enabled from API
        childEligibilityEnabled:
          eventDetails.child_eligibility_enabled || false,
        childEligibilityRuleType: (eventDetails.child_eligibility_rule_type ||
          "") as "between" | "less_than" | "more_than" | "",
        childEligibilityMinAge: eventDetails.child_eligibility_min_age || null,
        childEligibilityMaxAge: eventDetails.child_eligibility_max_age || null,
        wheelchairAccess: eventDetails.wheelchair_access || false,
        bathroom: eventDetails.bathroom || false,
        parking: eventDetails.parking || false,
        nonSmoking: eventDetails.non_smoking || false,
        commissionRate: commissionRate,
        transferFee: transferFee,
        imageUrl: eventDetails.image || event.imageUrl || "",
        venueLayoutImageUrl:
          eventDetails.venue_layout_image_url ||
          eventDetails.venue_layout_image ||
          "",
        gallery: galleryImages,
        venueLayouts: eventDetails.venue_layouts || event.venueLayouts || [],
        ticketCategories: ticketCategories,
        discounts: eventDetails.discounts || event.discounts || [],
        deductions: (eventDetails.deductions || []).map((d: any) => ({
          id: d.id?.toString(),
          name: d.name || "",
          type: d.type || "percentage",
          value: parseFloat(d.value?.toString() || "0"),
          description: d.description || "",
          appliesTo: d.appliesTo || d.applies_to || "tickets", // Check both appliesTo and applies_to for backward compatibility
        })),
        // Load home page sections that contain this event
        homePageSectionIds: (() => {
          const eventId = parseInt(event.id);
          return (homePageSections || [])
            .filter((section: any) => section.events?.some((e: any) => e.id === eventId))
            .map((section: any) => section.id);
        })(),
      });

      console.log("Edit event data set:", {
        category: categoryName,
        organizers: organizerIds,
        location: venueId,
        gallery: galleryImages.length,
        ticketCategories: ticketCategories.length,
      });
    } catch (error) {
      console.error("Error fetching event details:", error);
      // Fallback to basic event data if API call fails
      // Try to get organizer IDs from the event list data
      let organizerIds: string[] = [];
      if (event.organizer) {
        // Try to find organizer in the organizers list to get ID
        const organizersList = organizersData?.results || organizersData || [];
        const foundOrganizer = organizersList.find(
          (org: any) =>
            org.name === event.organizer ||
            org.id?.toString() === event.organizer?.toString()
        );
        const orgId =
          foundOrganizer?.id?.toString() || event.organizer?.toString() || "";
        if (orgId) organizerIds = [orgId];
      }

      // Try to get venue ID from the event list data
      let venueId = "none";
      if (event.location && event.location !== "none") {
        const venuesList = venuesData?.results || venuesData || [];
        const foundVenue = venuesList.find(
          (venue: any) =>
            venue.name === event.location ||
            venue.id?.toString() === event.location?.toString()
        );
        venueId =
          foundVenue?.id?.toString() || event.location?.toString() || "none";
      }

      const totalTicketsValue = event.totalTickets || 0;
      const rawTicketLimit = event.ticketLimit || 1;
      const isTicketLimitUnlimited =
        totalTicketsValue > 0 && rawTicketLimit >= totalTicketsValue;

      setEditEventData({
        title: event.title || "",
        artist_name: event.artist_name || "",
        organizers: organizerIds,
        date: event.date || "",
        time: event.time || "",
        location: venueId,
        category: event.category || "",
        totalTickets: totalTicketsValue,
        ticketLimit: rawTicketLimit,
        isTicketLimitUnlimited,
        description: event.description || "",
        aboutVenue: event.aboutVenue || "",
        gatesOpenTime: event.gatesOpenTime || "",
        closedDoorsTime: event.closedDoorsTime || "",
        termsAndConditions: event.termsAndConditions || "",
        startingPrice: event.startingPrice?.toString() || "",
        mainImageFile: null,
        venueLayoutImageFile: null,
        ticketTransferEnabled: event.ticketTransferEnabled || false,
        childrenAllowed:
          event.childrenAllowed !== undefined ? event.childrenAllowed : true,
        childEligibilityEnabled: false,
        childEligibilityRuleType: "" as
          | "between"
          | "less_than"
          | "more_than"
          | "",
        childEligibilityMinAge: null,
        childEligibilityMaxAge: null,
        wheelchairAccess: false,
        bathroom: false,
        parking: false,
        nonSmoking: false,
        commissionRate: event.commissionRate || {
          type: "percentage" as "percentage" | "flat",
          value: 10,
        },
        transferFee: event.transferFee || {
          type: "percentage" as "percentage" | "flat",
          value: 5,
        },
        imageUrl: event.imageUrl || "",
        venueLayoutImageUrl: event.venueLayoutImageUrl || "",
        gallery: event.gallery || [],
        venueLayouts: event.venueLayouts || [],
        ticketCategories: [], // Empty if fetch fails
        discounts: event.discounts || [],
        deductions: [],
        homePageSectionIds: event.homePageSectionIds || [],
      });
      toast({
        title: "Warning",
        description:
          "Could not load full event details. Some fields may be missing.",
        variant: "destructive",
      });
    }

    setIsEditDialogOpen(true);
  };

  const handleViewEvent = async (event: Event) => {
    if (!requirePermission("events_view")) {
      return;
    }
    try {
      // Fetch full event details from backend
      const eventDetails = await eventsApi.getEvent(event.id);
      // Map backend data to frontend Event type
      const fullEvent: any = {
        ...event,
        ...eventDetails,
        imageUrl: eventDetails.image || event.imageUrl,
        location: eventDetails.venue?.name || event.location,
        organizer: eventDetails.organizer?.name || event.organizer,
        category: eventDetails.category?.name || event.category,
        revenue: eventDetails.revenue || event.revenue || 0,
        commission: eventDetails.commission || event.commission || 0,
        payout: eventDetails.payout || event.payout || 0,
        ticketsSold: eventDetails.tickets_sold || event.ticketsSold || 0,
        totalTickets: eventDetails.total_tickets || event.totalTickets || 0,
        // Include ticket categories from backend
        ticketCategories:
          eventDetails.ticket_categories || eventDetails.ticketCategories || [],
      };
      setSelectedEvent(fullEvent);
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to load event details",
        variant: "destructive",
      });
      // Fallback to using the event data we have
      setSelectedEvent(event);
      setIsViewDialogOpen(true);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!requirePermission("events_delete")) {
      return;
    }
    const event = eventsData?.results?.find((e: any) => e.id === eventId);
    if (event) {
      setEventToDelete({
        id: event.id,
        title: event.title || event.name || "",
        artist_name: event.artist_name || "",
        organizer: event.organizer?.name || "",
        organizers: [],
        date: event.date || "",
        time: event.time || "",
        location: event.venue?.name || event.location || "",
        status: event.status || "upcoming",
        category: event.category?.name || "",
        totalTickets: event.total_tickets || 0,
        ticketsSold: event.tickets_sold || 0,
        revenue: event.revenue || 0,
        commission: event.commission || 0,
        payout: event.payout || 0,
        commissionRate: { type: "percentage" as const, value: 0 },
        transferFee: { type: "percentage" as const, value: 0 },
        ticketTransferEnabled: false,
        childrenAllowed: false,
        childEligibilityEnabled: false,
        childEligibilityRuleType: "",
        childEligibilityMinAge: null,
        childEligibilityMaxAge: null,
        ticketLimit: 0,
        usheringAccounts: 0,
        imageUrl: "",
        description: "",
      });
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteEvent = () => {
    if (eventToDelete) {
      deleteEventMutation.mutate(eventToDelete.id);
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleCancelEvent = (eventId: string) => {
    if (!requirePermission("events_edit")) {
      return;
    }
    const event = eventsData?.results?.find((e: any) => e.id === eventId);
    if (event) {
      setEventToCancel({
        id: event.id,
        title: event.title || event.name || "",
        artist_name: event.artist_name || "",
        organizer: event.organizer?.name || "",
        organizers: [],
        date: event.date || "",
        time: event.time || "",
        location: event.venue?.name || event.location || "",
        status: event.status || "upcoming",
        category: event.category?.name || "",
        totalTickets: event.total_tickets || 0,
        ticketsSold: event.tickets_sold || 0,
        revenue: event.revenue || 0,
        commission: event.commission || 0,
        payout: event.payout || 0,
        commissionRate: { type: "percentage" as const, value: 0 },
        transferFee: { type: "percentage" as const, value: 0 },
        ticketTransferEnabled: false,
        childrenAllowed: false,
        childEligibilityEnabled: false,
        childEligibilityRuleType: "",
        childEligibilityMinAge: null,
        childEligibilityMaxAge: null,
        ticketLimit: 0,
        usheringAccounts: 0,
        imageUrl: "",
        description: "",
      });
      setIsCancelDialogOpen(true);
    }
  };

  const confirmCancelEvent = () => {
    if (eventToCancel) {
      cancelEventMutation.mutate(eventToCancel.id);
      setIsCancelDialogOpen(false);
      setEventToCancel(null);
    }
  };

  const handleAddDeduction = () => {
    if (!newDeduction.name.trim() || newDeduction.value <= 0) {
      toast({
        title: t("common.error"),
        description: t("admin.events.finances.deductionValidationError", "Please fill in all required fields with valid values"),
        variant: "destructive",
      });
      return;
    }

    // Add deduction to the event's deductions list (not global)
    const deductionToAdd = {
      name: newDeduction.name,
      type: newDeduction.type,
      value: newDeduction.value,
      description: newDeduction.description || "",
      appliesTo: deductionAppliesTo, // Track which part this deduction applies to
    };

    // Check if we're in Add Event dialog or Edit Event dialog
    if (isAddDialogOpen) {
      setNewEvent({
        ...newEvent,
        deductions: [...newEvent.deductions, deductionToAdd],
      });
    } else if (isEditDialogOpen) {
      setEditEventData({
        ...editEventData,
        deductions: [...editEventData.deductions, deductionToAdd],
      });
    }

    setNewDeduction({
      name: "",
      type: "percentage",
      value: 0,
      description: "",
    });
    setIsAddDeductionDialogOpen(false);
    
    toast({
      title: t("admin.events.finances.deductionAdded", "Deduction Added"),
      description: t("admin.events.finances.deductionAddedDesc", "Deduction has been added to this event"),
    });
  };

  // const handleExportEvents = () => {
  //   toast({
  //     title: t("admin.events.toast.exportSuccess"),
  //     description: t("admin.events.toast.exportSuccessDesc"),
  //   });
  // };

  const handleToggleTransfer = async (eventId: string, enabled: boolean) => {
    try {
      await eventsApi.updateEvent(eventId, {
        ticket_transfer_enabled: enabled,
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({
        title: t("admin.events.toast.transferUpdated"),
        description: enabled
          ? t("admin.events.toast.transferEnabled")
          : t("admin.events.toast.transferDisabled"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to update ticket transfer setting",
        variant: "destructive",
      });
    }
  };

  const handleViewAnalytics = async (eventId: string) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) {
        toast({
          title: t("common.error"),
          description: "Event not found",
          variant: "destructive",
        });
        return;
      }

      // Fetch statistics from backend
      const statistics = await eventsApi.getEventStatistics(eventId);

      // Combine event data with statistics
      const analyticsEvent: any = {
        ...event,
        ticketsSold: statistics.tickets_sold || event.ticketsSold || 0,
        totalTickets: statistics.total_tickets || event.totalTickets || 0,
        revenue: statistics.revenue || event.revenue || 0,
        commission: statistics.commission || event.commission || 0,
        payout: statistics.payout || event.payout || 0,
        // Add statistics data
        ticketsUsed: statistics.tickets_used || 0,
        ticketsRefunded: statistics.tickets_refunded || 0,
        attendanceRate: statistics.attendance_rate || 0,
        // Add real chart data
        salesTrend: statistics.sales_trend || [],
        recentActivity: statistics.recent_activity || [],
      };

      setSelectedEventForAnalytics(analyticsEvent);
      setIsAnalyticsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to load analytics",
        variant: "destructive",
      });
      // Fallback to using the event data we have
      const event = events.find((e) => e.id === eventId);
      if (event) {
        setSelectedEventForAnalytics(event);
        setIsAnalyticsDialogOpen(true);
      }
    }
  };

  const handleManageUshers = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEventForUshers(event);
      setIsUsherManagementDialogOpen(true);
    }
  };

  // Fetch ushers for selected event
  const { data: eventUshersData, isLoading: eventUshersLoading } = useQuery({
    queryKey: ["event-ushers", selectedEventForUshers?.id],
    queryFn: async () => {
      if (!selectedEventForUshers?.id) return null;
      await eventsApi.getEvent(selectedEventForUshers.id);
      // Fetch ushers for this event using the ushers endpoint
      const ushersResponse = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
        }/events/${selectedEventForUshers.id}/ushers/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "admin_access_token"
            )}`,
          },
        }
      );
      if (ushersResponse.ok) {
        return await ushersResponse.json();
      }
      return { ushers: [], count: 0 };
    },
    enabled: !!selectedEventForUshers?.id && isUsherManagementDialogOpen,
  });

  const handleManageTickets = async (eventId: string) => {
    try {
      const event = events.find((e) => e.id === eventId);
      if (!event) {
        toast({
          title: t("common.error"),
          description: "Event not found",
          variant: "destructive",
        });
        return;
      }

      // Fetch full event details and tickets
      const [eventDetails, ticketsData] = await Promise.all([
        eventsApi.getEvent(eventId),
        ticketsApi.getTickets({ event: eventId, page_size: 1000 }),
      ]);

      // Map backend data to frontend Event type
      const ticketsEvent: Event = {
        ...event,
        ...eventDetails,
        imageUrl: eventDetails.image || event.imageUrl,
        location: eventDetails.venue?.name || event.location,
        organizer: eventDetails.organizer?.name || event.organizer,
        category: eventDetails.category?.name || event.category,
        revenue: eventDetails.revenue || event.revenue || 0,
        ticketsSold: eventDetails.tickets_sold || event.ticketsSold || 0,
        totalTickets: eventDetails.total_tickets || event.totalTickets || 0,
        // Store tickets data for the dialog
        tickets: ticketsData.results || ticketsData || [],
        // Store ticket categories from event details
        ticketCategories:
          eventDetails.ticket_categories || eventDetails.ticketCategories || [],
      };

      setSelectedEventForTickets(ticketsEvent);
      setIsTicketManagementDialogOpen(true);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to load tickets",
        variant: "destructive",
      });
      // Fallback to using the event data we have
      const event = events.find((e) => e.id === eventId);
      if (event) {
        setSelectedEventForTickets(event);
        setIsTicketManagementDialogOpen(true);
      }
    }
  };

  const handleSaveEventChanges = () => {
    if (!selectedEvent) return;

    // Validate required fields - check for empty strings and null/undefined
    const title = editEventData.title?.trim();
    const date = editEventData.date?.trim();

    // Handle category - could be string, object, or number
    let category: string | number | object | null = null;
    if (editEventData.category) {
      if (typeof editEventData.category === "string") {
        category = editEventData.category.trim();
      } else if (typeof editEventData.category === "object") {
        category = editEventData.category; // Keep as object, will be handled later
      } else if (typeof editEventData.category === "number") {
        category = editEventData.category;
      }
    }

    if (!title || title === "") {
      toast({
        title: "Validation Error",
        description: "Please fill in the event title",
        variant: "destructive",
      });
      return;
    }

    if (!date || date === "") {
      toast({
        title: "Validation Error",
        description: "Please select an event date",
        variant: "destructive",
      });
      return;
    }

    if (!category || (typeof category === "string" && category === "")) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    // Organizers are optional - no validation needed

    // Ensure time format is correct (HH:MM:SS)
    let timeValue = editEventData.time || "00:00:00";
    if (timeValue.length === 5) {
      timeValue = timeValue + ":00";
    }

    // Ensure gates_open_time format is correct (HH:MM:SS)
    let gatesOpenTimeValue = editEventData.gatesOpenTime || null;
    if (gatesOpenTimeValue && gatesOpenTimeValue.length === 5) {
      gatesOpenTimeValue = gatesOpenTimeValue + ":00";
    }

    // Ensure closed_doors_time format is correct (HH:MM:SS)
    let closedDoorsTimeValue = editEventData.closedDoorsTime || null;
    if (closedDoorsTimeValue && closedDoorsTimeValue.length === 5) {
      closedDoorsTimeValue = closedDoorsTimeValue + ":00";
    }

    // Validate total_tickets and ticket_limit
    const totalTickets = parseInt(
      editEventData.totalTickets?.toString() || "0"
    );
    // Handle empty string for ticketLimit - default to 1
    const parsedTicketLimit =
      editEventData.ticketLimit === null ||
      editEventData.ticketLimit === undefined ||
      editEventData.ticketLimit === 0
        ? 1
        : typeof editEventData.ticketLimit === "string"
        ? parseInt(editEventData.ticketLimit) || 1
        : editEventData.ticketLimit;
    const ticketLimit = editEventData.isTicketLimitUnlimited
      ? totalTickets !== undefined && totalTickets !== null
        ? totalTickets
        : parsedTicketLimit !== undefined && parsedTicketLimit !== null
        ? parsedTicketLimit
        : 0
      : parsedTicketLimit;

    if (
      totalTickets === undefined ||
      totalTickets === null ||
      totalTickets < 0
    ) {
      toast({
        title: "Validation Error",
        description: "Total tickets cannot be negative",
        variant: "destructive",
      });
      return;
    }

    if (
      !editEventData.isTicketLimitUnlimited &&
      (!ticketLimit || ticketLimit < 1)
    ) {
      toast({
        title: "Validation Error",
        description: "Ticket limit must be at least 1",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for API
    // Note: total_tickets is now auto-calculated from ticket categories, so we don't send it
    const updateData: any = {
      title: title,
      artist_name: (editEventData.artist_name || "").trim(),
      description: editEventData.description || "",
      about_venue: editEventData.aboutVenue || "",
      gates_open_time: gatesOpenTimeValue,
      closed_doors_time: closedDoorsTimeValue,
      terms_and_conditions: editEventData.termsAndConditions || "",
      date: date,
      time: timeValue,
      // total_tickets is auto-calculated from ticket categories, don't send it
      ticket_limit: ticketLimit,
      is_ticket_limit_unlimited: editEventData.isTicketLimitUnlimited,
      ticket_transfer_enabled:
        editEventData.ticketTransferEnabled !== undefined
          ? editEventData.ticketTransferEnabled
          : true,
    };

    // Add organizer IDs - convert string array to number array
    const organizers = editEventData.organizers || [];
    if (organizers.length > 0) {
      const organizerIds = organizers
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));
      if (organizerIds.length > 0) {
        updateData.organizers = organizerIds;
      }
    } else {
      // If no organizers selected, send empty array to clear organizers
      updateData.organizers = [];
    }

    // Add venue ID if available - send null if "none" to clear venue
    if (editEventData.location && editEventData.location !== "none") {
      const venueId =
        typeof editEventData.location === "string"
          ? parseInt(editEventData.location)
          : editEventData.location;
      if (!isNaN(venueId)) {
        updateData.venue = venueId;
      }
    } else if (editEventData.location === "none") {
      // Explicitly set venue to null to clear it
      updateData.venue = null;
    }

    // Starting price is now calculated automatically from ticket categories
    // No need to set it manually

    // Add category - backend now expects category name (string)
    if (category) {
      let categoryName: string | null = null;

      // Handle different category formats
      if (typeof category === "string" && category.trim()) {
        // It's already a string (category name)
        categoryName = category.trim();
      } else if (typeof category === "object" && category !== null) {
        // If category is an object with name property
        if ("name" in category && typeof (category as any).name === "string") {
          categoryName = (category as any).name.trim();
        }
      }

      // Add category name if we have a valid one
      if (categoryName) {
        updateData.category = categoryName;
        console.log("Category name being sent:", categoryName);
      } else {
        console.warn(
          "Could not extract valid category name from:",
          category,
          "type:",
          typeof category
        );
      }
    }
    // If category is empty/null, don't include it in updateData (partial update - won't change existing category)

    console.log("Update data being sent:", JSON.stringify(updateData, null, 2));

    // Add commission rate fields - backend expects commission_rate_type and commission_rate_value
    if (editEventData.commissionRate) {
      updateData.commission_rate_type =
        editEventData.commissionRate.type || "percentage";
      // Handle empty string for commission_rate_value - default to 0
      const commissionValue =
        editEventData.commissionRate.value === null ||
        editEventData.commissionRate.value === undefined
          ? 0
          : typeof editEventData.commissionRate.value === "string"
          ? parseFloat(editEventData.commissionRate.value) || 0
          : editEventData.commissionRate.value;
      updateData.commission_rate_value = commissionValue;
    }

    // Add transfer fee fields
    if (editEventData.transferFee) {
      updateData.transfer_fee_type =
        editEventData.transferFee.type || "percentage";
      // Handle empty string for transfer_fee_value - default to 0
      const transferFeeValue =
        editEventData.transferFee.value === null ||
        editEventData.transferFee.value === undefined
          ? 0
          : typeof editEventData.transferFee.value === "string"
          ? parseFloat(editEventData.transferFee.value) || 0
          : editEventData.transferFee.value;
      updateData.transfer_fee_value = transferFeeValue;
    }

    // Add facility fields
    updateData.wheelchair_access = Boolean(editEventData.wheelchairAccess);
    updateData.bathroom = Boolean(editEventData.bathroom);
    updateData.parking = Boolean(editEventData.parking);
    updateData.non_smoking = Boolean(editEventData.nonSmoking);

    // Add child eligibility fields - explicitly set to false if not enabled
    updateData.child_eligibility_enabled = Boolean(
      editEventData.childEligibilityEnabled
    );
    if (
      editEventData.childEligibilityEnabled &&
      editEventData.childEligibilityRuleType
    ) {
      updateData.child_eligibility_rule_type =
        editEventData.childEligibilityRuleType;
      if (
        editEventData.childEligibilityMinAge !== null &&
        editEventData.childEligibilityMinAge !== undefined
      ) {
        updateData.child_eligibility_min_age =
          editEventData.childEligibilityMinAge;
      }
      if (
        editEventData.childEligibilityMaxAge !== null &&
        editEventData.childEligibilityMaxAge !== undefined
      ) {
        updateData.child_eligibility_max_age =
          editEventData.childEligibilityMaxAge;
      }
    } else {
      // Clear eligibility rules when disabled
      updateData.child_eligibility_rule_type = null;
      updateData.child_eligibility_min_age = null;
      updateData.child_eligibility_max_age = null;
    }

    // Add ticket categories - always send as array to avoid backend errors
    updateData.ticket_categories =
      editEventData.ticketCategories &&
      editEventData.ticketCategories.length > 0
        ? editEventData.ticketCategories.map((cat: any) => {
            // Ensure color is a valid hex color, default to green if invalid
            let colorValue = cat.color || "#10B981";
            // Validate hex color format
            if (typeof colorValue === "string") {
              colorValue = colorValue.trim();
              // If it doesn't start with #, add it
              if (colorValue && !colorValue.startsWith("#")) {
                colorValue = "#" + colorValue;
              }
              // Validate hex color pattern
              if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
                colorValue = "#10B981"; // Default to green if invalid
              }
            } else {
              colorValue = "#10B981";
            }

            return {
              name: cat.name || "",
              price: cat.price || 0,
              total_tickets: cat.totalTickets || 0,
              description: cat.description || "",
              color: colorValue, // Include validated color
            };
          })
        : [];

    console.log("Ticket categories being saved:", updateData.ticket_categories);

    // Add deductions - send as array of deduction objects
    if (editEventData.deductions && editEventData.deductions.length > 0) {
      updateData.deductions = editEventData.deductions.map((d) => ({
        name: d.name,
        type: d.type,
        value: d.value,
        description: d.description || "",
      }));
    } else {
      updateData.deductions = [];
    }

    // Add image files if provided - handle FormData separately
    if (editEventData.mainImageFile || editEventData.venueLayoutImageFile) {
      // For file uploads, we need to use FormData
      const formData = new FormData();
      Object.keys(updateData).forEach((key) => {
        // Skip child_eligibility fields - we'll add them separately to avoid duplication
        if (
          key === "child_eligibility_enabled" ||
          key === "child_eligibility_rule_type" ||
          key === "child_eligibility_min_age" ||
          key === "child_eligibility_max_age"
        ) {
          return;
        }
        if (key === "ticket_categories" || key === "deductions") {
          formData.append(key, JSON.stringify(updateData[key]));
        } else if (updateData[key] !== null && updateData[key] !== undefined) {
          // Convert values to strings for FormData
          if (typeof updateData[key] === "boolean") {
            formData.append(key, updateData[key].toString());
          } else if (typeof updateData[key] === "number") {
            formData.append(key, updateData[key].toString());
          } else {
            formData.append(key, updateData[key]);
          }
        }
      });
      // Add facility fields to FormData
      formData.append("wheelchair_access", editEventData.wheelchairAccess ? "true" : "false");
      formData.append("bathroom", editEventData.bathroom ? "true" : "false");
      formData.append("parking", editEventData.parking ? "true" : "false");
      formData.append("non_smoking", editEventData.nonSmoking ? "true" : "false");

      // Add child eligibility fields to FormData (only append once, not in the loop)
      // Make sure it's a string, not an array
      const childEligibilityEnabled = editEventData.childEligibilityEnabled
        ? "true"
        : "false";
      formData.append("child_eligibility_enabled", childEligibilityEnabled);
      if (
        editEventData.childEligibilityEnabled &&
        editEventData.childEligibilityRuleType
      ) {
        formData.append(
          "child_eligibility_rule_type",
          editEventData.childEligibilityRuleType
        );
        if (
          editEventData.childEligibilityMinAge !== null &&
          editEventData.childEligibilityMinAge !== undefined
        ) {
          formData.append(
            "child_eligibility_min_age",
            editEventData.childEligibilityMinAge.toString()
          );
        }
        if (
          editEventData.childEligibilityMaxAge !== null &&
          editEventData.childEligibilityMaxAge !== undefined
        ) {
          formData.append(
            "child_eligibility_max_age",
            editEventData.childEligibilityMaxAge.toString()
          );
        }
      }
      // Add image files if provided
      if (editEventData.mainImageFile) {
        formData.append("image", editEventData.mainImageFile);
      }
      if (editEventData.venueLayoutImageFile) {
        formData.append(
          "venue_layout_image",
          editEventData.venueLayoutImageFile
        );
      }
      // Use FormData for update
      updateEventMutation.mutate({ id: selectedEvent.id, data: formData });
      return;
    }

    // Store selected home page section IDs to update after event update
    const selectedSectionIds = editEventData.homePageSectionIds;
    const eventId = parseInt(selectedEvent.id);

    // Don't close dialog here - let the mutation's onSuccess handle it
    updateEventMutation.mutate(
      { id: selectedEvent.id, data: updateData },
      {
        onSuccess: async () => {
          // Update home page sections after event is updated
          if (selectedSectionIds.length >= 0) {
            try {
              // Get all sections and update them
              const allSections = homePageSections || [];
              await Promise.all(
                allSections.map(async (section: any) => {
                  const currentEventIds =
                    section.events?.map((e: any) => e.id) || [];
                  const shouldInclude = selectedSectionIds.includes(section.id);
                  const currentlyIncludes = currentEventIds.includes(eventId);

                  if (shouldInclude && !currentlyIncludes) {
                    // Add event to section
                    await homePageSectionsApi.updateSection(section.id, {
                      event_ids: [...currentEventIds, eventId],
                    });
                  } else if (!shouldInclude && currentlyIncludes) {
                    // Remove event from section
                    await homePageSectionsApi.updateSection(section.id, {
                      event_ids: currentEventIds.filter((id: any) => id !== eventId),
                    });
                  }
                })
              );
              // Invalidate home page sections query to refresh
              queryClient.invalidateQueries({ queryKey: ["homePageSections"] });
            } catch (error: any) {
              console.error("Error updating home page sections:", error);
              const errorMessage =
                error?.response?.data?.detail ||
                error?.response?.data?.message ||
                error?.message ||
                "Unknown error";
              console.error("Error details:", error?.response?.data);
              toast({
                title: t("admin.events.toast.error"),
                description:
                  t(
                    "admin.events.toast.homePageSectionsUpdateError",
                    "Event updated but failed to update home page sections"
                  ) + `: ${errorMessage}`,
                variant: "destructive",
              });
            }
          }
        },
      }
    );
  };

  // New handlers for enhanced edit features
  const handleEditEventDataChange = (field: string, value: any) => {
    setEditEventData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddGalleryImage = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Convert file to base64 data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;

      // Check if image is already in gallery (by comparing data URLs)
      if (editEventData.gallery.some((image) => image.url === imageUrl)) {
        toast({
          title: "Duplicate Image",
          description: "This image is already in the gallery",
          variant: "destructive",
        });
        return;
      }

      setEditEventData((prev) => {
        const newOrder = prev.gallery.length;
        const isFirstImage = prev.gallery.length === 0;

        return {
          ...prev,
          gallery: [
            ...prev.gallery,
            {
              id: Date.now().toString(),
              url: imageUrl,
              order: newOrder,
              isThumbnail: isFirstImage, // First image becomes thumbnail automatically
              file: file, // Store the original file for upload
            },
          ],
        };
      });

      toast({
        title: "Image Added",
        description: "Image has been added to the gallery",
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveGalleryImage = (index: number) => {
    setEditEventData((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  const handleSetThumbnail = (imageId: string) => {
    setEditEventData((prev) => ({
      ...prev,
      gallery: prev.gallery.map((image) => ({
        ...image,
        isThumbnail: image.id === imageId,
      })),
    }));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    setEditEventData((prev) => {
      const newGallery = [...prev.gallery];
      const [movedImage] = newGallery.splice(fromIndex, 1);
      newGallery.splice(toIndex, 0, movedImage);

      // Update order numbers and ensure first image is thumbnail if no thumbnail exists
      const updatedGallery = newGallery.map((image, index) => ({
        ...image,
        order: index,
      }));

      // If no thumbnail is set, make the first image the thumbnail
      const hasThumbnail = updatedGallery.some((img) => img.isThumbnail);
      if (!hasThumbnail && updatedGallery.length > 0) {
        updatedGallery[0].isThumbnail = true;
      }

      return {
        ...prev,
        gallery: updatedGallery,
      };
    });
  };

  const handleReorderGallery = (newOrder: GalleryImage[]) => {
    setEditEventData((prev) => {
      const updatedGallery = newOrder.map((image, index) => ({
        ...image,
        order: index,
      }));

      // If no thumbnail is set, make the first image the thumbnail
      const hasThumbnail = updatedGallery.some((img) => img.isThumbnail);
      if (!hasThumbnail && updatedGallery.length > 0) {
        updatedGallery[0].isThumbnail = true;
      }

      return {
        ...prev,
        gallery: updatedGallery,
      };
    });
  };

  // const handleUpdateImageAlt = (imageId: string, alt: string) => {
  //   setEditEventData((prev) => ({
  //     ...prev,
  //     gallery: prev.gallery.map((image) =>
  //       image.id === imageId ? { ...image, alt } : image
  //     ),
  //   }));
  // };

  const handleSetMainEventImage = (imageId: string) => {
    const image = editEventData.gallery.find((img) => img.id === imageId);
    if (image) {
      setEditEventData((prev) => ({
        ...prev,
        imageUrl: image.url, // Update the main event image
      }));
      toast({
        title: "Main Event Image Updated",
        description: "The main event image has been updated from the gallery",
      });
    }
  };

  const handleAddTicketCategory = () => {
    const newCategory = {
      id: Date.now().toString(),
      name: "",
      price: 0,
      totalTickets: 0,
      soldTickets: 0,
      description: "",
      color: "#10B981", // Default green color
    };
    setEditEventData((prev) => ({
      ...prev,
      ticketCategories: [...prev.ticketCategories, newCategory],
    }));
  };

  const handleUpdateTicketCategory = (
    index: number,
    field: string,
    value: any
  ) => {
    setEditEventData((prev) => ({
      ...prev,
      ticketCategories: prev.ticketCategories.map((category, i) =>
        i === index ? { ...category, [field]: value } : category
      ),
    }));
  };

  const handleRemoveTicketCategory = (index: number) => {
    setEditEventData((prev) => ({
      ...prev,
      ticketCategories: prev.ticketCategories.filter((_, i) => i !== index),
    }));
  };

  // Handlers for new event ticket categories
  const handleAddNewEventTicketCategory = () => {
    const newCategory = {
      id: Date.now().toString(),
      name: "",
      price: 0,
      totalTickets: 0,
      soldTickets: 0,
      description: "",
      color: "#10B981", // Default green color
    };
    setNewEvent((prev) => ({
      ...prev,
      ticketCategories: [...prev.ticketCategories, newCategory],
    }));
  };

  const handleUpdateNewEventTicketCategory = (
    index: number,
    field: string,
    value: any
  ) => {
    setNewEvent((prev) => ({
      ...prev,
      ticketCategories: prev.ticketCategories.map((category, i) =>
        i === index ? { ...category, [field]: value } : category
      ),
    }));
  };

  const handleRemoveNewEventTicketCategory = (index: number) => {
    setNewEvent((prev) => ({
      ...prev,
      ticketCategories: prev.ticketCategories.filter((_, i) => i !== index),
    }));
  };

  const handleAddDiscount = () => {
    const generateDiscountCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const newDiscount = {
      id: Date.now().toString(),
      name: "",
      type: "percentage",
      value: 0,
      code: generateDiscountCode(),
      validFrom: "",
      validTo: "",
      maxUses: 100,
      usedCount: 0,
      applicableCategories: [],
    };
    setEditEventData((prev) => ({
      ...prev,
      discounts: [...prev.discounts, newDiscount],
    }));
  };

  const handleUpdateDiscount = (index: number, field: string, value: any) => {
    setEditEventData((prev) => ({
      ...prev,
      discounts: prev.discounts.map((discount, i) =>
        i === index ? { ...discount, [field]: value } : discount
      ),
    }));
  };

  const handleRemoveDiscount = (index: number) => {
    setEditEventData((prev) => ({
      ...prev,
      discounts: prev.discounts.filter((_, i) => i !== index),
    }));
  };

  // Venue layout handlers
  const handleAddVenueLayout = () => {
    const newLayout: VenueLayout = {
      id: Date.now().toString(),
      name: "",
      description: "",
      sections: [],
      totalCapacity: 0,
      imageUrl: "",
      gateOpeningTime: "",
      gateClosingTime: "",
    };
    setEditEventData((prev) => ({
      ...prev,
      venueLayouts: [...prev.venueLayouts, newLayout],
    }));
  };

  const handleUpdateVenueLayout = (
    index: number,
    field: string,
    value: any
  ) => {
    setEditEventData((prev) => ({
      ...prev,
      venueLayouts: prev.venueLayouts.map((layout, i) =>
        i === index ? { ...layout, [field]: value } : layout
      ),
    }));
  };

  const handleRemoveVenueLayout = (index: number) => {
    setEditEventData((prev) => ({
      ...prev,
      venueLayouts: prev.venueLayouts.filter((_, i) => i !== index),
    }));
  };

  const handleAddVenueSection = (layoutIndex: number) => {
    const newSection: VenueSection = {
      id: Date.now().toString(),
      name: "",
      capacity: 0,
      price: 0,
      color: "#3B82F6",
      description: "",
      isActive: true,
    };
    setEditEventData((prev) => ({
      ...prev,
      venueLayouts: prev.venueLayouts.map((layout, i) =>
        i === layoutIndex
          ? { ...layout, sections: [...layout.sections, newSection] }
          : layout
      ),
    }));
  };

  const handleUpdateVenueSection = (
    layoutIndex: number,
    sectionIndex: number,
    field: string,
    value: any
  ) => {
    setEditEventData((prev) => ({
      ...prev,
      venueLayouts: prev.venueLayouts.map((layout, i) =>
        i === layoutIndex
          ? {
              ...layout,
              sections: layout.sections.map((section, j) =>
                j === sectionIndex ? { ...section, [field]: value } : section
              ),
            }
          : layout
      ),
    }));
  };

  const handleRemoveVenueSection = (
    layoutIndex: number,
    sectionIndex: number
  ) => {
    setEditEventData((prev) => ({
      ...prev,
      venueLayouts: prev.venueLayouts.map((layout, i) =>
        i === layoutIndex
          ? {
              ...layout,
              sections: layout.sections.filter((_, j) => j !== sectionIndex),
            }
          : layout
      ),
    }));
  };

  const handleAddEvent = () => {
    if (!requirePermission("events_create")) {
      return;
    }
    setTotalTicketsInput("");
    setIsAddDialogOpen(true);
  };

  const handleSaveNewEvent = () => {
    // Check if organizers are available
    const organizersList = organizersData?.results || organizersData || [];
    if (organizersList.length === 0) {
      toast({
        title: t("admin.events.toast.validationError"),
        description:
          "No organizers available. Please create an organizer first.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!newEvent.title || !newEvent.date) {
      toast({
        title: t("admin.events.toast.validationError"),
        description: t("admin.events.toast.validationErrorDesc"),
        variant: "destructive",
      });
      return;
    }

    // Organizers are optional - no validation needed

    // Validate total tickets (allow 0 for sold out events)
    if (
      newEvent.totalTickets === undefined ||
      newEvent.totalTickets === null ||
      newEvent.totalTickets < 0
    ) {
      toast({
        title: t("admin.events.toast.validationError"),
        description: "Total tickets cannot be negative",
        variant: "destructive",
      });
      return;
    }

    // Validate ticket limit (skip when unlimited)
    if (
      !newEvent.isTicketLimitUnlimited &&
      (!newEvent.ticketLimit || (newEvent.ticketLimit as number) < 1)
    ) {
      toast({
        title: t("admin.events.toast.validationError"),
        description: "Ticket limit must be at least 1",
        variant: "destructive",
      });
      return;
    }

    // Prepare organizer IDs for API - convert string array to number array
    const organizerIds = newEvent.organizers
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));

    const venueId =
      newEvent.location && newEvent.location !== "none"
        ? parseInt(newEvent.location)
        : null;
    // Category is now a name (string), not an ID
    const categoryName =
      newEvent.category && newEvent.category.trim()
        ? newEvent.category.trim()
        : null;

    // Ensure time format is correct (HH:MM:SS)
    let timeValue = newEvent.time || "00:00:00";
    if (timeValue.length === 5) {
      // If format is HH:MM, add :00
      timeValue = timeValue + ":00";
    }

    // Ensure gates_open_time format is correct (HH:MM:SS)
    let gatesOpenTimeValue = newEvent.gatesOpenTime || null;
    if (gatesOpenTimeValue && gatesOpenTimeValue.length === 5) {
      // If format is HH:MM, add :00
      gatesOpenTimeValue = gatesOpenTimeValue + ":00";
    }

    // Ensure closed_doors_time format is correct (HH:MM:SS)
    let closedDoorsTimeValue = newEvent.closedDoorsTime || null;
    if (closedDoorsTimeValue && closedDoorsTimeValue.length === 5) {
      closedDoorsTimeValue = closedDoorsTimeValue + ":00";
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("title", newEvent.title.trim());
    if (newEvent.artist_name) {
      formData.append("artist_name", newEvent.artist_name.trim());
    }
    formData.append("description", (newEvent.description || "").trim());
    formData.append("about_venue", (newEvent.aboutVenue || "").trim());
    if (gatesOpenTimeValue) {
      formData.append("gates_open_time", gatesOpenTimeValue);
    }
    formData.append(
      "terms_and_conditions",
      (newEvent.termsAndConditions || "").trim()
    );
    // Append organizers as array (API expects array of IDs)
    organizerIds.forEach((id) => {
      formData.append("organizers", id.toString());
    });
    if (venueId && !isNaN(venueId)) {
      formData.append("venue", venueId.toString());
    }
    formData.append("date", newEvent.date);
    formData.append("time", timeValue);
    if (categoryName) {
      formData.append("category", categoryName);
    }
    // Calculate total_tickets from ticket categories
    const calculatedTotalTickets = newEvent.ticketCategories.reduce(
      (sum, cat) => sum + (cat.totalTickets || 0),
      0
    );
    // Send total_tickets (backend requires it, even if it will be recalculated)
    formData.append("total_tickets", calculatedTotalTickets.toString());
    
    // Handle empty string for ticketLimit - default to 1
    const parsedTicketLimit =
      newEvent.ticketLimit === null ||
      newEvent.ticketLimit === undefined ||
      newEvent.ticketLimit === 0
        ? 1
        : typeof newEvent.ticketLimit === "string"
        ? parseInt(newEvent.ticketLimit) || 1
        : newEvent.ticketLimit;
    // When unlimited, ticket_limit should be at least 1 (backend validation)
    // If unlimited and we have calculated total, use that, otherwise use parsed limit (min 1)
    const ticketLimitValue = newEvent.isTicketLimitUnlimited
      ? calculatedTotalTickets > 0 
        ? calculatedTotalTickets
        : Math.max(parsedTicketLimit, 1)
      : Math.max(parsedTicketLimit, 1);
    formData.append("ticket_limit", ticketLimitValue.toString());
    formData.append(
      "is_ticket_limit_unlimited",
      newEvent.isTicketLimitUnlimited ? "true" : "false"
    );
    formData.append(
      "ticket_transfer_enabled",
      newEvent.ticketTransferEnabled.toString()
    );

    // Starting price is now calculated automatically from ticket categories
    // No need to set it manually

    // Add main image file if provided
    if (newEvent.mainImageFile) {
      formData.append("image", newEvent.mainImageFile);
    }
    // Add venue layout image file if provided
    if (newEvent.venueLayoutImageFile) {
      formData.append("venue_layout_image", newEvent.venueLayoutImageFile);
    }

    // Add ticket categories as JSON string (FormData doesn't handle nested objects well)
    // Filter out categories with blank names and always send ticket_categories, even if empty
    const ticketCategoriesData =
      newEvent.ticketCategories && newEvent.ticketCategories.length > 0
        ? newEvent.ticketCategories
            .filter((cat: any) => cat.name && cat.name.trim() !== "") // Filter out categories with blank names
            .map((cat: any) => {
              // Ensure color is a valid hex color, default to green if invalid
              let colorValue = cat.color || "#10B981";
              // Validate hex color format
              if (typeof colorValue === "string") {
                colorValue = colorValue.trim();
                // If it doesn't start with #, add it
                if (colorValue && !colorValue.startsWith("#")) {
                  colorValue = "#" + colorValue;
                }
                // Validate hex color pattern
                if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorValue)) {
                  colorValue = "#10B981"; // Default to green if invalid
                }
              } else {
                colorValue = "#10B981";
              }

              return {
                name: cat.name.trim(), // Ensure name is trimmed and not blank
                price: cat.price || 0,
                total_tickets: cat.totalTickets || 0,
                description: cat.description || "",
                color: colorValue, // Include validated color
              };
            })
        : [];
    formData.append("ticket_categories", JSON.stringify(ticketCategoriesData));

    // Add commission rate fields
    if (newEvent.commissionRate) {
      formData.append("commission_rate_type", newEvent.commissionRate.type);
      // Handle empty string for commission_rate_value - default to 0
      const commissionValue =
        newEvent.commissionRate.value === null ||
        newEvent.commissionRate.value === undefined
          ? 0
          : typeof newEvent.commissionRate.value === "string"
          ? parseFloat(newEvent.commissionRate.value) || 0
          : newEvent.commissionRate.value;
      formData.append("commission_rate_value", commissionValue.toString());
    }

    // Add transfer fee fields
    if (newEvent.transferFee) {
      formData.append("transfer_fee_type", newEvent.transferFee.type);
      // Handle empty string for transfer_fee_value - default to 0
      const transferFeeValue =
        newEvent.transferFee.value === null ||
        newEvent.transferFee.value === undefined
          ? 0
          : typeof newEvent.transferFee.value === "string"
          ? parseFloat(newEvent.transferFee.value) || 0
          : newEvent.transferFee.value;
      formData.append("transfer_fee_value", transferFeeValue.toString());
    }

    // Add facility fields
    formData.append("wheelchair_access", newEvent.wheelchairAccess ? "true" : "false");
    formData.append("bathroom", newEvent.bathroom ? "true" : "false");
    formData.append("parking", newEvent.parking ? "true" : "false");
    formData.append("non_smoking", newEvent.nonSmoking ? "true" : "false");

    // Add deductions - send as array of deduction objects with appliesTo field
    // Backend will create/get deductions and associate them with the event
    if (newEvent.deductions && newEvent.deductions.length > 0) {
      const deductionsData = newEvent.deductions.map((d) => ({
        name: d.name,
        type: d.type,
        value: d.value,
        description: d.description || "",
        appliesTo: d.appliesTo || "tickets", // Include appliesTo field
      }));
      formData.append("deductions", JSON.stringify(deductionsData));
    } else {
      formData.append("deductions", JSON.stringify([]));
    }

    // Add child eligibility fields
    formData.append(
      "child_eligibility_enabled",
      newEvent.childEligibilityEnabled.toString()
    );
    if (newEvent.childEligibilityEnabled && newEvent.childEligibilityRuleType) {
      formData.append(
        "child_eligibility_rule_type",
        newEvent.childEligibilityRuleType
      );
      if (
        newEvent.childEligibilityMinAge !== null &&
        newEvent.childEligibilityMinAge !== undefined
      ) {
        formData.append(
          "child_eligibility_min_age",
          newEvent.childEligibilityMinAge.toString()
        );
      }
      if (
        newEvent.childEligibilityMaxAge !== null &&
        newEvent.childEligibilityMaxAge !== undefined
      ) {
        formData.append(
          "child_eligibility_max_age",
          newEvent.childEligibilityMaxAge.toString()
        );
      }
    }

    // Log the data being sent for debugging
    console.log("Creating event with FormData");
    console.log("Raw form data:", newEvent);
    console.log("Ticket categories:", newEvent.ticketCategories);

    // Store selected home page section IDs to update after event creation
    const selectedSectionIds = newEvent.homePageSectionIds;

    createEventMutation.mutate(formData, {
      onSuccess: async (response) => {
        // After event is created, update home page sections
        if (selectedSectionIds.length > 0 && response?.id) {
          try {
            // Parse event ID - handle both string and number
            const eventId =
              typeof response.id === "string"
                ? parseInt(response.id)
                : response.id;
            if (isNaN(eventId)) {
              console.error("Invalid event ID:", response.id);
              return;
            }

            // Update each selected section to include this event
            await Promise.all(
              selectedSectionIds.map(async (sectionId) => {
                const section = homePageSections.find(
                  (s: any) => s.id === sectionId
                );
                if (section) {
                  // Get current event IDs and add the new event ID
                  const currentEventIds =
                    section.events?.map((e: any) => e.id) || [];
                  if (!currentEventIds.includes(eventId)) {
                    const updatedEventIds = [...currentEventIds, eventId];
                    await homePageSectionsApi.updateSection(sectionId, {
                      event_ids: updatedEventIds,
                    });
                  }
                }
              })
            );
            // Invalidate home page sections query to refresh
            queryClient.invalidateQueries({ queryKey: ["homePageSections"] });
          } catch (error: any) {
            console.error("Error updating home page sections:", error);
            const errorMessage =
              error?.response?.data?.detail ||
              error?.response?.data?.message ||
              error?.message ||
              "Unknown error";
            console.error("Error details:", error?.response?.data);
            toast({
              title: t("admin.events.toast.error"),
              description:
                t(
                  "admin.events.toast.homePageSectionsUpdateError",
                  "Event created but failed to update home page sections"
                ) + `: ${errorMessage}`,
              variant: "destructive",
            });
          }
        }
      },
    });

    // Reset form
    setNewEvent({
      title: "",
      artist_name: "",
      organizers: [],
      date: "",
      time: "",
      location: "",
      category: "",
      totalTickets: 0,
      ticketLimit: 1,
      isTicketLimitUnlimited: false,
      description: "",
      aboutVenue: "",
      gatesOpenTime: "",
      closedDoorsTime: "",
      termsAndConditions: "",
      startingPrice: "",
      mainImageFile: null,
      venueLayoutImageFile: null,
      ticketTransferEnabled: false,
      childrenAllowed: true,
      childEligibilityEnabled: false,
      childEligibilityRuleType: "",
      childEligibilityMinAge: null,
      childEligibilityMaxAge: null,
      commissionRate: {
        type: "percentage" as "percentage" | "flat",
        value: 10,
      },
      transferFee: {
        type: "percentage" as "percentage" | "flat",
        value: 5,
      },
      wheelchairAccess: false,
      bathroom: false,
      parking: false,
      nonSmoking: false,
      imageUrl: "",
      venueLayoutImageUrl: "",
      gallery: [],
      ticketCategories: [],
      deductions: [],
      homePageSectionIds: [],
    });
  };

  const handleNewEventChange = (
    field: string,
    value:
      | string
      | number
      | boolean
      | File
      | null
      | string[]
      | { type: "percentage" | "flat"; value: number }
  ) => {
    setNewEvent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Gallery management functions for new event
  const handleAddNewEventGalleryImage = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Convert file to base64 data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;

      // Check if image is already in gallery (by comparing data URLs)
      if (newEvent.gallery.some((image) => image.url === imageUrl)) {
        toast({
          title: "Duplicate Image",
          description: "This image is already in the gallery",
          variant: "destructive",
        });
        return;
      }

      setNewEvent((prev) => {
        const newOrder = prev.gallery.length;
        const isFirstImage = prev.gallery.length === 0;

        return {
          ...prev,
          gallery: [
            ...prev.gallery,
            {
              id: Date.now().toString(),
              url: imageUrl,
              order: newOrder,
              isThumbnail: isFirstImage, // First image becomes thumbnail automatically
              file: file, // Store the original file for upload
            },
          ],
        };
      });

      toast({
        title: "Image Added",
        description: "Image has been added to the gallery",
      });
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveNewEventGalleryImage = (index: number) => {
    setNewEvent((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  const handleSetNewEventThumbnail = (imageId: string) => {
    setNewEvent((prev) => ({
      ...prev,
      gallery: prev.gallery.map((image) => ({
        ...image,
        isThumbnail: image.id === imageId,
      })),
    }));
  };

  const handleSetNewEventMainImage = (imageId: string) => {
    const image = newEvent.gallery.find((img) => img.id === imageId);
    if (image) {
      setNewEvent((prev) => ({
        ...prev,
        imageUrl: image.url,
      }));
      toast({
        title: "Main Event Image Updated",
        description: "The main event image has been updated from the gallery",
      });
    }
  };

  // Usher management handlers
  const handleNewUsherChange = (field: string, value: string) => {
    setNewUsher((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddUsher = () => {
    if (!newUsher.name || !newUsher.email || !newUsher.assignedArea) {
      toast({
        title: t("admin.events.ushers.validationError"),
        description: t("admin.events.ushers.validationErrorDesc"),
        variant: "destructive",
      });
      return;
    }

    // TODO: Implement usher addition via API
    // const newUsherObj = {
    //   id: `U${Date.now()}`,
    //   name: newUsher.name,
    //   email: newUsher.email,
    //   status: "active",
    //   assignedAreas: [newUsher.assignedArea],
    //   lastActive: "Just now",
    // };

    setNewUsher({ name: "", email: "", assignedArea: "" });

    toast({
      title: t("admin.events.ushers.addSuccess"),
      description: t("admin.events.ushers.addSuccessDesc"),
    });
  };

  // Usher management handlers - TODO: Connect to UI when needed
  // These handlers are prepared for future use in usher management dialogs

  const handleSaveUsherChanges = () => {
    if (selectedUsher) {
      // TODO: Implement usher update via API
      setIsEditUsherDialogOpen(false);
      setSelectedUsher(null);
      toast({
        title: t("admin.events.ushers.editSuccess"),
        description: t("admin.events.ushers.editSuccessDesc"),
      });
    }
  };

  const handleSaveUsherManagementChanges = () => {
    toast({
      title: t("admin.events.ushers.saveSuccess"),
      description: t("admin.events.ushers.saveSuccessDesc"),
    });
    setIsUsherManagementDialogOpen(false);
  };

  const calculatePercentage = (sold: number, total: number) => {
    return total > 0 ? (sold / total) * 100 : 0;
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.events.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.events.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredEvents}
            columns={commonColumns.events}
            title={t("admin.events.title")}
            subtitle={t("admin.events.subtitle")}
            filename="events"
            filters={{
              search: searchTerm,
              status: statusFilter,
              category: categoryFilter,
              location: locationFilter,
              organizer: organizerFilter,
            }}
            onExport={() => {
              toast({
                title: t("admin.events.toast.exportSuccess"),
                description: t("admin.events.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.dashboard.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          {hasPermission("events_create") && (
            <Button onClick={handleAddEvent} className="text-xs sm:text-sm">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.dashboard.actions.addEvent")}
              </span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.events.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.events.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.events.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.events.filters.allStatus")}
                </SelectItem>
                <SelectItem value="upcoming">
                  {t("admin.events.filters.upcoming")}
                </SelectItem>
                <SelectItem value="ongoing">
                  {t("admin.events.filters.ongoing")}
                </SelectItem>
                <SelectItem value="completed">
                  {t("admin.events.filters.completed")}
                </SelectItem>
                <SelectItem value="cancelled">
                  {t("admin.events.filters.cancelled")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.events.filters.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.events.filters.allCategories")}
                </SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category || "unknown"}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.events.filters.location")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.events.filters.allLocations")}
                </SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location || "unknown"}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={organizerFilter} onValueChange={setOrganizerFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.events.filters.organizer")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.events.filters.allOrganizers")}
                </SelectItem>
                {uniqueOrganizers.map((organizer) => (
                  <SelectItem key={organizer} value={organizer || "unknown"}>
                    {organizer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right">
            {t("admin.events.title")} ({filteredEvents.length})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {eventsLoading ? (
                t("admin.events.loading")
              ) : eventsError ? (
                t("admin.events.error")
              ) : (
                <>
                  {t("admin.events.pagination.showing")}{" "}
                  {(currentPage - 1) * itemsPerPage + 1}-
                  {Math.min(currentPage * itemsPerPage, eventsData?.count || 0)}{" "}
                  {t("admin.events.pagination.of")} {eventsData?.count || 0}
                </>
              )}
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
                  <TableHead className="rtl:text-right">Event ID</TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.event")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.organizer")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.dateTime")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.location")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right">Children</TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.sales")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.events.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {t("admin.events.loading")}
                    </TableCell>
                  </TableRow>
                ) : eventsError ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-red-500"
                    >
                      {t("admin.events.error")}:{" "}
                      {eventsError instanceof Error
                        ? eventsError.message
                        : String(eventsError)}
                    </TableCell>
                  </TableRow>
                ) : paginatedEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {t("admin.events.noEvents")}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-mono font-semibold text-sm rtl:text-right">
                          {event.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center event-image-container">
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 event-image"
                          />
                          <div
                            className="min-w-0 flex-1 event-text"
                            dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
                          >
                            <p className="font-medium truncate">
                              {event.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {event.category}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium rtl:text-right">
                          {event.organizer}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          <p className="font-medium">
                            {format(parseISO(event.date), "MMM dd, yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.time}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right">
                          {event.location}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(event.status)}>
                          {getStatusText(event.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              event.childEligibilityEnabled ||
                              event.childrenAllowed
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          ></div>
                          <span className="text-xs ml-2 rtl:mr-2 rtl:ml-0">
                            {event.childEligibilityEnabled ||
                            event.childrenAllowed
                              ? "Yes"
                              : "No"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="rtl:text-right">
                          <p className="font-medium number-container">
                            {formatNumberForLocale(
                              event.ticketsSold,
                              i18nInstance.language
                            )}
                            /
                            {formatNumberForLocale(
                              event.totalTickets,
                              i18nInstance.language
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumberForLocale(
                              calculatePercentage(
                                event.ticketsSold,
                                event.totalTickets
                              ),
                              i18nInstance.language
                            )}
                            %
                          </p>
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
                            className="rtl:text-right"
                          >
                            <DropdownMenuLabel>
                              {t("admin.events.table.actions")}
                            </DropdownMenuLabel>
                            {hasPermission("events_view") && (
                              <DropdownMenuItem
                                onClick={() => handleViewEvent(event)}
                              >
                                <Eye className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                {t("admin.events.actions.viewDetails")}
                              </DropdownMenuItem>
                            )}
                            {hasPermission("events_edit") && (
                              <DropdownMenuItem
                                onClick={() => handleEditEvent(event)}
                              >
                                <Edit className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                {t("admin.events.actions.editEvent")}
                              </DropdownMenuItem>
                            )}
                            {(hasPermission("events_view") ||
                              hasPermission("events_edit")) && (
                              <DropdownMenuSeparator />
                            )}
                            {hasPermission("analytics_view") && (
                              <DropdownMenuItem
                                onClick={() => handleViewAnalytics(event.id)}
                              >
                                <BarChart3 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                {t("admin.events.actions.viewAnalytics")}
                              </DropdownMenuItem>
                            )}
                            {hasPermission("events_view") && (
                              <DropdownMenuItem
                                onClick={() => handleViewFinances(event)}
                              >
                                <DollarSign className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                {t("admin.events.actions.viewFinances", "View Finances")}
                              </DropdownMenuItem>
                            )}
                            {hasPermission("analytics_view") &&
                              (hasPermission("events_edit") || hasPermission("events_delete")) && (
                                <DropdownMenuSeparator />
                              )}
                            {hasPermission("events_edit") && event.status !== "cancelled" && event.status !== "completed" && (
                              <DropdownMenuItem
                                onClick={() => handleCancelEvent(event.id)}
                                className="text-orange-600"
                              >
                                <Ban className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                {t("admin.events.actions.cancelEvent") || "Cancel Event"}
                              </DropdownMenuItem>
                            )}
                            {hasPermission("events_delete") && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteEvent(event.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                                {t("admin.events.actions.deleteEvent")}
                              </DropdownMenuItem>
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
          {!eventsLoading && !eventsError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.events.pagination.showing")} ${
                (currentPage - 1) * itemsPerPage + 1
              }-${Math.min(
                currentPage * itemsPerPage,
                eventsData?.count || 0
              )} ${t("admin.events.pagination.of")} ${
                eventsData?.count || 0
              } ${t("admin.events.pagination.results")}`}
              totalItems={eventsData?.count || 0}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="rtl:text-right">
            <DialogTitle>{t("admin.events.dialogs.eventDetails")}</DialogTitle>
            <DialogDescription>
              {t("admin.events.dialogs.eventDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <div
                  className="space-y-4"
                  dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
                >
                  <div>
                    <h3 className="text-xl font-bold">{selectedEvent.title}</h3>
                    <p className="text-muted-foreground">
                      {selectedEvent.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                    <div>
                      <p className="text-sm font-medium">
                        {t("admin.events.filters.organizer")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.organizer}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("admin.events.filters.category")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("admin.events.table.dateTime")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(selectedEvent.date), "MMM dd, yyyy")}{" "}
                        at {selectedEvent.time}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("admin.events.table.location")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEvent.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 rtl:flex-row-reverse rtl:space-x-reverse">
                    <Badge className={getStatusColor(selectedEvent.status)}>
                      {getStatusText(selectedEvent.status)}
                    </Badge>
                    <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                      <Switch
                        checked={selectedEvent.ticketTransferEnabled}
                        onCheckedChange={(checked) =>
                          handleToggleTransfer(selectedEvent.id, checked)
                        }
                      />
                      <span className="text-sm">
                        {t("admin.events.actions.ticketTransfers")}
                      </span>
                    </div>
                    {selectedEvent.childrenAllowed ? (
                      <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-sm">
                          {t(
                            "admin.events.childrenAllowed",
                            "Children Allowed"
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-sm">
                          {t(
                            "admin.events.childrenNotAllowed",
                            "Children Not Allowed"
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rtl:space-x-reverse">
                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.metrics.ticketSales")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold number-container">
                      {formatNumberForLocale(
                        selectedEvent.ticketsSold,
                        i18n.language
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.metrics.ofSold", {
                        total: formatNumberForLocale(
                          selectedEvent.totalTickets,
                          i18n.language
                        ),
                      })}
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs rtl:flex-row-reverse">
                        <span>{t("admin.events.metrics.progress")}</span>
                        <span>
                          {calculatePercentage(
                            selectedEvent.ticketsSold,
                            selectedEvent.totalTickets
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${calculatePercentage(
                              selectedEvent.ticketsSold,
                              selectedEvent.totalTickets
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.metrics.revenue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-green-600 number-container">
                      {formatCurrencyForLocale(
                        selectedEvent.revenue,
                        i18n.language
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.metrics.commission")}:{" "}
                      {formatCurrencyForLocale(
                        selectedEvent.commission,
                        i18n.language
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rate:{" "}
                      {selectedEvent.commissionRate.type === "percentage"
                        ? `${selectedEvent.commissionRate.value}%`
                        : `${formatCurrencyForLocale(
                            selectedEvent.commissionRate.value,
                            i18n.language
                          )} per ticket`}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.metrics.payout")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-blue-600 number-container">
                      {formatCurrencyForLocale(
                        selectedEvent.payout,
                        i18n.language
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.metrics.pendingPayout")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Ticket Categories */}
              {selectedEvent.ticketCategories &&
                selectedEvent.ticketCategories.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm rtl:text-right">
                        {t("admin.events.tickets.categories") ||
                          "Ticket Categories"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedEvent.ticketCategories.map(
                          (category: any, index: number) => {
                            const sold =
                              category.soldTickets ||
                              category.sold ||
                              category.tickets_sold ||
                              0;
                            const total =
                              category.totalTickets ||
                              category.total ||
                              category.total_tickets ||
                              0;
                            const price = category.price || 0;
                            const colors = [
                              "bg-purple-100 text-purple-800",
                              "bg-blue-100 text-blue-800",
                              "bg-green-100 text-green-800",
                              "bg-yellow-100 text-yellow-800",
                              "bg-pink-100 text-pink-800",
                            ];
                            const colorIndex = index % colors.length;
                            return (
                              <Card
                                key={category.id || category.name || index}
                                className="p-4"
                              >
                                <div className="flex items-center justify-between mb-3 rtl:flex-row-reverse">
                                  <h4 className="font-medium">
                                    {category.name || "N/A"}
                                  </h4>
                                  <Badge className={colors[colorIndex]}>
                                    {formatCurrencyForLocale(
                                      price,
                                      i18nInstance.language
                                    )}
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm rtl:flex-row-reverse">
                                    <span>
                                      {t("admin.events.tickets.sold") || "Sold"}
                                    </span>
                                    <span>
                                      {sold}/{total}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{
                                        width: `${
                                          total > 0 ? (sold / total) * 100 : 0
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                  <div className="text-xs text-muted-foreground rtl:text-right">
                                    {formatCurrencyForLocale(
                                      sold * price,
                                      i18nInstance.language
                                    )}{" "}
                                    {t("admin.events.tickets.revenue") ||
                                      "revenue"}
                                  </div>
                                </div>
                              </Card>
                            );
                          }
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("admin.events.dialogs.close")}
            </Button>
            <Button onClick={() => handleEditEvent(selectedEvent!)}>
              {t("admin.events.actions.editEvent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle>{t("admin.events.dialogs.editEvent")}</DialogTitle>
            <DialogDescription>
              {t("admin.events.dialogs.editEventSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 rtl:space-x-reverse">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.eventTitle")}
                  </label>
                  <Input
                    value={editEventData.title}
                    onChange={(e) =>
                      handleEditEventDataChange("title", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.artistName")}
                  </label>
                  <Input
                    value={editEventData.artist_name || ""}
                    onChange={(e) =>
                      handleEditEventDataChange("artist_name", e.target.value)
                    }
                    placeholder={t("admin.events.form.enterArtistName")}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.organizers")}{" "}
                    {t("admin.events.form.optional")}
                  </label>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                    {(organizersData?.results || organizersData || [])
                      .length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No organizers available. Please create an organizer
                        first.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(organizersData?.results || organizersData || []).map(
                          (organizer: any) => (
                            <div
                              key={organizer.id}
                              className="flex items-center space-x-2 rtl:space-x-reverse"
                            >
                              <Checkbox
                                id={`organizer-${organizer.id}`}
                                checked={editEventData.organizers.includes(
                                  organizer.id.toString()
                                )}
                                onCheckedChange={(checked) => {
                                  const currentOrganizers = [
                                    ...editEventData.organizers,
                                  ];
                                  if (checked) {
                                    if (
                                      !currentOrganizers.includes(
                                        organizer.id.toString()
                                      )
                                    ) {
                                      currentOrganizers.push(
                                        organizer.id.toString()
                                      );
                                    }
                                  } else {
                                    const index = currentOrganizers.indexOf(
                                      organizer.id.toString()
                                    );
                                    if (index > -1) {
                                      currentOrganizers.splice(index, 1);
                                    }
                                  }
                                  handleEditEventDataChange(
                                    "organizers",
                                    currentOrganizers
                                  );
                                }}
                              />
                              <label
                                htmlFor={`organizer-${organizer.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                {organizer.name}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.category")} *
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={editEventData.category || ""}
                      onChange={(e) =>
                        handleEditEventDataChange("category", e.target.value)
                      }
                      placeholder={t("admin.events.form.selectCategory")}
                      className="flex-1"
                    />
                    {categoriesData && categoriesData.length > 0 && (
                      <Select
                        value={editEventData.category || ""}
                        onValueChange={(value) =>
                          handleEditEventDataChange("category", value)
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(categoriesData || []).map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {categoriesData && categoriesData.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                      Type a new category or select from existing ones
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.date")}
                  </label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={editEventData.date}
                    onChange={(e) =>
                      handleEditEventDataChange("date", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.time")}
                  </label>
                  <Input
                    type="time"
                    value={editEventData.time}
                    onChange={(e) =>
                      handleEditEventDataChange("time", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.location")}
                  </label>
                  <Select
                    value={editEventData.location || "none"}
                    onValueChange={(value) =>
                      handleEditEventDataChange("location", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("admin.events.form.selectVenue")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("admin.events.form.noVenue")}
                      </SelectItem>
                      {(venuesData?.results || venuesData || []).map(
                        (venue: any) => (
                          <SelectItem
                            key={venue.id}
                            value={venue.id.toString()}
                          >
                            {venue.name} - {venue.city}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.totalTickets")} (Auto-calculated)
                  </label>
                  <Input
                    type="number"
                    value={(() => {
                      // Auto-calculate from ticket categories
                      const calculatedTotal =
                        editEventData.ticketCategories.reduce(
                          (sum, cat) => sum + (cat.totalTickets || 0),
                          0
                        );
                      return calculatedTotal.toString();
                    })()}
                    readOnly
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total is automatically calculated from ticket categories
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.events.form.ticketLimit")}
                    </label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground rtl:flex-row-reverse rtl:space-x-reverse">
                      <Switch
                        checked={editEventData.isTicketLimitUnlimited}
                        onCheckedChange={(checked) =>
                          setEditEventData((prev) => ({
                            ...prev,
                            isTicketLimitUnlimited: checked,
                          }))
                        }
                        id="edit-ticket-limit-unlimited"
                      />
                      <label
                        htmlFor="edit-ticket-limit-unlimited"
                        className="cursor-pointer"
                      >
                        {t(
                          "admin.events.form.unlimitedTicketLimit",
                          "Unlimited"
                        )}
                      </label>
                    </div>
                  </div>
                  <Input
                    type="number"
                    value={
                      editEventData.isTicketLimitUnlimited
                        ? ""
                        : editEventData.ticketLimit
                    }
                    disabled={editEventData.isTicketLimitUnlimited}
                    className={
                      editEventData.isTicketLimitUnlimited
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : undefined
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      handleEditEventDataChange(
                        "ticketLimit",
                        val === "" ? "" : parseInt(val) || 1
                      );
                    }}
                    placeholder={
                      editEventData.isTicketLimitUnlimited
                        ? t(
                            "admin.events.form.ticketLimitUnlimitedPlaceholder",
                            "Unlimited"
                          )
                        : "1"
                    }
                  />
                  {editEventData.isTicketLimitUnlimited && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(
                        "admin.events.form.unlimitedTicketLimitDescription",
                        "Guests can buy up to the total tickets when this is enabled."
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.mainEventImage")}
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleEditEventDataChange("mainImageFile", file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.events.form.mainEventImageDescription")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.venueLayoutImage")}
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleEditEventDataChange("venueLayoutImageFile", file);
                      }
                    }}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.events.form.venueLayoutImageDescription")}
                  </p>
                  {editEventData.venueLayoutImageUrl && (
                    <div className="mt-2">
                      <img
                        src={editEventData.venueLayoutImageUrl}
                        alt="Current venue layout"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                </div>
                <div className="col-span-3">
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.description")} (About This Event)
                  </label>
                  <Textarea
                    value={editEventData.description}
                    onChange={(e) =>
                      handleEditEventDataChange("description", e.target.value)
                    }
                    placeholder={t("admin.events.form.enterEventDescription")}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.gatesOpenTime")}
                  </label>
                  <Input
                    type="time"
                    value={editEventData.gatesOpenTime}
                    onChange={(e) =>
                      handleEditEventDataChange("gatesOpenTime", e.target.value)
                    }
                    placeholder={t(
                      "admin.events.form.gatesOpenTimePlaceholder"
                    )}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.closedDoorsTime")}
                  </label>
                  <Input
                    type="time"
                    value={editEventData.closedDoorsTime || ""}
                    onChange={(e) =>
                      handleEditEventDataChange("closedDoorsTime", e.target.value)
                    }
                    placeholder={t("admin.events.form.closedDoorsTimePlaceholder")}
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.aboutVenue")}
                  </label>
                  <Textarea
                    value={editEventData.aboutVenue}
                    onChange={(e) =>
                      handleEditEventDataChange("aboutVenue", e.target.value)
                    }
                    placeholder={t("admin.events.form.aboutVenuePlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.termsAndConditions")}
                  </label>
                  <Textarea
                    value={editEventData.termsAndConditions}
                    onChange={(e) =>
                      handleEditEventDataChange(
                        "termsAndConditions",
                        e.target.value
                      )
                    }
                    placeholder={t(
                      "admin.events.form.termsAndConditionsPlaceholder"
                    )}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                <Switch
                  checked={editEventData.ticketTransferEnabled}
                  onCheckedChange={(checked) =>
                    handleEditEventDataChange("ticketTransferEnabled", checked)
                  }
                />
                <span className="text-sm">
                  {t("admin.events.form.enableTicketTransfers")}
                </span>
              </div>
              <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
                <Switch
                  checked={editEventData.childrenAllowed}
                  onCheckedChange={(checked) => {
                    handleEditEventDataChange("childrenAllowed", checked);
                    // Also enable/disable child eligibility when "Allow Children" is toggled
                    handleEditEventDataChange(
                      "childEligibilityEnabled",
                      checked
                    );
                    // Clear eligibility rules when disabled
                    if (!checked) {
                      handleEditEventDataChange("childEligibilityRuleType", "");
                      handleEditEventDataChange("childEligibilityMinAge", null);
                      handleEditEventDataChange("childEligibilityMaxAge", null);
                    }
                  }}
                />
                <span className="text-sm">Allow Children</span>
              </div>

              {/* Child Eligibility Configuration */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right">
                  Child Eligibility Configuration
                </h4>
                <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse mb-4">
                  <Switch
                    checked={editEventData.childEligibilityEnabled}
                    onCheckedChange={(checked) =>
                      handleEditEventDataChange(
                        "childEligibilityEnabled",
                        checked
                      )
                    }
                  />
                  <span className="text-sm">
                    Enable Child Eligibility Rules
                  </span>
                </div>
                {editEventData.childEligibilityEnabled && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium rtl:text-right">
                        Age Rule Type *
                      </label>
                      <Select
                        value={editEventData.childEligibilityRuleType}
                        onValueChange={(value) =>
                          handleEditEventDataChange(
                            "childEligibilityRuleType",
                            value as "between" | "less_than" | "more_than" | ""
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rule type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="between">
                            Between ages (min–max)
                          </SelectItem>
                          <SelectItem value="less_than">
                            Less than (age &lt; X)
                          </SelectItem>
                          <SelectItem value="more_than">
                            More than (age &gt; X)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editEventData.childEligibilityRuleType === "between" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium rtl:text-right">
                            Minimum Age *
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={editEventData.childEligibilityMinAge || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleEditEventDataChange(
                                "childEligibilityMinAge",
                                val === "" ? null : parseInt(val) || null
                              );
                            }}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium rtl:text-right">
                            Maximum Age *
                          </label>
                          <Input
                            type="number"
                            min="0"
                            value={editEventData.childEligibilityMaxAge || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleEditEventDataChange(
                                "childEligibilityMaxAge",
                                val === "" ? null : parseInt(val) || null
                              );
                            }}
                            placeholder="18"
                          />
                        </div>
                      </div>
                    )}
                    {editEventData.childEligibilityRuleType === "less_than" && (
                      <div>
                        <label className="text-sm font-medium rtl:text-right">
                          Maximum Age (age &lt; X) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={editEventData.childEligibilityMaxAge || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleEditEventDataChange(
                              "childEligibilityMaxAge",
                              val === "" ? null : parseInt(val) || null
                            );
                          }}
                          placeholder="12"
                        />
                      </div>
                    )}
                    {editEventData.childEligibilityRuleType === "more_than" && (
                      <div>
                        <label className="text-sm font-medium rtl:text-right">
                          Minimum Age (age &gt; X) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={editEventData.childEligibilityMinAge || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleEditEventDataChange(
                              "childEligibilityMinAge",
                              val === "" ? null : parseInt(val) || null
                            );
                          }}
                          placeholder="5"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Facility Icons */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right">
                  {t("admin.events.facilities.title")}
                </h4>
                <p className="text-xs text-muted-foreground mb-4 rtl:text-right">
                  {t("admin.events.facilities.description")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                    <Checkbox
                      id="edit-wheelchair-access"
                      checked={editEventData.wheelchairAccess}
                      onCheckedChange={(checked) =>
                        handleEditEventDataChange("wheelchairAccess", checked as boolean)
                      }
                    />
                    <label
                      htmlFor="edit-wheelchair-access"
                      className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                    >
                      <Accessibility className="h-5 w-5" />
                      <span className="text-sm">{t("admin.events.facilities.wheelchairAccess")}</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                    <Checkbox
                      id="edit-bathroom"
                      checked={editEventData.bathroom}
                      onCheckedChange={(checked) =>
                        handleEditEventDataChange("bathroom", checked as boolean)
                      }
                    />
                    <label
                      htmlFor="edit-bathroom"
                      className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                    >
                      <ShowerHead className="h-5 w-5" />
                      <span className="text-sm">{t("admin.events.facilities.bathroom")}</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                    <Checkbox
                      id="edit-parking"
                      checked={editEventData.parking}
                      onCheckedChange={(checked) =>
                        handleEditEventDataChange("parking", checked as boolean)
                      }
                    />
                    <label
                      htmlFor="edit-parking"
                      className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                    >
                      <ParkingCircle className="h-5 w-5" />
                      <span className="text-sm">{t("admin.events.facilities.parking")}</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                    <Checkbox
                      id="edit-non-smoking"
                      checked={editEventData.nonSmoking}
                      onCheckedChange={(checked) =>
                        handleEditEventDataChange("nonSmoking", checked as boolean)
                      }
                    />
                    <label
                      htmlFor="edit-non-smoking"
                      className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                    >
                      <Ban className="h-5 w-5" />
                      <span className="text-sm">{t("admin.events.facilities.nonSmoking")}</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Commission Rate Configuration */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right">
                  Commission Rate Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      Commission Type
                    </label>
                    <Select
                      value={editEventData.commissionRate.type}
                      onValueChange={(value) =>
                        handleEditEventDataChange("commissionRate", {
                          ...editEventData.commissionRate,
                          type: value as "percentage" | "flat",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          Percentage (%)
                        </SelectItem>
                        <SelectItem value="flat">Flat Fee (E£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      Commission Value
                    </label>
                    <Input
                      type="number"
                      value={editEventData.commissionRate.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleEditEventDataChange("commissionRate", {
                          ...editEventData.commissionRate,
                          value: val === "" ? "" : parseFloat(val) || 0,
                        });
                      }}
                      placeholder={
                        editEventData.commissionRate.type === "percentage"
                          ? "10"
                          : "50"
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-muted-foreground">
                      {editEventData.commissionRate.type === "percentage" ? (
                        <span>
                          Commission: {editEventData.commissionRate.value}% of
                          ticket price
                        </span>
                      ) : (
                        <span>
                          Commission: E£{editEventData.commissionRate.value} per
                          ticket
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-800">
                    <strong>Commission Calculation:</strong>
                    {editEventData.commissionRate.type === "percentage" ? (
                      <span>
                        {" "}
                        {editEventData.commissionRate.value}% of total revenue
                      </span>
                    ) : (
                      <span>
                        {" "}
                        E£{editEventData.commissionRate.value} × number of
                        tickets sold
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Transfer Fee Configuration */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right">
                  Transfer Fee Configuration
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      Transfer Fee Type
                    </label>
                    <Select
                      value={editEventData.transferFee.type}
                      onValueChange={(value) =>
                        handleEditEventDataChange("transferFee", {
                          ...editEventData.transferFee,
                          type: value as "percentage" | "flat",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          Percentage (%)
                        </SelectItem>
                        <SelectItem value="flat">Flat Fee (E£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      Transfer Fee Value
                    </label>
                    <Input
                      type="number"
                      value={editEventData.transferFee.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleEditEventDataChange("transferFee", {
                          ...editEventData.transferFee,
                          value: val === "" ? "" : parseFloat(val) || 0,
                        });
                      }}
                      placeholder={
                        editEventData.transferFee.type === "percentage"
                          ? "5"
                          : "25"
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-muted-foreground">
                      {editEventData.transferFee.type === "percentage" ? (
                        <span>
                          Transfer Fee: {editEventData.transferFee.value}% of
                          ticket price
                        </span>
                      ) : (
                        <span>
                          Transfer Fee: E£{editEventData.transferFee.value} per
                          transfer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-xs text-orange-800">
                    <strong>Transfer Fee Calculation:</strong>
                    {editEventData.transferFee.type === "percentage" ? (
                      <span>
                        {" "}
                        {editEventData.transferFee.value}% of ticket price when
                        transferred
                      </span>
                    ) : (
                      <span>
                        {" "}
                        E£{editEventData.transferFee.value} per ticket transfer
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Categories */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium rtl:text-right">
                    Ticket Categories ({editEventData.ticketCategories.length})
                  </h4>
                  <Button onClick={handleAddTicketCategory} size="sm">
                    <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    Add Category
                  </Button>
                </div>
                <div className="space-y-4">
                  {editEventData.ticketCategories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <p>No ticket categories added yet</p>
                      <p className="text-sm">
                        Click "Add Category" to create ticket categories
                      </p>
                    </div>
                  ) : (
                    editEventData.ticketCategories.map((category: any, index) => (
                      <Card key={category.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <Input
                              placeholder="Category name (e.g., VIP, Regular, Early Bird)"
                              value={category.name}
                              onChange={(e) =>
                                handleUpdateTicketCategory(
                                  index,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="max-w-xs"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveTicketCategory(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium rtl:text-right">
                                Price (E£)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={category.price}
                                onChange={(e) =>
                                  handleUpdateTicketCategory(
                                    index,
                                    "price",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium rtl:text-right">
                                Total Tickets
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={category.totalTickets}
                                onChange={(e) =>
                                  handleUpdateTicketCategory(
                                    index,
                                    "totalTickets",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium rtl:text-right">
                                Color
                              </label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  value={category.color || "#10B981"}
                                  onChange={(e) =>
                                    handleUpdateTicketCategory(
                                      index,
                                      "color",
                                      e.target.value
                                    )
                                  }
                                  className="w-16 h-10 cursor-pointer"
                                />
                                <Input
                                  type="text"
                                  value={category.color || "#10B981"}
                                  onChange={(e) =>
                                    handleUpdateTicketCategory(
                                      index,
                                      "color",
                                      e.target.value
                                    )
                                  }
                                  placeholder="#10B981"
                                  className="flex-1"
                                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                                Choose a color for this ticket category
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-medium rtl:text-right">
                                Description
                              </label>
                              <Textarea
                                value={category.description}
                                onChange={(e) =>
                                  handleUpdateTicketCategory(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter category description..."
                                rows={2}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>

              {/* Home Page Sections */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right">
                  {t(
                    "admin.events.form.homePageSections",
                    "Home Page Sections"
                  )}
                </h4>
                <p className="text-sm text-muted-foreground mb-4 rtl:text-right">
                  {t(
                    "admin.events.form.homePageSectionsDescription",
                    "Select which home page sections this event should appear in"
                  )}
                </p>
                {homePageSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "admin.events.form.noHomePageSections",
                      "No home page sections available. Create sections in the Home Page Sections management."
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {homePageSections.map((section: any) => (
                      <div
                        key={section.id}
                        className="flex items-center space-x-2 rtl:space-x-reverse"
                      >
                        <Checkbox
                          id={`edit-section-${section.id}`}
                          checked={(
                            editEventData.homePageSectionIds || []
                          ).includes(section.id)}
                          onCheckedChange={(checked) => {
                            const currentIds =
                              editEventData.homePageSectionIds || [];
                            if (checked) {
                              handleEditEventDataChange("homePageSectionIds", [
                                ...currentIds,
                                section.id,
                              ]);
                            } else {
                              handleEditEventDataChange(
                                "homePageSectionIds",
                                currentIds.filter((id) => id !== section.id)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={`edit-section-${section.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          {section.title}{" "}
                          {section.subtitle && `(${section.subtitle})`}
                        </label>
                        <Badge
                          variant={section.is_active ? "default" : "secondary"}
                        >
                          {section.is_active
                            ? t("admin.events.form.active", "Active")
                            : t("admin.events.form.inactive", "Inactive")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Gallery */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 rtl:text-right">
                  Event Gallery
                </h4>

                {/* Add Image Section */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Upload Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium rtl:text-right mb-2 block">
                          Select Image Files
                        </label>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files) {
                              Array.from(files).forEach((file) => {
                                handleAddGalleryImage(file);
                              });
                              // Reset input to allow selecting the same file again
                              e.target.value = "";
                            }
                          }}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-2 rtl:text-right">
                          Supported formats: JPG, PNG, GIF, WebP. Max file size:
                          5MB per image.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gallery Display */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium rtl:text-right">
                      Gallery Images ({editEventData.gallery.length})
                    </h4>
                    {editEventData.gallery.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const sortedGallery = [
                              ...editEventData.gallery,
                            ].sort((a, b) => a.order - b.order);
                            handleEditEventDataChange(
                              "gallery",
                              sortedGallery.map((image, index) => ({
                                ...image,
                                order: index,
                              }))
                            );
                          }}
                        >
                          Sort by Order
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleEditEventDataChange("gallery", [])
                          }
                          className="text-red-600"
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>

                  {editEventData.gallery.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No images in gallery yet</p>
                      <p className="text-sm">Add images using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Gallery Instructions */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-blue-600 mt-1">
                            <svg
                              className="w-5 h-5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">
                              Gallery Management Tips:
                            </p>
                            <ul className="space-y-1 text-xs">
                              <li>
                                • Click the star icon to set an image as
                                thumbnail
                              </li>
                              <li>
                                • Click the house icon to set an image as main
                                event image
                              </li>
                              <li>
                                • The first image will be used as the main event
                                image
                              </li>
                              <li>
                                • Use the number badges to see the display order
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Gallery Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {editEventData.gallery
                          .sort((a, b) => a.order - b.order)
                          .map((image, index) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.url}
                                alt={image.alt || `Gallery image ${index + 1}`}
                                className={`w-full h-32 object-cover rounded-lg border ${
                                  image.isThumbnail
                                    ? "ring-2 ring-yellow-400"
                                    : ""
                                }`}
                                onError={(e) => {
                                  e.currentTarget.src =
                                    "https://via.placeholder.com/400x300?text=Image+Error";
                                }}
                              />

                              {/* Order Badge */}
                              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                #{image.order + 1}
                              </div>

                              {/* Status Badges - Positioned to avoid overlap */}
                              <div className="absolute bottom-2 right-2 flex flex-col gap-1">
                                {/* Thumbnail Badge */}
                                {image.isThumbnail && (
                                  <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                                    ★ Thumbnail
                                  </div>
                                )}

                                {/* Main Event Image Badge */}
                                {editEventData.imageUrl === image.url && (
                                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                    🏠 Main
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetThumbnail(image.id);
                                  }}
                                  className={`bg-white text-gray-700 rounded-full w-6 h-6 flex items-center justify-center hover:bg-yellow-100 border ${
                                    image.isThumbnail
                                      ? "bg-yellow-100 text-yellow-700"
                                      : ""
                                  }`}
                                  title={
                                    image.isThumbnail
                                      ? "Current thumbnail"
                                      : "Set as thumbnail"
                                  }
                                >
                                  ★
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetMainEventImage(image.id);
                                  }}
                                  className={`bg-white text-gray-700 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-100 border ${
                                    editEventData.imageUrl === image.url
                                      ? "bg-blue-100 text-blue-700"
                                      : ""
                                  }`}
                                  title={
                                    editEventData.imageUrl === image.url
                                      ? "Current main image"
                                      : "Set as main event image"
                                  }
                                >
                                  🏠
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const imageIndex =
                                      editEventData.gallery.findIndex(
                                        (img) => img.id === image.id
                                      );
                                    if (imageIndex !== -1) {
                                      handleRemoveGalleryImage(imageIndex);
                                    }
                                  }}
                                  className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                  title="Remove image"
                                >
                                  ×
                                </button>
                              </div>

                              {/* Image Info on Hover */}
                              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity max-w-[calc(100%-4rem)]">
                                {image.alt || `Image ${index + 1}`}
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Gallery Summary */}
                      {editEventData.gallery.length > 0 && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              <p>
                                <strong>Total Images:</strong>{" "}
                                {editEventData.gallery.length}
                              </p>
                              <p>
                                <strong>Thumbnail:</strong>{" "}
                                {editEventData.gallery.find(
                                  (img) => img.isThumbnail
                                )?.alt || "Not set"}
                              </p>
                              <p>
                                <strong>Main Event Image:</strong>{" "}
                                {editEventData.gallery.find(
                                  (img) => img.url === editEventData.imageUrl
                                )?.alt || "Not set"}
                              </p>
                              <p>
                                <strong>Display Order:</strong>{" "}
                                {editEventData.gallery
                                  .sort((a, b) => a.order - b.order)
                                  .map((_img, idx) => `#${idx + 1}`)
                                  .join(" → ")}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500">
                              <p>
                                Click ★ for thumbnail • Click 🏠 for main image
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Manage Deductions Section */}
              <div className="mt-6 border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.events.manageDeductions", "Manage Deductions")}
                </h3>
                <div className="space-y-6">
                  {/* Part 1: Tickets Sold Revenue Deductions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base rtl:text-right">
                        {t("admin.events.finances.ticketRevenue", "Part 1: Tickets Sold Revenue")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Deductions applied to tickets */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-semibold rtl:text-right">
                            {t("admin.events.finances.deductions", "Deductions Applied")}:
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeductionAppliesTo("tickets");
                              setIsAddDeductionDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.events.finances.addDeduction", "Add Deduction")}
                          </Button>
                        </div>
                        <div className="space-y-1 text-sm">
                          {/* TR Commission Fee (Auto-added from form) */}
                          {editEventData.commissionRate && (
                            <div className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                              <div>
                                <span className="text-sm font-medium">TR Commission Fee</span>
                                <p className="text-xs text-muted-foreground">
                                  {editEventData.commissionRate.type === 'percentage' 
                                    ? `${editEventData.commissionRate.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                                    : `E£ ${editEventData.commissionRate.value} ${t("admin.events.finances.perTicket", "per ticket")}`
                                  }
                                </p>
                                <p className="text-xs text-muted-foreground italic">
                                  {t("admin.events.finances.autoAdded", "Auto-added from form")}
                                </p>
                              </div>
                            </div>
                          )}
                          {editEventData.deductions.filter((d: any) => d.appliesTo === "tickets").length === 0 && !editEventData.commissionRate ? (
                            <p className="text-xs text-muted-foreground rtl:text-right">
                              {t("admin.events.finances.noDeductions", "No deductions added yet")}
                            </p>
                          ) : (
                            editEventData.deductions
                              .filter((d: any) => d.appliesTo === "tickets")
                              .map((deduction: any) => {
                                const actualIndex = editEventData.deductions.findIndex((d: any) => d === deduction);
                                return (
                                  <div key={actualIndex} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                                    <div>
                                      <span className="text-sm font-medium">{deduction.name}</span>
                                      <p className="text-xs text-muted-foreground">
                                        {deduction.type === 'percentage' 
                                          ? `${deduction.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                                          : `E£ ${deduction.value} ${t("admin.events.finances.perTicket", "per ticket")}`
                                        }
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updatedDeductions = editEventData.deductions.filter((_: any, i: number) => i !== actualIndex);
                                        handleEditEventDataChange("deductions", updatedDeductions);
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Part 2: NFC Card Revenue Deductions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base rtl:text-right">
                        {t("admin.events.finances.cardRevenue", "Part 2: NFC Card Revenue")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Deductions applied to NFC cards */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-semibold rtl:text-right">
                            {t("admin.events.finances.deductions", "Deductions Applied")}:
                          </h4>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeductionAppliesTo("nfc_cards");
                              setIsAddDeductionDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.events.finances.addDeduction", "Add Deduction")}
                          </Button>
                        </div>
                        <div className="space-y-1 text-sm">
                          {editEventData.deductions.filter((d: any) => d.appliesTo === "nfc_cards").length === 0 ? (
                            <p className="text-xs text-muted-foreground rtl:text-right">
                              {t("admin.events.finances.noDeductions", "No deductions added yet")}
                            </p>
                          ) : (
                            editEventData.deductions
                              .filter((d: any) => d.appliesTo === "nfc_cards")
                              .map((deduction: any) => {
                                const actualIndex = editEventData.deductions.findIndex((d: any) => d === deduction);
                                return (
                                  <div key={actualIndex} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                                    <div>
                                      <span className="text-sm font-medium">{deduction.name}</span>
                                      <p className="text-xs text-muted-foreground">
                                        {deduction.type === 'percentage' 
                                          ? `${deduction.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                                          : `E£ ${deduction.value} ${t("admin.events.finances.perTicket", "per ticket")}`
                                        }
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const updatedDeductions = editEventData.deductions.filter((_: any, i: number) => i !== actualIndex);
                                        handleEditEventDataChange("deductions", updatedDeductions);
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.events.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveEventChanges}>
              {t("admin.events.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle>{t("admin.events.dialogs.addEvent")}</DialogTitle>
            <DialogDescription>
              {t("admin.events.dialogs.addEventSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.eventTitle")} *
                </label>
                <Input
                  value={newEvent.title}
                  onChange={(e) =>
                    handleNewEventChange("title", e.target.value)
                  }
                  placeholder={t("admin.events.form.enterEventTitle")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.artistName")}
                </label>
                <Input
                  value={newEvent.artist_name || ""}
                  onChange={(e) =>
                    handleNewEventChange("artist_name", e.target.value)
                  }
                  placeholder={t("admin.events.form.enterArtistName")}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.category")} *
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newEvent.category}
                    onChange={(e) =>
                      handleNewEventChange("category", e.target.value)
                    }
                    placeholder={t("admin.events.form.selectCategory")}
                    className="flex-1"
                  />
                  {categoriesData && categoriesData.length > 0 && (
                    <Select
                      value={newEvent.category}
                      onValueChange={(value) =>
                        handleNewEventChange("category", value)
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(categoriesData || []).map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {categoriesData && categoriesData.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    Type a new category or select from existing ones
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.organizers")}{" "}
                  {t("admin.events.form.optional")}
                </label>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  {(organizersData?.results || organizersData || []).length ===
                  0 ? (
                    <p className="text-sm text-muted-foreground">
                      No organizers available. Please create an organizer first.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(organizersData?.results || organizersData || []).map(
                        (organizer: any) => (
                          <div
                            key={organizer.id}
                            className="flex items-center space-x-2 rtl:space-x-reverse"
                          >
                            <Checkbox
                              id={`new-organizer-${organizer.id}`}
                              checked={newEvent.organizers.includes(
                                organizer.id.toString()
                              )}
                              onCheckedChange={(checked) => {
                                const currentOrganizers = [
                                  ...newEvent.organizers,
                                ];
                                if (checked) {
                                  if (
                                    !currentOrganizers.includes(
                                      organizer.id.toString()
                                    )
                                  ) {
                                    currentOrganizers.push(
                                      organizer.id.toString()
                                    );
                                  }
                                } else {
                                  const index = currentOrganizers.indexOf(
                                    organizer.id.toString()
                                  );
                                  if (index > -1) {
                                    currentOrganizers.splice(index, 1);
                                  }
                                }
                                handleNewEventChange(
                                  "organizers",
                                  currentOrganizers
                                );
                              }}
                            />
                            <label
                              htmlFor={`new-organizer-${organizer.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {organizer.name}
                            </label>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.date")} *
                </label>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={newEvent.date}
                  onChange={(e) => handleNewEventChange("date", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.time")}
                </label>
                <Input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => handleNewEventChange("time", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.totalTickets")} (Auto-calculated)
                </label>
                <Input
                  type="number"
                  value={(() => {
                    // Auto-calculate from ticket categories
                    const calculatedTotal = newEvent.ticketCategories.reduce(
                      (sum, cat) => sum + (cat.totalTickets || 0),
                      0
                    );
                    return calculatedTotal.toString();
                  })()}
                  readOnly
                  disabled
                  className="bg-muted cursor-not-allowed"
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Total is automatically calculated from ticket categories
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.ticketLimit")}
                  </label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground rtl:flex-row-reverse rtl:space-x-reverse">
                    <Switch
                      checked={newEvent.isTicketLimitUnlimited}
                      onCheckedChange={(checked) =>
                        setNewEvent((prev) => ({
                          ...prev,
                          isTicketLimitUnlimited: checked,
                        }))
                      }
                      id="new-ticket-limit-unlimited"
                    />
                    <label
                      htmlFor="new-ticket-limit-unlimited"
                      className="cursor-pointer"
                    >
                      {t("admin.events.form.unlimitedTicketLimit", "Unlimited")}
                    </label>
                  </div>
                </div>
                <Input
                  type="number"
                  value={
                    newEvent.isTicketLimitUnlimited ? "" : newEvent.ticketLimit
                  }
                  disabled={newEvent.isTicketLimitUnlimited}
                  className={
                    newEvent.isTicketLimitUnlimited
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : undefined
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    handleNewEventChange(
                      "ticketLimit",
                      val === "" ? "" : parseInt(val) || 1
                    );
                  }}
                  placeholder={
                    newEvent.isTicketLimitUnlimited
                      ? t(
                          "admin.events.form.ticketLimitUnlimitedPlaceholder",
                          "Unlimited"
                        )
                      : "1"
                  }
                />
                {newEvent.isTicketLimitUnlimited && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(
                      "admin.events.form.unlimitedTicketLimitDescription",
                      "Guests can buy up to the total tickets when this is enabled."
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.mainEventImage")}
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleNewEventChange("mainImageFile", file);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.events.form.mainEventImageDescription")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.location")}
                </label>
                <Select
                  value={newEvent.location}
                  onValueChange={(value) =>
                    handleNewEventChange("location", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.events.form.selectVenue")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("admin.events.form.noVenue")}
                    </SelectItem>
                    {(venuesData?.results || venuesData || []).map(
                      (venue: any) => (
                        <SelectItem key={venue.id} value={venue.id.toString()}>
                          {venue.name} - {venue.city}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.gatesOpenTime")}
                </label>
                <Input
                  type="time"
                  value={newEvent.gatesOpenTime}
                  onChange={(e) =>
                    handleNewEventChange("gatesOpenTime", e.target.value)
                  }
                  placeholder={t("admin.events.form.gatesOpenTimePlaceholder")}
                />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.description")} (About This Event)
                </label>
                <Textarea
                  value={newEvent.description}
                  onChange={(e) =>
                    handleNewEventChange("description", e.target.value)
                  }
                  placeholder={t("admin.events.form.enterEventDescription")}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.closedDoorsTime")}
                </label>
                <Input
                  type="time"
                  value={newEvent.closedDoorsTime || ""}
                  onChange={(e) =>
                    handleNewEventChange("closedDoorsTime", e.target.value)
                  }
                  placeholder={t("admin.events.form.closedDoorsTimePlaceholder")}
                />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.aboutVenue")}
                </label>
                <Textarea
                  value={newEvent.aboutVenue}
                  onChange={(e) =>
                    handleNewEventChange("aboutVenue", e.target.value)
                  }
                  placeholder={t("admin.events.form.aboutVenuePlaceholder")}
                  rows={3}
                />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.termsAndConditions")}
                </label>
                <Textarea
                  value={newEvent.termsAndConditions}
                  onChange={(e) =>
                    handleNewEventChange("termsAndConditions", e.target.value)
                  }
                  placeholder={t(
                    "admin.events.form.termsAndConditionsPlaceholder"
                  )}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.events.form.venueLayoutImage")}
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleNewEventChange("venueLayoutImageFile", file);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.events.form.venueLayoutImageDescription")}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
              <Switch
                checked={newEvent.ticketTransferEnabled}
                onCheckedChange={(checked) =>
                  handleNewEventChange("ticketTransferEnabled", checked)
                }
              />
              <span className="text-sm">
                {t("admin.events.form.enableTicketTransfers")}
              </span>
            </div>
            <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse">
              <Switch
                checked={newEvent.childrenAllowed}
                onCheckedChange={(checked) => {
                  handleNewEventChange("childrenAllowed", checked);
                  // Also enable/disable child eligibility when "Allow Children" is toggled
                  handleNewEventChange("childEligibilityEnabled", checked);
                  // Clear eligibility rules when disabled
                  if (!checked) {
                    handleNewEventChange("childEligibilityRuleType", "");
                    handleNewEventChange("childEligibilityMinAge", null);
                    handleNewEventChange("childEligibilityMaxAge", null);
                  }
                }}
              />
              <span className="text-sm">
                {t("admin.events.form.allowChildren")}
              </span>
            </div>

            {/* Child Eligibility Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                Child Eligibility Configuration
              </h4>
              <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse mb-4">
                <Switch
                  checked={newEvent.childEligibilityEnabled}
                  onCheckedChange={(checked) =>
                    handleNewEventChange("childEligibilityEnabled", checked)
                  }
                />
                <span className="text-sm">Enable Child Eligibility Rules</span>
              </div>
              {newEvent.childEligibilityEnabled && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      Age Rule Type *
                    </label>
                    <Select
                      value={newEvent.childEligibilityRuleType}
                      onValueChange={(value) =>
                        handleNewEventChange(
                          "childEligibilityRuleType",
                          value as "between" | "less_than" | "more_than" | ""
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select rule type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="between">
                          Between ages (min–max)
                        </SelectItem>
                        <SelectItem value="less_than">
                          Less than (age &lt; X)
                        </SelectItem>
                        <SelectItem value="more_than">
                          More than (age &gt; X)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newEvent.childEligibilityRuleType === "between" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium rtl:text-right">
                          Minimum Age *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={newEvent.childEligibilityMinAge || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleNewEventChange(
                              "childEligibilityMinAge",
                              val === "" ? null : parseInt(val) || null
                            );
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium rtl:text-right">
                          Maximum Age *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={newEvent.childEligibilityMaxAge || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleNewEventChange(
                              "childEligibilityMaxAge",
                              val === "" ? null : parseInt(val) || null
                            );
                          }}
                          placeholder="18"
                        />
                      </div>
                    </div>
                  )}
                  {newEvent.childEligibilityRuleType === "less_than" && (
                    <div>
                      <label className="text-sm font-medium rtl:text-right">
                        Maximum Age (age &lt; X) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={newEvent.childEligibilityMaxAge || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleNewEventChange(
                            "childEligibilityMaxAge",
                            val === "" ? null : parseInt(val) || null
                          );
                        }}
                        placeholder="12"
                      />
                    </div>
                  )}
                  {newEvent.childEligibilityRuleType === "more_than" && (
                    <div>
                      <label className="text-sm font-medium rtl:text-right">
                        Minimum Age (age &gt; X) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={newEvent.childEligibilityMinAge || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleNewEventChange(
                            "childEligibilityMinAge",
                            val === "" ? null : parseInt(val) || null
                          );
                        }}
                        placeholder="5"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Facility Icons */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                {t("admin.events.facilities.title")}
              </h4>
              <p className="text-xs text-muted-foreground mb-4 rtl:text-right">
                {t("admin.events.facilities.description")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                  <Checkbox
                    id="new-wheelchair-access"
                    checked={newEvent.wheelchairAccess}
                    onCheckedChange={(checked) =>
                      handleNewEventChange("wheelchairAccess", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="new-wheelchair-access"
                    className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                  >
                    <Accessibility className="h-5 w-5" />
                    <span className="text-sm">{t("admin.events.facilities.wheelchairAccess")}</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                  <Checkbox
                    id="new-bathroom"
                    checked={newEvent.bathroom}
                    onCheckedChange={(checked) =>
                      handleNewEventChange("bathroom", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="new-bathroom"
                    className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                  >
                    <ShowerHead className="h-5 w-5" />
                    <span className="text-sm">{t("admin.events.facilities.bathroom")}</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                  <Checkbox
                    id="new-parking"
                    checked={newEvent.parking}
                    onCheckedChange={(checked) =>
                      handleNewEventChange("parking", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="new-parking"
                    className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                  >
                    <ParkingCircle className="h-5 w-5" />
                    <span className="text-sm">{t("admin.events.facilities.parking")}</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse p-3 border rounded-lg">
                  <Checkbox
                    id="new-non-smoking"
                    checked={newEvent.nonSmoking}
                    onCheckedChange={(checked) =>
                      handleNewEventChange("nonSmoking", checked as boolean)
                    }
                  />
                  <label
                    htmlFor="new-non-smoking"
                    className="flex items-center space-x-2 rtl:flex-row-reverse rtl:space-x-reverse cursor-pointer flex-1"
                  >
                    <Ban className="h-5 w-5" />
                    <span className="text-sm">{t("admin.events.facilities.nonSmoking")}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Commission Rate Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                {t("admin.events.form.commissionRateConfiguration")}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.commissionType")}
                  </label>
                  <Select
                    value={newEvent.commissionRate.type}
                    onValueChange={(value) =>
                      handleNewEventChange("commissionRate", {
                        ...newEvent.commissionRate,
                        type: value as "percentage" | "flat",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        {t("admin.events.form.commissionTypePercentage")}
                      </SelectItem>
                      <SelectItem value="flat">
                        {t("admin.events.form.commissionTypeFlat")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.form.commissionValue")}
                  </label>
                  <Input
                    type="number"
                    value={newEvent.commissionRate.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleNewEventChange("commissionRate", {
                        ...newEvent.commissionRate,
                        value: val === "" ? 0 : parseFloat(val) || 0,
                      });
                    }}
                    placeholder={
                      newEvent.commissionRate.type === "percentage"
                        ? "10"
                        : "50"
                    }
                  />
                </div>
              </div>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-800">
                  <strong>Commission Calculation:</strong>
                  {newEvent.commissionRate.type === "percentage" ? (
                    <span>
                      {" "}
                      {newEvent.commissionRate.value}% of total revenue
                    </span>
                  ) : (
                    <span>
                      {" "}
                      E£{newEvent.commissionRate.value} × number of tickets sold
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer Fee Configuration */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                Transfer Fee Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    Transfer Fee Type
                  </label>
                  <Select
                    value={newEvent.transferFee.type}
                    onValueChange={(value) =>
                      handleNewEventChange("transferFee", {
                        ...newEvent.transferFee,
                        type: value as "percentage" | "flat",
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
                    Transfer Fee Value
                  </label>
                  <Input
                    type="number"
                    value={newEvent.transferFee.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleNewEventChange("transferFee", {
                        ...newEvent.transferFee,
                        value: val === "" ? 0 : parseFloat(val) || 0,
                      });
                    }}
                    placeholder={
                      newEvent.transferFee.type === "percentage" ? "5" : "25"
                    }
                  />
                </div>
              </div>
              <div className="mt-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-xs text-orange-800">
                  <strong>Transfer Fee Calculation:</strong>
                  {newEvent.transferFee.type === "percentage" ? (
                    <span>
                      {" "}
                      {newEvent.transferFee.value}% of ticket price when
                      transferred
                    </span>
                  ) : (
                    <span>
                      {" "}
                      E£{newEvent.transferFee.value} per ticket transfer
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ticket Categories */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium rtl:text-right">
                  Ticket Categories ({newEvent.ticketCategories.length})
                </h4>
                <Button onClick={handleAddNewEventTicketCategory} size="sm">
                  <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  Add Category
                </Button>
              </div>
              <div className="space-y-4">
                {newEvent.ticketCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                    <p>No ticket categories added yet</p>
                    <p className="text-sm">
                      Click "Add Category" to create ticket categories
                    </p>
                  </div>
                ) : (
                  newEvent.ticketCategories.map((category, index) => (
                    <Card key={category.id}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <Input
                            placeholder="Category name (e.g., VIP, Regular, Early Bird)"
                            value={category.name}
                            onChange={(e) =>
                              handleUpdateNewEventTicketCategory(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            className="max-w-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveNewEventTicketCategory(index)
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium rtl:text-right">
                              Price (E£)
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={category.price}
                              onChange={(e) =>
                                handleUpdateNewEventTicketCategory(
                                  index,
                                  "price",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium rtl:text-right">
                              Total Tickets
                            </label>
                            <Input
                              type="number"
                              min="1"
                              value={category.totalTickets}
                              onChange={(e) =>
                                handleUpdateNewEventTicketCategory(
                                  index,
                                  "totalTickets",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium rtl:text-right">
                              Color
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="color"
                                value={category.color || "#10B981"}
                                onChange={(e) =>
                                  handleUpdateNewEventTicketCategory(
                                    index,
                                    "color",
                                    e.target.value
                                  )
                                }
                                className="w-16 h-10 cursor-pointer"
                              />
                              <Input
                                type="text"
                                value={category.color || "#10B981"}
                                onChange={(e) =>
                                  handleUpdateNewEventTicketCategory(
                                    index,
                                    "color",
                                    e.target.value
                                  )
                                }
                                placeholder="#10B981"
                                className="flex-1"
                                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                              Choose a color for this ticket category
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium rtl:text-right">
                              Description
                            </label>
                            <Textarea
                              value={category.description}
                              onChange={(e) =>
                                handleUpdateNewEventTicketCategory(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Enter category description..."
                              rows={2}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Home Page Sections */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                {t("admin.events.form.homePageSections", "Home Page Sections")}
              </h4>
              <p className="text-sm text-muted-foreground mb-4 rtl:text-right">
                {t(
                  "admin.events.form.homePageSectionsDescription",
                  "Select which home page sections this event should appear in"
                )}
              </p>
              {homePageSections.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "admin.events.form.noHomePageSections",
                    "No home page sections available. Create sections in the Home Page Sections management."
                  )}
                </p>
              ) : (
                <div className="space-y-3">
                  {homePageSections.map((section: any) => (
                    <div
                      key={section.id}
                      className="flex items-center space-x-2 rtl:space-x-reverse"
                    >
                      <Checkbox
                        id={`section-${section.id}`}
                        checked={(newEvent.homePageSectionIds || []).includes(
                          section.id
                        )}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewEvent((prev) => ({
                              ...prev,
                              homePageSectionIds: [
                                ...(prev.homePageSectionIds || []),
                                section.id,
                              ],
                            }));
                          } else {
                            setNewEvent((prev) => ({
                              ...prev,
                              homePageSectionIds: (
                                prev.homePageSectionIds || []
                              ).filter((id) => id !== section.id),
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`section-${section.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {section.title}{" "}
                        {section.subtitle && `(${section.subtitle})`}
                      </label>
                      <Badge
                        variant={section.is_active ? "default" : "secondary"}
                      >
                        {section.is_active
                          ? t("admin.events.form.active", "Active")
                          : t("admin.events.form.inactive", "Inactive")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Event Gallery */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 rtl:text-right">
                Event Gallery
              </h4>

              {/* Add Image Section */}
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">Upload Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium rtl:text-right mb-2 block">
                        Select Image Files
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach((file) => {
                              handleAddNewEventGalleryImage(file);
                            });
                            // Reset input to allow selecting the same file again
                            e.target.value = "";
                          }
                        }}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-2 rtl:text-right">
                        Supported formats: JPG, PNG, GIF, WebP. Max file size:
                        5MB per image.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gallery Display */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-medium rtl:text-right">
                    Gallery Images ({newEvent.gallery.length})
                  </h4>
                  {newEvent.gallery.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const sortedGallery = [...newEvent.gallery].sort(
                            (a, b) => a.order - b.order
                          );
                          setNewEvent((prev) => ({
                            ...prev,
                            gallery: sortedGallery.map((image, index) => ({
                              ...image,
                              order: index,
                            })),
                          }));
                        }}
                      >
                        Sort by Order
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setNewEvent((prev) => ({ ...prev, gallery: [] }))
                        }
                        className="text-red-600"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>

                {newEvent.gallery.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No images in gallery yet</p>
                    <p className="text-sm">Add images using the form above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Gallery Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-blue-600 mt-1">
                          <svg
                            className="w-5 h-5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">
                            Gallery Management Tips:
                          </p>
                          <ul className="space-y-1 text-xs">
                            <li>
                              • Click the star icon to set an image as thumbnail
                            </li>
                            <li>
                              • Click the house icon to set an image as main
                              event image
                            </li>
                            <li>
                              • The first image will be used as the main event
                              image
                            </li>
                            <li>
                              • Use the number badges to see the display order
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Gallery Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {newEvent.gallery
                        .sort((a, b) => a.order - b.order)
                        .map((image, index) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.url}
                              alt={image.alt || `Gallery image ${index + 1}`}
                              className={`w-full h-32 object-cover rounded-lg border ${
                                image.isThumbnail
                                  ? "ring-2 ring-yellow-400"
                                  : ""
                              }`}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://via.placeholder.com/400x300?text=Image+Error";
                              }}
                            />

                            {/* Order Badge */}
                            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                              #{image.order + 1}
                            </div>

                            {/* Status Badges - Positioned to avoid overlap */}
                            <div className="absolute bottom-2 right-2 flex flex-col gap-1">
                              {/* Thumbnail Badge */}
                              {image.isThumbnail && (
                                <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                                  ★ Thumbnail
                                </div>
                              )}

                              {/* Main Event Image Badge */}
                              {newEvent.imageUrl === image.url && (
                                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                  🏠 Main
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetNewEventThumbnail(image.id);
                                }}
                                className={`bg-white text-gray-700 rounded-full w-6 h-6 flex items-center justify-center hover:bg-yellow-100 border ${
                                  image.isThumbnail
                                    ? "bg-yellow-100 text-yellow-700"
                                    : ""
                                }`}
                                title={
                                  image.isThumbnail
                                    ? "Current thumbnail"
                                    : "Set as thumbnail"
                                }
                              >
                                ★
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetNewEventMainImage(image.id);
                                }}
                                className={`bg-white text-gray-700 rounded-full w-6 h-6 flex items-center justify-center hover:bg-blue-100 border ${
                                  newEvent.imageUrl === image.url
                                    ? "bg-blue-100 text-blue-700"
                                    : ""
                                }`}
                                title={
                                  newEvent.imageUrl === image.url
                                    ? "Current main image"
                                    : "Set as main event image"
                                }
                              >
                                🏠
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const imageIndex = newEvent.gallery.findIndex(
                                    (img) => img.id === image.id
                                  );
                                  if (imageIndex !== -1) {
                                    handleRemoveNewEventGalleryImage(
                                      imageIndex
                                    );
                                  }
                                }}
                                className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                title="Remove image"
                              >
                                ×
                              </button>
                            </div>

                            {/* Image Info on Hover */}
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity max-w-[calc(100%-4rem)]">
                              {image.alt || `Image ${index + 1}`}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Gallery Summary */}
                    {newEvent.gallery.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            <p>
                              <strong>Total Images:</strong>{" "}
                              {newEvent.gallery.length}
                            </p>
                            <p>
                              <strong>Thumbnail:</strong>{" "}
                              {newEvent.gallery.find((img) => img.isThumbnail)
                                ?.alt || "Not set"}
                            </p>
                            <p>
                              <strong>Main Event Image:</strong>{" "}
                              {newEvent.gallery.find(
                                (img) => img.url === newEvent.imageUrl
                              )?.alt || "Not set"}
                            </p>
                            <p>
                              <strong>Display Order:</strong>{" "}
                              {newEvent.gallery
                                .sort((a, b) => a.order - b.order)
                                .map((_img, idx) => `#${idx + 1}`)
                                .join(" → ")}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>
                              Click ★ for thumbnail • Click 🏠 for main image
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Manage Deductions Section */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 rtl:text-right">
              {t("admin.events.manageDeductions", "Manage Deductions")}
            </h3>
            <div className="space-y-6">
              {/* Part 1: Tickets Sold Revenue Deductions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base rtl:text-right">
                    {t("admin.events.finances.ticketRevenue", "Part 1: Tickets Sold Revenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Deductions applied to tickets */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold rtl:text-right">
                        {t("admin.events.finances.deductions", "Deductions Applied")}:
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeductionAppliesTo("tickets");
                          setIsAddDeductionDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                        {t("admin.events.finances.addDeduction", "Add Deduction")}
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm">
                      {/* TR Commission Fee (Auto-added from form) */}
                      {newEvent.commissionRate && (
                        <div className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                          <div>
                            <span className="text-sm font-medium">TR Commission Fee</span>
                            <p className="text-xs text-muted-foreground">
                              {newEvent.commissionRate.type === 'percentage' 
                                ? `${newEvent.commissionRate.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                                : `E£ ${newEvent.commissionRate.value} ${t("admin.events.finances.perTicket", "per ticket")}`
                              }
                            </p>
                            <p className="text-xs text-muted-foreground italic">
                              {t("admin.events.finances.autoAdded", "Auto-added from form")}
                            </p>
                          </div>
                        </div>
                      )}
                      {newEvent.deductions.filter(d => d.appliesTo === "tickets").length === 0 && !newEvent.commissionRate ? (
                        <p className="text-xs text-muted-foreground rtl:text-right">
                          {t("admin.events.finances.noDeductions", "No deductions added yet")}
                        </p>
                      ) : (
                        newEvent.deductions
                          .filter(d => d.appliesTo === "tickets")
                          .map((deduction) => {
                            const actualIndex = newEvent.deductions.findIndex(d => d === deduction);
                            return (
                              <div key={actualIndex} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                                <div>
                                  <span className="text-sm font-medium">{deduction.name}</span>
                                  <p className="text-xs text-muted-foreground">
                                    {deduction.type === 'percentage' 
                                      ? `${deduction.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                                      : `E£ ${deduction.value} ${t("admin.events.finances.perTicket", "per ticket")}`
                                    }
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setNewEvent({
                                      ...newEvent,
                                      deductions: newEvent.deductions.filter((_, i) => i !== actualIndex),
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Part 2: NFC Card Revenue Deductions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base rtl:text-right">
                    {t("admin.events.finances.cardRevenue", "Part 2: NFC Card Revenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Deductions applied to NFC cards */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold rtl:text-right">
                        {t("admin.events.finances.deductions", "Deductions Applied")}:
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeductionAppliesTo("nfc_cards");
                          setIsAddDeductionDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                        {t("admin.events.finances.addDeduction", "Add Deduction")}
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm">
                      {newEvent.deductions.filter(d => d.appliesTo === "nfc_cards").length === 0 ? (
                        <p className="text-xs text-muted-foreground rtl:text-right">
                          {t("admin.events.finances.noDeductions", "No deductions added yet")}
                        </p>
                      ) : (
                        newEvent.deductions
                          .filter(d => d.appliesTo === "nfc_cards")
                          .map((deduction) => {
                            const actualIndex = newEvent.deductions.findIndex(d => d === deduction);
                            return (
                              <div key={actualIndex} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                                <div>
                                  <span className="text-sm font-medium">{deduction.name}</span>
                                  <p className="text-xs text-muted-foreground">
                                    {deduction.type === 'percentage' 
                                      ? `${deduction.value}% ${t("admin.events.finances.ofRevenue", "of revenue")}`
                                      : `E£ ${deduction.value} ${t("admin.events.finances.perTicket", "per ticket")}`
                                    }
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setNewEvent({
                                      ...newEvent,
                                      deductions: newEvent.deductions.filter((_, i) => i !== actualIndex),
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setTotalTicketsInput("");
              }}
            >
              {t("admin.events.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveNewEvent}>
              {t("admin.events.dialogs.createEvent")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog
        open={isAnalyticsDialogOpen}
        onOpenChange={setIsAnalyticsDialogOpen}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("admin.events.analytics.title")} -{" "}
              {selectedEventForAnalytics?.title}
            </DialogTitle>
            <DialogDescription>
              {t("admin.events.analytics.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedEventForAnalytics && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Ticket className="h-4 w-4" />
                      {t("admin.events.analytics.ticketsSold")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold number-container">
                      {formatNumberForLocale(
                        selectedEventForAnalytics.ticketsSold,
                        i18nInstance.language
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.analytics.ofTotal", {
                        total: selectedEventForAnalytics.totalTickets,
                      })}
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs rtl:flex-row-reverse">
                        <span>{t("admin.events.analytics.progress")}</span>
                        <span>
                          {calculatePercentage(
                            selectedEventForAnalytics.ticketsSold,
                            selectedEventForAnalytics.totalTickets
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${calculatePercentage(
                              selectedEventForAnalytics.ticketsSold,
                              selectedEventForAnalytics.totalTickets
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {t("admin.events.analytics.revenue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-green-600 number-container">
                      {formatCurrencyForLocale(
                        selectedEventForAnalytics.revenue,
                        i18nInstance.language
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.analytics.commission")}:{" "}
                      {formatCurrencyForLocale(
                        selectedEventForAnalytics.commission,
                        i18nInstance.language
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.analytics.commissionRate") || "Rate"}:{" "}
                      {selectedEventForAnalytics.commissionRate?.type ===
                      "percentage"
                        ? `${selectedEventForAnalytics.commissionRate.value}%`
                        : selectedEventForAnalytics.commissionRate?.value
                        ? `E£${
                            selectedEventForAnalytics.commissionRate.value
                          } ${
                            t("admin.events.analytics.perTicket") ||
                            "per ticket"
                          }`
                        : "N/A"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t("admin.events.analytics.ushers")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-blue-600 number-container">
                      {selectedEventForAnalytics.usheringAccounts}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.analytics.activeUshers")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      {t("admin.events.analytics.conversion")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-purple-600 number-container">
                      {(
                        (selectedEventForAnalytics.ticketsSold /
                          selectedEventForAnalytics.totalTickets) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.events.analytics.salesRate")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm rtl:text-right">
                      {t("admin.events.analytics.salesTrend")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                          data={
                            selectedEventForAnalytics.salesTrend &&
                            selectedEventForAnalytics.salesTrend.length > 0
                              ? selectedEventForAnalytics.salesTrend.map(
                                  (item: any) => ({
                                    day:
                                      item.day ||
                                      format(new Date(item.date), "MMM dd"),
                                    sales: item.cumulative || item.sales || 0,
                                    date: item.date,
                                  })
                                )
                              : [{ day: "No data", sales: 0 }]
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip
                            formatter={(value: any) => [
                              formatNumberForLocale(
                                value,
                                i18nInstance.language
                              ),
                              "",
                            ]}
                          />
                          <Line
                            type="monotone"
                            dataKey="sales"
                            stroke="#8884d8"
                            strokeWidth={2}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm rtl:text-right">
                      {t("admin.events.analytics.revenueBreakdown")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={[
                              {
                                name: t("admin.events.analytics.payout"),
                                value: selectedEventForAnalytics.payout,
                                color: "#82ca9d",
                              },
                              {
                                name: t("admin.events.analytics.commission"),
                                value: selectedEventForAnalytics.commission,
                                color: "#8884d8",
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              {
                                name: t("admin.events.analytics.payout"),
                                value: selectedEventForAnalytics.payout,
                                color: "#82ca9d",
                              },
                              {
                                name: t("admin.events.analytics.commission"),
                                value: selectedEventForAnalytics.commission,
                                color: "#8884d8",
                              },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              formatCurrencyForLocale(
                                value,
                                i18nInstance.language
                              ),
                              "",
                            ]}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.analytics.recentActivity")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedEventForAnalytics.recentActivity &&
                    selectedEventForAnalytics.recentActivity.length > 0 ? (
                      selectedEventForAnalytics.recentActivity.map(
                        (activity: any, index: number) => {
                          const timeAgo = activity.time
                            ? formatDistanceToNow(new Date(activity.time), {
                                addSuffix: true,
                              })
                            : "N/A";
                          const actionText =
                            activity.action === "ticket_sold"
                              ? t(
                                  "admin.events.analytics.activity.ticketSold"
                                ) || "Ticket Sold"
                              : activity.action || "Activity";
                          return (
                            <div
                              key={activity.ticket_id || index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg rtl:flex-row-reverse"
                            >
                              <div className="flex items-center gap-3 rtl:flex-row-reverse">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">{actionText}</span>
                                {activity.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {activity.category}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground rtl:text-right">
                                {timeAgo} • {activity.user || "N/A"}
                              </div>
                            </div>
                          );
                        }
                      )
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>
                          {t("admin.events.analytics.noActivity") ||
                            "No recent activity"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsAnalyticsDialogOpen(false)}
            >
              {t("admin.events.dialogs.close")}
            </Button>
            <Button
              onClick={() => {
                if (!selectedEventForAnalytics) {
                  toast({
                    title: t("common.error"),
                    description:
                      t("admin.events.analytics.exportError") ||
                      "No analytics data available",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  // Prepare analytics data for export
                  const analyticsData = [
                    {
                      metric:
                        t("admin.events.analytics.ticketsSold") ||
                        "Tickets Sold",
                      value: selectedEventForAnalytics.ticketsSold || 0,
                      total: selectedEventForAnalytics.totalTickets || 0,
                      percentage:
                        selectedEventForAnalytics.totalTickets > 0
                          ? (
                              (selectedEventForAnalytics.ticketsSold /
                                selectedEventForAnalytics.totalTickets) *
                              100
                            ).toFixed(2) + "%"
                          : "0%",
                    },
                    {
                      metric: t("admin.events.analytics.revenue") || "Revenue",
                      value: formatCurrencyForLocale(
                        selectedEventForAnalytics.revenue || 0,
                        i18nInstance.language
                      ),
                      total: "",
                      percentage: "",
                    },
                    {
                      metric:
                        t("admin.events.analytics.commission") || "Commission",
                      value: formatCurrencyForLocale(
                        selectedEventForAnalytics.commission || 0,
                        i18nInstance.language
                      ),
                      total: "",
                      percentage: "",
                    },
                    {
                      metric: t("admin.events.analytics.payout") || "Payout",
                      value: formatCurrencyForLocale(
                        selectedEventForAnalytics.payout || 0,
                        i18nInstance.language
                      ),
                      total: "",
                      percentage: "",
                    },
                    {
                      metric:
                        t("admin.events.analytics.conversion") ||
                        "Conversion Rate",
                      value:
                        selectedEventForAnalytics.totalTickets > 0
                          ? (
                              (selectedEventForAnalytics.ticketsSold /
                                selectedEventForAnalytics.totalTickets) *
                              100
                            ).toFixed(2) + "%"
                          : "0%",
                      total: "",
                      percentage: "",
                    },
                    {
                      metric:
                        t("admin.events.analytics.ushers") || "Active Ushers",
                      value: selectedEventForAnalytics.usheringAccounts || 0,
                      total: "",
                      percentage: "",
                    },
                    {
                      metric:
                        t("admin.events.analytics.ticketsUsed") ||
                        "Tickets Used",
                      value: selectedEventForAnalytics.ticketsUsed || 0,
                      total: "",
                      percentage: "",
                    },
                    {
                      metric:
                        t("admin.events.analytics.ticketsRefunded") ||
                        "Tickets Refunded",
                      value: selectedEventForAnalytics.ticketsRefunded || 0,
                      total: "",
                      percentage: "",
                    },
                    {
                      metric:
                        t("admin.events.analytics.attendanceRate") ||
                        "Attendance Rate",
                      value:
                        (selectedEventForAnalytics.attendanceRate || 0).toFixed(
                          2
                        ) + "%",
                      total: "",
                      percentage: "",
                    },
                  ];

                  // Export detailed sales trend data
                  const salesTrendData: any[] = [];
                  if (
                    selectedEventForAnalytics.salesTrend &&
                    selectedEventForAnalytics.salesTrend.length > 0
                  ) {
                    selectedEventForAnalytics.salesTrend.forEach(
                      (item: any) => {
                        salesTrendData.push({
                          date: item.date
                            ? format(new Date(item.date), "yyyy-MM-dd")
                            : item.day || "N/A",
                          day: item.day || "N/A",
                          dailySales: item.sales || 0,
                          cumulativeSales: item.cumulative || 0,
                        });
                      }
                    );
                  }

                  // Export detailed recent activity data
                  const activityData: any[] = [];
                  if (
                    selectedEventForAnalytics.recentActivity &&
                    selectedEventForAnalytics.recentActivity.length > 0
                  ) {
                    selectedEventForAnalytics.recentActivity.forEach(
                      (activity: any) => {
                        activityData.push({
                          action:
                            activity.action === "ticket_sold"
                              ? t(
                                  "admin.events.analytics.activity.ticketSold"
                                ) || "Ticket Sold"
                              : activity.action || "Activity",
                          customer: activity.user || "N/A",
                          category: activity.category || "N/A",
                          price: activity.price
                            ? formatCurrencyForLocale(
                                activity.price,
                                i18nInstance.language
                              )
                            : "N/A",
                          timestamp: activity.time
                            ? format(
                                new Date(activity.time),
                                "yyyy-MM-dd HH:mm:ss"
                              )
                            : "N/A",
                          ticketId: activity.ticket_id || "N/A",
                        });
                      }
                    );
                  }

                  // Create workbook with multiple sheets
                  const workbook = XLSX.utils.book_new();

                  // Sheet 1: Summary Metrics
                  const summaryColumns = [
                    {
                      header: t("admin.events.analytics.metric") || "Metric",
                      key: "metric",
                      width: 40,
                    },
                    {
                      header: t("admin.events.analytics.value") || "Value",
                      key: "value",
                      width: 30,
                    },
                    {
                      header: t("admin.events.analytics.total") || "Total",
                      key: "total",
                      width: 20,
                    },
                    {
                      header:
                        t("admin.events.analytics.percentage") || "Percentage",
                      key: "percentage",
                      width: 20,
                    },
                  ];

                  const summaryData = analyticsData.map((row) => [
                    row.metric,
                    row.value,
                    row.total,
                    row.percentage,
                  ]);

                  const summarySheet = XLSX.utils.aoa_to_sheet([
                    [
                      `${
                        t("admin.events.analytics.title") || "Event Analytics"
                      } - ${selectedEventForAnalytics.title}`,
                    ],
                    [
                      t("admin.events.analytics.subtitle") ||
                        "Detailed analytics and insights for this event",
                    ],
                    [
                      `${
                        t("admin.events.analytics.generatedOn") ||
                        "Generated on"
                      }: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
                    ],
                    [],
                    summaryColumns.map((col) => col.header),
                    ...summaryData,
                  ]);

                  // Set column widths for summary sheet
                  summarySheet["!cols"] = summaryColumns.map((col) => ({
                    wch: col.width || 15,
                  }));
                  XLSX.utils.book_append_sheet(
                    workbook,
                    summarySheet,
                    t("admin.events.analytics.summary") || "Summary"
                  );

                  // Sheet 2: Sales Trend (if available)
                  if (salesTrendData.length > 0) {
                    const salesTrendColumns = [
                      {
                        header: t("admin.events.analytics.date") || "Date",
                        key: "date",
                      },
                      {
                        header: t("admin.events.analytics.day") || "Day",
                        key: "day",
                      },
                      {
                        header:
                          t("admin.events.analytics.dailySales") ||
                          "Daily Sales",
                        key: "dailySales",
                      },
                      {
                        header:
                          t("admin.events.analytics.cumulativeSales") ||
                          "Cumulative Sales",
                        key: "cumulativeSales",
                      },
                    ];

                    const salesTrendSheetData = salesTrendData.map((row) => [
                      row.date,
                      row.day,
                      row.dailySales,
                      row.cumulativeSales,
                    ]);

                    const salesTrendSheet = XLSX.utils.aoa_to_sheet([
                      [t("admin.events.analytics.salesTrend") || "Sales Trend"],
                      [],
                      salesTrendColumns.map((col) => col.header),
                      ...salesTrendSheetData,
                    ]);

                    salesTrendSheet["!cols"] = salesTrendColumns.map(() => ({
                      wch: 20,
                    }));
                    XLSX.utils.book_append_sheet(
                      workbook,
                      salesTrendSheet,
                      t("admin.events.analytics.salesTrend") || "Sales Trend"
                    );
                  }

                  // Sheet 3: Recent Activity (if available)
                  if (activityData.length > 0) {
                    const activityColumns = [
                      {
                        header: t("admin.events.analytics.action") || "Action",
                        key: "action",
                      },
                      {
                        header:
                          t("admin.events.analytics.customer") || "Customer",
                        key: "customer",
                      },
                      {
                        header:
                          t("admin.events.analytics.category") || "Category",
                        key: "category",
                      },
                      {
                        header: t("admin.events.analytics.price") || "Price",
                        key: "price",
                      },
                      {
                        header:
                          t("admin.events.analytics.timestamp") || "Timestamp",
                        key: "timestamp",
                      },
                      {
                        header:
                          t("admin.events.analytics.ticketId") || "Ticket ID",
                        key: "ticketId",
                      },
                    ];

                    const activitySheetData = activityData.map((row) => [
                      row.action,
                      row.customer,
                      row.category,
                      row.price,
                      row.timestamp,
                      row.ticketId,
                    ]);

                    const activitySheet = XLSX.utils.aoa_to_sheet([
                      [
                        t("admin.events.analytics.recentActivity") ||
                          "Recent Activity",
                      ],
                      [],
                      activityColumns.map((col) => col.header),
                      ...activitySheetData,
                    ]);

                    activitySheet["!cols"] = activityColumns.map(() => ({
                      wch: 20,
                    }));
                    XLSX.utils.book_append_sheet(
                      workbook,
                      activitySheet,
                      t("admin.events.analytics.recentActivity") || "Activity"
                    );
                  }

                  // Save the Excel file
                  const filename = `event-analytics-${
                    selectedEventForAnalytics.title
                      ?.replace(/[^a-z0-9]/gi, "-")
                      .toLowerCase() || "event"
                  }-${format(new Date(), "yyyy-MM-dd-HH-mm")}.xlsx`;
                  XLSX.writeFile(workbook, filename);

                  toast({
                    title: t("admin.events.analytics.exportSuccess"),
                    description: t("admin.events.analytics.exportSuccessDesc"),
                  });
                } catch (error: any) {
                  console.error("Export error:", error);
                  toast({
                    title: t("common.error"),
                    description:
                      error.message ||
                      t("admin.events.analytics.exportError") ||
                      "Failed to export analytics",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("admin.events.analytics.export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usher Management Dialog */}
      <Dialog
        open={isUsherManagementDialogOpen}
        onOpenChange={setIsUsherManagementDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("admin.events.ushers.title")} - {selectedEventForUshers?.title}
            </DialogTitle>
            <DialogDescription>
              {t("admin.events.ushers.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedEventForUshers && (
            <div className="space-y-6">
              {/* Current Ushers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.ushers.currentUshers")} (
                    {eventUshersData?.count || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eventUshersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">
                        {t("common.loading")}
                      </span>
                    </div>
                  ) : eventUshersData?.ushers &&
                    eventUshersData.ushers.length > 0 ? (
                    <div className="space-y-3">
                      {eventUshersData.ushers.map((usher: any) => (
                        <div
                          key={usher.id}
                          className="flex items-center justify-between p-4 border rounded-lg rtl:flex-row-reverse"
                        >
                          <div className="flex items-center gap-3 rtl:flex-row-reverse">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-gray-600" />
                            </div>
                            <div className="rtl:text-right">
                              <p className="font-medium">{usher.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {usher.email}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {usher.phone}
                              </p>
                              <div className="flex gap-1 mt-1 rtl:flex-row-reverse">
                                <Badge variant="outline" className="text-xs">
                                  {usher.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Badge
                              className={
                                usher.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : usher.status === "inactive"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {usher.status === "active"
                                ? t("admin.events.ushers.active")
                                : usher.status === "inactive"
                                ? t("admin.events.ushers.inactive")
                                : t("admin.events.ushers.onLeave")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {t("admin.events.ushers.noUshersAssigned") ||
                          "No ushers assigned to this event"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add New Usher */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.ushers.addNew")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium rtl:text-right">
                        {t("admin.events.ushers.name")}
                      </label>
                      <Input
                        placeholder={t("admin.events.ushers.enterName")}
                        value={newUsher.name}
                        onChange={(e) =>
                          handleNewUsherChange("name", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium rtl:text-right">
                        {t("admin.events.ushers.email")}
                      </label>
                      <Input
                        placeholder={t("admin.events.ushers.enterEmail")}
                        value={newUsher.email}
                        onChange={(e) =>
                          handleNewUsherChange("email", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium rtl:text-right">
                        {t("admin.events.ushers.assignedArea")}
                      </label>
                      <Select
                        value={newUsher.assignedArea}
                        onValueChange={(value) =>
                          handleNewUsherChange("assignedArea", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("admin.events.ushers.selectArea")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Gate A">Gate A</SelectItem>
                          <SelectItem value="Gate B">Gate B</SelectItem>
                          <SelectItem value="Gate C">Gate C</SelectItem>
                          <SelectItem value="VIP Section">
                            VIP Section
                          </SelectItem>
                          <SelectItem value="General Section">
                            General Section
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button onClick={handleAddUsher}>
                      <UserPlus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      {t("admin.events.ushers.addUsher")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsUsherManagementDialogOpen(false)}
            >
              {t("admin.events.dialogs.close")}
            </Button>
            <Button onClick={handleSaveUsherManagementChanges}>
              {t("admin.events.ushers.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Usher Dialog */}
      <Dialog
        open={isEditUsherDialogOpen}
        onOpenChange={setIsEditUsherDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader className="rtl:text-right">
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {t("admin.events.ushers.editUsher")} - {selectedUsher?.name}
            </DialogTitle>
            <DialogDescription>
              {t("admin.events.ushers.editUsherSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.ushers.name")}
                  </label>
                  <Input
                    value={selectedUsher.name}
                    onChange={(e) =>
                      setSelectedUsher({
                        ...selectedUsher,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.ushers.email")}
                  </label>
                  <Input
                    value={selectedUsher.email}
                    onChange={(e) =>
                      setSelectedUsher({
                        ...selectedUsher,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.ushers.status")}
                  </label>
                  <Select
                    value={selectedUsher.status}
                    onValueChange={(value) =>
                      setSelectedUsher({ ...selectedUsher, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.events.ushers.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.events.ushers.inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.events.ushers.assignedAreas")}
                  </label>
                  <Select
                    value={selectedUsher.assignedAreas[0] || ""}
                    onValueChange={(value) =>
                      setSelectedUsher({
                        ...selectedUsher,
                        assignedAreas: [value],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("admin.events.ushers.selectArea")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Gate A">Gate A</SelectItem>
                      <SelectItem value="Gate B">Gate B</SelectItem>
                      <SelectItem value="Gate C">Gate C</SelectItem>
                      <SelectItem value="VIP Section">VIP Section</SelectItem>
                      <SelectItem value="General Section">
                        General Section
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsEditUsherDialogOpen(false)}
            >
              {t("admin.events.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveUsherChanges}>
              {t("admin.events.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Usher Activity Dialog */}
      <Dialog
        open={isViewUsherActivityDialogOpen}
        onOpenChange={setIsViewUsherActivityDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("admin.events.ushers.usherActivity")} - {selectedUsher?.name}
            </DialogTitle>
            <DialogDescription>
              {t("admin.events.ushers.usherActivitySubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="space-y-6">
              {/* Usher Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.ushers.usherInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium rtl:text-right">
                        {t("admin.events.ushers.name")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUsher.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium rtl:text-right">
                        {t("admin.events.ushers.email")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUsher.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium rtl:text-right">
                        {t("admin.events.ushers.status")}
                      </p>
                      <Badge
                        className={
                          selectedUsher.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {selectedUsher.status === "active"
                          ? t("admin.events.ushers.active")
                          : t("admin.events.ushers.inactive")}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.ushers.recentActivity")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        action: t("admin.events.ushers.activity.ticketScanned"),
                        time: "2 hours ago",
                        details: "VIP Section - Ticket #12345",
                      },
                      {
                        action: t("admin.events.ushers.activity.guestAssisted"),
                        time: "3 hours ago",
                        details: "Gate A - Customer inquiry",
                      },
                      {
                        action: t("admin.events.ushers.activity.ticketScanned"),
                        time: "4 hours ago",
                        details: "VIP Section - Ticket #12344",
                      },
                      {
                        action: t("admin.events.ushers.activity.areaPatrolled"),
                        time: "5 hours ago",
                        details: "VIP Section - Security check",
                      },
                    ].map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg rtl:flex-row-reverse"
                      >
                        <div className="flex items-center gap-3 rtl:flex-row-reverse">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">{activity.action}</span>
                        </div>
                        <div className="text-xs text-muted-foreground rtl:text-right">
                          {activity.time} • {activity.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.ushers.performanceStats")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        156
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.events.ushers.ticketsScanned")}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">23</div>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.events.ushers.guestsAssisted")}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        8.5h
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("admin.events.ushers.activeTime")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsViewUsherActivityDialogOpen(false)}
            >
              {t("admin.events.dialogs.close")}
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: t("admin.events.ushers.exportSuccess"),
                  description: t("admin.events.ushers.exportSuccessDesc"),
                });
              }}
            >
              <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("admin.events.ushers.exportActivity")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Management Dialog */}
      <Dialog
        open={isTicketManagementDialogOpen}
        onOpenChange={setIsTicketManagementDialogOpen}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              {t("admin.events.tickets.title")} -{" "}
              {selectedEventForTickets?.title}
            </DialogTitle>
            <DialogDescription>
              {t("admin.events.tickets.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedEventForTickets && (
            <div className="space-y-6">
              {/* Ticket Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.tickets.totalTickets")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold number-container">
                      {formatNumberForLocale(
                        selectedEventForTickets.totalTickets,
                        i18nInstance.language
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.tickets.soldTickets")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-green-600 number-container">
                      {formatNumberForLocale(
                        selectedEventForTickets.ticketsSold,
                        i18nInstance.language
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.tickets.availableTickets")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-blue-600 number-container">
                      {formatNumberForLocale(
                        selectedEventForTickets.totalTickets -
                          selectedEventForTickets.ticketsSold,
                        i18nInstance.language
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 rtl:text-right">
                    <CardTitle className="text-sm">
                      {t("admin.events.tickets.revenue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="rtl:text-right">
                    <div className="text-2xl font-bold text-purple-600 number-container">
                      {formatCurrencyForLocale(
                        selectedEventForTickets.revenue,
                        i18nInstance.language
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ticket Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.tickets.categories")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedEventForTickets?.ticketCategories &&
                    selectedEventForTickets.ticketCategories.length > 0 ? (
                      selectedEventForTickets.ticketCategories.map(
                        (category: any) => {
                          const sold =
                            category.soldTickets || category.sold || 0;
                          const total =
                            category.totalTickets || category.total || 0;
                          const price = category.price || 0;
                          const colors = [
                            "bg-purple-100 text-purple-800",
                            "bg-blue-100 text-blue-800",
                            "bg-green-100 text-green-800",
                            "bg-yellow-100 text-yellow-800",
                            "bg-pink-100 text-pink-800",
                          ];
                          const colorIndex =
                            (selectedEventForTickets.ticketCategories?.indexOf(
                              category
                            ) ?? 0) % colors.length;
                          return (
                            <Card
                              key={category.id || category.name}
                              className="p-4"
                            >
                              <div className="flex items-center justify-between mb-3 rtl:flex-row-reverse">
                                <h4 className="font-medium">{category.name}</h4>
                                <Badge className={colors[colorIndex]}>
                                  {formatCurrencyForLocale(
                                    price,
                                    i18nInstance.language
                                  )}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm rtl:flex-row-reverse">
                                  <span>{t("admin.events.tickets.sold")}</span>
                                  <span>
                                    {sold}/{total}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{
                                      width: `${
                                        total > 0 ? (sold / total) * 100 : 0
                                      }%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="text-xs text-muted-foreground rtl:text-right">
                                  {formatCurrencyForLocale(
                                    sold * price,
                                    i18nInstance.language
                                  )}{" "}
                                  {t("admin.events.tickets.revenue")}
                                </div>
                              </div>
                            </Card>
                          );
                        }
                      )
                    ) : (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        <p>
                          {t("admin.events.tickets.noCategories") ||
                            "No ticket categories found"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Ticket Sales */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm rtl:text-right">
                    {t("admin.events.tickets.recentSales")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedEventForTickets?.tickets &&
                    selectedEventForTickets.tickets.length > 0 ? (
                      selectedEventForTickets.tickets
                        .slice(0, 10)
                        .map((ticket: any) => {
                          const purchaseDate =
                            ticket.purchaseDate || ticket.purchase_date;
                          const timeAgo = purchaseDate
                            ? formatDistanceToNow(new Date(purchaseDate), {
                                addSuffix: true,
                              })
                            : "N/A";
                          return (
                            <div
                              key={ticket.id}
                              className="flex items-center justify-between p-3 border rounded-lg rtl:flex-row-reverse"
                            >
                              <div className="flex items-center gap-3 rtl:flex-row-reverse">
                                <QrCode className="h-5 w-5 text-gray-600" />
                                <div className="rtl:text-right">
                                  <p className="font-medium">
                                    {ticket.customerName ||
                                      ticket.customer?.name ||
                                      "N/A"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {ticket.ticketNumber || ticket.id}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 rtl:flex-row-reverse">
                                <Badge variant="outline">
                                  {ticket.category || "N/A"}
                                </Badge>
                                <span className="font-medium">
                                  {formatCurrencyForLocale(
                                    ticket.price || 0,
                                    i18nInstance.language
                                  )}
                                </span>
                                <Badge
                                  className={
                                    ticket.status === "valid"
                                      ? "bg-green-100 text-green-800"
                                      : ticket.status === "used"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {t(
                                    `admin.events.tickets.status.${ticket.status}`
                                  ) || ticket.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {timeAgo}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>
                          {t("admin.events.tickets.noTickets") ||
                            "No tickets found"}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsTicketManagementDialogOpen(false)}
            >
              {t("admin.events.dialogs.close")}
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: t("admin.events.tickets.exportSuccess"),
                  description: t("admin.events.tickets.exportSuccessDesc"),
                });
              }}
            >
              <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("admin.events.tickets.export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Finances Dialog */}
      <Dialog open={isViewFinancesDialogOpen} onOpenChange={setIsViewFinancesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="rtl:text-right">
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t("admin.events.finances.title", "Event Financial Details")}
            </DialogTitle>
            <DialogDescription>
              {selectedEventForFinances?.title && (
                <span>{selectedEventForFinances.title}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEventForFinances && (
            <EventFinancesReport event={selectedEventForFinances} />
          )}
          
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsViewFinancesDialogOpen(false)}
            >
              {t("admin.events.dialogs.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Event Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.events.dialogs.cancelEvent") || "Cancel Event"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.events.dialogs.cancelEventConfirm") ||
                "Are you sure you want to cancel this event? The event status will be changed to 'cancelled'."}
            </DialogDescription>
          </DialogHeader>
          {eventToCancel && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.events.table.title")}:</strong>{" "}
                {eventToCancel.title}
              </p>
              {eventToCancel.organizer && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.events.table.organizer")}:</strong>{" "}
                  {eventToCancel.organizer}
                </p>
              )}
              {eventToCancel.date && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.events.table.date")}:</strong>{" "}
                  {eventToCancel.date}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setEventToCancel(null);
              }}
            >
              {t("admin.events.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelEvent}
              disabled={cancelEventMutation.isPending}
            >
              {cancelEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.cancelling") || "Cancelling..."}
                </>
              ) : (
                t("admin.events.actions.cancelEvent") || "Cancel Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deduction Dialog */}
      <Dialog open={isAddDeductionDialogOpen} onOpenChange={setIsAddDeductionDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.events.finances.addDeduction", "Add Deduction")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {deductionAppliesTo === "tickets" 
                ? t("admin.events.finances.addDeductionDescTickets", "Add a new deduction that will be applied to ticket sales revenue (Part 1)")
                : t("admin.events.finances.addDeductionDescNFC", "Add a new deduction that will be applied to NFC card revenue (Part 2)")
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.events.finances.deductionName", "Deduction Name")} *
              </label>
              <Input
                value={newDeduction.name}
                onChange={(e) => setNewDeduction({ ...newDeduction, name: e.target.value })}
                placeholder={t("admin.events.finances.deductionNamePlaceholder", "e.g., Service Fee, Processing Fee")}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.events.finances.deductionType", "Deduction Type")} *
              </label>
              <Select
                value={newDeduction.type}
                onValueChange={(value: "percentage" | "fixed_per_ticket") => 
                  setNewDeduction({ ...newDeduction, type: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    {t("admin.events.finances.percentage", "Percentage of Revenue")}
                  </SelectItem>
                  <SelectItem value="fixed_per_ticket">
                    {t("admin.events.finances.fixedPerTicket", "Fixed Amount Per Ticket")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.events.finances.deductionValue", "Value")} *
              </label>
              <Input
                type="number"
                min="0"
                step={newDeduction.type === "percentage" ? "0.01" : "1"}
                value={newDeduction.value}
                onChange={(e) => setNewDeduction({ ...newDeduction, value: parseFloat(e.target.value) || 0 })}
                placeholder={newDeduction.type === "percentage" ? "5.00" : "10.00"}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {newDeduction.type === "percentage" 
                  ? t("admin.events.finances.percentageHint", "Enter percentage (e.g., 5 for 5%)")
                  : t("admin.events.finances.fixedHint", "Enter amount in EGP per ticket")
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.events.finances.deductionDescription", "Description")} (Optional)
              </label>
              <Textarea
                value={newDeduction.description}
                onChange={(e) => setNewDeduction({ ...newDeduction, description: e.target.value })}
                placeholder={t("admin.events.finances.deductionDescriptionPlaceholder", "Optional description for this deduction")}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDeductionDialogOpen(false);
                setNewDeduction({
                  name: "",
                  type: "percentage",
                  value: 0,
                  description: "",
                });
                setDeductionAppliesTo("tickets");
              }}
            >
              {t("admin.events.dialogs.cancel") || "Cancel"}
            </Button>
            <Button onClick={handleAddDeduction}>
              {t("admin.events.finances.addDeduction", "Add Deduction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.events.dialogs.deleteEvent") || "Delete Event"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.events.dialogs.deleteEventConfirm") ||
                "Are you sure you want to delete this event? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {eventToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.events.table.title")}:</strong>{" "}
                {eventToDelete.title}
              </p>
              {eventToDelete.organizer && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.events.table.organizer")}:</strong>{" "}
                  {eventToDelete.organizer}
                </p>
              )}
              {eventToDelete.date && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.events.table.date")}:</strong>{" "}
                  {eventToDelete.date}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setEventToDelete(null);
              }}
            >
              {t("admin.events.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteEvent}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.events.actions.deleteEvent") || "Delete Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export the component
export default EventsManagement;
