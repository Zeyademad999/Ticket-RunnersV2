import React, { useState, useMemo, useEffect } from "react";

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

import {
  Card,
  CardContent,
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
  Eye,
  Download,
  DollarSign,
  MoreHorizontal,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Clock,
  CreditCard,
  Building2,
  FileText,
  Key,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  formatNumberForLocale,
  formatCurrencyForLocale,
  formatPhoneNumberForLocale,
} from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { merchantsApi, ticketsApi } from "@/lib/api/adminApi";
import { Ticket } from "lucide-react";

type MerchantAccount = {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "suspended";
  registrationDate: string;
  lastLogin?: string;
  totalEvents: number;
  totalRevenue: number;
  commissionRate: number;
  payoutBalance: number;
  location: string;
  businessType: string;
  taxId?: string;
  bankAccount?: string;
  profileImage?: string;
  verificationStatus: "verified" | "pending" | "rejected";
  documents?: string[];
  ticketsAssigned?: number; // Number of tickets assigned by this merchant
  assignedCardsCount?: number; // Number of NFC cards assigned to this merchant
};


const MerchantAccountsManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [selectedMerchant, setSelectedMerchant] =
    useState<MerchantAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showMerchantDetails, setShowMerchantDetails] = useState(false);
  const [showTransferCardsDialog, setShowTransferCardsDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingMerchant, setEditingMerchant] = useState<Partial<MerchantAccount>>({});
  const [newMerchant, setNewMerchant] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    location: "",
    businessType: "",
  });
  const [newlyCreatedMerchantId, setNewlyCreatedMerchantId] = useState<string | null>(null);
  const [isCreateCredentialsDialogOpen, setIsCreateCredentialsDialogOpen] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({ mobile: "", password: "" });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState<MerchantAccount | null>(null);
  const [isAssignCardsDialogOpen, setIsAssignCardsDialogOpen] = useState(false);
  const [merchantToAssignCards, setMerchantToAssignCards] = useState<MerchantAccount | null>(null);
  const [numberOfCards, setNumberOfCards] = useState<string>("");

  const queryClient = useQueryClient();

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, locationFilter, verificationFilter]);

  // Fetch ALL merchants from API (we'll filter client-side since backend filtering is unreliable)
  const { data: merchantsData, isLoading: merchantsLoading, error: merchantsError } = useQuery({
    queryKey: ['merchants', 'all'], // Fetch all merchants for client-side filtering
    queryFn: async () => {
      const params: any = {
        page: 1,
        page_size: 10000, // Get all merchants
      };
      
      const response = await merchantsApi.getMerchants(params);
      return response;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    gcTime: 0,
  });

  // Transform API merchants to match MerchantAccount interface
  const merchants: MerchantAccount[] = useMemo(() => {
    if (!merchantsData?.results) return [];
    return merchantsData.results.map((item: any) => ({
      id: String(item.id),
      businessName: item.business_name || '',
      ownerName: item.owner_name || '',
      email: item.email || '',
      phone: item.phone || '',
      status: item.status as "active" | "inactive" | "suspended",
      registrationDate: item.registration_date || item.registrationDate || '',
      lastLogin: item.last_login || item.lastLogin || undefined,
      totalEvents: item.total_events || item.totalEvents || 0,
      totalRevenue: parseFloat(item.total_revenue || item.totalRevenue) || 0,
      commissionRate: parseFloat(item.commission_rate || item.commissionRate) * 100 || 0, // Convert from decimal to percentage
      payoutBalance: parseFloat(item.payout_balance || item.payoutBalance) || 0,
      location: item.location || '',
      businessType: item.business_type || item.businessType || '',
      taxId: item.tax_id || item.taxId || undefined,
      bankAccount: item.bank_account || item.bankAccount || undefined,
      profileImage: item.profile_image || item.profileImage || undefined,
      verificationStatus: item.verification_status || item.verificationStatus || 'pending',
      documents: item.documents || [],
      ticketsAssigned: item.tickets_assigned || item.ticketsAssigned || 0,
      assignedCardsCount: item.assigned_cards_count || item.assignedCardsCount || 0,
    }));
  }, [merchantsData]);

  // Fetch tickets assigned by selected merchant (only if merchant ID exists)
  const { data: merchantTicketsData, isLoading: merchantTicketsLoading } = useQuery({
    queryKey: ['merchant-tickets', selectedMerchant?.id],
    queryFn: async () => {
      if (!selectedMerchant?.id) return null;
      try {
        const response = await ticketsApi.getTickets({
          merchant: selectedMerchant.id,
          page_size: 1000, // Get all tickets
        });
        return response;
      } catch (error) {
        // If merchant filter is not supported, return null
        console.warn('Failed to fetch merchant tickets:', error);
        return null;
      }
    },
    enabled: !!selectedMerchant && showMerchantDetails,
  });

  // Calculate ticket statistics
  const ticketStats = useMemo(() => {
    if (!merchantTicketsData?.results) {
      return {
        total: 0,
        successful: 0,
        pending: 0,
        failed: 0,
      };
    }
    const tickets = merchantTicketsData.results;
    return {
      total: tickets.length,
      successful: tickets.filter((t: any) => t.status === 'completed' || t.status === 'active').length,
      pending: tickets.filter((t: any) => t.status === 'pending' || t.status === 'processing').length,
      failed: tickets.filter((t: any) => t.status === 'failed' || t.status === 'cancelled').length,
    };
  }, [merchantTicketsData]);

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

  // Form state for card transfer
  const [transferCardsForm, setTransferCardsForm] = useState({
    serialStart: "",
    serialEnd: "",
    selectedMerchantId: "",
  });

  // Helper function to parse serial number and extract prefix and number
  const parseSerialNumber = (serialNumber: string) => {
    // Match patterns like CARD050, NFC-001-2025, etc.
    const match = serialNumber.match(/^([A-Za-z-]+)(\d+)(.*)$/);
    if (!match) return null;

    return {
      prefix: match[1],
      number: parseInt(match[2]),
      suffix: match[3] || "",
    };
  };

  // Helper function to generate serial numbers in range
  const generateSerialNumbersInRange = (start: string, end: string) => {
    const startParsed = parseSerialNumber(start);
    const endParsed = parseSerialNumber(end);

    if (!startParsed || !endParsed) return null;

    // Check if prefixes match
    if (
      startParsed.prefix !== endParsed.prefix ||
      startParsed.suffix !== endParsed.suffix
    ) {
      return null;
    }

    const serialNumbers: string[] = [];
    const startNum = startParsed.number;
    const endNum = endParsed.number;

    if (startNum > endNum) return null;

    for (let i = startNum; i <= endNum; i++) {
      const serialNumber = `${startParsed.prefix}${i
        .toString()
        .padStart(startParsed.number.toString().length, "0")}${
        startParsed.suffix
      }`;
      serialNumbers.push(serialNumber);
    }

    return serialNumbers;
  };

  // Helper function to validate serial range format
  const validateSerialRange = (start: string, end: string) => {
    if (!start.trim() || !end.trim()) {
      return {
        valid: false,
        error: "Both start and end serial numbers are required",
      };
    }

    const startParsed = parseSerialNumber(start);
    const endParsed = parseSerialNumber(end);

    if (!startParsed || !endParsed) {
      return { valid: false, error: "Invalid serial number format" };
    }

    if (
      startParsed.prefix !== endParsed.prefix ||
      startParsed.suffix !== endParsed.suffix
    ) {
      return {
        valid: false,
        error: "Serial numbers must have the same prefix and suffix",
      };
    }

    if (startParsed.number > endParsed.number) {
      return {
        valid: false,
        error: "Start number must be less than or equal to end number",
      };
    }

    const range = endParsed.number - startParsed.number + 1;
    if (range > 1000) {
      return { valid: false, error: "Range cannot exceed 1000 cards" };
    }

    return { valid: true, range };
  };

  // Apply client-side filtering as fallback (backend may not filter correctly)
  const filteredMerchants = useMemo(() => {
    let filtered = [...merchants];
    
    // Filter by status (client-side fallback)
    if (statusFilter !== "all") {
      filtered = filtered.filter((merchant) => merchant.status === statusFilter);
    }
    
    // Filter by location (client-side fallback)
    if (locationFilter !== "all") {
      filtered = filtered.filter((merchant) => merchant.location === locationFilter);
    }
    
    // Filter by verification status (client-side fallback)
    if (verificationFilter !== "all") {
      filtered = filtered.filter((merchant) => merchant.verificationStatus === verificationFilter);
    }
    
    // Filter by search term (client-side fallback)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter((merchant) => 
        merchant.businessName.toLowerCase().includes(searchLower) ||
        merchant.ownerName.toLowerCase().includes(searchLower) ||
        merchant.email.toLowerCase().includes(searchLower) ||
        merchant.phone.includes(searchLower) ||
        (merchant.location && merchant.location.toLowerCase().includes(searchLower))
      );
    }
    
    return filtered;
  }, [merchants, statusFilter, locationFilter, verificationFilter, debouncedSearchTerm]);

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locations = merchants.map((merchant) => merchant.location).filter(Boolean);
    return [...new Set(locations)].sort() as string[];
  }, [merchants]);

  // Pagination - client-side pagination on filtered results
  const totalFilteredCount = filteredMerchants.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMerchants = filteredMerchants.slice(startIndex, endIndex);

  // Mutations
  const createMerchantMutation = useMutation({
    mutationFn: async (data: any) => {
      return await merchantsApi.createMerchant(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: t("admin.merchants.toast.merchantAdded"),
        description: t("admin.merchants.toast.merchantAddedDesc"),
      });
      setIsAddDialogOpen(false);
      // Store the newly created merchant ID and open credentials dialog
      setNewlyCreatedMerchantId(data.id?.toString() || null);
      setIsCreateCredentialsDialogOpen(true);
      setNewMerchant({
        businessName: "",
        ownerName: "",
        email: "",
        phone: "",
        location: "",
        businessType: "",
      });
    },
    onError: (error: any) => {
      console.error('Create merchant error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle Django REST Framework validation errors
      let errorMessage = t("admin.merchants.toast.error");
      const errorData = error.response?.data;
      
      if (errorData) {
        // Check for nested error structure
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'object') {
          // Handle field-specific errors (e.g., {email: ['This field must be unique.']})
          const fieldErrors: string[] = [];
          Object.keys(errorData).forEach((field) => {
            const fieldError = errorData[field];
            if (Array.isArray(fieldError)) {
              fieldErrors.push(`${field}: ${fieldError.join(', ')}`);
            } else if (typeof fieldError === 'string') {
              fieldErrors.push(`${field}: ${fieldError}`);
            } else if (typeof fieldError === 'object') {
              fieldErrors.push(`${field}: ${JSON.stringify(fieldError)}`);
            }
          });
          if (fieldErrors.length > 0) {
            errorMessage = fieldErrors.join('; ');
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        }
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

  // Create credentials mutation
  const createCredentialsMutation = useMutation({
    mutationFn: async (data: { mobile: string; password: string }) => {
      if (!newlyCreatedMerchantId) throw new Error("Merchant ID not found");
      return await merchantsApi.createMerchantCredentials(newlyCreatedMerchantId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: t("admin.merchants.toast.credentialsCreated"),
        description: t("admin.merchants.toast.credentialsCreatedDesc"),
      });
      setIsCreateCredentialsDialogOpen(false);
      setNewlyCreatedMerchantId(null);
      setCredentialsForm({ mobile: "", password: "" });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.merchants.toast.error"),
        variant: "destructive",
      });
    },
  });

  const updateMerchantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await merchantsApi.updateMerchant(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: t("admin.merchants.toast.merchantUpdated"),
        description: t("admin.merchants.toast.merchantUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
      setEditingMerchant({});
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.merchants.toast.error"),
        variant: "destructive",
      });
    },
  });

  const deleteMerchantMutation = useMutation({
    mutationFn: async (id: string) => {
      return await merchantsApi.deleteMerchant(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: t("admin.merchants.toast.merchantDeleted"),
        description: t("admin.merchants.toast.merchantDeletedDesc"),
      });
      setIsDeleteDialogOpen(false);
      setMerchantToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.merchants.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Assign cards mutation
  const assignCardsMutation = useMutation({
    mutationFn: async ({ id, numberOfCards }: { id: string; numberOfCards: number }) => {
      return await merchantsApi.assignCards(id, { number_of_cards: numberOfCards });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['merchants'] });
      toast({
        title: t("admin.merchants.toast.cardsAssigned") || "Cards Assigned",
        description: data.message || `Successfully assigned ${data.assigned_count || 0} cards`,
      });
      setIsAssignCardsDialogOpen(false);
      setMerchantToAssignCards(null);
      setNumberOfCards("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.merchants.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, locationFilter, verificationFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.merchants.status.active");
      case "inactive":
        return t("admin.merchants.status.inactive");
      case "suspended":
        return t("admin.merchants.status.suspended");
      case "pending":
        return t("admin.merchants.status.pending");
      default:
        return status;
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVerificationText = (status: string) => {
    switch (status) {
      case "verified":
        return t("admin.merchants.verification.verified");
      case "pending":
        return t("admin.merchants.verification.pending");
      case "rejected":
        return t("admin.merchants.verification.rejected");
      default:
        return status;
    }
  };

  const handleEditMerchant = (merchant: MerchantAccount) => {
    setSelectedMerchant(merchant);
    setEditingMerchant({
      businessName: merchant.businessName,
      ownerName: merchant.ownerName,
      email: merchant.email,
      phone: merchant.phone,
      location: merchant.location,
      businessType: merchant.businessType,
      commissionRate: merchant.commissionRate,
      taxId: merchant.taxId,
      bankAccount: merchant.bankAccount,
      status: merchant.status,
      verificationStatus: merchant.verificationStatus,
    });
    setIsEditDialogOpen(true);
  };

  const handleViewMerchant = (merchant: MerchantAccount) => {
    setSelectedMerchant(merchant);
    setShowMerchantDetails(true);
  };

  const handleCreateCredentialsForMerchant = (merchant: MerchantAccount) => {
    setNewlyCreatedMerchantId(merchant.id);
    setIsCreateCredentialsDialogOpen(true);
    setCredentialsForm({ mobile: merchant.phone || "", password: "" });
  };

  const handleDeleteMerchant = (merchantId: string | number) => {
    // Convert merchantId to string for comparison
    const merchantIdStr = String(merchantId);
    
    // Try to find in merchants array first (mapped data)
    let merchant = merchants.find((m) => String(m.id) === merchantIdStr);
    let rawMerchant: any = null;
    
    // If not found, try in merchantsData.results (raw API data)
    if (!merchant) {
      rawMerchant = merchantsData?.results?.find((m: any) => String(m.id) === merchantIdStr);
    }
    
    if (merchant) {
      // Use mapped merchant data
      setMerchantToDelete(merchant);
    } else if (rawMerchant) {
      // Use raw API data
      setMerchantToDelete({
        id: String(rawMerchant.id),
        businessName: rawMerchant.business_name || '',
        ownerName: rawMerchant.owner_name || '',
        email: rawMerchant.email || '',
        phone: rawMerchant.phone || '',
        status: rawMerchant.status || 'active',
        registrationDate: rawMerchant.registration_date || '',
        lastLogin: rawMerchant.last_login || undefined,
        totalEvents: rawMerchant.total_events || 0,
        totalRevenue: parseFloat(rawMerchant.total_revenue) || 0,
        commissionRate: parseFloat(rawMerchant.commission_rate) * 100 || 0,
        payoutBalance: parseFloat(rawMerchant.payout_balance) || 0,
        location: rawMerchant.location || '',
        businessType: rawMerchant.business_type || '',
        taxId: rawMerchant.tax_id || undefined,
        bankAccount: rawMerchant.bank_account || undefined,
        profileImage: rawMerchant.profile_image || undefined,
        verificationStatus: rawMerchant.verification_status || 'pending',
        documents: rawMerchant.documents || [],
        ticketsAssigned: rawMerchant.tickets_assigned || 0,
      });
    } else {
      // Fallback: create merchant object from ID if not found
      setMerchantToDelete({
        id: merchantIdStr,
        businessName: '',
        ownerName: '',
        email: '',
        phone: '',
        status: 'active',
        registrationDate: '',
        totalEvents: 0,
        totalRevenue: 0,
        commissionRate: 0,
        payoutBalance: 0,
        location: '',
        businessType: '',
        verificationStatus: 'pending',
        documents: [],
        ticketsAssigned: 0,
      });
    }
    
    // Always open the dialog
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteMerchant = () => {
    if (merchantToDelete) {
      deleteMerchantMutation.mutate(merchantToDelete.id);
    }
  };

  const handleAssignCards = (merchant: MerchantAccount) => {
    setMerchantToAssignCards(merchant);
    setNumberOfCards("");
    setIsAssignCardsDialogOpen(true);
  };

  const confirmAssignCards = () => {
    if (!merchantToAssignCards) return;
    
    const numCards = parseInt(numberOfCards);
    if (isNaN(numCards) || numCards <= 0) {
      toast({
        title: t("common.error"),
        description: "Please enter a valid number greater than 0",
        variant: "destructive",
      });
      return;
    }

    assignCardsMutation.mutate({
      id: merchantToAssignCards.id,
      numberOfCards: numCards,
    });
  };


  const handleAddMerchant = () => {
    if (!newMerchant.businessName || !newMerchant.ownerName || !newMerchant.email || !newMerchant.phone) {
      toast({
        title: t("common.error"),
        description: t("admin.merchants.toast.requiredFields") || "Business name, owner name, email, and phone are required",
        variant: "destructive",
      });
      return;
    }

    // Prepare merchant data - ensure required fields are not empty strings
    const merchantData: any = {
      business_name: newMerchant.businessName.trim(),
      owner_name: newMerchant.ownerName.trim(),
      email: newMerchant.email.trim(),
      phone: newMerchant.phone.trim(),
      location: (newMerchant.location && newMerchant.location.trim()) || "Not specified",
      business_type: (newMerchant.businessType && newMerchant.businessType.trim()) || "Other",
      status: 'active',
      verification_status: 'pending',
    };

    console.log('Creating merchant with data:', merchantData);
    createMerchantMutation.mutate(merchantData);
  };

  const handleCreateCredentials = () => {
    if (!credentialsForm.mobile || !credentialsForm.password) {
      toast({
        title: t("admin.merchants.toast.validationError") || t("common.error"),
        description: "Mobile number and password are required",
        variant: "destructive",
      });
      return;
    }

    // Validate that mobile contains only numbers
    if (!/^[0-9]+$/.test(credentialsForm.mobile)) {
      toast({
        title: t("admin.merchants.toast.validationError") || t("common.error"),
        description: "Mobile number must contain only numbers",
        variant: "destructive",
      });
      return;
    }

    if (credentialsForm.password.length < 6) {
      toast({
        title: t("admin.merchants.toast.validationError") || t("common.error"),
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    createCredentialsMutation.mutate(credentialsForm);
  };

  const handleSkipCredentials = () => {
    setIsCreateCredentialsDialogOpen(false);
    setNewlyCreatedMerchantId(null);
    setCredentialsForm({ mobile: "", password: "" });
  };

  const handleSaveMerchantChanges = () => {
    if (!selectedMerchant) return;
    
    if (!editingMerchant.businessName || !editingMerchant.ownerName || !editingMerchant.email || !editingMerchant.phone) {
      toast({
        title: t("common.error"),
        description: t("admin.merchants.toast.requiredFields") || "Business name, owner name, email, and phone are required",
        variant: "destructive",
      });
      return;
    }

    const updateData: any = {
      business_name: editingMerchant.businessName,
      owner_name: editingMerchant.ownerName,
      email: editingMerchant.email,
      phone: editingMerchant.phone,
      location: editingMerchant.location,
      business_type: editingMerchant.businessType,
      commission_rate: editingMerchant.commissionRate ? editingMerchant.commissionRate / 100 : undefined, // Convert percentage to decimal
      tax_id: editingMerchant.taxId,
      bank_account: editingMerchant.bankAccount,
    };

    if (editingMerchant.status) {
      updateData.status = editingMerchant.status;
    }
    if (editingMerchant.verificationStatus) {
      updateData.verification_status = editingMerchant.verificationStatus;
    }

    updateMerchantMutation.mutate({ id: selectedMerchant.id, data: updateData });
  };

  const handleTransferCards = () => {
    // Validate the range
    const validation = validateSerialRange(
      transferCardsForm.serialStart,
      transferCardsForm.serialEnd
    );

    if (!validation.valid) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if merchant is selected
    if (!transferCardsForm.selectedMerchantId) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: "Please select a merchant",
        variant: "destructive",
      });
      return;
    }

    // Generate serial numbers in range
    const serialNumbers = generateSerialNumbersInRange(
      transferCardsForm.serialStart,
      transferCardsForm.serialEnd
    );

    if (!serialNumbers) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: "Failed to generate serial numbers",
        variant: "destructive",
      });
      return;
    }

    // Get selected merchant
    const selectedMerchant = merchants.find(
      (m) => m.id === transferCardsForm.selectedMerchantId
    );

    if (!selectedMerchant) {
      toast({
        title: t("admin.merchants.toast.error"),
        description: "Selected merchant not found",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically make an API call to transfer the cards
    // For now, we'll just show a success message
    toast({
      title: t("admin.merchants.toast.cardsTransferred"),
      description: t("admin.merchants.toast.cardsTransferredDesc", {
        count: serialNumbers.length,
        start: transferCardsForm.serialStart,
        end: transferCardsForm.serialEnd,
        merchant: selectedMerchant.businessName,
      }),
    });

    // Close dialog and reset form
    setShowTransferCardsDialog(false);
    setTransferCardsForm({
      serialStart: "",
      serialEnd: "",
      selectedMerchantId: "",
    });
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.merchants.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.merchants.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredMerchants}
            columns={commonColumns.merchants}
            title={t("admin.merchants.title")}
            subtitle={t("admin.merchants.subtitle")}
            filename="merchant-accounts"
            filters={{
              search: searchTerm,
              status: statusFilter,
              location: locationFilter,
              verification: verificationFilter,
            }}
            onExport={() => {
              toast({
                title: t("admin.merchants.toast.exportSuccess"),
                description: t("admin.merchants.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.merchants.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.merchants.actions.addMerchant")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.totalMerchants")}
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(totalFilteredCount)}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.activeMerchants")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(
                    merchants.filter((m) => m.status === "active").length
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
                  {t("admin.merchants.stats.totalRevenue")}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(
                    merchants.reduce((sum, m) => sum + m.totalRevenue, 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("admin.merchants.stats.pendingVerification")}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatNumber(
                    merchants.filter((m) => m.verificationStatus === "pending")
                      .length
                  )}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.merchants.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.merchants.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.merchants.filters.status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.merchants.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.merchants.filters.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.merchants.filters.inactive")}
                </SelectItem>
                <SelectItem value="suspended">
                  {t("admin.merchants.filters.suspended")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.merchants.filters.pending")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.merchants.filters.location")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.merchants.filters.allLocations")}
                </SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={verificationFilter}
              onValueChange={setVerificationFilter}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.merchants.filters.verification")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.merchants.filters.allVerification")}
                </SelectItem>
                <SelectItem value="verified">
                  {t("admin.merchants.filters.verified")}
                </SelectItem>
                <SelectItem value="pending">
                  {t("admin.merchants.filters.pending")}
                </SelectItem>
                <SelectItem value="rejected">
                  {t("admin.merchants.filters.rejected")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Merchants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.merchants.table.merchant")} (
            {formatNumber(totalFilteredCount)})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.merchants.pagination.showing")} {totalFilteredCount > 0 ? startIndex + 1 : 0}-
              {Math.min(endIndex, totalFilteredCount)}{" "}
              {t("admin.merchants.pagination.of")} {totalFilteredCount}
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
          {merchantsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : merchantsError ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-500">
                {t("common.error")}: {merchantsError instanceof Error ? merchantsError.message : t("admin.merchants.toast.error")}
              </span>
            </div>
          ) : paginatedMerchants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("admin.merchants.noMerchantsFound") || "No merchants found"}</p>
              {(debouncedSearchTerm || statusFilter !== "all" || locationFilter !== "all" || verificationFilter !== "all") && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("admin.merchants.noMerchantsFiltered") || "Try adjusting your filters to see more results."}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.table.merchant")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.table.name") || "Name"}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.table.status")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.table.contact")}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.table.assignedCards") || "Assigned Cards"}
                    </TableHead>
                    <TableHead className="rtl:text-right ltr:text-left">
                      {t("admin.merchants.table.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="font-medium">{merchant.businessName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm rtl:text-right ltr:text-left">
                        {merchant.ownerName}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(merchant.status)}>
                        {getStatusText(merchant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="text-sm">{merchant.email}</p>
                        <p className="text-sm text-muted-foreground" dir="ltr">
                          {formatPhone(merchant.phone)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right ltr:text-left">
                        <p className="text-sm font-medium">
                          {merchant.assignedCardsCount || 0}
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
                          className="rtl:text-right ltr:text-left"
                        >
                          <DropdownMenuLabel>
                            {t("admin.merchants.table.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleViewMerchant(merchant)}
                          >
                            <Eye className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.viewDetails")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditMerchant(merchant)}
                          >
                            <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.editMerchant")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleCreateCredentialsForMerchant(merchant)}
                          >
                            <Key className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.createCredentials")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAssignCards(merchant)}
                          >
                            <CreditCard className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.assignCards") || "Assign Cards"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteMerchant(merchant.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("admin.merchants.actions.deleteMerchant")}
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
          {!merchantsLoading && !merchantsError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.merchants.pagination.showing")} ${
                totalFilteredCount > 0 ? startIndex + 1 : 0
              }-${Math.min(endIndex, totalFilteredCount)} ${t(
                "admin.merchants.pagination.of"
              )} ${totalFilteredCount}`}
              startIndex={totalFilteredCount > 0 ? startIndex + 1 : 0}
              endIndex={Math.min(endIndex, totalFilteredCount)}
              totalItems={totalFilteredCount}
              itemsPerPage={itemsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Merchant Details Dialog */}
      <Dialog open={showMerchantDetails} onOpenChange={setShowMerchantDetails}>
        <DialogContent className="max-w-2xl rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.merchantDetails")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.merchantDetailsSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.merchants.details.basicInfo") || "Basic Information"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.businessName")}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {selectedMerchant.businessName || "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.ownerName")}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {selectedMerchant.ownerName || "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.email")}
                    </p>
                    <p className="text-sm mt-1">
                      {selectedMerchant.email || "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.phone")}
                    </p>
                    <p className="text-sm mt-1" dir="ltr">
                      {selectedMerchant.phone ? formatPhone(selectedMerchant.phone) : "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.location")}
                    </p>
                    <p className="text-sm mt-1">
                      {selectedMerchant.location || "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.businessType")}
                    </p>
                    <p className="text-sm mt-1">
                      {selectedMerchant.businessType || "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.registrationDate")}
                    </p>
                    <p className="text-sm mt-1">
                      {selectedMerchant.registrationDate
                        ? formatDateForLocale(selectedMerchant.registrationDate)
                        : "-"}
                    </p>
                  </div>
                  <div className="rtl:text-right ltr:text-left">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.merchants.form.lastLogin")}
                    </p>
                    <p className="text-sm mt-1">
                      {selectedMerchant.lastLogin
                        ? formatDateForLocale(
                            selectedMerchant.lastLogin,
                            "MMM dd, yyyy HH:mm"
                          )
                        : t("admin.merchants.details.never")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              <div>
                <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  {t("admin.merchants.details.status") || "Status"}
                </h4>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t("admin.merchants.table.status")}
                    </p>
                    <Badge className={getStatusColor(selectedMerchant.status)}>
                      {getStatusText(selectedMerchant.status)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t("admin.merchants.table.verification")}
                    </p>
                    <Badge
                      className={getVerificationColor(
                        selectedMerchant.verificationStatus
                      )}
                    >
                      {getVerificationText(selectedMerchant.verificationStatus)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Ticket Assignment Statistics */}
              {merchantTicketsData && (
                <div>
                  <h4 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    {t("admin.merchants.details.ticketAssignments") || "Ticket Assignments"}
                  </h4>
                  {merchantTicketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                              {formatNumber(ticketStats.total)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.merchants.details.totalTicketsAssigned") || "Total"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {formatNumber(ticketStats.successful)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.merchants.details.successfulAssignments") || "Successful"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600">
                              {formatNumber(ticketStats.pending)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.merchants.details.pendingAssignments") || "Pending"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">
                              {formatNumber(ticketStats.failed)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("admin.merchants.details.failedAssignments") || "Failed"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMerchantDetails(false)}
            >
              {t("admin.merchants.dialogs.close")}
            </Button>
            <Button onClick={() => handleEditMerchant(selectedMerchant!)}>
              {t("admin.merchants.actions.editMerchant")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Merchant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.editMerchant")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.editMerchantSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.businessName")} *
                  </label>
                  <Input 
                    value={editingMerchant.businessName || selectedMerchant.businessName || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, businessName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.ownerName")} *
                  </label>
                  <Input 
                    value={editingMerchant.ownerName || selectedMerchant.ownerName || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, ownerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.email")} *
                  </label>
                  <Input 
                    type="email" 
                    value={editingMerchant.email || selectedMerchant.email || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.phone")} *
                  </label>
                  <Input 
                    value={editingMerchant.phone || selectedMerchant.phone || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, phone: e.target.value })}
                    dir="ltr" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.location")}
                  </label>
                  <Input 
                    value={editingMerchant.location || selectedMerchant.location || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.businessType")}
                  </label>
                  <Input 
                    value={editingMerchant.businessType || selectedMerchant.businessType || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, businessType: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.commissionRate")}
                  </label>
                  <Input
                    type="number"
                    value={editingMerchant.commissionRate !== undefined ? editingMerchant.commissionRate : selectedMerchant.commissionRate}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, commissionRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.status")}
                  </label>
                  <Select 
                    value={editingMerchant.status || selectedMerchant.status || "active"}
                    onValueChange={(value: "active" | "inactive" | "suspended") => 
                      setEditingMerchant({ ...editingMerchant, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.merchants.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.merchants.status.inactive")}
                      </SelectItem>
                      <SelectItem value="suspended">
                        {t("admin.merchants.status.suspended")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.verificationStatus")}
                  </label>
                  <Select 
                    value={editingMerchant.verificationStatus || selectedMerchant.verificationStatus || "pending"}
                    onValueChange={(value: "verified" | "pending" | "rejected") => 
                      setEditingMerchant({ ...editingMerchant, verificationStatus: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">
                        {t("admin.merchants.verification.verified")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("admin.merchants.verification.pending")}
                      </SelectItem>
                      <SelectItem value="rejected">
                        {t("admin.merchants.verification.rejected")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.taxId")}
                  </label>
                  <Input 
                    value={editingMerchant.taxId || selectedMerchant.taxId || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, taxId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right ltr:text-left">
                    {t("admin.merchants.form.bankAccount")}
                  </label>
                  <Input 
                    value={editingMerchant.bankAccount || selectedMerchant.bankAccount || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, bankAccount: e.target.value })}
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingMerchant({});
                setSelectedMerchant(null);
              }}
            >
              {t("admin.merchants.dialogs.cancel")}
            </Button>
            <Button 
              onClick={handleSaveMerchantChanges}
              disabled={updateMerchantMutation.isPending}
            >
              {updateMerchantMutation.isPending 
                ? t("common.loading") 
                : t("admin.merchants.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Merchant Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.addMerchant")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.addMerchantSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.businessName")} *
                </label>
                <Input
                  placeholder={t(
                    "admin.merchants.form.businessNamePlaceholder"
                  )}
                  value={newMerchant.businessName}
                  onChange={(e) => setNewMerchant({ ...newMerchant, businessName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.ownerName")} *
                </label>
                <Input
                  placeholder={t("admin.merchants.form.ownerNamePlaceholder")}
                  value={newMerchant.ownerName}
                  onChange={(e) => setNewMerchant({ ...newMerchant, ownerName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.email")} *
                </label>
                <Input
                  type="email"
                  placeholder={t("admin.merchants.form.emailPlaceholder")}
                  value={newMerchant.email}
                  onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.phone")} *
                </label>
                <Input
                  placeholder={t("admin.merchants.form.phonePlaceholder")}
                  value={newMerchant.phone}
                  onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.location")}
                </label>
                <Input
                  placeholder={t("admin.merchants.form.locationPlaceholder")}
                  value={newMerchant.location}
                  onChange={(e) => setNewMerchant({ ...newMerchant, location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.form.businessType")}
                </label>
                <Input
                  placeholder={t(
                    "admin.merchants.form.businessTypePlaceholder"
                  )}
                  value={newMerchant.businessType}
                  onChange={(e) => setNewMerchant({ ...newMerchant, businessType: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewMerchant({
                  businessName: "",
                  ownerName: "",
                  email: "",
                  phone: "",
                  location: "",
                  businessType: "",
                });
              }}
            >
              {t("admin.merchants.dialogs.cancel")}
            </Button>
            <Button 
              onClick={handleAddMerchant}
              disabled={createMerchantMutation.isPending}
            >
              {createMerchantMutation.isPending 
                ? t("common.loading") 
                : t("admin.merchants.dialogs.addMerchantButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Credentials Dialog */}
      <Dialog open={isCreateCredentialsDialogOpen} onOpenChange={setIsCreateCredentialsDialogOpen}>
        <DialogContent className="max-w-md rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Key className="h-5 w-5" />
              {t("admin.merchants.credentials.title")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.merchants.credentials.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.merchants.credentials.mobile")} *
              </label>
              <Input
                type="tel"
                placeholder={t("admin.merchants.credentials.mobilePlaceholder")}
                value={credentialsForm.mobile}
                onChange={(e) => {
                  // Only allow numbers (no text)
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setCredentialsForm({ ...credentialsForm, mobile: value });
                }}
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.merchants.credentials.password")} *
              </label>
              <Input
                type="password"
                placeholder={t("admin.merchants.credentials.passwordPlaceholder")}
                value={credentialsForm.password}
                onChange={(e) =>
                  setCredentialsForm({ ...credentialsForm, password: e.target.value })
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {t("admin.merchants.credentials.passwordHint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleSkipCredentials}>
              {t("admin.merchants.credentials.skip")}
            </Button>
            <Button
              onClick={handleCreateCredentials}
              disabled={createCredentialsMutation.isPending}
            >
              {createCredentialsMutation.isPending
                ? t("common.loading")
                : t("admin.merchants.credentials.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Merchant Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.deleteMerchant") || "Delete Merchant"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {merchantToDelete
                ? t("admin.merchants.dialogs.deleteMerchantConfirm", {
                    name: merchantToDelete.businessName || merchantToDelete.ownerName || merchantToDelete.email,
                  }) || `Are you sure you want to delete ${merchantToDelete.businessName || merchantToDelete.ownerName || merchantToDelete.email}? This action cannot be undone.`
                : t("admin.merchants.dialogs.deleteMerchantConfirm", { name: "" }) || "Are you sure you want to delete this merchant? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setMerchantToDelete(null);
              }}
            >
              {t("admin.merchants.dialogs.cancel") || t("common.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMerchant}
              disabled={deleteMerchantMutation.isPending}
            >
              {deleteMerchantMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.merchants.actions.deleteMerchant") || "Delete Merchant"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Cards Dialog */}
      <Dialog open={isAssignCardsDialogOpen} onOpenChange={setIsAssignCardsDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.merchants.dialogs.assignCards") || "Assign Cards to Merchant"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {merchantToAssignCards
                ? t("admin.merchants.dialogs.assignCardsDesc", {
                    name: merchantToAssignCards.businessName || merchantToAssignCards.ownerName || merchantToAssignCards.email,
                  }) || `Assign NFC cards to ${merchantToAssignCards.businessName || merchantToAssignCards.ownerName || merchantToAssignCards.email}. These cards will be available for the merchant to assign to customers.`
                : t("admin.merchants.dialogs.assignCardsDesc", { name: "" }) || "Assign NFC cards to this merchant. These cards will be available for the merchant to assign to customers."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {merchantToAssignCards && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium rtl:text-right ltr:text-left">
                  {t("admin.merchants.dialogs.merchant") || "Merchant"}: {merchantToAssignCards.businessName}
                </p>
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                  {t("admin.merchants.dialogs.currentAssignedCards") || "Currently Assigned Cards"}: {merchantToAssignCards.assignedCardsCount || 0}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium rtl:text-right ltr:text-left">
                {t("admin.merchants.dialogs.numberOfCards") || "Number of Cards"} *
              </label>
              <Input
                type="number"
                placeholder={t("admin.merchants.dialogs.numberOfCardsPlaceholder") || "Enter number of cards to assign"}
                value={numberOfCards}
                onChange={(e) => setNumberOfCards(e.target.value)}
                className="mt-1"
                min="1"
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right ltr:text-left">
                {t("admin.merchants.dialogs.numberOfCardsHint") || "Enter the number of unassigned NFC cards to assign to this merchant"}
              </p>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignCardsDialogOpen(false);
                setMerchantToAssignCards(null);
                setNumberOfCards("");
              }}
            >
              {t("admin.merchants.dialogs.cancel") || t("common.cancel") || "Cancel"}
            </Button>
            <Button
              onClick={confirmAssignCards}
              disabled={assignCardsMutation.isPending}
            >
              {assignCardsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                  {t("common.loading") || "Loading..."}
                </>
              ) : (
                t("admin.merchants.dialogs.assignCardsButton") || "Assign Cards"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default MerchantAccountsManagement;
