import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { systemLogsApi } from "@/lib/api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Progress } from "@/components/ui/progress";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Settings,
  Shield,
  Database,
  Key,
  Lock,
  Unlock,
  UserPlus,
  UserMinus,
  Edit,
  Plus,
  Minus,
  CreditCard as CreditCardIcon,
  Ticket,
  MapPin,
  Building2,
  QrCode,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CalendarDays,
  AlertCircle,
  MoreHorizontal,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FilterX,
  History,
  ActivitySquare,
  Zap,
  Target,
  Star,
  StarOff,
  Repeat,
  Clock3,
  CalendarX,
  UserCog,
  Crown,
  Users2,
  UserCheck2,
  UserX2,
  Wifi,
  WifiOff,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Smartphone,
  Tablet,
  Monitor,
  Watch,
  Bluetooth,
  BluetoothSearching,
  Radio,
  Antenna,
  Satellite,
  Router,
  Server,
  HardDrive,
  MemoryStick,
  Usb,
  Cable,
  Plug,
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Power,
  PowerOff,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun,
  Moon,
  Heart,
  HeartOff,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Meh,
  Laugh,
  Ear,
  EarOff,
  Hand,
  Fingerprint,
  Scan,
  ScanQrCode,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatNumberForLocale, formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { ResponsivePagination } from "@/components/ui/pagination";

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

// Types
interface CheckInLog {
  id: string;
  timestamp: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  entryPoint: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  nfcCardId: string;
  nfcSerialNumber: string;
  cardStatus: "active" | "inactive" | "expired" | "blocked";
  scanResult:
    | "valid"
    | "invalid"
    | "expired"
    | "blocked"
    | "duplicate"
    | "unauthorized";
  scanType: "entry" | "exit" | "reentry" | "transfer";
  scanLocation: string;
  deviceId: string;
  deviceType: "nfc_reader" | "qr_scanner" | "mobile_app" | "tablet" | "kiosk";
  deviceName: string;
  operatorId: string;
  operatorName: string;
  operatorRole: "usher" | "security" | "admin" | "volunteer";
  processingTime: number; // in milliseconds
  signalStrength: "excellent" | "good" | "fair" | "poor";
  batteryLevel: number; // percentage
  networkStatus: "connected" | "disconnected" | "offline" | "syncing";
  notes?: string;
  metadata: {
    sessionId: string;
    requestId: string;
    ipAddress: string;
    userAgent: string;
    location: string;
    deviceInfo: string;
    affectedRecords?: number;
    changes?: string[];
    additionalData?: Record<string, any>;
  };
}

interface CheckInStats {
  totalScans: number;
  todayScans: number;
  thisWeekScans: number;
  thisMonthScans: number;
  validScans: number;
  invalidScans: number;
  uniqueEvents: number;
  uniqueCustomers: number;
  uniqueDevices: number;
  averageProcessingTime: number;
  eventBreakdown: Record<string, number>;
  deviceBreakdown: Record<string, number>;
  scanResultBreakdown: Record<string, number>;
  operatorBreakdown: Record<string, number>;
}

const CheckInLogs: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();

  // State for real-time monitoring
  const [selectedLog, setSelectedLog] = useState<CheckInLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Filters with debounced search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedScanResult, setSelectedScanResult] = useState<string>("all");
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [selectedOperator, setSelectedOperator] = useState<string>("all");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Enhanced pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(50);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Note: Real-time updates handled by React Query refetchInterval

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18nInstance.language === "ar" ? ar : enUS;
  };

  // Format date for current locale
  const formatDateForLocale = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "PPP", { locale: getDateLocale() });
  };

  // Format time for current locale
  const formatTimeForLocale = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "HH:mm:ss", { locale: getDateLocale() });
  };

  // Calculate date range from dateRange filter
  useEffect(() => {
    if (dateRange === "all") {
      setDateFrom("");
      setDateTo("");
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "today":
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;
      case "week":
        startDate = subDays(now, 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(0);
    }

    setDateFrom(startDate.toISOString().split("T")[0]);
    setDateTo(now.toISOString().split("T")[0]);
  }, [dateRange]);

  // Fetch check-in logs from API
  const {
    data: checkInLogsData,
    isLoading: checkInLogsLoading,
    error: checkInLogsError,
  } = useQuery({
    queryKey: [
      "checkInLogs",
      debouncedSearchTerm,
      selectedEvent,
      selectedScanResult,
      selectedDevice,
      selectedOperator,
      dateFrom,
      dateTo,
      currentPage,
      logsPerPage,
    ],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: logsPerPage,
      };

      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedEvent !== "all") params.event = selectedEvent;
      if (selectedScanResult !== "all") params.scan_result = selectedScanResult;
      if (selectedDevice !== "all") params.device = selectedDevice;
      if (selectedOperator !== "all") params.operator = selectedOperator;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      return await systemLogsApi.getCheckinLogs(params);
    },
    refetchInterval: isRealTimeEnabled ? 5000 : false, // Refetch every 5 seconds if real-time enabled
  });

  // Transform API check-in logs to match CheckInLog interface
  const checkInLogs: CheckInLog[] = useMemo(() => {
    if (!checkInLogsData?.results) return [];
    return checkInLogsData.results.map((item: any) => ({
      id: item.id?.toString() || "",
      timestamp: item.timestamp || item.created_at || item.check_in_time || "",
      eventId: item.event?.id?.toString() || item.event_id?.toString() || "",
      eventTitle: item.event?.title || item.event_title || "",
      eventDate: item.event?.date || item.event_date || "",
      eventTime: item.event?.time || item.event_time || "",
      venueName: item.venue?.name || item.venue_name || item.event?.venue_name || "",
      entryPoint: item.entry_point || item.scan_location || "",
      customerId: item.customer?.id?.toString() || item.customer_id?.toString() || "",
      customerName: item.customer?.name || item.customer_name || "",
      customerEmail: item.customer?.email || item.customer_email || "",
      customerPhone: item.customer?.phone || item.customer_phone || "",
      nfcCardId: item.nfc_card?.id?.toString() || item.nfc_card_id?.toString() || "",
      nfcSerialNumber: item.nfc_card?.serial_number || item.nfc_serial_number || "",
      cardStatus: (item.card_status || item.nfc_card?.status || "active") as
        | "active"
        | "inactive"
        | "expired"
        | "blocked",
      scanResult: (item.scan_result || item.status || "valid") as
        | "valid"
        | "invalid"
        | "expired"
        | "blocked"
        | "duplicate"
        | "unauthorized",
      scanType: (item.scan_type || "entry") as "entry" | "exit" | "reentry" | "transfer",
      scanLocation: item.scan_location || item.location || "",
      deviceId: item.device?.id?.toString() || item.device_id?.toString() || "",
      deviceType: (item.device?.type || item.device_type || "nfc_reader") as
        | "nfc_reader"
        | "qr_scanner"
        | "mobile_app"
        | "tablet"
        | "kiosk",
      deviceName: item.device?.name || item.device_name || "",
      operatorId: item.operator?.id?.toString() || item.operator_id?.toString() || "",
      operatorName: item.operator?.name || item.operator_name || "",
      operatorRole: (item.operator?.role || item.operator_role || "usher") as
        | "usher"
        | "security"
        | "admin"
        | "volunteer",
      processingTime: item.processing_time || 0,
      signalStrength: (item.signal_strength || "good") as
        | "excellent"
        | "good"
        | "fair"
        | "poor",
      batteryLevel: item.battery_level || 100,
      networkStatus: (item.network_status || "connected") as
        | "connected"
        | "disconnected"
        | "offline"
        | "syncing",
      notes: item.notes || undefined,
      metadata: {
        sessionId: item.session_id || item.metadata?.sessionId || "",
        requestId: item.request_id || item.metadata?.requestId || "",
        ipAddress: item.ip_address || item.metadata?.ipAddress || "",
        userAgent: item.user_agent || item.metadata?.userAgent || "",
        location: item.location || item.metadata?.location || "",
        deviceInfo: item.device_info || item.metadata?.deviceInfo || "",
        affectedRecords: item.affected_records || item.metadata?.affectedRecords,
        changes: item.changes || item.metadata?.changes || [],
        additionalData: item.additional_data || item.metadata?.additionalData || {},
      },
    }));
  }, [checkInLogsData]);

  // Update lastUpdate when data changes
  useEffect(() => {
    if (checkInLogsData) {
      setLastUpdate(new Date());
    }
  }, [checkInLogsData]);

  // Note: Using API data only - no mock data
  // Real-time updates are handled by React Query's refetchInterval

  // Filtered logs - API handles most filtering, but we filter venue client-side if needed
  const filteredLogs = useMemo(() => {
    let filtered = checkInLogs;

    // Venue filter (client-side if backend doesn't support it)
    if (selectedVenue !== "all") {
      filtered = filtered.filter((log) => log.venueName === selectedVenue);
    }

    // Client-side sorting (if backend doesn't support it)
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CheckInLog];
      let bValue: any = b[sortBy as keyof CheckInLog];

      if (sortBy === "timestamp") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [checkInLogs, selectedVenue, sortBy, sortOrder]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = checkInLogsData?.total_pages || 1;
  const paginatedLogs = filteredLogs; // API already paginates

  // Optimized statistics calculation with memoization
  const stats: CheckInStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = subDays(now, 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayScans = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= today
    ).length;
    const thisWeekScans = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= weekAgo
    ).length;
    const thisMonthScans = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= monthStart
    ).length;
    const validScans = filteredLogs.filter(
      (log) => log.scanResult === "valid"
    ).length;
    const invalidScans = filteredLogs.filter(
      (log) => log.scanResult !== "valid"
    ).length;
    const uniqueEvents = new Set(filteredLogs.map((log) => log.eventId)).size;
    const uniqueCustomers = new Set(filteredLogs.map((log) => log.customerId))
      .size;
    const uniqueDevices = new Set(filteredLogs.map((log) => log.deviceId)).size;
    const averageProcessingTime =
      filteredLogs.length > 0
        ? filteredLogs.reduce((sum, log) => sum + log.processingTime, 0) /
          filteredLogs.length
        : 0;

    const eventBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.eventTitle] = (acc[log.eventTitle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const deviceBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.deviceName] = (acc[log.deviceName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const scanResultBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.scanResult] = (acc[log.scanResult] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const operatorBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.operatorName] = (acc[log.operatorName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalScans: filteredLogs.length,
      todayScans,
      thisWeekScans,
      thisMonthScans,
      validScans,
      invalidScans,
      uniqueEvents,
      uniqueCustomers,
      uniqueDevices,
      averageProcessingTime,
      eventBreakdown,
      deviceBreakdown,
      scanResultBreakdown,
      operatorBreakdown,
    };
  }, [filteredLogs]);

  // Get scan result color
  const getScanResultColor = (result: string) => {
    switch (result) {
      case "valid":
        return "bg-green-100 text-green-800 border-green-200";
      case "invalid":
        return "bg-red-100 text-red-800 border-red-200";
      case "expired":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "blocked":
        return "bg-red-100 text-red-800 border-red-200";
      case "duplicate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "unauthorized":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get device type icon
  const getDeviceTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case "nfc_reader":
        return <CreditCardIcon className="h-4 w-4" />;
      case "qr_scanner":
        return <ScanQrCode className="h-4 w-4" />;
      case "mobile_app":
        return <Smartphone className="h-4 w-4" />;
      case "tablet":
        return <Tablet className="h-4 w-4" />;
      case "kiosk":
        return <Monitor className="h-4 w-4" />;
      default:
        return <Scan className="h-4 w-4" />;
    }
  };

  // Get signal strength icon
  const getSignalStrengthIcon = (strength: string) => {
    switch (strength) {
      case "excellent":
        return <SignalHigh className="h-4 w-4 text-green-500" />;
      case "good":
        return <Signal className="h-4 w-4 text-blue-500" />;
      case "fair":
        return <SignalMedium className="h-4 w-4 text-yellow-500" />;
      case "poor":
        return <SignalLow className="h-4 w-4 text-red-500" />;
      default:
        return <Signal className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get network status icon
  const getNetworkStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-500" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case "syncing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  // Handle log details view
  const handleViewLogDetails = (log: CheckInLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEvent("all");
    setSelectedScanResult("all");
    setSelectedDevice("all");
    setSelectedOperator("all");
    setSelectedVenue("all");
    setDateRange("all");
    setSortBy("timestamp");
    setSortOrder("desc");
  };

  // Get unique values for filters
  const uniqueEvents = useMemo(() => {
    const events = new Set(checkInLogs.map((log) => log.eventId));
    return Array.from(events).map((eventId) => {
      const log = checkInLogs.find((l) => l.eventId === eventId);
      return {
        id: eventId,
        title: log?.eventTitle || eventId,
        venue: log?.venueName || "",
      };
    });
  }, [checkInLogs]);

  const uniqueVenues = useMemo(() => {
    const venues = new Set(checkInLogs.map((log) => log.venueName));
    return Array.from(venues);
  }, [checkInLogs]);

  const uniqueDevices = useMemo(() => {
    const devices = new Set(checkInLogs.map((log) => log.deviceId));
    return Array.from(devices).map((deviceId) => {
      const log = checkInLogs.find((l) => l.deviceId === deviceId);
      return {
        id: deviceId,
        name: log?.deviceName || deviceId,
        type: log?.deviceType || "unknown",
      };
    });
  }, [checkInLogs]);

  const uniqueOperators = useMemo(() => {
    const operators = new Set(checkInLogs.map((log) => log.operatorId));
    return Array.from(operators).map((operatorId) => {
      const log = checkInLogs.find((l) => l.operatorId === operatorId);
      return {
        id: operatorId,
        name: log?.operatorName || operatorId,
        role: log?.operatorRole || "unknown",
      };
    });
  }, [checkInLogs]);

  // Optimized pagination
  // Pagination is handled by API - use paginatedLogs directly
  const currentLogs = paginatedLogs;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedEvent,
    selectedScanResult,
    selectedDevice,
    selectedOperator,
    selectedVenue,
    dateRange,
  ]);

  return (
    <div
      className="space-y-6"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.tickets.checkInLogs.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.tickets.checkInLogs.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant={isRealTimeEnabled ? "default" : "outline"}
            onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            className="flex items-center gap-2 rtl:flex-row-reverse text-xs sm:text-sm"
          >
            {isRealTimeEnabled ? (
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ActivitySquare className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
            <span className="hidden sm:inline">
              {isRealTimeEnabled
                ? t("admin.tickets.checkInLogs.realTimeEnabled")
                : t("admin.tickets.checkInLogs.realTimeDisabled")}
            </span>
            <span className="sm:hidden">
              {isRealTimeEnabled ? "Live" : "Off"}
            </span>
          </Button>
          <ExportDialog
            data={filteredLogs}
            columns={commonColumns.checkInLogs}
            title={t("admin.tickets.checkInLogs.title")}
            subtitle={t("admin.tickets.checkInLogs.subtitle")}
            filename="check-in-logs"
            filters={{
              search: searchTerm,
              event: selectedEvent,
              scanResult: selectedScanResult,
              device: selectedDevice,
              operator: selectedOperator,
              venue: selectedVenue,
              dateRange: dateRange,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.tickets.checkInLogs.toast.exportSuccess"),
                description: t(
                  "admin.tickets.checkInLogs.toast.exportSuccessDesc"
                ),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.tickets.checkInLogs.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="text-xs sm:text-sm"
          >
            <FilterX className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.tickets.checkInLogs.clearFilters")}
            </span>
            <span className="sm:hidden">Clear</span>
          </Button>
        </div>
      </div>

      {/* Real-time Status */}
      {isRealTimeEnabled && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700 rtl:text-right">
                  {t("admin.tickets.checkInLogs.realTimeActive")}
                </span>
              </div>
              <div className="text-xs text-green-600 rtl:text-right">
                {t("admin.tickets.checkInLogs.lastUpdate")}:{" "}
                {formatTimeForLocale(lastUpdate)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.tickets.checkInLogs.stats.totalScans")}
              </CardTitle>
            </div>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.totalScans, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.tickets.checkInLogs.stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.tickets.checkInLogs.stats.todayScans")}
              </CardTitle>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.todayScans, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.tickets.checkInLogs.stats.today")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.tickets.checkInLogs.stats.validScans")}
              </CardTitle>
            </div>
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.validScans, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.tickets.checkInLogs.stats.successRate")}:{" "}
              {stats.totalScans > 0
                ? Math.round((stats.validScans / stats.totalScans) * 100)
                : 0}
              %
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.tickets.checkInLogs.stats.averageProcessingTime")}
              </CardTitle>
            </div>
            <Zap className="h-4 w-4 text-blue-500 flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {Math.round(stats.averageProcessingTime)}ms
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.tickets.checkInLogs.stats.deviceStatus")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm rtl:text-right">
              {t("admin.tickets.checkInLogs.analytics.scanTrends")}
            </CardTitle>
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="space-y-2">
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground rtl:text-right">
                  {t("admin.tickets.checkInLogs.stats.thisWeekScans")}
                </span>
                <span className="text-sm font-medium rtl:text-right">
                  {formatNumberForLocale(
                    stats.thisWeekScans,
                    i18nInstance.language
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground rtl:text-right">
                  {t("admin.tickets.checkInLogs.stats.thisMonthScans")}
                </span>
                <span className="text-sm font-medium rtl:text-right">
                  {formatNumberForLocale(
                    stats.thisMonthScans,
                    i18nInstance.language
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground rtl:text-right">
                  {t("admin.tickets.checkInLogs.stats.uniqueEvents")}
                </span>
                <span className="text-sm font-medium rtl:text-right">
                  {formatNumberForLocale(
                    stats.uniqueEvents,
                    i18nInstance.language
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm rtl:text-right">
              {t("admin.tickets.checkInLogs.analytics.devicePerformance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="space-y-2">
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground rtl:text-right">
                  {t("admin.tickets.checkInLogs.stats.uniqueDevices")}
                </span>
                <span className="text-sm font-medium rtl:text-right">
                  {formatNumberForLocale(
                    stats.uniqueDevices,
                    i18nInstance.language
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground rtl:text-right">
                  {t("admin.tickets.checkInLogs.stats.uniqueCustomers")}
                </span>
                <span className="text-sm font-medium rtl:text-right">
                  {formatNumberForLocale(
                    stats.uniqueCustomers,
                    i18nInstance.language
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-sm text-muted-foreground rtl:text-right">
                  {t("admin.tickets.checkInLogs.stats.failureRate")}
                </span>
                <span className="text-sm font-medium text-red-600 rtl:text-right">
                  {stats.totalScans > 0
                    ? Math.round((stats.invalidScans / stats.totalScans) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm rtl:text-right">
              {t("admin.tickets.checkInLogs.analytics.operatorActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="space-y-2">
              {Object.entries(stats.operatorBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([operator, count]) => (
                  <div
                    key={operator}
                    className="flex items-center justify-between rtl:flex-row-reverse"
                  >
                    <span className="text-sm text-muted-foreground rtl:text-right truncate">
                      {operator}
                    </span>
                    <span className="text-sm font-medium rtl:text-right">
                      {formatNumberForLocale(count, i18nInstance.language)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm rtl:text-right">
            {t("admin.tickets.checkInLogs.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.search")}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                <Input
                  placeholder={t(
                    "admin.tickets.checkInLogs.filters.searchPlaceholder"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rtl:pr-10 rtl:pl-3"
                />
              </div>
            </div>

            {/* Event Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.event")}
              </label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "admin.tickets.checkInLogs.filters.allEvents"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.tickets.checkInLogs.filters.allEvents")}
                  </SelectItem>
                  {uniqueEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scan Result Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.scanResult")}
              </label>
              <Select
                value={selectedScanResult}
                onValueChange={setSelectedScanResult}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "admin.tickets.checkInLogs.filters.allResults"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.tickets.checkInLogs.filters.allResults")}
                  </SelectItem>
                  <SelectItem value="valid">
                    {t("admin.tickets.checkInLogs.scanResults.valid")}
                  </SelectItem>
                  <SelectItem value="invalid">
                    {t("admin.tickets.checkInLogs.scanResults.invalid")}
                  </SelectItem>
                  <SelectItem value="expired">
                    {t("admin.tickets.checkInLogs.scanResults.expired")}
                  </SelectItem>
                  <SelectItem value="blocked">
                    {t("admin.tickets.checkInLogs.scanResults.blocked")}
                  </SelectItem>
                  <SelectItem value="duplicate">
                    {t("admin.tickets.checkInLogs.scanResults.duplicate")}
                  </SelectItem>
                  <SelectItem value="unauthorized">
                    {t("admin.tickets.checkInLogs.scanResults.unauthorized")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Device Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.device")}
              </label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "admin.tickets.checkInLogs.filters.allDevices"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.tickets.checkInLogs.filters.allDevices")}
                  </SelectItem>
                  {uniqueDevices.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Operator Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.operator")}
              </label>
              <Select
                value={selectedOperator}
                onValueChange={setSelectedOperator}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "admin.tickets.checkInLogs.filters.allOperators"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.tickets.checkInLogs.filters.allOperators")}
                  </SelectItem>
                  {uniqueOperators.map((operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      {operator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venue Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.venue")}
              </label>
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t(
                      "admin.tickets.checkInLogs.filters.allVenues"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.tickets.checkInLogs.filters.allVenues")}
                  </SelectItem>
                  {uniqueVenues.map((venue) => (
                    <SelectItem key={venue} value={venue}>
                      {venue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.dateRange")}
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("admin.tickets.checkInLogs.filters.allTime")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.tickets.checkInLogs.filters.allTime")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("admin.tickets.checkInLogs.filters.today")}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("admin.tickets.checkInLogs.filters.thisWeek")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("admin.tickets.checkInLogs.filters.thisMonth")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.sortBy")}
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">
                    {t("admin.tickets.checkInLogs.table.timestamp")}
                  </SelectItem>
                  <SelectItem value="customerName">
                    {t("admin.tickets.checkInLogs.table.customer")}
                  </SelectItem>
                  <SelectItem value="eventTitle">
                    {t("admin.tickets.checkInLogs.table.event")}
                  </SelectItem>
                  <SelectItem value="scanResult">
                    {t("admin.tickets.checkInLogs.table.scanResult")}
                  </SelectItem>
                  <SelectItem value="processingTime">
                    {t("admin.tickets.checkInLogs.table.processingTime")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.checkInLogs.filters.sortOrder")}
              </label>
              <Select
                value={sortOrder}
                onValueChange={(value: "asc" | "desc") => setSortOrder(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">
                    {t("admin.tickets.checkInLogs.filters.descending")}
                  </SelectItem>
                  <SelectItem value="asc">
                    {t("admin.tickets.checkInLogs.filters.ascending")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <div>
              <CardTitle className="text-lg rtl:text-right">
                {t("admin.tickets.checkInLogs.title")}
              </CardTitle>
              <CardDescription className="rtl:text-right">
                {formatNumberForLocale(
                  filteredLogs.length,
                  i18nInstance.language
                )}{" "}
                {t("admin.tickets.checkInLogs.table.details")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={logsPerPage.toString()}
                onValueChange={(value) => setLogsPerPage(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.timestamp")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.customer")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.event")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.venue")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.nfcCard")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.scanResult")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.device")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.operator")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.processingTime")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.checkInLogs.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkInLogsLoading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">
                        {t("admin.dashboard.logs.loading.loading")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : checkInLogsError ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <span className="ml-2 text-red-500">
                        {t("common.error")}:{" "}
                        {checkInLogsError instanceof Error
                          ? checkInLogsError.message
                          : t("admin.dashboard.logs.error")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : currentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {t("admin.tickets.checkInLogs.noLogsFound")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {formatDateForLocale(log.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeForLocale(log.timestamp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {log.customerName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.customerEmail}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {log.eventTitle}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.eventDate} {log.eventTime}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {log.venueName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.entryPoint}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {log.nfcSerialNumber}
                        </span>
                        <Badge
                          variant={
                            log.cardStatus === "active"
                              ? "default"
                              : "destructive"
                          }
                          className="w-fit"
                        >
                          {t(
                            `admin.tickets.checkInLogs.cardStatus.${log.cardStatus}`
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <Badge
                        className={`${getScanResultColor(log.scanResult)}`}
                      >
                        {t(
                          `admin.tickets.checkInLogs.scanResults.${log.scanResult}`
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        {getDeviceTypeIcon(log.deviceType)}
                        <div className="flex flex-col rtl:text-right">
                          <span className="text-sm font-medium">
                            {log.deviceName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t(
                              `admin.tickets.checkInLogs.deviceTypes.${log.deviceType}`
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex flex-col rtl:text-right">
                        <span className="text-sm font-medium">
                          {log.operatorName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(
                            `admin.tickets.checkInLogs.operatorRoles.${log.operatorRole}`
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <span className="text-sm">{log.processingTime}ms</span>
                        <div className="flex items-center gap-1 rtl:flex-row-reverse">
                          {getSignalStrengthIcon(log.signalStrength)}
                          {getNetworkStatusIcon(log.networkStatus)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewLogDetails(log)}
                          >
                            <Eye className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
                            {t("admin.tickets.checkInLogs.table.viewDetails")}
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
            infoText={`${t("admin.tickets.checkInLogs.pagination.showing")} ${
                (currentPage - 1) * logsPerPage + 1
              }-${Math.min(
                currentPage * logsPerPage,
                checkInLogsData?.count || filteredLogs.length
              )} ${t("admin.tickets.checkInLogs.pagination.of")} ${formatNumberForLocale(
                checkInLogsData?.count || filteredLogs.length,
              i18nInstance.language
            )} ${t("admin.tickets.checkInLogs.pagination.results")}`}
              startIndex={(currentPage - 1) * logsPerPage + 1}
              endIndex={Math.min(
                currentPage * logsPerPage,
                checkInLogsData?.count || filteredLogs.length
              )}
              totalItems={checkInLogsData?.count || filteredLogs.length}
            itemsPerPage={logsPerPage}
            className="mt-4"
          />
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onOpenChange={setShowLogDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">
              {t("admin.tickets.checkInLogs.details.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("admin.tickets.checkInLogs.details.subtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 rtl:text-right">
                  {t("admin.tickets.checkInLogs.details.customerInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.customer")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.customerName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Email
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.customerEmail}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Phone
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.customerPhone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Customer ID
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.customerId}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Event Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 rtl:text-right">
                  {t("admin.tickets.checkInLogs.details.eventInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.event")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.eventTitle}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Event ID
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.eventId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Date & Time
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.eventDate} {selectedLog.eventTime}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.venue")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.venueName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.entryPoint")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.entryPoint}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.location")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.scanLocation}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Device Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 rtl:text-right">
                  {t("admin.tickets.checkInLogs.details.deviceInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.device")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.deviceName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Device Type
                    </label>
                    <p className="text-sm rtl:text-right">
                      {t(
                        `admin.tickets.checkInLogs.deviceTypes.${selectedLog.deviceType}`
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.operator")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.operatorName}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Operator Role
                    </label>
                    <p className="text-sm rtl:text-right">
                      {t(
                        `admin.tickets.checkInLogs.operatorRoles.${selectedLog.operatorRole}`
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.signalStrength")}
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      {getSignalStrengthIcon(selectedLog.signalStrength)}
                      <span className="text-sm">
                        {t(
                          `admin.tickets.checkInLogs.signalStrength.${selectedLog.signalStrength}`
                        )}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.batteryLevel")}
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <Battery className="h-4 w-4" />
                      <span className="text-sm">
                        {selectedLog.batteryLevel}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.networkStatus")}
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      {getNetworkStatusIcon(selectedLog.networkStatus)}
                      <span className="text-sm">
                        {t(
                          `admin.tickets.checkInLogs.networkStatus.${selectedLog.networkStatus}`
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Scan Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 rtl:text-right">
                  {t("admin.tickets.checkInLogs.details.scanInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.scanResult")}
                    </label>
                    <Badge
                      className={`${getScanResultColor(
                        selectedLog.scanResult
                      )}`}
                    >
                      {t(
                        `admin.tickets.checkInLogs.scanResults.${selectedLog.scanResult}`
                      )}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.scanType")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {t(
                        `admin.tickets.checkInLogs.scanTypes.${selectedLog.scanType}`
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.nfcCard")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.nfcSerialNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      Card Status
                    </label>
                    <Badge
                      variant={
                        selectedLog.cardStatus === "active"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {t(
                        `admin.tickets.checkInLogs.cardStatus.${selectedLog.cardStatus}`
                      )}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.table.processingTime")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.processingTime}ms
                    </p>
                  </div>
                  {selectedLog.notes && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                        {t("admin.tickets.checkInLogs.details.notes")}
                      </label>
                      <p className="text-sm rtl:text-right">
                        {selectedLog.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Technical Metadata */}
              <div>
                <h3 className="text-lg font-semibold mb-3 rtl:text-right">
                  {t("admin.tickets.checkInLogs.details.metadata")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.sessionId")}
                    </label>
                    <p className="text-sm rtl:text-right font-mono">
                      {selectedLog.metadata.sessionId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.requestId")}
                    </label>
                    <p className="text-sm rtl:text-right font-mono">
                      {selectedLog.metadata.requestId}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.ipAddress")}
                    </label>
                    <p className="text-sm rtl:text-right font-mono">
                      {selectedLog.metadata.ipAddress}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.userAgent")}
                    </label>
                    <p className="text-sm rtl:text-right font-mono">
                      {selectedLog.metadata.userAgent}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.location")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.metadata.location}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.tickets.checkInLogs.details.deviceInfo")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.metadata.deviceInfo}
                    </p>
                  </div>
                  {selectedLog.metadata.affectedRecords && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                        {t("admin.tickets.checkInLogs.details.affectedRecords")}
                      </label>
                      <p className="text-sm rtl:text-right">
                        {selectedLog.metadata.affectedRecords}
                      </p>
                    </div>
                  )}
                  {selectedLog.metadata.changes &&
                    selectedLog.metadata.changes.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                          {t("admin.tickets.checkInLogs.details.changes")}
                        </label>
                        <ul className="text-sm rtl:text-right list-disc list-inside">
                          {selectedLog.metadata.changes.map((change, index) => (
                            <li key={index}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDetails(false)}>
              {t("admin.tickets.checkInLogs.dialogs.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CheckInLogs;
