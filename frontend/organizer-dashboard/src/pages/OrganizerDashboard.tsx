import React, { useState, useMemo, useRef, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { OtpInput } from "@/components/ui/input-otp";
import {
  Calendar,
  MapPin,
  Users,
  Ticket,
  TrendingUp,
  DollarSign,
  Clock,
  Filter,
  Search,
  BarChart3,
  Activity,
  Sun,
  Moon,
  LogOut,
  Download,
  FileText,
  Receipt,
  Upload,
  X,
  Camera,
  Lock,
  Edit,
  Plus,
  Image as ImageIcon,
  Calculator,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import i18n from "@/lib/i18n";
import InvoiceModal from "@/components/InvoiceModal";
import { useQuery } from "@tanstack/react-query";
import organizerApi from "@/lib/api/organizerApi";
import { useAuth } from "@/Contexts/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";


// Types
interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  imageUrl: string;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  peopleAdmitted: number;
  peopleRemaining: number;
  totalPayoutPending: number;
  totalPayoutPaid: number;
  ticketCategories: TicketCategory[];
  startingPrice?: number;
  gender_distribution?: {
    male: number;
    female: number;
    prefer_not_to_say: number;
    other: number;
    unknown: number;
    total: number;
    percentages: {
      male: number;
      female: number;
      prefer_not_to_say: number;
      other: number;
      unknown: number;
    };
  };
  financial_breakdown?: {
    ticket_revenue: number;
    tickets_sold: number;
    deductions: Array<{
      name: string;
      type: string;
      value: number | null;
      amount: number;
      description?: string;
    }>;
    total_deductions: number;
    commission?: number;
    ticket_runner_fee?: number;
    organizer_net_profit: number;
  };
  age_distribution?: {
    '0-17': number;
    '18-24': number;
    '25-34': number;
    '35-44': number;
    '45-54': number;
    '55-64': number;
    '65+': number;
    unknown: number;
    total: number;
    percentages: {
      '0-17': number;
      '18-24': number;
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55-64': number;
      '65+': number;
      unknown: number;
    };
  };
}

interface TicketCategory {
  name: string;
  price: number;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
}

interface DashboardStats {
  total_events: number;
  running_events: number;
  live_events: number;
  completed_events: number;
  available_tickets: number;
  total_tickets_sold: number;
  total_attendees: number;
  total_revenues: number;
  net_revenues: number;
  total_processed_payouts: number;
  total_pending_payouts: number;
}

interface PayoutHistory {
  id: string;
  transactionId: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "failed";
  invoiceUrl: string;
  description: string;
}

const OrganizerDashboard: React.FC = () => {
  const { t, i18n: i18nInstance } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<string>("events");
  const [language, setLanguage] = useState("EN");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [payoutSearchTerm, setPayoutSearchTerm] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");
  const [payoutDateFilter, setPayoutDateFilter] = useState<string>("all");
  const tabsContentRef = useRef<HTMLDivElement>(null);

  // Profile image upload state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );

  // Transform API profile to match profileData structure
  const [profileData, setProfileData] = useState({
    legalBusinessName: "",
    about: "",
    contactMobile: "",
    profileImage: "/placeholderLogo.png",
  });

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordStep, setChangePasswordStep] = useState<
    "current" | "otp" | "new"
  >("current");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordOtp, setChangePasswordOtp] = useState("");
  const [changePasswordError, setChangePasswordError] = useState("");

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
  
  // Event edit request modal state
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editRequestType, setEditRequestType] = useState<string>("");
  const [editRequestData, setEditRequestData] = useState<any>({
    event_name: "",
    total_tickets: "",
    ticket_category_name: "",
    ticket_category_price: "",
    ticket_category_total: "",
    mark_sold_out_category: "",
    ticket_price: "",
    ticket_category_for_price: "",
    description: "",
  });
  const [editRequestImage, setEditRequestImage] = useState<File | null>(null);
  const [editRequestImagePreview, setEditRequestImagePreview] = useState<string | null>(null);
  const [isSubmittingEditRequest, setIsSubmittingEditRequest] = useState(false);
  
  // View Finances modal state
  const [showFinancesModal, setShowFinancesModal] = useState(false);
  const [showNetRevenuesBreakdown, setShowNetRevenuesBreakdown] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Only redirect if auth check is complete and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch dashboard stats from API
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ["organizer-dashboard-stats"],
    queryFn: () => organizerApi.getDashboardStats(),
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  useEffect(() => {
    const storedLang = localStorage.getItem("appLanguage");
    if (storedLang) {
      setLanguage(storedLang);
      i18n.changeLanguage(storedLang === "EN" ? "en" : "ar");
    }
  }, []);

  useEffect(() => {
    if (tabsContentRef.current) {
      tabsContentRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTab]);

  const toggleLanguage = () => {
    const newLang = language === "EN" ? "ar" : "EN";
    setLanguage(newLang);
    i18n.changeLanguage(newLang === "EN" ? "en" : "ar");
    localStorage.setItem("appLanguage", newLang);

    toast({
      title: t("languageChanged", {
        lang: newLang === "ar" ? t("arabic") : t("english"),
      }),
      description: t("interfaceLanguageUpdated"),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("organizer_authenticated");
    navigate("/");
    toast({
      title: t("logout"),
      description: "Logged out successfully",
    });
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    // Reset image upload state
    setProfileImageFile(null);
    setProfileImagePreview(null);
  };

  const handleRequestChanges = async () => {
    if (!organizerProfile) return;

    try {
      // Prepare edit request data
      const updateData: any = {};
      
      // Only include fields that have changed
      if (profileData.legalBusinessName && profileData.legalBusinessName !== organizerProfile.name) {
        updateData.name = profileData.legalBusinessName;
      }
      if (profileData.about !== organizerProfile.about) {
        updateData.about = profileData.about || "";
      }
      if (profileData.contactMobile && profileData.contactMobile !== organizerProfile.contact_mobile) {
        updateData.contact_mobile = profileData.contactMobile;
      }

      // If there's a new profile image or image was removed, use FormData
      const imageWasRemoved = profileData.profileImage === "/placeholderLogo.png" && organizerProfile.profile_image;
      if (profileImageFile || imageWasRemoved) {
        const formData = new FormData();
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined && updateData[key] !== null) {
            formData.append(key, String(updateData[key]));
          }
        });
        
        if (profileImageFile) {
          formData.append('profile_image', profileImageFile);
        } else if (imageWasRemoved) {
          // If image was removed, send empty string to delete it
          formData.append('profile_image', '');
        }
        
        // Create edit request with FormData
        await organizerApi.createProfileEditRequest(formData);
      } else {
        // Only send request if there are actual changes
        if (Object.keys(updateData).length > 0) {
          await organizerApi.createProfileEditRequest(updateData);
        } else {
          toast({
            title: t("dashboard.profile.noChanges") || "No Changes",
            description: t("dashboard.profile.noChangesDesc") || "No changes were made to submit.",
            variant: "default",
          });
          return;
        }
      }

      toast({
        title: t("dashboard.profile.changesRequested") || "Edit Request Submitted",
        description: t("dashboard.profile.changesRequestedDesc") || "Your profile edit request has been submitted and is pending admin approval.",
      });

      // Reset form
      setIsEditingProfile(false);
      setProfileImageFile(null);
      setProfileImagePreview(null);
      
      // Refetch edit requests to show the new pending request
      await refetchEditRequests();
    } catch (error: any) {
      toast({
        title: t("dashboard.profile.error") || "Error",
        description: error.response?.data?.error?.message || error.message || "Failed to submit edit request",
        variant: "destructive",
      });
    }
  };

  const handleProfileDataChange = (field: string, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Profile image upload handlers
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t("dashboard.profile.invalidFileType"),
          description: t("dashboard.profile.onlyImagesAllowed"),
          variant: "destructive",
        });
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("dashboard.profile.fileTooLarge"),
          description: t("dashboard.profile.maxFileSize"),
          variant: "destructive",
        });
        return;
      }

      setProfileImageFile(file);

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setProfileImageFile(null);
    setProfileImagePreview(null);
    // Set profile image to placeholder to indicate deletion
    setProfileData((prev) => ({
      ...prev,
      profileImage: "/placeholderLogo.png",
    }));
  };

  const handleDownloadInvoice = async (payout: PayoutHistory) => {
    try {
      // Fetch invoice data from API (optional - may fail, but we can still generate invoice)
      let apiInvoiceData = null;
      try {
        apiInvoiceData = await organizerApi.getPayoutInvoice(payout.id);
      } catch (apiError) {
        console.warn("Failed to fetch invoice data from API, using local data:", apiError);
      }
      
      // Find the corresponding event for additional details
      const event = events.find((e) => e.id === payout.eventId);

      // Extract invoice data from API response if available
      const apiData = apiInvoiceData?.invoice || apiInvoiceData || {};

      // Create comprehensive invoice data
      const data = {
        invoiceNumber: apiData.reference || `INV-${payout.transactionId || payout.id}`,
        date: apiData.created_at ? new Date(apiData.created_at).toISOString().split("T")[0] : payout.date,
        dueDate: new Date(
          new Date(apiData.created_at || payout.date).getTime() + 30 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .split("T")[0], // 30 days from date
        eventTitle: payout.eventTitle || "Payout Transaction",
        eventDate: event?.date || payout.date,
        eventLocation: event?.location || "N/A",
        organizerName: profileData.legalBusinessName || organizerProfile?.name || apiData.organizer || "",
        organizerEmail: (organizerProfile as any)?.email || organizerProfile?.contact_email || "",
        organizerPhone: profileData.contactMobile || organizerProfile?.contact_mobile || "",
        organizerAddress: (organizerProfile as any)?.location || "",
        transactionId: payout.transactionId || payout.id,
        amount: apiData.amount || payout.amount,
        status: apiData.status || payout.status,
        description: payout.description || `Payout for ${payout.eventTitle || "event"}`,
        items: [
          {
            description: t("invoice.item_1", "Event Revenue Payout"),
            quantity: 1,
            unitPrice: (apiData.amount || payout.amount) * 0.85, // 85% of total
            total: (apiData.amount || payout.amount) * 0.85,
          },
          {
            description: t("invoice.item_2", "Service Fee"),
            quantity: 1,
            unitPrice: (apiData.amount || payout.amount) * 0.15, // 15% service fee
            total: (apiData.amount || payout.amount) * 0.15,
          },
        ],
        subtotal: (apiData.amount || payout.amount) * 0.85,
        tax: (apiData.amount || payout.amount) * 0.15,
        total: apiData.amount || payout.amount,
        currency: "EGP",
      };

      // Set invoice data and show modal
      setInvoiceData(data);
      setShowInvoiceModal(true);

      // Show toast notification
      toast({
        title: t("dashboard.payout.invoiceDownload") || "Invoice Ready",
        description: `${t("dashboard.payout.invoiceDownloadDesc") || "Invoice generated for"} ${
          payout.transactionId || payout.id
        }`,
      });
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast({
        title: t("dashboard.payout.invoiceError") || "Error",
        description: error.response?.data?.error?.message || error.message || "Failed to generate invoice",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = () => {
    setShowChangePassword(true);
    setChangePasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordOtp("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

  const handleCurrentPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (!currentPassword) {
      setChangePasswordError(t("auth.password_required"));
      return;
    }

    if (!organizerProfile?.contact_mobile) {
      setChangePasswordError("Organizer mobile number not found");
      return;
    }

    try {
      // Request OTP for password change using forgot password endpoint
      await organizerApi.forgotPassword({ mobile: organizerProfile.contact_mobile });
      setChangePasswordStep("otp");
      setChangePasswordSuccess(t("auth.otp_sent"));
    } catch (error: any) {
      setChangePasswordError(error.response?.data?.error?.message || "Failed to request OTP");
    }
  };

  const handleChangePasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (!changePasswordOtp || changePasswordOtp.length !== 6) {
      setChangePasswordError(t("organizer.login.error.invalidOtp"));
      return;
    }

    // OTP validation happens on backend when submitting new password
    setChangePasswordStep("new");
    setChangePasswordOtp("");
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError("");

    if (!newPassword || !confirmNewPassword) {
      setChangePasswordError(t("auth.password_required"));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError(t("auth.errors.confirm_password_mismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError(t("auth.errors.password_min"));
      return;
    }

    if (newPassword === currentPassword) {
      setChangePasswordError(
        "New password must be different from current password"
      );
      return;
    }

    try {
      await organizerApi.changePassword({
        current_password: currentPassword,
        otp_code: changePasswordOtp,
        new_password: newPassword,
      });

      setChangePasswordSuccess(t("auth.password_reset_success"));
      setTimeout(() => {
        setShowChangePassword(false);
        setChangePasswordStep("current");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setChangePasswordOtp("");
        setChangePasswordError("");
        setChangePasswordSuccess("");
      }, 2000);
    } catch (error: any) {
      setChangePasswordError(
        error.response?.data?.error?.message || "Failed to change password"
      );
    }
  };

  const handleCancelChangePassword = () => {
    setShowChangePassword(false);
    setChangePasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordOtp("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

  // Event edit request handlers
  const handleOpenEditRequest = (type: string) => {
    setEditRequestType(type);
    setShowEditRequestModal(true);
    // Reset form data
    setEditRequestData({
      event_name: selectedEvent?.title || "",
      total_tickets: selectedEvent?.totalTickets.toString() || "",
      ticket_category_name: "",
      ticket_category_price: "",
      ticket_category_total: "",
      mark_sold_out_category: "",
      ticket_price: "",
      ticket_category_for_price: "",
      description: "",
    });
    setEditRequestImage(null);
    setEditRequestImagePreview(null);
  };

  const handleCloseEditRequest = () => {
    setShowEditRequestModal(false);
    setEditRequestType("");
    setEditRequestData({
      event_name: "",
      total_tickets: "",
      ticket_category_name: "",
      ticket_category_price: "",
      ticket_category_total: "",
      mark_sold_out_category: "",
      ticket_price: "",
      ticket_category_for_price: "",
      description: "",
    });
    setEditRequestImage(null);
    setEditRequestImagePreview(null);
  };

  const handleEditRequestImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: t("dashboard.profile.invalidFileType") || "Invalid File Type",
          description: t("dashboard.profile.onlyImagesAllowed") || "Only image files are allowed.",
          variant: "destructive",
        });
        return;
      }
      setEditRequestImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditRequestImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitEditRequest = async () => {
    if (!selectedEvent) return;

    if (!editRequestData.description && editRequestType !== "change_image") {
      toast({
        title: t("editEvent.descriptionRequired") || "Description Required",
        description: t("editEvent.pleaseProvideDescription") || "Please provide a description of the changes you want to make.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingEditRequest(true);
    try {
      const requestedData: any = {
        edit_type: editRequestType,
      };

      // Add type-specific data
      switch (editRequestType) {
        case "edit_event_name":
          requestedData.new_event_name = editRequestData.event_name;
          break;
        case "edit_total_tickets":
          requestedData.new_total_tickets = parseInt(editRequestData.total_tickets);
          break;
        case "add_ticket_category":
          requestedData.category_name = editRequestData.ticket_category_name;
          requestedData.category_price = parseFloat(editRequestData.ticket_category_price);
          requestedData.category_total_tickets = parseInt(editRequestData.ticket_category_total);
          break;
        case "mark_category_sold_out":
          requestedData.category_name = editRequestData.mark_sold_out_category;
          break;
        case "change_event_image":
          // Image will be handled separately
          break;
        case "edit_ticket_price":
          requestedData.category_name = editRequestData.ticket_category_for_price;
          requestedData.new_price = parseFloat(editRequestData.ticket_price);
          break;
      }

      const formData = new FormData();
      formData.append("requested_changes", editRequestData.description || `Request to ${editRequestType.replace(/_/g, " ")}`);
      formData.append("requested_data", JSON.stringify(requestedData));
      
      if (editRequestImage) {
        formData.append("new_event_image", editRequestImage);
      }

      await organizerApi.submitEventEditRequest(selectedEvent.id, formData);

      toast({
        title: t("editEvent.submitted") || "Edit Request Submitted",
        description: t("editEvent.submittedDesc") || "Your edit request has been submitted and is pending admin approval.",
      });

      handleCloseEditRequest();
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.response?.data?.error?.message || error.message || "Failed to submit edit request",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEditRequest(false);
    }
  };

  // Fetch events from API
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["organizer-events"],
    queryFn: () => organizerApi.getEvents(),
    enabled: isAuthenticated,
  });

  // Transform API events to match Event interface
  const events: Event[] = React.useMemo(() => {
    if (!eventsData) return [];
    return eventsData.map((event) => ({
      id: String(event.id),
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      status: event.status as "upcoming" | "ongoing" | "completed" | "cancelled",
      imageUrl: event.image_url || "/public/event-placeholder.jpg",
      totalTickets: event.total_tickets || 0,
      ticketsSold: event.tickets_sold || 0,
      ticketsAvailable: event.tickets_available || 0,
      peopleAdmitted: event.people_admitted || 0,
      peopleRemaining: event.people_remaining || 0, // Available - Sold
      totalPayoutPending: event.total_payout_pending || 0,
      totalPayoutPaid: event.total_payout_paid || 0,
      ticketCategories: (event.ticket_categories || []).map((cat: any) => ({
        name: cat.name || cat.category || "Unknown",
        price: cat.price || 0,
        totalTickets: cat.total_tickets || cat.total || 0,
        ticketsSold: cat.tickets_sold || cat.sold || 0,
        ticketsAvailable: cat.tickets_available || cat.available || 0,
      })),
    }));
  }, [eventsData]);

  // Fetch detailed analytics for selected event in Analytics tab
  const {
    data: selectedEventAnalytics,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ["organizer-event-analytics", selectedEvent?.id],
    queryFn: () => organizerApi.getEventDetail(selectedEvent!.id),
    enabled: !!selectedEvent && activeTab === "analytics" && isAuthenticated,
  });

  // Merge selected event with analytics data
  const eventWithAnalytics: Event | null = React.useMemo(() => {
    if (!selectedEvent) return null;
    if (!selectedEventAnalytics) return selectedEvent;

    const overallStats = selectedEventAnalytics.overall_stats || {
      sold: selectedEvent.ticketsSold,
      available: selectedEvent.ticketsAvailable,
      admitted: selectedEvent.peopleAdmitted,
      remaining: selectedEvent.peopleRemaining,
    };

    const payoutInfo = selectedEventAnalytics.payout_info || {
      pending: selectedEvent.totalPayoutPending,
      paid: selectedEvent.totalPayoutPaid,
    };

    // Transform ticket categories from analytics
    console.log("Selected Event Analytics:", selectedEventAnalytics);
    console.log("Financial Breakdown:", selectedEventAnalytics.financial_breakdown);
    console.log("Has Financial Breakdown:", !!selectedEventAnalytics.financial_breakdown);
    console.log("Ticket Categories Raw:", selectedEventAnalytics.ticket_categories);
    
    const ticketCategories = selectedEventAnalytics.ticket_categories?.map((cat: any) => ({
      name: cat.name || cat.category || "Unknown",
      price: cat.price || 0,
      totalTickets: cat.total_tickets || cat.total || 0,
      ticketsSold: cat.tickets_sold || cat.sold || 0,
      ticketsAvailable: cat.tickets_available || cat.available || 0,
    })) || selectedEvent.ticketCategories || [];
    
    console.log("Ticket Categories Transformed:", ticketCategories);

    return {
      ...selectedEvent,
      peopleAdmitted: overallStats.admitted,
      peopleRemaining: overallStats.remaining,
      totalPayoutPending: payoutInfo.pending,
      totalPayoutPaid: payoutInfo.paid,
      ticketCategories,
      startingPrice: selectedEventAnalytics.starting_price || selectedEventAnalytics.price || undefined,
      gender_distribution: selectedEventAnalytics.gender_distribution,
      age_distribution: selectedEventAnalytics.age_distribution,
      financial_breakdown: selectedEventAnalytics.financial_breakdown, // Include financial breakdown
    };
  }, [selectedEvent, selectedEventAnalytics]);

  // Set the most recent event as default when component mounts
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      // Sort events by date (most recent first) and select the first one
      const sortedEvents = [...events].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSelectedEvent(sortedEvents[0]);
    }
  }, [events, selectedEvent]);

  // Auto-select most recent event when switching to analytics tab
  useEffect(() => {
    if (activeTab === "analytics" && events.length > 0 && !selectedEvent) {
      const sortedEvents = [...events].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setSelectedEvent(sortedEvents[0]);
    }
  }, [activeTab, events, selectedEvent]);

  // Default stats for loading/error states
  const defaultStats: DashboardStats = {
    total_events: 0,
    running_events: 0,
    live_events: 0,
    completed_events: 0,
    available_tickets: 0,
    total_tickets_sold: 0,
    total_attendees: 0,
    total_revenues: 0,
    net_revenues: 0,
    total_processed_payouts: 0,
    total_pending_payouts: 0,
  };

  // Use API stats or default - ensure stats is always defined
  const stats: DashboardStats = dashboardStats ? {
    total_events: dashboardStats.total_events ?? 0,
    running_events: dashboardStats.running_events ?? 0,
    live_events: dashboardStats.live_events ?? 0,
    completed_events: dashboardStats.completed_events ?? 0,
    available_tickets: dashboardStats.available_tickets ?? 0,
    total_tickets_sold: dashboardStats.total_tickets_sold ?? 0,
    total_attendees: dashboardStats.total_attendees ?? 0,
    total_revenues: dashboardStats.total_revenues ?? 0,
    net_revenues: dashboardStats.net_revenues ?? 0,
    total_processed_payouts: dashboardStats.total_processed_payouts ?? 0,
    total_pending_payouts: dashboardStats.total_pending_payouts ?? 0,
  } : defaultStats;

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || event.status === statusFilter;
      const matchesLocation =
        locationFilter === "all" || event.location.includes(locationFilter);
      const matchesDate =
        dateFilter === "all" || event.date.includes(dateFilter);

      return matchesSearch && matchesStatus && matchesLocation && matchesDate;
    });
  }, [events, searchTerm, statusFilter, locationFilter, dateFilter]);

  // Get unique locations and dates for filters
  const uniqueLocations = useMemo(() => {
    const locations = events.map((event) => {
      const locationParts = event.location.split(",");
      return locationParts[0].trim();
    });
    return [...new Set(locations)];
  }, [events]);

  const uniqueDates = useMemo(() => {
    const dates = events.map((event) =>
      format(parseISO(event.date), "yyyy-MM")
    );
    return [...new Set(dates)];
  }, [events]);

  // Fetch organizer profile from API (needed for payouts, invoice, and password change)
  const {
    data: organizerProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["organizer-profile"],
    queryFn: () => organizerApi.getProfile(),
    enabled: isAuthenticated,
  });

  // Fetch organizer edit requests
  const {
    data: editRequests,
    isLoading: editRequestsLoading,
    refetch: refetchEditRequests,
  } = useQuery({
    queryKey: ["organizer-edit-requests"],
    queryFn: () => organizerApi.getEditRequests(),
    enabled: isAuthenticated,
  });

  // Find the most recent pending request
  const pendingRequest = React.useMemo(() => {
    if (!editRequests || !Array.isArray(editRequests)) return null;
    return editRequests.find((req: any) => req.status === "pending") || null;
  }, [editRequests]);

  // Update profileData when organizerProfile is fetched, merging with pending request data
  useEffect(() => {
    if (organizerProfile) {
      const baseData = {
        legalBusinessName: organizerProfile.legal_business_name || organizerProfile.name || "",
        about: organizerProfile.about || "",
        contactMobile: organizerProfile.contact_mobile || organizerProfile.phone || "",
        profileImage: organizerProfile.profile_image || "/placeholderLogo.png",
      };

      // If there's a pending request, merge the requested changes
      if (pendingRequest && pendingRequest.requested_data) {
        const requestedData = pendingRequest.requested_data;
        
        // Merge requested changes with current data
        const mergedData = {
          ...baseData,
          // Override with requested values if they exist
          legalBusinessName: requestedData.name || requestedData.legal_business_name || baseData.legalBusinessName,
          about: requestedData.about !== undefined ? requestedData.about : baseData.about,
          contactMobile: requestedData.contact_mobile || requestedData.phone || baseData.contactMobile,
          profileImage: pendingRequest.profile_image_url || baseData.profileImage,
        };

        setProfileData(mergedData);
      } else {
        setProfileData(baseData);
      }
    }
  }, [organizerProfile, pendingRequest]);

  // Fetch payouts from API
  const {
    data: payoutsData,
    isLoading: payoutsLoading,
    error: payoutsError,
  } = useQuery({
    queryKey: ["organizer-payouts", payoutStatusFilter, payoutSearchTerm],
    queryFn: () => organizerApi.getPayouts({
      status: payoutStatusFilter !== "all" ? payoutStatusFilter : undefined,
      search: payoutSearchTerm || undefined,
    }),
    enabled: isAuthenticated,
  });

  // Transform API payouts to match PayoutHistory interface
  const payoutHistory: PayoutHistory[] = React.useMemo(() => {
    if (!payoutsData) return [];
    return payoutsData.map((payout) => ({
      id: String(payout.id),
      transactionId: payout.reference || `PAY-${payout.id}`,
      eventId: "", // Payout model doesn't have event field
      eventTitle: organizerProfile?.name || t("dashboard.payout.generalPayout", "General Payout"),
      amount: typeof payout.amount === 'number' ? payout.amount : parseFloat(String(payout.amount || 0)),
      date: payout.created_at ? payout.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      status: payout.status === 'processing' ? 'pending' : (payout.status as "completed" | "pending" | "failed"),
      invoiceUrl: "",
      description: `${t("dashboard.payout.payoutFor", "Payout")} ${payout.reference || payout.id}`,
    }));
  }, [payoutsData, organizerProfile, t]);

  // Filter payout history based on search and filters
  const filteredPayoutHistory = useMemo(() => {
    return payoutHistory.filter((payout) => {
      const matchesSearch =
        payout.eventTitle
          .toLowerCase()
          .includes(payoutSearchTerm.toLowerCase()) ||
        payout.transactionId
          .toLowerCase()
          .includes(payoutSearchTerm.toLowerCase()) ||
        payout.description
          .toLowerCase()
          .includes(payoutSearchTerm.toLowerCase());
      const matchesStatus =
        payoutStatusFilter === "all" || payout.status === payoutStatusFilter;
      const matchesDate =
        payoutDateFilter === "all" || payout.date.includes(payoutDateFilter);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [payoutHistory, payoutSearchTerm, payoutStatusFilter, payoutDateFilter]);

  // Get unique payout dates for filters
  const uniquePayoutDates = useMemo(() => {
    const dates = payoutHistory.map((payout) =>
      format(parseISO(payout.date), "yyyy-MM")
    );
    return [...new Set(dates)];
  }, [payoutHistory]);

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
        return t("dashboard.status.upcoming");
      case "ongoing":
        return t("dashboard.status.ongoing");
      case "completed":
        return t("dashboard.status.completed");
      case "cancelled":
        return t("dashboard.status.cancelled");
      default:
        return status;
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPayoutStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return t("dashboard.payout.status.completed");
      case "pending":
        return t("dashboard.payout.status.pending");
      case "failed":
        return t("dashboard.payout.status.failed");
      default:
        return status;
    }
  };

  const calculatePercentage = (sold: number, total: number) => {
    return total > 0 ? (sold / total) * 100 : 0;
  };

  const formatPercentage = (percentage: number): string => {
    // Show exact precise percentage with up to 15 decimal places
    // Remove trailing zeros but keep significant digits
    const formatted = percentage.toFixed(15);
    // Remove trailing zeros and decimal point if not needed
    return formatted.replace(/\.?0+$/, '') || '0';
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">{t("common.loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect (handled by useEffect, but show loading in case redirect is delayed)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-dark">
        <div className="text-center">
          <p className="text-white">{t("common.redirecting") || "Redirecting to login..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-dark"
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
        `}
      </style>
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
        `}
      </style>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-8 flex-shrink-0">
              {isDark ? (
                <img
                  src="/ticket-logo.png"
                  alt="Ticket Runners Logo"
                  className="h-10 w-auto sm:h-12 md:h-14"
                />
              ) : (
                <img
                  src="/ticket-logo-secondary.png"
                  alt="Ticket Runners Logo"
                  className="h-10 w-auto sm:h-12 md:h-14"
                />
              )}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-x-2 ltr:flex-row rtl:flex-row-reverse">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <Sun className="h-4 w-4" />
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  className="data-[state=checked]:bg-primary"
                />
                <Moon className="h-4 w-4" />
              </div>
              <Button variant="header" size="icon" onClick={toggleLanguage}>
                <span className="text-xs ml-1">{language}</span>
              </Button>
              <Button variant="header" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2">
              <Button variant="header" size="icon" onClick={toggleLanguage}>
                <span className="text-xs">{language}</span>
              </Button>
              <Button variant="header" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {t("dashboard.title")}
          </h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalEvents")}
                </CardTitle>
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.total_events
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.runningEvents")}
                </CardTitle>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.running_events
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.liveEvents")}
                </CardTitle>
              </div>
              <Activity className="h-4 w-4 text-green-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right text-green-600">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.live_events || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.completedEvents")}
                </CardTitle>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.completed_events
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.availableTickets")}
                </CardTitle>
              </div>
              <Ticket className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.available_tickets.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalTicketsSold")}
                </CardTitle>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.total_tickets_sold.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalAttendees")}
                </CardTitle>
              </div>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  stats.total_attendees.toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalRevenues")}
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  <>E£ {stats.total_revenues.toLocaleString()}</>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.netRevenues")}
                </CardTitle>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-pointer hover:text-primary transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNetRevenuesBreakdown(true)}
                      className="h-auto p-2"
                    >
                      {t("dashboard.stats.seeBreakdown", "See Breakdown")}
                    </Button>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  <>E£ {stats.net_revenues.toLocaleString()}</>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalProcessedPayouts")}
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  <>E£ {stats.total_processed_payouts.toLocaleString()}</>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.balanceLeftWithTicketRunners")}
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold rtl:text-right ${(() => {
                if (statsLoading || statsError) return "";
                const balance = stats.net_revenues - stats.total_processed_payouts;
                return balance < 0 ? "text-red-600" : "text-green-600";
              })()}`}>
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  <>E£ {(stats.net_revenues - stats.total_processed_payouts).toLocaleString()}</>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1 rtl:text-right">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.stats.totalPendingPayouts")}
                </CardTitle>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold rtl:text-right">
                {statsLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : statsError ? (
                  <div className="text-sm text-red-500">{t("common.errorLoadingData")}</div>
                ) : (
                  <>E£ {stats.total_pending_payouts.toLocaleString()}</>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div ref={tabsContentRef}>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            defaultValue="events"
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="events">
                {t("dashboard.tabs.events")}
              </TabsTrigger>
              <TabsTrigger value="analytics">
                {t("dashboard.tabs.analytics")}
              </TabsTrigger>
              <TabsTrigger value="payouts">
                {t("dashboard.tabs.payouts")}
              </TabsTrigger>
              <TabsTrigger value="profile">
                {t("dashboard.tabs.profile")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-6">
              {/* Loading State */}
              {eventsLoading && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      {t("common.loading")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {eventsError && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-red-500">
                      {t("common.errorLoadingData")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Events List */}
              {!eventsLoading && !eventsError && (
                <>
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Filter className="h-5 w-5" />
                    {t("dashboard.filters.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        placeholder={t("dashboard.filters.searchPlaceholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rtl:pl-0 rtl:pr-10"
                      />
                    </div>

                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.filters.status")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.filters.allStatus")}
                        </SelectItem>
                        <SelectItem value="upcoming">
                          {t("dashboard.filters.upcoming")}
                        </SelectItem>
                        <SelectItem value="ongoing">
                          {t("dashboard.filters.ongoing")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {t("dashboard.filters.completed")}
                        </SelectItem>
                        <SelectItem value="cancelled">
                          {t("dashboard.filters.cancelled")}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={locationFilter}
                      onValueChange={setLocationFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.filters.location")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.filters.allLocations")}
                        </SelectItem>
                        {uniqueLocations.map((location) => (
                          <SelectItem key={location} value=' '>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.filters.date")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.filters.allDates")}
                        </SelectItem>
                        {uniqueDates.map((date) => (
                          <SelectItem key={date} value=' '>
                            {format(parseISO(date + "-01"), "MMMM yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Events Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setSelectedEvent(event);
                      setActiveTab("analytics");
                    }}
                  >
                    <div className="relative">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <Badge
                        className={`absolute top-2 right-2 rtl:right-auto rtl:left-2 ${getStatusColor(
                          event.status
                        )}`}
                      >
                        {getStatusText(event.status)}
                      </Badge>
                    </div>

                    <CardHeader>
                      <CardTitle className="text-lg rtl:text-right">
                        {event.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 rtl:flex-row-reverse">
                        <Calendar className="h-4 w-4" />
                        {i18nInstance.language === "ar"
                          ? `${format(
                              parseISO(event.date),
                              "dd MMM yyyy"
                            )} في ${event.time}`
                          : `${format(
                              parseISO(event.date),
                              "MMM dd, yyyy"
                            )} at ${event.time}`}
                      </CardDescription>
                      <CardDescription className="flex items-center gap-2 rtl:flex-row-reverse">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-green-600">
                            {event.ticketsSold}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.ticketsSold")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-blue-600">
                            {event.ticketsAvailable}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.ticketsAvailable")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-orange-600">
                            {event.peopleRemaining}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.peopleRemaining")}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm rtl:flex-row-reverse">
                          <span>{t("dashboard.event.salesProgress")}</span>
                          <span>
                            {formatPercentage(
                              calculatePercentage(
                                event.ticketsSold,
                                event.totalTickets
                              )
                            )}
                            %
                          </span>
                        </div>
                        <div className="rtl:transform rtl:scale-x-[-1]">
                          <Progress
                            value={calculatePercentage(
                              event.ticketsSold,
                              event.totalTickets
                            )}
                          />
                        </div>
                      </div>

                      {/* Payout Info */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-yellow-600">
                            E£ {event.totalPayoutPending.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.pendingPayout")}
                          </p>
                        </div>
                        <div className="text-center rtl:text-right">
                          <p className="font-semibold text-green-600">
                            E£ {event.totalPayoutPaid.toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            {t("dashboard.event.paidPayout")}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/event/${event.id}`);
                        }}
                      >
                        {t("dashboard.event.viewDetails")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredEvents.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {t("dashboard.noEvents")}
                    </p>
                  </CardContent>
                </Card>
              )}
                </>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {analyticsLoading && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      {t("common.loading")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {eventWithAnalytics ? (
                <div className="space-y-6">
                  {/* Event Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between rtl:flex-row-reverse">
                        <div>
                          <CardTitle className="text-2xl">
                            {eventWithAnalytics.title}
                          </CardTitle>
                          <CardDescription>
                            {i18nInstance.language === "ar"
                              ? `${format(
                                  parseISO(eventWithAnalytics.date),
                                  "dd MMMM yyyy"
                                )} في ${eventWithAnalytics.time} • ${
                                  eventWithAnalytics.location
                                }`
                              : `${format(
                                  parseISO(eventWithAnalytics.date),
                                  "MMMM dd, yyyy"
                                )} at ${eventWithAnalytics.time} • ${
                                  eventWithAnalytics.location
                                }`}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(eventWithAnalytics.status)}>
                          {getStatusText(eventWithAnalytics.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Detailed Analytics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Ticket Categories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <Ticket className="h-5 w-5" />
                          {t("dashboard.analytics.ticketCategories")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {eventWithAnalytics.ticketCategories && eventWithAnalytics.ticketCategories.length > 0 ? (
                          <>
                            {eventWithAnalytics.startingPrice && (
                              <div className="mb-4 p-3 bg-muted rounded-lg">
                                <div className="flex justify-between items-center rtl:flex-row-reverse">
                                  <span className="text-sm font-medium">
                                    {t("dashboard.analytics.defaultTicketPrice", "Default Ticket Price")}
                                  </span>
                                  <span className="text-sm font-semibold">
                                    E£ {eventWithAnalytics.startingPrice.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                            {eventWithAnalytics.ticketCategories.map(
                              (category, index) => (
                                <div key={index} className="space-y-2">
                                  <div className="flex justify-between items-center rtl:flex-row-reverse">
                                    <span className="font-medium">
                                      {category.name}
                                    </span>
                                    <span className="text-sm font-semibold">
                                      E£ {category.price.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-sm text-muted-foreground rtl:flex-row-reverse">
                                    <span>
                                      {t("dashboard.analytics.sold")}:{" "}
                                      <span className="font-medium text-foreground">{category.ticketsSold ?? category.sold ?? 0}</span>
                                    </span>
                                    <span>
                                      {t("dashboard.analytics.available")}:{" "}
                                      <span className="font-medium text-foreground">{category.ticketsAvailable ?? category.available ?? 0}</span>
                                    </span>
                                  </div>
                                  <div className="rtl:transform rtl:scale-x-[-1]">
                                    <Progress
                                      value={calculatePercentage(
                                        category.ticketsSold ?? category.sold ?? 0,
                                        category.totalTickets ?? category.total_tickets ?? category.total ?? 0
                                      )}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {t("dashboard.analytics.noTicketCategories", "No ticket categories found for this event.")}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Overall Statistics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <BarChart3 className="h-5 w-5" />
                          {t("dashboard.analytics.overallStats")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-green-600">
                              {eventWithAnalytics.ticketsSold}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalSold")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-blue-600">
                              {eventWithAnalytics.ticketsAvailable}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalAvailable")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-orange-600">
                              {eventWithAnalytics.peopleRemaining}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.totalRemaining")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payout Information */}
                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                            <DollarSign className="h-5 w-5" />
                            {t("dashboard.analytics.payoutInfo")}
                          </CardTitle>
                          {eventWithAnalytics?.financial_breakdown && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setShowFinancesModal(true)}
                              className="flex items-center gap-2"
                            >
                              <Calculator className="h-4 w-4" />
                              {t("dashboard.analytics.viewFinances", "View Finances")}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-yellow-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-yellow-600">
                              E£{" "}
                              {eventWithAnalytics.totalPayoutPending.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.pendingPayout")}
                            </p>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg rtl:text-right">
                            <p className="text-2xl font-bold text-green-600">
                              E£{" "}
                              {eventWithAnalytics.totalPayoutPaid.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("dashboard.analytics.paidPayout")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sales Progress */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                          <TrendingUp className="h-5 w-5" />
                          {t("dashboard.analytics.salesProgress")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm rtl:flex-row-reverse">
                            <span>
                              {t("dashboard.analytics.soldPercentage")}
                            </span>
                            <span>
                              {formatPercentage(
                                calculatePercentage(
                                  eventWithAnalytics.ticketsSold,
                                  eventWithAnalytics.totalTickets
                                )
                              )}
                              %
                            </span>
                          </div>
                          <div className="rtl:transform rtl:scale-x-[-1]">
                            <Progress
                              value={calculatePercentage(
                                eventWithAnalytics.ticketsSold,
                                eventWithAnalytics.totalTickets
                              )}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm rtl:flex-row-reverse">
                            <span>
                              {t("dashboard.analytics.remainingPercentage")}
                            </span>
                            <span>
                              {formatPercentage(
                                calculatePercentage(
                                  eventWithAnalytics.totalTickets - eventWithAnalytics.ticketsSold,
                                  eventWithAnalytics.totalTickets
                                )
                              )}
                              %
                            </span>
                          </div>
                          <div className="rtl:transform rtl:scale-x-[-1]">
                            <Progress
                              value={calculatePercentage(
                                eventWithAnalytics.totalTickets - eventWithAnalytics.ticketsSold,
                                eventWithAnalytics.totalTickets
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gender Distribution */}
                    {eventWithAnalytics.gender_distribution && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Users className="h-5 w-5" />
                            {t("dashboard.analytics.genderDistribution", "Gender Distribution")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer
                            config={{
                              male: { label: t("dashboard.analytics.male", "Male"), color: "#3b82f6" },
                              female: { label: t("dashboard.analytics.female", "Female"), color: "#ec4899" },
                              prefer_not_to_say: { label: t("dashboard.analytics.preferNotToSay", "Prefer Not to Say"), color: "#8b5cf6" },
                              other: { label: t("dashboard.analytics.other", "Other"), color: "#10b981" },
                              unknown: { label: t("dashboard.analytics.unknown", "Unknown"), color: "#6b7280" },
                            }}
                            className="h-[300px]"
                          >
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie
                                data={[
                                  { name: t("dashboard.analytics.male", "Male"), value: eventWithAnalytics.gender_distribution.male, fill: "#3b82f6" },
                                  { name: t("dashboard.analytics.female", "Female"), value: eventWithAnalytics.gender_distribution.female, fill: "#ec4899" },
                                  { name: t("dashboard.analytics.preferNotToSay", "Prefer Not to Say"), value: eventWithAnalytics.gender_distribution.prefer_not_to_say, fill: "#8b5cf6" },
                                  { name: t("dashboard.analytics.other", "Other"), value: eventWithAnalytics.gender_distribution.other, fill: "#10b981" },
                                  { name: t("dashboard.analytics.unknown", "Unknown"), value: eventWithAnalytics.gender_distribution.unknown, fill: "#6b7280" },
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {[
                                  { fill: "#3b82f6" },
                                  { fill: "#ec4899" },
                                  { fill: "#8b5cf6" },
                                  { fill: "#10b981" },
                                  { fill: "#6b7280" },
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                            <div className="text-center">
                              <div className="font-semibold">{eventWithAnalytics.gender_distribution.male}</div>
                              <div className="text-muted-foreground">{t("dashboard.analytics.male", "Male")}</div>
                              <div className="text-xs text-muted-foreground">
                                {eventWithAnalytics.gender_distribution.percentages.male.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">{eventWithAnalytics.gender_distribution.female}</div>
                              <div className="text-muted-foreground">{t("dashboard.analytics.female", "Female")}</div>
                              <div className="text-xs text-muted-foreground">
                                {eventWithAnalytics.gender_distribution.percentages.female.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">{eventWithAnalytics.gender_distribution.prefer_not_to_say}</div>
                              <div className="text-muted-foreground">{t("dashboard.analytics.preferNotToSay", "Prefer Not to Say")}</div>
                              <div className="text-xs text-muted-foreground">
                                {eventWithAnalytics.gender_distribution.percentages.prefer_not_to_say.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">{eventWithAnalytics.gender_distribution.other}</div>
                              <div className="text-muted-foreground">{t("dashboard.analytics.other", "Other")}</div>
                              <div className="text-xs text-muted-foreground">
                                {eventWithAnalytics.gender_distribution.percentages.other.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold">{eventWithAnalytics.gender_distribution.unknown}</div>
                              <div className="text-muted-foreground">{t("dashboard.analytics.unknown", "Unknown")}</div>
                              <div className="text-xs text-muted-foreground">
                                {eventWithAnalytics.gender_distribution.percentages.unknown.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Age Distribution */}
                    {eventWithAnalytics.age_distribution && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                            <BarChart3 className="h-5 w-5" />
                            {t("dashboard.analytics.ageDistribution", "Age Distribution")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer
                            config={{
                              '0-17': { label: "0-17", color: "#3b82f6" },
                              '18-24': { label: "18-24", color: "#8b5cf6" },
                              '25-34': { label: "25-34", color: "#ec4899" },
                              '35-44': { label: "35-44", color: "#f59e0b" },
                              '45-54': { label: "45-54", color: "#10b981" },
                              '55-64': { label: "55-64", color: "#06b6d4" },
                              '65+': { label: "65+", color: "#6366f1" },
                              unknown: { label: t("dashboard.analytics.unknown", "Unknown"), color: "#6b7280" },
                            }}
                            className="h-[300px]"
                          >
                            <PieChart>
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Pie
                                data={[
                                  { name: "0-17", value: eventWithAnalytics.age_distribution['0-17'], fill: "#3b82f6" },
                                  { name: "18-24", value: eventWithAnalytics.age_distribution['18-24'], fill: "#8b5cf6" },
                                  { name: "25-34", value: eventWithAnalytics.age_distribution['25-34'], fill: "#ec4899" },
                                  { name: "35-44", value: eventWithAnalytics.age_distribution['35-44'], fill: "#f59e0b" },
                                  { name: "45-54", value: eventWithAnalytics.age_distribution['45-54'], fill: "#10b981" },
                                  { name: "55-64", value: eventWithAnalytics.age_distribution['55-64'], fill: "#06b6d4" },
                                  { name: "65+", value: eventWithAnalytics.age_distribution['65+'], fill: "#6366f1" },
                                  { name: t("dashboard.analytics.unknown", "Unknown"), value: eventWithAnalytics.age_distribution.unknown, fill: "#6b7280" },
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {[
                                  { fill: "#3b82f6" },
                                  { fill: "#8b5cf6" },
                                  { fill: "#ec4899" },
                                  { fill: "#f59e0b" },
                                  { fill: "#10b981" },
                                  { fill: "#06b6d4" },
                                  { fill: "#6366f1" },
                                  { fill: "#6b7280" },
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {[
                              { key: '0-17', label: "0-17" },
                              { key: '18-24', label: "18-24" },
                              { key: '25-34', label: "25-34" },
                              { key: '35-44', label: "35-44" },
                              { key: '45-54', label: "45-54" },
                              { key: '55-64', label: "55-64" },
                              { key: '65+', label: "65+" },
                              { key: 'unknown', label: t("dashboard.analytics.unknown", "Unknown") },
                            ].map(({ key, label }) => (
                              eventWithAnalytics.age_distribution![key as keyof typeof eventWithAnalytics.age_distribution] > 0 && (
                                <div key={key} className="text-center">
                                  <div className="font-semibold">
                                    {eventWithAnalytics.age_distribution![key as keyof typeof eventWithAnalytics.age_distribution]}
                                  </div>
                                  <div className="text-muted-foreground">{label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {eventWithAnalytics.age_distribution!.percentages[key as keyof typeof eventWithAnalytics.age_distribution.percentages].toFixed(1)}%
                                  </div>
                                </div>
                              )
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <div className="flex gap-4 rtl:flex-row-reverse">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedEvent(null);
                        setActiveTab("events");
                      }}
                      className="flex-1"
                    >
                      {t("dashboard.analytics.backToEvents")}
                    </Button>
                    <Dialog open={showEditRequestModal} onOpenChange={setShowEditRequestModal}>
                      <DialogTrigger asChild>
                        <Button
                          variant="default"
                          onClick={() => handleOpenEditRequest("")}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                          {t("editEvent.editEvent", "Request Event Edit")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{t("editEvent.title", "Edit Event Request")}</DialogTitle>
                          <DialogDescription>
                            {t("editEvent.description", "Select the type of edit you want to request. All changes require admin approval.")}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Edit Type Selection */}
                          {!editRequestType && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => setEditRequestType("edit_event_name")}
                              >
                                <div className="font-semibold mb-1">{t("editEvent.editEventName", "Edit Event Name")}</div>
                                <div className="text-sm text-muted-foreground">{t("editEvent.editEventNameDesc", "Change the event title")}</div>
                              </Button>
                              <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => setEditRequestType("edit_total_tickets")}
                              >
                                <div className="font-semibold mb-1">{t("editEvent.editTotalTickets", "Edit Total Tickets")}</div>
                                <div className="text-sm text-muted-foreground">{t("editEvent.editTotalTicketsDesc", "Change available tickets number")}</div>
                              </Button>
                              <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => setEditRequestType("add_ticket_category")}
                              >
                                <div className="font-semibold mb-1">{t("editEvent.addTicketCategory", "Add Ticket Category")}</div>
                                <div className="text-sm text-muted-foreground">{t("editEvent.addTicketCategoryDesc", "Add a new ticket category")}</div>
                              </Button>
                              <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => setEditRequestType("mark_category_sold_out")}
                              >
                                <div className="font-semibold mb-1">{t("editEvent.markSoldOut", "Mark Category Sold Out")}</div>
                                <div className="text-sm text-muted-foreground">{t("editEvent.markSoldOutDesc", "Mark a category as sold out")}</div>
                              </Button>
                              <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => setEditRequestType("change_event_image")}
                              >
                                <div className="font-semibold mb-1">{t("editEvent.changeImage", "Change Event Image")}</div>
                                <div className="text-sm text-muted-foreground">{t("editEvent.changeImageDesc", "Upload a new event image")}</div>
                              </Button>
                              <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => setEditRequestType("edit_ticket_price")}
                              >
                                <div className="font-semibold mb-1">{t("editEvent.editTicketPrice", "Edit Ticket Price")}</div>
                                <div className="text-sm text-muted-foreground">{t("editEvent.editTicketPriceDesc", "Change price for unsold tickets")}</div>
                              </Button>
                            </div>
                          )}

                          {/* Edit Forms */}
                          {editRequestType && (
                            <div className="space-y-4">
                              {/* Edit Event Name */}
                              {editRequestType === "edit_event_name" && (
                                <div className="space-y-2">
                                  <Label>{t("editEvent.newEventName", "New Event Name")}</Label>
                                  <Input
                                    value={editRequestData.event_name}
                                    onChange={(e) => setEditRequestData({ ...editRequestData, event_name: e.target.value })}
                                    placeholder={t("editEvent.enterNewName", "Enter new event name")}
                                  />
                                </div>
                              )}

                              {/* Edit Total Tickets */}
                              {editRequestType === "edit_total_tickets" && (
                                <div className="space-y-2">
                                  <Label>{t("editEvent.newTotalTickets", "New Total Tickets")}</Label>
                                  <Input
                                    type="number"
                                    value={editRequestData.total_tickets}
                                    onChange={(e) => setEditRequestData({ ...editRequestData, total_tickets: e.target.value })}
                                    placeholder={t("editEvent.enterTotalTickets", "Enter new total tickets number")}
                                  />
                                </div>
                              )}

                              {/* Add Ticket Category */}
                              {editRequestType === "add_ticket_category" && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>{t("editEvent.categoryName", "Category Name")}</Label>
                                    <Input
                                      value={editRequestData.ticket_category_name}
                                      onChange={(e) => setEditRequestData({ ...editRequestData, ticket_category_name: e.target.value })}
                                      placeholder={t("editEvent.enterCategoryName", "Enter category name")}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("editEvent.categoryPrice", "Category Price (E£)")}</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editRequestData.ticket_category_price}
                                      onChange={(e) => setEditRequestData({ ...editRequestData, ticket_category_price: e.target.value })}
                                      placeholder={t("editEvent.enterPrice", "Enter price")}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("editEvent.categoryTotalTickets", "Total Tickets")}</Label>
                                    <Input
                                      type="number"
                                      value={editRequestData.ticket_category_total}
                                      onChange={(e) => setEditRequestData({ ...editRequestData, ticket_category_total: e.target.value })}
                                      placeholder={t("editEvent.enterTotalTickets", "Enter total tickets")}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Mark Category Sold Out */}
                              {editRequestType === "mark_category_sold_out" && (
                                <div className="space-y-2">
                                  <Label>{t("editEvent.selectCategory", "Select Category")}</Label>
                                  <Select
                                    value={editRequestData.mark_sold_out_category}
                                    onValueChange={(value) => setEditRequestData({ ...editRequestData, mark_sold_out_category: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={t("editEvent.chooseCategory", "Choose a category")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(() => {
                                        const categories = eventWithAnalytics?.ticketCategories || selectedEvent?.ticketCategories || [];
                                        return categories.length > 0 ? (
                                          categories.map((cat: any) => (
                                            <SelectItem key={cat.name} value={cat.name}>
                                              {cat.name}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <SelectItem value="" disabled>
                                            {t("editEvent.noCategories", "No categories available")}
                                          </SelectItem>
                                        );
                                      })()}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Change Event Image */}
                              {editRequestType === "change_event_image" && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>{t("editEvent.newEventImage", "New Event Image")}</Label>
                                    <div className="flex items-center gap-4">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleEditRequestImageChange}
                                        className="flex-1"
                                      />
                                      {editRequestImagePreview && (
                                        <img
                                          src={editRequestImagePreview}
                                          alt="Preview"
                                          className="w-24 h-24 object-cover rounded"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Edit Ticket Price */}
                              {editRequestType === "edit_ticket_price" && (
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>{t("editEvent.selectCategory", "Select Category")}</Label>
                                    <Select
                                      value={editRequestData.ticket_category_for_price}
                                      onValueChange={(value) => setEditRequestData({ ...editRequestData, ticket_category_for_price: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={t("editEvent.chooseCategory", "Choose a category")} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(() => {
                                          const categories = eventWithAnalytics?.ticketCategories || selectedEvent?.ticketCategories || [];
                                          return categories.length > 0 ? (
                                            categories.map((cat: any) => (
                                              <SelectItem key={cat.name} value={cat.name}>
                                                {cat.name} - Current: E£ {cat.price?.toLocaleString() || 0}
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <SelectItem value="" disabled>
                                              {t("editEvent.noCategories", "No categories available")}
                                            </SelectItem>
                                          );
                                        })()}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>{t("editEvent.newPrice", "New Price (E£)")}</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editRequestData.ticket_price}
                                      onChange={(e) => setEditRequestData({ ...editRequestData, ticket_price: e.target.value })}
                                      placeholder={t("editEvent.enterNewPrice", "Enter new price")}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                      {t("editEvent.priceNote", "Note: Price can only be changed for unsold tickets")}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Description */}
                              <div className="space-y-2">
                                <Label>{t("editEvent.descriptionLabel", "Description")} *</Label>
                                <Textarea
                                  value={editRequestData.description}
                                  onChange={(e) => setEditRequestData({ ...editRequestData, description: e.target.value })}
                                  placeholder={t("editEvent.descriptionPlaceholder", "Please describe the changes you want to make...")}
                                  rows={4}
                                />
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-4 rtl:flex-row-reverse pt-4">
                                <Button
                                  variant="outline"
                                  onClick={handleCloseEditRequest}
                                  className="flex-1"
                                >
                                  {t("common.cancel")}
                                </Button>
                                <Button
                                  onClick={handleSubmitEditRequest}
                                  disabled={isSubmittingEditRequest}
                                  className="flex-1"
                                >
                                  {isSubmittingEditRequest ? t("editEvent.submitting", "Submitting...") : t("editEvent.submitRequest", "Submit Request")}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-lg mb-4">
                      {t("dashboard.analytics.selectEvent") || "Please select an event to view analytics"}
                    </p>
                    {events.length > 0 && (
                      <div className="w-full max-w-md space-y-2">
                        <Label className="text-sm font-medium">
                          {t("dashboard.analytics.selectEventToView") || "Select an event:"}
                        </Label>
                        <Select
                          value={selectedEvent?.id || ""}
                          onValueChange={(value) => {
                            const event = events.find((e) => e.id === value);
                            if (event) {
                              setSelectedEvent(event);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("dashboard.analytics.chooseEvent") || "Choose an event..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {events.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.title} - {format(parseISO(event.date), "MMM dd, yyyy")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payouts" className="space-y-6">
              {/* Loading State */}
              {payoutsLoading && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      {t("common.loading")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {payoutsError && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-red-500">
                      {t("common.errorLoadingData")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payout History Header */}
              {!payoutsLoading && !payoutsError && (
                <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Receipt className="h-5 w-5" />
                    {t("dashboard.payout.title")}
                  </CardTitle>
                  <CardDescription className="rtl:text-right">
                    {t("dashboard.payout.subtitle")}
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Payout Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <Filter className="h-5 w-5" />
                    {t("dashboard.payout.filters.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
                      <Input
                        placeholder={t(
                          "dashboard.payout.filters.searchPlaceholder"
                        )}
                        value={payoutSearchTerm}
                        onChange={(e) => setPayoutSearchTerm(e.target.value)}
                        className="pl-10 rtl:pl-0 rtl:pr-10"
                      />
                    </div>

                    <Select
                      value={payoutStatusFilter}
                      onValueChange={setPayoutStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.payout.filters.status")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.payout.filters.allStatus")}
                        </SelectItem>
                        <SelectItem value="completed">
                          {t("dashboard.payout.filters.completed")}
                        </SelectItem>
                        <SelectItem value="pending">
                          {t("dashboard.payout.filters.pending")}
                        </SelectItem>
                        <SelectItem value="failed">
                          {t("dashboard.payout.filters.failed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={payoutDateFilter}
                      onValueChange={setPayoutDateFilter}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("dashboard.payout.filters.date")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("dashboard.payout.filters.allDates")}
                        </SelectItem>
                        {uniquePayoutDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {format(parseISO(date + "-01"), "MMMM yyyy")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Payout History Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <FileText className="h-5 w-5" />
                    {t("dashboard.payout.history.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.transactionId")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.event")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.amount")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.date")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.status")}
                          </th>
                          <th className="text-left py-3 px-4 font-medium rtl:text-right">
                            {t("dashboard.payout.history.invoice")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayoutHistory.map((payout) => (
                          <tr
                            key={payout.id}
                            className="border-b hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm">
                                {payout.transactionId}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="rtl:text-right">
                                <p className="font-medium">
                                  {payout.eventTitle}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {payout.description}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 rtl:text-right">
                              <span className="font-semibold text-green-600">
                                E£ {payout.amount.toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4 rtl:text-right">
                              <span className="text-sm">
                                {i18nInstance.language === "ar"
                                  ? format(parseISO(payout.date), "dd MMM yyyy")
                                  : format(
                                      parseISO(payout.date),
                                      "MMM dd, yyyy"
                                    )}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={getPayoutStatusColor(payout.status)}
                              >
                                {getPayoutStatusText(payout.status)}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadInvoice(payout)}
                                className="flex items-center gap-2 rtl:flex-row-reverse"
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                  {t("dashboard.payout.history.download")}
                                </span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredPayoutHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">
                        {t("dashboard.payout.history.noPayouts")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payout Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 rtl:flex-row-reverse">
                    <BarChart3 className="h-5 w-5" />
                    {t("dashboard.payout.summary.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg rtl:text-right">
                      <p className="text-2xl font-bold text-green-600">
                        E£{" "}
                        {payoutHistory
                          .filter((p) => p.status === "completed")
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.payout.summary.totalCompleted")}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg rtl:text-right">
                      <p className="text-2xl font-bold text-yellow-600">
                        E£{" "}
                        {payoutHistory
                          .filter((p) => p.status === "pending")
                          .reduce((sum, p) => sum + p.amount, 0)
                          .toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.payout.summary.totalPending")}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg rtl:text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {payoutHistory.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.payout.summary.totalTransactions")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              {/* Loading State */}
              {profileLoading && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      {t("common.loading")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error State */}
              {profileError && (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-red-500">
                      {t("common.errorLoadingData")}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Profile Content */}
              {!profileLoading && !profileError && (
                <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between rtl:flex-row-reverse">
                    <div className="rtl:text-right">
                      <CardTitle className="text-2xl">
                        {t("dashboard.profile.title")}
                      </CardTitle>
                      <CardDescription>
                        {t("dashboard.profile.subtitle")}
                      </CardDescription>
                      {pendingRequest && (
                        <div className="mt-2">
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            {t("dashboard.profile.pendingRequest") || "Pending request to change profile..."}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {!isEditingProfile && (
                      <Button onClick={handleEditProfile}>
                        {t("dashboard.profile.editButton")}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Legal Business Name */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                        className="flex items-center gap-2"
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.legalBusinessName")}
                        </label>
                        {pendingRequest?.requested_data?.name && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                            <Clock className="h-2 w-2 mr-1" />
                            {t("dashboard.profile.pending") || "Pending"}
                          </Badge>
                        )}
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.legalBusinessName}
                          onChange={(e) =>
                            handleProfileDataChange(
                              "legalBusinessName",
                              e.target.value
                            )
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground rtl:text-right">
                          {profileData.legalBusinessName}
                        </p>
                      )}
                    </div>

                    {/* Contact Mobile */}
                    <div className="space-y-2">
                      <div
                        style={{
                          textAlign:
                            i18nInstance.language === "ar" ? "right" : "left",
                        }}
                        className="flex items-center gap-2"
                      >
                        <label className="text-sm font-medium">
                          {t("dashboard.profile.contactMobile")}
                        </label>
                        {pendingRequest?.requested_data?.contact_mobile && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                            <Clock className="h-2 w-2 mr-1" />
                            {t("dashboard.profile.pending") || "Pending"}
                          </Badge>
                        )}
                      </div>
                      {isEditingProfile ? (
                        <Input
                          value={profileData.contactMobile}
                          onChange={(e) =>
                            handleProfileDataChange(
                              "contactMobile",
                              e.target.value
                            )
                          }
                          className="rtl:text-right rtl:placeholder:text-right"
                          dir={i18nInstance.language === "ar" ? "ltr" : "ltr"}
                        />
                      ) : (
                        <p
                          className="text-sm text-muted-foreground rtl:text-right"
                          dir={i18nInstance.language === "ar" ? "ltr" : "ltr"}
                        >
                          {profileData.contactMobile}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* About Section */}
                  <div className="space-y-2">
                    <div
                      style={{
                        textAlign:
                          i18nInstance.language === "ar" ? "right" : "left",
                      }}
                      className="flex items-center gap-2"
                    >
                      <label className="text-sm font-medium">
                        {t("dashboard.profile.about")}
                      </label>
                      {pendingRequest?.requested_data?.about !== undefined && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                          <Clock className="h-2 w-2 mr-1" />
                          {t("dashboard.profile.pending") || "Pending"}
                        </Badge>
                      )}
                    </div>
                    {isEditingProfile ? (
                      <textarea
                        value={profileData.about}
                        onChange={(e) =>
                          handleProfileDataChange("about", e.target.value)
                        }
                        className="w-full min-h-[100px] p-3 border border-input rounded-md bg-background text-foreground rtl:text-right rtl:placeholder:text-right"
                        placeholder={t("dashboard.profile.aboutPlaceholder")}
                        dir={i18nInstance.language === "ar" ? "rtl" : "ltr"}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground rtl:text-right">
                        {profileData.about}
                      </p>
                    )}
                  </div>

                  {/* Change Password Section */}
                  <div className="space-y-4">
                    <Separator />
                    <div className="flex items-center justify-between rtl:flex-row-reverse">
                      <div className="rtl:text-right">
                        <h3 className="text-lg font-semibold">
                          {t("profilepage.settingsTab.changePassword")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Update your account password securely
                        </p>
                      </div>
                      {!showChangePassword && (
                        <Button
                          variant="outline"
                          onClick={handleChangePassword}
                          className="flex items-center gap-2 rtl:flex-row-reverse"
                        >
                          <Lock className="h-4 w-4" />
                          {t("profilepage.settingsTab.changePassword")}
                        </Button>
                      )}
                    </div>

                    {showChangePassword && (
                      <Card className="border-2 border-blue-200 bg-blue-50/50">
                        <CardContent className="p-6 space-y-4">
                          {changePasswordStep === "current" && (
                            <form
                              onSubmit={handleCurrentPasswordSubmit}
                              className="space-y-4"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-lg font-medium mb-2">
                                  {t("profilepage.settingsTab.changePassword")}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter your current password to continue
                                </p>
                              </div>
                              <Input
                                type="password"
                                placeholder={t(
                                  "profilepage.settingsTab.oldPasswordPlaceholder"
                                )}
                                value={currentPassword}
                                onChange={(e) =>
                                  setCurrentPassword(e.target.value)
                                }
                                required
                                className={
                                  i18nInstance.language === "ar"
                                    ? "text-right"
                                    : ""
                                }
                                dir={
                                  i18nInstance.language === "ar" ? "rtl" : "ltr"
                                }
                              />
                              {changePasswordError && (
                                <div className="text-red-500 text-sm">
                                  {changePasswordError}
                                </div>
                              )}
                              <div className="flex gap-4 rtl:flex-row-reverse">
                                <Button type="submit" className="flex-1">
                                  Continue
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelChangePassword}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}

                          {changePasswordStep === "otp" && (
                            <form
                              onSubmit={handleChangePasswordOtp}
                              className="space-y-4"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-lg font-medium mb-2">
                                  Verify Your Identity
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter the OTP sent to your mobile number
                                </p>
                              </div>
                              <OtpInput
                                value={changePasswordOtp}
                                onChange={setChangePasswordOtp}
                                length={6}
                                autoFocus={true}
                                language={i18nInstance.language}
                              />
                              {changePasswordError && (
                                <div className="text-red-500 text-sm text-center">
                                  {changePasswordError}
                                </div>
                              )}
                              {changePasswordSuccess && (
                                <div className="text-green-500 text-sm text-center">
                                  {changePasswordSuccess}
                                </div>
                              )}
                              <div className="flex gap-4 rtl:flex-row-reverse">
                                <Button type="submit" className="flex-1">
                                  Verify OTP
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelChangePassword}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}

                          {changePasswordStep === "new" && (
                            <form
                              onSubmit={handleNewPasswordSubmit}
                              className="space-y-4"
                            >
                              <div className="text-center mb-4">
                                <h4 className="text-lg font-medium mb-2">
                                  Set New Password
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  Enter your new password
                                </p>
                              </div>
                              <Input
                                type="password"
                                placeholder={t(
                                  "auth.placeholders.new_password"
                                )}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className={
                                  i18nInstance.language === "ar"
                                    ? "text-right"
                                    : ""
                                }
                                dir={
                                  i18nInstance.language === "ar" ? "rtl" : "ltr"
                                }
                              />
                              <Input
                                type="password"
                                placeholder={t(
                                  "auth.placeholders.confirm_new_password"
                                )}
                                value={confirmNewPassword}
                                onChange={(e) =>
                                  setConfirmNewPassword(e.target.value)
                                }
                                required
                                className={
                                  i18nInstance.language === "ar"
                                    ? "text-right"
                                    : ""
                                }
                                dir={
                                  i18nInstance.language === "ar" ? "rtl" : "ltr"
                                }
                              />
                              {changePasswordError && (
                                <div className="text-red-500 text-sm">
                                  {changePasswordError}
                                </div>
                              )}
                              {changePasswordSuccess && (
                                <div className="text-green-500 text-sm">
                                  {changePasswordSuccess}
                                </div>
                              )}
                              <div className="flex gap-4 rtl:flex-row-reverse">
                                <Button type="submit" className="flex-1">
                                  Update Password
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleCancelChangePassword}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isEditingProfile && (
                    <div className="flex gap-4 rtl:flex-row-reverse">
                      <Button onClick={handleRequestChanges}>
                        {t("dashboard.profile.requestChanges")}
                      </Button>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        {t("dashboard.profile.cancel")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>


      {/* Invoice Modal */}
      {showInvoiceModal && invoiceData && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          data={invoiceData}
        />
      )}

      {/* View Finances Modal */}
      <Dialog open={showFinancesModal} onOpenChange={setShowFinancesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("dashboard.analytics.viewFinances", "View Finances")} - {eventWithAnalytics?.title}
            </DialogTitle>
          </DialogHeader>
          {eventWithAnalytics?.financial_breakdown && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right">
                      {t("dashboard.analytics.totalTicketRevenue", "Total Ticket Revenue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      E£ {eventWithAnalytics.financial_breakdown.ticket_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {eventWithAnalytics.financial_breakdown.tickets_sold || eventWithAnalytics.ticketsSold} {t("dashboard.analytics.ticketsSold", "tickets sold")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right">
                      {t("dashboard.analytics.totalDeductions", "Total Deductions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      -E£ {(() => {
                        // STRICT deduplication: Filter out duplicates by ID first, then by name+type+value combination
                        const seenIds = new Set<string | number>();
                        const seenKeys = new Set<string>();
                        const uniqueDeductions = eventWithAnalytics.financial_breakdown.deductions?.filter((deduction: any) => {
                          // First try to deduplicate by ID
                          if (deduction.id !== undefined && deduction.id !== null) {
                            if (seenIds.has(deduction.id)) {
                              return false; // Duplicate ID, skip
                            }
                            seenIds.add(deduction.id);
                            return true;
                          }
                          // Fallback: deduplicate by name+type+value combination
                          const key = `${deduction.name || ''}_${deduction.type || ''}_${deduction.value || ''}`;
                          if (seenKeys.has(key)) {
                            return false; // Duplicate key, skip
                          }
                          seenKeys.add(key);
                          return true;
                        }) || [];
                        const deductionsTotal = uniqueDeductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
                        return ((eventWithAnalytics.financial_breakdown.commission || 0) + deductionsTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(() => {
                        // STRICT deduplication: Filter out duplicates by ID first, then by name+type+value combination
                        const seenIds = new Set<string | number>();
                        const seenKeys = new Set<string>();
                        const uniqueDeductions = eventWithAnalytics.financial_breakdown.deductions?.filter((deduction: any) => {
                          // First try to deduplicate by ID
                          if (deduction.id !== undefined && deduction.id !== null) {
                            if (seenIds.has(deduction.id)) {
                              return false; // Duplicate ID, skip
                            }
                            seenIds.add(deduction.id);
                            return true;
                          }
                          // Fallback: deduplicate by name+type+value combination
                          const key = `${deduction.name || ''}_${deduction.type || ''}_${deduction.value || ''}`;
                          if (seenKeys.has(key)) {
                            return false; // Duplicate key, skip
                          }
                          seenKeys.add(key);
                          return true;
                        }) || [];
                        return (uniqueDeductions.length || 0) + (eventWithAnalytics.financial_breakdown.commission ? 1 : 0);
                      })()} {t("dashboard.analytics.deductionItems", "deduction items")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right">
                      {t("dashboard.analytics.organizerNetProfit", "Your Net Profit")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      E£ {eventWithAnalytics.financial_breakdown.organizer_net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.analytics.shownToOrganizer", "Your profit after deductions")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base rtl:text-right flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    {t("dashboard.analytics.part1TicketRevenue", "Part 1: Tickets Sold Revenue")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium rtl:text-right">
                        {t("dashboard.analytics.totalTicketRevenue", "Total Ticket Revenue")}:
                      </span>
                      <span className="text-lg font-bold text-primary">
                        E£ {eventWithAnalytics.financial_breakdown.ticket_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Deductions Breakdown */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold rtl:text-right">
                      {t("dashboard.analytics.deductions", "Deductions Applied")}:
                    </h4>
                    <div className="space-y-2">
                      {/* TR Commission Fee */}
                      {eventWithAnalytics.financial_breakdown.commission && (
                        <div className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                          <div>
                            <span className="text-sm font-medium">
                              {t("dashboard.analytics.ticketRunnerFee", "TR Commission Fee")}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-red-600">
                            -E£ {eventWithAnalytics.financial_breakdown.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Custom Deductions */}
                      {(() => {
                        // STRICT deduplication: Filter out duplicates by ID first, then by name+type+value combination
                        const seenIds = new Set<string | number>();
                        const seenKeys = new Set<string>();
                        const uniqueDeductions = eventWithAnalytics.financial_breakdown.deductions?.filter((deduction: any) => {
                          // First try to deduplicate by ID
                          if (deduction.id !== undefined && deduction.id !== null) {
                            if (seenIds.has(deduction.id)) {
                              return false; // Duplicate ID, skip
                            }
                            seenIds.add(deduction.id);
                            return true;
                          }
                          // Fallback: deduplicate by name+type+value combination
                          const key = `${deduction.name || ''}_${deduction.type || ''}_${deduction.value || ''}`;
                          if (seenKeys.has(key)) {
                            return false; // Duplicate key, skip
                          }
                          seenKeys.add(key);
                          return true;
                        }) || [];
                        
                        return uniqueDeductions.length > 0 ? (
                          uniqueDeductions.map((deduction: any, index: number) => (
                            <div key={deduction.id || index} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                              <div>
                                <span className="text-sm font-medium">{deduction.name}</span>
                                <p className="text-xs text-muted-foreground">
                                  {deduction.type === 'percentage'
                                    ? `${deduction.value}% ${t("dashboard.analytics.ofRevenue", "of revenue")}`
                                    : `E£ ${deduction.value} ${t("dashboard.analytics.perTicket", "per ticket")}`
                                  }
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-red-600">
                                -E£ {deduction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))
                        ) : !eventWithAnalytics.financial_breakdown.commission ? (
                          <p className="text-xs text-muted-foreground rtl:text-right">
                            {t("dashboard.analytics.noDeductions", "No deductions added yet")}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Organizer Net Profit */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold rtl:text-right">
                        {t("dashboard.analytics.organizerNetProfit", "Your Net Profit")}:
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        E£ {eventWithAnalytics.financial_breakdown.organizer_net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Net Revenues Breakdown Modal */}
      <Dialog open={showNetRevenuesBreakdown} onOpenChange={setShowNetRevenuesBreakdown}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("dashboard.stats.netRevenuesBreakdown", "Net Revenues Breakdown")}
            </DialogTitle>
          </DialogHeader>
          {!statsLoading && !statsError && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right">
                      {t("dashboard.stats.totalRevenues", "Total Revenues")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      E£ {stats.total_revenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right">
                      {t("dashboard.stats.totalDeductions", "Total Deductions")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      -E£ {(stats.total_revenues - stats.net_revenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.stats.deductionsAndCommission", "Deductions and commission")}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm rtl:text-right">
                      {t("dashboard.stats.netRevenues", "Net Revenues")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      E£ {stats.net_revenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dashboard.stats.afterDeductions", "After all deductions")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base rtl:text-right">
                    {t("dashboard.stats.financialSummary", "Financial Summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded rtl:flex-row-reverse">
                      <span className="text-sm font-medium rtl:text-right">
                        {t("dashboard.stats.totalRevenues", "Total Revenues")}:
                      </span>
                      <span className="text-lg font-bold text-primary">
                        E£ {stats.total_revenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded rtl:flex-row-reverse">
                      <span className="text-sm font-medium rtl:text-right">
                        {t("dashboard.stats.totalDeductions", "Total Deductions")}:
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        -E£ {(stats.total_revenues - stats.net_revenues).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold rtl:text-right">
                          {t("dashboard.stats.netRevenues", "Net Revenues")}:
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          E£ {stats.net_revenues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizerDashboard;
