import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime, isRTL, getTextDirection } from "@/lib/utils";
import clsx from "clsx";

interface EventPreviewCardProps {
  image: string;
  title: string;
  date: string;
  time: string;
  location: string;
  genre: string;
  showActions?: boolean;
  onBookNow?: (e: React.MouseEvent) => void;
  onRemove?: (e: React.MouseEvent) => void;
  bookNowText?: string;
  removeText?: string;
}

export const EventPreviewCard = ({
  image,
  title,
  date,
  time,
  location,
  genre,
  showActions = false,
  onBookNow,
  onRemove,
  bookNowText = "Book Now",
  removeText = "Remove",
}: EventPreviewCardProps) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language;
  const isRTLMode = isRTL(currentLocale);
  const textDirection = getTextDirection(currentLocale);

  // Format date and time
  const formattedDate = formatDate(date, currentLocale);
  const formattedTime = formatTime(time, currentLocale);

  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row gap-4 items-start border p-3 rounded-lg bg-card shadow-md",
        {
          "sm:flex-row-reverse": isRTLMode,
        }
      )}
      dir={textDirection}
    >
      <img
        src={image}
        alt={title}
        className={clsx("w-20 h-20 object-cover rounded-md flex-shrink-0", {
          "sm:order-last": isRTLMode,
        })}
      />
      <div className="flex-1 min-w-0">
        <h3
          className={clsx("text-lg font-semibold text-foreground", {
            "text-right": isRTLMode,
          })}
        >
          {title}
        </h3>
        <div
          className={clsx("text-sm text-muted-foreground mt-1 space-y-1", {
            "text-right": isRTLMode,
          })}
        >
          <div
            className={clsx("flex items-center gap-1", {
              "flex-row-reverse": isRTLMode,
              "justify-end": isRTLMode,
            })}
          >
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>
              {t("eventPreview.date")}: {formattedDate}
            </span>
          </div>
          <div
            className={clsx("flex items-center gap-1", {
              "flex-row-reverse": isRTLMode,
              "justify-end": isRTLMode,
            })}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              {t("eventPreview.time")}: {formattedTime}
            </span>
          </div>
          <div
            className={clsx("flex items-center gap-1", {
              "flex-row-reverse": isRTLMode,
              "justify-end": isRTLMode,
            })}
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>
              {t("eventPreview.location")}: {location}
            </span>
          </div>
        </div>
        <div
          className={clsx("mt-2", {
            "text-right": isRTLMode,
          })}
        >
          <Badge>{t(`tags.${genre}`, genre)}</Badge>
        </div>
      </div>
      {showActions && (
        <div
          className={clsx(
            "flex flex-row sm:flex-col gap-1 sm:gap-2 w-full sm:w-auto flex-shrink-0",
            {
              "sm:-order-1": isRTLMode,
            }
          )}
        >
          {onBookNow && (
            <Button
              size="sm"
              onClick={onBookNow}
              className="bg-primary lg:mt-4 hover:bg-primary/90 text-white text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-10 flex-1 sm:flex-none"
            >
              {bookNowText}
            </Button>
          )}
          {onRemove && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRemove}
              className="text-red-500 hover:text-red-600 text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 h-8 sm:h-10 flex-1 sm:flex-none"
            >
              {removeText}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
