import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Clock,
  Share2,
  Ticket,
  Banknote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { ShareModal } from "@/components/ShareModal";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { formatDate, formatTime, isRTL, getTextDirection } from "@/lib/utils";
import { useAuth } from "@/Contexts/AuthContext";
import { SignInPromptModal } from "@/components/SignInPromptModal";

interface EventCardProps {
  id: string;
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  price: number;
  originalPrice?: number;
  category: string;
  isFeatured?: boolean;
  isLiked?: boolean;
  ticketsAvailable?: number; // Number of tickets available (0 means sold out)
  ticketCategories?: Array<{ name: string; ticketsAvailable: number }>; // Ticket categories to check if all are sold out
}

export function EventCard({
  id,
  title,
  image,
  date,
  time,
  location,
  price,
  originalPrice,
  category,
  isFeatured = false,
  isLiked = false,
  ticketsAvailable,
  ticketCategories,
}: EventCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const currentLocale = i18n.language;
  const isRTLMode = isRTL(currentLocale);
  const textDirection = getTextDirection(currentLocale);
  const { user } = useAuth();
  
  // Check if user is a Black Card Customer
  // Handle both string format (legacy) and object format (new)
  const isBlackCardCustomer = user?.labels?.some((label: any) => 
    (typeof label === 'string' && label === 'Black Card Customer') ||
    (typeof label === 'object' && label?.name === 'Black Card Customer')
  ) || false;
  
  // Normalize ticketsAvailable to handle string "0", null, undefined, etc.
  // Also handle the case where it might be passed as 0 explicitly
  let normalizedTicketsAvailable: number | undefined;
  if (ticketsAvailable === null || ticketsAvailable === undefined) {
    normalizedTicketsAvailable = undefined;
  } else {
    const numValue = Number(ticketsAvailable);
    normalizedTicketsAvailable = isNaN(numValue) ? undefined : numValue;
  }
  
  // Check if event is sold out
  // If ticketCategories are provided, check if ALL categories are sold out
  // Otherwise, check if ticketsAvailable is 0
  let isSoldOut = false;
  if (ticketCategories && ticketCategories.length > 0) {
    // Event is sold out if ALL categories have 0 tickets available
    isSoldOut = ticketCategories.every(cat => {
      const available = typeof cat.ticketsAvailable === 'number' ? cat.ticketsAvailable : (Number(cat.ticketsAvailable) || 0);
      return available === 0;
    });
  } else {
    // Fallback to event-level ticketsAvailable
    isSoldOut = normalizedTicketsAvailable === 0;
  }

  // Format date and time using our utilities
  const formattedDate = formatDate(date, currentLocale);
  const formattedTime = formatTime(time, currentLocale);

  // Helper to normalize category for translation
  const normalizedCategory = category
    ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
    : "General";

  const eventUrl = `${window.location.origin}/event/${id}`;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleBooking = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Check if user is authenticated
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    navigate(`/booking/${id}`);
  };

  const handleCardClick = () => {
    navigate(`/event/${id}`);
  };

  return (
    <div
      className="group card-elevated overflow-hidden hover-scale cursor-pointer h-full flex flex-col"
      onClick={handleCardClick}
      dir={textDirection}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <ImageWithFallback
          src={image}
          alt={title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          fallbackClassName="w-full h-48 flex items-center justify-center bg-secondary/50 text-muted-foreground"
        />

        {/* Actions */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <Button
            variant="icon"
            size="icon"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col space-y-2">
          {isFeatured && (
            <Badge className="bg-gradient-primary text-primary-foreground border-0">
              {t("eventCard.featured")}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="bg-background/80 backdrop-blur-sm"
          >
            {t(`tags.${normalizedCategory}`, normalizedCategory)}
          </Badge>
        </div>

        {/* SOLD OUT Badge - Prominent overlay when tickets are sold out (only for non-Black Card customers) */}
        {isSoldOut && !isBlackCardCustomer && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <Badge className="bg-red-600 text-white text-lg font-bold px-6 py-3 border-2 border-white shadow-lg animate-pulse">
              {t("eventCard.soldOut", "SOLD OUT !!")}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-semibold text-card-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>

        <div className="space-y-2 mb-4">
          <div
            className={`flex items-center text-muted-foreground ${
              isRTLMode ? "flex-row-reverse" : ""
            }`}
          >
            <Calendar className="h-4 w-4 mx-2" />
            <span className="text-sm">
              <strong className="mx-1">{t("eventCard.date")}:</strong>
              {formattedDate}
            </span>
          </div>
          <div
            className={`flex items-center text-muted-foreground ${
              isRTLMode ? "flex-row-reverse" : ""
            }`}
          >
            <Clock className="h-4 w-4 mx-2" />
            <span className="text-sm">
              <strong className="mx-1">{t("eventCard.time")}:</strong>
              {formattedTime}
            </span>
          </div>
          <div
            className={`flex items-center text-muted-foreground ${
              isRTLMode ? "flex-row-reverse" : ""
            }`}
          >
            <MapPin className="h-4 w-4 mx-2" />
            <span className="text-sm">
              <strong className="mx-1">{t("eventCard.location")}:</strong>
              {location}
            </span>
          </div>
          <div
            className={`flex items-center text-muted-foreground ${
              isRTLMode ? "flex-row-reverse" : ""
            }`}
          >
            <Banknote className="h-4 w-4 mx-2" />
            <span className="text-sm">
              <strong className="mx-1">{t("eventCard.price")}:</strong>
              {price} {t("eventCard.currency")}
            </span>
          </div>
        </div>

        <div className="mt-auto">
          {(() => {
            // Check if sold out (parent total_tickets is 0) and user is NOT Black Card
            if (isSoldOut && !isBlackCardCustomer) {
              return (
                <Button
                  variant="gradient"
                  className="w-full group/btn opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Ticket className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t("eventCard.soldOut", "SOLD OUT")}
                </Button>
              );
            }
            return (
              <Button
                variant="gradient"
                className="w-full group/btn"
                onClick={handleBooking}
              >
                <Ticket className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2 transition-transform group-hover/btn:scale-110" />
                {t("eventCard.bookNow")}
              </Button>
            );
          })()}
        </div>
      </div>
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={eventUrl}
      />
      <SignInPromptModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </div>
  );
}
