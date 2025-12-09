import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  Clock,
  Star,
  Users,
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
  ArrowLeft,
  Sun as SunIcon,
  Moon,
  LogOut,
  Calculator,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareModal } from "@/components/ShareModal";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";
import { useQuery } from "@tanstack/react-query";
import organizerApi, { EventAnalytics } from "@/lib/api/organizerApi";
import { useAuth } from "@/Contexts/AuthContext";

interface EventImage {
  url: string;
  isPrimary?: boolean;
}

interface Organizer {
  id: string;
  name: string;
  logoUrl: string;
}

interface Facility {
  name: string;
  icon: string; // Icon key to map to a Lucide icon
}

interface EventData {
  id: string | undefined;
  title: string;
  videoUrl?: string;
  images: EventImage[];
  layoutImageUrl?: string;
  date: string;
  time: string;
  location: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  attendees: number;
  description: string;
  venueInfo: string;
  facilities?: Facility[];
  isFeatured?: boolean;
  organizer: Organizer;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  peopleAdmitted: number;
  peopleRemaining: number;
  totalPayoutPending: number;
  totalPayoutPaid: number;
  ticketCategories: TicketCategory[];
}

interface TicketCategory {
  name: string;
  price: number;
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
}

const OrganizerEventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n: i18nInstance } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [showLayout, setShowLayout] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFinancesModal, setShowFinancesModal] = useState(false);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const [language, setLanguage] = useState("EN");
  const locale = i18n.language === "ar" ? "ar-EG" : i18n.language || "en-US";

  // Fetch event details from API
  const {
    data: eventAnalytics,
    isLoading: eventLoading,
    error: eventError,
  } = useQuery<EventAnalytics>({
    queryKey: ["organizer-event-detail", id],
    queryFn: () => organizerApi.getEventDetail(id!),
    enabled: !!id && isAuthenticated,
  });


  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const storedLang = localStorage.getItem("appLanguage");
    if (storedLang) {
      setLanguage(storedLang);
      i18n.changeLanguage(storedLang === "EN" ? "en" : "ar");
    }
  }, []);

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
    navigate("/organizer");
    toast({
      title: t("logout"),
      description: "Logged out successfully",
    });
  };

  const handleShare = () => {
    setShowShareModal(true);
  };


  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };


  // Transform API event data to EventData format
  const event: EventData | null = React.useMemo(() => {
    if (!eventAnalytics) return null;

    const overallStats = eventAnalytics.overall_stats || {
      sold: 0,
      available: 0,
      admitted: 0,
      remaining: 0,
    };

    const payoutInfo = eventAnalytics.payout_info || {
      pending: 0,
      paid: 0,
    };

    // Transform ticket categories
    const ticketCategories: TicketCategory[] = (eventAnalytics.ticket_categories || []).map((cat: any) => ({
      name: cat.name || cat.category || "Unknown",
      price: cat.price || 0,
      totalTickets: cat.total_tickets || cat.total || 0,
      ticketsSold: cat.sold || 0,
      ticketsAvailable: cat.available || 0,
    }));

    // Debug logging
    console.log("Event Analytics Data:", eventAnalytics);
    console.log("Financial Breakdown:", eventAnalytics.financial_breakdown);
    console.log("Has Financial Breakdown:", !!eventAnalytics.financial_breakdown);
    console.log("Ticket Categories Raw:", eventAnalytics.ticket_categories);
    console.log("Ticket Categories Transformed:", ticketCategories);

    // Build images array - use real event image if available
    const images: EventImage[] = [];
    if (eventAnalytics.image_url) {
      images.push({ url: eventAnalytics.image_url, isPrimary: true });
    } else {
      images.push({ url: "/event-placeholder.jpg", isPrimary: true });
    }

    return {
      id: String(eventAnalytics.id),
      title: eventAnalytics.title,
      videoUrl: undefined,
      images: images,
      layoutImageUrl: undefined,
      date: eventAnalytics.date,
      time: eventAnalytics.time,
      location: eventAnalytics.location || "",
      price: eventAnalytics.starting_price ? parseFloat(String(eventAnalytics.starting_price)) : 0,
      originalPrice: undefined,
      category: eventAnalytics.category_name || "Event",
      rating: 0,
      attendees: overallStats.admitted || 0,
      description: eventAnalytics.description || "",
      venueInfo: eventAnalytics.about_venue || "",
      facilities: [],
      isFeatured: eventAnalytics.featured || false,
      organizer: {
        id: "",
        name: "",
        logoUrl: "",
      },
      totalTickets: overallStats.available || 0, // Total tickets created
      ticketsSold: overallStats.sold || 0,
      ticketsAvailable: overallStats.available || 0, // Total tickets available
      peopleAdmitted: overallStats.admitted || 0,
      peopleRemaining: overallStats.remaining || 0, // Available - Sold
      totalPayoutPending: payoutInfo.pending,
      totalPayoutPaid: payoutInfo.paid,
      ticketCategories,
    };
  }, [eventAnalytics]);

  const facilityIcons: Record<string, JSX.Element> = {
    parking: <ParkingCircle className="w-5 h-5 text-primary" />,
    accessibility: <Accessibility className="w-5 h-5 text-primary" />,
    wifi: <Wifi className="w-5 h-5 text-primary" />,
    baby: <Baby className="w-5 h-5 text-primary" />,
    greenArea: <Leaf className="w-5 h-5 text-primary" />,
    food: <Utensils className="w-5 h-5 text-primary" />,
    showers: <ShowerHead className="w-5 h-5 text-primary" />,
    music: <Music className="w-5 h-5 text-primary" />,
    outdoor: <Sun className="w-5 h-5 text-primary" />,
  };

  const mediaItems = useMemo(() => {
    if (!event) return [];
    const items: { type: "video" | "image"; url: string }[] = [];
    if (event.videoUrl) items.push({ type: "video", url: event.videoUrl });
    const images = [...event.images];
    if (!event.videoUrl)
      images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    images.forEach(({ url }) => items.push({ type: "image", url }));
    return items;
  }, [event]);

  const date = event ? new Date(event.date) : new Date();
  const formattedDate =
    !event || isNaN(date.getTime()) || !event.date
      ? t("common.invalidDate")
      : new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);

  const calculatePercentage = (sold: number, total: number) => {
    return total > 0 ? (sold / total) * 100 : 0;
  };

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
                <SunIcon className="h-4 w-4" />
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
        <div className="max-w-4xl mx-auto">
          {/* Loading State */}
          {eventLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-lg">{t("common.loading")}</div>
            </div>
          )}

          {/* Error State */}
          {eventError && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <p className="text-lg text-red-500 mb-4">
                {t("common.errorLoadingData")}
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                {t("common.backToDashboard")}
              </Button>
            </div>
          )}

          {/* Event Content */}
          {!eventLoading && !eventError && event && (
            <>
              {/* Back Button */}
              <div className="mb-6">
                <Button
                  variant="outline"
                  onClick={handleBackToDashboard}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("common.backToDashboard")}
                </Button>
              </div>

          {/* Media Carousel */}
          <div className="relative rounded-xl overflow-hidden mb-8" dir="ltr">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1}
              autoplay={
                autoplayEnabled
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
                  ) : (
                    <img
                      src={media.url}
                      alt={`${event.title} media ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "/image-fallback.jpg";
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
            </div>
          </div>

          {/* Event Content */}
          <div className="space-y-8">
            {/* Event Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                {event.title}
              </h1>

              {/* Meta */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-5 w-5 mx-3" />
                  <div dir={locale.startsWith("ar") ? "rtl" : "ltr"}>
                    {formattedDate} {event.time}
                  </div>
                </div>

                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-5 w-5 mx-3" />
                  <span className="text-sm text-muted-foreground">
                    {event.location}
                  </span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-5 w-5 mx-3" />
                  <span className="text-sm text-muted-foreground">
                    {t("eventDetail.gateOpen")} {eventAnalytics?.gates_open_time || event.time}
                  </span>
                </div>
              </div>
            </div>

            {/* Event Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {event.ticketsSold}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.ticketsSold")}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {event.ticketsAvailable}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.ticketsAvailable")}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {event.peopleRemaining}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.event.peopleRemaining")}
                </p>
              </div>
            </div>

            {/* View Finances Button - Under Event Statistics */}
            {eventAnalytics && (
              <div className="pt-4 pb-2">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => setShowFinancesModal(true)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary/90"
                  disabled={!eventAnalytics?.financial_breakdown}
                >
                  <DollarSign className="h-5 w-5" />
                  {t("dashboard.analytics.viewFinances", "View Finances")}
                  {!eventAnalytics?.financial_breakdown && " (No Data)"}
                </Button>
              </div>
            )}

            {/* Sales Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("dashboard.event.salesProgress")}</span>
                <span>
                  {calculatePercentage(
                    event.ticketsSold,
                    event.totalTickets
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{
                    width: `${calculatePercentage(
                      event.ticketsSold,
                      event.totalTickets
                    )}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("eventDetail.aboutEvent")}
              </h2>
              <p className="text-muted-foreground">{event.description}</p>
            </div>

            {/* Venue Info */}
            <div
              className="pt-6 space-y-2 relative"
              dir={locale.startsWith("ar") ? "rtl" : "ltr"}
            >
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("eventDetail.venueInfoTitle")}
              </h2>
              <p className="text-muted-foreground">{event.venueInfo}</p>
              {event.layoutImageUrl && (
                <div
                  className="mt-4 flex w-full"
                  dir={locale.startsWith("ar") ? "rtl" : "ltr"}
                >
                  <Button
                    variant="gradient"
                    onClick={() => setShowLayout(true)}
                    className={locale.startsWith("ar") ? "ml-auto" : "mr-auto"}
                  >
                    {t("eventDetail.showLayout")}
                  </Button>
                </div>
              )}
              <Dialog open={showLayout} onOpenChange={setShowLayout}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                  <img
                    src={event.layoutImageUrl}
                    alt="Venue Layout"
                    className="w-full h-auto object-contain"
                  />
                </DialogContent>
              </Dialog>
            </div>

            {/* Facilities */}
            {event.facilities && event.facilities.length > 0 && (
              <div className="pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {t("eventDetail.facilitiesTitle")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {event.facilities.map((facility) => (
                    <div
                      key={facility.name}
                      className="flex items-center gap-2"
                    >
                      {facilityIcons[facility.icon] || null}
                      <span className="text-sm text-muted-foreground">
                        {t(`eventDetail.facilities.${facility.name}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Categories */}
            <div className="pt-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("dashboard.analytics.ticketCategories")}
              </h2>
              <div className="space-y-4">
                {event.ticketCategories && event.ticketCategories.length > 0 ? (
                  event.ticketCategories.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground">
                          E£ {category.price}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {t("dashboard.analytics.sold")}: {category.ticketsSold}
                        </span>
                        <span>
                          {t("dashboard.analytics.available")}:{" "}
                          {category.ticketsAvailable}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${calculatePercentage(
                              category.ticketsSold,
                              category.totalTickets
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("dashboard.analytics.noTicketCategories")}
                  </p>
                )}
              </div>
            </div>

            {/* Payout Information */}
            <div className="pt-6">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-foreground">
                  {t("dashboard.analytics.payoutInfo")}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    E£ {event.totalPayoutPending.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.analytics.pendingPayout")}
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    E£ {event.totalPayoutPaid.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.analytics.paidPayout")}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            {eventAnalytics?.financial_breakdown && (
              <div className="pt-6">
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {t("dashboard.analytics.financialBreakdown", "Financial Breakdown")}
                </h2>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base rtl:text-right">
                      {t("dashboard.analytics.ticketRevenue", "Ticket Revenue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium rtl:text-right">
                          {t("dashboard.analytics.totalTicketRevenue", "Total Ticket Revenue")}:
                        </span>
                        <span className="text-lg font-bold text-primary">
                          E£ {eventAnalytics.financial_breakdown.ticket_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground rtl:text-right">
                        {eventAnalytics.financial_breakdown.tickets_sold} {t("dashboard.analytics.ticketsSold", "tickets sold")}
                      </p>
                    </div>

                    {/* Deductions Breakdown */}
                    {eventAnalytics.financial_breakdown.deductions && eventAnalytics.financial_breakdown.deductions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold rtl:text-right">
                          {t("dashboard.analytics.deductions", "Deductions Applied")}:
                        </h4>
                        <div className="space-y-2">
                          {eventAnalytics.financial_breakdown.deductions.map((deduction, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                              <div>
                                <span className="text-sm font-medium">{deduction.name}</span>
                                {deduction.description && (
                                  <p className="text-xs text-muted-foreground">{deduction.description}</p>
                                )}
                                {deduction.type === 'percentage' && deduction.value !== null && (
                                  <p className="text-xs text-muted-foreground">
                                    {deduction.value}% {t("dashboard.analytics.ofRevenue", "of revenue")}
                                  </p>
                                )}
                                {deduction.type === 'fixed_per_ticket' && deduction.value !== null && (
                                  <p className="text-xs text-muted-foreground">
                                    E£ {deduction.value} {t("dashboard.analytics.perTicket", "per ticket")}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-red-600">
                                -E£ {deduction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Net Profit */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold rtl:text-right">
                          {t("dashboard.analytics.organizerNetProfit", "Your Net Profit")}:
                        </span>
                        <span className="text-xl font-bold text-green-600">
                          E£ {eventAnalytics.financial_breakdown.organizer_net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 rtl:text-right">
                        {t("dashboard.analytics.netProfitDescription", "This is your profit after all deductions")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </main>
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={window.location.href}
      />

      {/* View Finances Modal */}
      <Dialog open={showFinancesModal} onOpenChange={setShowFinancesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("dashboard.analytics.viewFinances", "View Finances")} - {event?.title}
            </DialogTitle>
          </DialogHeader>
          {eventAnalytics?.financial_breakdown && (
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
                      E£ {eventAnalytics.financial_breakdown.ticket_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {eventAnalytics.financial_breakdown.tickets_sold || event.ticketsSold} {t("dashboard.analytics.ticketsSold", "tickets sold")}
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
                        const uniqueDeductions = eventAnalytics.financial_breakdown.deductions?.filter((deduction: any) => {
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
                        return ((eventAnalytics.financial_breakdown.commission || 0) + deductionsTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(() => {
                        // STRICT deduplication: Filter out duplicates by ID first, then by name+type+value combination
                        const seenIds = new Set<string | number>();
                        const seenKeys = new Set<string>();
                        const uniqueDeductions = eventAnalytics.financial_breakdown.deductions?.filter((deduction: any) => {
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
                        return (uniqueDeductions.length || 0) + (eventAnalytics.financial_breakdown.commission ? 1 : 0);
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
                      E£ {eventAnalytics.financial_breakdown.organizer_net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        E£ {eventAnalytics.financial_breakdown.ticket_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      {eventAnalytics.financial_breakdown.commission && (
                        <div className="flex justify-between items-center p-2 bg-muted/30 rounded rtl:flex-row-reverse">
                          <div>
                            <span className="text-sm font-medium">
                              {t("dashboard.analytics.ticketRunnerFee", "TR Commission Fee")}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-red-600">
                            -E£ {eventAnalytics.financial_breakdown.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Custom Deductions */}
                      {(() => {
                        // STRICT deduplication: Filter out duplicates by ID first, then by name+type+value combination
                        const seenIds = new Set<string | number>();
                        const seenKeys = new Set<string>();
                        const uniqueDeductions = eventAnalytics.financial_breakdown.deductions?.filter((deduction: any) => {
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
                        ) : !eventAnalytics.financial_breakdown.commission ? (
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
                        E£ {eventAnalytics.financial_breakdown.organizer_net_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
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

export default OrganizerEventDetail;
