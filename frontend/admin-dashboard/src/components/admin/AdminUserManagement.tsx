import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/adminApi";
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
  Activity,
  Crown,
  Users,
  UserCog,
  Key,
  LogOut,
  Calendar,
  EyeOff,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { formatNumberForLocale, formatPhoneNumberForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "super_admin" | "admin" | "usher" | "support";
  status: "active" | "inactive";
  lastLogin: string;
  permissions: string[];
  createdAt: string;
  profileImage?: string;
  fullName: string;
  phone?: string;
};

type Permission = {
  id: string;
  name: string;
  description: string;
  category: string;
};

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
};

type UserActivity = {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failed" | "warning";
};

type UserType = "admins" | "organizers" | "merchants" | "ushers";

const AdminUserManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { hasPermission, requirePermission } = usePermissions();
  const queryClient = useQueryClient();
  const [userType, setUserType] = useState<UserType>("admins");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isCreateCredentialsDialogOpen, setIsCreateCredentialsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<
    string[]
  >([]);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [editingRoleDescription, setEditingRoleDescription] = useState("");
  const [newUser, setNewUser] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: string;
    password: string;
    permissions: string[];
    category?: string;
    location?: string;
    status?: string;
  }>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    role: "admin",
    password: "",
    permissions: [],
    category: "",
    location: "",
    status: "pending",
  });
  const [credentialsForm, setCredentialsForm] = useState({
    username: "",
    password: "",
  });
  const [editFormData, setEditFormData] = useState<{
    fullName: string;
    username: string;
    email: string;
    phone: string;
    status: string;
  }>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    status: "active",
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // Build query params based on userType and filters
  const getQueryParams = () => {
    const params: any = {
      page: currentPage,
      page_size: itemsPerPage,
    };
    
    if (searchTerm) params.search = searchTerm;
    if (statusFilter !== 'all') {
      if (userType === 'admins') {
        params.is_active = statusFilter === 'active';
      } else {
        params.status = statusFilter;
      }
    }
    if (userType === 'admins' && roleFilter !== 'all') {
      params.role = roleFilter.toUpperCase().replace('_', '_');
    }
    if (userType === 'organizers' && roleFilter !== 'all') {
      params.verified = roleFilter === 'verified';
    }
    if (userType === 'merchants' && roleFilter !== 'all') {
      params.verification_status = roleFilter;
    }
    return params;
  };

  // Fetch users based on userType - using separate queries
  const adminsQuery = useQuery({
    queryKey: ['admins', searchTerm, roleFilter, statusFilter, currentPage, itemsPerPage],
    queryFn: () => usersApi.getAdmins(getQueryParams()),
    enabled: userType === 'admins',
  });

  const organizersQuery = useQuery({
    queryKey: ['organizers', searchTerm, roleFilter, statusFilter, currentPage, itemsPerPage],
    queryFn: () => usersApi.getOrganizers(getQueryParams()),
    enabled: userType === 'organizers',
  });

  const merchantsQuery = useQuery({
    queryKey: ['merchants', searchTerm, roleFilter, statusFilter, currentPage, itemsPerPage],
    queryFn: () => usersApi.getMerchants(getQueryParams()),
    enabled: userType === 'merchants',
  });

  const ushersQuery = useQuery({
    queryKey: ['ushers', searchTerm, roleFilter, statusFilter, currentPage, itemsPerPage],
    queryFn: () => usersApi.getUshers(getQueryParams()),
    enabled: userType === 'ushers',
  });

  // Get the active query based on userType
  const usersData = userType === 'admins' ? adminsQuery.data 
    : userType === 'organizers' ? organizersQuery.data
    : userType === 'merchants' ? merchantsQuery.data
    : ushersQuery.data;
  
  const usersLoading = userType === 'admins' ? adminsQuery.isLoading
    : userType === 'organizers' ? organizersQuery.isLoading
    : userType === 'merchants' ? merchantsQuery.isLoading
    : ushersQuery.isLoading;
  
  const usersError = userType === 'admins' ? adminsQuery.error
    : userType === 'organizers' ? organizersQuery.error
    : userType === 'merchants' ? merchantsQuery.error
    : ushersQuery.error;

  // Transform API users to match AdminUser interface
  const adminUsers: AdminUser[] = useMemo(() => {
    if (!usersData?.results) return [];
    
    return usersData.results.map((item: any) => {
      // Transform based on user type
      if (userType === 'admins') {
        return {
          id: item.id?.toString() || '',
          username: item.username || '',
          email: item.email || '',
          fullName: `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username,
          role: (item.role?.toLowerCase() || 'admin') as "super_admin" | "admin" | "usher" | "support",
          status: (item.is_active ? 'active' : 'inactive') as "active" | "inactive",
          lastLogin: item.last_login || '',
          permissions: item.permissions || [], // Get permissions from API response
          createdAt: item.date_joined || item.created_at || '',
          phone: item.phone || undefined,
        };
      } else if (userType === 'organizers') {
        return {
          id: item.id?.toString() || '',
          username: item.user?.username || item.contact_mobile || '',
          email: item.user?.email || item.contact_email || '',
          fullName: item.organization_name || item.user?.first_name || '',
          role: 'admin' as const, // Organizers shown as admin role
          status: (item.user?.is_active ? 'active' : 'inactive') as "active" | "inactive",
          lastLogin: item.user?.last_login || '',
          permissions: [],
          createdAt: item.created_at || item.user?.date_joined || '',
          phone: item.contact_mobile || undefined,
        };
      } else if (userType === 'merchants') {
        return {
          id: item.id?.toString() || '',
          username: item.user?.username || item.mobile_number || '',
          email: item.user?.email || '',
          fullName: item.store_name || item.user?.first_name || '',
          role: 'admin' as const,
          status: (item.user?.is_active ? 'active' : 'inactive') as "active" | "inactive",
          lastLogin: item.user?.last_login || '',
          permissions: [],
          createdAt: item.created_at || item.user?.date_joined || '',
          phone: item.mobile_number || undefined,
        };
      } else { // ushers
        return {
          id: item.id?.toString() || '',
          username: item.user?.username || item.phone_number || '',
          email: item.user?.email || '',
          fullName: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim() || item.user?.username || '',
          role: 'usher' as const,
          status: (item.user?.is_active ? 'active' : 'inactive') as "active" | "inactive",
          lastLogin: item.user?.last_login || '',
          permissions: [],
          createdAt: item.created_at || item.user?.date_joined || '',
          phone: item.phone_number || undefined,
        };
      }
    });
  }, [usersData, userType]);

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating user with data:', JSON.stringify(data, null, 2));
      switch (userType) {
        case 'admins':
          return await usersApi.createAdmin(data);
        case 'organizers':
          return await usersApi.createOrganizer(data);
        case 'merchants':
          return await usersApi.createMerchant(data);
        case 'ushers':
          return await usersApi.createUsher(data);
        default:
          throw new Error('Invalid user type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userType] });
      toast({
        title: t("admin.users.toast.userAdded"),
        description: t("admin.users.toast.userAddedDesc"),
      });
      setIsAddDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
      
      // Extract error message from various possible structures
      let errorMessage = '';
      const errorData = error.response?.data;
      
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData?.error?.details) {
        // If details is an object with field errors
        const details = errorData.error.details;
        const fieldErrors = Object.keys(details).map(field => {
          const messages = Array.isArray(details[field]) ? details[field] : [details[field]];
          return `${field}: ${messages.join(', ')}`;
        });
        errorMessage = fieldErrors.join('; ');
      } else if (errorData?.password) {
        errorMessage = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
      } else if (errorData?.username) {
        errorMessage = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
      } else if (errorData?.email) {
        errorMessage = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
      } else if (errorData?.permissions) {
        errorMessage = Array.isArray(errorData.permissions) ? errorData.permissions[0] : errorData.permissions;
      } else if (typeof errorData === 'object') {
        // Try to extract any field errors
        const fieldErrors = Object.keys(errorData).map(key => {
          const value = errorData[key];
          if (Array.isArray(value)) {
            return `${key}: ${value[0]}`;
          } else if (typeof value === 'string') {
            return `${key}: ${value}`;
          }
          return null;
        }).filter(Boolean);
        errorMessage = fieldErrors.length > 0 ? fieldErrors.join('; ') : JSON.stringify(errorData);
      } else {
        errorMessage = errorData || error.message || t("admin.users.toast.error");
      }
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      switch (userType) {
        case 'admins':
          return await usersApi.updateAdmin(id, data);
        case 'organizers':
          return await usersApi.updateOrganizer(id, data);
        case 'merchants':
          return await usersApi.updateMerchant(id, data);
        case 'ushers':
          return await usersApi.updateUsher(id, data);
        default:
          throw new Error('Invalid user type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userType] });
      toast({
        title: t("admin.users.toast.userUpdated"),
        description: t("admin.users.toast.userUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Update user error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.username?.[0]
        || error.response?.data?.email?.[0]
        || error.response?.data?.password?.[0]
        || error.message 
        || t("admin.users.toast.error");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      switch (userType) {
        case 'admins':
          return await usersApi.deleteAdmin(id);
        case 'organizers':
          return await usersApi.deleteOrganizer(id);
        case 'merchants':
          return await usersApi.deleteMerchant(id);
        case 'ushers':
          return await usersApi.deleteUsher(id);
        default:
          throw new Error('Invalid user type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userType] });
      toast({
        title: t("admin.users.toast.userDeleted"),
        description: t("admin.users.toast.userDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      console.error('Delete user error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.detail
        || error.message 
        || t("admin.users.toast.error");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mock user activity data
  const userActivities: UserActivity[] = [
    {
      id: "1",
      action: "Login",
      description: "User logged in successfully",
      timestamp: "2025-08-16T14:30:00",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      status: "success",
    },
    {
      id: "2",
      action: "View Event",
      description: "Viewed event details for 'Summer Concert 2025'",
      timestamp: "2025-08-16T14:25:00",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      status: "success",
    },
    {
      id: "3",
      action: "Edit Ticket",
      description: "Modified ticket #TKT-2025-001",
      timestamp: "2025-08-16T14:20:00",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      status: "success",
    },
    {
      id: "4",
      action: "Failed Login",
      description: "Incorrect password attempt",
      timestamp: "2025-08-16T14:15:00",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      status: "failed",
    },
    {
      id: "5",
      action: "Export Report",
      description: "Exported user activity report",
      timestamp: "2025-08-16T14:10:00",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      status: "success",
    },
    {
      id: "6",
      action: "Permission Change",
      description: "Updated user permissions",
      timestamp: "2025-08-16T14:05:00",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      status: "warning",
    },
  ];

  // Mock admin users data (removed - using API now)
  /*
  const adminUsers: AdminUser[] = [
    {
      id: "A001",
      username: "admin",
      email: "admin@ticketrunners.com",
      fullName: "System Administrator",
      role: "super_admin",
      status: "active",
      lastLogin: "2025-08-16T10:30:00",
      permissions: ["all"],
      createdAt: "2024-01-01",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "A002",
      username: "manager",
      email: "manager@ticketrunners.com",
      fullName: "Event Manager",
      role: "admin",
      status: "active",
      lastLogin: "2025-08-15T15:45:00",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      createdAt: "2024-02-15",
      profileImage: "/public/Portrait_Placeholder.png",
    },
    {
      id: "A003",
      username: "usher1",
      email: "usher1@ticketrunners.com",
      fullName: "Ahmed Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T09:15:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-03-10",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 1234 5678",
    },
    {
      id: "A004",
      username: "support1",
      email: "support1@ticketrunners.com",
      fullName: "Sarah Support",
      role: "support",
      status: "inactive",
      lastLogin: "2025-07-20T14:20:00",
      permissions: ["customers_manage", "tickets_view", "reports_view"],
      createdAt: "2024-04-05",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 2345 6789",
    },
    {
      id: "A005",
      username: "usher2",
      email: "usher2@ticketrunners.com",
      fullName: "Omar Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T11:00:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-05-12",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 3456 7890",
    },
    {
      id: "A006",
      username: "admin2",
      email: "admin2@ticketrunners.com",
      fullName: "Fatima Admin",
      role: "admin",
      status: "active",
      lastLogin: "2025-08-16T08:30:00",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      createdAt: "2024-06-01",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 4567 8901",
    },
    {
      id: "A007",
      username: "usher3",
      email: "usher3@ticketrunners.com",
      fullName: "Hassan Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T12:15:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-06-15",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 5678 9012",
    },
    {
      id: "A008",
      username: "support2",
      email: "support2@ticketrunners.com",
      fullName: "Layla Support",
      role: "support",
      status: "active",
      lastLogin: "2025-08-16T07:45:00",
      permissions: ["customers_manage", "tickets_view", "reports_view"],
      createdAt: "2024-07-01",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 6789 0123",
    },
    {
      id: "A009",
      username: "usher4",
      email: "usher4@ticketrunners.com",
      fullName: "Youssef Usher",
      role: "usher",
      status: "inactive",
      lastLogin: "2025-07-25T16:20:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-07-20",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 7890 1234",
    },
    {
      id: "A010",
      username: "admin3",
      email: "admin3@ticketrunners.com",
      fullName: "Nour Admin",
      role: "admin",
      status: "active",
      lastLogin: "2025-08-16T09:00:00",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      createdAt: "2024-08-01",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 8901 2345",
    },
    {
      id: "A011",
      username: "usher5",
      email: "usher5@ticketrunners.com",
      fullName: "Mariam Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T13:30:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-08-15",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 9012 3456",
    },
    {
      id: "A012",
      username: "support3",
      email: "support3@ticketrunners.com",
      fullName: "Karim Support",
      role: "support",
      status: "active",
      lastLogin: "2025-08-16T10:15:00",
      permissions: ["customers_manage", "tickets_view", "reports_view"],
      createdAt: "2024-09-01",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 0123 4567",
    },
    {
      id: "A013",
      username: "usher6",
      email: "usher6@ticketrunners.com",
      fullName: "Aisha Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T11:45:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-09-15",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 1234 5678",
    },
    {
      id: "A014",
      username: "admin4",
      email: "admin4@ticketrunners.com",
      fullName: "Ziad Admin",
      role: "admin",
      status: "inactive",
      lastLogin: "2025-07-30T14:10:00",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      createdAt: "2024-10-01",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 2345 6789",
    },
    {
      id: "A015",
      username: "usher7",
      email: "usher7@ticketrunners.com",
      fullName: "Dalia Usher",
      role: "usher",
      status: "active",
      lastLogin: "2025-08-16T08:45:00",
      permissions: ["checkin_manage", "tickets_view"],
      createdAt: "2024-10-15",
      profileImage: "/public/Portrait_Placeholder.png",
      phone: "+20 10 3456 7890",
    },
  ];
  */

  // Mock roles data
  const roles: Role[] = [
    {
      id: "super_admin",
      name: "Super Admin",
      description: "Full system access with all permissions",
      permissions: ["all"],
      userCount: 1,
    },
    {
      id: "admin",
      name: "Administrator",
      description: "Manage events, tickets, and view reports",
      permissions: [
        "events_manage",
        "tickets_manage",
        "customers_view",
        "reports_view",
      ],
      userCount: 1,
    },
    {
      id: "usher",
      name: "Usher",
      description: "Check-in tickets and view ticket information",
      permissions: ["checkin_manage", "tickets_view"],
      userCount: 2,
    },
    {
      id: "support",
      name: "Support",
      description: "Manage customers and view reports",
      permissions: ["customers_manage", "tickets_view", "reports_view"],
      userCount: 1,
    },
  ];

  // Comprehensive permissions list covering all portal actions
  const permissions: Permission[] = [
    // System & Dashboard
    {
      id: "system_all_permissions",
      name: "All Permissions (Super Admin)",
      description: "Full system access to all features and actions",
      category: "System",
    },
    {
      id: "dashboard_view",
      name: "View Dashboard",
      description: "Access to the main dashboard with statistics and overview",
      category: "Dashboard",
    },
    {
      id: "analytics_view",
      name: "View Analytics",
      description: "Access to analytics, reports, and data visualizations",
      category: "Analytics",
    },
    
    // Events Management
    {
      id: "events_view",
      name: "View Events",
      description: "View event listings and details",
      category: "Events",
    },
    {
      id: "events_create",
      name: "Create Events",
      description: "Create new events with all details and ticket categories",
      category: "Events",
    },
    {
      id: "events_edit",
      name: "Edit Events",
      description: "Modify existing event details, dates, prices, and settings",
      category: "Events",
    },
    {
      id: "events_delete",
      name: "Delete Events",
      description: "Remove events from the system",
      category: "Events",
    },
    {
      id: "events_publish",
      name: "Publish/Unpublish Events",
      description: "Change event visibility status (publish or unpublish)",
      category: "Events",
    },
    {
      id: "events_manage_tickets",
      name: "Manage Event Tickets",
      description: "Create, edit, and manage ticket categories for events",
      category: "Events",
    },
    
    // Venues Management
    {
      id: "venues_view",
      name: "View Venues",
      description: "View venue listings and details",
      category: "Venues",
    },
    {
      id: "venues_create",
      name: "Create Venues",
      description: "Add new venues with location and capacity information",
      category: "Venues",
    },
    {
      id: "venues_edit",
      name: "Edit Venues",
      description: "Modify venue details, layouts, and sections",
      category: "Venues",
    },
    {
      id: "venues_delete",
      name: "Delete Venues",
      description: "Remove venues from the system",
      category: "Venues",
    },
    
    // Tickets Management
    {
      id: "tickets_view",
      name: "View Tickets",
      description: "View ticket listings, details, and purchase history",
      category: "Tickets",
    },
    {
      id: "tickets_create",
      name: "Create Tickets",
      description: "Manually create tickets for events",
      category: "Tickets",
    },
    {
      id: "tickets_edit",
      name: "Edit Tickets",
      description: "Modify ticket details and status",
      category: "Tickets",
    },
    {
      id: "tickets_delete",
      name: "Delete Tickets",
      description: "Remove tickets from the system",
      category: "Tickets",
    },
    {
      id: "tickets_refund",
      name: "Refund Tickets",
      description: "Process ticket refunds and cancellations",
      category: "Tickets",
    },
    
    // Customers Management
    {
      id: "customers_view",
      name: "View Customers",
      description: "View customer listings, profiles, and purchase history",
      category: "Customers",
    },
    {
      id: "customers_edit",
      name: "Edit Customers",
      description: "Modify customer account details and information",
      category: "Customers",
    },
    {
      id: "customers_ban",
      name: "Ban/Unban Customers",
      description: "Ban or unban customer accounts from accessing the platform",
      category: "Customers",
    },
    {
      id: "customers_delete",
      name: "Delete Customers",
      description: "Remove customer accounts from the system",
      category: "Customers",
    },
    
    // Organizers Management
    {
      id: "organizers_view",
      name: "View Organizers",
      description: "View organizer listings and profile details",
      category: "Organizers",
    },
    {
      id: "organizers_create",
      name: "Create Organizers",
      description: "Add new organizer accounts to the system",
      category: "Organizers",
    },
    {
      id: "organizers_edit",
      name: "Edit Organizers",
      description: "Modify organizer account details and settings",
      category: "Organizers",
    },
    {
      id: "organizers_delete",
      name: "Delete Organizers",
      description: "Remove organizer accounts from the system",
      category: "Organizers",
    },
    {
      id: "organizers_manage_credentials",
      name: "Manage Organizer Credentials",
      description: "Create or reset organizer login credentials",
      category: "Organizers",
    },
    
    // Ushers Management
    {
      id: "ushers_view",
      name: "View Ushers",
      description: "View usher listings, profiles, and performance data",
      category: "Ushers",
    },
    {
      id: "ushers_create",
      name: "Create Ushers",
      description: "Add new usher accounts to the system",
      category: "Ushers",
    },
    {
      id: "ushers_edit",
      name: "Edit Ushers",
      description: "Modify usher account details, roles, and information",
      category: "Ushers",
    },
    {
      id: "ushers_delete",
      name: "Delete Ushers",
      description: "Remove usher accounts from the system",
      category: "Ushers",
    },
    {
      id: "ushers_assign_events",
      name: "Assign Ushers to Events",
      description: "Assign or remove ushers from specific events",
      category: "Ushers",
    },
    {
      id: "ushers_manage_credentials",
      name: "Manage Usher Credentials",
      description: "Create or reset usher login credentials",
      category: "Ushers",
    },
    
    // Admin Users Management
    {
      id: "admins_view",
      name: "View Admin Users",
      description: "View admin user listings and account details",
      category: "Admin Users",
    },
    {
      id: "admins_create",
      name: "Create Admin Users",
      description: "Add new admin user accounts to the system",
      category: "Admin Users",
    },
    {
      id: "admins_edit",
      name: "Edit Admin Users",
      description: "Modify admin user account details and information",
      category: "Admin Users",
    },
    {
      id: "admins_delete",
      name: "Delete Admin Users",
      description: "Remove admin user accounts from the system",
      category: "Admin Users",
    },
    {
      id: "admins_manage_permissions",
      name: "Manage Admin Permissions",
      description: "Assign or modify permissions for admin users",
      category: "Admin Users",
    },
    
    // Merchants Management
    {
      id: "merchants_view",
      name: "View Merchants",
      description: "View merchant account listings and details",
      category: "Merchants",
    },
    {
      id: "merchants_create",
      name: "Create Merchants",
      description: "Add new merchant accounts to the system",
      category: "Merchants",
    },
    {
      id: "merchants_edit",
      name: "Edit Merchants",
      description: "Modify merchant account details and settings",
      category: "Merchants",
    },
    {
      id: "merchants_delete",
      name: "Delete Merchants",
      description: "Remove merchant accounts from the system",
      category: "Merchants",
    },
    {
      id: "merchants_manage_credentials",
      name: "Manage Merchant Credentials",
      description: "Create or reset merchant login credentials",
      category: "Merchants",
    },
    
    // Expenses Management
    {
      id: "expenses_view",
      name: "View Expenses",
      description: "View expense listings and transaction details",
      category: "Expenses",
    },
    {
      id: "expenses_create",
      name: "Create Expenses",
      description: "Add new expense records to the system",
      category: "Expenses",
    },
    {
      id: "expenses_edit",
      name: "Edit Expenses",
      description: "Modify existing expense records and details",
      category: "Expenses",
    },
    {
      id: "expenses_delete",
      name: "Delete Expenses",
      description: "Remove expense records from the system",
      category: "Expenses",
    },
    {
      id: "expenses_approve",
      name: "Approve Expenses",
      description: "Approve or reject expense requests",
      category: "Expenses",
    },
    
    // Payouts Management
    {
      id: "payouts_view",
      name: "View Payouts",
      description: "View payout listings and transaction details",
      category: "Payouts",
    },
    {
      id: "payouts_create",
      name: "Create Payouts",
      description: "Create new payout transactions",
      category: "Payouts",
    },
    {
      id: "payouts_edit",
      name: "Edit Payouts",
      description: "Modify existing payout records and details",
      category: "Payouts",
    },
    {
      id: "payouts_delete",
      name: "Delete Payouts",
      description: "Remove payout records from the system",
      category: "Payouts",
    },
    {
      id: "payouts_approve",
      name: "Approve Payouts",
      description: "Approve or reject payout requests",
      category: "Payouts",
    },
    
    // Payments Management
    {
      id: "payments_view",
      name: "View Payments",
      description: "View payment transactions and history",
      category: "Payments",
    },
    {
      id: "payments_refund",
      name: "Refund Payments",
      description: "Process payment refunds and chargebacks",
      category: "Payments",
    },
    
    // Check-in Management
    {
      id: "checkin_view",
      name: "View Check-in Logs",
      description: "View check-in logs and attendance records",
      category: "Check-ins",
    },
    {
      id: "checkin_manage",
      name: "Manage Check-ins",
      description: "Perform ticket check-ins and manage attendance",
      category: "Check-ins",
    },
    
    // System Logs
    {
      id: "logs_view",
      name: "View System Logs",
      description: "Access system activity logs and audit trails",
      category: "System Logs",
    },
    
    // Home Page Sections
    {
      id: "home_page_view",
      name: "View Home Page Sections",
      description: "View home page section configurations",
      category: "Home Page",
    },
    {
      id: "home_page_create",
      name: "Create Home Page Sections",
      description: "Add new sections to the home page",
      category: "Home Page",
    },
    {
      id: "home_page_edit",
      name: "Edit Home Page Sections",
      description: "Modify home page section content and settings",
      category: "Home Page",
    },
    {
      id: "home_page_delete",
      name: "Delete Home Page Sections",
      description: "Remove sections from the home page",
      category: "Home Page",
    },
    
    // NFC Cards Management
    {
      id: "nfc_cards_view",
      name: "View NFC Cards",
      description: "View NFC card listings and details",
      category: "NFC Cards",
    },
    {
      id: "nfc_cards_create",
      name: "Create NFC Cards",
      description: "Issue new NFC cards to customers",
      category: "NFC Cards",
    },
    {
      id: "nfc_cards_edit",
      name: "Edit NFC Cards",
      description: "Modify NFC card details and settings",
      category: "NFC Cards",
    },
    {
      id: "nfc_cards_delete",
      name: "Delete NFC Cards",
      description: "Remove NFC cards from the system",
      category: "NFC Cards",
    },
    
    // Company Finances
    {
      id: "finances_view",
      name: "View Company Finances",
      description: "View company financial overview and reports",
      category: "Finances",
    },
    {
      id: "finances_manage",
      name: "Manage Company Finances",
      description: "Manage financial settings and configurations",
      category: "Finances",
    },
  ];

  // Filtered users (API handles most filtering, but we filter role client-side if needed)
  const filteredUsers = useMemo(() => {
    // API already handles search and status filtering
    // Only filter by role if needed (for admins, role is already filtered by API)
    if (userType === 'admins' || roleFilter === 'all') {
      return adminUsers;
    }
    // For other user types, role filter might be client-side
    return adminUsers.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesRole;
    });
  }, [adminUsers, roleFilter, userType]);

  // Pagination - API handles pagination, so we use the data directly
  const totalPages = usersData?.total_pages || 1;
  const startIndex = usersData?.page ? (usersData.page - 1) * usersData.page_size : 0;
  const endIndex = startIndex + (usersData?.page_size || itemsPerPage);
  const paginatedUsers = filteredUsers; // API already paginates

  // Sync selectedUser when adminUsers data updates (e.g., after query refetch)
  useEffect(() => {
    if (selectedUser && adminUsers.length > 0) {
      const updatedUser = adminUsers.find((u) => u.id === selectedUser.id);
      if (updatedUser && JSON.stringify(updatedUser.permissions) !== JSON.stringify(selectedUser.permissions)) {
        setSelectedUser(updatedUser);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUsers]);

  // Reset to first page when filters or userType change

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, userType]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-purple-100 text-purple-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "usher":
        return "bg-green-100 text-green-800";
      case "support":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "super_admin":
        return t("admin.users.roles.superAdmin");
      case "admin":
        return t("admin.users.roles.administrator");
      case "usher":
        return t("admin.users.roles.usher");
      case "support":
        return t("admin.users.roles.support");
      default:
        return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.users.status.active");
      case "inactive":
        return t("admin.users.status.inactive");
      default:
        return status;
    }
  };

  const handleEditUser = (user: AdminUser) => {
    if (userType === 'admins' && !requirePermission("admins_edit")) {
      return;
    }
    setSelectedUser(user);
    setEditFormData({
      fullName: user.fullName || "",
      username: user.username || "",
      email: user.email || "",
      phone: user.phone || "",
      status: user.status || "active",
    });
    setProfileImagePreview(user.profileImage || null);
    setProfileImageFile(null);
    setIsEditDialogOpen(true);
  };

  const handleViewUser = (user: AdminUser) => {
    const permissionMap: Record<string, string> = {
      'admins': 'admins_view',
      'organizers': 'organizers_view',
      'merchants': 'merchants_view',
      'ushers': 'ushers_view',
    };
    const permission = permissionMap[userType];
    if (permission && !requirePermission(permission)) {
      return;
    }
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleDeleteUser = (userId: string) => {
    const permissionMap: Record<string, string> = {
      'admins': 'admins_delete',
      'organizers': 'organizers_delete',
      'merchants': 'merchants_delete',
      'ushers': 'ushers_delete',
    };
    const permission = permissionMap[userType];
    if (permission && !requirePermission(permission)) {
      return;
    }
    
    // Find the user to show confirmation
    const user = adminUsers.find((u) => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setIsDeleteDialogOpen(true);
    } else {
      deleteUserMutation.mutate(userId);
    }
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const handleExportUsers = () => {
    toast({
      title: t("admin.users.toast.exportSuccess"),
      description: t("admin.users.toast.exportSuccessDesc"),
    });
  };

  const handleDeactivateUser = (userId: string) => {
    toast({
      title: t("admin.users.toast.userDeactivated"),
      description: t("admin.users.toast.userDeactivatedDesc"),
    });
  };

  const handleReactivateUser = (userId: string) => {
    toast({
      title: t("admin.users.toast.userReactivated"),
      description: t("admin.users.toast.userReactivatedDesc"),
    });
  };

  const handleForcePasswordReset = (userId: string) => {
    toast({
      title: t("admin.users.toast.passwordReset"),
      description: t("admin.users.toast.passwordResetDesc"),
    });
  };

  const handleViewActivity = (userId: string) => {
    const user = adminUsers.find((u) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setIsActivityDialogOpen(true);
    }
  };

  const handleManagePermissions = (userId: string) => {
    if (!requirePermission("admins_manage_permissions")) {
      return;
    }
    const user = adminUsers.find((u) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setSelectedPermissions([...user.permissions]);
      setIsPermissionsDialogOpen(true);
    }
  };

  const handleEditPermissions = (userId: string) => {
    if (userType === 'admins' && !requirePermission("admins_manage_permissions")) {
      return;
    }
    const user = adminUsers.find((u) => u.id === userId);
    if (user) {
      setSelectedUser(user);
      // Prefill with user's current permissions
      setSelectedPermissions([...user.permissions]);
      setIsPermissionsDialogOpen(true);
    }
  };

  const handleAddUser = () => {
    const permissionMap: Record<string, string> = {
      'admins': 'admins_create',
      'organizers': 'organizers_create',
      'merchants': 'merchants_create',
      'ushers': 'ushers_create',
    };
    const permission = permissionMap[userType];
    if (permission && !requirePermission(permission)) {
      return;
    }
    // Validate required fields
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: t("common.error"),
        description: "Username, email, and password are required",
        variant: "destructive",
      });
      return;
    }

    // Validate password length
    if (newUser.password.length < 6) {
      toast({
        title: t("common.error"),
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for API
    const userData: any = {
      username: newUser.username,
      email: newUser.email,
    };

    if (userType === 'admins') {
      // All admins are just admins - role is set to ADMIN by default on backend
      
      // Password is REQUIRED for admins - ensure it's included
      if (!newUser.password || newUser.password.trim() === '') {
        toast({
          title: t("common.error"),
          description: "Password is required for admin users",
          variant: "destructive",
        });
        return;
      }
      userData.password = newUser.password;
      
      // Include permissions if provided
      if (newUser.permissions && newUser.permissions.length > 0) {
        userData.permissions = newUser.permissions;
      } else {
        userData.permissions = [];
      }
      if (newUser.fullName) {
        userData.first_name = newUser.fullName.split(' ')[0] || '';
        userData.last_name = newUser.fullName.split(' ').slice(1).join(' ') || '';
      }
      // Ensure email is included (required field)
      if (!userData.email || userData.email.trim() === '') {
        toast({
          title: t("common.error"),
          description: "Email is required for admin users",
          variant: "destructive",
        });
        return;
      }
      
      // Note: Profile image upload is not supported during admin creation
      // Users can add profile images later via the edit dialog
      // Always send JSON for admin creation (backend doesn't support multipart/form-data)
    } else if (userType === 'organizers') {
      // Organizers require name, email, phone, category, and location
      if (!newUser.fullName || !newUser.email || !newUser.phone) {
        toast({
          title: t("common.error"),
          description: "Name, email, and phone are required for organizers",
          variant: "destructive",
        });
        return;
      }
      userData.name = newUser.fullName;
      userData.email = newUser.email;
      userData.phone = newUser.phone;
      // Set required fields with defaults if not provided
      userData.category = newUser.category || "other";
      userData.location = newUser.location || "Not specified";
      userData.status = newUser.status || "pending";
      userData.contact_mobile = newUser.phone;
      // Include password if provided for organizers
      if (newUser.password && newUser.password.trim() !== '') {
        userData.password = newUser.password;
      }
    } else {
      // For merchants and ushers
      if (newUser.fullName) userData.name = newUser.fullName;
      if (newUser.phone) userData.phone = newUser.phone;
      // Include password if provided
      if (newUser.password && newUser.password.trim() !== '') {
        userData.password = newUser.password;
      }
    }

    createUserMutation.mutate(userData, {
      onSuccess: () => {
        // Reset form
        setNewUser({
          fullName: "",
          username: "",
          email: "",
          phone: "",
          role: "admin",
          password: "",
          permissions: [],
          category: "",
          location: "",
          status: "pending",
        });
        // Clear profile image if one was selected (for admin users, it won't be uploaded)
        setProfileImageFile(null);
        setProfileImagePreview(null);
      },
    });
  };

  const handleEditRoles = () => {
    // This will now open the role editing interface
    setIsRoleDialogOpen(false);
    // For now, we'll edit the first role as an example
    const firstRole = roles[0];
    setEditingRole(firstRole);
    setEditingRoleName(firstRole.name);
    setEditingRoleDescription(firstRole.description);
    setEditingRolePermissions([...firstRole.permissions]);
    setIsEditRoleDialogOpen(true);
  };

  const handleEditSpecificRole = (role: Role) => {
    setEditingRole(role);
    setEditingRoleName(role.name);
    setEditingRoleDescription(role.description);
    setEditingRolePermissions([...role.permissions]);
    setIsEditRoleDialogOpen(true);
  };

  const handleSaveRoleChanges = () => {
    if (editingRole) {
      // In a real app, this would update the role in the database
      // For now, we'll update our local roles array
      const updatedRoles = roles.map((role) =>
        role.id === editingRole.id
          ? {
              ...role,
              name: editingRoleName,
              description: editingRoleDescription,
              permissions: editingRolePermissions,
            }
          : role
      );

      // Update the roles array (in a real app, this would be done through state management)
      console.log("Updated roles:", updatedRoles);

      toast({
        title: t("admin.users.toast.roleUpdated"),
        description: t("admin.users.toast.roleUpdatedDesc"),
      });

      setIsEditRoleDialogOpen(false);
      setEditingRole(null);
      setEditingRoleName("");
      setEditingRoleDescription("");
      setEditingRolePermissions([]);
    }
  };

  const handleRolePermissionToggle = (permissionId: string) => {
    setEditingRolePermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((p) => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSaveUserChanges = () => {
    if (!selectedUser) return;
    
    const formData: any = {
      username: editFormData.username,
      email: editFormData.email,
      first_name: editFormData.fullName.split(' ')[0] || editFormData.fullName,
      last_name: editFormData.fullName.split(' ').slice(1).join(' ') || '',
    };
    
    // Add phone if provided
    if (editFormData.phone) {
      formData.phone = editFormData.phone;
    }
    
    // Add type-specific fields
    if (userType === 'admins') {
      // Role is always ADMIN for admin users, no need to set it
      formData.is_active = editFormData.status === 'active';
    } else {
      formData.status = editFormData.status;
    }
    
    // Handle profile image upload if a new file was selected
    if (profileImageFile) {
      const formDataWithFile = new FormData();
      Object.keys(formData).forEach(key => {
        formDataWithFile.append(key, formData[key]);
      });
      formDataWithFile.append('profile_image', profileImageFile);
      updateUserMutation.mutate({ id: selectedUser.id, data: formDataWithFile });
    } else {
      updateUserMutation.mutate({ id: selectedUser.id, data: formData });
    }
  };

  const getPermissionsForRole = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.permissions : [];
  };

  const getPermissionName = (permissionId: string) => {
    const permission = permissions.find((p) => p.id === permissionId);
    if (permission) {
      // Try to get translated name, fallback to permission.name
      const translationKey = `admin.users.permissions.${permissionId}`;
      const translated = t(translationKey);
      return translated !== translationKey ? translated : permission.name;
    }
    // Try translation for raw permission ID
    const translationKey = `admin.users.permissions.${permissionId}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : permissionId;
  };

  const getCategoryName = (category: string) => {
    const translationKey = `admin.users.permissions.categories.${category}`;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : category;
  };

  // Group permissions by category for better organization
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((permission) => {
      if (!groups[permission.category]) {
        groups[permission.category] = [];
      }
      groups[permission.category].push(permission);
    });
    return groups;
  }, [permissions]);

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

  // Format phone number for current locale
  const formatPhone = (phoneNumber: string) => {
    return formatPhoneNumberForLocale(phoneNumber, i18n.language);
  };

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((p) => p !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      return await usersApi.updateAdmin(id, { permissions });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [userType] });
      // Update selectedUser state with new permissions
      if (selectedUser && selectedUser.id === variables.id) {
        setSelectedUser({
          ...selectedUser,
          permissions: variables.permissions,
        });
      }
      toast({
        title: t("admin.users.toast.permissionsUpdated"),
        description: t("admin.users.toast.permissionsUpdatedDesc") || "Permissions have been updated successfully.",
      });
      setIsPermissionsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.users.toast.error"),
        variant: "destructive",
      });
    },
  });

  const handleSavePermissions = () => {
    if (selectedUser) {
      updatePermissionsMutation.mutate({
        id: selectedUser.id,
        permissions: selectedPermissions,
      });
    }
  };

  const createCredentialsMutation = useMutation({
    mutationFn: async (data: { username: string; password?: string }) => {
      // For admin users, we update the username and password
      if (selectedUser) {
        return await usersApi.updateAdmin(selectedUser.id, data);
      }
      throw new Error('No user selected');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [userType] });
      toast({
        title: t("admin.users.toast.credentialsUpdated") || "Credentials Updated",
        description: t("admin.users.toast.credentialsUpdatedDesc") || "User credentials have been updated successfully",
      });
      setIsCreateCredentialsDialogOpen(false);
      setCredentialsForm({ username: "", password: "" });
      setSelectedUser(null);
    },
    onError: (error: any) => {
      console.error('Update credentials error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.username?.[0]
        || error.response?.data?.password?.[0]
        || error.message 
        || t("admin.users.toast.error");
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreateCredentials = () => {
    if (!credentialsForm.username) {
      toast({
        title: t("common.error"),
        description: t("admin.users.toast.validationError") || "Username is required",
        variant: "destructive",
      });
      return;
    }

    // Password is optional - if provided, validate length
    if (credentialsForm.password && credentialsForm.password.length > 0 && credentialsForm.password.length < 6) {
      toast({
        title: t("common.error"),
        description: t("admin.users.toast.passwordLengthError") || "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    // Only include password if it's provided
    const updateData: any = {
      username: credentialsForm.username,
    };
    
    if (credentialsForm.password && credentialsForm.password.length > 0) {
      updateData.password = credentialsForm.password;
    }

    createCredentialsMutation.mutate(updateData);
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.users.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.users.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsRoleDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.users.actions.manageRoles")}
            </span>
            <span className="sm:hidden">Roles</span>
          </Button>
          <ExportDialog
            data={filteredUsers}
            columns={commonColumns.users}
            title={t("admin.users.title")}
            subtitle={t("admin.users.subtitle")}
            filename="admin-users"
            filters={{
              search: searchTerm,
              role: roleFilter,
              status: statusFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.users.toast.exportSuccess"),
                description: t("admin.users.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.users.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => {
              const permissionMap: Record<string, string> = {
                'admins': 'admins_create',
                'organizers': 'organizers_create',
                'merchants': 'merchants_create',
                'ushers': 'ushers_create',
              };
              const permission = permissionMap[userType];
              if (permission && requirePermission(permission)) {
                setIsAddDialogOpen(true);
              }
            }}
            className="text-xs sm:text-sm"
            disabled={(() => {
              const permissionMap: Record<string, string> = {
                'admins': 'admins_create',
                'organizers': 'organizers_create',
                'merchants': 'merchants_create',
                'ushers': 'ushers_create',
              };
              const permission = permissionMap[userType];
              return permission ? !hasPermission(permission) : false;
            })()}
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.users.actions.addUser")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* User Type Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={userType === "admins" ? "default" : "outline"}
              onClick={() => setUserType("admins")}
              className="text-xs sm:text-sm"
            >
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              {t("admin.users.types.admins")}
            </Button>
            <Button
              variant={userType === "organizers" ? "default" : "outline"}
              onClick={() => setUserType("organizers")}
              className="text-xs sm:text-sm"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              {t("admin.users.types.organizers")}
            </Button>
            <Button
              variant={userType === "merchants" ? "default" : "outline"}
              onClick={() => setUserType("merchants")}
              className="text-xs sm:text-sm"
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              {t("admin.users.types.merchants")}
            </Button>
            <Button
              variant={userType === "ushers" ? "default" : "outline"}
              onClick={() => setUserType("ushers")}
              className="text-xs sm:text-sm"
            >
              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              {t("admin.users.types.ushers")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.users.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.users.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>

            <Select value={roleFilter || undefined} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.users.filters.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.users.filters.allRoles")}
                </SelectItem>
                <SelectItem value="super_admin">
                  {t("admin.users.filters.superAdmin")}
                </SelectItem>
                <SelectItem value="admin">
                  {t("admin.users.filters.administrator")}
                </SelectItem>
                <SelectItem value="usher">
                  {t("admin.users.filters.usher")}
                </SelectItem>
                <SelectItem value="support">
                  {t("admin.users.filters.support")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter || undefined} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.users.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.users.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.users.filters.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.users.filters.inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admin Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.users.table.user")} (
            {formatNumberForLocale(usersData?.count || 0, i18n.language)})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.users.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, usersData?.count || 0)}{" "}
              {t("admin.users.pagination.of")} {usersData?.count || 0}{" "}
              {t("admin.users.pagination.results")}
            </span>
            <Select
              value={itemsPerPage.toString() || undefined}
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
                    {t("admin.users.table.user")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.users.table.contact")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.users.table.role")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.users.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.users.table.created")}
                  </TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">
                    {t("admin.users.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
                    </TableCell>
                  </TableRow>
                ) : usersError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <span className="ml-2 text-red-500">
                        {t("common.error")}: {usersError instanceof Error ? usersError.message : t("admin.users.toast.error")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">{t("admin.users.noUsersFound")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <img
                          src={
                            user.profileImage ||
                            "/public/Portrait_Placeholder.png"
                          }
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="rtl:text-right ltr:text-left">
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="text-sm">{user.email}</p>
                        {user.phone && (
                          <p
                            className="text-sm text-muted-foreground"
                            dir="ltr"
                          >
                            {formatPhone(user.phone)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleText(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>
                        {getStatusText(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm rtl:text-right ltr:text-left">
                        {formatDateForLocale(user.createdAt)}
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
                            {t("admin.users.table.actions")}
                          </DropdownMenuLabel>
                          {userType === 'admins' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.users.actions.editUser") || "Edit Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setCredentialsForm({
                                    username: user.username,
                                    password: "",
                                  });
                                  setIsCreateCredentialsDialogOpen(true);
                                }}
                                className="text-purple-600"
                              >
                                <Key className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {(t("admin.users.actions.editCredentials") === "admin.users.actions.editCredentials" 
                                  ? "Edit Credentials" 
                                  : t("admin.users.actions.editCredentials"))}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.users.actions.deleteUser") || "Delete Admin"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {userType !== 'admins' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleEditUser(user)}
                              >
                                <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.users.actions.editUser")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                                {t("admin.users.actions.deleteUser")}
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
          {!usersLoading && !usersError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.users.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, usersData?.count || 0)} ${t(
                "admin.users.pagination.of"
              )} ${usersData?.count || 0} ${t(
                "admin.users.pagination.results"
              )}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={usersData?.count || 0}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.userDetails")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.userDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="text-center">
                    <img
                      src={
                        selectedUser.profileImage ||
                        "/public/Portrait_Placeholder.png"
                      }
                      alt={selectedUser.fullName}
                      className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                    />
                    <h3 className="text-xl font-bold rtl:text-right ltr:text-left">
                      {selectedUser.fullName}
                    </h3>
                    <p className="text-muted-foreground rtl:text-right ltr:text-left">
                      @{selectedUser.username}
                    </p>
                    <Badge className={getRoleColor(selectedUser.role)}>
                      {getRoleText(selectedUser.role)}
                    </Badge>
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {getStatusText(selectedUser.status)}
                    </Badge>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.users.form.email")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                    {selectedUser.phone && (
                      <div className="rtl:text-right ltr:text-left">
                        <p className="text-sm font-medium">
                          {t("admin.users.form.phone")}
                        </p>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {formatPhone(selectedUser.phone)}
                        </p>
                      </div>
                    )}
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.users.details.createdDate")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateForLocale(selectedUser.createdAt)}
                      </p>
                    </div>
                    <div className="rtl:text-right ltr:text-left">
                      <p className="text-sm font-medium">
                        {t("admin.users.details.lastLogin")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.lastLogin
                          ? formatDateTimeForLocale(selectedUser.lastLogin)
                          : t("admin.users.details.never")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.users.details.permissions")}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedUser.permissions.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center space-x-2 p-2 bg-gray-50 rounded rtl:space-x-reverse"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm rtl:text-right ltr:text-left">
                        {getPermissionName(permission)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetails(false)}>
              {t("admin.users.dialogs.close")}
            </Button>
            <Button onClick={() => handleEditUser(selectedUser!)}>
              {t("admin.users.actions.editUser")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.editUser")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.editUserSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.fullName")}
                  </label>
                  <Input 
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.username")}
                  </label>
                  <Input 
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.email")}
                  </label>
                  <Input 
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.phone")}
                  </label>
                  <Input 
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.status")}
                  </label>
                  <Select 
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.users.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.users.status.inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.profileImage")}
                  </label>
                  <div className="space-y-2">
                    {profileImagePreview && (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <img
                          src={profileImagePreview}
                          alt="Profile preview"
                          className="w-16 h-16 rounded-full object-cover border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfileImagePreview(null);
                            setProfileImageFile(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (5MB)
                          const maxSize = 5 * 1024 * 1024;
                          if (file.size > maxSize) {
                            toast({
                              title: t("common.error"),
                              description: "Image size must be less than 5MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          setProfileImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
                      {t("admin.users.form.profileImagePlaceholder")}
                    </p>
                  </div>
                </div>
              </div>
              {userType === 'admins' && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium mb-2 rtl:text-right ltr:text-left">
                        {t("admin.users.form.permissions")}
                      </h4>
                      <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
                        {selectedUser.permissions.length} {t("admin.users.permissions.selected")}
                      </p>
                      {selectedUser.permissions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {selectedUser.permissions.slice(0, 5).map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {getPermissionName(perm)}
                            </Badge>
                          ))}
                          {selectedUser.permissions.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{selectedUser.permissions.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleEditPermissions(selectedUser.id)}
                    >
                      <Shield className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                      {t("admin.users.actions.editPermissions")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.users.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveUserChanges}>
              {t("admin.users.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.addUser")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.addUserSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1 block">
                  {t("admin.users.form.fullName")}
                </label>
                <Input
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder={t("admin.users.form.fullNamePlaceholder")}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1 block">
                  {t("admin.users.form.username")} *
                </label>
                <Input
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder={t("admin.users.form.usernamePlaceholder")}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1 block">
                  {t("admin.users.form.email")} *
                </label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder={t("admin.users.form.emailPlaceholder")}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1 block">
                  {t("admin.users.form.phone")}
                </label>
                <Input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9+]/g, '');
                    setNewUser({ ...newUser, phone: value });
                  }}
                  placeholder={t("admin.users.form.phonePlaceholder")}
                  dir="ltr"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1 block">
                  {t("admin.users.form.password")} *
                </label>
                <Input
                  type="password"
                  value={newUser.password || ''}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder={t("admin.users.form.passwordPlaceholder")}
                  className="h-9"
                  required
                  autoComplete="new-password"
                />
              </div>
              {userType === 'admins' && (
                <div className="col-span-3">
                  <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1 block">
                    {t("admin.users.form.profileImage")}
                  </label>
                  <div className="space-y-2">
                    {profileImagePreview && (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <img
                          src={profileImagePreview}
                          alt="Profile preview"
                          className="w-16 h-16 rounded-full object-cover border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfileImagePreview(null);
                            setProfileImageFile(null);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (5MB)
                          const maxSize = 5 * 1024 * 1024;
                          if (file.size > maxSize) {
                            toast({
                              title: t("common.error"),
                              description: "Image size must be less than 5MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          setProfileImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
                      {t("admin.users.form.profileImagePlaceholder")}
                    </p>
                  </div>
                </div>
              )}
              {userType === 'admins' && (
                <div className="col-span-3">
                  <label className="text-sm font-medium rtl:text-right ltr:text-left mb-1.5 block">
                    {t("admin.users.form.permissions")} *
                  </label>
                    <div className="h-64 overflow-y-auto border rounded-lg p-3 space-y-3">
                      {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                        <div key={category} className="space-y-1.5">
                          <h6 className="text-xs font-semibold text-gray-700 rtl:text-right ltr:text-left sticky top-0 bg-white py-1">
                            {getCategoryName(category)}
                          </h6>
                          <div className="grid grid-cols-3 gap-1.5">
                            {categoryPermissions.map((permission) => (
                              <button
                                key={permission.id}
                                type="button"
                                onClick={() => {
                                  if (newUser.permissions.includes(permission.id)) {
                                    setNewUser({
                                      ...newUser,
                                      permissions: newUser.permissions.filter((p) => p !== permission.id),
                                    });
                                  } else {
                                    setNewUser({
                                      ...newUser,
                                      permissions: [...newUser.permissions, permission.id],
                                    });
                                  }
                                }}
                                className="flex items-center space-x-1.5 rtl:space-x-reverse hover:bg-gray-50 p-1.5 rounded text-left rtl:text-right"
                              >
                                {newUser.permissions.includes(permission.id) ? (
                                  <CheckSquare className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <Square className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="text-xs leading-tight">{getPermissionName(permission.id)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  <p className="text-xs text-muted-foreground mt-1.5 rtl:text-right ltr:text-left">
                    {t("admin.users.form.permissionsHint") || "Select the permissions this admin user should have access to."}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              {t("admin.users.dialogs.cancel")}
            </Button>
            <Button onClick={handleAddUser}>
              {t("admin.users.dialogs.addUserButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-4xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.manageRoles")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.manageRolesSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => (
                <Card key={role.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="rtl:text-right ltr:text-left">
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <CardDescription className="rtl:text-right ltr:text-left">
                          {role.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Badge className={getRoleColor(role.id)}>
                          {formatNumberForLocale(role.userCount, i18n.language)}{" "}
                          {t("admin.users.table.user")}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSpecificRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium rtl:text-right ltr:text-left">
                        {t("admin.users.details.permissions")}:
                      </p>
                      <div className="grid grid-cols-1 gap-1">
                        {role.permissions.map((permission) => (
                          <div
                            key={permission}
                            className="flex items-center space-x-2 rtl:space-x-reverse"
                          >
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs rtl:text-right ltr:text-left">
                              {getPermissionName(permission)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRoleDialogOpen(false)}
            >
              {t("admin.users.dialogs.close")}
            </Button>
            <Button onClick={handleEditRoles}>
              {t("admin.users.dialogs.editRoles")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog
        open={isEditRoleDialogOpen}
        onOpenChange={setIsEditRoleDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.editRole")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {editingRole &&
                `${t("admin.users.dialogs.editRoleSubtitle")} ${
                  editingRole.name
                }`}
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* Role Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.roleName")}
                  </label>
                  <Input
                    value={editingRoleName}
                    onChange={(e) => setEditingRoleName(e.target.value)}
                    placeholder={t("admin.users.form.roleNamePlaceholder")}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.users.form.roleDescription")}
                  </label>
                  <Input
                    value={editingRoleDescription}
                    onChange={(e) => setEditingRoleDescription(e.target.value)}
                    placeholder={t(
                      "admin.users.form.roleDescriptionPlaceholder"
                    )}
                  />
                </div>
              </div>

              {/* Role Permissions */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.users.permissions.rolePermissions")}
                </h4>
                <p className="text-sm text-muted-foreground mb-4 rtl:text-right ltr:text-left">
                  {t("admin.users.permissions.rolePermissionsDesc")}
                </p>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                    <div key={category} className="space-y-3">
                      <h5 className="text-md font-semibold text-gray-700 rtl:text-right ltr:text-left border-b pb-2">
                        {getCategoryName(category)}
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categoryPermissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors rtl:space-x-reverse"
                          >
                            <button
                              onClick={() =>
                                handleRolePermissionToggle(permission.id)
                              }
                              className="flex items-center space-x-3 flex-1 rtl:space-x-reverse"
                            >
                              {editingRolePermissions.includes(permission.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                              <div className="rtl:text-right ltr:text-left flex-1">
                                <p className="font-medium text-sm">{getPermissionName(permission.id)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {permission.description}
                                </p>
                              </div>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permission Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2 rtl:text-right ltr:text-left">
                  {t("admin.users.permissions.roleSummary")}
                </h5>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <span className="text-sm text-muted-foreground">
                    {t("admin.users.permissions.selected")}:{" "}
                    {editingRolePermissions.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("admin.users.permissions.total")}: {permissions.length}
                  </span>
                </div>
                {editingRolePermissions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium rtl:text-right ltr:text-left">
                      {t("admin.users.permissions.selectedPermissions")}:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {editingRolePermissions.map((permissionId) => (
                        <Badge
                          key={permissionId}
                          variant="secondary"
                          className="text-xs"
                        >
                          {getPermissionName(permissionId)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditRoleDialogOpen(false);
                setEditingRole(null);
                setEditingRoleName("");
                setEditingRoleDescription("");
                setEditingRolePermissions([]);
              }}
            >
              {t("admin.users.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveRoleChanges}>
              {t("admin.users.dialogs.saveRoleChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Activity Dialog */}
      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.userActivity")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedUser &&
                `${t("admin.users.dialogs.userActivitySubtitle")} ${
                  selectedUser.fullName
                }`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* User Info Header */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg rtl:space-x-reverse">
                <img
                  src={
                    selectedUser.profileImage ||
                    "/public/Portrait_Placeholder.png"
                  }
                  alt={selectedUser.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="rtl:text-right ltr:text-left">
                  <h3 className="font-semibold">{selectedUser.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    @{selectedUser.username}
                  </p>
                  <Badge className={getRoleColor(selectedUser.role)}>
                    {getRoleText(selectedUser.role)}
                  </Badge>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold rtl:text-right ltr:text-left">
                  {t("admin.users.activity.recentActivity")}
                </h4>
                <div className="space-y-3">
                  {userActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-4 p-4 border rounded-lg rtl:space-x-reverse"
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getActivityStatusIcon(activity.status)}
                      </div>
                      <div className="flex-1 rtl:text-right ltr:text-left">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{activity.action}</h5>
                          <Badge
                            className={getActivityStatusColor(activity.status)}
                          >
                            {activity.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground rtl:space-x-reverse">
                          <span className="flex items-center space-x-1 rtl:space-x-reverse">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDateTimeForLocale(activity.timestamp)}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1 rtl:space-x-reverse">
                            <User className="h-3 w-3" />
                            <span>{activity.ipAddress}</span>
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {activity.userAgent}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">4</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.users.activity.successful")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-2xl font-bold">1</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.users.activity.failed")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="text-2xl font-bold">1</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.users.activity.warnings")}
                        </p>
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
              onClick={() => setIsActivityDialogOpen(false)}
            >
              {t("admin.users.dialogs.close")}
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
              {t("admin.users.activity.exportActivity")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog
        open={isPermissionsDialogOpen}
        onOpenChange={setIsPermissionsDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.managePermissions")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedUser &&
                `${t("admin.users.dialogs.managePermissionsSubtitle")} ${
                  selectedUser.fullName
                }`}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* User Info Header */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg rtl:space-x-reverse">
                <img
                  src={
                    selectedUser.profileImage ||
                    "/public/Portrait_Placeholder.png"
                  }
                  alt={selectedUser.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="rtl:text-right ltr:text-left">
                  <h3 className="font-semibold">{selectedUser.fullName}</h3>
                  <p className="text-sm text-muted-foreground">
                    @{selectedUser.username}
                  </p>
                  <Badge className={getRoleColor(selectedUser.role)}>
                    {getRoleText(selectedUser.role)}
                  </Badge>
                </div>
              </div>

              {/* All Permissions - Grouped by Category */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.users.permissions.customPermissions")}
                </h4>
                <p className="text-sm text-muted-foreground mb-4 rtl:text-right ltr:text-left">
                  {t("admin.users.permissions.customPermissionsDesc")}
                </p>
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 rtl:text-right ltr:text-left">
                    <strong>{selectedPermissions.length}</strong> {t("admin.users.permissions.selected")} of <strong>{permissions.length}</strong> {t("admin.users.permissions.total")} permissions
                  </p>
                </div>
                <div className="space-y-6">
                  {Object.keys(groupedPermissions).length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No permissions available</p>
                    </div>
                  ) : (
                    Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                      <div key={category} className="space-y-3">
                        <h5 className="text-md font-semibold text-gray-700 rtl:text-right ltr:text-left border-b pb-2">
                          {category}
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {categoryPermissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors rtl:space-x-reverse"
                            >
                              <button
                                onClick={() => handlePermissionToggle(permission.id)}
                                className="flex items-center space-x-3 flex-1 rtl:space-x-reverse"
                              >
                                {selectedPermissions.includes(permission.id) ? (
                                  <CheckSquare className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400" />
                                )}
                                <div className="rtl:text-right ltr:text-left flex-1">
                                  <p className="font-medium text-sm">{getPermissionName(permission.id)}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {permission.description}
                                  </p>
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Permission Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2 rtl:text-right ltr:text-left">
                  {t("admin.users.permissions.summary")}
                </h5>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <span className="text-sm text-muted-foreground">
                    {t("admin.users.permissions.selected")}:{" "}
                    {selectedPermissions.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t("admin.users.permissions.total")}: {permissions.length}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPermissionsDialogOpen(false)}
            >
              {t("admin.users.dialogs.cancel")}
            </Button>
            <Button onClick={handleSavePermissions}>
              {t("admin.users.dialogs.savePermissions")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Credentials Dialog */}
      <Dialog open={isCreateCredentialsDialogOpen} onOpenChange={setIsCreateCredentialsDialogOpen}>
        <DialogContent className="max-w-md rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Key className="h-5 w-5" />
              {t("admin.users.credentials.title") || "Edit Admin Credentials"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.users.credentials.subtitle") || `Update login credentials for ${selectedUser?.fullName || 'this admin user'}. Leave password blank to keep current password.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.users.credentials.username") || "Username"} *
              </label>
              <Input
                type="text"
                placeholder={t("admin.users.credentials.usernamePlaceholder") || "Enter username"}
                value={credentialsForm.username}
                onChange={(e) =>
                  setCredentialsForm({ ...credentialsForm, username: e.target.value })
                }
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.users.credentials.password") || "Password"}
              </label>
              <Input
                type="password"
                placeholder={t("admin.users.credentials.passwordPlaceholder") || "Leave blank to keep current password"}
                value={credentialsForm.password}
                onChange={(e) =>
                  setCredentialsForm({ ...credentialsForm, password: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {t("admin.users.credentials.passwordHint") || "Leave blank to keep current password, or enter new password (min 6 characters)"}
              </p>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => {
              setIsCreateCredentialsDialogOpen(false);
              setCredentialsForm({ username: "", password: "" });
            }}>
              {t("admin.users.credentials.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleCreateCredentials}
              disabled={createCredentialsMutation.isPending}
            >
              {createCredentialsMutation.isPending
                ? t("common.loading")
                : t("admin.users.credentials.update") || "Update Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.deleteUser") || "Delete User"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.users.dialogs.deleteUserConfirm") || "Are you sure you want to delete this user? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.users.table.name")}:</strong> {userToDelete.fullName || userToDelete.username}
              </p>
              {userToDelete.email && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.users.table.email")}:</strong> {userToDelete.email}
                </p>
              )}
              {userToDelete.phone && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.users.table.phone")}:</strong> {userToDelete.phone}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              {t("admin.users.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.users.actions.deleteUser") || "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserManagement;
