import React, { useState } from "react";
import {
  useEvents,
  useCurrentUser,
  useLogin,
  useCreateBooking,
} from "../hooks";
import { EventData, CreateBookingRequest } from "../types";

/**
 * Example component demonstrating API client usage
 */
export const ExampleUsage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Authentication
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const loginMutation = useLogin();

  // Events
  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
  } = useEvents(page, 10, {
    search: searchQuery,
    featured: true,
  });

  // Booking
  const createBookingMutation = useCreateBooking();

  // Handle login
  const handleLogin = async (credentials: {
    email: string;
    password: string;
  }) => {
    try {
      await loginMutation.mutateAsync(credentials);
      console.log("Login successful!");
    } catch (error: any) {
      console.error("Login failed:", error.message);
    }
  };

  // Handle booking
  const handleBooking = async (eventId: string) => {
    try {
      const bookingData: CreateBookingRequest = {
        eventId,
        ticketCategory: "regular",
        quantity: 1,
        paymentMethod: "credit_card",
      };

      await createBookingMutation.mutateAsync(bookingData);
      console.log("Booking created successfully!");
    } catch (error: any) {
      console.error("Booking failed:", error.message);
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
  };

  if (userLoading) {
    return <div>Loading user...</div>;
  }

  if (eventsError) {
    return <div>Error loading events: {eventsError.message}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">API Client Example</h1>

      {/* User Section */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        {user ? (
          <div>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Phone:</strong> {user.phone}
            </p>
          </div>
        ) : (
          <div>
            <p>Not logged in</p>
            <button
              onClick={() =>
                handleLogin({ email: "test@example.com", password: "password" })
              }
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loginMutation.isLoading}
            >
              {loginMutation.isLoading ? "Logging in..." : "Login"}
            </button>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Events Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Events</h2>

        {eventsLoading ? (
          <div>Loading events...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events?.data.map((event: EventData) => (
              <div
                key={event.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                <p className="text-gray-600 mb-2">
                  {event.date} at {event.time}
                </p>
                <p className="text-gray-600 mb-2">{event.location}</p>
                <p className="font-semibold text-green-600">${event.price}</p>
                <p className="text-sm text-gray-500 mb-3">
                  {event.ticketsAvailable} tickets available
                </p>

                {user && (
                  <button
                    onClick={() => handleBooking(event.id!)}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    disabled={
                      createBookingMutation.isLoading ||
                      event.ticketsAvailable === 0
                    }
                  >
                    {createBookingMutation.isLoading
                      ? "Booking..."
                      : "Book Now"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {events && events.pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6 space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <span className="px-4 py-2">
              Page {page} of {events.pagination.totalPages}
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page === events.pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Statistics */}
      {events && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Statistics</h3>
          <p>Total Events: {events.pagination.total}</p>
          <p>Current Page: {events.pagination.page}</p>
          <p>Events per Page: {events.pagination.limit}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Example of using the API client with form handling
 */
export const BookingFormExample: React.FC<{ eventId: string }> = ({
  eventId,
}) => {
  const [formData, setFormData] = useState({
    ticketCategory: "regular",
    quantity: 1,
    dependents: [] as any[],
  });

  const createBookingMutation = useCreateBooking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const bookingData: CreateBookingRequest = {
        eventId,
        ticketCategory: formData.ticketCategory,
        quantity: formData.quantity,
        dependents: formData.dependents,
        paymentMethod: "credit_card",
      };

      await createBookingMutation.mutateAsync(bookingData);
      alert("Booking created successfully!");
    } catch (error: any) {
      alert(`Booking failed: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Ticket Category
        </label>
        <select
          value={formData.ticketCategory}
          onChange={(e) =>
            setFormData({ ...formData, ticketCategory: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="regular">Regular</option>
          <option value="vip">VIP</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Quantity</label>
        <input
          type="number"
          min="1"
          max="10"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: parseInt(e.target.value) })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={createBookingMutation.isLoading}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
      >
        {createBookingMutation.isLoading
          ? "Creating Booking..."
          : "Create Booking"}
      </button>
    </form>
  );
};

export default ExampleUsage;
