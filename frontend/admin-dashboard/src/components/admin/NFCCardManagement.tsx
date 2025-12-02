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
  CreditCard,
  MoreHorizontal,
  Key,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  CalendarX,
  AlertCircle,
  RefreshCw,
  Scan,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isAfter } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { formatCurrencyForLocale } from "@/lib/utils";
import { ExportDialog } from "@/components/ui/export-dialog";
import { commonColumns } from "@/lib/exportUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nfcCardsApi, customersApi } from "@/lib/api/adminApi";
import { useWebNFC } from "@/hooks/useWebNFC";

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
  cardType: "standard" | "premium" | "vip";
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasCard: boolean;
};

const NFCCardManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [selectedCard, setSelectedCard] = useState<NFCCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isAssignBySerialDialogOpen, setIsAssignBySerialDialogOpen] =
    useState(false);
  const [isGenerateKeyDialogOpen, setIsGenerateKeyDialogOpen] = useState(false);
  const [isAddByRangeDialogOpen, setIsAddByRangeDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cardsPerPage, setCardsPerPage] = useState(10);

  // Web NFC hook
  const { 
    isScanning, 
    isSupported, 
    error: nfcError, 
    scanCard, 
    stopScanning,
    isConnected,
    bridgeAvailable,
    onCardScanned
  } = useWebNFC();

  // State for scanned card
  const [scannedCardUID, setScannedCardUID] = useState<string>("");
  const [autoAddEnabled, setAutoAddEnabled] = useState(true); // Auto-add enabled by default for admin
  const [lastScannedCardId, setLastScannedCardId] = useState<string | null>(null); // Track last auto-added card
  const [lastScannedCardUID, setLastScannedCardUID] = useState<string | null>(null); // Track last scanned UID as fallback
  const [isAssignScannedCardDialogOpen, setIsAssignScannedCardDialogOpen] = useState(false);
  const isAdminInitiatedScanRef = React.useRef<boolean>(false); // Track if scan is from admin (not merchant)
  const [assignScannedCardForm, setAssignScannedCardForm] = useState({
    phoneNumber: "",
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<NFCCard | null>(null);

  // Form state for dialogs
  const [newCardForm, setNewCardForm] = useState({
    quantity: 1,
    startSerialNumber: "",
  });

  const [assignBySerialForm, setAssignBySerialForm] = useState({
    serialNumber: "",
    customerMobile: "",
  });

  const [addByRangeForm, setAddByRangeForm] = useState({
    serialStart: "",
    serialEnd: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    serialNumber: "",
    customerId: "",
    status: "active" as "active" | "inactive" | "expired",
    cardType: "standard" as "standard" | "premium" | "vip",
    issueDate: "",
    expiryDate: "",
    balance: 0,
  });

  const queryClient = useQueryClient();

  // Get date locale based on current language
  const getDateLocale = () => {
    return i18n.language === "ar" ? ar : enUS;
  };

  // Fetch NFC cards from API
  const { data: cardsData, isLoading: cardsLoading, error: cardsError } = useQuery({
    queryKey: ['nfcCards', searchTerm, statusFilter, customerFilter, currentPage, cardsPerPage],
    queryFn: async () => {
      const params: any = {
        page: currentPage,
        page_size: cardsPerPage,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (customerFilter !== 'all') params.customer = customerFilter;
      
      const response = await nfcCardsApi.getCards(params);
      return response;
    },
  });

  // Transform API cards to match NFCCard interface
  const nfcCards: NFCCard[] = useMemo(() => {
    if (!cardsData?.results) return [];
    return cardsData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      serialNumber: item.serial_number || '',
      customerId: item.customer?.id?.toString() || item.customer_id?.toString() || '',
      customerName: item.customer_name || item.customer?.name || '',
      status: item.status as "active" | "inactive" | "expired",
      issueDate: item.issue_date || '',
      expiryDate: item.expiry_date || '',
      balance: parseFloat(item.balance) || 0,
      lastUsed: item.last_used || '',
      usageCount: item.usage_count || 0,
      cardType: item.card_type as "standard" | "premium" | "vip" || "standard",
    }));
  }, [cardsData]);

  // Mock NFC cards data (removed - using API now)
  /*
  const [nfcCards, setNfcCards] = useState<NFCCard[]>([
    {
      id: "1",
      serialNumber: "NFC-001-2025",
      customerId: "C001",
      customerName: t("admin.tickets.nfc.mock.customer.ahmedHassan"),
      status: "active",
      issueDate: "2025-01-15",
      expiryDate: "2026-01-15",
      balance: 500,
      lastUsed: "2025-08-15T10:30:00",
      usageCount: 25,
      cardType: "premium",
    },
    {
      id: "2",
      serialNumber: "NFC-002-2025",
      customerId: "C002",
      customerName: t("admin.tickets.nfc.mock.customer.sarahMohamed"),
      status: "active",
      issueDate: "2025-02-20",
      expiryDate: "2026-02-20",
      balance: 300,
      lastUsed: "2025-08-14T15:45:00",
      usageCount: 18,
      cardType: "standard",
    },
    {
      id: "3",
      serialNumber: "NFC-003-2025",
      customerId: "C003",
      customerName: t("admin.tickets.nfc.mock.customer.omarAli"),
      status: "inactive",
      issueDate: "2025-03-10",
      expiryDate: "2026-03-10",
      balance: 0,
      lastUsed: "2025-07-20T09:15:00",
      usageCount: 5,
      cardType: "standard",
    },
    {
      id: "4",
      serialNumber: "NFC-004-2025",
      customerId: "C004",
      customerName: t("admin.tickets.nfc.mock.customer.fatimaAhmed"),
      status: "expired",
      issueDate: "2024-06-15",
      expiryDate: "2025-06-15",
      balance: 0,
      lastUsed: "2025-05-30T14:20:00",
      usageCount: 12,
      cardType: "vip",
    },
    {
      id: "5",
      serialNumber: "NFC-005-2025",
      customerId: "C005",
      customerName: t("admin.tickets.nfc.mock.customer.youssefIbrahim"),
      status: "active",
      issueDate: "2025-04-05",
      expiryDate: "2026-04-05",
      balance: 750,
      lastUsed: "2025-08-16T11:00:00",
      usageCount: 32,
      cardType: "vip",
    },
    {
      id: "6",
      serialNumber: "NFC-006-2025",
      customerId: "C006",
      customerName: t("admin.tickets.nfc.mock.customer.nourHassan"),
      status: "active",
      issueDate: "2025-05-10",
      expiryDate: "2026-05-10",
      balance: 200,
      lastUsed: "2025-08-17T14:30:00",
      usageCount: 8,
      cardType: "standard",
    },
    {
      id: "7",
      serialNumber: "NFC-007-2025",
      customerId: "C007",
      customerName: t("admin.tickets.nfc.mock.customer.mariamAli"),
      status: "inactive",
      issueDate: "2025-06-15",
      expiryDate: "2026-06-15",
      balance: 0,
      lastUsed: "2025-07-25T16:45:00",
      usageCount: 15,
      cardType: "premium",
    },
    {
      id: "8",
      serialNumber: "NFC-008-2025",
      customerId: "C008",
      customerName: "Karim Hassan",
      status: "active",
      issueDate: "2025-07-01",
      expiryDate: "2026-07-01",
      balance: 400,
      lastUsed: "2025-08-18T09:15:00",
      usageCount: 22,
      cardType: "vip",
    },
    {
      id: "9",
      serialNumber: "NFC-009-2025",
      customerId: "C009",
      customerName: "Layla Ahmed",
      status: "expired",
      issueDate: "2024-08-20",
      expiryDate: "2025-08-20",
      balance: 0,
      lastUsed: "2025-07-10T12:20:00",
      usageCount: 6,
      cardType: "standard",
    },
    {
      id: "10",
      serialNumber: "NFC-010-2025",
      customerId: "C010",
      customerName: "Hassan Ali",
      status: "active",
      issueDate: "2025-08-05",
      expiryDate: "2026-08-05",
      balance: 300,
      lastUsed: "2025-08-19T10:30:00",
      usageCount: 18,
      cardType: "premium",
    },
    {
      id: "11",
      serialNumber: "NFC-011-2025",
      customerId: "C011",
      customerName: "Nour Ibrahim",
      status: "active",
      issueDate: "2025-08-12",
      expiryDate: "2026-08-12",
      balance: 150,
      lastUsed: "2025-08-20T15:45:00",
      usageCount: 12,
      cardType: "standard",
    },
    {
      id: "12",
      serialNumber: "NFC-012-2025",
      customerId: "C012",
      customerName: "Amira Mohamed",
      status: "inactive",
      issueDate: "2025-08-18",
      expiryDate: "2026-08-18",
      balance: 0,
      lastUsed: "2025-08-15T11:00:00",
      usageCount: 4,
      cardType: "vip",
    },
    {
      id: "13",
      serialNumber: "NFC-013-2025",
      customerId: "C013",
      customerName: "Omar Khalil",
      status: "active",
      issueDate: "2025-08-25",
      expiryDate: "2026-08-25",
      balance: 600,
      lastUsed: "2025-08-21T13:20:00",
      usageCount: 28,
      cardType: "premium",
    },
    {
      id: "14",
      serialNumber: "NFC-014-2025",
      customerId: "C014",
      customerName: "Fatima Hassan",
      status: "active",
      issueDate: "2025-09-01",
      expiryDate: "2026-09-01",
      balance: 250,
      lastUsed: "2025-08-22T16:10:00",
      usageCount: 14,
      cardType: "standard",
    },
    {
      id: "15",
      serialNumber: "NFC-015-2025",
      customerId: "C015",
      customerName: "Youssef Ali",
      status: "expired",
      issueDate: "2024-09-10",
      expiryDate: "2025-09-10",
      balance: 0,
      lastUsed: "2025-08-05T09:30:00",
      usageCount: 9,
      cardType: "vip",
    },
  ]);
  */

  // Fetch customers for assign dialog
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const response = await customersApi.getCustomers({ page_size: 1000 });
      return response;
    },
  });

  // Transform customers for assign dialog
  const customers: Customer[] = useMemo(() => {
    if (!customersData?.results) return [];
    return customersData.results.map((item: any) => ({
      id: item.id?.toString() || '',
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || item.mobile_number || '',
      hasCard: item.nfc_cards?.length > 0 || false,
    }));
  }, [customersData]);

  // Filtered cards (API handles most filtering, but we keep client-side filtering for compatibility)
  const filteredCards = useMemo(() => {
    return nfcCards; // API handles filtering
  }, [nfcCards]);

  // Get unique customers for filter from cards data
  const uniqueCustomers = useMemo(() => {
    if (!cardsData?.results) return [];
    const customerMap = new Map();
    cardsData.results.forEach((card: any) => {
      const customerId = card.customer?.id?.toString() || card.customer_id?.toString();
      const customerName = card.customer_name || card.customer?.name;
      if (customerId && customerName && !customerMap.has(customerId)) {
        customerMap.set(customerId, {
          id: customerId,
          name: customerName,
        });
      }
    });
    return Array.from(customerMap.values());
  }, [cardsData]);

  // Pagination from API response
  const totalPages = cardsData?.total_pages || 1;
  const startIndex = cardsData?.page ? (cardsData.page - 1) * cardsData.page_size : 0;
  const endIndex = startIndex + (cardsData?.page_size || cardsPerPage);
  const paginatedCards = filteredCards;

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, customerFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return t("admin.tickets.nfc.status.active");
      case "inactive":
        return t("admin.tickets.nfc.status.inactive");
      case "expired":
        return t("admin.tickets.nfc.status.expired");
      default:
        return status;
    }
  };

  const getCardTypeColor = (type: string) => {
    switch (type) {
      case "vip":
        return "bg-purple-100 text-purple-800";
      case "premium":
        return "bg-blue-100 text-blue-800";
      case "standard":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCardTypeText = (type: string) => {
    switch (type) {
      case "vip":
        return t("admin.tickets.nfc.cardTypes.vip");
      case "premium":
        return t("admin.tickets.nfc.cardTypes.premium");
      case "standard":
        return t("admin.tickets.nfc.cardTypes.standard");
      default:
        return type;
    }
  };

  const isExpired = (expiryDate: string) => {
    return isAfter(new Date(), parseISO(expiryDate));
  };

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

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: async (data: any) => {
      return await nfcCardsApi.createCard(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfcCards'] });
      toast({
        title: t("admin.tickets.nfc.toast.cardAdded"),
        description: t("admin.tickets.nfc.toast.cardAddedDesc"),
      });
      setIsAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.tickets.nfc.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Auto-add cards when scanned (if auto-add is enabled)
  useEffect(() => {
    if (!onCardScanned) {
      console.log('⚠️  onCardScanned is not available');
      return;
    }

    console.log('✅ Auto-add handler registered. Auto-add enabled:', autoAddEnabled);

    const handleAutoAdd = async (uid: string) => {
      console.log('🎫 Card scanned received:', uid);
      console.log('   Auto-add enabled:', autoAddEnabled);
      
      // Reset the admin-initiated flag if it was set (for manual scans)
      if (isAdminInitiatedScanRef.current) {
        isAdminInitiatedScanRef.current = false;
      }
      
      if (!autoAddEnabled) {
        setScannedCardUID(uid);
        toast({
          title: t("admin.tickets.nfc.toast.cardScanned"),
          description: `Card scanned: ${uid}. Auto-add is disabled.`,
        });
        return;
      }
      
      console.log('   Checking if card exists...');

      // Format UID properly (ensure it's a string, uppercase, no spaces)
      const formattedUID = uid.toString().toUpperCase().trim().replace(/\s+/g, '');

      // Check if card already exists
      try {
        const existingCards = await nfcCardsApi.getCards({ search: formattedUID, page_size: 1 });
        if (existingCards.results && existingCards.results.length > 0) {
          const existingCard = existingCards.results[0];
          console.log('   ❌ Card already exists');
          
          // Check if card is already assigned to a customer
          if (existingCard.customer || existingCard.customer_id) {
            const customerName = existingCard.customer_name || 'a customer';
            const customerMobile = existingCard.customer_mobile || '';
            toast({
              title: t("admin.tickets.nfc.toast.cardExists"),
              description: `Card ${formattedUID} is already assigned to ${customerName}${customerMobile ? ` (${customerMobile})` : ''}. Cannot auto-add.`,
              variant: "destructive",
            });
            return;
          }
          
          // Card exists but not assigned - still don't auto-add (it already exists)
          toast({
            title: t("admin.tickets.nfc.toast.cardExists"),
            description: `Card ${formattedUID} already exists in the system`,
            variant: "destructive",
          });
          return;
        }
        console.log('   ✅ Card does not exist, proceeding to add...');
      } catch (error: any) {
        console.error('   ⚠️  Error checking existing cards:', error);
        // Don't continue with adding if check fails - show error instead
        toast({
          title: t("common.error"),
          description: `Failed to validate card ${formattedUID}. Please check manually.`,
          variant: "destructive",
        });
        return;
      }

      // Auto-add the card (formattedUID already set above)
      const cardData = {
        serial_number: formattedUID,
        status: 'active',
        card_type: 'standard',
        expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      try {
        console.log('   📤 Adding card to database...', cardData);
        const createdCardResponse = await createCardMutation.mutateAsync(cardData);
        console.log('   ✅ Card successfully added!', createdCardResponse);
        
        // Get the created card ID from response or search
        let cardId: string | null = null;
        if (createdCardResponse && createdCardResponse.id) {
          cardId = createdCardResponse.id;
          console.log('   📋 Card ID from response:', cardId);
        } else {
          // If not in response, search for it
          console.log('   🔍 Card ID not in response, searching...');
          await new Promise(resolve => setTimeout(resolve, 500));
          const createdCard = await nfcCardsApi.getCards({ search: formattedUID, page_size: 1 });
          if (createdCard.results && createdCard.results.length > 0) {
            cardId = createdCard.results[0].id;
            console.log('   📋 Card ID from search:', cardId);
          }
        }
        
        // Store UID as fallback
        setLastScannedCardUID(formattedUID);
        
        if (cardId) {
          setLastScannedCardId(cardId);
          console.log('   🔍 Checking if card has customer assigned...');
          
          // Check if card has no customer assigned
          try {
            const fetchedCard = await nfcCardsApi.getCard(cardId);
            console.log('   📋 Fetched card data:', {
              id: fetchedCard.id,
              customer_id: fetchedCard.customer_id,
              customer: fetchedCard.customer,
              hasCustomer: !!(fetchedCard.customer_id || fetchedCard.customer)
            });
            
            if (!fetchedCard.customer_id && !fetchedCard.customer) {
              console.log('   ✅ No customer assigned, opening assign dialog...');
              // Use setTimeout to ensure state update happens after render
              setTimeout(() => {
                setIsAssignScannedCardDialogOpen(true);
              }, 100);
            } else {
              console.log('   ℹ️  Card already has customer assigned');
            }
          } catch (fetchError) {
            console.error('   ⚠️  Error fetching card:', fetchError);
            // Still try to show dialog - assume no customer if we can't check
            console.log('   ✅ Opening assign dialog (assuming no customer)...');
            setTimeout(() => {
              setIsAssignScannedCardDialogOpen(true);
            }, 100);
          }
        } else {
          console.log('   ⚠️  Could not get card ID, but card was created - showing dialog anyway');
          // Even if we can't get card ID, show dialog since card was just created
          // We'll search for the card by UID when assigning
          setTimeout(() => {
            setIsAssignScannedCardDialogOpen(true);
          }, 100);
        }
        
        toast({
          title: t("admin.tickets.nfc.toast.cardAutoAdded"),
          description: `Card ${uid} has been automatically added to the system`,
        });
      } catch (error: any) {
        console.error('   ❌ Error adding card:', error);
        
        // If it's a 500 error, check if card was actually created
        if (error.response?.status === 500) {
          console.log('   ⚠️  Server error, checking if card was created...');
          try {
            // Wait a bit for the database to commit
            await new Promise(resolve => setTimeout(resolve, 1000));
            const existingCards = await nfcCardsApi.getCards({ search: formattedUID, page_size: 1 });
            if (existingCards.results && existingCards.results.length > 0) {
              console.log('   ✅ Card was actually created despite error!');
              const cardId = existingCards.results[0].id;
              setLastScannedCardId(cardId);
              setLastScannedCardUID(formattedUID);
              console.log('   📋 Card ID:', cardId);
              
              // Check if card has no customer assigned and show assign dialog
              try {
                const fetchedCard = await nfcCardsApi.getCard(cardId);
                console.log('   📋 Fetched card data:', {
                  id: fetchedCard.id,
                  customer_id: fetchedCard.customer_id,
                  customer: fetchedCard.customer,
                  hasCustomer: !!(fetchedCard.customer_id || fetchedCard.customer)
                });
                
                if (!fetchedCard.customer_id && !fetchedCard.customer) {
                  console.log('   ✅ No customer assigned, opening assign dialog...');
                  setTimeout(() => {
                    setIsAssignScannedCardDialogOpen(true);
                  }, 100);
                } else {
                  console.log('   ℹ️  Card already has customer assigned');
                }
              } catch (fetchError) {
                console.error('   ⚠️  Error fetching card:', fetchError);
                // Still show dialog - assume no customer if we can't check
                console.log('   ✅ Opening assign dialog (assuming no customer)...');
                setTimeout(() => {
                  setIsAssignScannedCardDialogOpen(true);
                }, 100);
              }
              
              // Refresh the list
              queryClient.invalidateQueries({ queryKey: ['nfcCards'] });
              toast({
                title: t("admin.tickets.nfc.toast.cardAutoAdded"),
                description: `Card ${uid} has been automatically added to the system`,
              });
              return; // Success, exit early
            }
          } catch (checkError) {
            console.error('   ⚠️  Error checking if card exists:', checkError);
          }
        }
        
        const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.message || 
                           error.response?.data?.serial_number?.[0] ||
                           error.message || 
                           "Failed to add card";
        toast({
          title: t("common.error"),
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    // Subscribe to card scans
    console.log('📡 Subscribing to card scan events...');
    const unsubscribe = onCardScanned(handleAutoAdd);
    console.log('✅ Subscribed to card scan events');

    return () => {
      console.log('🔌 Unsubscribing from card scan events');
      if (unsubscribe) unsubscribe();
    };
  }, [onCardScanned, autoAddEnabled, createCardMutation, toast, t]);

  // Update card mutation
  const updateCardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await nfcCardsApi.updateCard(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfcCards'] });
      toast({
        title: t("admin.tickets.nfc.toast.cardUpdated"),
        description: t("admin.tickets.nfc.toast.cardUpdatedDesc"),
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.tickets.nfc.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Delete card mutation
  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      return await nfcCardsApi.deleteCard(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfcCards'] });
      toast({
        title: t("admin.tickets.nfc.toast.cardDeleted") || "Card Deleted",
        description: t("admin.tickets.nfc.toast.cardDeletedDesc") || "Card has been successfully deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.response?.data?.message || error.message || t("admin.tickets.nfc.toast.error"),
        variant: "destructive",
      });
    },
  });

  // Bulk operation mutation
  const bulkOperationMutation = useMutation({
    mutationFn: async (data: { operation: string; card_ids: string[] }) => {
      return await nfcCardsApi.bulkOperation(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nfcCards'] });
      toast({
        title: t("admin.tickets.nfc.toast.bulkOperationSuccess"),
        description: `${data.count || 0} cards updated`,
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || t("admin.tickets.nfc.toast.error"),
        variant: "destructive",
      });
    },
  });

  const handleEditCard = (card: NFCCard) => {
    setSelectedCard(card);
    setEditForm({
      serialNumber: card.serialNumber,
      customerId: card.customerId || "",
      status: card.status,
      cardType: card.cardType,
      issueDate: card.issueDate,
      expiryDate: card.expiryDate,
      balance: card.balance,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteCard = (cardId: string) => {
    const card = nfcCards.find(c => c.id === cardId);
    if (card) {
      setCardToDelete(card);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteCard = () => {
    if (cardToDelete) {
      deleteCardMutation.mutate(cardToDelete.id);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
    }
  };

  const handleExportCards = () => {
    toast({
      title: t("admin.tickets.nfc.toast.exportSuccess"),
      description: t("admin.tickets.nfc.toast.exportSuccessDesc"),
    });
  };

  const handleGenerateKey = (cardId: string) => {
    setIsGenerateKeyDialogOpen(true);
    toast({
      title: t("admin.tickets.nfc.toast.keyGenerated"),
      description: t("admin.tickets.nfc.toast.keyGeneratedDesc"),
    });
  };

  const handleDeactivateCard = (cardId: string) => {
    updateCardMutation.mutate({ id: cardId, data: { status: 'inactive' } });
  };

  const handleReactivateCard = (cardId: string) => {
    updateCardMutation.mutate({ id: cardId, data: { status: 'active' } });
  };

  const handleAssignCard = () => {
    if (!newCardForm.startSerialNumber.trim()) {
      toast({
        title: t("common.error"),
        description: t("admin.tickets.nfc.form.enterSerialNumber"),
        variant: "destructive",
      });
      return;
    }

    // Create card with customer assignment
    const cardData = {
      serial_number: newCardForm.startSerialNumber.trim(),
      customer_id: customerFilter !== 'all' ? customerFilter : null,
      status: 'active',
      card_type: 'standard',
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    
    createCardMutation.mutate(cardData);
    setNewCardForm({ quantity: 1, startSerialNumber: "" });
  };

  // Handle NFC scan (standalone button)
  const handleStandaloneScan = async () => {
    if (!isSupported && !bridgeAvailable) {
      toast({
        title: t("common.error"),
        description: "NFC scanning is not available. Please start the NFC Bridge Server (see nfc-bridge-server/README-NODE.md) or use Chrome/Edge on Android.",
        variant: "destructive",
      });
      return;
    }

    // Mark this as an admin-initiated scan
    isAdminInitiatedScanRef.current = true;

    try {
      const result = await scanCard();
      
      if (result.success && result.serialNumber) {
        setScannedCardUID(result.serialNumber);
        toast({
          title: t("admin.tickets.nfc.toast.cardScanned"),
          description: `Card scanned: ${result.serialNumber}. Click "Add New Card" to add it.`,
        });
      } else {
        toast({
          title: t("common.error"),
          description: result.error || "Failed to scan NFC card",
          variant: "destructive",
        });
        setScannedCardUID("");
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to scan NFC card",
        variant: "destructive",
      });
      setScannedCardUID("");
    }
  };

  // Handle NFC scan (in dialog)
  const handleNFCScan = async () => {
    if (!isSupported && !bridgeAvailable) {
      toast({
        title: t("common.error"),
        description: "NFC scanning is not available. Please start the NFC Bridge Server.",
        variant: "destructive",
      });
      return;
    }

    // Mark this as an admin-initiated scan
    isAdminInitiatedScanRef.current = true;

    try {
      const result = await scanCard();
      
      if (result.success && result.serialNumber) {
        setNewCardForm(prev => ({
          ...prev,
          startSerialNumber: result.serialNumber || "",
        }));
        toast({
          title: t("admin.tickets.nfc.toast.cardScanned"),
          description: `Serial number: ${result.serialNumber}`,
        });
      } else {
        toast({
          title: t("common.error"),
          description: result.error || "Failed to scan NFC card",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to scan NFC card",
        variant: "destructive",
      });
    }
  };

  const handleAssignCardBySerial = () => {
    // Find card by serial number and assign to customer
    // This would require finding the card first, then updating it
    toast({
      title: t("admin.tickets.nfc.toast.cardAssignedBySerial"),
      description: t("admin.tickets.nfc.toast.cardAssignedBySerialDesc"),
    });
    setIsAssignBySerialDialogOpen(false);
  };

  // Handle assigning customer to scanned card
  const handleAssignScannedCard = async () => {
    // If we don't have card ID, try to find it by UID
    let cardId = lastScannedCardId;
    if (!cardId && lastScannedCardUID) {
      console.log('   🔍 Card ID not found, searching by UID:', lastScannedCardUID);
      try {
        const cards = await nfcCardsApi.getCards({ search: lastScannedCardUID, page_size: 1 });
        if (cards.results && cards.results.length > 0) {
          cardId = cards.results[0].id;
          setLastScannedCardId(cardId);
          console.log('   ✅ Found card ID:', cardId);
        }
      } catch (error) {
        console.error('   ❌ Error finding card by UID:', error);
      }
    }
    
    if (!cardId) {
      toast({
        title: t("common.error"),
        description: "Could not find the card. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (!assignScannedCardForm.phoneNumber.trim()) {
      toast({
        title: t("common.error"),
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      // Search for customer by phone number
      const customers = await customersApi.getCustomers({ 
        search: assignScannedCardForm.phoneNumber.trim(),
        page_size: 10 
      });

      if (!customers.results || customers.results.length === 0) {
        toast({
          title: t("common.error"),
          description: "Customer not found with this phone number",
          variant: "destructive",
        });
        return;
      }

      // Find exact match by phone number
      const customer = customers.results.find(
        (c: any) => 
          (c.phone === assignScannedCardForm.phoneNumber.trim()) ||
          (c.mobile_number === assignScannedCardForm.phoneNumber.trim())
      );

      if (!customer) {
        toast({
          title: t("common.error"),
          description: "Customer not found with this phone number",
          variant: "destructive",
        });
        return;
      }

      // Assign card to customer
      if (!lastScannedCardId) {
        toast({
          title: t("common.error"),
          description: "Card ID not found",
          variant: "destructive",
        });
        return;
      }
      
      await updateCardMutation.mutateAsync({
        id: lastScannedCardId,
        data: { customer: customer.id }
      });

      toast({
        title: "Card Assigned",
        description: `Card has been assigned to ${customer.name}`,
      });

      setIsAssignScannedCardDialogOpen(false);
      setAssignScannedCardForm({ phoneNumber: "" });
      setLastScannedCardId(null);
      setLastScannedCardUID(null);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.response?.data?.error?.message || error.message || "Failed to assign card",
        variant: "destructive",
      });
    }
  };

  const handleAddCardsByRange = () => {
    // Validate the range
    const validation = validateSerialRange(
      addByRangeForm.serialStart,
      addByRangeForm.serialEnd
    );

    if (!validation.valid) {
      toast({
        title: t("admin.tickets.nfc.toast.error"),
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Generate serial numbers in range
    const serialNumbers = generateSerialNumbersInRange(
      addByRangeForm.serialStart,
      addByRangeForm.serialEnd
    );

    if (!serialNumbers) {
      toast({
        title: t("admin.tickets.nfc.toast.error"),
        description: "Failed to generate serial numbers",
        variant: "destructive",
      });
      return;
    }

    // Create cards via API (bulk create)
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Create cards one by one (or use bulk endpoint if available)
    Promise.all(
      serialNumbers.map((serialNumber) =>
        nfcCardsApi.createCard({
          serial_number: serialNumber,
          status: 'inactive',
          card_type: 'standard',
          expiry_date: expiryDate,
        })
      )
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['nfcCards'] });
        setIsAddByRangeDialogOpen(false);
        setAddByRangeForm({ serialStart: "", serialEnd: "" });
        toast({
          title: t("admin.tickets.nfc.toast.cardsAddedByRange"),
          description: t("admin.tickets.nfc.toast.cardsAddedByRangeDesc", {
            count: serialNumbers.length,
            start: addByRangeForm.serialStart,
            end: addByRangeForm.serialEnd,
          }),
        });
      })
      .catch((error) => {
        toast({
          title: t("common.error"),
          description: error.response?.data?.error?.message || error.message || t("admin.tickets.nfc.toast.error"),
          variant: "destructive",
        });
      });
  };

  const handleCopyKey = () => {
    toast({
      title: t("admin.tickets.nfc.toast.keyCopied"),
      description: t("admin.tickets.nfc.toast.keyCopiedDesc"),
    });
    setIsGenerateKeyDialogOpen(false);
  };

  const handleSaveCardChanges = () => {
    if (!selectedCard) return;
    
    const formData: any = {
      serial_number: editForm.serialNumber,
      status: editForm.status,
      card_type: editForm.cardType,
      expiry_date: editForm.expiryDate,
      issue_date: editForm.issueDate,
      balance: editForm.balance,
    };
    
    // Include customer if selected (use null to unassign)
    if (editForm.customerId) {
      formData.customer = editForm.customerId;
    } else {
      formData.customer = null; // Explicitly set to null to unassign
    }
    
    updateCardMutation.mutate({ id: selectedCard.id, data: formData });
  };

  return (
    <div className="space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold rtl:text-right ltr:text-left">
            {t("admin.tickets.nfc.title")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground rtl:text-right ltr:text-left">
            {t("admin.tickets.nfc.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ExportDialog
            data={filteredCards}
            columns={commonColumns.nfcCards}
            title={t("admin.tickets.nfc.title")}
            subtitle={t("admin.tickets.nfc.subtitle")}
            filename="nfc-cards"
            filters={{
              search: searchTerm,
              status: statusFilter,
              customer: customerFilter,
            }}
            onExport={(format) => {
              toast({
                title: t("admin.tickets.nfc.toast.exportSuccess"),
                description: t("admin.tickets.nfc.toast.exportSuccessDesc"),
              });
            }}
          >
            <Button variant="outline" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
              <span className="hidden sm:inline">
                {t("admin.tickets.nfc.actions.export")}
              </span>
              <span className="sm:hidden">Export</span>
            </Button>
          </ExportDialog>
          {(isSupported || bridgeAvailable) && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-xs text-blue-700 dark:text-blue-300">
                    {isConnected ? t("admin.tickets.nfc.readerConnected") : t("admin.tickets.nfc.readerDisconnected")}
                  </span>
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 border rounded-md ${autoAddEnabled ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'}`}>
                <input
                  type="checkbox"
                  id="auto-add-toggle"
                  checked={autoAddEnabled}
                  onChange={(e) => setAutoAddEnabled(e.target.checked)}
                  className="h-3 w-3"
                />
                <label htmlFor="auto-add-toggle" className={`text-xs cursor-pointer ${autoAddEnabled ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                  {t("admin.tickets.nfc.autoAdd")} {autoAddEnabled && '✓'}
                </label>
              </div>
            </div>
          )}
          {scannedCardUID && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-mono">
                {scannedCardUID}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNewCardForm(prev => ({
                    ...prev,
                    startSerialNumber: scannedCardUID,
                  }));
                  setIsAssignDialogOpen(true);
                  setScannedCardUID("");
                }}
                className="h-6 px-2 text-xs"
              >
                {t("admin.tickets.nfc.actions.addScanned")}
              </Button>
            </div>
          )}
          <Button
            onClick={() => {
              if (scannedCardUID) {
                setNewCardForm(prev => ({
                  ...prev,
                  startSerialNumber: scannedCardUID,
                }));
                setScannedCardUID("");
              }
              setIsAssignDialogOpen(true);
            }}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.tickets.nfc.actions.assignCard")}
            </span>
            <span className="sm:hidden">Add</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsAssignBySerialDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.tickets.nfc.actions.assignBySerial")}
            </span>
            <span className="sm:hidden">Serial</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsAddByRangeDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 rtl:ml-1 sm:rtl:ml-2 rtl:mr-0" />
            <span className="hidden sm:inline">
              {t("admin.tickets.nfc.actions.addByRange")}
            </span>
            <span className="sm:hidden">Range</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
            <Filter className="h-5 w-5" />
            {t("admin.tickets.nfc.filters.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
              <Input
                placeholder={t("admin.tickets.nfc.filters.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3"
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.tickets.nfc.filters.status")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.tickets.nfc.filters.allStatus")}
                </SelectItem>
                <SelectItem value="active">
                  {t("admin.tickets.nfc.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.tickets.nfc.status.inactive")}
                </SelectItem>
                <SelectItem value="expired">
                  {t("admin.tickets.nfc.status.expired")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("admin.tickets.nfc.filters.customer")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("admin.tickets.nfc.filters.allCustomers")}
                </SelectItem>
                {uniqueCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* NFC Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            {t("admin.tickets.nfc.table.cards")} ({filteredCards.length})
          </CardTitle>
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <span className="text-sm text-muted-foreground">
              {t("admin.tickets.nfc.pagination.showing")} {startIndex + 1}-
              {Math.min(endIndex, filteredCards.length)}{" "}
              {t("admin.tickets.nfc.pagination.of")} {filteredCards.length}
            </span>
            <Select
              value={cardsPerPage.toString()}
              onValueChange={(value) => setCardsPerPage(parseInt(value))}
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
            <Table className="w-full rtl:text-right ltr:text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.serialNumber")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.customer")}
                  </TableHead>

                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.status")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.issueDate")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.expiryDate")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.balance")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.usage")}
                  </TableHead>
                  <TableHead className="rtl:text-right">
                    {t("admin.tickets.nfc.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cardsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <span className="ml-2 text-muted-foreground">{t("common.loading")}</span>
                    </TableCell>
                  </TableRow>
                ) : cardsError ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <span className="ml-2 text-red-500">
                        {t("common.error")}: {cardsError instanceof Error ? cardsError.message : t("admin.tickets.nfc.toast.error")}
                      </span>
                    </TableCell>
                  </TableRow>
                ) : paginatedCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">{t("admin.tickets.nfc.noCardsFound")}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{card.serialNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.tickets.nfc.table.id")}: {card.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">
                          {card.customerName || t("admin.tickets.nfc.table.unassigned")}
                        </p>
                        {card.customerId && (
                          <p className="text-sm text-muted-foreground">
                            {t("admin.tickets.nfc.table.id")}: {card.customerId}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={getStatusColor(card.status)}>
                        {getStatusText(card.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm rtl:text-right">
                        {format(parseISO(card.issueDate), "MMM dd, yyyy", {
                          locale: getDateLocale(),
                        })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="text-sm">
                          {format(parseISO(card.expiryDate), "MMM dd, yyyy", {
                            locale: getDateLocale(),
                          })}
                        </p>
                        {isExpired(card.expiryDate) && (
                          <p className="text-xs text-red-600">
                            {t("admin.tickets.nfc.table.expired")}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium rtl:text-right">
                        {formatCurrencyForLocale(card.balance, i18n.language)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="rtl:text-right">
                        <p className="font-medium">{card.usageCount}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.tickets.nfc.table.lastUsed")}:{" "}
                          {card.lastUsed
                            ? format(parseISO(card.lastUsed), "MMM dd", {
                                locale: getDateLocale(),
                              })
                            : t("admin.tickets.nfc.table.never")}
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
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>
                            {t("admin.tickets.nfc.table.actions")}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleEditCard(card)}
                          >
                            <Edit className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.tickets.nfc.actions.editCard")}
                          </DropdownMenuItem>
                          {card.status === "inactive" && (
                            <DropdownMenuItem
                              onClick={() => handleReactivateCard(card.id)}
                              className="text-green-600"
                            >
                              <UserCheck className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              {t("admin.tickets.nfc.actions.reactivateCard")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                            {t("admin.tickets.nfc.actions.deleteCard")}
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
          {!cardsLoading && !cardsError && (
            <ResponsivePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showInfo={true}
              infoText={`${t("admin.tickets.nfc.pagination.showing")} ${
                startIndex + 1
              }-${Math.min(endIndex, cardsData?.count || 0)} ${t(
                "admin.tickets.nfc.pagination.of"
              )} ${cardsData?.count || 0} ${t(
                "admin.tickets.nfc.pagination.results"
              )}`}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={cardsData?.count || 0}
              itemsPerPage={cardsPerPage}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.stats.totalCards")}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold">{cardsData?.count || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.stats.activeCards")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-green-600">
              {cardsData?.results?.filter((card: any) => card.status === "active").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.stats.inactiveCards")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-yellow-600">
              {cardsData?.results?.filter((card: any) => card.status === "inactive").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.stats.expiredCards")}
            </CardTitle>
            <CalendarX className="h-4 w-4 text-red-600 flex-shrink-0" />
          </CardHeader>
          <CardContent className="rtl:text-right">
            <div className="text-2xl font-bold text-red-600">
              {cardsData?.results?.filter((card: any) => card.status === "expired").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Card Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.editCard")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.editCardSubtitle")}
            </DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.serialNumber")}
                  </label>
                  <Input 
                    value={editForm.serialNumber}
                    onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.customer")}
                  </label>
                  <Select 
                    value={editForm.customerId || "__unassign__"}
                    onValueChange={(value) => setEditForm({ ...editForm, customerId: value === "__unassign__" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("admin.tickets.nfc.form.selectCustomer") || "Select customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassign__">
                        {(() => {
                          const translated = t("admin.tickets.nfc.form.unassign");
                          return translated !== "admin.tickets.nfc.form.unassign" ? translated : "Unassign";
                        })()}
                      </SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.status")}
                  </label>
                  <Select 
                    value={editForm.status}
                    onValueChange={(value: "active" | "inactive" | "expired") => setEditForm({ ...editForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        {t("admin.tickets.nfc.status.active")}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {t("admin.tickets.nfc.status.inactive")}
                      </SelectItem>
                      <SelectItem value="expired">
                        {t("admin.tickets.nfc.status.expired")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.cardType")}
                  </label>
                  <Select 
                    value={editForm.cardType}
                    onValueChange={(value: "standard" | "premium" | "vip") => setEditForm({ ...editForm, cardType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.issueDate")}
                  </label>
                  <Input 
                    type="date" 
                    value={editForm.issueDate}
                    onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.expiryDate")}
                  </label>
                  <Input 
                    type="date" 
                    value={editForm.expiryDate}
                    onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium rtl:text-right">
                    {t("admin.tickets.nfc.form.balance")}
                  </label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={editForm.balance}
                    onChange={(e) => setEditForm({ ...editForm, balance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              {t("admin.tickets.nfc.dialogs.cancel")}
            </Button>
            <Button onClick={handleSaveCardChanges}>
              {t("admin.tickets.nfc.dialogs.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Card Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open);
        if (!open) {
          stopScanning();
          setNewCardForm({ quantity: 1, startSerialNumber: "" });
        }
      }}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.addNewCard")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.addNewCardSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right">
                {t("admin.tickets.nfc.form.serialNumber")}
              </label>
              <div className="flex gap-2 rtl:flex-row-reverse">
                <Input
                  placeholder={t("admin.tickets.nfc.form.enterSerialNumber")}
                  value={newCardForm.startSerialNumber}
                  onChange={(e) =>
                    setNewCardForm((prev) => ({
                      ...prev,
                      startSerialNumber: e.target.value,
                    }))
                  }
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                  className="flex-1"
                />
                {isSupported && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNFCScan}
                    disabled={isScanning}
                    className="shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                        {t("admin.tickets.nfc.scanning")}
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                        {t("admin.tickets.nfc.scan")}
                      </>
                    )}
                  </Button>
                )}
              </div>
              {isSupported ? (
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.tickets.nfc.scanHint")}
                </p>
              ) : (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 rtl:text-right">
                  💡 {t("admin.tickets.nfc.manualEntryAvailable")}
                </p>
              )}
              {nfcError && (
                <p className="text-xs text-red-600 mt-1 rtl:text-right">
                  {nfcError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                stopScanning();
                setIsAssignDialogOpen(false);
                setNewCardForm({ quantity: 1, startSerialNumber: "" });
              }}
            >
              {t("admin.tickets.nfc.dialogs.cancel")}
            </Button>
            <Button onClick={handleAssignCard} disabled={isScanning}>
              {t("admin.tickets.nfc.dialogs.addNewCardButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Card by Serial Number Dialog */}
      <Dialog
        open={isAssignBySerialDialogOpen}
        onOpenChange={setIsAssignBySerialDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.assignBySerial")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.assignBySerialSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.nfc.form.serialNumber")}
                </label>
                <Input
                  placeholder={t("admin.tickets.nfc.form.enterSerialNumber")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.nfc.form.customerMobile")}
                </label>
                <Input
                  placeholder={t("admin.tickets.nfc.form.enterMobileNumber")}
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setIsAssignBySerialDialogOpen(false)}
            >
              {t("admin.tickets.nfc.dialogs.cancel")}
            </Button>
            <Button onClick={handleAssignCardBySerial}>
              {t("admin.tickets.nfc.dialogs.assignBySerialButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Cards by Range Dialog */}
      <Dialog
        open={isAddByRangeDialogOpen}
        onOpenChange={setIsAddByRangeDialogOpen}
      >
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.addByRange")}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.addByRangeSubtitle")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rtl:space-x-reverse">
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.nfc.form.serialStart")}
                </label>
                <Input
                  placeholder={t("admin.tickets.nfc.form.enterSerialStart")}
                  value={addByRangeForm.serialStart}
                  onChange={(e) =>
                    setAddByRangeForm((prev) => ({
                      ...prev,
                      serialStart: e.target.value,
                    }))
                  }
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.tickets.nfc.form.serialStartHelp")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium rtl:text-right">
                  {t("admin.tickets.nfc.form.serialEnd")}
                </label>
                <Input
                  placeholder={t("admin.tickets.nfc.form.enterSerialEnd")}
                  value={addByRangeForm.serialEnd}
                  onChange={(e) =>
                    setAddByRangeForm((prev) => ({
                      ...prev,
                      serialEnd: e.target.value,
                    }))
                  }
                  dir={i18n.language === "ar" ? "rtl" : "ltr"}
                />
                <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                  {t("admin.tickets.nfc.form.serialEndHelp")}
                </p>
              </div>
            </div>

            {/* Preview section */}
            {addByRangeForm.serialStart && addByRangeForm.serialEnd && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 rtl:text-right">
                  <strong>{t("admin.tickets.nfc.form.rangePreview")}:</strong>{" "}
                  {(() => {
                    const validation = validateSerialRange(
                      addByRangeForm.serialStart,
                      addByRangeForm.serialEnd
                    );
                    if (validation.valid) {
                      const serialNumbers = generateSerialNumbersInRange(
                        addByRangeForm.serialStart,
                        addByRangeForm.serialEnd
                      );
                      return t("admin.tickets.nfc.form.rangePreviewDesc", {
                        count: validation.range,
                        start: addByRangeForm.serialStart,
                        end: addByRangeForm.serialEnd,
                        examples:
                          serialNumbers?.slice(0, 3).join(", ") +
                          (serialNumbers && serialNumbers.length > 3
                            ? "..."
                            : ""),
                      });
                    } else {
                      return validation.error;
                    }
                  })()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setAddByRangeForm({ serialStart: "", serialEnd: "" });
                setIsAddByRangeDialogOpen(false);
              }}
            >
              {t("admin.tickets.nfc.dialogs.cancel")}
            </Button>
            <Button onClick={handleAddCardsByRange}>
              {t("admin.tickets.nfc.dialogs.addByRangeButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Customer to Scanned Card Dialog */}
      <Dialog
        open={isAssignScannedCardDialogOpen}
        onOpenChange={(open) => {
          setIsAssignScannedCardDialogOpen(open);
          if (!open) {
            setAssignScannedCardForm({ phoneNumber: "" });
            setLastScannedCardId(null);
            setLastScannedCardUID(null);
          }
        }}
      >
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              Assign Customer to Card
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              Enter the customer's phone number to assign this card
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium rtl:text-right">
                Phone Number
              </label>
              <Input
                placeholder="Enter customer phone number"
                value={assignScannedCardForm.phoneNumber}
                onChange={(e) =>
                  setAssignScannedCardForm((prev) => ({
                    ...prev,
                    phoneNumber: e.target.value,
                  }))
                }
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              />
              <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                Enter the phone number of the customer to assign this card to
              </p>
            </div>
          </div>
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignScannedCardDialogOpen(false);
                setAssignScannedCardForm({ phoneNumber: "" });
                setLastScannedCardId(null);
                setLastScannedCardUID(null);
              }}
            >
              {t("admin.tickets.nfc.dialogs.cancel")}
            </Button>
            <Button onClick={handleAssignScannedCard}>
              Assign Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.deleteCard") || "Delete NFC Card"}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {t("admin.tickets.nfc.dialogs.deleteCardConfirm") || "Are you sure you want to delete this NFC card? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {cardToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                <strong>{t("admin.tickets.nfc.table.serialNumber")}:</strong> {cardToDelete.serialNumber}
              </p>
              {cardToDelete.customerName && (
                <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left mt-2">
                  <strong>{t("admin.tickets.nfc.table.customer")}:</strong> {cardToDelete.customerName}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCardToDelete(null);
              }}
            >
              {t("admin.tickets.nfc.dialogs.cancel") || "Cancel"}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteCard}
              disabled={deleteCardMutation.isPending}
            >
              {deleteCardMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />
                  {t("common.deleting") || "Deleting..."}
                </>
              ) : (
                t("admin.tickets.nfc.actions.deleteCard") || "Delete Card"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NFCCardManagement;
