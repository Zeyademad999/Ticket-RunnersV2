import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/Contexts/AuthContext";
import { PaymentsService, KashierPaymentConfig } from "@/lib/api/services/payments";
import { NFCCardsService } from "@/lib/api/services/nfcCards";
import KashierPaymentModal from "@/components/KashierPaymentModal";
import { useEventDetails } from "@/lib/api/hooks/useEventDetails";
import {
  Ticket,
  Users,
  Plus,
  Minus,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  Store,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import i18n from "@/lib/i18n";
import { COUNTRY_DIAL_CODES } from "@/constants/countryCodes";

const Booking = () => {
  const { t } = useTranslation();
  const { user, isVip } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const { event: apiEvent, loading: eventLoading, error: eventError, fetchEvent } = useEventDetails();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showOwnerLockDialog, setShowOwnerLockDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<KashierPaymentConfig | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("credit_card");
  const [needsCardFee, setNeedsCardFee] = useState<boolean>(true); // Default to true (charge fee) until we check
  const [needsRenewalCost, setNeedsRenewalCost] = useState<boolean>(true); // Default to true (charge renewal) until we check

  // Fetch event details when component mounts
  useEffect(() => {
    if (eventId) {
      console.log("Fetching event for booking page, eventId:", eventId);
      fetchEvent(eventId);
    } else {
      console.warn("No eventId in URL params");
    }
  }, [eventId, fetchEvent]);

  // Fetch NFC card status when user is authenticated
  useEffect(() => {
    const fetchCardStatus = async () => {
      if (user) {
        try {
          const status = await NFCCardsService.getCardStatus();
          setNeedsCardFee(status.needs_card_fee);
          // setNeedsRenewalCost(status.needs_renewal_cost ?? true);
          setNeedsRenewalCost(false);
        } catch (error) {
          console.error("Failed to fetch NFC card status:", error);
          // Default to charging fee if check fails (safer default)
          setNeedsCardFee(true);
          setNeedsRenewalCost(true);
        }
      } else {
        // If user is not authenticated, default to charging fee
        setNeedsCardFee(true);
        setNeedsRenewalCost(true);
      }
    };
    fetchCardStatus();
  }, [user]);

  // Use real event data or fallback to defaults
  const eventData = apiEvent ? (() => {
    const apiEventRaw = apiEvent as any;
    return {
      title: apiEvent.title || "Event",
      date: apiEvent.date || new Date().toISOString().split("T")[0],
      time: apiEvent.time || "10:00",
      location: apiEvent.location || apiEvent.venueInfo || "Venue",
      minimumAge: apiEvent.minimumAge ?? apiEventRaw.minimum_age ?? undefined,
      price: apiEvent.price || 250,
      startingPrice: apiEvent.startingPrice || 300,
      childEligibilityEnabled:
        apiEvent.childEligibilityEnabled ??
        apiEventRaw.child_eligibility_enabled ??
        false,
      childEligibilityRuleType:
        apiEvent.childEligibilityRuleType ??
        apiEventRaw.child_eligibility_rule_type ??
        null,
      childEligibilityMinAge:
        apiEvent.childEligibilityMinAge ??
        apiEventRaw.child_eligibility_min_age ??
        null,
      childEligibilityMaxAge:
        apiEvent.childEligibilityMaxAge ??
        apiEventRaw.child_eligibility_max_age ??
        null,
      isUnseated: apiEvent.isUnseated ?? apiEventRaw.is_unseated ?? false,
      ticketCategories: apiEvent.ticketCategories || [],
    };
  })() : {
    title: "Loading...",
    date: new Date().toISOString().split('T')[0],
    time: "10:00",
    location: "Venue",
    minimumAge: undefined,
    price: 250,
    startingPrice: 300,
    childEligibilityEnabled: false,
    childEligibilityRuleType: null,
    childEligibilityMinAge: null,
    childEligibilityMaxAge: null,
    isUnseated: false,
    ticketCategories: [],
  };

  // Map ticket categories from admin form - only show what was explicitly added
  const ticketTiers = (eventData.ticketCategories || []).map((cat, index) => {
    const normalizedKey = cat.name?.toLowerCase().replace(/\s+/g, '_') || `tier_${index}`;
    const ticketColor = cat.color || '#10B981';
    return {
      key: normalizedKey as any,
      label: cat.name || `Tier ${index + 1}`, // Use name as label - this matches TicketCategory.name in backend
      price: typeof cat.price === 'number' ? cat.price : (parseFloat(String(cat.price || 0)) || 0),
      description: cat.description || t("booking.tierDescriptions.regular"),
      ticketsAvailable: cat.ticketsAvailable || 0, // Track available tickets per category
      // Store the original category name for API calls
      categoryName: cat.name || `Tier ${index + 1}`,
      // Store the color for this ticket category
      color: ticketColor, // Use the color from API or default to green
    };
  });
  
  type TierKey = (typeof ticketTiers)[number]["key"];
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ticketTiers.forEach(tier => {
      initial[tier.key] = 0;
    });
    return initial;
  });

  // Update quantities when ticketTiers change (e.g., when event data loads)
  useEffect(() => {
    setQuantities((prev) => {
      const updated: Record<string, number> = { ...prev };
      ticketTiers.forEach(tier => {
        if (!(tier.key in updated) || isNaN(updated[tier.key])) {
          updated[tier.key] = 0;
        }
      });
      return updated;
    });
  }, [ticketTiers.length, ticketTiers.map(t => t.key).join(',')]);

  const onConfirmPayment = () => {
    setShowTerms(true);
  };

  const onAcceptTerms = () => {
    setShowTerms(false);
    proceedWithPayment();
  };
  
  const proceedWithPayment = async () => {
    try {
      // Determine the main ticket category (use the first selected tier)
      const selectedTier = ticketTiers.find(t => {
        const qty = typeof quantities[t.key] === 'number' && !isNaN(quantities[t.key]) ? quantities[t.key] : 0;
        return qty > 0;
      });
      if (!selectedTier) {
        toast({
          title: t("booking.errorTitle"),
          description: t("booking.noTicketsSelected"),
          variant: "destructive",
        });
        return;
      }

      // Validate that tickets are selected
      if (totalTickets === 0) {
        toast({
          title: t("booking.errorTitle"),
          description: t("booking.noTicketsSelected"),
          variant: "destructive",
        });
        return;
      }

      let currentTickets = ensureOwnerTicket(
        tickets.slice(0, totalTickets).map((ticket) => ({ ...ticket })),
        totalTickets
      );

      // Validate that only one owner ticket is selected
      let ownerTicketsCount = currentTickets.filter((t) => t.isOwnerTicket).length;
      if (ownerTicketsCount > 1) {
        toast({
          title: t("booking.oneOwnerTicketOnlyTitle"),
          description: t("booking.oneOwnerTicketOnlyMessage"),
          variant: "destructive",
        });
        return;
      }

      if (ownerTicketsCount === 0 && totalTickets > 0) {
        toast({
          title: t("booking.validationError", "Validation Error"),
          description:
            t("booking.ownerTicketRequired") ||
            "Please mark one ticket as yours before continuing.",
          variant: "destructive",
        });
        return;
      }

      const normalizedUserPhone = normalizePhoneNumber(user?.mobile_number);
      if (normalizedUserPhone) {
        const conflictTicket = currentTickets.find(
          (t) =>
            !t.isOwnerTicket &&
            normalizePhoneNumber(t.mobile) === normalizedUserPhone
        );
        if (conflictTicket) {
          toast({
            title: t("booking.validationError", "Validation Error"),
            description:
              t("booking.ownerPhoneConflict") ||
              "You cannot assign another ticket to your own phone number.",
            variant: "destructive",
          });
          return;
        }
      }

      // Use the actual category name from the ticket tier
      const categoryName = (selectedTier as any).categoryName || selectedTier.label;
      
      // Validate phone numbers before proceeding
      const invalidTickets = currentTickets.filter((t) => {
        if (t.isOwnerTicket) return false; // Skip owner tickets
        if (!t.mobile || !t.mobile.trim()) return true; // Missing mobile
        return !/^\+?[\d\s\-\(\)]{10,15}$/.test(t.mobile.trim()); // Invalid format
      });

      if (invalidTickets.length > 0) {
        toast({
          title: t("booking.validationError", "Validation Error"),
          description: t("booking.invalidPhoneNumbers", "Please enter valid phone numbers for all tickets"),
          variant: "destructive",
        });
        return;
      }

      const missingInternationalEmails = currentTickets.filter(
        (t) =>
          !t.isOwnerTicket &&
          requiresEmailForTicket(t) &&
          !(t.email && t.email.trim())
      );

      if (missingInternationalEmails.length > 0) {
        toast({
          title: t("booking.validationError", "Validation Error"),
          description:
            t("booking.internationalEmailMissing") ||
            "Please enter an email for tickets with non-Egyptian phone numbers.",
          variant: "destructive",
        });
        return;
      }

      // Prepare ticket details for assignment
      // Map tickets array to ticket_details, ensuring we have details for all tickets
      // Include category and price for each ticket based on ticketType
      const ticketDetails = currentTickets.map((t, index) => {
        // Get the ticket type (category) for this ticket from addOrder
        const ticketTypeKey = addOrder[index] || selectedTier.key;
        const ticketTier = ticketTiers.find(tier => tier.key === ticketTypeKey) || selectedTier;
        
        // Determine category name - use categoryName if available, otherwise use label
        const ticketCategory = (ticketTier as any).categoryName || ticketTier.label;
        const ownerName = user?.name || "";
        const ownerMobile = user?.mobile_number || "";
        const ownerEmail = user?.email || "";
        
        return {
          name: (t.isOwnerTicket ? ownerName : t.name || '').trim(),
          mobile: (t.isOwnerTicket ? ownerMobile : t.mobile || '').trim(),
          email: (t.isOwnerTicket ? ownerEmail : t.email || '').trim(),
          is_owner: t.isOwnerTicket || false,
          category: ticketCategory,  // Ticket-specific category
          price: ticketTier.price,  // Ticket-specific price
        };
      });
      
      // If we have fewer ticket details than total tickets, pad with empty details
      while (ticketDetails.length < totalTickets) {
        const index = ticketDetails.length;
        const ticketTypeKey = addOrder[index] || selectedTier.key;
        const ticketTier = ticketTiers.find(tier => tier.key === ticketTypeKey) || selectedTier;
        const ticketCategory = ticketTier.key === "regular" 
          ? "regular" 
          : (ticketTier as any).categoryName || ticketTier.label;
        
        ticketDetails.push({
          name: '',
          mobile: '',
          email: '',
          is_owner: false,
          category: ticketCategory,
          price: ticketTier.price,
        });
      }
      
      // Initialize Kashier payment
      const paymentInitResponse = await PaymentsService.initializePayment({
        event_id: parseInt(eventId!, 10),
        amount: totalAmount,
        currency: "EGP",
        booking_data: {
          category: categoryName,
          quantity: totalTickets,
          ticket_details: ticketDetails.length > 0 ? ticketDetails : undefined,
        },
      });

      if (!paymentInitResponse.success || !paymentInitResponse.data) {
        throw new Error(
          paymentInitResponse.message ||
            paymentInitResponse.errors?.[0] ||
            "Failed to initialize payment"
        );
      }

      // Set payment config and show modal
      console.log("Payment config received:", paymentInitResponse.data);
      console.log("HPP URL:", paymentInitResponse.data?.hppUrl);
      setPaymentConfig(paymentInitResponse.data);
      setShowPaymentModal(true);
      
    } catch (error: any) {
      console.error("Payment initialization error:", error);
      console.error("Error details:", error.response?.data || error.message);
      
      // Extract error message from response
      let errorMessage = t("booking.paymentErrorDescription");
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t("booking.paymentErrorTitle"),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = (orderId: string) => {
    // Payment successful - tickets will be created by the callback/webhook
    // Navigate to success page
    toast({
      title: t("booking.paymentSuccessTitle"),
      description: t("booking.paymentSuccessDescription"),
    });

    navigate("/payment-confirmation", {
      state: {
        eventTitle: eventData.title,
        totalAmount,
        transactionId: orderId,
      },
    });
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: t("booking.paymentErrorTitle"),
      description: error || t("booking.paymentErrorDescription"),
      variant: "destructive",
    });
  };

  const [tickets, setTickets] = useState<
    {
      name: string;
      mobile: string;
      socialMedia: string;
      email?: string;
      assignedTicketNumber: number;
      ticketType: string;
      assigned?: boolean;
      isOwnerTicket?: boolean;
      mobileCountryCode?: string | null;
    }[]
  >([]);
  const [addOrder, setAddOrder] = useState<TierKey[]>([]);

  const ticketTypeColors: Record<string, string> = {
    platinum:
      "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-l-4 border-gray-400 dark:border-gray-300", // platinum
    gold: "bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-l-4 border-yellow-400 dark:border-yellow-300", // gold
    regular:
      "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-l-4 border-green-400 dark:border-green-300", // green
    default:
      "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-l-4 border-green-400 dark:border-green-300", // green (same as regular)
    standard:
      "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-l-4 border-green-400 dark:border-green-300", // green (same as regular)
  };

  const ticketTypeBadges: Record<string, { text: string; color: string | null }> = {
    platinum: { text: "VIP", color: "bg-gray-600 dark:bg-gray-500 text-white" },
    gold: {
      text: "Premium",
      color: "bg-yellow-600 dark:bg-yellow-500 text-white",
    },
    regular: {
      text: "Standard",
      color: "bg-green-600 dark:bg-green-500 text-white",
    },
    default: {
      text: "Standard",
      color: "bg-green-600 dark:bg-green-500 text-white",
    },
    standard: {
      text: "Standard",
      color: "bg-green-600 dark:bg-green-500 text-white",
    },
  };

  // Helper function to convert hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Helper function to get ticket type color style object
  const getTicketTypeColorStyle = (key: string): React.CSSProperties => {
    // First, try to find the ticket tier and use its color
    const tier = ticketTiers.find(t => t.key === key);
    if (tier && (tier as any).color) {
      const hexColor = (tier as any).color;
      const rgb = hexToRgb(hexColor);
      if (rgb) {
        // Use more visible opacity for better color visibility
        // Use backgroundImage for gradient and backgroundColor as fallback
        // Important: Use background shorthand to override any Tailwind classes
        // Return styles that will override Tailwind classes
        // Use backgroundImage for gradient (higher specificity than background classes)
        return {
          backgroundImage: `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2))`,
          backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
          borderLeft: `4px solid ${hexColor}`,
          // Ensure these override Tailwind classes
          background: `linear-gradient(to right, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15), rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2))`,
        };
      }
    }
    return {};
  };

  // Helper function to get ticket type color class (for fallback)
  const getTicketTypeColor = (key: string): string => {
    // Only use class-based colors if no custom color is set
    const tier = ticketTiers.find(t => t.key === key);
    if (tier && (tier as any).color) {
      return ''; // Return empty string to use inline styles instead
    }
    // Fallback to default colors
    return ticketTypeColors[key] || ticketTypeColors.regular;
  };

  // Helper function to get ticket type badge with fallback
  const getTicketTypeBadge = (key: string): { text: string; color: string | null } => {
    // First, try to find the ticket tier and use its color
    const tier = ticketTiers.find(t => t.key === key);
    if (tier && (tier as any).color) {
      // Return null for color to indicate we'll use inline styles
      return {
        text: "Standard",
        color: null // Use inline styles instead of className
      };
    }
    // Fallback to default badges
    return ticketTypeBadges[key] || ticketTypeBadges.regular;
  };

  // Helper function to get ticket color as hex for inline styles
  const getTicketColorHex = (key: string): string => {
    const tier = ticketTiers.find(t => t.key === key);
    if (tier && (tier as any).color) {
      return (tier as any).color;
    }
    // Default colors for known types
    const defaultColors: Record<string, string> = {
      platinum: '#6B7280',
      gold: '#D97706',
      regular: '#10B981',
      default: '#10B981',
      standard: '#10B981',
    };
    return defaultColors[key] || '#10B981';
  };

  // eventData is now defined above using real API data

  const totalTickets = Object.values(quantities).reduce((s, n) => {
    const num = typeof n === 'number' && !isNaN(n) ? n : 0;
    return s + num;
  }, 0);

  // Calculate base ticket price
  const baseTicketPrice = ticketTiers.reduce(
    (sum, t) => {
      const price = typeof t.price === 'number' && !isNaN(t.price) ? t.price : 0;
      const qty = quantities[t.key] || 0;
      return sum + (price * qty);
    },
    0
  );

  // Children are now handled as dependents, not separate tickets, so no discount calculation needed
  const freeChildrenDiscount = 0;

  // Calculate VIP discount for unseated events (2 free tickets)
  let vipDiscount = 0;
  if (eventData.isUnseated && isVip) {
    // Calculate the value of the first 2 tickets across all tiers
    let freeTicketsCount = 0;
    let freeTicketsValue = 0;

    for (const tier of ticketTiers) {
      const tierQuantity = typeof quantities[tier.key] === 'number' && !isNaN(quantities[tier.key]) ? quantities[tier.key] : 0;
      if (tierQuantity > 0) {
        const ticketsToMakeFree = Math.min(tierQuantity, 2 - freeTicketsCount);
        if (ticketsToMakeFree > 0) {
          freeTicketsValue += tier.price * ticketsToMakeFree;
          freeTicketsCount += ticketsToMakeFree;
        }
        if (freeTicketsCount >= 2) break;
      }
    }
    vipDiscount = freeTicketsValue;
  }

  const totalTicketPrice = baseTicketPrice - freeChildrenDiscount - vipDiscount;
  const vatAmount = totalTicketPrice * 0.14;
  const cardCost = needsCardFee ? 150 : 0; // Only charge if customer doesn't have NFC card and hasn't paid before
  const renewalCost = needsRenewalCost ? 150 : 0; // Only charge renewal cost once per customer
  const totalAmount = totalTicketPrice + vatAmount + cardCost + renewalCost;

  const changeQty = (tier: TierKey, delta: number) => {
    setQuantities((prev) => {
      const currentQty = typeof prev[tier] === 'number' && !isNaN(prev[tier]) ? prev[tier] : 0;
      const newQty = Math.max(0, currentQty + delta);
      setAddOrder((prevOrder) => {
        if (delta > 0) {
          // Add ticket
          return [...prevOrder, tier];
        } else if (delta < 0) {
          // Remove the first occurrence of this tier
          const idx = prevOrder.indexOf(tier);
          if (idx !== -1) {
            return prevOrder.filter((_, i) => i !== idx);
          }
        }
        return prevOrder;
      });
      return { ...prev, [tier]: newQty };
    });
  };

  const normalizePhoneNumber = (phone?: string) =>
    phone ? phone.replace(/\D+/g, "") : "";

  const detectCountryFromPhone = (phone?: string) => {
    if (!phone) return undefined;
    const normalized = phone.replace(/[\s-]/g, "");
    return COUNTRY_DIAL_CODES.find((country) => {
      const dial = country.dial_code.replace(/\s+/g, "");
      return normalized.startsWith(dial);
    });
  };

  const getUserCountryCode = () =>
    detectCountryFromPhone(user?.mobile_number)?.code || "EG";

  const requiresEmailForTicket = (ticket: (typeof tickets)[number]) => {
    const code =
      ticket.mobileCountryCode ||
      detectCountryFromPhone(ticket.mobile)?.code ||
      null;
    return Boolean(code && code !== "EG");
  };

  const ensureOwnerTicket = (
    updatedTickets: typeof tickets,
    total: number
  ) => {
    const slice = updatedTickets.slice(0, total);
    if (slice.some((t) => t.isOwnerTicket)) {
      return updatedTickets;
    }

    const isGuestAssigned = (ticket: (typeof tickets)[number]) =>
      Boolean(ticket.name?.trim()) && Boolean(ticket.mobile?.trim());

    if (total <= 1) {
      return updatedTickets;
    }

    const assignedGuestCount = slice.filter((ticket) =>
      isGuestAssigned(ticket)
    ).length;

    if (assignedGuestCount === 0 || assignedGuestCount < total - 1) {
      return updatedTickets;
    }

    const unassignedIndexes = slice
      .map((ticket, idx) => ({ ticket, idx }))
      .filter(
        ({ ticket }) => !ticket.isOwnerTicket && !isGuestAssigned(ticket)
      )
      .map(({ idx }) => idx);

    if (unassignedIndexes.length === 1) {
      const targetIndex = unassignedIndexes[0];
      updatedTickets[targetIndex] = {
        ...updatedTickets[targetIndex],
        isOwnerTicket: true,
        name: user?.name || "",
        mobile: user?.mobile_number || "",
        email: user?.email || "",
        mobileCountryCode: getUserCountryCode(),
      };
    }

    return updatedTickets;
  };

  const assignOwnerTicket = (targetIndex: number) => {
    const targetTicket = tickets[targetIndex];
    if (!targetTicket) return;

    const currentOwnerIndex = tickets.findIndex((t) => t?.isOwnerTicket);

    if (currentOwnerIndex === targetIndex) {
      setShowOwnerLockDialog(true);
      return;
    }

    const updated = [...tickets];

    if (currentOwnerIndex === -1) {
      updated[targetIndex] = {
        ...updated[targetIndex],
        isOwnerTicket: true,
        name: user?.name || "",
        mobile: user?.mobile_number || "",
        email: user?.email || "",
        mobileCountryCode: getUserCountryCode(),
      };
      setTickets(updated);
      return;
    }

    const currentOwner = tickets[currentOwnerIndex];
    if (
      currentOwner &&
      currentOwner.ticketType === targetTicket.ticketType
    ) {
      toast({
        title: t("booking.validationError", "Validation Error"),
        description:
          t("booking.ownerSameCategorySwitch") ||
          "You already have a ticket in this category. Choose another category to switch your ticket.",
        variant: "destructive",
      });
      return;
    }

    updated[currentOwnerIndex] = {
      ...updated[currentOwnerIndex],
      isOwnerTicket: false,
      name: "",
      mobile: "",
      email: "",
      mobileCountryCode: "EG",
    };

    updated[targetIndex] = {
      ...updated[targetIndex],
      isOwnerTicket: true,
      name: user?.name || "",
      mobile: user?.mobile_number || "",
      email: user?.email || "",
      mobileCountryCode: getUserCountryCode(),
    };

    setTickets(updated);
  };

  const updateTicket = (
    index: number,
    field: string,
    value: string | boolean | number | null
  ) => {
    if (
      field === "mobile" &&
      typeof value === "string" &&
      value &&
      user?.mobile_number
    ) {
      const normalizedInput = normalizePhoneNumber(value);
      const normalizedUser = normalizePhoneNumber(user.mobile_number);
      if (
        normalizedInput &&
        normalizedUser &&
        normalizedInput === normalizedUser
      ) {
        toast({
          title: t("booking.validationError", "Validation Error"),
          description:
            t("booking.ownerPhoneConflict") ||
            "You cannot assign another ticket to your own phone number.",
          variant: "destructive",
        });
        return;
      }
    }
    let updated = [...tickets];
    updated[index] = { ...updated[index], [field]: value };
    updated = ensureOwnerTicket(updated, totalTickets);
    setTickets(updated);
  };
  useEffect(() => {
    if (addOrder.length === 0) {
      setTickets([]);
      return;
    }
    setTickets((prev) => {
      const updated = [...prev];
      addOrder.forEach((ticketType, index) => {
        if (!updated[index]) {
          updated[index] = {
            name: "",
            mobile: "",
            socialMedia: "",
              email: "",
            assignedTicketNumber: index + 1,
            ticketType,
            isOwnerTicket: false,
              mobileCountryCode: "EG",
          };
        } else {
          updated[index].assignedTicketNumber = index + 1;
          updated[index].ticketType = ticketType;
        }
      });
      return ensureOwnerTicket(updated.slice(0, addOrder.length), addOrder.length);
    });
  }, [addOrder]);

  const [hours, minutes] = eventData.time.split(":").map(Number);
  const timeDate = new Date();
  timeDate.setHours(hours, minutes, 0);

  const formattedTime = new Intl.DateTimeFormat(i18n.language, {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(timeDate);

  const currency = t("currency.egp");
  const numberFormat = new Intl.NumberFormat(i18n.language);

  // Check if any ticket has empty required fields
  const hasIncompleteTickets = tickets.some((t) => {
    if (!t) return false;

    if (t.isOwnerTicket) return false;

    if (!t.name?.trim()) return true;
    if (!t.mobile?.trim()) return true;
    if (requiresEmailForTicket(t) && !t.email?.trim()) return true;

    return false;
  });
  return (
    <div className="min-h-screen bg-gradient-dark">
      <Dialog open={showOwnerLockDialog} onOpenChange={setShowOwnerLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("booking.ownerTicketLockedTitle", "Ticket Locked to You")}</DialogTitle>
          </DialogHeader>
          <p>
            {t(
              "booking.ownerTicketLockedDescription",
              "This ticket is automatically assigned to you so you can complete the booking. Add another ticket if you need to assign all tickets to other people."
            )}
          </p>
          <DialogFooter>
            <Button onClick={() => setShowOwnerLockDialog(false)}>
              {t("common.ok", "OK")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("terms.title")}</DialogTitle>
          </DialogHeader>
          <p>{t("terms.message")}</p>
          <div className="flex justify-end gap-4 mt-4">
            <Button variant="outline" onClick={() => setShowTerms(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onAcceptTerms}>{t("common.accept")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <KashierPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentConfig={paymentConfig}
        amount={totalAmount}
        currency={currency}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {eventLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          </div>
        ) : !apiEvent || eventError ? (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">
              {eventError || t("booking.eventNotFound", "Event not found")}
            </p>
            <Button onClick={() => navigate("/")}>
              {t("common.goHome", "Go to Home")}
            </Button>
          </div>
        ) : (
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
              {t("booking.title")}
            </h1>
          </div>
          {eventData.minimumAge && (
            <div className="mb-4 text-sm text-destructive">
              {t("booking.ageRestrictionNotice", { age: eventData.minimumAge })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Booking Form */}
            <div className="space-y-6">
              {/* Event Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-primary" />
                    {t("booking.eventDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="font-semibold text-lg">{eventData.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Intl.DateTimeFormat(i18n.language, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date(eventData.date))}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formattedTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {eventData.location}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Quantity */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("booking.ticketQuantities")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ticketTiers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      {t("booking.noTicketCategories", "No ticket categories available for this event.")}
                    </p>
                  ) : (
                    ticketTiers.map((tier) => {
                      const badge = getTicketTypeBadge(tier.key);
                      const colorClass = getTicketTypeColor(tier.key);
                      const colorStyle = getTicketTypeColorStyle(tier.key);
                      const ticketColorHex = getTicketColorHex(tier.key);
                      return (
                    <div
                      key={tier.key}
                      className={`p-4 rounded-lg transition-all duration-200 hover:shadow-md ${tier && (tier as any).color ? '' : (colorClass || '')}`}
                      style={Object.keys(colorStyle).length > 0 ? colorStyle : undefined}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={tier && (tier as any).color ? undefined : (badge.color || undefined)}
                              style={tier && (tier as any).color ? { 
                                backgroundColor: ticketColorHex,
                                color: '#ffffff',
                                border: 'none'
                              } : undefined}
                            >
                              {badge.text}
                            </Badge>
                            <h3 className="font-semibold text-lg">
                              {tier.label}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="text-2xl font-bold"
                              style={{ color: ticketColorHex }}
                            >
                              {typeof tier.price === 'number' && !isNaN(tier.price) ? tier.price : 0}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {t("currency.egp")} {t("booking.perTicket")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => changeQty(tier.key, -1)}
                            disabled={(typeof quantities[tier.key] === 'number' && !isNaN(quantities[tier.key]) ? quantities[tier.key] : 0) === 0}
                            className="hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-bold text-xl w-12 text-center bg-background/50 dark:bg-background/20 rounded-lg py-2">
                            {typeof quantities[tier.key] === 'number' && !isNaN(quantities[tier.key]) ? quantities[tier.key] : 0}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => changeQty(tier.key, 1)}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <Accordion type="single" collapsible className="mt-3">
                        <AccordionItem
                          value={`details-${tier.key}`}
                          className="border-none"
                        >
                          <AccordionTrigger className="py-2 hover:no-underline">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Info className="h-4 w-4" />
                              View Details
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                              {tier.description}
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                    );
                    })
                  )}

                  {ticketTiers.length > 0 && (
                    <div className="flex justify-between pt-2">
                      <span className="font-medium">{t("booking.subtotal")}</span>
                      <span>
                        {numberFormat.format(totalTicketPrice)} {currency}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Tickets Information */}

              {addOrder.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-1 mb-2">
                      <p className="text-red-500">
                        {t("booking.ticketDisclaimer")}
                      </p>
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {t("booking.allTicketsInfo")}
                    </CardTitle>
                    <CardDescription>
                      {t("booking.ticketsOptional")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {addOrder.map((ticketType, index) => {
                      const bgClass = getTicketTypeColor(ticketType);
                      const colorStyle = getTicketTypeColorStyle(ticketType);
                      const ticketRaw = tickets[index] || {};
                      const ticket = {
                        email: "",
                        mobileCountryCode: ticketRaw?.mobileCountryCode,
                        isOwnerTicket: false,
                        ...ticketRaw,
                      } as (typeof tickets)[number];

                      const phoneInvalid =
                        ticket.mobile &&
                        !/^\+?[\d\s\-\(\)]{10,15}$/.test(ticket.mobile.trim());

                      const requiresInternationalEmail = requiresEmailForTicket(
                        ticket
                      );

                      const ticketNumber = index + 1;

                      return (
                        <div
                          key={index}
                          className={`border border-border rounded-lg p-4 space-y-3 ${bgClass || ''}`}
                          style={Object.keys(colorStyle).length > 0 ? colorStyle : undefined}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                {t("booking.ticket") + ` ${ticketNumber}`}
                              </h4>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (ticket.isOwnerTicket) {
                                      setShowOwnerLockDialog(true);
                                      return;
                                    }
                                    assignOwnerTicket(index);
                                  }}
                                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 ${
                                    ticket.isOwnerTicket
                                      ? "bg-primary"
                                      : "bg-gray-200 dark:bg-gray-700"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                      ticket.isOwnerTicket
                                        ? "translate-x-8"
                                        : "translate-x-1"
                                    }`}
                                  />
                                </button>
                                <span
                                  className={`text-base font-semibold transition-colors ${
                                    ticket.isOwnerTicket
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {t("booking.thisIsMyTicket")}
                                </span>
                              </div>
                            </div>
                            {ticket.isOwnerTicket && (
                              <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-200 dark:border-amber-700">
                                <div className="flex items-start gap-2">
                                  <svg
                                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <span>{t("booking.transferFeeWarning")}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>{t("booking.ticketType")}</Label>
                              <Input
                                value={ticketTiers.find(t => t.key === ticketType)?.label || ticketType || ""}
                                disabled
                              />

                              {/* Only show name and mobile if not owner's ticket */}
                              {!ticket.isOwnerTicket ? (
                                <>
                                  <div className="space-y-2">
                                    <Label>{t("booking.name")}</Label>
                                    <Input
                                      value={ticket.name}
                                      onChange={(e) =>
                                        updateTicket(
                                          index,
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      placeholder={t("booking.name")}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <PhoneNumberInput
                                      id={`ticket-${index}-mobile`}
                                      label={t("booking.mobile")}
                                      value={ticket.mobile || ""}
                                      onChange={(val) =>
                                        updateTicket(index, "mobile", val)
                                      }
                                      onDialCodeChange={(_, country) =>
                                        updateTicket(
                                          index,
                                          "mobileCountryCode",
                                          country?.code || null
                                        )
                                      }
                                      required
                                      error={
                                        phoneInvalid
                                          ? t(
                                              "booking.invalidPhoneNumbers",
                                              "Please enter valid phone numbers for all tickets"
                                            )
                                          : undefined
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>
                                      {requiresInternationalEmail
                                        ? t(
                                            "booking.emailInternationalLabel",
                                            "Email (required for international numbers)"
                                          )
                                        : t(
                                            "booking.emailOptionalLabel",
                                            "Email (optional)"
                                          )}
                                    </Label>
                                    <Input
                                      type="email"
                                      required={requiresInternationalEmail}
                                      value={ticket.email || ""}
                                      onChange={(e) =>
                                        updateTicket(
                                          index,
                                          "email",
                                          e.target.value
                                        )
                                      }
                                      placeholder={
                                        t(
                                          "booking.emailPlaceholder",
                                          "Enter email address"
                                        ) || "email@example.com"
                                      }
                                    />
                                    {requiresInternationalEmail && (
                                      <p className="text-xs text-muted-foreground">
                                        {t(
                                          "booking.emailInternationalDescription",
                                          "We'll send this ticket via email because SMS may not be available for this number."
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                                  <p className="font-medium">
                                    {t("booking.ownersTicket")}
                                  </p>
                                  <p>{t("booking.ownersTicketDescription")}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    {t("booking.priceBreakdown")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>
                        {t("booking.ticketPrice", { count: totalTickets })}
                      </span>
                      <span>
                        {numberFormat.format(baseTicketPrice)} {currency}
                      </span>
                    </div>
                    {vipDiscount > 0 && (
                      <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                        <span>{t("booking.vipDiscount")}</span>
                        <span>
                          -{numberFormat.format(vipDiscount)} {currency}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-muted-foreground">
                      <span>{t("booking.vat")}</span>
                      <span>
                        {numberFormat.format(vatAmount)} {currency}
                      </span>
                    </div>
                    {cardCost > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("booking.cardCost")}</span>
                        <span>
                          {numberFormat.format(cardCost)} {currency}
                        </span>
                      </div>
                    )}
                    {renewalCost > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>{t("booking.renewalCost")}</span>
                        <span>
                          {numberFormat.format(renewalCost)} {currency}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>{t("booking.totalAmount")}</span>
                      <span>
                        {numberFormat.format(totalAmount)} {currency}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    {hasIncompleteTickets && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                        Please complete all required fields for tickets before
                        proceeding.
                      </div>
                    )}
                    <Button
                      variant="gradient"
                      size="lg"
                      className="w-full pt-1 pb-1"
                      onClick={onConfirmPayment}
                      disabled={hasIncompleteTickets}
                    >
                      <CreditCard className="h-5 w-5 mr-2 rtl:mr-0 rtl:ml-2" />
                      {t("booking.completePayment")}
                    </Button>

                    <div className="bg-primary/10 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Store className="h-4 w-4 text-primary mt-1" />
                        <div className="text-sm">
                          <p className="font-medium">
                            {t("booking.firstPurchaseNotice")}
                          </p>
                          <p className="text-muted-foreground">
                            {t("booking.nfcInstruction")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("booking.paymentMethods")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="payment"
                        id="card"
                        value="credit_card"
                        checked={selectedPaymentMethod === "credit_card"}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      />
                      <label htmlFor="card" className="flex items-center gap-2 cursor-pointer">
                        <CreditCard className="h-4 w-4" />
                        {t("booking.creditDebit")}
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default Booking;
