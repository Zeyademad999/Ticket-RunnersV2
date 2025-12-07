<!-- 2ac09e20-1ed1-4d9e-bb61-2913dd222a00 b8c86fc8-e3a5-4603-bc98-03ad191bc3e0 -->
# Marketplace Feature Implementation

## Overview

Create a ticket marketplace section in the web app where customers can list their transferable tickets for sale. Users browse available tickets and contact owners directly (yellow pages style). The actual transfer happens through the normal portal.

## Backend Implementation

### 1. Database Model (`backend/tickets/models.py`)

- Create `TicketMarketplaceListing` model with fields:
- `ticket` (ForeignKey to Ticket)
- `customer` (ForeignKey to Customer - the seller)
- `listed_at` (DateTimeField)
- `terms_accepted` (BooleanField)
- `terms_accepted_at` (DateTimeField)
- `is_active` (BooleanField, default=True)
- Add indexes for performance

### 2. API Endpoints (`backend/apps/webapp/views.py`)

- `GET /api/v1/marketplace/listings/` - List all active marketplace listings with filtering support (public, no auth required)
- Query parameters: `event_id`, `event_category_id`, `ticket_category`, `price_min`, `price_max`, `event_date_start`, `event_date_end`, `venue_id`, `location`, `search` (event name), `sort_by` (price_asc, price_desc, date_asc, date_desc, listed_recent), `page`, `limit`
- `POST /api/v1/marketplace/listings/` - Add ticket to marketplace (requires auth, terms acceptance)
- `DELETE /api/v1/marketplace/listings/:id/` - Remove listing (requires auth, owner only)
- `GET /api/v1/marketplace/my-listings/` - Get current user's listings (requires auth)
- `GET /api/v1/marketplace/filter-options/` - Get available filter options (categories, venues, price ranges) for dropdowns

### 3. Serializers (`backend/apps/webapp/serializers.py`)

- Create `TicketMarketplaceListingSerializer` with:
- Ticket details (event, category, price, ticket_number)
- Seller contact info (name, mobile_number, email)
- Listing metadata (listed_at, is_active)

### 4. Business Logic

- Validate ticket is transferable (`ticket.event.ticket_transfer_enabled` and `ticket.status == 'valid'`)
- Prevent duplicate listings for same ticket
- Auto-deactivate listings when ticket is transferred/used/refunded
- Include seller contact details in listing response

## Frontend Implementation

### 1. New Page (`frontend/webapp/src/pages/MarketplacePage.tsx`)

- Display all active marketplace listings in a grid
- Responsive card layout (mobile-first)
- Empty state when no listings
- Loading states

### 2. Marketplace Ticket Card Component (`frontend/webapp/src/components/MarketplaceTicketCard.tsx`)

- Display ticket details (event name, date, category, price)
- Display seller contact info (name, phone, email)
- Clickable to show full details
- Consistent with existing design system

### 3. List Ticket Modal/Page (`frontend/webapp/src/components/ListTicketModal.tsx` or separate page)

- Terms and conditions acceptance checkbox
- Ticket selection dropdown (only transferable tickets)
- Validation and error handling
- Success feedback

### 4. Terms Acceptance Dialog

- Show marketplace-specific terms (or link to existing terms page)
- Checkbox to accept terms
- Required before listing

### 5. Routing (`frontend/webapp/src/App.tsx`)

- Add route: `/marketplace` → `MarketplacePage`
- Add route: `/marketplace/list` → List ticket page (if separate page)

### 6. Navigation (`frontend/webapp/src/components/Header.tsx`)

- Add "Marketplace" link to main navigation
- Mobile-responsive menu item

### 7. API Service (`frontend/webapp/src/lib/api/services/marketplace.ts`)

- `getMarketplaceListings()` - Fetch all listings
- `listTicket(ticketId, termsAccepted)` - Add ticket to marketplace
- `removeListing(listingId)` - Remove listing
- `getMyListings()` - Get user's listings

### 8. Error Handling

- Popup when trying to list non-transferable ticket
- Clear error messages
- Toast notifications for success/error

## Design Requirements

- Use existing design system (HSL colors, Tailwind classes)
- Responsive grid layout (1 col mobile, 2-3 cols desktop)
- Consistent with EventCard styling
- Accessible (ARIA labels, keyboard navigation)
- Mobile-optimized touch targets

## Files to Create/Modify

### Backend

- `backend/tickets/models.py` - Add TicketMarketplaceListing model
- `backend/tickets/migrations/0008_ticketmarketplacelisting.py` - Migration
- `backend/apps/webapp/views.py` - Add marketplace endpoints
- `backend/apps/webapp/serializers.py` - Add marketplace serializer
- `backend/apps/webapp/urls.py` - Add marketplace routes

### Frontend

- `frontend/webapp/src/pages/MarketplacePage.tsx` - Main marketplace page
- `frontend/webapp/src/components/MarketplaceTicketCard.tsx` - Ticket card component
- `frontend/webapp/src/components/ListTicketModal.tsx` - List ticket modal
- `frontend/webapp/src/lib/api/services/marketplace.ts` - API service
- `frontend/webapp/src/lib/api/types.ts` - Add marketplace types
- `frontend/webapp/src/App.tsx` - Add routes
- `frontend/webapp/src/components/Header.tsx` - Add navigation link
- `frontend/webapp/src/locales/EN.json` - Add translations

## Implementation Steps

1. Create backend model and migration
2. Create API endpoints and serializers
3. Create frontend API service and types
4. Create marketplace page and components
5. Add routing and navigation
6. Add translations
7. Test responsive design and error handling