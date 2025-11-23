import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FilterEventsRequest } from "@/lib/api/types";

interface EventFiltersProps {
  onFilterChange: (filters: FilterEventsRequest) => void;
  loading?: boolean;
}

interface FilterOptions extends FilterEventsRequest {
  category_name?: string;
  venue_name?: string;
  organizer_name?: string;
}

// Category mapping for the API
const categories = [
  { id: null, name: "All" },
  { id: 1, name: "Music" },
  { id: 2, name: "Sports" },
  { id: 3, name: "Technology" },
  { id: 4, name: "Art" },
  { id: 5, name: "Theater" },
  { id: 6, name: "Food" },
  { id: 7, name: "Cultural" },
  { id: 8, name: "Social" },
];

// Sample venues (these would typically come from an API)
const venues = [
  { id: null, name: "All" },
  { id: 1, name: "Cairo Opera House" },
  { id: 2, name: "Al-Azhar Park" },
  { id: 3, name: "Museum of Modern Art" },
  { id: 4, name: "Sayed Darwish Theatre" },
  { id: 5, name: "New Capital" },
  { id: 6, name: "Zamalek District" },
  { id: 7, name: "Downtown Cairo" },
  { id: 8, name: "Nile Corniche" },
];

// Sample organizers (these would typically come from an API)
const organizers = [
  { id: null, name: "All" },
  { id: 1, name: "Cairo Events" },
  { id: 2, name: "Music Hub" },
  { id: 3, name: "Tech Summit" },
  { id: 4, name: "Art Gallery" },
  { id: 5, name: "Cultural Center" },
];

export function EventFilters({
  onFilterChange,
  loading = false,
}: EventFiltersProps) {
  const { t, i18n } = useTranslation();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [filters, setFilters] = useState<FilterOptions>({
    category_id: undefined,
    venue_id: undefined,
    organizer_id: undefined,
    price_min: undefined,
    price_max: undefined,
    date_start: undefined,
    date_end: undefined,
    page: 1,
    limit: 20,
  });

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    // Convert to API format
    const apiFilters: FilterEventsRequest = {
      category_id: updated.category_id,
      venue_id: updated.venue_id,
      organizer_id: updated.organizer_id,
      price_min: updated.price_min,
      price_max: updated.price_max,
      date_start: updated.date_start,
      date_end: updated.date_end,
      page: updated.page,
      limit: updated.limit,
    };

    onFilterChange(apiFilters);
  };

  const clearFilters = () => {
    const cleared = {
      category_id: undefined,
      venue_id: undefined,
      organizer_id: undefined,
      price_min: undefined,
      price_max: undefined,
      date_start: undefined,
      date_end: undefined,
      page: 1,
      limit: 20,
    };
    setStartDate(null);
    setEndDate(null);
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters =
    filters.category_id !== undefined ||
    filters.venue_id !== undefined ||
    filters.organizer_id !== undefined ||
    filters.price_min !== undefined ||
    filters.price_max !== undefined ||
    filters.date_start !== undefined ||
    filters.date_end !== undefined;

  return (
    <div className={clsx("bg-card border border-border rounded-xl p-6 mb-8")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 flex-row">
          <Filter className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            {t("filters.title")}
          </h3>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            {t("filters.clearAll")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {t("filters.category")}
          </label>
          <Select
            value={filters.category_id?.toString() || "all"}
            onValueChange={(value) =>
              updateFilters({
                category_id: value === "all" ? undefined : parseInt(value),
              })
            }
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.category")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem
                  key={category.id || "all"}
                  value={category.id?.toString() || "all"}
                >
                  {t(`categories.${category.name}`, category.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {t("filters.venue")}
          </label>
          <Select
            value={filters.venue_id?.toString() || "all"}
            onValueChange={(value) =>
              updateFilters({
                venue_id: value === "all" ? undefined : parseInt(value),
              })
            }
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.venue")} />
            </SelectTrigger>
            <SelectContent>
              {venues.map((venue) => (
                <SelectItem
                  key={venue.id || "all"}
                  value={venue.id?.toString() || "all"}
                >
                  {t(`venues.${venue.name}`, venue.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            {t("filters.organizer")}
          </label>
          <Select
            value={filters.organizer_id?.toString() || "all"}
            onValueChange={(value) =>
              updateFilters({
                organizer_id: value === "all" ? undefined : parseInt(value),
              })
            }
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("filters.organizer")} />
            </SelectTrigger>
            <SelectContent>
              {organizers.map((organizer) => (
                <SelectItem
                  key={organizer.id || "all"}
                  value={organizer.id?.toString() || "all"}
                >
                  {t(`organizers.${organizer.name}`, organizer.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col md:flex-row space-x-2">
          {i18n.dir() === "rtl" ? (
            <>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t("filters.endDate")}
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    setEndDate(date);
                    updateFilters({
                      date_end: date
                        ? date.toISOString().split("T")[0]
                        : undefined,
                    });
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  maxDate={new Date(new Date().getFullYear(), 11, 31)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  placeholderText={t("filters.endDate")}
                  calendarStartDay={1}
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t("filters.startDate")}
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => {
                    setStartDate(date);
                    updateFilters({
                      date_start: date
                        ? date.toISOString().split("T")[0]
                        : undefined,
                    });
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={new Date(new Date().getFullYear(), 11, 31)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  placeholderText={t("filters.startDate")}
                  calendarStartDay={1}
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t("filters.startDate")}
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => {
                    setStartDate(date);
                    updateFilters({
                      date_start: date
                        ? date.toISOString().split("T")[0]
                        : undefined,
                    });
                  }}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={new Date(new Date().getFullYear(), 11, 31)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  placeholderText={t("filters.startDate")}
                  calendarStartDay={1}
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t("filters.endDate")}
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => {
                    setEndDate(date);
                    updateFilters({
                      date_end: date
                        ? date.toISOString().split("T")[0]
                        : undefined,
                    });
                  }}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  maxDate={new Date(new Date().getFullYear(), 11, 31)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                  placeholderText={t("filters.endDate")}
                  calendarStartDay={1}
                  disabled={loading}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col md:flex-row space-x-2">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t("filters.minPrice")}
            </label>
            <Input
              type="number"
              placeholder={t("filters.minPrice")}
              value={filters.price_min || ""}
              onChange={(e) =>
                updateFilters({
                  price_min: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={loading}
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t("filters.maxPrice")}
            </label>
            <Input
              type="number"
              placeholder={t("filters.maxPrice")}
              value={filters.price_max || ""}
              onChange={(e) =>
                updateFilters({
                  price_max: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
              disabled={loading}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
