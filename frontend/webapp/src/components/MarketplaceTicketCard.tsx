import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Banknote,
  User,
  Phone,
  Mail,
  Pin,
  X,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { formatDate, formatTime, isRTL, getTextDirection } from "@/lib/utils";
import { MarketplaceListing } from "@/lib/api/services/marketplace";
import { useAuth } from "@/Contexts/AuthContext";
import { SignInPromptModal } from "@/components/SignInPromptModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MarketplaceTicketCardProps {
  listing: MarketplaceListing;
  onRemove?: (listingId: string) => void;
}

export function MarketplaceTicketCard({ listing, onRemove }: MarketplaceTicketCardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const currentLocale = i18n.language;
  const isRTLMode = isRTL(currentLocale);
  const textDirection = getTextDirection(currentLocale);

  const formattedDate = formatDate(listing.event_date, currentLocale);
  const formattedTime = formatTime(listing.event_time, currentLocale);
  const isAuthenticated = !!user;

  const handleContactClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If user is not authenticated, show sign-in modal
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    
    // If authenticated, toggle contact info
    setShowContactInfo(!showContactInfo);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onRemove) {
      onRemove(listing.id);
    }
    setShowDeleteConfirm(false);
  };

  return (
    <div
      className="group card-elevated overflow-hidden h-full flex flex-col"
      dir={textDirection}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <ImageWithFallback
          src={listing.event_image || "/placeholder.svg"}
          alt={listing.event_title}
          className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
          fallbackClassName="w-full h-48 flex items-center justify-center bg-secondary/50 text-muted-foreground"
        />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col space-y-2">
          {listing.is_my_listing && (
            <Badge className="bg-green-500/95 backdrop-blur-sm text-white flex items-center gap-2 z-10 px-3 py-1.5 text-sm font-semibold shadow-lg">
              <Pin className="h-4 w-4" />
              {t("marketplace.myListing", "My Listing")}
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="bg-background/80 backdrop-blur-sm"
          >
            {listing.event_category || t("marketplace.ticketCategory", "Ticket")}
          </Badge>
          <Badge className="bg-primary/80 backdrop-blur-sm text-primary-foreground">
            {listing.ticket_category}
          </Badge>
        </div>
        
        {/* Remove button for user's own listings */}
        {listing.is_my_listing && onRemove && (
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="destructive"
              size="lg"
              className="h-10 w-10 p-0 rounded-full bg-red-500/95 backdrop-blur-sm hover:bg-red-600 shadow-lg border-2 border-white/20"
              onClick={handleRemoveClick}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-semibold text-card-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {listing.event_title}
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
            <span className="text-sm line-clamp-1">
              {listing.event_location}
            </span>
          </div>
          <div
            className={`flex items-center text-muted-foreground ${
              isRTLMode ? "flex-row-reverse" : ""
            }`}
          >
            <Ticket className="h-4 w-4 mx-2" />
            <span className="text-sm">
              <strong className="mx-1">{t("marketplace.ticketNumber")}:</strong>
              {listing.ticket_number}
            </span>
          </div>
        </div>

        {/* Price - Always show seller price (required field) */}
        <div className="flex items-center justify-between mb-4 pt-4 border-t border-border">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {(parseFloat(String(listing.seller_price || listing.ticket_price || 0))).toFixed(2)} {t("marketplace.currency", "EGP")}
              </span>
            </div>
            {listing.seller_price && listing.seller_price !== listing.ticket_price && (
              <span className="text-xs text-muted-foreground ml-7">
                {t("marketplace.originalPrice", "Original price:")} {(parseFloat(String(listing.ticket_price || 0))).toFixed(2)} EGP
              </span>
            )}
          </div>
        </div>

        {/* Seller Info */}
        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t("marketplace.seller")}: {listing.seller_name?.split(' ')[0] || listing.seller_name}
              </span>
            </div>
          </div>
          
          {showContactInfo && isAuthenticated && listing.seller_mobile && listing.seller_email && (
            <div className="mt-3 space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3" />
                <a
                  href={`tel:${listing.seller_mobile}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline"
                >
                  {listing.seller_mobile}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3 w-3" />
                <a
                  href={`mailto:${listing.seller_email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline"
                >
                  {listing.seller_email}
                </a>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={handleContactClick}
          >
            {isAuthenticated
              ? showContactInfo
                ? t("marketplace.hideContact", "Hide Contact Info")
                : t("marketplace.showContact", "Show Contact Info")
              : t("marketplace.viewContactDetails", "View Contact Details")}
          </Button>
        </div>
      </div>
      
      <SignInPromptModal
        open={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              {t("marketplace.confirmRemoveTitle", "Remove Listing?")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t("marketplace.confirmRemove", "Are you sure you want to remove this listing? This action cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleConfirmDelete}
            >
              {t("marketplace.removeListing", "Remove Listing")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t("common.cancel", "Cancel")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

