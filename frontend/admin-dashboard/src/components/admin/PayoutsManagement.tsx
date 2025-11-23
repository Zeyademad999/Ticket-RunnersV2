import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financesApi, usersApi } from "@/lib/api/adminApi";
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
import { Separator } from "@/components/ui/separator";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsivePagination } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/lib/utils";
import i18n from "@/lib/i18n";
import { formatCurrencyForLocale, formatNumberForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns, formatCurrency } from "@/lib/exportUtils";
import {
  DollarSign,
  Calendar,
  Users,
  Download,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Banknote,
  CreditCard,
  Wallet,
  RefreshCw,
} from "lucide-react";

// Types
interface Organizer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  totalEvents: number;
  totalRevenue: number;
  pendingPayout: number;
  completedPayouts: number;
  lastPayoutDate?: string;
  bankInfo?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    swiftCode?: string;
  };
}

interface Payout {
  id: string;
  organizerId: string;
  organizerName: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  method: "bank_transfer" | "paypal" | "stripe";
  reference: string;
  createdAt: string;
  processedAt?: string;
  notes?: string;
  dueAmount: number;
  eventsIncluded: string[];
}

const PayoutsManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrganizer, setSelectedOrganizer] = useState<string>("");
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [isCreatePayoutOpen, setIsCreatePayoutOpen] = useState(false);
  const [isViewPayoutOpen, setIsViewPayoutOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    organizer: "all",
    dateRange: "all",
  });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch payouts from API
  const { data: payoutsData, isLoading: payoutsLoading, error: payoutsError } = useQuery({
    queryKey: ['payouts', filters.status, filters.organizer, dateFrom, dateTo, currentPage, itemsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: itemsPerPage,
      };
      
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.organizer !== 'all') params.organizer = filters.organizer;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      return await financesApi.getPayouts(params);
    },
  });

  // Fetch organizers for filter dropdown
  const { data: organizersData, isLoading: organizersLoading } = useQuery({
    queryKey: ['organizers', 'all'],
    queryFn: () => usersApi.getOrganizers({ page_size: 1000 }),
  });

  // Transform API payouts to match Payout interface
  const payouts: Payout[] = useMemo(() => {
    if (!payoutsData?.results) return [];
    return payoutsData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      organizerId: item.organizer?.id?.toString() || item.organizer_id?.toString() || item.organizer?.toString() || '',
      organizerName: item.organizer_name || item.organizer?.name || '',
      amount: parseFloat(item.amount) || 0,
      status: (item.status || 'pending') as "pending" | "processing" | "completed" | "failed",
      method: (item.method || item.payment_method || 'bank_transfer') as "bank_transfer" | "paypal" | "stripe",
      reference: item.reference || item.reference_number || '',
      createdAt: item.created_at || item.createdAt || '',
      processedAt: item.processed_at || item.processedAt || undefined,
      notes: item.notes || undefined,
      dueAmount: parseFloat(item.due_amount || item.amount) || 0,
      eventsIncluded: item.events_included || item.events || [],
    }));
  }, [payoutsData]);

  // Transform API organizers to match Organizer interface
  const organizers: Organizer[] = useMemo(() => {
    if (!organizersData) return [];
    // Handle both paginated and non-paginated responses
    const results = organizersData.results || organizersData;
    if (!Array.isArray(results)) return [];
    
    return results
      .filter((item: any) => item && item.id) // Filter out invalid items
      .map((item: any) => ({
        id: item.id?.toString() || '',
        name: item.name || item.organization_name || item.user?.username || item.user?.name || 'Unnamed Organizer',
        email: item.email || item.contact_email || item.user?.email || '',
        phone: item.phone || item.contact_mobile || item.user?.phone || '',
        status: (item.status || (item.user?.is_active ? 'active' : 'inactive')) as "active" | "inactive",
        totalEvents: item.total_events || 0,
        totalRevenue: parseFloat(item.total_revenue || item.total_revenue_amount || 0) || 0,
        pendingPayout: parseFloat(item.pending_payout || item.pending_payout_amount || 0) || 0,
        completedPayouts: parseFloat(item.completed_payouts || item.completed_payouts_amount || 0) || 0,
        lastPayoutDate: item.last_payout_date || undefined,
        bankInfo: item.bank_info ? {
          accountName: item.bank_info.account_name || '',
          accountNumber: item.bank_info.account_number || '',
          bankName: item.bank_info.bank_name || '',
          swiftCode: item.bank_info.swift_code || undefined,
        } : undefined,
      }));
  }, [organizersData]);

  // Mock data (removed - using API now)
  /*
  useEffect(() => {
    const mockOrganizers: Organizer[] = [
      {
        id: "org1",
        name: "Music Events Co.",
        email: "contact@musicevents.com",
        phone: "+20 122 123 4567",
        status: "active",
        totalEvents: 15,
        totalRevenue: 450000,
        pendingPayout: 67500,
        completedPayouts: 382500,
        lastPayoutDate: "2024-01-15",
        bankInfo: {
          accountName: "Music Events Co.",
          accountNumber: "1234567890",
          bankName: "Commercial International Bank",
          swiftCode: "CIBEEGCX",
        },
      },
      {
        id: "org2",
        name: "Tech Conference Ltd.",
        email: "info@techconf.com",
        phone: "+20 122 234 5678",
        status: "active",
        totalEvents: 8,
        totalRevenue: 320000,
        pendingPayout: 48000,
        completedPayouts: 272000,
        lastPayoutDate: "2024-01-10",
        bankInfo: {
          accountName: "Tech Conference Ltd.",
          accountNumber: "0987654321",
          bankName: "Banque Misr",
          swiftCode: "BMISEGCX",
        },
      },
      {
        id: "org3",
        name: "Art Gallery Events",
        email: "events@artgallery.com",
        phone: "+20 122 345 6789",
        status: "active",
        totalEvents: 12,
        totalRevenue: 280000,
        pendingPayout: 42000,
        completedPayouts: 238000,
        lastPayoutDate: "2024-01-12",
        bankInfo: {
          accountName: "Art Gallery Events",
          accountNumber: "1122334455",
          bankName: "National Bank of Egypt",
          swiftCode: "NBEGEGCX",
        },
      },
      {
        id: "org4",
        name: "Sports Events International",
        email: "info@sportsevents.com",
        phone: "+20 122 456 7890",
        status: "active",
        totalEvents: 20,
        totalRevenue: 680000,
        pendingPayout: 102000,
        completedPayouts: 578000,
        lastPayoutDate: "2024-01-18",
        bankInfo: {
          accountName: "Sports Events International",
          accountNumber: "2233445566",
          bankName: "Qatar National Bank",
          swiftCode: "QNBAEGCX",
        },
      },
      {
        id: "org5",
        name: "Film Festival Productions",
        email: "contact@filmfestival.com",
        phone: "+20 122 567 8901",
        status: "active",
        totalEvents: 6,
        totalRevenue: 180000,
        pendingPayout: 27000,
        completedPayouts: 153000,
        lastPayoutDate: "2024-01-08",
        bankInfo: {
          accountName: "Film Festival Productions",
          accountNumber: "3344556677",
          bankName: "Arab Bank",
          swiftCode: "ARABEGCX",
        },
      },
      {
        id: "org6",
        name: "Business Summit Group",
        email: "events@businesssummit.com",
        phone: "+20 122 678 9012",
        status: "active",
        totalEvents: 10,
        totalRevenue: 520000,
        pendingPayout: 78000,
        completedPayouts: 442000,
        lastPayoutDate: "2024-01-20",
        bankInfo: {
          accountName: "Business Summit Group",
          accountNumber: "4455667788",
          bankName: "HSBC Bank Egypt",
          swiftCode: "HSBCEGCX",
        },
      },
      {
        id: "org7",
        name: "Cultural Heritage Events",
        email: "info@culturalheritage.com",
        phone: "+20 122 789 0123",
        status: "active",
        totalEvents: 14,
        totalRevenue: 320000,
        pendingPayout: 48000,
        completedPayouts: 272000,
        lastPayoutDate: "2024-01-14",
        bankInfo: {
          accountName: "Cultural Heritage Events",
          accountNumber: "5566778899",
          bankName: "Alexandria Bank",
          swiftCode: "ALEXEGCX",
        },
      },
      {
        id: "org8",
        name: "Digital Marketing Expo",
        email: "contact@digitalmarketing.com",
        phone: "+20 122 890 1234",
        status: "active",
        totalEvents: 8,
        totalRevenue: 240000,
        pendingPayout: 36000,
        completedPayouts: 204000,
        lastPayoutDate: "2024-01-16",
        bankInfo: {
          accountName: "Digital Marketing Expo",
          accountNumber: "6677889900",
          bankName: "Suez Canal Bank",
          swiftCode: "SUEZEGCX",
        },
      },
    ];

    const mockPayouts: Payout[] = [
      {
        id: "payout1",
        organizerId: "org1",
        organizerName: "Music Events Co.",
        amount: 67500,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-001",
        createdAt: "2024-01-20T10:30:00Z",
        dueAmount: 67500,
        eventsIncluded: ["Event 1", "Event 2", "Event 3"],
      },
      {
        id: "payout2",
        organizerId: "org2",
        organizerName: "Tech Conference Ltd.",
        amount: 48000,
        status: "processing",
        method: "bank_transfer",
        reference: "PAY-2024-002",
        createdAt: "2024-01-19T14:20:00Z",
        processedAt: "2024-01-20T09:15:00Z",
        dueAmount: 48000,
        eventsIncluded: ["Tech Conf 2024", "AI Summit"],
      },
      {
        id: "payout3",
        organizerId: "org3",
        organizerName: "Art Gallery Events",
        amount: 42000,
        status: "completed",
        method: "bank_transfer",
        reference: "PAY-2024-003",
        createdAt: "2024-01-18T11:45:00Z",
        processedAt: "2024-01-19T16:30:00Z",
        dueAmount: 42000,
        eventsIncluded: ["Art Exhibition", "Gallery Opening"],
      },
      {
        id: "payout4",
        organizerId: "org1",
        organizerName: "Music Events Co.",
        amount: 45000,
        status: "completed",
        method: "bank_transfer",
        reference: "PAY-2023-045",
        createdAt: "2024-01-15T08:00:00Z",
        processedAt: "2024-01-16T10:30:00Z",
        dueAmount: 45000,
        eventsIncluded: ["Summer Music Festival"],
      },
      {
        id: "payout5",
        organizerId: "org4",
        organizerName: "Sports Events International",
        amount: 102000,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-004",
        createdAt: "2024-01-21T09:00:00Z",
        dueAmount: 102000,
        eventsIncluded: ["Football Championship", "Basketball League"],
      },
      {
        id: "payout6",
        organizerId: "org5",
        organizerName: "Film Festival Productions",
        amount: 27000,
        status: "processing",
        method: "paypal",
        reference: "PAY-2024-005",
        createdAt: "2024-01-20T16:45:00Z",
        processedAt: "2024-01-21T11:20:00Z",
        dueAmount: 27000,
        eventsIncluded: ["International Film Festival"],
      },
      {
        id: "payout7",
        organizerId: "org6",
        organizerName: "Business Summit Group",
        amount: 78000,
        status: "completed",
        method: "bank_transfer",
        reference: "PAY-2024-006",
        createdAt: "2024-01-19T13:30:00Z",
        processedAt: "2024-01-20T14:15:00Z",
        dueAmount: 78000,
        eventsIncluded: ["Global Business Summit", "Startup Conference"],
      },
      {
        id: "payout8",
        organizerId: "org7",
        organizerName: "Cultural Heritage Events",
        amount: 48000,
        status: "failed",
        method: "stripe",
        reference: "PAY-2024-007",
        createdAt: "2024-01-18T10:15:00Z",
        dueAmount: 48000,
        eventsIncluded: ["Cultural Heritage Festival"],
        notes: "Bank account details incorrect",
      },
      {
        id: "payout9",
        organizerId: "org8",
        organizerName: "Digital Marketing Expo",
        amount: 36000,
        status: "completed",
        method: "bank_transfer",
        reference: "PAY-2024-008",
        createdAt: "2024-01-17T15:20:00Z",
        processedAt: "2024-01-18T09:45:00Z",
        dueAmount: 36000,
        eventsIncluded: ["Digital Marketing Summit"],
      },
      {
        id: "payout10",
        organizerId: "org1",
        organizerName: "Music Events Co.",
        amount: 55000,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-009",
        createdAt: "2024-01-22T08:30:00Z",
        dueAmount: 55000,
        eventsIncluded: ["Jazz Festival", "Rock Concert"],
      },
      {
        id: "payout11",
        organizerId: "org2",
        organizerName: "Tech Conference Ltd.",
        amount: 32000,
        status: "processing",
        method: "paypal",
        reference: "PAY-2024-010",
        createdAt: "2024-01-21T12:45:00Z",
        processedAt: "2024-01-22T10:30:00Z",
        dueAmount: 32000,
        eventsIncluded: ["Blockchain Conference"],
      },
      {
        id: "payout12",
        organizerId: "org3",
        organizerName: "Art Gallery Events",
        amount: 38000,
        status: "completed",
        method: "bank_transfer",
        reference: "PAY-2024-011",
        createdAt: "2024-01-20T14:20:00Z",
        processedAt: "2024-01-21T16:10:00Z",
        dueAmount: 38000,
        eventsIncluded: ["Modern Art Exhibition"],
      },
      {
        id: "payout13",
        organizerId: "org4",
        organizerName: "Sports Events International",
        amount: 85000,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-012",
        createdAt: "2024-01-23T09:15:00Z",
        dueAmount: 85000,
        eventsIncluded: ["Tennis Championship", "Swimming Competition"],
      },
      {
        id: "payout14",
        organizerId: "org5",
        organizerName: "Film Festival Productions",
        amount: 22000,
        status: "completed",
        method: "stripe",
        reference: "PAY-2024-013",
        createdAt: "2024-01-22T11:30:00Z",
        processedAt: "2024-01-23T08:45:00Z",
        dueAmount: 22000,
        eventsIncluded: ["Short Film Festival"],
      },
      {
        id: "payout15",
        organizerId: "org6",
        organizerName: "Business Summit Group",
        amount: 65000,
        status: "processing",
        method: "bank_transfer",
        reference: "PAY-2024-014",
        createdAt: "2024-01-21T16:45:00Z",
        processedAt: "2024-01-22T12:30:00Z",
        dueAmount: 65000,
        eventsIncluded: ["E-commerce Summit"],
      },
      {
        id: "payout16",
        organizerId: "org7",
        organizerName: "Cultural Heritage Events",
        amount: 42000,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-015",
        createdAt: "2024-01-24T10:00:00Z",
        dueAmount: 42000,
        eventsIncluded: ["Traditional Music Festival"],
      },
      {
        id: "payout17",
        organizerId: "org8",
        organizerName: "Digital Marketing Expo",
        amount: 28000,
        status: "completed",
        method: "paypal",
        reference: "PAY-2024-016",
        createdAt: "2024-01-23T13:20:00Z",
        processedAt: "2024-01-24T09:15:00Z",
        dueAmount: 28000,
        eventsIncluded: ["Social Media Conference"],
      },
      {
        id: "payout18",
        organizerId: "org1",
        organizerName: "Music Events Co.",
        amount: 72000,
        status: "processing",
        method: "bank_transfer",
        reference: "PAY-2024-017",
        createdAt: "2024-01-22T15:30:00Z",
        processedAt: "2024-01-23T11:45:00Z",
        dueAmount: 72000,
        eventsIncluded: ["Classical Music Concert", "Opera Night"],
      },
      {
        id: "payout19",
        organizerId: "org2",
        organizerName: "Tech Conference Ltd.",
        amount: 45000,
        status: "completed",
        method: "stripe",
        reference: "PAY-2024-018",
        createdAt: "2024-01-21T14:15:00Z",
        processedAt: "2024-01-22T16:30:00Z",
        dueAmount: 45000,
        eventsIncluded: ["Machine Learning Conference"],
      },
      {
        id: "payout20",
        organizerId: "org3",
        organizerName: "Art Gallery Events",
        amount: 35000,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-019",
        createdAt: "2024-01-25T08:45:00Z",
        dueAmount: 35000,
        eventsIncluded: ["Sculpture Exhibition"],
      },
      {
        id: "payout21",
        organizerId: "org4",
        organizerName: "Sports Events International",
        amount: 95000,
        status: "processing",
        method: "bank_transfer",
        reference: "PAY-2024-020",
        createdAt: "2024-01-24T12:00:00Z",
        processedAt: "2024-01-25T10:30:00Z",
        dueAmount: 95000,
        eventsIncluded: ["Marathon Event", "Cycling Race"],
      },
      {
        id: "payout22",
        organizerId: "org5",
        organizerName: "Film Festival Productions",
        amount: 18000,
        status: "completed",
        method: "paypal",
        reference: "PAY-2024-021",
        createdAt: "2024-01-23T16:30:00Z",
        processedAt: "2024-01-24T14:15:00Z",
        dueAmount: 18000,
        eventsIncluded: ["Documentary Festival"],
      },
      {
        id: "payout23",
        organizerId: "org6",
        organizerName: "Business Summit Group",
        amount: 88000,
        status: "pending",
        method: "bank_transfer",
        reference: "PAY-2024-022",
        createdAt: "2024-01-26T09:30:00Z",
        dueAmount: 88000,
        eventsIncluded: ["Investment Summit", "Fintech Conference"],
      },
      {
        id: "payout24",
        organizerId: "org7",
        organizerName: "Cultural Heritage Events",
        amount: 38000,
        status: "failed",
        method: "stripe",
        reference: "PAY-2024-023",
        createdAt: "2024-01-25T11:45:00Z",
        dueAmount: 38000,
        eventsIncluded: ["Folk Dance Festival"],
        notes: "Payment method declined",
      },
      {
        id: "payout25",
        organizerId: "org8",
        organizerName: "Digital Marketing Expo",
        amount: 32000,
        status: "completed",
        method: "bank_transfer",
        reference: "PAY-2024-024",
        createdAt: "2024-01-24T14:20:00Z",
        processedAt: "2024-01-25T12:45:00Z",
        dueAmount: 32000,
        eventsIncluded: ["Content Marketing Summit"],
      },
    ];

    setOrganizers(mockOrganizers);
    setPayouts(mockPayouts);
  }, []);
  */

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <AlertCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Create payout mutation
  // Update payout status mutation
  const updatePayoutStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await financesApi.updatePayout(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      toast({
        title: t("admin.payouts.toast.statusUpdated") || "Status Updated",
        description: t("admin.payouts.toast.statusUpdatedDesc") || "Payout status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.payouts.toast.error"),
        variant: "destructive",
      });
    },
  });

  const createPayoutMutation = useMutation({
    mutationFn: async (data: {
      organizer: string;
      amount: number;
      method?: string;
    }) => {
      // Generate unique reference number using timestamp
      const timestamp = Date.now();
      const reference = `PAY-${new Date().getFullYear()}-${timestamp.toString().slice(-6)}`;
      
      return await financesApi.createPayout({
        organizer: data.organizer,
        amount: data.amount,
        method: data.method || "bank_transfer",
        reference: reference,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['organizers'] });
      setIsCreatePayoutOpen(false);
      setSelectedOrganizer("");
      setPayoutAmount(0);
      setPayoutNotes("");
      toast({
        title: t("admin.payouts.success.payoutCreated"),
        description: t("admin.payouts.success.payoutCreatedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.payouts.errors.pleaseCheckInput"),
        variant: "destructive",
      });
    },
  });

  const handleCreatePayout = () => {
    if (!selectedOrganizer || payoutAmount <= 0) {
      toast({
        title: t("admin.payouts.errors.invalidInput"),
        description: t("admin.payouts.errors.pleaseCheckInput"),
        variant: "destructive",
      });
      return;
    }

    const organizer = organizers.find((org) => org.id === selectedOrganizer);
    if (!organizer) return;

    createPayoutMutation.mutate({
      organizer: selectedOrganizer,
      amount: payoutAmount,
      method: "bank_transfer",
    });
  };

  const handleViewPayout = (payout: Payout) => {
    setSelectedPayout(payout);
    setIsViewPayoutOpen(true);
  };

  // Filtered payouts - API handles filtering, but we ensure organizer filter works
  const filteredPayouts = useMemo(() => {
    // API already handles status and date filtering
    // Organizer filter is also handled by API, but we keep this for consistency
    return payouts;
  }, [payouts]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = payoutsData?.total_pages || 1;
  const startIndex = payoutsData?.page ? (payoutsData.page - 1) * payoutsData.page_size : 0;
  const endIndex = startIndex + (payoutsData?.page_size || itemsPerPage);
  const paginatedPayouts = filteredPayouts; // API already paginates

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.organizer, dateFrom, dateTo]);

  const totalPendingPayouts = organizers.reduce(
    (sum, org) => sum + org.pendingPayout,
    0
  );
  const totalCompletedPayouts = organizers.reduce(
    (sum, org) => sum + org.completedPayouts,
    0
  );
  const totalPayouts = payouts.length;
  const totalPayoutAmount = payouts.reduce(
    (sum, payout) => sum + payout.amount,
    0
  );

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.payouts.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.payouts.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={payouts.map((payout) => ({
              ...payout,
              organizerName: payout.organizerName,
              amount: payout.amount,
              status: payout.status,
              method: payout.method,
              reference: payout.reference,
              createdAt: new Date(payout.createdAt).toLocaleDateString(),
              processedAt: payout.processedAt
                ? new Date(payout.processedAt).toLocaleDateString()
                : "",
            }))}
            columns={commonColumns.payouts}
            title={t("admin.payouts.title")}
            subtitle={t("admin.payouts.subtitle")}
            filename="payouts-history"
          >
            <Button className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.export.title")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.payouts.stats.pendingPayouts")}
              </CardTitle>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold currency-container">
              {formatCurrencyForLocale(totalPendingPayouts, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.payouts.stats.awaitingProcessing")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.payouts.stats.completedPayouts")}
              </CardTitle>
            </div>
            <CheckCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold currency-container">
              {formatCurrencyForLocale(totalCompletedPayouts, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.payouts.stats.successfullyProcessed")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.payouts.stats.totalPayouts")}
              </CardTitle>
            </div>
            <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(totalPayouts, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.payouts.stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.payouts.stats.totalAmount")}
              </CardTitle>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold currency-container">
              {formatCurrencyForLocale(totalPayoutAmount, i18n.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.payouts.stats.totalProcessed")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Payout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Plus className="h-5 w-5" />
            {t("admin.payouts.createNewPayout")}
          </CardTitle>
          <CardDescription>
            {t("admin.payouts.createNewPayoutDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizer">
                {t("admin.payouts.fields.organizer")}
              </Label>
              <Select
                value={selectedOrganizer}
                onValueChange={setSelectedOrganizer}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.payouts.fields.selectOrganizer")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizersLoading ? (
                    <SelectItem value="loading" disabled>
                      {t("common.loading") || "Loading organizers..."}
                    </SelectItem>
                  ) : organizers.length === 0 ? (
                    <SelectItem value="no-organizers" disabled>
                      {t("admin.payouts.noOrganizersFound") || "No organizers found"}
                    </SelectItem>
                  ) : (
                    organizers.map((organizer) => (
                      <SelectItem key={organizer.id} value={organizer.id}>
                        {organizer.name || organizer.id || "Unnamed Organizer"}
                        {organizer.pendingPayout > 0 && (
                          <> - {formatCurrencyForLocale(
                            organizer.pendingPayout,
                            i18n.language
                          )}</>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{t("admin.payouts.fields.amount")}</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={t("admin.payouts.fields.enterAmount")}
                value={payoutAmount > 0 ? payoutAmount : ""}
                onChange={(e) => setPayoutAmount(Number(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("admin.payouts.fields.notes")}</Label>
              <Input
                id="notes"
                placeholder={t("admin.payouts.fields.enterNotes")}
                value={payoutNotes}
                onChange={(e) => setPayoutNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreatePayout}
              disabled={!selectedOrganizer || payoutAmount <= 0 || createPayoutMutation.isPending}
            >
              {createPayoutMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("admin.payouts.actions.createPayout")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Banknote className="h-5 w-5" />
            {t("admin.payouts.payoutHistory")}
          </CardTitle>
          <CardDescription>
            {t("admin.payouts.payoutHistoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="space-y-2">
              <Label>{t("admin.payouts.filters.status")}</Label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.payouts.filters.allStatus")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("admin.payouts.filters.pending")}
                  </SelectItem>
                  <SelectItem value="processing">
                    {t("admin.payouts.filters.processing")}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t("admin.payouts.filters.completed")}
                  </SelectItem>
                  <SelectItem value="failed">
                    {t("admin.payouts.filters.failed")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("admin.payouts.filters.organizer")}</Label>
              <Select
                value={filters.organizer}
                onValueChange={(value) =>
                  setFilters({ ...filters, organizer: value })
                }
                disabled={organizersLoading}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={
                    organizersLoading 
                      ? (t("common.loading") || "Loading...") 
                      : (t("admin.payouts.filters.selectOrganizer") || "Select Organizer")
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.payouts.filters.allOrganizers")}
                  </SelectItem>
                  {organizers.map((organizer) => (
                    <SelectItem key={organizer.id} value={organizer.id}>
                      {organizer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payouts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.payouts.table.reference")}</TableHead>
                  <TableHead>{t("admin.payouts.table.organizer")}</TableHead>
                  <TableHead>{t("admin.payouts.table.amount")}</TableHead>
                  <TableHead>{t("admin.payouts.table.status")}</TableHead>
                  <TableHead>{t("admin.payouts.table.method")}</TableHead>
                  <TableHead>{t("admin.payouts.table.createdAt")}</TableHead>
                  <TableHead>{t("admin.payouts.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
                    </TableCell>
                  </TableRow>
                ) : payoutsError ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <span className="ml-2 text-red-500">
                        {t("common.error")}: {payoutsError instanceof Error ? payoutsError.message : t("admin.payouts.errors.error")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : paginatedPayouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">{t("admin.payouts.noPayoutsFound")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {payout.reference}
                    </TableCell>
                    <TableCell>{payout.organizerName}</TableCell>
                    <TableCell className="currency-container">
                      {formatCurrencyForLocale(payout.amount, i18n.language)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={payout.status}
                        onValueChange={(newStatus) => {
                          updatePayoutStatusMutation.mutate({
                            id: payout.id,
                            status: newStatus,
                          });
                        }}
                        disabled={updatePayoutStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[160px] border-0 p-0 h-auto">
                          <SelectValue>
                            <Badge className={getStatusColor(payout.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(payout.status)}
                                {t(`admin.payouts.status.${payout.status}`)}
                              </div>
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {t("admin.payouts.status.pending")}
                            </div>
                          </SelectItem>
                          <SelectItem value="processing">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              {t("admin.payouts.status.processing")}
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              {t("admin.payouts.status.completed")}
                            </div>
                          </SelectItem>
                          <SelectItem value="failed">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              {t("admin.payouts.status.failed")}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {t(`admin.payouts.methods.${payout.method}`)}
                    </TableCell>
                    <TableCell>
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewPayout(payout)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!payoutsLoading && !payoutsError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.payouts.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, payoutsData?.count || 0)} ${t(
                "admin.payouts.pagination.of"
              )} ${payoutsData?.count || 0} ${t(
                "admin.payouts.pagination.results"
              )}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={payoutsData?.count || 0}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* View Payout Details Dialog */}
      <Dialog open={isViewPayoutOpen} onOpenChange={setIsViewPayoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("admin.payouts.dialogs.payoutDetails")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.payouts.dialogs.payoutDetailsDesc")}
            </DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.reference")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayout.reference}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.organizer")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayout.organizerName}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.amount")}
                  </Label>
                  <p className="text-sm text-muted-foreground currency-container">
                    {formatCurrencyForLocale(
                      selectedPayout.amount,
                      i18n.language
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.status")}
                  </Label>
                  <Badge className={getStatusColor(selectedPayout.status)}>
                    {t(`admin.payouts.status.${selectedPayout.status}`)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.method")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t(`admin.payouts.methods.${selectedPayout.method}`)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.createdAt")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedPayout.createdAt, i18n.language)}
                  </p>
                </div>
                {selectedPayout.processedAt && (
                  <div>
                    <Label className="text-sm font-medium">
                      {t("admin.payouts.fields.processedAt")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedPayout.processedAt, i18n.language)}
                    </p>
                  </div>
                )}
              </div>
              {selectedPayout.notes && (
                <div>
                  <Label className="text-sm font-medium">
                    {t("admin.payouts.fields.notes")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedPayout.notes}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewPayoutOpen(false)}
            >
              {t("admin.payouts.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutsManagement;
