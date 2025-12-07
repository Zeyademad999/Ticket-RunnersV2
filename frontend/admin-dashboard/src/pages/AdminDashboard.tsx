import React, { useState, useMemo, useEffect, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  TrendingUp,
  DollarSign,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  Download,
  FileText,
  Receipt,
  CreditCard,
  MoreHorizontal,
  Banknote,
  Building2,
  Wallet,
  Layout,
  Edit,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import i18n from "@/lib/i18n";
import { formatNumberForLocale, formatCurrencyForLocale } from "@/lib/utils";
import SystemLogs from "@/components/admin/SystemLogs";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns, formatCurrency } from "@/lib/exportUtils";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, authApi } from "@/lib/api/adminApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Import admin components
import EventsManagement from "@/components/admin/EventsManagement";
import TicketsManagement from "@/components/admin/TicketsManagement";
import NFCCardManagement from "@/components/admin/NFCCardManagement";
import CustomerManagement from "@/components/admin/CustomerManagement";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import VenueManagement from "@/components/admin/VenueManagement";
import OrganizersManagement from "@/components/admin/OrganizerManagement";
import UsherManagement from "@/components/admin/UsherManagment";
import AdminAccountSettings from "@/components/admin/AdminAccountSettings";
import ExpensesManagement from "@/components/admin/expansesManagment";
import PayoutsManagement from "@/components/admin/PayoutsManagement";
import PaymentsManagement from "@/components/admin/PaymentsManagement";
import MerchantManagement from "@/components/admin/MerchantManagement";
import MerchantLocationsManagement from "@/components/admin/MerchantLocationsManagement";
import OrganizerRequestsManagement from "@/components/admin/OrganizerRequestsManagement";
import EventEditRequestsManagement from "@/components/admin/EventEditRequestsManagement";

// Import Owner's Finances components
import CompanyFinances from "@/components/admin/CompanyFinances";
import HomePageSectionsManagement from "@/components/admin/HomePageSectionsManagement";

// Types
interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "usher" | "support";
  status: "active" | "inactive";
  lastLogin: string;
  permissions: string[];
  createdAt: string;
}

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
};

type NFCCard = {
  id: string;
  serialNumber: string;
  customerId: string;
  customerName: string;
  status: "active" | "inactive" | "expired";
  issueDate: string;
  expiryDate: string;
  balance: number;
  lastUsed: string;
  usageCount: number;
};

type Event = {
  id: string;
  title: string;
  organizer: string;
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
  ticketTransferEnabled: boolean;
  ticketLimit: number;
  usheringAccounts: number;
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
  dependents: number;
};

type DashboardStats = {
  // Event Analytics
  totalEvents: number;
  totalTicketsSold: number;
  totalAttendees: number;

  // Financial Summary
  totalRevenues: number;
  cutCommissions: number;
  pendingPayouts: number;
  completedPayouts: number;
  cardSales: number;
  grossProfit: number;

  // User Summary
  totalVisitors: number;
  registeredUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recurrentUsers: number;

  // Card Summary
  totalCards: number;
  activeCards: number;
  inactiveCards: number;
  expiredCards: number;
};

// Enhanced Tabs List Component
interface EnhancedTabsListProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  t: (key: string) => string;
  i18nInstance: any;
}

const EnhancedTabsList: React.FC<EnhancedTabsListProps & { hasPermission?: (permission: string) => boolean; isSuperAdmin?: boolean }> = ({
  activeTab,
  onTabChange,
  t,
  i18nInstance,
  hasPermission = () => false,
  isSuperAdmin = false,
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define tab groups for better organization
  const tabGroups = [
    {
      name: "main",
      label: t("admin.dashboard.tabs.groups.main"),
      icon: BarChart3,
      tabs: [
        {
          value: "dashboard",
          label: t("admin.dashboard.tabs.dashboard"),
          icon: BarChart3,
        },
      ],
    },
    {
      name: "management",
      label: t("admin.dashboard.tabs.groups.management"),
      icon: Calendar,
      tabs: [
        {
          value: "events",
          label: t("admin.dashboard.tabs.events"),
          icon: Calendar,
        },
        {
          value: "venues",
          label: t("admin.dashboard.tabs.venues"),
          icon: MapPin,
        },
        {
          value: "tickets",
          label: t("admin.dashboard.tabs.tickets"),
          icon: Ticket,
        },
        {
          value: "customers",
          label: t("admin.dashboard.tabs.customers"),
          icon: Users,
        },
        {
          value: "home-page-sections",
          label: t("admin.dashboard.tabs.homePageSections"),
          icon: Layout,
        },
      ],
    },
    {
      name: "users",
      label: t("admin.dashboard.tabs.groups.users"),
      icon: Users,
      tabs: [
        {
          value: "organizers",
          label: t("admin.dashboard.tabs.organizers"),
          icon: Users,
        },
        {
          value: "organizer-requests",
          label: t("admin.dashboard.tabs.organizerRequests") || "Organizer Requests",
          icon: FileText,
        },
        {
          value: "event-edit-requests",
          label: t("admin.dashboard.tabs.eventEditRequests") || "Event Edit Requests",
          icon: Edit,
        },
        {
          value: "ushers",
          label: t("admin.dashboard.tabs.ushers"),
          icon: Users,
        },
        {
          value: "admins",
          label: t("admin.dashboard.tabs.admins"),
          icon: Users,
        },
        {
          value: "merchants",
          label: t("admin.dashboard.tabs.merchants"),
          icon: Building2,
        },
        {
          value: "merchant-locations",
          label: t("admin.dashboard.tabs.merchantLocations") || "Merchant Locations",
          icon: MapPin,
        },
      ],
    },
    {
      name: "finances",
      label: t("admin.dashboard.tabs.groups.finances"),
      icon: DollarSign,
      tabs: [
        { value: "expenses", label: t("expenses.title"), icon: Receipt },
        {
          value: "payouts",
          label: t("admin.dashboard.tabs.payouts"),
          icon: Banknote,
        },
        {
          value: "payments",
          label: t("admin.dashboard.tabs.payments") || "Payments",
          icon: CreditCard,
        },
      ],
    },
    {
      name: "owners-finances",
      label: t("admin.dashboard.tabs.groups.ownersFinances"),
      icon: Building2,
      tabs: [
        {
          value: "company-finances",
          label: t("admin.dashboard.tabs.companyFinances"),
          icon: Building2,
        },
      ],
    },
    {
      name: "system",
      label: t("admin.dashboard.tabs.groups.system"),
      icon: CreditCard,
      tabs: [
        {
          value: "nfc",
          label: t("admin.dashboard.tabs.nfc"),
          icon: CreditCard,
        },
        {
          value: "logs",
          label: t("admin.dashboard.logs.title"),
          icon: FileText,
        },
        {
          value: "account-settings",
          label: t("admin.accountSettings.title"),
          icon: Users,
        },
      ],
    },
  ];

  // Get the current active group
  const getActiveGroup = () => {
    return (
      tabGroups.find((group) =>
        group.tabs.some((tab) => tab.value === activeTab)
      ) || tabGroups[0]
    );
  };

  // Get the current active tab info
  const getActiveTabInfo = () => {
    const activeGroup = getActiveGroup();
    return (
      activeGroup.tabs.find((tab) => tab.value === activeTab) ||
      activeGroup.tabs[0]
    );
  };

  const activeGroup = getActiveGroup();
  const activeTabInfo = getActiveTabInfo();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Grouped Tabs List */}
      <div className="relative">
        <TabsList
          ref={tabsRef}
          className="flex w-full rtl:flex-row-reverse overflow-x-auto scrollbar-hide gap-4 px-4 enhanced-tabs"
        >
          {tabGroups.map((group, groupIndex) => {
            const GroupIcon = group.icon;
            const isActiveGroup = group.tabs.some(
              (tab) => tab.value === activeTab
            );
            const groupActiveTab = group.tabs.find(
              (tab) => tab.value === activeTab
            );

            return (
              <div
                key={group.name}
                className="flex items-center gap-1 tab-group"
              >
                {/* Group Separator - removed */}

                {/* Group Dropdown */}
                <DropdownMenu open={openDropdown === group.name}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={isActiveGroup ? "default" : "outline"}
                      className="flex items-center gap-3 h-12 px-4 py-2 transition-all duration-200 hover:bg-accent/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md tabs-trigger group-tab"
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        setOpenDropdown(group.name);
                      }}
                      onMouseLeave={() => {
                        hoverTimeoutRef.current = setTimeout(() => {
                          setOpenDropdown(null);
                        }, 300);
                      }}
                    >
                      <GroupIcon className="h-4 w-4 tabs-trigger-icon" />
                      <span className="hidden sm:inline tabs-trigger-text">
                        {group.label}
                      </span>
                      <span className="sm:hidden tabs-trigger-text">
                        {group.label.split(" ")[0]}
                      </span>
                      {isActiveGroup && groupActiveTab && (
                        <span className="hidden md:inline text-xs opacity-70">
                          • {groupActiveTab.label}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align={i18nInstance.language === "ar" ? "start" : "end"}
                    className="w-56 max-h-96 overflow-y-auto"
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current) {
                        clearTimeout(hoverTimeoutRef.current);
                      }
                    }}
                    onMouseLeave={() => {
                      hoverTimeoutRef.current = setTimeout(() => {
                        setOpenDropdown(null);
                      }, 300);
                    }}
                  >
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.label}
                    </div>
                    {group.tabs.map((tab) => {
                      const IconComponent = tab.icon;
                      // Check if user has permission for this tab
                      const tabPermissions: Record<string, string> = {
                        "events": "events_view",
                        "venues": "venues_view",
                        "tickets": "tickets_view",
                        "customers": "customers_view",
                        "organizers": "organizers_view",
                        "organizer-requests": "organizers_view",
                        "event-edit-requests": "events_view",
                        "ushers": "ushers_view",
                        "admins": "admins_view",
                        "merchants": "merchants_view",
                        "merchant-locations": "merchants_view",
                        "expenses": "expenses_view",
                        "payouts": "payouts_view",
                        "payments": "payments_view",
                        "logs": "logs_view",
                        "home-page-sections": "home_page_view",
                        "analytics": "analytics_view",
                        "dashboard": "dashboard_view",
                        "company-finances": "finances_view",
                        "nfc": "nfc_cards_view",
                        "account-settings": "dashboard_view",
                      };
                      const requiredPermission = tabPermissions[tab.value];
                      // Super admins have access to all tabs, or check specific permission
                      const hasAccess = isSuperAdmin || !requiredPermission || (hasPermission && hasPermission(requiredPermission)) || tab.value === "dashboard";
                      
                      if (!hasAccess) {
                        return null; // Don't render tab if no permission
                      }
                      
                      return (
                        <DropdownMenuItem
                          key={tab.value}
                          onClick={() => onTabChange(tab.value)}
                          className={`flex items-center gap-2 cursor-pointer ${
                            activeTab === tab.value ? "bg-accent" : ""
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </TabsList>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requirePermission, hasPermission, isSuperAdmin } = usePermissions();
  
  // Get initial tab from URL or default to "dashboard"
  const initialTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const language = i18nInstance.language === "ar" ? "AR" : "EN";

  // Sync activeTab with URL when URL changes (e.g., browser back/forward)
  // Only update if URL changed externally (not from our own setSearchParams)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") || "dashboard";
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when tab changes (but only if it's different from URL)
  useEffect(() => {
    const currentTabInUrl = searchParams.get("tab") || "dashboard";
    if (activeTab && activeTab !== currentTabInUrl) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Handle tab change with permission check
  const handleTabChange = (tab: string) => {
    // Map tabs to required view permissions (using the new permission keys)
    const tabPermissions: Record<string, string> = {
      "events": "events_view",
      "venues": "venues_view",
      "tickets": "tickets_view",
      "customers": "customers_view",
      "organizers": "organizers_view",
      "organizer-requests": "organizers_view",
      "event-edit-requests": "events_view",
      "ushers": "ushers_view",
      "admins": "admins_view",
      "merchants": "merchants_view",
      "merchant-locations": "merchants_view", // Merchant locations use merchants_view permission
      "expenses": "expenses_view",
      "payouts": "payouts_view",
      "payments": "payments_view",
      "logs": "logs_view",
      "home-page-sections": "home_page_view",
      "analytics": "analytics_view",
      "dashboard": "dashboard_view",
      "company-finances": "finances_view",
      "nfc": "nfc_cards_view",
      "account-settings": "dashboard_view", // Account settings accessible to all authenticated admins
    };

    const requiredPermission = tabPermissions[tab];
    
    // Dashboard is accessible to all authenticated admins
    if (tab === "dashboard") {
      setActiveTab(tab);
      return;
    }

    // Super admins have access to all tabs
    if (isSuperAdmin) {
      setActiveTab(tab);
      return;
    }

    // Check permission for all other tabs (including analytics)
    if (requiredPermission && !requirePermission(requiredPermission)) {
      return; // Permission denied - toast already shown
    }

    // If no permission mapping exists, deny access
    if (!requiredPermission && tab !== "dashboard") {
      toast({
        title: "Access Denied",
        description: "You do not have permission to access this section.",
        variant: "destructive",
      });
      return;
    }

    setActiveTab(tab);
  };

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18nInstance.language === "ar" ? ar : enUS;
  };

  // Format date for current locale
  const formatDateForLocale = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "PPP", { locale: getDateLocale() });
  };

  // Dynamic chart data that updates with language changes
  const [chartData, setChartData] = useState({
    revenueData: [] as Array<{
      month: string;
      revenue: number;
      commission: number;
      payout: number;
    }>,
    userGrowthData: [] as Array<{
      month: string;
      visitors: number;
      registered: number;
      active: number;
    }>,
    cardStatusData: [] as Array<{ name: string; value: number; color: string }>,
    eventCategoryData: [] as Array<{
      name: string;
      value: number;
      color: string;
    }>,
  });

  // Fetch dashboard statistics from API
  const { data: dashboardStatsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const stats = await dashboardApi.getStats();
      return stats;
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  // Fetch revenue analytics
  const { data: revenueData } = useQuery({
    queryKey: ['revenueAnalytics'],
    queryFn: async () => {
      const data = await dashboardApi.getRevenueAnalytics();
      return data;
    },
  });

  // Fetch user growth analytics
  const { data: userGrowthData } = useQuery({
    queryKey: ['userGrowthAnalytics'],
    queryFn: async () => {
      const data = await dashboardApi.getUserGrowthAnalytics();
      return data;
    },
  });

  // Fetch card status analytics
  const { data: cardStatusData } = useQuery({
    queryKey: ['cardStatusAnalytics'],
    queryFn: async () => {
      const data = await dashboardApi.getCardStatusAnalytics();
      return data;
    },
  });

  // Fetch event categories analytics
  const { data: eventCategoryData } = useQuery({
    queryKey: ['eventCategoriesAnalytics'],
    queryFn: async () => {
      const data = await dashboardApi.getEventCategoriesAnalytics();
      return data;
    },
  });

  // Transform API chart data when API data or language changes
  useEffect(() => {
    // Transform revenue data from API
    const transformedRevenueData = revenueData?.map((item: any) => {
      const date = new Date(item.month + '-01');
      const monthNames = [
        t("admin.dashboard.stats.months.jan"),
        t("admin.dashboard.stats.months.feb"),
        t("admin.dashboard.stats.months.mar"),
        t("admin.dashboard.stats.months.apr"),
        t("admin.dashboard.stats.months.may"),
        t("admin.dashboard.stats.months.jun"),
        t("admin.dashboard.stats.months.jul"),
        t("admin.dashboard.stats.months.aug"),
        t("admin.dashboard.stats.months.sep"),
        t("admin.dashboard.stats.months.oct"),
        t("admin.dashboard.stats.months.nov"),
        t("admin.dashboard.stats.months.dec"),
      ];
      return {
        month: monthNames[date.getMonth()] || item.month,
        revenue: parseFloat(item.revenue) || 0,
        commission: parseFloat(item.revenue) * 0.1 || 0, // 10% commission (adjust based on backend)
        payout: parseFloat(item.revenue) * 0.9 || 0,
      };
    }) || [];

    // Transform user growth data from API
    const transformedUserGrowthData = userGrowthData?.map((item: any) => {
      const date = new Date(item.month + '-01');
      const monthNames = [
        t("admin.dashboard.stats.months.jan"),
        t("admin.dashboard.stats.months.feb"),
        t("admin.dashboard.stats.months.mar"),
        t("admin.dashboard.stats.months.apr"),
        t("admin.dashboard.stats.months.may"),
        t("admin.dashboard.stats.months.jun"),
        t("admin.dashboard.stats.months.jul"),
        t("admin.dashboard.stats.months.aug"),
        t("admin.dashboard.stats.months.sep"),
        t("admin.dashboard.stats.months.oct"),
        t("admin.dashboard.stats.months.nov"),
        t("admin.dashboard.stats.months.dec"),
      ];
      return {
        month: monthNames[date.getMonth()] || item.month,
        visitors: item.registered * 5 || 0, // Estimate visitors (adjust based on backend)
        registered: item.registered || 0,
        active: item.active || 0,
      };
    }) || [];

    // Transform card status data from API
    const transformedCardStatusData = cardStatusData?.map((item: any) => {
      const statusColors: Record<string, string> = {
        active: "#10b981",
        inactive: "#6b7280",
        expired: "#ef4444",
      };
      const statusLabels: Record<string, string> = {
        active: t("admin.dashboard.stats.labels.activeCards"),
        inactive: t("admin.dashboard.stats.labels.inactiveCards"),
        expired: t("admin.dashboard.stats.labels.expiredCards"),
      };
      return {
        name: statusLabels[item.status] || item.status,
        value: item.count || 0,
        color: statusColors[item.status] || "#6b7280",
      };
    }) || [];

    // Transform event category data from API
    const transformedEventCategoryData = eventCategoryData?.map((item: any, index: number) => {
      const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#6b7280"];
      return {
        name: item.category__name || t("admin.dashboard.stats.labels.other"),
        value: item.count || 0,
        color: colors[index % colors.length],
      };
    }) || [];

    setChartData({
      revenueData: transformedRevenueData,
      userGrowthData: transformedUserGrowthData,
      cardStatusData: transformedCardStatusData,
      eventCategoryData: transformedEventCategoryData,
    });
  }, [revenueData, userGrowthData, cardStatusData, eventCategoryData, t, i18nInstance.language]);

  useEffect(() => {
    if (localStorage.getItem("admin_authenticated") !== "true") {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const storedLang = localStorage.getItem("appLanguage");
    if (storedLang) {
      i18nInstance.changeLanguage(storedLang);
    }
  }, [i18nInstance]);

  const toggleLanguage = () => {
    const newLang = i18nInstance.language === "ar" ? "en" : "ar";
    i18nInstance.changeLanguage(newLang);
    localStorage.setItem("appLanguage", newLang);
    toast({
      title: t("admin.dashboard.actions.logout"),
      description: t("admin.dashboard.actions.logoutSuccess"),
    });
  };

  const handleLogout = async () => {
    try {
      // Call logout API
      const { authApi } = await import("@/lib/api/adminApi");
      await authApi.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem("admin_authenticated");
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      localStorage.removeItem("admin_user");
      navigate("/login");
      toast({
        title: t("admin.dashboard.actions.logout"),
        description: t("admin.dashboard.actions.logoutSuccess"),
      });
    }
  };

  // Transform API data to match DashboardStats interface
  const dashboardStats: DashboardStats = dashboardStatsData ? {
    // Event Analytics
    totalEvents: dashboardStatsData.total_events || 0,
    totalTicketsSold: dashboardStatsData.total_tickets_sold || 0,
    totalAttendees: dashboardStatsData.total_attendees || 0,

    // Financial Summary
    totalRevenues: dashboardStatsData.total_revenue || 0, // Fixed: backend returns total_revenue not total_revenues
    cutCommissions: dashboardStatsData.cut_commissions || 0, // Fixed: backend returns cut_commissions not commissions
    pendingPayouts: dashboardStatsData.pending_payouts || 0,
    completedPayouts: dashboardStatsData.completed_payouts || 0,
    cardSales: dashboardStatsData.card_sales || 0,
    grossProfit: dashboardStatsData.gross_profit || 0,

    // User Summary
    totalVisitors: dashboardStatsData.total_visitors || 0,
    registeredUsers: dashboardStatsData.registered_users || 0,
    activeUsers: dashboardStatsData.active_users || 0,
    inactiveUsers: dashboardStatsData.inactive_users || 0,
    recurrentUsers: dashboardStatsData.recurrent_users || 0,

    // Card Summary
    totalCards: dashboardStatsData.total_cards || 0,
    activeCards: dashboardStatsData.active_cards || 0,
    inactiveCards: dashboardStatsData.inactive_cards || 0,
    expiredCards: dashboardStatsData.expired_cards || 0,
  } : {
    // Default values while loading
    totalEvents: 0,
    totalTicketsSold: 0,
    totalAttendees: 0,
    totalRevenues: 0,
    cutCommissions: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    cardSales: 0,
    grossProfit: 0,
    totalVisitors: 0,
    registeredUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    recurrentUsers: 0,
    totalCards: 0,
    activeCards: 0,
    inactiveCards: 0,
    expiredCards: 0,
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div
      className="min-h-screen bg-gradient-dark"
      dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
    >
      <style>
        {`
          .rtl-label {
            text-align: right !important;
            direction: rtl !important;
          }
          .ltr-label {
            text-align: left !important;
            direction: ltr !important;
          }
          /* RTL Chart Styles */
          [dir="rtl"] .recharts-wrapper {
            direction: rtl;
          }
          [dir="rtl"] .recharts-cartesian-axis-tick-value {
            text-anchor: start !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-legend-item-text {
            text-align: right !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-tooltip-wrapper {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-tooltip-content {
            text-align: right !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-pie-label-text {
            text-anchor: middle !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-legend-wrapper {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-legend-item {
            direction: rtl !important;
          }
          /* Chart container RTL */
          [dir="rtl"] .chart-container {
            direction: rtl;
          }
          /* Additional RTL chart styles */
          [dir="rtl"] .recharts-cartesian-axis-tick {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-cartesian-axis-line {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-cartesian-grid-horizontal line {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-cartesian-grid-vertical line {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-tooltip-cursor {
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-default-tooltip {
            text-align: right !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-tooltip-item {
            text-align: right !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-tooltip-item-list {
            text-align: right !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-legend-item-text {
            text-align: right !important;
            direction: rtl !important;
          }
          [dir="rtl"] .recharts-legend-item {
            flex-direction: row-reverse !important;
          }
          [dir="rtl"] .recharts-legend-item .recharts-legend-icon {
            margin-left: 8px !important;
            margin-right: 0 !important;
          }
          /* Arabic number formatting */
          [dir="rtl"] .arabic-number {
            font-family: 'Arial', sans-serif;
            direction: ltr;
            unicode-bidi: bidi-override;
          }
          /* RTL number containers */
          [dir="rtl"] .number-container {
            direction: ltr;
            text-align: right;
          }
          /* RTL date formatting */
          [dir="rtl"] .date-container {
            direction: ltr;
            text-align: right;
          }
          /* RTL currency formatting */
          [dir="rtl"] .currency-container {
            direction: ltr;
            text-align: right;
          }
          /* Hide scrollbar for tabs */
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          /* Smooth scrolling for tabs */
          .overflow-x-auto {
            scroll-behavior: smooth;
          }
          /* Enhanced tabs styling */
          .enhanced-tabs {
            position: relative;
            overflow: hidden;
          }
          .enhanced-tabs .tabs-trigger {
            transition: all 0.2s ease-in-out;
            border-radius: 0.5rem;
            font-weight: 500;
          }
          .enhanced-tabs .tabs-trigger[data-state="active"] {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
            transform: translateY(-1px);
          }
          /* Navigation arrows */
          .tabs-nav-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            background: hsl(var(--background) / 0.8);
            backdrop-filter: blur(8px);
            border: 1px solid hsl(var(--border));
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease-in-out;
          }
          .tabs-nav-arrow:hover {
            background: hsl(var(--accent));
            transform: translateY(-50%) scale(1.05);
          }
          /* Overflow menu */
          .tabs-overflow-menu {
            position: absolute;
            right: 0;
            top: 0;
            z-index: 20;
          }
          /* Responsive tab text */
          @media (max-width: 640px) {
            .tabs-trigger-text {
              display: none;
            }
            .tabs-trigger-icon {
              margin: 0;
            }
          }
          /* Tab group separators - removed */
          /* Enhanced group styling */
          .tab-group {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 4px;
          }
          /* Group tab styling */
          .group-tab {
            min-width: fit-content;
            white-space: nowrap;
            border-radius: 0.5rem;
            font-weight: 500;
          }
          .group-tab[data-state="active"] {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
            transform: translateY(-1px);
          }
          /* RTL support for group tabs */
          [dir="rtl"] .group-tab {
            flex-direction: row-reverse;
          }
          [dir="rtl"] .tab-group {
            flex-direction: row-reverse;
          }
          /* Dropdown menu hover functionality - using React state */
          /* RTL tab group separators - removed */
          
          /* Tab transition effects */
          .tabs-content-transition {
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease-in-out;
          }
          
          .tabs-content-transition[data-state="active"] {
            opacity: 1;
            transform: translateY(0);
          }
          
          /* Enhanced tab content animations */
          [data-state="active"] {
            animation: fadeInUp 0.3s ease-out;
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-8 flex-shrink-0 rtl:space-x-reverse">
              {isDark ? (
                <img
                  src="/ticket-logo.png"
                  alt={t("footer.logoAlt")}
                  className="h-10 w-auto sm:h-12 md:h-14"
                />
              ) : (
                <img
                  src="/ticket-logo-secondary.png"
                  alt={t("footer.logoAlt")}
                  className="h-10 w-auto sm:h-12 md:h-14"
                />
              )}
              <div className="hidden sm:block rtl:mr-6 ltr:ml-6">
                <span className="text-lg font-bold text-foreground">
                  {t("admin.dashboard.title")}
                </span>
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-x-2 ltr:flex-row rtl:flex-row-reverse">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <Sun className="h-4 w-4 text-foreground" />
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="data-[state=checked]:bg-primary"
                />
                <Moon className="h-4 w-4 text-foreground" />
              </div>
              <Button
                variant="header"
                size="icon"
                onClick={toggleLanguage}
                className="rtl:flex-row-reverse"
              >
                <span className="text-xs rtl:ml-0 ltr:ml-1 text-foreground">
                  {language}
                </span>
              </Button>
              <Button variant="header" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4 text-foreground" />
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2 rtl:flex-row-reverse">
              <Button
                variant="header"
                size="icon"
                onClick={toggleLanguage}
                className="rtl:flex-row-reverse"
              >
                <span className="text-xs text-foreground">{language}</span>
              </Button>
              <Button variant="header" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4 text-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 rtl:text-right">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {t("admin.dashboard.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.dashboard.subtitle")}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          defaultValue="dashboard"
          className="space-y-6"
        >
          <EnhancedTabsList
            activeTab={activeTab}
            onTabChange={handleTabChange}
            t={t}
            i18nInstance={i18nInstance}
            hasPermission={hasPermission}
            isSuperAdmin={isSuperAdmin}
          />

          {/* Dashboard Tab */}
          <TabsContent
            value="dashboard"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            {/* Dashboard Header with Export */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rtl:flex-row-reverse">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
                  {t("admin.dashboard.tabs.dashboard")}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
                  {t("admin.dashboard.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <ExportDialog
                  data={[
                    // Event Analytics
                    {
                      metric: t("admin.dashboard.stats.totalEvents"),
                      value: dashboardStats.totalEvents,
                      category: "Event Analytics",
                    },
                    {
                      metric: t("admin.dashboard.stats.ticketsSold"),
                      value: dashboardStats.totalTicketsSold,
                      category: "Event Analytics",
                    },
                    {
                      metric: t("admin.dashboard.stats.totalAttendees"),
                      value: dashboardStats.totalAttendees,
                      category: "Event Analytics",
                    },
                    // Financial Summary
                    {
                      metric: t("admin.dashboard.stats.totalRevenue"),
                      value: dashboardStats.totalRevenues,
                      category: "Financial Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.commission"),
                      value: dashboardStats.cutCommissions,
                      category: "Financial Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.pendingPayouts"),
                      value: dashboardStats.pendingPayouts,
                      category: "Financial Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.completedPayouts"),
                      value: dashboardStats.completedPayouts,
                      category: "Financial Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.cardSales"),
                      value: dashboardStats.cardSales,
                      category: "Financial Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.grossProfit"),
                      value: dashboardStats.grossProfit,
                      category: "Financial Summary",
                    },
                    // User Summary
                    {
                      metric: t("admin.dashboard.stats.totalVisitors"),
                      value: dashboardStats.totalVisitors,
                      category: "User Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.registeredUsers"),
                      value: dashboardStats.registeredUsers,
                      category: "User Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.activeUsers"),
                      value: dashboardStats.activeUsers,
                      category: "User Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.inactiveUsers"),
                      value: dashboardStats.inactiveUsers,
                      category: "User Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.recurrentUsers"),
                      value: dashboardStats.recurrentUsers,
                      category: "User Summary",
                    },
                    // Card Summary
                    {
                      metric: t("admin.dashboard.stats.totalCards"),
                      value: dashboardStats.totalCards,
                      category: "Card Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.activeCards"),
                      value: dashboardStats.activeCards,
                      category: "Card Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.inactiveCards"),
                      value: dashboardStats.inactiveCards,
                      category: "Card Summary",
                    },
                    {
                      metric: t("admin.dashboard.stats.expiredCards"),
                      value: dashboardStats.expiredCards,
                      category: "Card Summary",
                    },
                  ]}
                  columns={commonColumns.dashboardStats}
                  title={t("admin.dashboard.tabs.dashboard")}
                  subtitle={t("admin.dashboard.subtitle")}
                  filename="dashboard-stats"
                >
                  <Button className="flex items-center gap-2 rtl:flex-row-reverse text-xs sm:text-sm">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
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
              {/* Event Analytics */}
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                  <div className="flex-1 rtl:text-right">
                    <CardTitle className="text-sm font-medium">
                      {t("admin.dashboard.stats.totalEvents")}
                    </CardTitle>
                  </div>
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="rtl:text-right">
                  <div className="text-2xl font-bold number-container">
                    {statsLoading ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      formatNumberForLocale(
                        dashboardStats.totalEvents,
                        i18nInstance.language
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                  <div className="flex-1 rtl:text-right">
                    <CardTitle className="text-sm font-medium">
                      {t("admin.dashboard.stats.ticketsSold")}
                    </CardTitle>
                  </div>
                  <Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="rtl:text-right">
                  <div className="text-2xl font-bold number-container">
                    {statsLoading ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      formatNumberForLocale(
                        dashboardStats.totalTicketsSold,
                        i18nInstance.language
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                  <div className="flex-1 rtl:text-right">
                    <CardTitle className="text-sm font-medium">
                      {t("admin.dashboard.stats.totalRevenue") || "Total Revenue"}
                    </CardTitle>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="rtl:text-right">
                  <div className="text-2xl font-bold currency-container">
                    {statsLoading ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      formatCurrencyForLocale(
                        dashboardStats.totalRevenues,
                        i18nInstance.language
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                  <div className="flex-1 rtl:text-right">
                    <CardTitle className="text-sm font-medium">
                      {t("admin.dashboard.stats.trRevenue") || "TR Revenue"}
                    </CardTitle>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="rtl:text-right">
                  <div className="text-2xl font-bold currency-container">
                    {statsLoading ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      formatCurrencyForLocale(
                        dashboardStats.cutCommissions,
                        i18nInstance.language
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2 rtl:flex-row-reverse">
                  <div className="flex-1 rtl:text-right">
                    <CardTitle className="text-sm font-medium">
                      {t("admin.dashboard.stats.registeredUsers")}
                    </CardTitle>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="rtl:text-right">
                  <div className="text-2xl font-bold number-container">
                    {statsLoading ? (
                      <span className="text-muted-foreground">...</span>
                    ) : (
                      formatNumberForLocale(
                        dashboardStats.registeredUsers,
                        i18nInstance.language
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Statistics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rtl:space-x-reverse">
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <DollarSign className="h-5 w-5" />
                    {t("admin.dashboard.stats.financialSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 rtl:text-right">
                  <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                    <div className="text-center p-3 bg-green-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-green-600 currency-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatCurrencyForLocale(
                            dashboardStats.totalRevenues,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.totalRevenue")}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-blue-600 currency-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatCurrencyForLocale(
                            dashboardStats.cutCommissions,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.eventsRevenue") || "Events Revenue"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-yellow-600 currency-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatCurrencyForLocale(
                            dashboardStats.pendingPayouts,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.pendingPayouts")}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-purple-600 currency-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatCurrencyForLocale(
                            dashboardStats.cardSales,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.cardSales")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Users className="h-5 w-5" />
                    {t("admin.dashboard.stats.userSummary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 rtl:text-right">
                  <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                    <div className="text-center p-3 bg-blue-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-blue-600 number-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatNumberForLocale(
                            dashboardStats.totalVisitors,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.totalVisitors")}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-green-600 number-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatNumberForLocale(
                            dashboardStats.activeUsers,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.activeUsers")}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-orange-600 number-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatNumberForLocale(
                            dashboardStats.recurrentUsers,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.recurrentUsers")}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg rtl:text-right">
                      <p className="text-xl font-bold text-red-600 number-container">
                        {statsLoading ? (
                          <span className="text-muted-foreground">...</span>
                        ) : (
                          formatNumberForLocale(
                            dashboardStats.inactiveUsers,
                            i18nInstance.language
                          )
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("admin.dashboard.stats.inactiveUsers")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events Management Tab */}
          <TabsContent
            value="events"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <EventsManagement />
          </TabsContent>

          {/* Venues Management Tab */}
          {hasPermission("venues_view") && (
            <TabsContent
              value="venues"
              className="space-y-6 transition-all duration-300 ease-in-out"
            >
              <VenueManagement />
            </TabsContent>
          )}

          {/* Tickets Management Tab */}
          <TabsContent
            value="tickets"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <TicketsManagement />
          </TabsContent>

          {/* NFC Card Management Tab */}
          {hasPermission("nfc_cards_view") && (
            <TabsContent
              value="nfc"
              className="space-y-6 transition-all duration-300 ease-in-out"
            >
              <NFCCardManagement />
            </TabsContent>
          )}

          {/* Customer Management Tab */}
          <TabsContent
            value="customers"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <CustomerManagement />
          </TabsContent>

          {/* Home Page Sections Management Tab */}
          <TabsContent
            value="home-page-sections"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <HomePageSectionsManagement />
          </TabsContent>

          {/* Organizers Management Tab */}
          <TabsContent
            value="organizers"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <OrganizersManagement />
          </TabsContent>

          {/* Organizer Requests Tab */}
          <TabsContent
            value="organizer-requests"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <OrganizerRequestsManagement />
          </TabsContent>

          {/* Event Edit Requests Tab */}
          <TabsContent
            value="event-edit-requests"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <EventEditRequestsManagement />
          </TabsContent>

          {/* Usher Management Tab */}
          <TabsContent
            value="ushers"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <UsherManagement />
          </TabsContent>

          {/* Admin User Management Tab */}
          <TabsContent
            value="admins"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <AdminUserManagement />
          </TabsContent>

          {/* Merchant Management Tab */}
          <TabsContent
            value="merchants"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <MerchantManagement />
          </TabsContent>

          {/* Merchant Locations Tab */}
          <TabsContent
            value="merchant-locations"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <MerchantLocationsManagement />
          </TabsContent>

          {/* System Logs Tab */}
          {hasPermission("logs_view") && (
            <TabsContent
              value="logs"
              className="space-y-6 transition-all duration-300 ease-in-out"
            >
              <SystemLogs />
            </TabsContent>
          )}

          {/* Expenses Tab */}
          <TabsContent
            value="expenses"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <ExpensesManagement />
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent
            value="payouts"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <PayoutsManagement />
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent
            value="payments"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <PaymentsManagement />
          </TabsContent>

          {/* Account Settings Tab */}
          <TabsContent
            value="account-settings"
            className="space-y-6 transition-all duration-300 ease-in-out"
          >
            <AdminAccountSettings />
          </TabsContent>

          {/* Company Finances Tab */}
          {hasPermission("finances_view") && (
            <TabsContent
              value="company-finances"
              className="space-y-6 transition-all duration-300 ease-in-out"
            >
              <CompanyFinances />
            </TabsContent>
          )}

        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
