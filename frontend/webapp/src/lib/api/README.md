# API Client Documentation

This API client provides a comprehensive interface for interacting with the Ticket Runner Compass backend API. It includes authentication, event management, booking operations, and admin functionality.

## Table of Contents

1. [Installation & Setup](#installation--setup)
2. [Basic Usage](#basic-usage)
3. [Authentication](#authentication)
4. [Event Management](#event-management)
5. [Booking & Tickets](#booking--tickets)
6. [Admin Operations](#admin-operations)
7. [React Query Hooks](#react-query-hooks)
8. [Error Handling](#error-handling)
9. [Configuration](#configuration)
10. [Best Practices](#best-practices)

## Installation & Setup

The API client is already included in the project. Make sure you have the required dependencies:

```bash
npm install axios @tanstack/react-query
```

### Environment Variables

Create a `.env` file in your project root:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Basic Usage

### Direct Service Usage

```typescript
import { ApiClient, EventsService, AuthService } from "@/lib/api";

// Using the main API client
const events = await ApiClient.events.getEvents(1, 10);

// Using individual services
const featuredEvents = await EventsService.getFeaturedEvents();
const user = await AuthService.getCurrentUser();
```

### React Query Hooks

```typescript
import { useEvents, useCurrentUser, useLogin } from "@/lib/api/hooks";

function MyComponent() {
  const { data: events, isLoading } = useEvents(1, 10);
  const { data: user } = useCurrentUser();
  const loginMutation = useLogin();

  const handleLogin = async (credentials) => {
    await loginMutation.mutateAsync(credentials);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {events?.data.map((event) => (
        <div key={event.id}>{event.title}</div>
      ))}
    </div>
  );
}
```

## Authentication

### Login

```typescript
import { AuthService } from "@/lib/api";

// Direct service usage
const authResponse = await AuthService.login({
  email: "user@example.com",
  password: "password123",
});

// Using React Query hook
import { useLogin } from "@/lib/api/hooks";

function LoginForm() {
  const loginMutation = useLogin();

  const handleSubmit = async (formData) => {
    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });
      // Redirect or show success message
    } catch (error) {
      // Handle error
      console.error("Login failed:", error.message);
    }
  };
}
```

### Signup

```typescript
import { useSignup } from "@/lib/api/hooks";

function SignupForm() {
  const signupMutation = useSignup();

  const handleSignup = async (userData) => {
    await signupMutation.mutateAsync({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      confirmPassword: userData.confirmPassword,
    });
  };
}
```

### Logout

```typescript
import { useLogout } from "@/lib/api/hooks";

function LogoutButton() {
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };
}
```

## Event Management

### Get Events

```typescript
import { useEvents, useFeaturedEvents } from "@/lib/api/hooks";

function EventsList() {
  // Get all events with pagination
  const { data: events, isLoading } = useEvents(1, 10, {
    category: "Music",
    featured: true,
  });

  // Get featured events
  const { data: featuredEvents } = useFeaturedEvents();

  return (
    <div>
      {events?.data.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### Create Event

```typescript
import { useCreateEvent } from "@/lib/api/hooks";

function CreateEventForm() {
  const createEventMutation = useCreateEvent();

  const handleSubmit = async (eventData) => {
    await createEventMutation.mutateAsync({
      title: eventData.title,
      date: eventData.date,
      time: eventData.time,
      location: eventData.location,
      price: eventData.price,
      description: eventData.description,
    });
  };
}
```

### Update Event

```typescript
import { useUpdateEvent } from "@/lib/api/hooks";

function EditEventForm({ eventId }) {
  const updateEventMutation = useUpdateEvent();

  const handleSubmit = async (eventData) => {
    await updateEventMutation.mutateAsync({
      id: eventId,
      eventData: {
        title: eventData.title,
        price: eventData.price,
      },
    });
  };
}
```

## Booking & Tickets

### Create Booking

```typescript
import { useCreateBooking } from "@/lib/api/hooks";

function BookingForm({ eventId }) {
  const createBookingMutation = useCreateBooking();

  const handleBooking = async (bookingData) => {
    await createBookingMutation.mutateAsync({
      eventId,
      ticketCategory: "VIP",
      quantity: 2,
      dependents: [
        {
          name: "John Doe",
          mobile: "+1234567890",
          socialMedia: "@johndoe",
        },
      ],
      paymentMethod: "credit_card",
    });
  };
}
```

### Get User Bookings

```typescript
import { useUserBookings } from "@/lib/api/hooks";

function MyBookings() {
  const { data: bookings, isLoading } = useUserBookings(1, 10);

  return (
    <div>
      {bookings?.data.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}
```

### Check-in Ticket

```typescript
import { useCheckInTicket } from "@/lib/api/hooks";

function CheckInForm({ ticketId }) {
  const checkInMutation = useCheckInTicket();

  const handleCheckIn = async () => {
    await checkInMutation.mutateAsync({
      ticketId,
      location: "Main Gate",
    });
  };
}
```

## Admin Operations

### Dashboard Statistics

```typescript
import { useAdminDashboardStats } from "@/lib/api/hooks";

function AdminDashboard() {
  const { data: stats, isLoading } = useAdminDashboardStats();

  return (
    <div>
      <div>Total Events: {stats?.totalEvents}</div>
      <div>Total Revenue: ${stats?.totalRevenues}</div>
      <div>Active Users: {stats?.activeUsers}</div>
    </div>
  );
}
```

### User Management

```typescript
import { useAdminUsers, useUpdateCustomerStatus } from "@/lib/api/hooks";

function UserManagement() {
  const { data: users } = useAdminUsers(1, 10);
  const updateStatusMutation = useUpdateCustomerStatus();

  const handleStatusUpdate = async (userId, status) => {
    await updateStatusMutation.mutateAsync({ id: userId, status });
  };
}
```

## React Query Hooks

### Available Hooks

#### Authentication Hooks

- `useCurrentUser()` - Get current user profile
- `useLogin()` - User login mutation
- `useSignup()` - User signup mutation
- `useLogout()` - User logout mutation
- `useForgotPassword()` - Forgot password mutation
- `useResetPassword()` - Reset password mutation
- `useVerifyEmail()` - Email verification mutation
- `useChangePassword()` - Change password mutation

#### Event Hooks

- `useEvents(page, limit, filters)` - Get events with pagination
- `useEvent(id)` - Get single event
- `useFeaturedEvents()` - Get featured events
- `useEventsByCategory(category, page, limit)` - Get events by category
- `useSearchEvents(query, page, limit)` - Search events
- `useCreateEvent()` - Create event mutation
- `useUpdateEvent()` - Update event mutation
- `useDeleteEvent()` - Delete event mutation

#### Booking Hooks

- `useUserBookings(page, limit)` - Get user's bookings
- `useCreateBooking()` - Create booking mutation
- `useCancelBooking()` - Cancel booking mutation
- `useUserTickets(page, limit)` - Get user's tickets
- `useCheckInTicket()` - Check-in ticket mutation

#### Admin Hooks

- `useAdminDashboardStats()` - Get admin dashboard statistics
- `useAdminUsers(page, limit, filters)` - Get admin users
- `useCustomers(page, limit, filters)` - Get customers
- `useAdminAnalytics()` - Get admin analytics

### Query Keys

The hooks use structured query keys for efficient caching:

```typescript
// Event query keys
eventKeys.all = ["events"];
eventKeys.detail(id) = ["events", "detail", id];
eventKeys.featured() = ["events", "featured"];

// Auth query keys
authKeys.user() = ["auth", "user"];
authKeys.profile() = ["auth", "profile"];
```

## Error Handling

### Global Error Handling

The API client includes automatic error handling with retry logic and token refresh:

```typescript
// Errors are automatically handled and transformed
try {
  const events = await EventsService.getEvents();
} catch (error) {
  // error.message - Human readable error message
  // error.status - HTTP status code
  // error.code - Error code from API
  console.error("API Error:", error.message);
}
```

### React Query Error Handling

```typescript
function MyComponent() {
  const { data, error, isLoading } = useEvents();

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>{/* Your component */}</div>;
}
```

### Custom Error Handling

```typescript
import { useEvents } from "@/lib/api/hooks";

function EventsList() {
  const { data, error, isLoading } = useEvents(1, 10, {
    onError: (error) => {
      // Custom error handling
      if (error.status === 401) {
        // Redirect to login
        window.location.href = "/login";
      } else if (error.status === 403) {
        // Show access denied message
        toast.error("Access denied");
      }
    },
  });
}
```

## Configuration

### API Configuration

```typescript
// src/lib/api/config.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};
```

### React Query Configuration

```typescript
// In your main App component or query client setup
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app components */}
    </QueryClientProvider>
  );
}
```

## Best Practices

### 1. Use React Query Hooks

Prefer React Query hooks over direct service calls in components:

```typescript
// ✅ Good
function MyComponent() {
  const { data, isLoading } = useEvents();
  return <div>{/* Component */}</div>;
}

// ❌ Avoid
function MyComponent() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    EventsService.getEvents().then(setEvents);
  }, []);

  return <div>{/* Component */}</div>;
}
```

### 2. Handle Loading States

Always handle loading and error states:

```typescript
function MyComponent() {
  const { data, error, isLoading } = useEvents();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <EmptyState />;

  return <EventsList events={data.data} />;
}
```

### 3. Optimistic Updates

Use optimistic updates for better UX:

```typescript
import { useUpdateEvent } from "@/lib/api/hooks";

function EditEventForm({ eventId }) {
  const queryClient = useQueryClient();
  const updateEventMutation = useUpdateEvent();

  const handleSubmit = async (eventData) => {
    // Optimistically update the cache
    queryClient.setQueryData(eventKeys.detail(eventId), {
      ...currentEvent,
      ...eventData,
    });

    try {
      await updateEventMutation.mutateAsync({ id: eventId, eventData });
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    }
  };
}
```

### 4. Pagination

Handle pagination properly:

```typescript
function EventsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useEvents(page, 10);

  return (
    <div>
      {data?.data.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}

      <Pagination
        currentPage={page}
        totalPages={data?.pagination.totalPages}
        onPageChange={setPage}
        isLoading={isFetching}
      />
    </div>
  );
}
```

### 5. Error Boundaries

Use error boundaries for better error handling:

```typescript
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div>
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### 6. Type Safety

Always use TypeScript interfaces for better type safety:

```typescript
import { EventData, CreateBookingRequest } from "@/lib/api/types";

function CreateBookingForm({ eventId }: { eventId: string }) {
  const createBookingMutation = useCreateBooking();

  const handleSubmit = (data: CreateBookingRequest) => {
    createBookingMutation.mutateAsync(data);
  };
}
```

## Migration from Mock Data

When you're ready to switch from mock data to the real API:

1. Update environment variables with your API URL
2. Replace mock data calls with API client calls
3. Update error handling for real API responses
4. Test authentication flow
5. Verify all CRUD operations work correctly

## Support

For questions or issues with the API client:

1. Check the TypeScript types for method signatures
2. Review the error handling examples
3. Test with the React Query DevTools
4. Check the network tab for API requests

The API client is designed to be robust, type-safe, and easy to use. It handles common scenarios like authentication, caching, and error handling automatically while providing flexibility for custom implementations.
