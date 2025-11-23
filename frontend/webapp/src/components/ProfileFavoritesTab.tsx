import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Heart, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventPreviewCard } from "@/components/EventPreviewCard";
import { useNavigate } from "react-router-dom";
import { isRTL, getTextDirection } from "@/lib/utils";
import i18n from "@/lib/i18n";
import clsx from "clsx";
import { useFavorites } from "@/hooks/useFavorites";
import { Loader2 } from "lucide-react";

interface FavoriteEvent {
  id: string | undefined;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  image: string;
}

interface ProfileFavoritesTabProps {
  t: (key: string, defaultValue?: string) => string;
  favoriteEvents: FavoriteEvent[];
}

export const ProfileFavoritesTab = (props: ProfileFavoritesTabProps) => {
  const { t, favoriteEvents } = props;
  const navigate = useNavigate();
  const currentLocale = i18n.language;
  const isRTLMode = isRTL(currentLocale);
  const textDirection = getTextDirection(currentLocale);
  const { removeFromFavorites, loading: favoritesLoading } = useFavorites();

  // Separate events into upcoming and past
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

  const upcomingEvents = favoriteEvents.filter((event) => {
    const eventDate = new Date(event.date);
    const eventDateOnly = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    return eventDateOnly >= today;
  });

  const pastEvents = favoriteEvents.filter((event) => {
    const eventDate = new Date(event.date);
    const eventDateOnly = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    return eventDateOnly < today;
  });

  // Debug logging removed to reduce console clutter

  const handleEventClick = (eventId: string | undefined) => {
    if (eventId) {
      navigate(`/event/${eventId}`);
    }
  };

  const handleBookNow = (eventId: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event card click
    if (eventId) {
      navigate(`/booking/${eventId}`);
    }
  };

  const handleRemoveFromFavorites = async (
    eventId: string | undefined,
    e: React.MouseEvent
  ) => {
    e.stopPropagation(); // Prevent event card click
    if (eventId) {
      const success = await removeFromFavorites(eventId);
      if (success) {
        // TODO: Update the parent component to refresh the favorites list
        console.log("Successfully removed from favorites:", eventId);
      }
    }
  };

  // Helper function to get proper category name
  const getCategoryName = (category: string) => {
    if (!category) return t("tags.Other", "Other");
    // Try to get translation, fallback to category name, then to "Other"
    return (
      t(`tags.${category}`, category) || category || t("tags.Other", "Other")
    );
  };

  return (
    <TabsContent value="favorites" className="space-y-6" dir={textDirection}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRTLMode ? (
              <>
                <span>
                  {t("profilepage.favorites.title", "Favorite Events")}
                </span>
                <Heart className="h-5 w-5 text-primary" />
              </>
            ) : (
              <>
                <Heart className="h-5 w-5 text-primary" />
                <span>
                  {t("profilepage.favorites.title", "Favorite Events")}
                </span>
              </>
            )}
          </CardTitle>

          <CardDescription
            className={clsx({
              "text-right": isRTLMode,
            })}
          >
            {t(
              "profilepage.favorites.description",
              "Events you have marked as favorites."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {favoriteEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("profilepage.favorites.empty", "No favorite events yet.")}
            </p>
          ) : (
            <>
              {/* Upcoming Events Section */}
              {upcomingEvents.length > 0 && (
                <div className="space-y-4">
                  <div
                    className={clsx("flex items-center gap-2", {
                      "justify-end": isRTLMode,
                      "flex-row-reverse": isRTLMode,
                    })}
                  >
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    <h3
                      className={clsx(
                        "text-base sm:text-lg font-semibold text-foreground",
                        {
                          "text-right": isRTLMode,
                        }
                      )}
                    >
                      {t(
                        "profilepage.favorites.upcomingEvents",
                        "Upcoming Events"
                      )}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="relative cursor-pointer hover:shadow-lg transition-shadow duration-200"
                        onClick={() => handleEventClick(event.id)}
                      >
                        <EventPreviewCard
                          image={event.image}
                          title={event.title}
                          date={event.date}
                          time={event.time}
                          location={event.location}
                          genre={getCategoryName(event.category)}
                          showActions={true}
                          onBookNow={(e) => handleBookNow(event.id, e)}
                          onRemove={(e) =>
                            handleRemoveFromFavorites(event.id, e)
                          }
                          bookNowText={t(
                            "profilepage.favorites.bookNow",
                            "Book Now"
                          )}
                          removeText={t(
                            "profilepage.favorites.remove",
                            "Remove"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Events Section */}
              {pastEvents.length > 0 && (
                <div className="space-y-4">
                  <div
                    className={clsx("flex items-center gap-2", {
                      "justify-end": isRTLMode,
                      "flex-row-reverse": isRTLMode,
                    })}
                  >
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                    <h3
                      className={clsx(
                        "text-base sm:text-lg font-semibold text-foreground",
                        {
                          "text-right": isRTLMode,
                        }
                      )}
                    >
                      {t("profilepage.favorites.pastEvents", "Past Events")}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {pastEvents.map((event) => (
                      <div
                        key={event.id}
                        className="relative cursor-pointer hover:shadow-lg transition-shadow duration-200"
                        onClick={() => handleEventClick(event.id)}
                      >
                        <EventPreviewCard
                          image={event.image}
                          title={event.title}
                          date={event.date}
                          time={event.time}
                          location={event.location}
                          genre={getCategoryName(event.category)}
                          showActions={true}
                          onRemove={(e) =>
                            handleRemoveFromFavorites(event.id, e)
                          }
                          removeText={t(
                            "profilepage.favorites.remove",
                            "Remove"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};
