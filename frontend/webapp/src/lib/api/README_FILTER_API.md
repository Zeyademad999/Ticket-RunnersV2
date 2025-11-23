# Events Filter API Integration

This document describes the integration of the advanced events filter API endpoint.

## API Endpoint

**URL:** `https://trapi.flokisystems.com/api/v1/events/filter`

**Method:** GET

## Query Parameters

| Parameter      | Type         | Constraints | Description                             |
| -------------- | ------------ | ----------- | --------------------------------------- |
| `category_id`  | integer      | >= 1        | Filter by event category                |
| `date_start`   | string<date> | -           | Filter events from this date            |
| `date_end`     | string<date> | -           | Filter events until this date           |
| `limit`        | integer      | 1-50        | Number of events per page (default: 20) |
| `organizer_id` | integer      | >= 1        | Filter by organizer                     |
| `page`         | integer      | >= 1        | Page number (default: 1)                |
| `price_max`    | number       | >= 0        | Maximum price filter                    |
| `price_min`    | number       | >= 0        | Minimum price filter                    |
| `venue_id`     | integer      | >= 1        | Filter by venue                         |

## Response Structure

```typescript
interface FilterEventsResponse {
  events: FilteredEvent[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more: boolean;
  };
}

interface FilteredEvent {
  id: number;
  title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  thumbnail_id: number;
  category_id: number;
  featured: boolean;
  thumbnail_path: string;
  category_name: string;
  starting_price: string | null;
}
```

## Usage Examples

### Basic Usage

```typescript
import { EventsService } from "@/lib/api";

// Filter by category
const musicEvents = await EventsService.filterEvents({
  category_id: 1,
  limit: 10,
});

// Filter by date range
const upcomingEvents = await EventsService.filterEvents({
  date_start: "2024-12-01",
  date_end: "2024-12-31",
  limit: 20,
});

// Filter by price range
const affordableEvents = await EventsService.filterEvents({
  price_min: 0,
  price_max: 100,
  limit: 15,
});
```

### Using the React Hook

```typescript
import { useEventFilters } from "@/lib/api";

function EventsPage() {
  const { events, pagination, loading, error, filterEvents } =
    useEventFilters();

  const handleFilter = async (filters) => {
    await filterEvents(filters);
  };

  return (
    <div>
      <EventFilters onFilterChange={handleFilter} loading={loading} />
      {/* Render events */}
    </div>
  );
}
```

### Using the Filter Component

```typescript
import { EventFilters } from "@/components/EventFilters";
import { FilterEventsRequest } from "@/lib/api/types";

function MyComponent() {
  const handleFilterChange = (filters: FilterEventsRequest) => {
    console.log("Filter changed:", filters);
    // Call your API or update state
  };

  return <EventFilters onFilterChange={handleFilterChange} loading={false} />;
}
```

## Component Integration

### EventFilters Component

The `EventFilters` component provides a complete filtering interface with:

- **Category Selection**: Dropdown with predefined categories
- **Venue Selection**: Dropdown with available venues
- **Organizer Selection**: Dropdown with event organizers
- **Date Range**: Start and end date pickers
- **Price Range**: Min/max price inputs
- **Clear Filters**: Reset all filters button

### FilteredEventsList Component

The `FilteredEventsList` component demonstrates complete integration:

- Uses the `useEventFilters` hook
- Handles loading states and errors
- Displays pagination controls
- Renders filtered events using `EventCard`

## Error Handling

The API includes comprehensive error handling:

- **Parameter Validation**: All parameters are validated before sending
- **Network Errors**: Automatic retry with exponential backoff
- **Rate Limiting**: Handles 429 responses with jitter
- **Type Safety**: Full TypeScript support

## Translation Support

All filter labels and messages support internationalization:

```json
{
  "filters": {
    "title": "Filter Events",
    "category": "Category",
    "venue": "Venue",
    "organizer": "Organizer",
    "minPrice": "Min Price",
    "maxPrice": "Max Price"
  },
  "events": {
    "filteredEvents": "Filtered Events",
    "noEventsFound": "No events found matching your criteria"
  }
}
```

## Best Practices

1. **Debounce Filter Changes**: Implement debouncing for real-time filtering
2. **Cache Results**: Consider caching filter results for better performance
3. **Loading States**: Always show loading indicators during API calls
4. **Error Boundaries**: Wrap filter components in error boundaries
5. **Accessibility**: Ensure all filter controls are keyboard accessible

## Testing

The integration includes comprehensive error handling and validation. Test with:

- Invalid parameter values
- Network failures
- Empty results
- Large datasets
- Concurrent filter changes
