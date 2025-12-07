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
import {
  ResponsivePagination,
} from "@/components/ui/pagination";
import {
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  UserCheck,
  UserX,
  Calendar,
  Users,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Eye,
  MapPin,
  Tag,
  Key,
  Loader2,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ushersApi, eventsApi } from "@/lib/api/adminApi";

interface Usher {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "on_leave";
  role: "entry" | "exit" | "security" | "general";
  hireDate: string;
  lastActive?: string;
  totalEvents: number;
  rating: number;
  assignedEvents: string[];
  assignedEventsDetails?: Array<{ 
    id: string; 
    title: string; 
    date: string; 
    status: string;
    venue?: string;
    organizer?: string;
    category?: string;
  }>;
  location: string;
  experience: number;
  hourlyRate: number;
  totalHours: number;
  performance: "excellent" | "good" | "average" | "poor";
  isTeamLeader: boolean;
  zones?: string[];
  ticketCategories?: string[];
}

type EventType = {
  id: string;
  title: string;
  date: string;
  venue: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  organizer: string;
  category: string;
  ticket_categories?: Array<{
    id: string | number;
    name: string;
    price: number;
  }>;
};

const UsherManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<string>("all");
  const [selectedUsher, setSelectedUsher] = useState<Usher | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignEventsDialogOpen, setIsAssignEventsDialogOpen] =
    useState(false);
  const [isAddUsherDialogOpen, setIsAddUsherDialogOpen] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCreateCredentialsDialogOpen, setIsCreateCredentialsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ushersPerPage, setUshersPerPage] = useState(10);
  const [tempAssignedEvents, setTempAssignedEvents] = useState<string[]>([]);
  const [ratingData, setRatingData] = useState({
    rating: 0,
    feedback: "",
  });

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18n.language === "ar" ? ar : enUS;
  };

  const [editingUsher, setEditingUsher] = useState<Partial<Usher>>({});
  const [newUsher, setNewUsher] = useState({
    name: "",
    email: "",
    phone: "",
    role: "general" as "entry" | "exit" | "security" | "general",
    location: "",
    hourlyRate: 0,
    experience: 0,
    zones: [] as string[],
    ticketCategories: [] as string[],
    isTeamLeader: false,
  });
  const [selectedEventsForNewUsher, setSelectedEventsForNewUsher] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [usherToDelete, setUsherToDelete] = useState<Usher | null>(null);
  const [replacementUsherId, setReplacementUsherId] = useState<string>("");
  const [credentialsForm, setCredentialsForm] = useState({
    username: "",
    password: "",
    event_ids: [] as number[],
  });

  const queryClient = useQueryClient();

  // Determine if we need to fetch all ushers for client-side filtering
  const needsAllUshers = roleFilter !== "all" || performanceFilter !== "all";
  
  // Fetch ushers from API
  const { data: ushersData, isLoading: ushersLoading, error: ushersError } = useQuery({
    queryKey: ['ushers', searchTerm, statusFilter, roleFilter, performanceFilter, currentPage, ushersPerPage, needsAllUshers],
    queryFn: async () => {
      const params: any = {
        page: needsAllUshers ? 1 : currentPage, // Fetch first page if we need all for client-side filtering
        page_size: needsAllUshers ? 1000 : ushersPerPage, // Fetch all if client-side filtering needed
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await ushersApi.getUshers(params);
      return response;
    },
  });

  // Transform API ushers to match Usher interface
  // Fetch events for assign dialog (moved before ushers mapping to use in isTeamLeader calculation)
  const { data: eventsData } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: async () => {
      const response = await eventsApi.getEvents({ page_size: 1000 });
      return response;
    },
  });

  const ushers: Usher[] = useMemo(() => {
    if (!ushersData?.results) return [];
    const totalEventsCount = eventsData?.results?.length || 0;
    return ushersData.results.map((item: any) => {
      const assignedEventIds = item.events ? item.events.map((e: any) => String(e.id)) : [];
      // Determine team leader status: if assigned to all events (or 80%+ of events), consider them a team leader
      // This is a workaround until backend adds is_team_leader field
      const isTeamLeader = totalEventsCount > 0 && assignedEventIds.length >= totalEventsCount * 0.8;
      
      return {
        id: String(item.id),
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        status: item.status as "active" | "inactive" | "on_leave",
        role: item.role as "entry" | "exit" | "security" | "general",
        hireDate: item.hire_date || item.hireDate || '',
        lastActive: item.last_active || item.lastActive || undefined,
        totalEvents: item.total_events || item.totalEvents || 0,
        rating: parseFloat(item.rating) || 0,
        assignedEvents: assignedEventIds,
        assignedEventsDetails: item.events ? item.events.map((e: any) => ({
          id: String(e.id),
          title: e.title || '',
          date: e.date || '',
          status: e.status || 'upcoming',
          venue: e.venue || '',
          organizer: e.organizer || '',
          category: e.category || '',
        })) : [],
        location: item.location || '',
        experience: item.experience || 0,
        hourlyRate: parseFloat(item.hourly_rate || item.hourlyRate) || 0,
        totalHours: parseFloat(item.total_hours || item.totalHours) || 0,
        performance: (item.performance || 'average') as "excellent" | "good" | "average" | "poor",
        isTeamLeader: item.is_team_leader || isTeamLeader,
        zones: Array.isArray(item.zones) ? item.zones : [],
        ticketCategories: Array.isArray(item.ticket_categories) ? item.ticket_categories : [],
      };
    });
  }, [ushersData, eventsData]);

  // Transform events for assign dialog
  const events = useMemo(() => {
    if (!eventsData?.results) return [];
    return eventsData.results.map((event: any): EventType => ({
      id: String(event.id),
      title: event.title || '',
      date: event.date || '',
      venue: event.venue?.name || '',
      status: "upcoming" as const,
      organizer: event.organizer?.name || '',
      category: event.category || '',
      ticket_categories: event.ticket_categories || event.ticket_categories_read || [],
    }));
  }, [eventsData]);

  // Get available ticket categories from selected events with event information
  const availableTicketCategories = useMemo(() => {
    const selectedEventIds = newUsher.isTeamLeader 
      ? events.map((e: EventType) => e.id)
      : selectedEventsForNewUsher;
    
    const categoryMap = new Map<string, string[]>(); // category name -> array of event titles
    events.forEach((event: EventType) => {
      if (selectedEventIds.includes(event.id) && event.ticket_categories) {
        event.ticket_categories.forEach((cat: any) => {
          if (cat.name) {
            if (!categoryMap.has(cat.name)) {
              categoryMap.set(cat.name, []);
            }
            categoryMap.get(cat.name)!.push(event.title);
          }
        });
      }
    });
    
    // Convert to array of objects with category name and events
    return Array.from(categoryMap.entries())
      .map(([name, eventTitles]) => ({
        name,
        events: eventTitles,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [events, selectedEventsForNewUsher, newUsher.isTeamLeader]);

  // Get available ticket categories for edit dialog with event information
  const availableTicketCategoriesForEdit = useMemo(() => {
    if (!selectedUsher) return [];
    
    const assignedEventIds = selectedUsher.isTeamLeader
      ? events.map((e: EventType) => e.id)
      : (tempAssignedEvents.length > 0 ? tempAssignedEvents : (selectedUsher.assignedEvents || []));
    
    const categoryMap = new Map<string, string[]>(); // category name -> array of event titles
    events.forEach((event: EventType) => {
      if (assignedEventIds.includes(event.id) && event.ticket_categories) {
        event.ticket_categories.forEach((cat: any) => {
          if (cat.name) {
            if (!categoryMap.has(cat.name)) {
              categoryMap.set(cat.name, []);
            }
            categoryMap.get(cat.name)!.push(event.title);
          }
        });
      }
    });
    
    // Convert to array of objects with category name and events
    return Array.from(categoryMap.entries())
      .map(([name, eventTitles]) => ({
        name,
        events: eventTitles,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [events, selectedUsher, tempAssignedEvents]);

  // Filter ushers based on search and filters (client-side for role and performance)
  const filteredUshers = useMemo(() => {
    let filtered = ushers;
    
    // Client-side filters (backend handles search and status)
    if (roleFilter !== "all") {
      filtered = filtered.filter((usher) => usher.role === roleFilter);
    }
    if (performanceFilter !== "all") {
      filtered = filtered.filter((usher) => usher.performance === performanceFilter);
    }
    
    return filtered;
  }, [ushers, roleFilter, performanceFilter]);

  // Pagination logic
  // If we have client-side filters (role or performance), paginate the filtered results
  // Otherwise, use API pagination
  const hasClientSideFilters = roleFilter !== "all" || performanceFilter !== "all";
  
  let totalPages: number;
  let startIndex: number;
  let endIndex: number;
  let paginatedUshers: Usher[];
  
  if (hasClientSideFilters) {
    // Client-side pagination for filtered results
    totalPages = Math.ceil(filteredUshers.length / ushersPerPage);
    startIndex = (currentPage - 1) * ushersPerPage;
    endIndex = startIndex + ushersPerPage;
    paginatedUshers = filteredUshers.slice(startIndex, endIndex);
  } else {
    // API pagination
    totalPages = ushersData?.total_pages || 1;
    startIndex = ushersData?.page ? (ushersData.page - 1) * ushersData.page_size : 0;
    endIndex = startIndex + (ushersData?.page_size || ushersPerPage);
    paginatedUshers = filteredUshers;
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, performanceFilter]);

  // Mutations
  const createUsherMutation = useMutation({
    mutationFn: async (data: any) => {
      return await ushersApi.createUsher(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ushers'] });
      toast({
        title: t("admin.ushers.toast.usherAdded"),
        description: t("admin.ushers.toast.usherAddedDesc"),
      });
      setIsAddUsherDialogOpen(false);
      setNewUsher({
        name: "",
        email: "",
        phone: "",
        role: "general",
        location: "",
        hourlyRate: 0,
        experience: 0,
        zones: [],
        ticketCategories: [],
        isTeamLeader: false,
      });
      setSelectedEventsForNewUsher([]);
    },
    onError: (error: any) => {
      console.error('Create usher error:', error);
      const errorData = error.response?.data;
      let errorMessage = t("admin.ushers.toast.error");
      
      if (errorData?.error) {
        // Backend returns {'error': serializer.errors}
        const errors = errorData.error;
        if (typeof errors === 'object') {
          errorMessage = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
        } else {
          errorMessage = String(errors);
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUsherMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await ushersApi.updateUsher(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ushers'] });
      toast({
        title: t("admin.ushers.toast.usherUpdated"),
        description: t("admin.ushers.toast.usherUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
      setEditingUsher({});
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.ushers.toast.error"),
        variant: "destructive",
      });
    },
  });

  const deleteUsherMutation = useMutation({
    mutationFn: async ({ id, replacementUsherId }: { id: string; replacementUsherId?: string }) => {
      return await ushersApi.deleteUsher(id, replacementUsherId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ushers'] });
      toast({
        title: t("admin.ushers.toast.usherDeleted"),
        description: t("admin.ushers.toast.usherDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setUsherToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.ushers.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Create credentials mutation
  const createCredentialsMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; event_ids?: number[] }) => {
      if (!selectedUsher) throw new Error("Usher not selected");
      return await ushersApi.createCredentials(selectedUsher.id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ushers'] });
      toast({
        title: t("admin.ushers.toast.credentialsCreated") || "Credentials Created",
        description: t("admin.ushers.toast.credentialsCreatedDesc") || `EVS credentials created successfully. Username: ${data.username}`,
      });
      setIsCreateCredentialsDialogOpen(false);
      setCredentialsForm({ username: "", password: "", event_ids: [] });
      setSelectedUsher(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description:
          error?.response?.data?.error?.message ||
          error?.message ||
          "Failed to create credentials",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "on_leave":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.ushers.status.active");
      case "inactive":
        return t("admin.ushers.status.inactive");
      case "on_leave":
        return t("admin.ushers.status.onLeave") || "On Leave";
      default:
        return status;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "security":
        return "bg-purple-100 text-purple-800";
      case "exit":
        return "bg-blue-100 text-blue-800";
      case "entry":
        return "bg-green-100 text-green-800";
      case "general":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "security":
        return t("admin.ushers.roles.security") || "Security";
      case "exit":
        return t("admin.ushers.roles.exit") || "Exit";
      case "entry":
        return t("admin.ushers.roles.entry") || "Entry";
      case "general":
        return t("admin.ushers.roles.general") || "General";
      default:
        return role;
    }
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "average":
        return "bg-yellow-100 text-yellow-800";
      case "needs_improvement":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPerformanceText = (performance: string) => {
    switch (performance) {
      case "excellent":
        return t("admin.ushers.performance.excellent");
      case "good":
        return t("admin.ushers.performance.good");
      case "average":
        return t("admin.ushers.performance.average");
      case "poor":
        return t("admin.ushers.performance.poor") || "Poor";
      default:
        return performance;
    }
  };

  const handleViewUsherDetails = (usher: Usher) => {
    setSelectedUsher(usher);
    setIsDetailsDialogOpen(true);
  };

  const handleEditUsher = (usher: Usher) => {
    setSelectedUsher(usher);
    setEditingUsher({
      name: usher.name,
      email: usher.email,
      phone: usher.phone,
      role: usher.role,
      status: usher.status,
      location: usher.location,
      hourlyRate: usher.hourlyRate,
      experience: usher.experience,
      performance: usher.performance,
      zones: usher.zones || [],
      ticketCategories: usher.ticketCategories || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUsher = (usherId: string | number) => {
    // Convert usherId to string for comparison (since ushers array uses string IDs)
    const usherIdStr = String(usherId);
    
    // Try to find in ushers array first (mapped data)
    let usher = ushers.find((u) => String(u.id) === usherIdStr);
    let rawUsher: any = null;
    
    // If not found, try in ushersData.results (raw API data)
    if (!usher) {
      rawUsher = ushersData?.results?.find((u: any) => String(u.id) === usherIdStr);
    }
    
    if (usher) {
      // Use mapped usher data (camelCase)
      setUsherToDelete({
        id: String(usher.id),
        name: usher.name || "",
        email: usher.email || "",
        phone: usher.phone || "",
        status: usher.status || "active",
        role: usher.role || "general",
        hireDate: usher.hireDate || "",
        lastActive: usher.lastActive || "",
        totalEvents: usher.totalEvents || 0,
        rating: usher.rating || 0,
        assignedEvents: usher.assignedEvents || [],
        location: usher.location || "",
        experience: usher.experience || 0,
        hourlyRate: usher.hourlyRate || 0,
        totalHours: usher.totalHours || 0,
      });
    } else if (rawUsher) {
      // Use raw API data (snake_case)
      setUsherToDelete({
        id: String(rawUsher.id),
        name: rawUsher.name || rawUsher.username || "",
        email: rawUsher.email || "",
        phone: rawUsher.mobile_number || rawUsher.phone || "",
        status: rawUsher.status || "active",
        role: rawUsher.role || "general",
        hireDate: rawUsher.hire_date || rawUsher.created_at || "",
        lastActive: rawUsher.last_active || "",
        totalEvents: rawUsher.total_events || 0,
        rating: parseFloat(rawUsher.rating) || 0,
        assignedEvents: rawUsher.events ? rawUsher.events.map((e: any) => String(e.id)) : [],
        location: rawUsher.location || "",
        experience: rawUsher.experience || 0,
        hourlyRate: parseFloat(rawUsher.hourly_rate) || 0,
        totalHours: parseFloat(rawUsher.total_hours) || 0,
      });
    } else {
      // Fallback: create usher object from ID if not found
      setUsherToDelete({
        id: usherIdStr,
        name: "",
        email: "",
        phone: "",
        status: "active",
        role: "general",
        hireDate: "",
        lastActive: "",
        totalEvents: 0,
        rating: 0,
        assignedEvents: [],
        location: "",
        experience: 0,
        hourlyRate: 0,
        totalHours: 0,
      });
    }
    
    // Always open the dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUsher = () => {
    if (usherToDelete) {
      // Check if usher is team leader
      const usher = ushers.find((u) => String(u.id) === String(usherToDelete.id));
      if (usher?.isTeamLeader && !replacementUsherId) {
        toast({
          title: t("admin.ushers.toast.teamLeaderCannotDelete") || "Cannot Delete Team Leader",
          description: t("admin.ushers.toast.teamLeaderCannotDeleteDesc") || "Please select a replacement usher before deleting a team leader.",
          variant: "destructive",
        });
        return;
      }
      
      deleteUsherMutation.mutate({
        id: usherToDelete.id,
        replacementUsherId: usher?.isTeamLeader ? replacementUsherId : undefined,
      }, {
        onSuccess: () => {
          setReplacementUsherId("");
        },
        onError: (error: any) => {
          const errorData = error.response?.data?.error;
          if (errorData?.code === 'TEAM_LEADER_CANNOT_DELETE') {
            toast({
              title: t("admin.ushers.toast.teamLeaderCannotDelete") || "Cannot Delete Team Leader",
              description: errorData.message || "Please select a replacement usher before deleting a team leader.",
              variant: "destructive",
            });
          }
        }
      });
    }
  };


  const handleAssignEvents = (usher: Usher) => {
    setSelectedUsher(usher);
    // If team leader, assign to all events automatically
    if (usher.isTeamLeader) {
      const allEventIds = events.map((event: EventType) => event.id);
      setTempAssignedEvents(allEventIds);
    } else {
      setTempAssignedEvents([...usher.assignedEvents]);
    }
    setIsAssignEventsDialogOpen(true);
  };

  // Update ticket categories when assigned events change in edit dialog
  useEffect(() => {
    if (selectedUsher && isEditDialogOpen) {
      const assignedEventIds = selectedUsher.isTeamLeader
        ? events.map((e: EventType) => e.id)
        : tempAssignedEvents.length > 0 ? tempAssignedEvents : (selectedUsher.assignedEvents || []);
      
      const availableCategories = new Set<string>();
      events.forEach((event: EventType) => {
        if (assignedEventIds.includes(event.id) && event.ticket_categories) {
          event.ticket_categories.forEach((cat: any) => {
            if (cat.name) {
              availableCategories.add(cat.name);
            }
          });
        }
      });
      
      // Remove ticket categories that are no longer available
      const currentCategories = Array.isArray(editingUsher.ticketCategories) 
        ? editingUsher.ticketCategories 
        : (selectedUsher.ticketCategories || []);
      const filteredCategories = currentCategories.filter(cat => availableCategories.has(cat));
      
      if (filteredCategories.length !== currentCategories.length) {
        setEditingUsher({ ...editingUsher, ticketCategories: filteredCategories });
      }
    }
  }, [tempAssignedEvents, selectedUsher, events, isEditDialogOpen]);

  const handleReactivateUsher = (usherId: string) => {
    updateUsherMutation.mutate({ id: usherId, data: { status: 'active' } });
  };

  const handleSaveRatingAndFeedback = () => {
    if (!selectedUsher) return;
    
    if (ratingData.rating < 0 || ratingData.rating > 5) {
      toast({
        title: t("common.error"),
        description: t("admin.ushers.toast.invalidRating") || "Rating must be between 0 and 5",
        variant: "destructive",
      });
      return;
    }

    // Prepare update data with all required fields to avoid 400 errors
    const updateData: any = {
      rating: ratingData.rating,
    };
    
    // Include existing usher data to avoid validation errors
    if (selectedUsher.name) updateData.name = selectedUsher.name;
    if (selectedUsher.email) updateData.email = selectedUsher.email;
    if (selectedUsher.phone) updateData.phone = selectedUsher.phone;
    if (selectedUsher.role) updateData.role = selectedUsher.role;
    if (selectedUsher.location !== undefined) updateData.location = selectedUsher.location || '';
    if (selectedUsher.status) updateData.status = selectedUsher.status;
    
    updateUsherMutation.mutate({
      id: selectedUsher.id,
      data: updateData,
    }, {
      onSuccess: () => {
        setIsRatingDialogOpen(false);
        setRatingData({ rating: 0, feedback: "" });
        queryClient.invalidateQueries({ queryKey: ['ushers'] });
        toast({
          title: t("admin.ushers.toast.ratingUpdated"),
          description: t("admin.ushers.toast.ratingUpdatedDesc") || "Rating and feedback updated successfully",
        });
      },
      onError: (error: any) => {
        console.error('Usher update error:', error);
        toast({
          title: t("common.error"),
          description: error.response?.data?.error?.message || error.response?.data?.message || error.message || "Failed to save rating and feedback",
          variant: "destructive",
        });
      },
    });
  };

  const handleAddUsher = () => {
    if (!newUsher.name || !newUsher.email || !newUsher.phone) {
      toast({
        title: t("common.error"),
        description: t("admin.ushers.toast.requiredFields") || "Name, email, and phone are required",
        variant: "destructive",
      });
      return;
    }

    // If team leader, assign to all events
    const eventIds = newUsher.isTeamLeader 
      ? events.map((event: EventType) => parseInt(event.id))
      : selectedEventsForNewUsher.map((id: string) => parseInt(id));

    createUsherMutation.mutate({
      name: newUsher.name,
      email: newUsher.email,
      phone: newUsher.phone,
      role: newUsher.role,
      location: newUsher.location || '',
      hourly_rate: newUsher.hourlyRate,
      experience: newUsher.experience,
      status: 'active',
      zones: newUsher.zones || [],
      ticket_categories: newUsher.ticketCategories || [],
      is_team_leader: newUsher.isTeamLeader || false,
      ...(eventIds.length > 0 && {
        events: eventIds
      }),
    });
  };

  const handleAssignEventsToUsher = () => {
    if (selectedUsher) {
      // TODO: Implement API call to assign events to usher
      // For now, just show success message
      toast({
        title: t("admin.ushers.toast.eventsAssigned"),
        description: t("admin.ushers.toast.eventsAssignedDesc"),
      });
    }
    setIsAssignEventsDialogOpen(false);
  };

  const handleCreateCredentials = () => {
    if (!credentialsForm.username || !credentialsForm.password) {
      toast({
        title: t("admin.ushers.toast.validationError") || "Validation Error",
        description: "Username and password are required",
        variant: "destructive",
      });
      return;
    }

    if (credentialsForm.password.length < 6) {
      toast({
        title: t("admin.ushers.toast.validationError") || "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    createCredentialsMutation.mutate({
      username: credentialsForm.username,
      password: credentialsForm.password,
      event_ids: credentialsForm.event_ids.length > 0 ? credentialsForm.event_ids : undefined,
    });
  };

  const handleSaveUsherChanges = () => {
    if (!selectedUsher) return;
    
    if (!editingUsher.name || !editingUsher.email || !editingUsher.phone) {
      toast({
        title: t("common.error"),
        description: t("admin.ushers.toast.requiredFields") || "Name, email, and phone are required",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      name: editingUsher.name,
      email: editingUsher.email,
      phone: editingUsher.phone,
      role: editingUsher.role,
      location: editingUsher.location,
      hourly_rate: editingUsher.hourlyRate,
      experience: editingUsher.experience,
    };

    if (editingUsher.status) {
      updateData.status = editingUsher.status;
    }
    if (editingUsher.performance) {
      updateData.performance = editingUsher.performance;
    }
    if (editingUsher.zones !== undefined) {
      updateData.zones = editingUsher.zones;
    }
    if (editingUsher.ticketCategories !== undefined) {
      updateData.ticket_categories = editingUsher.ticketCategories;
    }

    updateUsherMutation.mutate({ id: selectedUsher.id, data: updateData });
  };

  const handleToggleTeamLeader = (usher: Usher) => {
    if (usher.isTeamLeader) {
      // Remove team leader: clear all event assignments
      updateUsherMutation.mutate({
        id: usher.id,
        data: {
          events: [], // Clear all event assignments
        },
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['ushers'] });
          toast({
            title: t("admin.ushers.toast.teamLeaderRemoved") || "Team Leader Removed",
            description: t("admin.ushers.toast.teamLeaderRemovedDesc", { name: usher.name }) || `${usher.name} is no longer a team leader and has been removed from all events`,
          });
        },
      });
    } else {
      // Make team leader: assign to all events
      const allEventIds = events.map((event: EventType) => event.id);
      if (allEventIds.length === 0) {
        toast({
          title: "No Events Available",
          description: "Cannot make team leader: no events available to assign",
          variant: "destructive",
        });
        return;
      }
      
      updateUsherMutation.mutate({
        id: usher.id,
        data: {
          events: allEventIds.map((id: string) => parseInt(id)),
        },
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['ushers'] });
          toast({
            title: t("admin.ushers.toast.teamLeaderAssigned") || "Team Leader Assigned",
            description: t("admin.ushers.toast.teamLeaderAssignedDesc", { name: usher.name }) || `${usher.name} is now a team leader and assigned to all events`,
          });
        },
      });
    }
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.ushers.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.ushers.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredUshers}
            columns={commonColumns.ushers}
            title={t("admin.ushers.title")}
            subtitle={t("admin.ushers.subtitle")}
            filename="ushers"
            filters={{
              search: searchTerm,
              status: statusFilter,
              role: roleFilter,
              performance: performanceFilter,
            }}
            onExport={() => {
              toast({
                title: t("admin.ushers.toast.exportSuccess"),
                description: t("admin.ushers.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.ushers.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => setIsAddUsherDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.ushers.actions.addUsher")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.totalUshers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{ushersData?.count || ushers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.activeUshers")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-green-600">
              {ushers.filter((usher) => usher.status === "active").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.inactiveUshers")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-yellow-600">
              {ushers.filter((usher) => usher.status === "inactive").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.onLeaveUshers") || "On Leave"}
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-orange-600">
              {ushers.filter((usher) => usher.status === "on_leave").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.ushers.stats.teamLeaders") || "Team Leaders"}
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-purple-600">
              {ushers.filter((usher) => usher.isTeamLeader).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.ushers.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.ushers.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.ushers.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.ushers.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.ushers.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.ushers.status.inactive")}
                </SelectItem>
                <SelectItem value="on_leave">
                  {t("admin.ushers.status.onLeave") || "On Leave"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.ushers.filters.role")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.ushers.filters.allRoles")}
                </SelectItem>
                <SelectItem value="entry">
                  {t("admin.ushers.roles.entry") || "Entry"}
                </SelectItem>
                <SelectItem value="exit">
                  {t("admin.ushers.roles.exit") || "Exit"}
                </SelectItem>
                <SelectItem value="security">
                  {t("admin.ushers.roles.security") || "Security"}
                </SelectItem>
                <SelectItem value="general">
                  {t("admin.ushers.roles.general") || "General"}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={performanceFilter}
              onValueChange={setPerformanceFilter}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.ushers.filters.performance")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.ushers.filters.allPerformance")}
                </SelectItem>
                <SelectItem value="excellent">
                  {t("admin.ushers.performance.excellent")}
                </SelectItem>
                <SelectItem value="good">
                  {t("admin.ushers.performance.good")}
                </SelectItem>
                <SelectItem value="average">
                  {t("admin.ushers.performance.average")}
                </SelectItem>
                <SelectItem value="poor">
                  {t("admin.ushers.performance.poor") || "Poor"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ushers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.ushers.table.ushers")} ({hasClientSideFilters ? filteredUshers.length : (ushersData?.count || filteredUshers.length)})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.ushers.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, hasClientSideFilters ? filteredUshers.length : (ushersData?.count || filteredUshers.length))}{" "}
              {t("admin.ushers.pagination.of")} {hasClientSideFilters ? filteredUshers.length : (ushersData?.count || filteredUshers.length)}
            </span>
            <Select
              value={ushersPerPage.toString()}
              onValueChange={(value) => setUshersPerPage(parseInt(value))}
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
          {ushersLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : ushersError ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-500">
                {t("common.error")}: {ushersError instanceof Error ? ushersError.message : t("admin.ushers.toast.error")}
              </span>
            </div>
          ) : paginatedUshers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("admin.ushers.noUshersFound") || "No ushers found"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full rtl:text-right ltr:text-left">
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.usher")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.contact")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.role")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.teamLeader") || "Team Leader"}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.status")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.performance")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.events")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.rating")}
                    </TableHead>
                    <TableHead className="rtl:text-right">
                      {t("admin.ushers.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUshers.map((usher) => (
                  <TableRow key={usher.id}>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{usher.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.ushers.table.id")}: {usher.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="text-sm">{usher.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {usher.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(usher.role)}>
                        {getRoleText(usher.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            usher.isTeamLeader ? "bg-purple-500" : "bg-gray-300"
                          }`}
                        ></div>
                        <span className="text-xs ml-2 rtl:mr-2 rtl:ml-0">
                          {usher.isTeamLeader ? "Yes" : "No"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(usher.status)}>
                        {getStatusText(usher.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPerformanceColor(usher.performance)}>
                        {getPerformanceText(usher.performance)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{usher.totalEvents}</p>
                        <div className="text-sm text-muted-foreground space-y-1 mt-1">
                          {usher.assignedEventsDetails && usher.assignedEventsDetails.length > 0 ? (
                            usher.assignedEventsDetails.slice(0, 2).map((event: any) => (
                              <p key={event.id} className="text-xs">
                                • {event.title}
                              </p>
                            ))
                          ) : (
                            <p className="text-xs">
                              {usher.assignedEvents.length}{" "}
                              {t("admin.ushers.table.assigned")}
                            </p>
                          )}
                          {usher.assignedEventsDetails && usher.assignedEventsDetails.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{usher.assignedEventsDetails.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 rtl:flex-row-reverse">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{usher.rating}</span>
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
                            {t("admin.ushers.table.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewUsherDetails(usher)}
                          >
                            <Eye className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.viewDetails") || "View Details"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditUsher(usher)}
                          >
                            <Edit className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.editUsher")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAssignEvents(usher)}
                          >
                            <Calendar className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.assignEvents")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUsher(usher);
                              setCredentialsForm({
                                username: "",
                                password: "",
                                event_ids: usher.assignedEventsDetails?.map((e: any) => parseInt(e.id)) || [],
                              });
                              setIsCreateCredentialsDialogOpen(true);
                            }}
                          >
                            <Key className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.createCredentials") || "Create EVS Credentials"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUsher(usher);
                              setRatingData({
                                rating: usher.rating,
                                feedback: "",
                              });
                              setIsRatingDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.rateAndFeedback") || "Rate & Feedback"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleTeamLeader(usher)}
                            className={
                              usher.isTeamLeader
                                ? "text-purple-600"
                                : "text-gray-600"
                            }
                          >
                            <Users className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {usher.isTeamLeader
                              ? t("admin.ushers.form.removeTeamLeader") || "Remove Team Leader"
                              : t("admin.ushers.form.makeTeamLeader") || "Make Team Leader"}
                          </DropdownMenuItem>
                          {usher.status === "inactive" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivateUsher(usher.id)}
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              {t("admin.ushers.actions.reactivateUsher")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteUsher(usher.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.ushers.actions.deleteUsher")}
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
          {!ushersLoading && !ushersError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.ushers.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, hasClientSideFilters ? filteredUshers.length : (ushersData?.count || 0))} ${t(
                "admin.ushers.pagination.of"
              )} ${hasClientSideFilters ? filteredUshers.length : (ushersData?.count || 0)} ${t(
                "admin.ushers.pagination.results"
              )}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={hasClientSideFilters ? filteredUshers.length : (ushersData?.count || 0)}
              itemsPerPage={ushersPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Usher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.editUsher")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.editUsherSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.fullName")} *
                  </label>
                  <Input 
                    value={editingUsher.name || selectedUsher.name || ""}
                    onChange={(e) => setEditingUsher({ ...editingUsher, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.email")} *
                  </label>
                  <Input 
                    type="email"
                    value={editingUsher.email || selectedUsher.email || ""}
                    onChange={(e) => setEditingUsher({ ...editingUsher, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.phone")} *
                  </label>
                  <Input 
                    type="tel"
                    value={editingUsher.phone || selectedUsher.phone || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9+]/g, '');
                      setEditingUsher({ ...editingUsher, phone: value });
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.location")}
                  </label>
                  <Input 
                    value={editingUsher.location || selectedUsher.location || ""}
                    onChange={(e) => setEditingUsher({ ...editingUsher, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.role")}
                  </label>
                  <Select 
                    value={editingUsher.role || selectedUsher.role || "general"}
                    onValueChange={(value: "entry" | "exit" | "security" | "general") => 
                      setEditingUsher({ ...editingUsher, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">
                        {t("admin.ushers.roles.entry") || "Entry"}
                      </SelectItem>
                      <SelectItem value="exit">
                        {t("admin.ushers.roles.exit") || "Exit"}
                      </SelectItem>
                      <SelectItem value="security">
                        {t("admin.ushers.roles.security") || "Security"}
                      </SelectItem>
                      <SelectItem value="general">
                        {t("admin.ushers.roles.general") || "General"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.status")}
                  </label>
                  <Select 
                    value={editingUsher.status || selectedUsher.status || "active"}
                    onValueChange={(value: "active" | "inactive" | "on_leave") => 
                      setEditingUsher({ ...editingUsher, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.ushers.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.ushers.status.inactive")}
                      </SelectItem>
                      <SelectItem value="on_leave">
                        {t("admin.ushers.status.onLeave") || "On Leave"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.hourlyRate")}
                  </label>
                  <Input
                    type="number"
                    value={editingUsher.hourlyRate !== undefined ? editingUsher.hourlyRate : selectedUsher.hourlyRate}
                    onChange={(e) => setEditingUsher({ ...editingUsher, hourlyRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.experience")}
                  </label>
                  <Input
                    type="number"
                    value={editingUsher.experience !== undefined ? editingUsher.experience : selectedUsher.experience}
                    onChange={(e) => setEditingUsher({ ...editingUsher, experience: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.ushers.form.performance")}
                  </label>
                  <Select 
                    value={editingUsher.performance || selectedUsher.performance || "average"}
                    onValueChange={(value: "excellent" | "good" | "average" | "poor") => 
                      setEditingUsher({ ...editingUsher, performance: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">
                        {t("admin.ushers.performance.excellent")}
                      </SelectItem>
                      <SelectItem value="good">
                        {t("admin.ushers.performance.good")}
                      </SelectItem>
                      <SelectItem value="average">
                        {t("admin.ushers.performance.average")}
                      </SelectItem>
                      <SelectItem value="poor">
                        {t("admin.ushers.performance.poor") || "Poor"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Zones and Ticket Categories */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right mb-2 block">
                    {t("admin.ushers.form.zones") || "Zones"} <span className="text-muted-foreground text-xs">({t("admin.ushers.form.zonesDescription") || "Comma-separated list of zones"})</span>
                  </label>
                  <Input
                    placeholder={t("admin.ushers.form.zonesPlaceholder") || "e.g., Zone A, Zone B, Zone C"}
                    value={Array.isArray(editingUsher.zones) ? editingUsher.zones.join(", ") : (selectedUsher.zones?.join(", ") || "")}
                    onChange={(e) => {
                      const zones = e.target.value.split(",").map(z => z.trim()).filter(z => z.length > 0);
                      setEditingUsher({ ...editingUsher, zones });
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right mb-2 block">
                    {t("admin.ushers.form.ticketCategories") || "Ticket Categories"} <span className="text-muted-foreground text-xs">({t("admin.ushers.form.ticketCategoriesDescription") || "Select ticket categories this usher can scan from assigned events"})</span>
                  </label>
                  {availableTicketCategoriesForEdit.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                      {(!selectedUsher.assignedEvents || selectedUsher.assignedEvents.length === 0) && (!tempAssignedEvents || tempAssignedEvents.length === 0)
                        ? t("admin.ushers.form.selectEventsFirst") || "Please assign events first to see available ticket categories"
                        : t("admin.ushers.form.noTicketCategories") || "No ticket categories available in assigned events"}
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      {availableTicketCategoriesForEdit.map((categoryInfo) => {
                        const currentCategories = Array.isArray(editingUsher.ticketCategories) 
                          ? editingUsher.ticketCategories 
                          : (selectedUsher.ticketCategories || []);
                        return (
                          <div key={categoryInfo.name} className="flex items-start space-x-2 rtl:space-x-reverse">
                            <Checkbox
                              id={`edit-ticket-category-${categoryInfo.name}`}
                              checked={currentCategories.includes(categoryInfo.name)}
                              onCheckedChange={(checked) => {
                                const current = Array.isArray(editingUsher.ticketCategories) 
                                  ? editingUsher.ticketCategories 
                                  : (selectedUsher.ticketCategories || []);
                                if (checked) {
                                  setEditingUsher({ ...editingUsher, ticketCategories: [...current, categoryInfo.name] });
                                } else {
                                  setEditingUsher({ ...editingUsher, ticketCategories: current.filter(c => c !== categoryInfo.name) });
                                }
                              }}
                              className="mt-0.5"
                            />
                            <label
                              htmlFor={`edit-ticket-category-${categoryInfo.name}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              <div className="flex items-center gap-1 flex-wrap">
                                <span>{categoryInfo.name}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({categoryInfo.events.join(", ")})
                                </span>
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingUsher({});
                setSelectedUsher(null);
              }}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button 
              onClick={handleSaveUsherChanges}
              disabled={updateUsherMutation.isPending}
            >
              {updateUsherMutation.isPending 
                ? t("common.loading") 
                : t("admin.ushers.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Usher Dialog */}
      <Dialog
        open={isAddUsherDialogOpen}
        onOpenChange={setIsAddUsherDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.addUsher")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.addUsherSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.fullName")} *
                </label>
                <Input
                  placeholder={t("admin.ushers.form.fullNamePlaceholder")}
                  value={newUsher.name}
                  onChange={(e) => setNewUsher({ ...newUsher, name: e.target.value })}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.email")} *
                </label>
                <Input
                  type="email"
                  placeholder={t("admin.ushers.form.emailPlaceholder")}
                  value={newUsher.email}
                  onChange={(e) => setNewUsher({ ...newUsher, email: e.target.value })}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.phone")} *
                </label>
                  <Input
                    type="tel"
                    placeholder={t("admin.ushers.form.phonePlaceholder")}
                    value={newUsher.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9+]/g, '');
                      setNewUsher({ ...newUsher, phone: value });
                    }}
                    dir={i18n.language === "ar" ? "rtl" : "ltr"}
                  />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.role")}
                </label>
                <Select
                  value={newUsher.role}
                  onValueChange={(value: "entry" | "exit" | "security" | "general") => 
                    setNewUsher({ ...newUsher, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("admin.ushers.form.selectRole")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">
                      {t("admin.ushers.roles.entry") || "Entry"}
                    </SelectItem>
                    <SelectItem value="exit">
                      {t("admin.ushers.roles.exit") || "Exit"}
                    </SelectItem>
                    <SelectItem value="security">
                      {t("admin.ushers.roles.security") || "Security"}
                    </SelectItem>
                    <SelectItem value="general">
                      {t("admin.ushers.roles.general") || "General"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.location")}
                </label>
                <Input
                  placeholder={t("admin.ushers.form.locationPlaceholder")}
                  value={newUsher.location}
                  onChange={(e) => setNewUsher({ ...newUsher, location: e.target.value })}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.hourlyRate")}
                </label>
                <Input
                  type="number"
                  placeholder={t("admin.ushers.form.hourlyRatePlaceholder")}
                  value={newUsher.hourlyRate || ""}
                  onChange={(e) => setNewUsher({ ...newUsher, hourlyRate: parseFloat(e.target.value) || 0 })}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.ushers.form.experience")}
                </label>
                <Input
                  type="number"
                  placeholder={t("admin.ushers.form.experiencePlaceholder")}
                  value={newUsher.experience || ""}
                  onChange={(e) => setNewUsher({ ...newUsher, experience: parseInt(e.target.value) || 0 })}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium rtl:text-right mb-2 block">
                  {t("admin.ushers.form.assignEvents") || "Assign to Events"}
                </label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                  {events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("admin.ushers.noEventsAvailable") || "No events available"}
                    </p>
                  ) : (
                    events.map((event: EventType) => (
                      <div key={event.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                          id={`event-${event.id}`}
                          checked={selectedEventsForNewUsher.includes(event.id)}
                          disabled={newUsher.isTeamLeader}
                          onCheckedChange={(checked) => {
                            if (!newUsher.isTeamLeader) {
                              if (checked) {
                                setSelectedEventsForNewUsher([...selectedEventsForNewUsher, event.id]);
                              } else {
                                const newSelectedEvents = selectedEventsForNewUsher.filter(id => id !== event.id);
                                setSelectedEventsForNewUsher(newSelectedEvents);
                                
                                // Remove ticket categories that are no longer available
                                const remainingEventIds = newSelectedEvents;
                                const remainingCategories = new Set<string>();
                                events.forEach((e: EventType) => {
                                  if (remainingEventIds.includes(e.id) && e.ticket_categories) {
                                    e.ticket_categories.forEach((cat: any) => {
                                      if (cat.name) {
                                        remainingCategories.add(cat.name);
                                      }
                                    });
                                  }
                                });
                                
                                const currentCategories = Array.isArray(newUsher.ticketCategories) ? newUsher.ticketCategories : [];
                                const filteredCategories = currentCategories.filter(cat => remainingCategories.has(cat));
                                setNewUsher({ ...newUsher, ticketCategories: filteredCategories });
                              }
                            }
                          }}
                        />
                        <label
                          htmlFor={`event-${event.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="rtl:text-right ltr:text-left">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(event.date), "MMM dd, yyyy", { locale: getDateLocale() })} - {event.venue}
                            </p>
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Zones and Ticket Categories */}
              <div className="col-span-3 grid grid-cols-3 gap-3 border-t pt-3">
                <div>
                  <label className="text-sm font-medium rtl:text-right mb-1 block">
                    {t("admin.ushers.form.zones")}
                  </label>
                  <Input
                    placeholder={t("admin.ushers.form.zonesPlaceholder")}
                    value={Array.isArray(newUsher.zones) ? newUsher.zones.join(", ") : ""}
                    onChange={(e) => {
                      const zones = e.target.value.split(",").map(z => z.trim()).filter(z => z.length > 0);
                      setNewUsher({ ...newUsher, zones });
                    }}
                    className="text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t("admin.ushers.form.zonesDescription")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right mb-1 block">
                    {t("admin.ushers.form.ticketCategories")}
                  </label>
                  {availableTicketCategories.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-2 border rounded-md bg-gray-50">
                      {selectedEventsForNewUsher.length === 0 && !newUsher.isTeamLeader
                        ? t("admin.ushers.form.selectEventsFirst") || "Please select events first to see available ticket categories"
                        : t("admin.ushers.form.noTicketCategories") || "No ticket categories available in selected events"}
                    </div>
                  ) : (
                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                      {availableTicketCategories.map((categoryInfo) => (
                        <div key={categoryInfo.name} className="flex items-start space-x-2 rtl:space-x-reverse">
                          <Checkbox
                            id={`ticket-category-${categoryInfo.name}`}
                            checked={Array.isArray(newUsher.ticketCategories) && newUsher.ticketCategories.includes(categoryInfo.name)}
                            onCheckedChange={(checked) => {
                              const currentCategories = Array.isArray(newUsher.ticketCategories) ? newUsher.ticketCategories : [];
                              if (checked) {
                                setNewUsher({ ...newUsher, ticketCategories: [...currentCategories, categoryInfo.name] });
                              } else {
                                setNewUsher({ ...newUsher, ticketCategories: currentCategories.filter(c => c !== categoryInfo.name) });
                              }
                            }}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`ticket-category-${categoryInfo.name}`}
                            className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            <div className="flex items-center gap-1 flex-wrap">
                              <span>{categoryInfo.name}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ({categoryInfo.events.join(", ")})
                              </span>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{t("admin.ushers.form.ticketCategoriesDescription")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right mb-1 block">
                    {t("admin.ushers.form.teamLeaderStatus")}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mt-2">
                    <Checkbox
                      id="is-team-leader-new"
                      checked={newUsher.isTeamLeader}
                      onCheckedChange={(checked) => {
                        const isTeamLeader = checked === true;
                        setNewUsher({ ...newUsher, isTeamLeader });
                        // If making team leader, automatically select all events
                        if (isTeamLeader) {
                          const allEventIds = events.map((event: EventType) => event.id);
                          setSelectedEventsForNewUsher(allEventIds);
                        }
                      }}
                    />
                    <label
                      htmlFor="is-team-leader-new"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {t("admin.ushers.form.makeTeamLeader")}
                    </label>
                  </div>
                  {newUsher.isTeamLeader && (
                    <p className="text-xs text-purple-600 mt-1">{t("admin.ushers.form.teamLeaderNote")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddUsherDialogOpen(false);
                setNewUsher({
                  name: "",
                  email: "",
                  phone: "",
                  role: "general",
                  location: "",
                  hourlyRate: 0,
                  experience: 0,
                  zones: [],
                  ticketCategories: [],
                  isTeamLeader: false,
                });
                setSelectedEventsForNewUsher([]);
              }}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button 
              onClick={handleAddUsher}
              disabled={createUsherMutation.isPending}
            >
              {createUsherMutation.isPending 
                ? t("common.loading") 
                : t("admin.ushers.dialogs.addUsher")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Events Dialog */}
      <Dialog
        open={isAssignEventsDialogOpen}
        onOpenChange={setIsAssignEventsDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.assignEvents")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.assignEventsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="flex-1 overflow-y-auto space-y-4 px-1">
              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.assignEvents.usherInfo")}
                </h4>
                <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.fullName")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.role")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {getRoleText(selectedUsher.role)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Team Leader Section */}
              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.form.teamLeaderAssignment") || "Team Leader Assignment"}
                </h4>
                <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 rtl:text-right">
                      <p className="font-medium text-purple-800">
                        {selectedUsher.isTeamLeader
                          ? t("admin.ushers.form.currentTeamLeader") || "Current Team Leader"
                          : t("admin.ushers.form.notTeamLeader") || "Not a Team Leader"}
                      </p>
                      <p className="text-sm text-purple-600">
                        {selectedUsher.isTeamLeader
                          ? t("admin.ushers.form.teamLeaderDescription") || "This usher is assigned to all events as a team leader (joker)"
                          : t("admin.ushers.form.makeTeamLeaderDescription") || "Make this usher a team leader to assign them to all events at once"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          selectedUsher.isTeamLeader
                            ? "bg-purple-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <Button
                        variant={
                          selectedUsher.isTeamLeader ? "outline" : "default"
                        }
                        size="sm"
                        onClick={() => handleToggleTeamLeader(selectedUsher)}
                        className={
                          selectedUsher.isTeamLeader
                            ? "text-purple-600 border-purple-600"
                            : "bg-purple-600 hover:bg-purple-700"
                        }
                      >
                        {selectedUsher.isTeamLeader
                          ? t("admin.ushers.form.removeTeamLeader") || "Remove Team Leader"
                          : t("admin.ushers.form.makeTeamLeader") || "Make Team Leader"}
                      </Button>
                    </div>
                  </div>
                </div>
                {selectedUsher.isTeamLeader && (
                  <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <p className="text-sm text-blue-800">
                      {t("admin.ushers.form.teamLeaderNote") || "Note: Team leaders are automatically assigned to all events and cannot be manually unassigned from individual events."}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.assignEvents.availableEvents")}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {events.map((event: EventType) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 rtl:text-right">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(event.date), "PPP", {
                            locale: getDateLocale(),
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.venue}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <Badge
                          className={
                            tempAssignedEvents.includes(event.id)
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {tempAssignedEvents.includes(event.id)
                            ? t("admin.ushers.assignEvents.assigned")
                            : t("admin.ushers.assignEvents.notAssigned")}
                        </Badge>
                        <Button
                          variant={
                            tempAssignedEvents.includes(event.id)
                              ? "outline"
                              : "default"
                          }
                          size="sm"
                          disabled={selectedUsher.isTeamLeader}
                          onClick={() => {
                            if (tempAssignedEvents.includes(event.id)) {
                              setTempAssignedEvents(
                                tempAssignedEvents.filter(
                                  (id) => id !== event.id
                                )
                              );
                            } else {
                              setTempAssignedEvents([
                                ...tempAssignedEvents,
                                event.id,
                              ]);
                            }
                          }}
                        >
                          {selectedUsher.isTeamLeader
                            ? "Auto-Assigned"
                            : tempAssignedEvents.includes(event.id)
                            ? t("admin.ushers.assignEvents.remove")
                            : t("admin.ushers.assignEvents.assign")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.assignEvents.currentAssignments")}
                </h4>
                <div className="space-y-2">
                  {tempAssignedEvents.length > 0 ? (
                    tempAssignedEvents.map((eventId) => {
                      const event = events.find((e: EventType) => e.id === eventId);
                      return event ? (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <div className="flex-1 rtl:text-right">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.date), "PPP", {
                                locale: getDateLocale(),
                              })}
                            </p>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {t("admin.ushers.assignEvents.assigned")}
                          </Badge>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {t("admin.ushers.assignEvents.noAssignments")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsAssignEventsDialogOpen(false)}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button onClick={handleAssignEventsToUsher}>
              {t("admin.ushers.dialogs.saveAssignments")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating & Feedback Dialog */}
      <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.rateAndFeedback") || "Rate & Feedback"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedUsher && `${t("admin.ushers.dialogs.rateAndFeedbackSubtitle") || "Provide rating and feedback for"} ${selectedUsher.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium rtl:text-right mb-2 block">
                  {t("admin.ushers.form.rating") || "Rating"} (0-5)
                </label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingData({ ...ratingData, rating: star })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= ratingData.rating
                            ? "text-yellow-500 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2 rtl:mr-2 rtl:ml-0">
                    ({ratingData.rating}/5)
                  </span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={ratingData.rating || ""}
                  onChange={(e) =>
                    setRatingData({
                      ...ratingData,
                      rating: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-2"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right mb-2 block">
                  {t("admin.ushers.form.feedback") || "Feedback"}
                </label>
                <Textarea
                  placeholder={t("admin.ushers.form.feedbackPlaceholder") || "Enter your feedback about this usher..."}
                  value={ratingData.feedback}
                  onChange={(e) =>
                    setRatingData({ ...ratingData, feedback: e.target.value })
                  }
                  rows={4}
                  className="rtl:text-right ltr:text-left"
                />
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsRatingDialogOpen(false);
                setRatingData({ rating: 0, feedback: "" });
              }}
            >
              {t("admin.ushers.dialogs.cancel")}
            </Button>
            <Button
              onClick={handleSaveRatingAndFeedback}
              disabled={updateUsherMutation.isPending}
            >
              {updateUsherMutation.isPending
                ? t("common.loading")
                : t("admin.ushers.dialogs.saveRating") || "Save Rating"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usher Details Dialog */}
      <Dialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.usherDetails") || "Usher Details"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {selectedUsher && `${t("admin.ushers.dialogs.usherDetailsSubtitle") || "View details and events for"} ${selectedUsher.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedUsher && (
            <div className="flex-1 overflow-y-auto space-y-6 px-1">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.details.basicInfo") || "Basic Information"}
                </h4>
                <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.fullName")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.email")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.phone")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.role")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {getRoleText(selectedUsher.role)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.status")}
                    </label>
                    <Badge className={getStatusColor(selectedUsher.status)}>
                      {getStatusText(selectedUsher.status)}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.location")}
                    </label>
                    <p className="text-sm text-muted-foreground rtl:text-right">
                      {selectedUsher.location || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.form.teamLeaderStatus") || "Team Leader Status"}
                    </label>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <div
                        className={`w-4 h-4 rounded-full ${
                          selectedUsher.isTeamLeader
                            ? "bg-purple-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <span className="text-sm text-muted-foreground">
                        {selectedUsher.isTeamLeader
                          ? t("admin.ushers.form.teamLeader") || "Team Leader (Joker)"
                          : t("admin.ushers.form.regularUsher") || "Regular Usher"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Information */}
              <div className="space-y-4">
                <h4 className="font-medium rtl:text-right ltr:text-left">
                  {t("admin.ushers.details.performanceInfo") || "Performance Information"}
                </h4>
                <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.totalEvents") || "Total Events"}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {selectedUsher.totalEvents}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.rating") || "Rating"}
                    </label>
                    <div className="flex items-center gap-1 rtl:flex-row-reverse">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-2xl font-bold">
                        {selectedUsher.rating}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.experience") || "Experience"}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {selectedUsher.experience}{" "}
                      {t("admin.ushers.details.years") || "years"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.totalHours") || "Total Hours"}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {selectedUsher.totalHours}{" "}
                      {t("admin.ushers.details.hours") || "hours"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.hourlyRate") || "Hourly Rate"}
                    </label>
                    <p className="text-2xl font-bold rtl:text-right">
                      {formatCurrencyForLocale(
                        selectedUsher.hourlyRate,
                        i18n.language
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium rtl:text-right">
                      {t("admin.ushers.details.performance") || "Performance"}
                    </label>
                    <Badge
                      className={getPerformanceColor(selectedUsher.performance)}
                    >
                      {getPerformanceText(selectedUsher.performance)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Current Events (Upcoming/Ongoing) */}
              {selectedUsher.assignedEventsDetails && selectedUsher.assignedEventsDetails.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("admin.ushers.details.currentEvents") || "Current Events"} (
                    {selectedUsher.assignedEventsDetails.filter((e: any) => 
                      e.status === "upcoming" || e.status === "ongoing"
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {selectedUsher.assignedEventsDetails
                      .filter((e: any) => e.status === "upcoming" || e.status === "ongoing")
                      .map((event: any) => (
                        <Card key={event.id} className="p-4">
                          <div className="flex items-start justify-between rtl:flex-row-reverse">
                            <div className="flex-1 rtl:text-right">
                              <div className="flex items-center gap-2 mb-2 rtl:flex-row-reverse">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <p className="font-semibold text-lg">{event.title}</p>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {event.date && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <Clock className="h-3 w-3" />
                                    {format(parseISO(event.date), "PPP", {
                                      locale: getDateLocale(),
                                    })}
                                  </p>
                                )}
                                {event.venue && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <MapPin className="h-3 w-3" />
                                    {event.venue}
                                  </p>
                                )}
                                {event.organizer && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <Users className="h-3 w-3" />
                                    {event.organizer}
                                  </p>
                                )}
                                {event.category && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <Tag className="h-3 w-3" />
                                    {event.category}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              className={
                                event.status === "upcoming" 
                                  ? "bg-blue-100 text-blue-800"
                                  : event.status === "ongoing"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {event.status === "upcoming" 
                                ? t("admin.events.status.upcoming") || "Upcoming"
                                : event.status === "ongoing"
                                ? t("admin.events.status.ongoing") || "Ongoing"
                                : event.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    {selectedUsher.assignedEventsDetails.filter((e: any) => 
                      e.status === "upcoming" || e.status === "ongoing"
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground rtl:text-right">
                        {t("admin.ushers.details.noCurrentEvents") || "No current events"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Past Events (Completed/Cancelled) */}
              {selectedUsher.assignedEventsDetails && selectedUsher.assignedEventsDetails.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("admin.ushers.details.pastEvents") || "Past Events"} (
                    {selectedUsher.assignedEventsDetails.filter((e: any) => 
                      e.status === "completed" || e.status === "cancelled"
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {selectedUsher.assignedEventsDetails
                      .filter((e: any) => e.status === "completed" || e.status === "cancelled")
                      .map((event: any) => (
                        <Card key={event.id} className="p-4 bg-gray-50">
                          <div className="flex items-start justify-between rtl:flex-row-reverse">
                            <div className="flex-1 rtl:text-right">
                              <div className="flex items-center gap-2 mb-2 rtl:flex-row-reverse">
                                <Calendar className="h-4 w-4 text-gray-600" />
                                <p className="font-semibold">{event.title}</p>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                {event.date && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <Clock className="h-3 w-3" />
                                    {format(parseISO(event.date), "PPP", {
                                      locale: getDateLocale(),
                                    })}
                                  </p>
                                )}
                                {event.venue && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <MapPin className="h-3 w-3" />
                                    {event.venue}
                                  </p>
                                )}
                                {event.organizer && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <Users className="h-3 w-3" />
                                    {event.organizer}
                                  </p>
                                )}
                                {event.category && (
                                  <p className="flex items-center gap-2 rtl:flex-row-reverse">
                                    <Tag className="h-3 w-3" />
                                    {event.category}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge 
                              className={
                                event.status === "completed" 
                                  ? "bg-green-100 text-green-800"
                                  : event.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {event.status === "completed" 
                                ? t("admin.events.status.completed") || "Completed"
                                : event.status === "cancelled"
                                ? t("admin.events.status.cancelled") || "Cancelled"
                                : event.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    {selectedUsher.assignedEventsDetails.filter((e: any) => 
                      e.status === "completed" || e.status === "cancelled"
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground rtl:text-right">
                        {t("admin.ushers.details.noPastEvents") || "No past events"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* All Assigned Events (if no current/past separation needed) */}
              {(!selectedUsher.assignedEventsDetails || selectedUsher.assignedEventsDetails.length === 0) && (
                <div className="space-y-4">
                  <h4 className="font-medium rtl:text-right ltr:text-left">
                    {t("admin.ushers.details.assignedEvents") || "Assigned Events"}
                  </h4>
                  <p className="text-sm text-muted-foreground rtl:text-right">
                    {t("admin.ushers.details.noAssignedEvents") || "No events assigned"}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDetailsDialogOpen(false);
                setSelectedUsher(null);
              }}
            >
              {t("admin.ushers.dialogs.close") || "Close"}
            </Button>
            {selectedUsher && (
              <Button onClick={() => {
                setIsDetailsDialogOpen(false);
                handleEditUsher(selectedUsher);
              }}>
                {t("admin.ushers.actions.editUsher") || "Edit Usher"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Credentials Dialog */}
      <Dialog open={isCreateCredentialsDialogOpen} onOpenChange={setIsCreateCredentialsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Key className="h-5 w-5" />
              {t("admin.ushers.credentials.title") || "Create EVS Credentials"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.credentials.subtitle") || `Create login credentials for ${selectedUsher?.name || 'this usher'} to access the EVS web app.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.ushers.credentials.username") || "Username"} *
              </label>
              <Input
                type="text"
                placeholder={t("admin.ushers.credentials.usernamePlaceholder") || "Enter username"}
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
                {t("admin.ushers.credentials.password") || "Password"} *
              </label>
              <Input
                type="password"
                placeholder={t("admin.ushers.credentials.passwordPlaceholder") || "Enter password"}
                value={credentialsForm.password}
                onChange={(e) =>
                  setCredentialsForm({ ...credentialsForm, password: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {t("admin.ushers.credentials.passwordHint") || "Password must be at least 6 characters long"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left mb-2 block">
                {t("admin.ushers.credentials.assignEvents") || "Assign to Events (Optional)"}
              </label>
              <p className="text-xs text-muted-foreground mb-2 rtl:text-right ltr:text-left">
                {t("admin.ushers.credentials.assignEventsHint") || "Select events this usher will be assigned to. If none selected, only existing assignments will be kept."}
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                    {t("admin.ushers.credentials.noEvents") || "No events available"}
                  </p>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2 rtl:space-x-reverse rtl:flex-row-reverse">
                      <Checkbox
                        id={`event-${event.id}`}
                        checked={credentialsForm.event_ids.includes(parseInt(event.id))}
                        onCheckedChange={(checked) => {
                          const eventId = parseInt(event.id);
                          if (checked) {
                            setCredentialsForm({
                              ...credentialsForm,
                              event_ids: [...credentialsForm.event_ids, eventId],
                            });
                          } else {
                            setCredentialsForm({
                              ...credentialsForm,
                              event_ids: credentialsForm.event_ids.filter((id) => id !== eventId),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`event-${event.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {event.title}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateCredentialsDialogOpen(false);
              setCredentialsForm({ username: "", password: "", event_ids: [] });
            }}>
              {t("admin.ushers.credentials.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={handleCreateCredentials}
              disabled={createCredentialsMutation.isPending}
            >
              {createCredentialsMutation.isPending
                ? t("common.loading")
                : t("admin.ushers.credentials.create") || "Create Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.deleteUsher") || "Delete Usher"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.ushers.dialogs.deleteUsherConfirm") || "Are you sure you want to delete this usher? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {usherToDelete && (
            <div className="py-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                  <strong>{t("admin.ushers.table.name")}:</strong> {usherToDelete.name}
                </p>
                {usherToDelete.email && (
                  <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                    <strong>{t("admin.ushers.table.email")}:</strong> {usherToDelete.email}
                  </p>
                )}
                {usherToDelete.phone && (
                  <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                    <strong>{t("admin.ushers.table.phone")}:</strong> {usherToDelete.phone}
                  </p>
                )}
              </div>
              {(() => {
                const usher = ushers.find((u) => String(u.id) === String(usherToDelete.id));
                if (usher?.isTeamLeader) {
                  return (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mb-2 rtl:text-right ltr:text-left">
                        {t("admin.ushers.dialogs.teamLeaderWarning") || "⚠️ This usher is a team leader. You must select a replacement before deleting."}
                      </p>
                      <Select
                        value={replacementUsherId}
                        onValueChange={setReplacementUsherId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("admin.ushers.dialogs.selectReplacement") || "Select replacement usher..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {ushers
                            .filter((u) => String(u.id) !== String(usherToDelete.id) && !u.isTeamLeader)
                            .map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.name} ({u.email})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {ushers.filter((u) => String(u.id) !== String(usherToDelete.id) && !u.isTeamLeader).length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2 rtl:text-right ltr:text-left">
                          {t("admin.ushers.dialogs.noReplacementAvailable") || "No other ushers available as replacement."}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUsherToDelete(null);
                setReplacementUsherId("");
              }}
            >
              {t("admin.ushers.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUsher}
              disabled={deleteUsherMutation.isPending || (usherToDelete && ushers.find((u) => String(u.id) === String(usherToDelete.id))?.isTeamLeader && !replacementUsherId)}
            >
              {deleteUsherMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.ushers.actions.deleteUsher") || "Delete Usher"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsherManagement;
