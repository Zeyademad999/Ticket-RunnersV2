import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Clock, Star, Loader2 } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/Contexts/AuthContext";
import { EventsService } from "@/lib/api/services/events";
import { useToast } from "@/hooks/use-toast";

interface EventImage {
  url: string;
  isPrimary?: boolean;
}

interface EventBrief {
  id: string;
  title: string;
  titleAr?: string;
  images: EventImage[];
  date: string;
  time: string;
  location: string;
  locationAr?: string;
  rating: number;
  category: string;
}

interface Organizer {
  id: string | undefined;
  name: string;
  description: string;
  logoUrl: string;
  events: EventBrief[];
}

const ViewOrganizersPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventBrief[]>([]);
  const [pastEvents, setPastEvents] = useState<EventBrief[]>([]);

  // Fetch organizer details and events
  useEffect(() => {
    const fetchOrganizerData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch organizer details
        const organizerData = await EventsService.getOrganizerDetail(id);
        
        // Fetch organizer events
        const allEvents = await EventsService.getEvents({});
        const organizerEvents = allEvents.filter(
          (event) => event.organizer?.id?.toString() === id || event.organizer_id?.toString() === id
        );

        // Transform events to EventBrief format
        const transformedEvents: EventBrief[] = organizerEvents.map((event) => ({
          id: event.id?.toString() || "",
          title: event.title || "",
          images: event.images || [],
          date: event.date || "",
          time: event.time || "",
          location: event.location || "",
          rating: event.rating || 0,
          category: event.category || "",
        }));

        // Separate upcoming and past events
        const now = new Date();
        const upcoming = transformedEvents.filter((event) => {
          const eventDate = new Date(`${event.date} ${event.time}`);
          return eventDate >= now;
        });
        const past = transformedEvents.filter((event) => {
          const eventDate = new Date(`${event.date} ${event.time}`);
          return eventDate < now;
        });

        setUpcomingEvents(upcoming);
        setPastEvents(past);

        // Set organizer data
        // Transform logo URL similar to EventsService
        let logoUrl = "";
        if (organizerData.logo) {
          if (organizerData.logo.includes("http")) {
            logoUrl = organizerData.logo;
          } else if (organizerData.logo.startsWith("/media/") || organizerData.logo.startsWith("/storage/")) {
            logoUrl = organizerData.logo;
          } else {
            logoUrl = `/media/${organizerData.logo.replace(/^\/media\//, "")}`;
          }
        }
        
        setOrganizer({
          id: organizerData.id?.toString() || id,
          name: organizerData.name || "",
          description: organizerData.category || organizerData.location || t("organizers.organizerDescription"),
          logoUrl: logoUrl,
          events: transformedEvents,
        });
      } catch (err: any) {
        console.error("Error fetching organizer data:", err);
        setError(err?.message || t("organizers.error.fetchFailed"));
        toast({
          title: t("organizers.error.title"),
          description: err?.message || t("organizers.error.fetchFailed"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerData();
  }, [id, t, toast]);

  // Navigate handlers
  const goToEvent = (eventId: string) => navigate(`/event/${eventId}`);
  const goToExpiredEvent = (eventId: string) => navigate(`/expired-event`);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !organizer) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("organizers.error.title")}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error || t("organizers.error.notFound")}
          </p>
          <Button onClick={() => navigate("/organizers")}>
            {t("organizers.backToOrganizers")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Organizer Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          {organizer.logoUrl && (
            <img
              src={organizer.logoUrl}
              alt={organizer.name}
              className="w-24 h-24 mx-auto mb-4 object-cover rounded-lg shadow-lg"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          )}
          {!organizer.logoUrl && (
            <div className="w-24 h-24 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {organizer.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            {organizer.name}
          </h1>
          <p className="text-muted-foreground max-w-prose mx-auto leading-relaxed">
            {organizer.description}
          </p>
        </div>

        {/* Upcoming Events Section */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {t("organizers.Utitle")}
          </h2>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12 bg-secondary/30 rounded-lg border border-border">
              <p className="text-muted-foreground text-lg mb-2">
                {t("organizers.noUpcomingEvents", "No upcoming events")}
              </p>
              <p className="text-muted-foreground/70 text-sm">
                {t("organizers.stayTuned", "Stay tuned for future events!")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="card-elevated rounded-xl overflow-hidden hover-scale cursor-pointer"
                onClick={() => goToEvent(evt.id)}
              >
                {/* Event Image / Carousel (single image here) */}
                {evt.images && evt.images.length > 0 ? (
                  <Swiper
                    modules={[Navigation, Pagination]}
                    pagination={{ clickable: true }}
                    navigation
                    loop={false}
                    slidesPerView={1}
                    className="h-56 w-full"
                  >
                    {evt.images.map((img, idx) => (
                      <SwiperSlide key={idx} className="h-full">
                        <img
                          src={img.url}
                          alt={evt.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const placeholderDiv =
                              document.createElement("div");
                            placeholderDiv.className =
                              "w-full h-full flex items-center justify-center bg-secondary/50 text-muted-foreground";
                            placeholderDiv.innerHTML =
                              '<div class="text-center p-4">' +
                              '<div class="text-lg font-semibold text-foreground mb-2">' +
                              t("eventDetail.noMediaAvailable") +
                              "</div>" +
                              '<div class="text-xs text-muted-foreground">' +
                              t("eventDetail.noMediaDescription") +
                              "</div>" +
                              "</div>";
                            target.parentNode?.appendChild(placeholderDiv);
                          }}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                ) : (
                  <div className="h-56 w-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                    <div className="text-center p-4">
                      <div className="text-lg font-semibold text-foreground mb-2">
                        {t("eventDetail.noMediaAvailable")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("eventDetail.noMediaDescription")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Event Info */}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-2 min-h-[48px]">
                    {evt.title}
                  </h3>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t("organizers.date")}: {evt.date}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {t("organizers.time")}: {evt.time}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">
                      {t("organizers.location")}: {evt.location}
                    </span>
                  </div>

                  {/* Category and Action Buttons */}
                  <div className="flex flex-col gap-2 mt-2">
                    <Badge variant="secondary" className="w-fit">
                      {evt.category}
                    </Badge>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation(); // prevent parent onClick
                          navigate(`/booking/${evt.id}`);
                        }}
                      >
                        {t("buttons.book_now")}
                      </Button>

                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/event/${evt.id}`);
                        }}
                      >
                        {t("buttons.view_event")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </section>
        {/* Past Events Section */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {t("organizers.Ftitle")}
          </h2>

          {pastEvents.length === 0 ? (
            <div className="text-center py-12 bg-secondary/30 rounded-lg border border-border">
              <p className="text-muted-foreground text-lg mb-2">
                {t("organizers.noPastEvents", "No former events")}
              </p>
              <p className="text-muted-foreground/70 text-sm">
                {t("organizers.stayTuned", "Stay tuned for future events!")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pastEvents.map((evt) => (
              <div
                key={evt.id}
                className="card-elevated rounded-xl overflow-hidden hover-scale cursor-pointer"
                onClick={() => goToExpiredEvent(evt.id)}
              >
                {/* Event Image / Carousel (single image here) */}
                <Swiper
                  modules={[Navigation, Pagination]}
                  pagination={{ clickable: true }}
                  navigation
                  loop={false}
                  slidesPerView={1}
                  className="h-56 w-full"
                >
                  {evt.images.map((img, idx) => (
                    <SwiperSlide key={idx} className="h-full">
                      <img
                        src={img.url}
                        alt={evt.title}
                        className="w-full h-full object-cover"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Event Info */}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-2 min-h-[48px]">
                    {evt.title}
                  </h3>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t("organizers.date")}: {evt.date}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {t("organizers.time")}: {evt.time}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">
                      {t("organizers.location")}: {evt.location}
                    </span>
                  </div>

                  {/* Category Badge */}
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="secondary">{evt.category}</Badge>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ViewOrganizersPage;
