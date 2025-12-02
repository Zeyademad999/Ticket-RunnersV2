import { useState, useEffect } from "react";
import { EventFilters } from "./EventFilters";
import { EventCard } from "./EventCard";
import { useEventFilters } from "@/lib/api";
import { FilterEventsRequest } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FilteredEventsList() {
  const { t } = useTranslation();
  const { events, pagination, loading, error, filterEvents } =
    useEventFilters();
  const [currentFilters, setCurrentFilters] = useState<FilterEventsRequest>({
    page: 1,
    limit: 20,
  });

  // Load initial events
  useEffect(() => {
    filterEvents(currentFilters);
  }, []);

  const handleFilterChange = async (filters: FilterEventsRequest) => {
    setCurrentFilters(filters);
    await filterEvents(filters);
  };

  const handleLoadMore = async () => {
    if (pagination.has_more) {
      const nextPage = pagination.current_page + 1;
      const newFilters = { ...currentFilters, page: nextPage };
      setCurrentFilters(newFilters);
      await filterEvents(newFilters);
    }
  };

  const handlePreviousPage = async () => {
    if (pagination.current_page > 1) {
      const prevPage = pagination.current_page - 1;
      const newFilters = { ...currentFilters, page: prevPage };
      setCurrentFilters(newFilters);
      await filterEvents(newFilters);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("eventsPage.filteredEvents")}</h1>

      <EventFilters onFilterChange={handleFilterChange} loading={loading} />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && events.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t("common.loading")}</span>
        </div>
      )}

      {!loading && events.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("eventsPage.noEventsFound")}</p>
        </div>
      )}

      {events.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {events.map((event) => (
              <EventCard
                key={event.id}
                id={event.id.toString()}
                title={event.title}
                image={event.thumbnail_path}
                date={event.event_date}
                time={event.event_time}
                location={event.event_location}
                price={
                  event.starting_price ? parseFloat(event.starting_price) : 0
                }
                category={event.category_name}
                isFeatured={event.featured}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t("pagination.showing", {
                start: (pagination.current_page - 1) * pagination.per_page + 1,
                end: Math.min(
                  pagination.current_page * pagination.per_page,
                  pagination.total
                ),
                total: pagination.total,
              })}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePreviousPage}
                disabled={pagination.current_page <= 1 || loading}
              >
                {t("pagination.previous")}
              </Button>

              <span className="flex items-center px-3 py-2 text-sm">
                {t("pagination.page", {
                  current: pagination.current_page,
                  total: pagination.last_page,
                })}
              </span>

              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={!pagination.has_more || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("pagination.next")
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
