import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEventDetails } from "@/lib/api";
import { EventData } from "@/lib/api/types";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Share2,
  Heart,
  CalendarPlus,
  ParkingCircle,
  Accessibility,
  Wifi,
  Baby,
  Leaf,
  Utensils,
  ShowerHead,
  Music,
  Sun,
  Ban,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useAuth } from "@/Contexts/AuthContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareModal } from "@/components/ShareModal";
import { SignInPromptModal } from "@/components/SignInPromptModal";

// Using types from API

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

const EventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { isVip, user } = useAuth();
  // Check if user is a Black Card Customer
  // Check if user is a Black Card Customer - handle both string and object formats
  const isBlackCardCustomer = user?.labels?.some((label: any) => 
    (typeof label === 'string' && label === 'Black Card Customer') ||
    (typeof label === 'object' && label?.name === 'Black Card Customer')
  ) || false;
  const [showTerms, setShowTerms] = useState(true);
  const locale = i18n.language === "ar" ? "ar-EG" : i18n.language || "en-US";
  const [showLayout, setShowLayout] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const {
    addToFavorites,
    removeFromFavorites,
    loading: favoritesLoading,
  } = useFavorites();

  // Use the API hook for event details
  const { event: apiEvent, loading, error, fetchEvent } = useEventDetails();

  // Fetch event details when component mounts or ID changes
  useEffect(() => {
    if (id) {
      fetchEvent(id);
    }
  }, [id, fetchEvent]);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleToggleFavorite = async () => {
    if (!isFavorite) {
      // Add to favorites using API
      if (id) {
        const success = await addToFavorites(id);
        if (success) {
          setIsFavorite(true);
        }
      }
    } else {
      // Remove from favorites using API
      if (id) {
        const success = await removeFromFavorites(id);
        if (success) {
          setIsFavorite(false);
        }
      }
    }
  };

  // Use API event data or fallback to mock data for development
  const event: EventData = React.useMemo(() => {
    if (apiEvent) {
      console.log("Using API event data:", apiEvent);
      return apiEvent;
    }

    console.log("Using fallback mock data");
    // Fallback mock data for development/testing
    return {
      id,
      title: t("eventDetail.title"),
      videoUrl: "/SampleVideo.mp4",
      images: [
        { url: "/event1.jpg", isPrimary: true },
        { url: "/event2.jpg" },
        { url: "/event3.jpg" },
      ],
      layoutImageUrl: "/layoutPlaceholder.png",
      date: "2025-03-15",
      time: t("eventDetail.time"),
      location: t("eventDetail.location"),
      price: 150,
      originalPrice: 200,
      category: t("eventDetail.category"),
      rating: 4.8,
      attendees: 1250,
      description: t("eventDetail.description"),
      venueInfo: t("eventDetail.venueInfo"),
      facilities: [
        { name: "Parking", icon: "parking", available: true },
        { name: "Wheelchair Access", icon: "accessibility", available: true },
        { name: "Wi-Fi", icon: "wifi", available: true },
        { name: "Food", icon: "food", available: true },
      ],
      isFeatured: true,
      organizers: [{
        id: "org-12",
        name: t("eventDetail.organizer.name"),
        logoUrl: "/placeholderLogo.png",
        bio: "",
        events: [],
      }],
      organizer: {
        id: "org-12",
        name: t("eventDetail.organizer.name"),
        logoUrl: "/placeholderLogo.png",
        bio: "",
        events: [],
      },
      totalTickets: 1000,
      ticketsSold: 750,
      ticketsAvailable: 250,
      peopleAdmitted: 0,
      peopleRemaining: 1000,
      totalPayoutPending: 0,
      totalPayoutPaid: 0,
      ticketCategories: [
        {
          name: "General",
          price: 150,
          totalTickets: 500,
          ticketsSold: 400,
          ticketsAvailable: 100,
        },
        {
          name: "VIP",
          price: 300,
          totalTickets: 200,
          ticketsSold: 150,
          ticketsAvailable: 50,
        },
        {
          name: "Premium",
          price: 500,
          totalTickets: 100,
          ticketsSold: 50,
          ticketsAvailable: 50,
        },
      ],
      gallery: [],
      venue: undefined,
      gates: [],
      personalizedCardRequirements: undefined,
      walletRequirements: undefined,
    };
  }, [apiEvent, id, t]);

  // Check if event is already in favorites on component mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem("favoriteEvents");
    if (storedFavorites) {
      const favorites: any[] = JSON.parse(storedFavorites);
      const isEventFavorite = favorites.some((fav) => fav.id === event.id);
      setIsFavorite(isEventFavorite);
    }
  }, [event.id]);
  const facilityIcons: Record<string, JSX.Element> = {
    parking: <ParkingCircle className="w-5 h-5 text-primary" />,
    accessibility: <Accessibility className="w-5 h-5 text-primary" />,
    bathroom: <ShowerHead className="w-5 h-5 text-primary" />,
    "non-smoking": <Ban className="w-5 h-5 text-primary" />,
    wifi: <Wifi className="w-5 h-5 text-primary" />,
    baby: <Baby className="w-5 h-5 text-primary" />,
    greenArea: <Leaf className="w-5 h-5 text-primary" />,
    food: <Utensils className="w-5 h-5 text-primary" />,
    showers: <ShowerHead className="w-5 h-5 text-primary" />,
    music: <Music className="w-5 h-5 text-primary" />,
    outdoor: <Sun className="w-5 h-5 text-primary" />,
  };

  const mediaItems = useMemo(() => {
    const items: { type: "video" | "image" | "placeholder"; url: string }[] =
      [];
    if (event.videoUrl) items.push({ type: "video", url: event.videoUrl });
    const images = [...event.images];
    if (!event.videoUrl)
      images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    images.forEach(({ url }) => items.push({ type: "image", url }));

    // If no media items, add a placeholder
    if (items.length === 0) {
      items.push({ type: "placeholder", url: "" });
    }

    return items;
  }, [event]);

  // Format date properly - handle both YYYY-MM-DD and other formats
  const formatDate = useCallback(
    (dateStr: string): string => {
      if (!dateStr) return t("common.invalidDate");

      // Try parsing as ISO date (YYYY-MM-DD)
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Try parsing as date string with time
        const dateParts = dateStr.split("T")[0].split("-");
        if (dateParts.length === 3) {
          const [year, month, day] = dateParts;
          const parsedDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
          );
          if (!isNaN(parsedDate.getTime())) {
            return new Intl.DateTimeFormat(locale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(parsedDate);
          }
        }
        return t("common.invalidDate");
      }

      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    },
    [locale, t]
  );

  // Format time
  const formatTime = useCallback((timeStr: string | undefined): string => {
    if (!timeStr) return "";
    // Handle HH:MM:SS format and convert to HH:MM
    return timeStr.split(":").slice(0, 2).join(":");
  }, []);

  // Calculate minimum ticket price from all categories
  const minTicketPrice = useMemo(() => {
    const prices: number[] = [];
    
    // Get prices from ticket categories only
    if (event.ticketCategories && event.ticketCategories.length > 0) {
      event.ticketCategories.forEach((cat) => {
        const price = typeof cat.price === 'number' ? cat.price : parseFloat(String(cat.price || 0));
        if (price > 0) {
          prices.push(price);
        }
      });
    }
    
    // Fallback to startingPrice only if no ticket categories exist
    if (prices.length === 0 && event.startingPrice) {
      prices.push(event.startingPrice);
    }
    
    // Final fallback to price only if no ticket categories and no startingPrice
    if (prices.length === 0 && event.price) {
      prices.push(event.price);
    }
    
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [event.ticketCategories, event.startingPrice, event.price]);

  // Get all ticket categories including regular if it exists
  const allTicketCategories = useMemo(() => {
    const categories = [...(event.ticketCategories || [])];
    
    // Check if regular category exists in ticketCategories
    const hasRegular = categories.some(
      (cat) => cat.name.toLowerCase() === "regular"
    );
    
    // If regular doesn't exist in ticketCategories but we have startingPrice or price, add it
    // Only use startingPrice/price as fallback if no ticket categories exist
    if (!hasRegular && event.ticketCategories.length === 0 && (event.startingPrice || event.price)) {
      const regularPrice = event.startingPrice || event.price;
      categories.unshift({
        name: "Regular",
        price: regularPrice,
        totalTickets: event.totalTickets || 0,
        ticketsSold: event.ticketsSold || 0,
        ticketsAvailable: event.ticketsAvailable || 0,
      });
    }
    
    return categories;
  }, [event.ticketCategories, event.startingPrice, event.price, event.totalTickets, event.ticketsSold, event.ticketsAvailable]);

  const handleBooking = () => {
    // Check if user is authenticated
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    navigate(`/booking/${id}`);
  };

  const handleAddToCalendar = () => {
    if (!event) return;
    // 1. Build ICS content
    const startDate = new Date(`${event.date} ${event.time}`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // assume 2‑hour event
    const format = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]|\.\d{3}/g, "")
        .slice(0, 15);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Ticket Runners//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@ticketrunners.com`,
      `DTSTAMP:${format(new Date())}`,
      `DTSTART:${format(startDate)}`,
      `DTEND:${format(endDate)}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.location}`,
      `DESCRIPTION:${event.description}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    // 2. Trigger download
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: t("eventDetail.calendarToast") });
  };

  const goToOrganizer = (organizerId?: string) => {
    const id = organizerId || event?.organizer?.id || (event?.organizers && event.organizers.length > 0 ? event.organizers[0].id : undefined);
    if (!id) return;
    navigate(`/view-organizers/${id}`);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("common.error")}
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => id && fetchEvent(id)}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Format date and time after loading/error checks
  const formattedDate = formatDate(event.date);
  const formattedTime = formatTime(event.time);
  const formattedGatesOpenTime = event.gatesOpenTime
    ? formatTime(event.gatesOpenTime)
    : undefined;
  const formattedClosedDoorsTime = event.closedDoorsTime
    ? formatTime(event.closedDoorsTime)
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-dark">
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              dir={locale.startsWith("ar") ? "rtl" : "ltr"}
              style={{ textAlign: locale.startsWith("ar") ? "right" : "left" }}
              className="mt-2"
            >
              {t("eventDetail.eventTermsTitle")}
            </DialogTitle>
          </DialogHeader>
          <div
            className="space-y-4 text-sm max-h-[60vh] overflow-y-auto"
            dir={locale.startsWith("ar") ? "rtl" : "ltr"}
          >
            <p>{t("eventDetail.termsContent")}</p>
            <ul
              className={`${
                locale.startsWith("ar") ? "list-disc pr-4" : "list-disc pl-4"
              }`}
            >
              {(
                t("eventDetail.termsBullets", {
                  returnObjects: true,
                }) as string[]
              ).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowTerms(false)}>
              {t("common.accept")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Media Carousel */}
          <div className="relative rounded-xl overflow-hidden mb-8" dir="ltr">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              navigation={mediaItems.length > 1}
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1}
              autoplay={
                autoplayEnabled && mediaItems.length > 1
                  ? {
                      delay: 3000,
                      disableOnInteraction: false,
                    }
                  : false
              }
              loop={mediaItems.length > 1}
              className="h-96 w-full"
              onTouchStart={() => setAutoplayEnabled(false)}
              onTouchMove={() => setAutoplayEnabled(false)}
              onNavigationNext={() => setAutoplayEnabled(false)}
              onNavigationPrev={() => setAutoplayEnabled(false)}
            >
              {mediaItems.map((media, idx) => (
                <SwiperSlide
                  key={idx}
                  className="flex items-center justify-center h-full"
                >
                  {media.type === "video" ? (
                    <video
                      src={media.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="none"
                      poster="/video-placeholder.jpg"
                      className="w-full h-full object-cover aspect-video"
                    />
                  ) : media.type === "placeholder" ? (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                      <div className="text-center p-8">
                        <div className="text-xl font-semibold text-foreground mb-3">
                          {t("eventDetail.noMediaAvailable")}
                        </div>
                        <div className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                          {t("eventDetail.noMediaDescription")}
                        </div>
                        <div className="mt-4 text-xs text-muted-foreground/70">
                          {t("eventDetail.stayTuned")}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={media.url}
                      alt={`${event.title} media ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.src = "/image-fallback.jpg";
                      }}
                    />
                  )}
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Overlay Buttons */}
            <div className="absolute top-4 right-4 flex space-x-2 z-10">
              <Button
                variant="icon"
                size="icon"
                className="bg-background/80 backdrop-blur-sm"
                onClick={handleShare}
                aria-label={t("ariaLabels.share")}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="icon"
                size="icon"
                className="bg-background/80 backdrop-blur-sm"
                onClick={handleAddToCalendar}
                aria-label={t("ariaLabels.addToCalendar")}
              >
                <CalendarPlus className="h-4 w-4" />
              </Button>
              <Button
                variant="icon"
                size="icon"
                className={`bg-background/80 backdrop-blur-sm ${
                  isFavorite ? "text-red-500" : ""
                }`}
                onClick={handleToggleFavorite}
                disabled={favoritesLoading}
                aria-label={t("ariaLabels.addToFavorites")}
              >
                {favoritesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Heart
                    className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
                  />
                )}
              </Button>
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
              {event.isFeatured && (
                <Badge className="bg-gradient-primary text-primary-foreground border-0">
                  {t("badges.featured")}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-background/80 backdrop-blur-sm"
              >
                {event.category}
              </Badge>
              {isVip && (
                <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white border-0">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-1"></div>
                  {t("badges.vipEligible")}
                </Badge>
              )}
            </div>
          </div>

          {/* Event Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                {event.title}
              </h1>
              {event.artist_name && event.artist_name.trim() && (
                <p className="text-xl md:text-2xl font-medium text-muted-foreground mb-4">
                  {event.artist_name}
                </p>
              )}

              {/* Meta */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-5 w-5 mx-3" />
                  <div dir={locale.startsWith("ar") ? "rtl" : "ltr"}>
                    {formattedDate} {formattedTime && `at ${formattedTime}`}
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-5 w-5 mx-3" />
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        event.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {event.location}
                    </a>
                  </div>
                )}

                {formattedGatesOpenTime && (
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-5 w-5 mx-3" />
                    <span className="text-sm text-muted-foreground">
                      {t("eventDetail.gateOpen")} {formattedGatesOpenTime}
                    </span>
                  </div>
                )}
                {formattedClosedDoorsTime && (
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-5 w-5 mx-3" />
                    <span className="text-sm text-muted-foreground">
                      {t("eventDetail.gateClose")} {formattedClosedDoorsTime}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.aboutEvent")}
                  </h2>
                  <div
                    className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: event.description }}
                  />
                </div>
              )}

              {/* About the Venue */}
              {event.venueInfo && (
                <div
                  className="pt-6 space-y-2 relative"
                  dir={locale.startsWith("ar") ? "rtl" : "ltr"}
                >
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.venueInfoTitle")}
                  </h2>
                  <div
                    className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: event.venueInfo }}
                  />
                  {event.layoutImageUrl && (
                    <div
                      className="mt-4 flex w-full"
                      dir={locale.startsWith("ar") ? "rtl" : "ltr"}
                    >
                      <Button
                        variant="gradient"
                        onClick={() => {
                          console.log("Opening venue layout modal, image URL:", event.layoutImageUrl);
                          setShowLayout(true);
                        }}
                        className={
                          locale.startsWith("ar") ? "ml-auto" : "mr-auto"
                        }
                      >
                        {t("eventDetail.showLayout")}
                      </Button>
                    </div>
                  )}
                  <Dialog open={showLayout} onOpenChange={setShowLayout}>
                    <DialogContent className="max-w-4xl p-0 overflow-hidden">
                      <DialogHeader className="p-4 border-b">
                        <DialogTitle>{t("eventDetail.venueLayout")}</DialogTitle>
                      </DialogHeader>
                      <div className="p-4 overflow-auto max-h-[80vh]">
                        {event.layoutImageUrl ? (
                          <img
                            src={event.layoutImageUrl}
                            alt={t("eventDetail.venueLayout")}
                            className="w-full h-auto object-contain rounded-lg"
                            onLoad={() => {
                              console.log("Venue layout image loaded successfully:", event.layoutImageUrl);
                            }}
                            onError={(e) => {
                              console.error("Failed to load venue layout image:", event.layoutImageUrl);
                              console.error("Image error details:", e);
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-64 text-muted-foreground">
                            {t("eventDetail.noVenueLayout", "No venue layout image available")}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {event.facilities && event.facilities.length > 0 && (
                <div className="pt-6">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.facilitiesTitle")}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {event.facilities.map((facility) => (
                      <div
                        key={facility.name}
                        className={`flex items-center gap-2 relative ${
                          !facility.available ? "opacity-60" : ""
                        }`}
                      >
                        <div className="relative">
                          {facilityIcons[facility.icon] || null}
                          {!facility.available && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-0.5 bg-red-500 transform rotate-45"></div>
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {t(`eventDetail.facilities.${facility.name}`, facility.name)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comprehensive Venue Information */}
              {event.venue && (
                <div className="pt-6">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.venueDetailsTitle")}
                  </h2>
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {event.venue.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {event.venue.address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {event.venue.city}, {event.venue.country}
                        </p>
                        {event.venue.capacity && (
                          <p className="text-sm text-muted-foreground">
                            {t("eventDetail.capacity")}:{" "}
                            {event.venue.capacity.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {event.venue.description && (
                      <div
                        className="text-sm text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: event.venue.description,
                        }}
                      />
                    )}
                    {event.venue.contactInfo && (
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {event.venue.contactInfo.phone && (
                          <span>
                            {t("eventDetail.phone")}:{" "}
                            {event.venue.contactInfo.phone}
                          </span>
                        )}
                        {event.venue.contactInfo.email && (
                          <span>
                            {t("eventDetail.email")}:{" "}
                            {event.venue.contactInfo.email}
                          </span>
                        )}
                        {event.venue.contactInfo.website && (
                          <a
                            href={event.venue.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {t("eventDetail.website")}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gates Information */}
              {event.gates && event.gates.length > 0 && (
                <div className="pt-6">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.gatesTitle")}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.gates.map((gate) => (
                      <div
                        key={gate.id}
                        className="bg-secondary/50 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-foreground">
                            {gate.name}
                          </h3>
                          <Badge
                            variant={
                              gate.status === "open" ? "default" : "secondary"
                            }
                            className={
                              gate.status === "open" ? "bg-green-500" : ""
                            }
                          >
                            {gate.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {gate.location}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {t("eventDetail.capacity")}: {gate.capacity}
                          </span>
                          <span>
                            {t("eventDetail.occupancy")}:{" "}
                            {gate.currentOccupancy}
                          </span>
                        </div>
                        {gate.openingTime && gate.closingTime && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {t("eventDetail.hours")}: {gate.openingTime} -{" "}
                            {gate.closingTime}
                          </p>
                        )}
                        {gate.requirements && gate.requirements.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-foreground mb-1">
                              {t("eventDetail.requirements")}:
                            </p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {gate.requirements.map((req, idx) => (
                                <li key={idx}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ticket Categories */}
              {allTicketCategories && allTicketCategories.length > 0 && (
                <div className="pt-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    {t("eventDetail.ticketCategories")}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allTicketCategories.map((ticket, index) => {
                      const ticketColor = ticket.color || '#10B981'; // Default to green if no color
                      const rgbColor = hexToRgb(ticketColor);
                      const bgColor = rgbColor 
                        ? `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.1)`
                        : 'rgba(16, 185, 129, 0.1)'; // Fallback
                      const borderColor = rgbColor
                        ? `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.3)`
                        : 'rgba(16, 185, 129, 0.3)'; // Fallback
                      
                      return (
                        <div
                          key={index}
                          className="rounded-lg p-4 hover:shadow-lg transition-all duration-300"
                          style={{
                            background: `linear-gradient(to bottom right, ${bgColor}, ${bgColor})`,
                            border: `1px solid ${borderColor}`
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-foreground text-lg">
                              {ticket.name}
                            </h3>
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: ticketColor,
                                color: ticketColor
                              }}
                            >
                              {ticket.price} {t("currency.egp")}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Card and Wallet Requirements */}
              {(event.personalizedCardRequirements ||
                event.walletRequirements) && (
                <div className="pt-6">
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.accessRequirementsTitle")}
                  </h2>
                  <div className="space-y-4">
                    {event.personalizedCardRequirements && (
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <h3 className="font-semibold text-foreground mb-2">
                          {t("eventDetail.cardRequirements")}
                        </h3>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {event.personalizedCardRequirements.required
                              ? t("eventDetail.required")
                              : t("eventDetail.optional")}
                          </p>
                          {event.personalizedCardRequirements.cardTypes.length >
                            0 && (
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {t("eventDetail.supportedCards")}:
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {event.personalizedCardRequirements.cardTypes.map(
                                  (cardType, idx) => (
                                    <Badge key={idx} variant="outline">
                                      {cardType}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          {event.personalizedCardRequirements
                            .minimumBalance && (
                            <p className="text-sm text-muted-foreground">
                              {t("eventDetail.minimumBalance")}:{" "}
                              {
                                event.personalizedCardRequirements
                                  .minimumBalance
                              }{" "}
                              {t("currency.egp")}
                            </p>
                          )}
                          {event.personalizedCardRequirements.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.personalizedCardRequirements.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {event.walletRequirements && (
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <h3 className="font-semibold text-foreground mb-2">
                          {t("eventDetail.walletRequirements")}
                        </h3>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {event.walletRequirements.required
                              ? t("eventDetail.required")
                              : t("eventDetail.optional")}
                          </p>
                          {event.walletRequirements.supportedWallets.length >
                            0 && (
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {t("eventDetail.supportedWallets")}:
                              </p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {event.walletRequirements.supportedWallets.map(
                                  (wallet, idx) => (
                                    <Badge key={idx} variant="outline">
                                      {wallet}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          {event.walletRequirements.minimumBalance && (
                            <p className="text-sm text-muted-foreground">
                              {t("eventDetail.minimumBalance")}:{" "}
                              {event.walletRequirements.minimumBalance}{" "}
                              {t("currency.egp")}
                            </p>
                          )}
                          {event.walletRequirements.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.walletRequirements.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column – Booking Card & Organizer */}
            <div className="lg:col-span-1">
              <div className="card-elevated p-6 sticky top-24 flex flex-col gap-6">
                {/* Pricing */}
                <div>
                  <div
                    className={`flex items-center space-x-2 ${
                      locale.startsWith("ar") ? "space-x-reverse" : ""
                    }`}
                  >
                    {event.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        {event.originalPrice} {t("currency.egp")}
                      </span>
                    )}
                    <span className="text-3xl font-bold text-primary">
                      {minTicketPrice} {t("currency.egp")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("eventDetail.startingFrom", "Starting from")} {t("eventDetail.perTicket", "per ticket")}
                  </p>

                  {/* Ticket Categories Preview */}
                  {allTicketCategories && allTicketCategories.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">
                          {t("eventDetail.ticketOptions")}:
                        </p>
                        <div className="space-y-1">
                          {allTicketCategories
                            .slice(0, 3)
                            .map((ticket, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-muted-foreground">
                                  {ticket.name}
                                </span>
                                <span className="font-medium text-foreground">
                                  {ticket.price} {t("currency.egp")}
                                </span>
                              </div>
                            ))}
                          {allTicketCategories.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{allTicketCategories.length - 3}{" "}
                              {t("eventDetail.moreOptions")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  {isVip && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          {t("eventDetail.vipFreeAccess")}
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {t("eventDetail.vipBlackCardBenefit")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Book Button */}
                {(() => {
                  // Check if ALL ticket categories are sold out (if categories exist)
                  let allCategoriesSoldOut = false;
                  if (event.ticketCategories && event.ticketCategories.length > 0) {
                    allCategoriesSoldOut = event.ticketCategories.every(
                      (cat: any) => (cat.ticketsAvailable || 0) === 0
                    );
                  } else {
                    // Fallback to event-level ticketsAvailable
                    allCategoriesSoldOut = event.ticketsAvailable === 0;
                  }
                  
                  return allCategoriesSoldOut && !isBlackCardCustomer ? (
                    <Button
                      variant="gradient"
                      className="w-full group/btn opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Ticket className="h-4 w-4 mx-2" />
                      {t("eventDetail.soldOut", "SOLD OUT")}
                    </Button>
                  ) : (
                    <Button
                      variant="gradient"
                      className="w-full group/btn"
                      onClick={handleBooking}
                    >
                      <Ticket className="h-4 w-4 mx-2 transition-transform group-hover/btn:scale-110" />
                      {t("buttons.book_now")}
                    </Button>
                  );
                })()}

                {/* Organizers Card - Only show if organizers exist */}
                {(() => {
                  // Use organizers array if available, otherwise fall back to single organizer
                  const organizersList = event.organizers && event.organizers.length > 0 
                    ? event.organizers 
                    : (event.organizer ? [event.organizer] : []);
                  
                  if (organizersList.length === 0) return null;
                  
                  // Get the first organizer's logo for display (or use first letter of first organizer's name)
                  const firstOrganizer = organizersList[0];
                  const organizerNames = organizersList.map(org => org.name).join(" & ");
                  
                  return (
                    <div>
                      <p className="text-xl font-bold text-ring mb-3">
                        {t("eventDetail.organizers")}
                      </p>
                      <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg border border-border/50">
                        <div className="flex-shrink-0">
                          {firstOrganizer.logoUrl ? (
                            <img
                              src={firstOrganizer.logoUrl}
                              alt={organizerNames}
                              className="w-12 h-12 rounded-lg object-cover border border-border/30"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 ${
                              firstOrganizer.logoUrl ? "hidden" : ""
                            }`}
                          >
                            <span className="text-primary font-bold text-lg">
                              {firstOrganizer.name?.charAt(0).toUpperCase() || "E"}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">
                            {organizerNames}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t("eventDetail.organizer")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Terms and Conditions Section */}
          {event.termsAndConditions && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              <div className="lg:col-span-2">
                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-3">
                    {t("eventDetail.eventTermsTitle")}
                  </h2>
                  <div
                    className="space-y-4 text-sm"
                    dir={locale.startsWith("ar") ? "rtl" : "ltr"}
                  >
                    <div
                      className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: event.termsAndConditions,
                      }}
                    />
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={window.location.href}
      />
      <SignInPromptModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </div>
  );
};

export default EventDetail;
