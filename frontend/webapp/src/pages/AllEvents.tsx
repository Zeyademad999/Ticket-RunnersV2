import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { EventCard } from "@/components/EventCard";
import { EventFilters } from "@/components/EventFilters";
import { useEventFilters } from "@/lib/api";
import { FilterEventsRequest } from "@/lib/api/types";

export default function AllEventsPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section") ?? "all";

  // Use the API hook for events
  const { events, loading, error, filterEvents } = useEventFilters();
  const [currentFilters, setCurrentFilters] = useState<FilterEventsRequest>({
    page: 1,
    limit: 20,
  });

  // Load events based on section
  useEffect(() => {
    const loadEvents = async () => {
      const filters: FilterEventsRequest = {
        page: 1,
        limit: 20,
      };

      switch (section) {
        case "trending":
          // Load all events for trending (API doesn't have featured parameter)
          break;
        case "upcoming":
          // Load all events for upcoming
          break;
        case "recommended":
          // Load all events for recommendations
          break;
        default:
          // Load all events
          break;
      }

      setCurrentFilters(filters);
      await filterEvents(filters);
    };

    loadEvents();
  }, [section, filterEvents]);

  // Convert API events to component format
  const apiEvents = useMemo(() => {
    return events.map((event) => ({
      id: event.id.toString(),
      title: event.title,
      image: event.thumbnail_path,
      date: event.event_date,
      time: event.event_time,
      location: event.event_location,
      price: event.starting_price ? parseFloat(event.starting_price) : 0,
      category: event.category_name,
      isFeatured: event.featured,
    }));
  }, [events]);

  const handleFilterChange = useCallback(
    async (filters: FilterEventsRequest) => {
      setCurrentFilters(filters);
      await filterEvents(filters);
    },
    [filterEvents]
  );

  const title = (() => {
    switch (section) {
      case "trending":
        return t("eventspage.trending");
      case "upcoming":
        return t("eventspage.upcoming");
      case "recommended":
        return t("eventspage.recommended");
      default:
        return t("eventspage.all");
    }
  })();

  return (
    <div className="min-h-screen bg-gradient-dark">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {title}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("eventspage.subtitle")}
          </p>
        </div>

        <div className="mb-12">
          <EventFilters onFilterChange={handleFilterChange} loading={loading} />
        </div>

        {loading && apiEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {!loading && apiEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {apiEvents.map((event, i) => (
              <div
                key={event.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <EventCard {...event} />
              </div>
            ))}
          </div>
        )}

        {!loading && apiEvents.length === 0 && !error && (
          <p className="text-muted-foreground text-center">
            {t("eventspage.no_matches")}
          </p>
        )}
      </main>
    </div>
  );
}
