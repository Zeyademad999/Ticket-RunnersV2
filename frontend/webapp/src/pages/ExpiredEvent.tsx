import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface EventImage {
  url: string;
  isPrimary?: boolean;
}

interface Organizer {
  id: string;
  name: string;
  logoUrl: string;
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
  isFeatured?: boolean;
  organizer: Organizer;
}

const ExpiredEventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const locale = i18n.language === "ar" ? "ar-EG" : i18n.language || "en-US";
  const [showLayout, setShowLayout] = useState(false);

  // Mock event and organizer; replace with API call later
  const event: EventData = React.useMemo(
    () => ({
      id,
      title: t("eventDetail.title"),
      videoUrl: "/SampleVideo.mp4",
      images: [
        { url: "/event1.jpg", isPrimary: true },
        { url: "/event2.jpg" },
        { url: "/event3.jpg" },
      ],
      date: "2025-03-15", // ISO format; do not localize
      time: t("eventDetail.time"),
      location: t("eventDetail.location"),
      price: 150,
      originalPrice: 200,
      category: t("eventDetail.category"),
      rating: 4.8,
      attendees: 1250,
      description: t("eventDetail.description"),
      venueInfo: t("eventDetail.venueInfo"),
      layoutImageUrl: "/layoutPlaceholder.png",
      isFeatured: true,
      organizer: {
        id: "org-12",
        name: t("eventDetail.organizer.name"),
        logoUrl: "/placeholderLogo.png",
      },
    }),
    [id, t]
  );

  const mediaItems = useMemo(() => {
    const items: { type: "video" | "image"; url: string }[] = [];
    if (event.videoUrl) items.push({ type: "video", url: event.videoUrl });
    const images = [...event.images];
    if (!event.videoUrl)
      images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
    images.forEach(({ url }) => items.push({ type: "image", url }));
    return items;
  }, [event]);

  const date = new Date(event.date);
  const formattedDate =
    isNaN(date.getTime()) || !event.date
      ? t("common.invalidDate") // fallback text
      : new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(date);

  const handleBooking = () => navigate(`/booking/${id}`);
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: t("eventDetail.shareToast.title"),
      description: t("eventDetail.shareToast.description"),
    });
  };

  const handleAddToCalendar = () => {
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

  const goToOrganizer = () =>
    navigate(`/view-organizers/${event.organizer.id}`);
  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Media Carousel */}
          <div className="relative rounded-xl overflow-hidden mb-8" dir="ltr">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={16}
              slidesPerView={1}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
              }}
              loop={mediaItems.length > 1}
              className="h-96 w-full"
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
                className="bg-background/80 backdrop-blur-sm"
                aria-label={t("ariaLabels.addToFavorites")}
              >
                <Heart className="h-4 w-4" />
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                {event.title}
              </h1>

              {/* Meta */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-5 w-5 mx-3" />
                  <div dir={locale.startsWith("ar") ? "rtl" : "ltr"}>
                    {formattedDate}
                  </div>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-5 w-5 mx-3" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      event?.location
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MapPin className="h-5 w-5 mx-3" />
                    {event?.location}
                  </a>
                </div>
              </div>

              {/* Description */}
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  {t("eventDetail.aboutEvent")}
                </h2>
                <p className="text-muted-foreground">{event.description}</p>
              </div>
              <div className="pt-6 space-y-2">
                <h3 className="text-lg font-semibold">
                  {t("eventDetail.venueInfoTitle")}
                </h3>
                <p className="text-muted-foreground">{event.venueInfo}</p>
              </div>
            </div>

            {/* Right Column – Booking Card & Organizer */}
            <div className="lg:col-span-1">
              <div className="card-elevated p-6 sticky top-24 flex flex-col gap-6">
                {/* Organizer Card */}
                <p className="text-xl font-bold text-ring">
                  {t("eventDetail.organizers")}
                </p>
                <div
                  onClick={goToOrganizer}
                  className="mx-auto group flex items-center gap-3 cursor-pointer p-3 bg-secondary rounded-lg hover-scale"
                >
                  <div className="flex flex-col items-center">
                    <img
                      src={event.organizer.logoUrl}
                      alt={event.organizer.name}
                      className="w-10 h-10 rounded-md object-cover"
                    />
                    <span className="mx-auto text-muted-foreground mt-1">
                      {event.organizer.name}
                    </span>
                  </div>
                </div>
                {event.layoutImageUrl && (
                  <div className="mt-4 text-center m-auto">
                    <Button
                      variant="gradient"
                      onClick={() => setShowLayout(true)}
                    >
                      {t("eventDetail.showLayoutButton", "Show Layout Image")}
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpiredEventDetail;
