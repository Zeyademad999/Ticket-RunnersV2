import { FilteredEventsList } from "@/components/FilteredEventsList";

/**
 * Filtered Events Page
 *
 * This page demonstrates the complete integration of the events filter API.
 * It includes:
 * - Advanced filtering options (category, venue, organizer, date range, price range)
 * - Real-time filtering with loading states
 * - Pagination support
 * - Error handling
 * - Internationalization support
 */
export default function FilteredEventsPage() {
  return <FilteredEventsList />;
}
