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
import { Switch } from "@/components/ui/switch";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Ban,
  RefreshCw,
  CheckCircle,
  Clock,
  Ticket,
  MoreHorizontal,
  AlertCircle,
  ChevronsUpDown,
  Tag,
  Tags,
  Crown,
  Award,
  Shield,
  Heart,
  Zap,
  Star,
  Eye,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyForLocale } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi, eventsApi } from "@/lib/api/adminApi";
import { COUNTRY_DIAL_CODES, DEFAULT_DIAL_CODE, CountryDialCode } from "@/constants/countryCodes";

type TicketLabel = {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string;
};

type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  customerId: string;
  customerName: string;
  category: string;
  price: number;
  purchaseDate: string;
  status: "valid" | "used" | "refunded" | "banned";
  checkInTime?: string;
  phoneNumber: string;
  ticketNumber: string;
  qrCode: string;
  labels: TicketLabel[];
  paymentStatus?: "pending" | "processing" | "completed" | "failed" | "refunded" | null;
  isAssigned?: boolean;
  assignedName?: string;
  assignedMobile?: string;
  assignedEmail?: string;
};

type CheckInLog = {
  id: string;
  ticketId: string;
  customerName: string;
  eventTitle: string;
  checkInTime: string;
  scanResult: "success" | "already_used" | "invalid" | "expired";
  location: string;
  usherName: string;
};

const TicketsManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Partial<Ticket>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);

  // View mode: 'events' or 'tickets'
  const [viewMode, setViewMode] = useState<"events" | "tickets">("events");
  const [selectedEventForTickets, setSelectedEventForTickets] = useState<string | null>(null);

  // Assign ticket dialog state
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [assignPhoneNumber, setAssignPhoneNumber] = useState<string>("");
  const [assignPhoneDialCode, setAssignPhoneDialCode] = useState<string>(DEFAULT_DIAL_CODE);
  const [assignPrice, setAssignPrice] = useState<number>(0);
  const [paidOutsideSystem, setPaidOutsideSystem] = useState<boolean>(false);
  const [eventSearchValue, setEventSearchValue] = useState<string>("");
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);
  const [eventTicketCategories, setEventTicketCategories] = useState<any[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Label management state
  const [showManageLabelsDialog, setShowManageLabelsDialog] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<TicketLabel[]>([]);
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

  const queryClient = useQueryClient();

  // Fetch events for assign ticket dialog
  const { data: eventsData } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: async () => {
      const response = await eventsApi.getEvents({ page_size: 1000 });
      return response;
    },
  });

  // Transform events for assign dialog
  const availableEvents = useMemo(() => {
    if (!eventsData?.results) return [];
    return eventsData.results.map((event: any) => ({
      id: event.id,
      title: event.title,
    }));
  }, [eventsData]);

  // Fetch tickets from API
  const { data: ticketsData, isLoading: ticketsLoading, error: ticketsError } = useQuery({
    queryKey: ['tickets', searchTerm, eventFilter, statusFilter, dateFilter, currentPage, itemsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (eventFilter !== 'all') params.event = eventFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (dateFilter !== 'all') {
        // Parse date filter (format: YYYY-MM)
        const [year, month] = dateFilter.split('-');
        params.date_from = `${year}-${month}-01T00:00:00Z`;
        // Get last day of month
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        params.date_to = `${year}-${month}-${lastDay}T23:59:59Z`;
      }
      
      const response = await ticketsApi.getTickets(params);
      return response;
    },
  });

  // Transform API tickets to match Ticket interface
  const tickets: Ticket[] = useMemo(() => {
    if (!ticketsData?.results) return [];
    return ticketsData.results.map((item: any) => {
      // Debug: log the item to see what fields are available
      // console.log('Ticket item:', item);
      
      const customerId = item.customer_id 
        ? String(item.customer_id) 
        : (item.customer?.id ? String(item.customer.id) : '');
      
      const phoneNumber = item.customer_phone 
        || item.customer?.phone 
        || item.customer?.mobile_number 
        || '';
      
      // Check if ticket is assigned (has assigned_name, assigned_mobile, or assigned_email)
      const isAssigned = item.is_assigned || !!(item.assigned_name || item.assigned_mobile || item.assigned_email);
      
      // Create labels array - add "Assigned Ticket" label if assigned
      const labels: TicketLabel[] = [];
      if (isAssigned) {
        labels.push({
          id: 'assigned-ticket',
          name: t('admin.tickets.labels.assignedTicket'),
          color: '#10B981', // Green color for assigned tickets
          description: t('admin.tickets.labels.assignedTicketDesc'),
          icon: 'CheckCircle',
        });
      }
      
      return {
        id: item.id,
        eventId: item.event?.id || '',
        eventTitle: item.event_title || item.event?.title || '',
        customerId: customerId,
        customerName: item.customer_name || item.customer?.name || '',
        category: item.category || '',
        price: parseFloat(item.price) || 0,
        purchaseDate: item.purchase_date ? item.purchase_date.split('T')[0] : '',
        status: item.status as "valid" | "used" | "refunded" | "banned",
        checkInTime: item.check_in_time || undefined,
        phoneNumber: phoneNumber,
        ticketNumber: item.ticket_number || '',
        qrCode: item.qr_code || item.ticket_number || '',
        labels: labels,
        paymentStatus: item.payment_status || null,
        isAssigned: isAssigned,
        assignedName: item.assigned_name || undefined,
        assignedMobile: item.assigned_mobile || undefined,
        assignedEmail: item.assigned_email || undefined,
      };
    });
  }, [ticketsData, t]);

  // Mock tickets data (removed - using API now)
  /*
  const tickets: Ticket[] = [
    {
      id: "1",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C001",
      customerName: t("admin.tickets.mock.customer.ahmedHassan"),
      category: "vip",
      price: 500,
      purchaseDate: "2025-07-15",
      status: "valid",
      phoneNumber: "+966501234567",
      ticketNumber: "TKT-001-2025",
      qrCode: "QR-001-2025",
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
          description: "Front row seating",
          icon: "Star",
        },
      ],
    },
    {
      id: "2",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C002",
      customerName: t("admin.tickets.mock.customer.sarahMohamed"),
      category: "regular",
      price: 250,
      purchaseDate: "2025-07-16",
      status: "used",
      checkInTime: "2025-08-15T18:30:00",
      phoneNumber: "+966502345678",
      ticketNumber: "TKT-002-2025",
      qrCode: "QR-002-2025",
      labels: [
        {
          id: "label-3",
          name: "Premium",
          color: "#8B5CF6",
          description: "Premium ticket",
          icon: "Award",
        },
      ],
    },
    {
      id: "3",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C003",
      customerName: t("admin.tickets.mock.customer.omarAli"),
      category: "earlyBird",
      price: 200,
      purchaseDate: "2025-07-20",
      status: "valid",
      phoneNumber: "+966503456789",
      ticketNumber: "TKT-003-2025",
      qrCode: "QR-003-2025",
      labels: [
        {
          id: "label-4",
          name: "Early Bird",
          color: "#10B981",
          description: "Early bird discount",
          icon: "Star",
        },
      ],
    },
    {
      id: "4",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C004",
      customerName: t("admin.tickets.mock.customer.fatimaAhmed"),
      category: "general",
      price: 150,
      purchaseDate: "2025-07-25",
      status: "refunded",
      phoneNumber: "+966504567890",
      ticketNumber: "TKT-004-2025",
      qrCode: "QR-004-2025",
      labels: [],
    },
    {
      id: "5",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C005",
      customerName: t("admin.tickets.mock.customer.youssefIbrahim"),
      category: "student",
      price: 150,
      purchaseDate: "2025-07-28",
      status: "banned",
      phoneNumber: "+966505678901",
      ticketNumber: "TKT-005-2025",
      qrCode: "QR-005-2025",
      labels: [],
    },
    {
      id: "6",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C006",
      customerName: "Mariam Khalil",
      category: "vip",
      price: 500,
      purchaseDate: "2025-07-30",
      status: "valid",
      phoneNumber: "+966506789012",
      ticketNumber: "TKT-006-2025",
      qrCode: "QR-006-2025",
      labels: [
        {
          id: "label-5",
          name: "VIP",
          color: "#F59E0B",
          description: "Very Important Person",
          icon: "Crown",
        },
        {
          id: "label-6",
          name: "Front Row",
          color: "#10B981",
          description: "Front row seating",
          icon: "Star",
        },
      ],
    },
    {
      id: "7",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C007",
      customerName: "Karim Hassan",
      category: "regular",
      price: 300,
      purchaseDate: "2025-08-01",
      status: "used",
      checkInTime: "2025-09-01T09:15:00",
      phoneNumber: "+966507890123",
      ticketNumber: "TKT-007-2025",
      qrCode: "QR-007-2025",
      labels: [
        {
          id: "label-7",
          name: "Premium",
          color: "#8B5CF6",
          description: "Premium ticket",
          icon: "Award",
        },
      ],
    },
    {
      id: "8",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C008",
      customerName: "Layla Ahmed",
      category: "student",
      price: 100,
      purchaseDate: "2025-08-05",
      status: "valid",
      phoneNumber: "+966508901234",
      ticketNumber: "TKT-008-2025",
      qrCode: "QR-008-2025",
      labels: [
        {
          id: "label-8",
          name: "Student",
          color: "#06B6D4",
          description: "Student discount",
          icon: "Shield",
        },
      ],
    },
    {
      id: "9",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C009",
      customerName: "Hassan Ali",
      category: "earlyBird",
      price: 400,
      purchaseDate: "2025-08-10",
      status: "refunded",
      phoneNumber: "+966509012345",
      ticketNumber: "TKT-009-2025",
      qrCode: "QR-009-2025",
      labels: [],
    },
    {
      id: "10",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C010",
      customerName: "Nour Ibrahim",
      category: "general",
      price: 250,
      purchaseDate: "2025-08-12",
      status: "valid",
      phoneNumber: "+966500123456",
      ticketNumber: "TKT-010-2025",
      qrCode: "QR-010-2025",
      labels: [],
    },
    {
      id: "11",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C011",
      customerName: "Amira Mohamed",
      category: "vip",
      price: 300,
      purchaseDate: "2025-08-15",
      status: "banned",
      phoneNumber: "+966511234567",
      ticketNumber: "TKT-011-2025",
      qrCode: "QR-011-2025",
      labels: [],
    },
    {
      id: "12",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C012",
      customerName: "Omar Khalil",
      category: "regular",
      price: 250,
      purchaseDate: "2025-08-18",
      status: "used",
      checkInTime: "2025-08-15T20:15:00",
      phoneNumber: "+966522345678",
      ticketNumber: "TKT-012-2025",
      qrCode: "QR-012-2025",
      labels: [],
    },
    {
      id: "13",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C013",
      customerName: "Fatima Hassan",
      category: "student",
      price: 150,
      purchaseDate: "2025-08-20",
      status: "valid",
      phoneNumber: "+966533456789",
      ticketNumber: "TKT-013-2025",
      qrCode: "QR-013-2025",
      labels: [],
    },
    {
      id: "14",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C014",
      customerName: "Youssef Ali",
      category: "earlyBird",
      price: 120,
      purchaseDate: "2025-08-22",
      status: "valid",
      phoneNumber: "+966544567890",
      ticketNumber: "TKT-014-2025",
      qrCode: "QR-014-2025",
      labels: [
        {
          id: "label-12",
          name: "Early Bird",
          color: "#10B981",
          description: "Early bird discount",
          icon: "Star",
        },
      ],
    },
    {
      id: "15",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C015",
      customerName: "Sara Khalil",
      category: "general",
      price: 200,
      purchaseDate: "2025-08-25",
      status: "refunded",
      phoneNumber: "+966555678901",
      ticketNumber: "TKT-015-2025",
      qrCode: "QR-015-2025",
      labels: [],
    },
    {
      id: "16",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C016",
      customerName: "Ahmed Ibrahim",
      category: "vip",
      price: 400,
      purchaseDate: "2025-08-28",
      status: "valid",
      phoneNumber: "+966566789012",
      ticketNumber: "TKT-016-2025",
      qrCode: "QR-016-2025",
      labels: [
        {
          id: "label-13",
          name: "VIP",
          color: "#F59E0B",
          description: "Very Important Person",
          icon: "Crown",
        },
      ],
    },
    {
      id: "17",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C017",
      customerName: "Mariam Hassan",
      category: "regular",
      price: 180,
      purchaseDate: "2025-08-30",
      status: "used",
      checkInTime: "2025-09-10T19:30:00",
      phoneNumber: "+966577890123",
      ticketNumber: "TKT-017-2025",
      qrCode: "QR-017-2025",
      labels: [],
    },
    {
      id: "18",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C018",
      customerName: "Karim Mohamed",
      category: "student",
      price: 150,
      purchaseDate: "2025-09-01",
      status: "valid",
      phoneNumber: "+966588901234",
      ticketNumber: "TKT-018-2025",
      qrCode: "QR-018-2025",
      labels: [
        {
          id: "label-14",
          name: "Student",
          color: "#06B6D4",
          description: "Student discount",
          icon: "Shield",
        },
      ],
    },
    {
      id: "19",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C019",
      customerName: "Layla Ali",
      category: "earlyBird",
      price: 200,
      purchaseDate: "2025-09-03",
      status: "banned",
      phoneNumber: "+966599012345",
      ticketNumber: "TKT-019-2025",
      qrCode: "QR-019-2025",
      labels: [],
    },
    {
      id: "20",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C020",
      customerName: "Hassan Khalil",
      category: "general",
      price: 150,
      purchaseDate: "2025-09-05",
      status: "valid",
      phoneNumber: "+966500987654",
      ticketNumber: "TKT-020-2025",
      qrCode: "QR-020-2025",
      labels: [],
    },
    {
      id: "21",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C021",
      customerName: "Nour Ibrahim",
      category: "vip",
      price: 500,
      purchaseDate: "2025-09-08",
      status: "valid",
      phoneNumber: "+966511876543",
      ticketNumber: "TKT-021-2025",
      qrCode: "QR-021-2025",
      labels: [
        {
          id: "label-15",
          name: "VIP",
          color: "#F59E0B",
          description: "Very Important Person",
          icon: "Crown",
        },
      ],
    },
    {
      id: "22",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C022",
      customerName: "Amira Hassan",
      category: "regular",
      price: 300,
      purchaseDate: "2025-09-10",
      status: "used",
      checkInTime: "2025-09-01T10:45:00",
      phoneNumber: "+966522765432",
      ticketNumber: "TKT-022-2025",
      qrCode: "QR-022-2025",
      labels: [],
    },
    {
      id: "23",
      eventId: "3",
      eventTitle: t("admin.tickets.mock.standupComedyNight"),
      customerId: "C023",
      customerName: "Omar Khalil",
      category: "student",
      price: 100,
      purchaseDate: "2025-09-12",
      status: "valid",
      phoneNumber: "+966533654321",
      ticketNumber: "TKT-023-2025",
      qrCode: "QR-023-2025",
      labels: [
        {
          id: "label-16",
          name: "Student",
          color: "#06B6D4",
          description: "Student discount",
          icon: "Shield",
        },
      ],
    },
    {
      id: "24",
      eventId: "1",
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      customerId: "C024",
      customerName: "Fatima Ali",
      category: "earlyBird",
      price: 400,
      purchaseDate: "2025-09-15",
      status: "refunded",
      phoneNumber: "+966544543210",
      ticketNumber: "TKT-024-2025",
      qrCode: "QR-024-2025",
      labels: [],
    },
    {
      id: "25",
      eventId: "2",
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      customerId: "C025",
      customerName: "Youssef Mohamed",
      category: "general",
      price: 250,
      purchaseDate: "2025-09-18",
      status: "valid",
      phoneNumber: "+966555432109",
      ticketNumber: "TKT-025-2025",
      qrCode: "QR-025-2025",
      labels: [],
    },
  ];
  */

  // Mock check-in logs (TODO: Replace with API call)
  const checkInLogs: CheckInLog[] = [
    {
      id: "1",
      ticketId: "2",
      customerName: t("admin.tickets.mock.customer.sarahMohamed"),
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      checkInTime: "2025-08-15T18:30:00",
      scanResult: "success",
      location: t("admin.tickets.mock.location.mainGate"),
      usherName: t("admin.tickets.mock.usher.usher1"),
    },
    {
      id: "2",
      ticketId: "3",
      customerName: t("admin.tickets.mock.customer.omarAli"),
      eventTitle: t("admin.tickets.mock.techInnovatorsMeetup"),
      checkInTime: "2025-09-01T10:15:00",
      scanResult: "success",
      location: t("admin.tickets.mock.location.entranceA"),
      usherName: t("admin.tickets.mock.usher.usher2"),
    },
    {
      id: "3",
      ticketId: "1",
      customerName: t("admin.tickets.mock.customer.ahmedHassan"),
      eventTitle: t("admin.tickets.mock.summerMusicFestival"),
      checkInTime: "2025-08-15T19:45:00",
      scanResult: "already_used",
      location: t("admin.tickets.mock.location.mainGate"),
      usherName: t("admin.tickets.mock.usher.usher1"),
    },
  ];

  // Filtered tickets (API handles filtering, but we filter categories client-side)
  const filteredTickets = useMemo(() => {
    let filtered = tickets;
    
    // Client-side category filter (if backend doesn't support it)
    if (categoryFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.category === categoryFilter);
    }
    
    return filtered;
  }, [tickets, categoryFilter]);

  // Get unique values for filters from API data
  const uniqueEvents = useMemo(() => {
    if (!ticketsData?.results) return [];
    const eventMap = new Map();
    ticketsData.results.forEach((ticket: any) => {
      const eventId = ticket.event?.id || '';
      const eventTitle = ticket.event_title || ticket.event?.title || '';
      if (eventId && !eventMap.has(eventId)) {
        eventMap.set(eventId, { id: eventId, title: eventTitle });
      }
    });
    return Array.from(eventMap.values());
  }, [ticketsData]);

  const uniqueCategories = useMemo(() => {
    if (!ticketsData?.results) return [];
    return [...new Set(ticketsData.results.map((ticket: any) => ticket.category))] as string[];
  }, [ticketsData]);

  const uniqueDates = useMemo(() => {
    if (!ticketsData?.results) return [];
    return [
      ...new Set(
        ticketsData.results
          .map((ticket: any) => ticket.purchase_date?.substring(0, 7))
          .filter(Boolean)
      ),
    ] as string[];
  }, [ticketsData]);

  // Pagination from API response
  const totalPages = ticketsData?.total_pages || 1;
  const startIndex = ticketsData?.page ? (ticketsData.page - 1) * ticketsData.page_size : 0;
  const endIndex = startIndex + (ticketsData?.page_size || itemsPerPage);
  const paginatedTickets = filteredTickets;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, eventFilter, categoryFilter, statusFilter, dateFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "valid":
        return "bg-green-100 text-green-800";
      case "used":
        return "bg-blue-100 text-blue-800";
      case "refunded":
        return "bg-yellow-100 text-yellow-800";
      case "banned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "valid":
        return t("admin.tickets.status.valid");
      case "used":
        return t("admin.tickets.status.used");
      case "refunded":
        return t("admin.tickets.status.refunded");
      case "banned":
        return t("admin.tickets.status.banned");
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("admin.tickets.paymentStatus.completed");
      case "pending":
        return t("admin.tickets.paymentStatus.pending");
      case "processing":
        return t("admin.tickets.paymentStatus.processing");
      case "failed":
        return t("admin.tickets.paymentStatus.failed");
      case "refunded":
        return t("admin.tickets.paymentStatus.refunded");
      default:
        return status || t("common.notAvailable") || "N/A";
    }
  };

  const getScanResultColor = (result: string) => {
    switch (result) {
      case "success":
        return "bg-green-100 text-green-800";
      case "already_used":
        return "bg-yellow-100 text-yellow-800";
      case "invalid":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getScanResultText = (result: string) => {
    switch (result) {
      case "success":
        return t("admin.tickets.scanResults.success");
      case "already_used":
        return t("admin.tickets.scanResults.alreadyUsed");
      case "invalid":
        return t("admin.tickets.scanResults.invalid");
      case "expired":
        return t("admin.tickets.scanResults.expired");
      default:
        return result;
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsViewDialogOpen(true);
  };

  const handleEditTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setEditingTicket({
      category: ticket.category,
      price: ticket.price,
      status: ticket.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveTicketChanges = () => {
    if (!selectedTicket) return;
    
    // Validate required fields
    if (!editingTicket.category || !editingTicket.price) {
      toast({
        title: t("common.error"),
        description: t("admin.tickets.toast.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    // Prepare data for API
    const updateData: any = {
      category: editingTicket.category,
      price: Number(editingTicket.price),
    };

    // Only update status if it changed
    if (editingTicket.status && editingTicket.status !== selectedTicket.status) {
      updateData.status = editingTicket.status;
    }
    
    updateTicketMutation.mutate({ id: selectedTicket.id, data: updateData });
  };

  // Update ticket status mutation
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await ticketsApi.updateTicketStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: t("admin.tickets.toast.ticketUpdated"),
        description: t("admin.tickets.toast.ticketUpdatedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("admin.tickets.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: { event_id: string; customer_id: string; category: string; price: number; paid_outside_system?: boolean }) => {
      return await ticketsApi.createTicket(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: t("admin.tickets.toast.ticketAssigned"),
        description: t("admin.tickets.toast.ticketAssignedDesc"),
      });
      setIsAssignDialogOpen(false);
      // Reset form
      setSelectedEventId("");
      setSelectedCategory("");
      setAssignPhoneNumber("");
      setAssignPhoneDialCode(DEFAULT_DIAL_CODE);
      setAssignPrice(0);
      setPaidOutsideSystem(false);
      setEventSearchValue("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("admin.tickets.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      return await ticketsApi.deleteTicket(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: t("admin.tickets.toast.ticketDeleted"),
        description: t("admin.tickets.toast.ticketDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setTicketToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("admin.tickets.toast.error"),
        variant: "destructive",
      });
    },
  });

  const confirmDeleteTicket = () => {
    if (ticketToDelete) {
      deleteTicketMutation.mutate(ticketToDelete.id);
    }
  };

  const handleBanTicket = (ticketId: string) => {
    updateTicketStatusMutation.mutate({ id: ticketId, status: 'banned' });
  };

  const handleRefundTicket = (ticketId: string) => {
    updateTicketStatusMutation.mutate({ id: ticketId, status: 'refunded' });
  };

  const handleAssignTicket = () => {
    setIsAssignDialogOpen(true);
    // Reset form
    setSelectedEventId("");
    setSelectedCategory("");
    setAssignPhoneNumber("");
    setAssignPhoneDialCode(DEFAULT_DIAL_CODE);
    setAssignPrice(0);
    setPaidOutsideSystem(false);
    setEventSearchValue("");
  };

  const handleViewEventTickets = (eventId: string) => {
    setSelectedEventForTickets(eventId);
    setViewMode("tickets");
    setEventFilter(eventId);
    setCurrentPage(1);
  };

  const handleBackToEvents = () => {
    setViewMode("events");
    setSelectedEventForTickets(null);
    setEventFilter("all");
    setCurrentPage(1);
  };

  const handleUnbanTicket = (ticketId: string) => {
    updateTicketStatusMutation.mutate({ id: ticketId, status: 'valid' });
  };

  const handleAssignTicketAction = async () => {
    // Validate required fields
    // Category is only required if event has ticket categories
    const categoryRequired = eventTicketCategories.length > 0;
    
    // Normalize phone number: remove leading 0 for Egyptian numbers when country code is +20
    let normalizedPhoneNumber = assignPhoneNumber;
    if (assignPhoneDialCode === "+20" && normalizedPhoneNumber.startsWith("0") && normalizedPhoneNumber.length === 11) {
      normalizedPhoneNumber = normalizedPhoneNumber.substring(1);
    }
    const fullPhoneNumber = assignPhoneDialCode + normalizedPhoneNumber;
    
    if (!selectedEventId || (categoryRequired && !selectedCategory) || !assignPhoneNumber || (!paidOutsideSystem && !assignPrice)) {
      toast({
        title: t("common.error"),
        description: t("admin.tickets.toast.requiredFields") || "All required fields must be filled",
        variant: "destructive",
      });
      return;
    }

    // Find customer by phone number (try with and without dial code)
    try {
      const { customersApi } = await import("@/lib/api/adminApi");
      // Search with both original and normalized phone numbers
      const customersResponse = await customersApi.getCustomers({
        search: normalizedPhoneNumber || assignPhoneNumber,
        page_size: 10,
      });
      
      const customers = customersResponse?.results || [];
      // Try to find customer with full phone number or just the number
      let customer = customers.find(
        (c: any) => {
          const cPhone = c.phone || c.mobile_number || '';
          return cPhone === fullPhoneNumber || cPhone === normalizedPhoneNumber || cPhone === assignPhoneNumber || 
                 cPhone.endsWith(normalizedPhoneNumber) || cPhone.endsWith(assignPhoneNumber) || 
                 normalizedPhoneNumber.endsWith(cPhone.replace(/^\+/, '')) || assignPhoneNumber.endsWith(cPhone.replace(/^\+/, ''));
        }
      );

      if (!customer) {
        toast({
          title: t("common.error"),
          description: t("admin.tickets.toast.customerNotFound") || "Customer not found with this phone number",
          variant: "destructive",
        });
        return;
      }

      // Determine category name - if from ticket categories, use the category name
      let categoryName = selectedCategory;
      if (eventTicketCategories.length > 0) {
        const category = eventTicketCategories.find((cat: any) => 
          cat.id?.toString() === selectedCategory || cat.name === selectedCategory
        );
        if (category) {
          categoryName = category.name;
        }
      }

      // Create ticket
      createTicketMutation.mutate({
        event_id: selectedEventId,
        customer_id: customer.id.toString(),
        category: categoryName,
        price: paidOutsideSystem ? 0 : assignPrice,
        paid_outside_system: paidOutsideSystem,
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.tickets.toast.error"),
        variant: "destructive",
      });
    }
  };

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await ticketsApi.updateTicket(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: t("admin.tickets.toast.ticketUpdated"),
        description: t("admin.tickets.toast.ticketUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.tickets.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Label management functions
  const handleManageLabels = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedLabels(ticket.labels);
    setShowManageLabelsDialog(true);
  };

  const handleAddLabel = () => {
    if (!newLabel.name.trim()) {
      toast({
        title: t("admin.tickets.labels.error.nameRequired"),
        description: t("admin.tickets.labels.error.nameRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    const label: TicketLabel = {
      id: `label-${Date.now()}`,
      name: newLabel.name,
      color: newLabel.color,
      description: newLabel.description,
      icon: newLabel.icon,
    };

    if (selectedTicket) {
      const updatedTicket = {
        ...selectedTicket,
        labels: [...selectedTicket.labels, label],
      };
      setSelectedTicket(updatedTicket);
      setSelectedLabels(updatedTicket.labels);
    }

    setNewLabel({
      name: "",
      color: "#3B82F6",
      description: "",
      icon: "Tag",
    });

    toast({
      title: t("admin.tickets.labels.toast.labelAdded"),
      description: t("admin.tickets.labels.toast.labelAddedDesc"),
    });
  };

  const handleRemoveLabel = (labelId: string) => {
    if (selectedTicket) {
      const updatedTicket = {
        ...selectedTicket,
        labels: selectedTicket.labels.filter((label) => label.id !== labelId),
      };
      setSelectedTicket(updatedTicket);
      setSelectedLabels(updatedTicket.labels);
    }

    toast({
      title: t("admin.tickets.labels.toast.labelRemoved"),
      description: t("admin.tickets.labels.toast.labelRemovedDesc"),
    });
  };

  const handleSaveLabels = () => {
    if (selectedTicket) {
      toast({
        title: t("admin.tickets.labels.toast.labelsSaved"),
        description: t("admin.tickets.labels.toast.labelsSavedDesc"),
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
          <div className="flex items-center gap-2">
            {viewMode === "tickets" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToEvents}
                className="rtl:ml-2 ltr:mr-2"
              >
                ← {t("admin.tickets.backToEvents") || "Back to Events"}
              </Button>
            )}
            <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
              {viewMode === "events" 
                ? (t("admin.tickets.events.title") || "Events")
                : (t("admin.tickets.title") || "Tickets Management")}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {viewMode === "events"
              ? (t("admin.tickets.events.subtitle") || "Select an event to view its tickets")
              : (t("admin.tickets.subtitle") || "Manage tickets, check-in logs, and ticket operations")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {viewMode === "tickets" && (
            <>
              <ExportDialog
                data={filteredTickets}
                columns={commonColumns.tickets}
                title={t("admin.tickets.title")}
                subtitle={t("admin.tickets.subtitle")}
                filename="tickets"
                filters={{
                  search: searchTerm,
                  event: eventFilter,
                  category: categoryFilter,
                  status: statusFilter,
                  date: dateFilter,
                }}
                onExport={() => {
                  toast({
                    title: t("admin.tickets.toast.exportSuccess"),
                    description: t("admin.tickets.toast.exportSuccessDesc"),
                  });
                }}
              >
                <Button variant="outline" className="text-xs sm:text-sm">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
                  <span className="hidden sm:inline">
                    {t("admin.tickets.actions.export")}
                  </span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </ExportDialog>
              <Button onClick={handleAssignTicket} className="text-xs sm:text-sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
                <span className="hidden sm:inline">
                  {t("admin.tickets.actions.assignTicket")}
                </span>
                <span className="sm:hidden">Assign</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Events View */}
      {viewMode === "events" && (
        <Card>
          <CardHeader>
            <CardTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.events.title") || "Events"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsData?.results && eventsData.results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eventsData.results.map((event: any) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleViewEventTickets(event.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg rtl:text-right ltr:text-left">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="rtl:text-right ltr:text-left">
                        {event.date && format(parseISO(event.date), "MMM dd, yyyy", {
                          locale: i18n.language === "ar" ? ar : undefined,
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t("admin.tickets.events.ticketsSold") || "Tickets Sold"}: {event.tickets_sold || 0}
                        </span>
                        <Button variant="outline" size="sm">
                          {t("admin.tickets.events.viewTickets") || "View Tickets"} →
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("admin.tickets.events.noEvents") || "No events found"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tickets View */}
      {viewMode === "tickets" && (
        <>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.tickets.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.tickets.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between rtl:text-right ltr:text-left"
                >
                  {eventFilter === "all" ? (
                    <span>{t("admin.tickets.filters.event")}</span>
                  ) : (
                    <span className="truncate">
                      {
                        uniqueEvents.find((event) => event.id === eventFilter)
                          ?.title
                      }
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 rtl:text-right ltr:text-left">
                <Command
                  value={eventSearchValue}
                  onValueChange={setEventSearchValue}
                >
                  <CommandInput
                    placeholder={t("admin.tickets.filters.searchEvent")}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {t("admin.tickets.filters.noEventsFound")}
                    </CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => setEventFilter("all")}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t("admin.tickets.filters.allEvents")}
                      </CommandItem>
                      {uniqueEvents.map((event) => (
                        <CommandItem
                          key={event.id}
                          value={event.id}
                          onSelect={() => {
                            setEventFilter(event.id);
                            setCurrentPage(1); // Reset pagination when event changes
                          }}
                        >
                          <CheckCircle
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              eventFilter === event.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <span className="truncate">{event.title}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.tickets.filters.category")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.tickets.filters.allCategories")}
                </SelectItem>
                {uniqueCategories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {t(`admin.tickets.categories.${category?.toLowerCase().replace(/\s+/g, '') || 'regular'}`) || category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.tickets.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.tickets.filters.allStatus")}
                </SelectItem>
                <SelectItem value="valid">
                  {t("admin.tickets.status.valid")}
                </SelectItem>
                <SelectItem value="used">
                  {t("admin.tickets.status.used")}
                </SelectItem>
                <SelectItem value="refunded">
                  {t("admin.tickets.status.refunded")}
                </SelectItem>
                <SelectItem value="banned">
                  {t("admin.tickets.status.banned")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.tickets.filters.purchaseDate")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.tickets.filters.allDates")}
                </SelectItem>
                {uniqueDates.map((date: string) => (
                  <SelectItem key={date} value={date}>
                    {format(parseISO(date + "-01"), "MMMM yyyy", {
                      locale: i18n.language === "ar" ? ar : undefined,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.tickets.table.ticket")} ({filteredTickets.length})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.tickets.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredTickets.length)}{" "}
              {t("admin.tickets.pagination.of")} {filteredTickets.length}
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
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : ticketsError ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-500">
                {t("common.error")}: {ticketsError instanceof Error ? ticketsError.message : t("admin.tickets.toast.error")}
              </span>
            </div>
          ) : paginatedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("admin.tickets.noTicketsFound")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full rtl:text-right ltr:text-left">
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.ticket")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.customer")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.event")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.category")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.purchaseDate")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.status")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.paymentStatus")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.price")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.labels")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{ticket.ticketNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{ticket.customerName || t("common.notAvailable") || "N/A"}</p>
                        {ticket.customerId && (
                          <p className="text-sm text-muted-foreground">
                            {t("admin.tickets.table.id")}: {ticket.customerId}
                          </p>
                        )}
                        {ticket.phoneNumber ? (
                          <p className="text-sm text-muted-foreground">
                            {t("admin.tickets.table.phoneNumber")}: {ticket.phoneNumber}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            {t("admin.tickets.table.phoneNumber")}: {t("common.notAvailable")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm rtl:text-right">
                        {ticket.eventTitle}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`admin.tickets.categories.${ticket.category?.toLowerCase().replace(/\s+/g, '') || 'regular'}`) || ticket.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm rtl:text-right">
                        {format(parseISO(ticket.purchaseDate), "MMM dd, yyyy", {
                          locale: i18n.language === "ar" ? ar : undefined,
                        })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusText(ticket.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.paymentStatus ? (
                        <Badge className={getPaymentStatusColor(ticket.paymentStatus)}>
                          {getPaymentStatusText(ticket.paymentStatus)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          {t("admin.tickets.table.noPayment")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium rtl:text-right">
                        {formatCurrencyForLocale(ticket.price, i18n.language)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {ticket.labels.map((label) => {
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
                        {ticket.labels.length === 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t("admin.tickets.table.noLabels")}
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
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {t("admin.tickets.table.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewTicket(ticket)}
                          >
                            <Eye className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.tickets.actions.viewTicket") || "View Ticket"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditTicket(ticket)}
                          >
                            <Edit className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.tickets.actions.editTicket")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setTicketToDelete(ticket);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.tickets.actions.deleteTicket") || "Delete Ticket"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!ticketsLoading && !ticketsError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.tickets.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, ticketsData?.count || 0)} ${t(
                "admin.tickets.pagination.of"
              )} ${ticketsData?.count || 0} ${t(
                "admin.tickets.pagination.results"
              )}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={ticketsData?.count || 0}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Check-in Logs */}
      {false && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse rtl:text-right ltr:text-left">
              <Clock className="h-5 w-5" />
              {t("admin.tickets.checkInLogs.title")}
            </CardTitle>
            <CardDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.checkInLogs.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="w-full rtl:text-right ltr:text-left">
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.checkInLogs.customer")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.checkInLogs.event")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.checkInLogs.checkInTime")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.checkInLogs.scanResult")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.checkInLogs.location")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.tickets.checkInLogs.usher")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkInLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <p className="font-medium rtl:text-right">
                          {log.customerName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right">
                          {log.eventTitle}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right">
                          {format(
                            parseISO(log.checkInTime),
                            "MMM dd, yyyy HH:mm",
                            {
                              locale: i18n.language === "ar" ? ar : undefined,
                            }
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={getScanResultColor(log.scanResult)}>
                          {getScanResultText(log.scanResult)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right">{log.location}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm rtl:text-right">
                          {log.usherName}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Ticket Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.editTicket")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.editTicketSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.form.ticketNumber")}
                  </label>
                  <Input value={selectedTicket.ticketNumber} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.form.category")} *
                  </label>
                  <Select 
                    value={editingTicket.category || selectedTicket.category || ""}
                    onValueChange={(value) => setEditingTicket({ ...editingTicket, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">
                        {t("admin.tickets.categories.vip")}
                      </SelectItem>
                      <SelectItem value="regular">
                        {t("admin.tickets.categories.regular")}
                      </SelectItem>
                      <SelectItem value="student">
                        {t("admin.tickets.categories.student")}
                      </SelectItem>
                      <SelectItem value="earlyBird">
                        {t("admin.tickets.categories.earlyBird")}
                      </SelectItem>
                      <SelectItem value="general">
                        {t("admin.tickets.categories.general")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.form.price")} *
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    value={editingTicket.price || selectedTicket.price || ""}
                    onChange={(e) => setEditingTicket({ ...editingTicket, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.form.status")}
                  </label>
                  <Select 
                    value={editingTicket.status || selectedTicket.status || "valid"}
                    onValueChange={(value: "valid" | "used" | "refunded" | "banned") => 
                      setEditingTicket({ ...editingTicket, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valid">
                        {t("admin.tickets.status.valid")}
                      </SelectItem>
                      <SelectItem value="used">
                        {t("admin.tickets.status.used")}
                      </SelectItem>
                      <SelectItem value="refunded">
                        {t("admin.tickets.status.refunded")}
                      </SelectItem>
                      <SelectItem value="banned">
                        {t("admin.tickets.status.banned")}
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
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingTicket({});
                setSelectedTicket(null);
              }}
            >
              {t("admin.tickets.dialogs.cancel")}
            </Button>
            <Button 
              onClick={handleSaveTicketChanges}
              disabled={updateTicketMutation.isPending}
            >
              {updateTicketMutation.isPending 
                ? t("common.loading") 
                : t("admin.tickets.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Ticket Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.viewTicket") || "View Ticket Details"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.viewTicketSubtitle") || "View complete ticket information"}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.form.ticketNumber")}
                  </p>
                  <p className="text-lg font-semibold">{selectedTicket.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.form.status")}
                  </p>
                  <Badge className={getStatusColor(selectedTicket.status)}>
                    {getStatusText(selectedTicket.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.table.customer")}
                  </p>
                  <p className="font-medium">{selectedTicket.customerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("admin.tickets.table.id")}: {selectedTicket.customerId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.table.phoneNumber")}
                  </p>
                  <p>{selectedTicket.phoneNumber || t("common.notAvailable")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.table.event")}
                  </p>
                  <p className="font-medium">{selectedTicket.eventTitle}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.form.category")}
                  </p>
                  <p>{t(`admin.tickets.categories.${selectedTicket.category?.toLowerCase().replace(/\s+/g, '') || 'regular'}`) || selectedTicket.category}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.table.purchaseDate")}
                  </p>
                  <p>
                    {format(
                      parseISO(selectedTicket.purchaseDate),
                      "MMM dd, yyyy",
                      {
                        locale: i18n.language === "ar" ? ar : undefined,
                      }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("admin.tickets.form.price")}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyForLocale(selectedTicket.price, i18n.language)}
                  </p>
                </div>
                {selectedTicket.checkInTime && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.tickets.checkInLogs.checkInTime")}
                    </p>
                    <p>
                      {format(
                        parseISO(selectedTicket.checkInTime),
                        "MMM dd, yyyy HH:mm",
                        {
                          locale: i18n.language === "ar" ? ar : undefined,
                        }
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewDialogOpen(false)}
            >
              {t("admin.tickets.dialogs.close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Ticket Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.assignTicket")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.assignTicketSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.form.event")}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between rtl:text-right ltr:text-left"
                    >
                      {selectedEventId ? (
                        <span className="truncate">
                          {
                            availableEvents.find(
                              (event: { id: string; title: string }) => event.id === selectedEventId
                            )?.title
                          }
                        </span>
                      ) : (
                        <span>{t("admin.tickets.form.selectEvent")}</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 rtl:text-right ltr:text-left">
                    <Command
                      value={eventSearchValue}
                      onValueChange={setEventSearchValue}
                    >
                      <CommandInput
                        placeholder={t("admin.tickets.form.searchEvent")}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {t("admin.tickets.form.noEventsFound")}
                        </CommandEmpty>
                        <CommandGroup>
                          {availableEvents.map((event: { id: string; title: string }) => (
                            <CommandItem
                              key={event.id}
                              value={`${event.id} ${event.title}`}
                              onSelect={async () => {
                                setSelectedEventId(event.id);
                                setEventSearchValue("");
                                setSelectedCategory("");
                                setAssignPrice(0);
                                
                                // Fetch event details to get ticket categories and starting price
                                try {
                                  const eventDetails = await eventsApi.getEvent(event.id);
                                  setSelectedEventDetails(eventDetails);
                                  
                                  // Get ticket categories if available
                                  const categories = eventDetails.ticket_categories || eventDetails.ticketCategories || [];
                                  setEventTicketCategories(categories);
                                  
                                  // If event has categories, don't auto-fill price (wait for category selection)
                                  // If no categories, auto-fill with starting price
                                  if (categories.length === 0) {
                                    if (eventDetails.starting_price) {
                                      setAssignPrice(parseFloat(eventDetails.starting_price) || 0);
                                    } else if (eventDetails.price) {
                                      setAssignPrice(parseFloat(eventDetails.price) || 0);
                                    }
                                  }
                                } catch (error: any) {
                                  console.error("Error fetching event details:", error);
                                  toast({
                                    title: t("common.error"),
                                    description: error.response?.data?.error?.message || error.message || t("admin.tickets.toast.eventDetailsError"),
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <CheckCircle
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  selectedEventId === event.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="truncate">{event.title}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.form.category")} {eventTicketCategories.length > 0 ? "*" : ""}
                </label>
                <Select
                  value={selectedCategory || undefined}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    // If ticket categories exist, find the selected category and auto-fill its price
                    if (eventTicketCategories.length > 0) {
                      const category = eventTicketCategories.find((cat: any) => 
                        cat.id?.toString() === value || cat.name === value
                      );
                      if (category && category.price) {
                        setAssignPrice(parseFloat(category.price) || 0);
                      }
                    }
                  }}
                  disabled={!selectedEventId || (eventTicketCategories.length === 0 && selectedEventId)}
                >
                  <SelectTrigger className={eventTicketCategories.length === 0 && selectedEventId ? "opacity-60" : ""}>
                    <SelectValue
                      placeholder={selectedEventId 
                        ? (eventTicketCategories.length > 0 
                            ? t("admin.tickets.form.selectCategory") 
                            : t("admin.tickets.form.selectCategoryOptional"))
                        : t("admin.tickets.form.selectEventFirst")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTicketCategories.length > 0 ? (
                      eventTicketCategories.map((category: any) => {
                        const categoryValue = category.id?.toString() || category.name || `category-${category.id || Math.random()}`;
                        return (
                          <SelectItem 
                            key={category.id || category.name || categoryValue} 
                            value={categoryValue}
                          >
                            {category.name} - {formatCurrencyForLocale(parseFloat(category.price) || 0, i18n.language)}
                          </SelectItem>
                        );
                      })
                    ) : selectedEventId ? (
                      <SelectItem value="none" disabled>
                        {t("admin.tickets.form.noCategoriesAvailable")}
                      </SelectItem>
                    ) : (
                      <SelectItem value="none" disabled>
                        {t("admin.tickets.form.selectEventFirst")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {eventTicketCategories.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.tickets.form.selectCategoryToAutoFill")}
                  </p>
                )}
                {eventTicketCategories.length === 0 && selectedEventId && (
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.tickets.form.categoryNotAvailable")}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.form.phoneNumber")}
                </label>
                <div className="flex gap-2">
                  <Select
                    value={assignPhoneDialCode}
                    onValueChange={setAssignPhoneDialCode}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_DIAL_CODES.map((country: CountryDialCode) => (
                        <SelectItem key={country.code} value={country.dial_code}>
                          {country.name} ({country.dial_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    placeholder={t("admin.tickets.form.phonePlaceholder")}
                    value={assignPhoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setAssignPhoneNumber(value);
                    }}
                    dir="ltr"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right flex items-center gap-2">
                  <Switch
                    checked={paidOutsideSystem}
                    onCheckedChange={(checked) => {
                      setPaidOutsideSystem(checked);
                      if (checked) {
                        setAssignPrice(0);
                      }
                    }}
                  />
                  <span>{t("admin.tickets.form.paidOutsideSystem") || "Paid Outside System"}</span>
                </label>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.form.price")} {!paidOutsideSystem ? "*" : ""}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t("admin.tickets.form.pricePlaceholder")}
                  value={assignPrice || ""}
                  onChange={(e) => setAssignPrice(parseFloat(e.target.value) || 0)}
                  disabled={paidOutsideSystem || (eventTicketCategories.length > 0 && selectedCategory !== "" && selectedCategory !== undefined)}
                />
                {eventTicketCategories.length > 0 && selectedCategory && !paidOutsideSystem && (
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.tickets.form.priceAutoFilled")}
                  </p>
                )}
                {eventTicketCategories.length === 0 && selectedEventId && selectedEventDetails && !paidOutsideSystem && (
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.tickets.form.priceFromEvent")}
                  </p>
                )}
                {paidOutsideSystem && (
                  <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                    {t("admin.tickets.form.priceDisabledOutsideSystem") || "Price disabled - paid outside system"}
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedEventId("");
                setSelectedCategory("");
                setAssignPhoneNumber("");
                setAssignPhoneDialCode(DEFAULT_DIAL_CODE);
                setAssignPrice(0);
                setPaidOutsideSystem(false);
                setEventSearchValue("");
                setSelectedEventDetails(null);
                setEventTicketCategories([]);
              }}
            >
              {t("admin.tickets.dialogs.cancel")}
            </Button>
            <Button 
              onClick={handleAssignTicketAction}
              disabled={createTicketMutation.isPending}
            >
              {createTicketMutation.isPending 
                ? t("common.loading") 
                : t("admin.tickets.dialogs.assignTicketButton")}
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
              {t("admin.tickets.labels.manageLabels")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedTicket &&
                `${t("admin.tickets.labels.manageLabelsFor")} ${
                  selectedTicket.ticketNumber
                }`}
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6 flex-1 overflow-y-auto">
              {/* Current Labels */}
              <div>
                <h4 className="text-sm font-medium mb-3 rtl:text-right ltr:text-left">
                  {t("admin.tickets.labels.currentLabels")}
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
                      <p>{t("admin.tickets.labels.noLabels")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Label */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-medium mb-4 rtl:text-right ltr:text-left">
                  {t("admin.tickets.labels.addNewLabel")}
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.tickets.labels.labelName")}
                      </label>
                      <Input
                        value={newLabel.name}
                        onChange={(e) =>
                          setNewLabel({ ...newLabel, name: e.target.value })
                        }
                        placeholder={t(
                          "admin.tickets.labels.labelNamePlaceholder"
                        )}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.tickets.labels.labelColor")}
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
                      {t("admin.tickets.labels.labelIcon")}
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
                      {t("admin.tickets.labels.labelDescription")}
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
                        "admin.tickets.labels.labelDescriptionPlaceholder"
                      )}
                      className="mt-1"
                    />
                  </div>

                  <Button onClick={handleAddLabel} className="w-full">
                    <Plus className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {t("admin.tickets.labels.addLabel")}
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
              {t("admin.tickets.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveLabels}>
              {t("admin.tickets.labels.saveLabels")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.deleteTicket") || "Delete Ticket"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.dialogs.deleteTicketConfirm") || "Are you sure you want to delete this ticket? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {ticketToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.tickets.table.ticketNumber")}:</strong> {ticketToDelete.ticketNumber}
              </p>
              {ticketToDelete.eventTitle && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.tickets.table.event")}:</strong> {ticketToDelete.eventTitle}
                </p>
              )}
              {ticketToDelete.customerName && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.tickets.table.customer")}:</strong> {ticketToDelete.customerName}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setTicketToDelete(null);
              }}
            >
              {t("admin.tickets.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTicket}
              disabled={deleteTicketMutation.isPending}
            >
              {deleteTicketMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.tickets.actions.deleteTicket") || "Delete Ticket"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketsManagement;
