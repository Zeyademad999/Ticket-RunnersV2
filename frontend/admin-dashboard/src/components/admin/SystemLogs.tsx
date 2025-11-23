import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { systemLogsApi } from "@/lib/api/adminApi";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  CreditCard,
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
  ActivitySquare as ActivitySquareIcon,
  TrendingDown as TrendingDownIcon,
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

// Virtual scrolling utilities
const useVirtualScrolling = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItemCount + 1, items.length);

  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

// Types
interface SystemLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: "super_admin" | "admin" | "usher" | "support" | "customer";
  action: string;
  category:
    | "authentication"
    | "user_management"
    | "event_management"
    | "ticket_management"
    | "nfc_management"
    | "venue_management"
    | "system"
    | "security"
    | "financial"
    | "data_export"
    | "settings";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  details: {
    before?: any;
    after?: any;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    deviceInfo?: string;
    sessionId?: string;
    affectedRecords?: number;
    changes?: string[];
    metadata?: Record<string, any>;
  };
  status: "success" | "failed" | "pending" | "cancelled";
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  deviceInfo: string;
}

interface LogStats {
  totalLogs: number;
  todayLogs: number;
  thisWeekLogs: number;
  thisMonthLogs: number;
  criticalLogs: number;
  failedLogs: number;
  uniqueUsers: number;
  activeSessions: number;
  categoryBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  userActivityBreakdown: Record<string, number>;
}

const SystemLogs: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { toast } = useToast();

  // State for log management
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  // Virtual scrolling
  const containerHeight = 600; // Fixed container height

  // Filters with debounced search
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms delay
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Enhanced pagination for large datasets
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(50); // Configurable page size
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  // Fetch system logs from API
  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
  } = useQuery({
    queryKey: [
      "systemLogs",
      debouncedSearchTerm,
      selectedCategory,
      selectedSeverity,
      selectedUser,
      selectedStatus,
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
      if (selectedCategory !== "all") params.category = selectedCategory;
      if (selectedSeverity !== "all") params.severity = selectedSeverity;
      if (selectedUser !== "all") params.user = selectedUser;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      return await systemLogsApi.getSystemLogs(params);
    },
  });

  // Transform API logs to match SystemLog interface
  const logs: SystemLog[] = useMemo(() => {
    if (!logsData?.results) return [];
    return logsData.results.map((item: any) => {
      const userId = item.user?.id?.toString() || item.user_id?.toString() || "";
      return {
        id: item.id?.toString() || "",
        timestamp: item.timestamp || item.created_at || "",
        userId: userId || "unknown",
        userName: item.user?.name || item.user_name || item.user?.username || "",
        userRole: (item.user?.role || item.user_role || "customer") as
          | "super_admin"
          | "admin"
          | "usher"
          | "support"
          | "customer",
        action: item.action || "",
        category: (item.category || "system") as
          | "authentication"
          | "user_management"
          | "event_management"
          | "ticket_management"
          | "nfc_management"
          | "venue_management"
          | "system"
          | "security"
          | "financial"
          | "data_export"
          | "settings",
        severity: (item.severity || "low") as "low" | "medium" | "high" | "critical",
        description: item.description || item.message || "",
        details: {
          before: item.details?.before,
          after: item.details?.after,
          ipAddress: item.ip_address || item.details?.ipAddress || "",
          userAgent: item.user_agent || item.details?.userAgent || "",
          location: item.location || item.details?.location || "",
          deviceInfo: item.device_info || item.details?.deviceInfo || "",
          sessionId: item.session_id || item.details?.sessionId || "",
          affectedRecords: item.affected_records || item.details?.affectedRecords,
          changes: item.changes || item.details?.changes || [],
          metadata: item.metadata || item.details?.metadata || {},
        },
        status: (item.status || "success") as
          | "success"
          | "failed"
          | "pending"
          | "cancelled",
        sessionId: item.session_id || item.details?.sessionId || "",
        ipAddress: item.ip_address || item.details?.ipAddress || "",
        userAgent: item.user_agent || item.details?.userAgent || "",
        location: item.location || item.details?.location || "",
        deviceInfo: item.device_info || item.details?.deviceInfo || "",
      };
    });
  }, [logsData]);

  // Filtered logs - API handles most filtering, but we filter status client-side if needed
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Status filter (client-side if backend doesn't support it)
    if (selectedStatus !== "all") {
      filtered = filtered.filter((log) => log.status === selectedStatus);
    }

    // Client-side sorting (if backend doesn't support it)
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof SystemLog];
      let bValue: any = b[sortBy as keyof SystemLog];

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
  }, [logs, selectedStatus, sortBy, sortOrder]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = logsData?.total_pages || 1;
  const paginatedLogs = filteredLogs; // API already paginates

  // Optimized statistics calculation with memoization
  const stats: LogStats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = subDays(now, 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Use filtered logs for more accurate statistics
    const todayLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= today
    ).length;
    const thisWeekLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= weekAgo
    ).length;
    const thisMonthLogs = filteredLogs.filter(
      (log) => new Date(log.timestamp) >= monthStart
    ).length;
    const criticalLogs = filteredLogs.filter(
      (log) => log.severity === "critical"
    ).length;
    const failedLogs = filteredLogs.filter(
      (log) => log.status === "failed"
    ).length;
    const uniqueUsers = new Set(filteredLogs.map((log) => log.userId)).size;
    const activeSessions = new Set(
      filteredLogs
        .filter((log) => new Date(log.timestamp) >= subDays(now, 1))
        .map((log) => log.sessionId)
    ).size;

    const categoryBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userActivityBreakdown = filteredLogs.reduce((acc, log) => {
      acc[log.userName] = (acc[log.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: filteredLogs.length,
      todayLogs,
      thisWeekLogs,
      thisMonthLogs,
      criticalLogs,
      failedLogs,
      uniqueUsers,
      activeSessions,
      categoryBreakdown,
      severityBreakdown,
      userActivityBreakdown,
    };
  }, [filteredLogs]);

  // Note: API handles pagination, so loadMoreLogs is not needed
  // Users can navigate pages using the pagination component

  // Get severity color
  const getSeverityColor = (severity: string) => {
    const normalizedSeverity = severity.toLowerCase();
    switch (normalizedSeverity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
      case "info":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Convert snake_case to camelCase for translation keys
  const getCategoryTranslationKey = (category: string) => {
    switch (category) {
      case "authentication":
        return "authentication";
      case "user_management":
        return "userManagement";
      case "event_management":
        return "eventManagement";
      case "ticket_management":
        return "ticketManagement";
      case "nfc_management":
        return "nfcManagement";
      case "venue_management":
        return "venueManagement";
      case "system":
        return "system";
      case "security":
        return "security";
      case "financial":
        return "financial";
      case "data_export":
        return "dataExport";
      case "settings":
        return "settings";
      case "content":
        return "content";
      default:
        return category;
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "authentication":
        return <Key className="h-4 w-4" />;
      case "user_management":
        return <Users className="h-4 w-4" />;
      case "event_management":
        return <Calendar className="h-4 w-4" />;
      case "ticket_management":
        return <Ticket className="h-4 w-4" />;
      case "nfc_management":
        return <CreditCard className="h-4 w-4" />;
      case "venue_management":
        return <Building2 className="h-4 w-4" />;
      case "system":
        return <Database className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      case "data_export":
        return <FileText className="h-4 w-4" />;
      case "settings":
        return <Settings className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Handle log details view
  const handleViewLogDetails = (log: SystemLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  // Optimized export for large datasets
  const handleExportLogs = useCallback(async () => {
    try {
      // For very large datasets, export in chunks
      const chunkSize = 10000;
      const chunks = [];

      for (let i = 0; i < filteredLogs.length; i += chunkSize) {
        chunks.push(filteredLogs.slice(i, i + chunkSize));
      }

      const csvHeaders =
        "ID,Timestamp,User,Role,Action,Category,Severity,Description,Status,IP Address,Location\n";
      let csvContent = csvHeaders;

      // Process chunks to avoid memory issues
      for (const chunk of chunks) {
        const chunkContent = chunk
          .map(
            (log) =>
              `${log.id},${log.timestamp},${log.userName},${log.userRole},${log.action},${log.category},${log.severity},"${log.description}",${log.status},${log.ipAddress},${log.location}`
          )
          .join("\n");

        csvContent += chunkContent + "\n";
      }

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `system-logs-${format(
        new Date(),
        "yyyy-MM-dd-HH-mm"
      )}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: t("admin.dashboard.logs.toast.exportSuccess"),
        description: t("admin.dashboard.logs.toast.exportSuccessDesc"),
      });
    } catch (error) {
      toast({
        title: t("admin.dashboard.logs.toast.exportError"),
        description: t("admin.dashboard.logs.toast.exportErrorDesc"),
        variant: "destructive",
      });
    }
  }, [filteredLogs, t, toast]);

  // Note: No need for cleanup since React Query manages data lifecycle

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedCategory,
    selectedSeverity,
    selectedUser,
    selectedStatus,
    dateRange,
  ]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedSeverity("all");
    setSelectedUser("all");
    setSelectedStatus("all");
    setDateRange("all");
    setSortBy("timestamp");
    setSortOrder("desc");
  };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const userIds = logs
      .map((log) => log.userId)
      .filter((id) => id && id.trim() !== "" && id !== "unknown");
    const users = new Set(userIds);
    return Array.from(users).map((userId) => {
      const log = logs.find((l) => l.userId === userId);
      return {
        id: userId,
        name: log?.userName || userId || "Unknown User",
        role: log?.userRole || "unknown",
      };
    });
  }, [logs]);

  // Pagination is handled by API - use paginatedLogs directly
  const currentLogs = paginatedLogs;

  // Note: Virtual scrolling variables are available but not currently used
  // const { visibleItems, totalHeight, offsetY, setScrollTop } =
  //   useVirtualScrolling(currentLogs, rowHeight, containerHeight);

  // Note: Intersection Observer removed - API handles pagination

  return (
    <div
      className="space-y-6"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.dashboard.logs.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.dashboard.logs.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredLogs}
            columns={commonColumns.systemLogs}
            title={t("admin.dashboard.logs.title")}
            subtitle={t("admin.dashboard.logs.subtitle")}
            filename="system-logs"
            filters={{
              search: searchTerm,
              category: selectedCategory,
              severity: selectedSeverity,
              user: selectedUser,
              status: selectedStatus,
              dateRange: dateRange,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.dashboard.logs.toast.exportSuccess"),
                description: t("admin.dashboard.logs.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.dashboard.logs.export")}
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
              {t("admin.dashboard.logs.clearFilters")}
            </span>
            <span className="sm:hidden">Clear</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rtl:space-x-reverse">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.totalLogs")}
              </CardTitle>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.totalLogs, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.allTime")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.todayLogs")}
              </CardTitle>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.todayLogs, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.today")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.criticalLogs")}
              </CardTitle>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-red-600 number-container">
              {formatNumberForLocale(stats.criticalLogs, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.requiresAttention")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
            <div className="flex-1 rtl:text-right">
              <CardTitle className="text-sm font-medium">
                {t("admin.dashboard.logs.stats.activeUsers")}
              </CardTitle>
            </div>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 rtl:mr-0 rtl:ml-2" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold number-container">
              {formatNumberForLocale(stats.uniqueUsers, i18nInstance.language)}
            </div>
            <p className="text-xs text-muted-foreground rtl:text-right">
              {t("admin.dashboard.logs.stats.uniqueUsers")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <Filter className="h-5 w-5" />
            {t("admin.dashboard.logs.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 rtl:space-x-reverse">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.search")}
              </label>
              <Input
                placeholder={t(
                  "admin.dashboard.logs.filters.searchPlaceholder"
                )}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rtl:text-right"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.category")}
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allCategories")}
                  </SelectItem>
                  <SelectItem value="authentication">
                    {t("admin.dashboard.logs.categories.authentication")}
                  </SelectItem>
                  <SelectItem value="user_management">
                    {t("admin.dashboard.logs.categories.userManagement")}
                  </SelectItem>
                  <SelectItem value="event_management">
                    {t("admin.dashboard.logs.categories.eventManagement")}
                  </SelectItem>
                  <SelectItem value="ticket_management">
                    {t("admin.dashboard.logs.categories.ticketManagement")}
                  </SelectItem>
                  <SelectItem value="nfc_management">
                    {t("admin.dashboard.logs.categories.nfcManagement")}
                  </SelectItem>
                  <SelectItem value="venue_management">
                    {t("admin.dashboard.logs.categories.venueManagement")}
                  </SelectItem>
                  <SelectItem value="system">
                    {t("admin.dashboard.logs.categories.system")}
                  </SelectItem>
                  <SelectItem value="security">
                    {t("admin.dashboard.logs.categories.security")}
                  </SelectItem>
                  <SelectItem value="financial">
                    {t("admin.dashboard.logs.categories.financial")}
                  </SelectItem>
                  <SelectItem value="data_export">
                    {t("admin.dashboard.logs.categories.dataExport")}
                  </SelectItem>
                  <SelectItem value="settings">
                    {t("admin.dashboard.logs.categories.settings")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.severity")}
              </label>
              <Select
                value={selectedSeverity}
                onValueChange={setSelectedSeverity}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allSeverities")}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t("admin.dashboard.logs.severities.critical")}
                  </SelectItem>
                  <SelectItem value="high">
                    {t("admin.dashboard.logs.severities.high")}
                  </SelectItem>
                  <SelectItem value="medium">
                    {t("admin.dashboard.logs.severities.medium")}
                  </SelectItem>
                  <SelectItem value="low">
                    {t("admin.dashboard.logs.severities.low")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.user")}
              </label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allUsers")}
                  </SelectItem>
                  {uniqueUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.status")}
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allStatuses")}
                  </SelectItem>
                  <SelectItem value="success">
                    {t("admin.dashboard.logs.statuses.success")}
                  </SelectItem>
                  <SelectItem value="failed">
                    {t("admin.dashboard.logs.statuses.failed")}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("admin.dashboard.logs.statuses.pending")}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t("admin.dashboard.logs.statuses.cancelled")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.dashboard.logs.filters.dateRange")}
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.dashboard.logs.filters.allTime")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("admin.dashboard.logs.filters.today")}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("admin.dashboard.logs.filters.thisWeek")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("admin.dashboard.logs.filters.thisMonth")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
              <History className="h-5 w-5" />
              {t("admin.dashboard.logs.table.title")} (
              {formatNumberForLocale(
                filteredLogs.length,
                i18nInstance.language
              )}
              )
            </CardTitle>
            <div className="flex items-center gap-2 rtl:flex-row-reverse">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="flex items-center gap-1 rtl:flex-row-reverse"
              >
                {sortOrder === "asc" ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {t("admin.dashboard.logs.table.sortBy")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance indicator */}
          <div className="mb-4 p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="rtl:text-right">
                {t("admin.dashboard.logs.table.title")} (
                {formatNumberForLocale(
                  filteredLogs.length,
                  i18nInstance.language
                )}
                )
              </span>
              <span className="text-muted-foreground rtl:text-right">
                {logsLoading && t("admin.dashboard.logs.loading.loading")}
                {!logsLoading && t("admin.dashboard.logs.loading.ready")}
              </span>
            </div>
          </div>

          <div
            className="overflow-x-auto rtl:overflow-x-auto"
            style={{ height: `${containerHeight}px` }}
          >
            <Table className="rtl:text-right">
              <TableHeader>
                <TableRow className="rtl:text-right">
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.timestamp")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.user")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.action")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.category")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.severity")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.description")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.ipAddress")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.location")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.dashboard.logs.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">
                        {t("admin.dashboard.logs.loading.loading")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : logsError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <span className="ml-2 text-red-500">
                        {t("common.error")}:{" "}
                        {logsError instanceof Error
                          ? logsError.message
                          : t("admin.dashboard.logs.error")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : currentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {t("admin.dashboard.logs.noLogsFound")}
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
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 rtl:text-right">
                          <p className="text-sm font-medium truncate">
                            {log.userName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {log.userRole}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <span className="text-sm">
                        {t(
                          `admin.dashboard.logs.actions.${log.action}`,
                          log.action
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        {getCategoryIcon(log.category)}
                        <span className="text-sm">
                          {t(
                            `admin.dashboard.logs.categories.${getCategoryTranslationKey(
                              log.category
                            )}`
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <Badge
                        variant="outline"
                        className={`${getSeverityColor(
                          log.severity.toLowerCase()
                        )} rtl:text-right`}
                      >
                        {t(`admin.dashboard.logs.severities.${log.severity.toUpperCase()}`) || 
                         t(`admin.dashboard.logs.severities.${log.severity.toLowerCase()}`) || 
                         log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <p
                        className="text-sm max-w-xs truncate"
                        title={log.description}
                      >
                        {t(
                          `admin.dashboard.logs.descriptions.${log.description}`,
                          log.description
                        )}
                      </p>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(
                          log.status
                        )} rtl:text-right`}
                      >
                        {t(`admin.dashboard.logs.statuses.${log.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {log.ipAddress}
                      </span>
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      <span className="text-sm">{log.location}</span>
                    </TableCell>
                    <TableCell className="rtl:text-right">
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
                            {t("admin.dashboard.logs.actions.viewDetails")}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleViewLogDetails(log)}
                            className="flex items-center gap-2 rtl:flex-row-reverse"
                          >
                            <Eye className="h-4 w-4" />
                            {t("admin.dashboard.logs.actions.viewDetails")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Note: Infinite scrolling removed - API handles pagination */}
          </div>

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <ResponsivePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                startIndex={(currentPage - 1) * logsPerPage + 1}
                endIndex={Math.min(
                  currentPage * logsPerPage,
                  logsData?.count || filteredLogs.length
                )}
                totalItems={logsData?.count || filteredLogs.length}
                itemsPerPage={logsPerPage}
                infoText={`${t("admin.dashboard.logs.pagination.showing")} ${
                  (currentPage - 1) * logsPerPage + 1
                }-${Math.min(
                  currentPage * logsPerPage,
                  logsData?.count || filteredLogs.length
                )} ${t("admin.dashboard.logs.pagination.of")} ${formatNumberForLocale(
                  logsData?.count || filteredLogs.length,
                  i18nInstance.language
                )} ${t("admin.dashboard.logs.pagination.results")}`}
              />

              {/* Page size selector */}
              <div className="flex items-center justify-center mt-4">
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <span className="text-sm text-muted-foreground">
                    {t("admin.dashboard.logs.pagination.perPage")}:
                  </span>
                  <Select
                    value={logsPerPage.toString()}
                    onValueChange={(value) => {
                      setLogsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onOpenChange={setShowLogDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
              <ActivitySquareIcon className="h-5 w-5" />
              {t("admin.dashboard.logs.details.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {t("admin.dashboard.logs.details.subtitle")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.dashboard.logs.details.basicInfo")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.timestamp")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {formatDateForLocale(selectedLog.timestamp)}{" "}
                      {formatTimeForLocale(selectedLog.timestamp)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.user")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.userName} ({selectedLog.userRole})
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.action")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.action}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.category")}
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      {getCategoryIcon(selectedLog.category)}
                      <span className="text-sm">
                        {t(
                          `admin.dashboard.logs.categories.${getCategoryTranslationKey(
                            selectedLog.category
                          )}`
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.severity")}
                    </label>
                    <Badge
                      variant="outline"
                      className={`${getSeverityColor(
                        selectedLog.severity.toLowerCase()
                      )} rtl:text-right`}
                    >
                      {t(
                        `admin.dashboard.logs.severities.${selectedLog.severity.toUpperCase()}`
                      ) || 
                      t(
                        `admin.dashboard.logs.severities.${selectedLog.severity.toLowerCase()}`
                      ) || 
                      selectedLog.severity}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.status")}
                    </label>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(
                        selectedLog.status
                      )} rtl:text-right`}
                    >
                      {t(`admin.dashboard.logs.statuses.${selectedLog.status}`)}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.dashboard.logs.table.description")}
                </h3>
                <p className="text-sm rtl:text-right">
                  {selectedLog.description}
                </p>
              </div>

              <Separator />

              {/* Technical Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                  {t("admin.dashboard.logs.details.technicalDetails")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.ipAddress")}
                    </label>
                    <p className="text-sm font-mono rtl:text-right">
                      {selectedLog.ipAddress}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.table.location")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.location}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.details.deviceInfo")}
                    </label>
                    <p className="text-sm rtl:text-right">
                      {selectedLog.deviceInfo}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground rtl:text-right">
                      {t("admin.dashboard.logs.details.sessionId")}
                    </label>
                    <p className="text-sm font-mono rtl:text-right">
                      {selectedLog.sessionId}
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes Made */}
              {selectedLog.details.changes &&
                selectedLog.details.changes.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                        {t("admin.dashboard.logs.details.changes")}
                      </h3>
                      <ul className="space-y-1 rtl:text-right">
                        {selectedLog.details.changes.map((change, index) => (
                          <li
                            key={index}
                            className="text-sm flex items-center gap-2 rtl:flex-row-reverse"
                          >
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

              {/* Metadata */}
              {selectedLog.details.metadata &&
                Object.keys(selectedLog.details.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-4 rtl:text-right">
                        {t("admin.dashboard.logs.details.metadata")}
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <pre className="text-sm overflow-x-auto rtl:text-right">
                          {JSON.stringify(
                            selectedLog.details.metadata,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  </>
                )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowLogDetails(false)}>
              {t("admin.dashboard.logs.details.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemLogs;
