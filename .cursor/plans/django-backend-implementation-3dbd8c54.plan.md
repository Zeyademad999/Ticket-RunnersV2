<!-- 3dbd8c54-d286-48fa-80ad-6e049ca642a6 cfbf697e-98b2-4e51-aafd-d40398fa6c37 -->
# Portal Integration Plans - Frontend to Backend

## Portal Hierarchy & Linkages Overview

### Backend API Structure

```
Backend (Django) - Single Port
├── /api/v1/              → WebApp Portal (Customer-facing)
├── /api/organizer/       → Organizer Portal
├── /api/merchant/        → Merchant Portal  
├── /api/usher/           → EVS App (Web & Mobile - Usher Apps)
└── /api/                 → Admin Dashboard (Full platform management)
    ├── /api/auth/        → Admin authentication
    ├── /api/events/      → Event CRUD
    ├── /api/tickets/     → Ticket management
    ├── /api/customers/   → Customer management
    ├── /api/nfc-cards/   → NFC card management
    ├── /api/users/       → User management (organizers, merchants, ushers, admins)
    ├── /api/finances/    → Financial operations
    ├── /api/logs/        → System logs
    └── /api/analytics/   → Analytics data
```

### Data Model Relationships

```
AdminUser (Admin Dashboard)
    ↓ manages
Organizer → creates → Event → has → Ticket → purchased by → Customer
Merchant → assigns → NFCCard → belongs to → Customer
Customer (WebApp) → books → Ticket → for → Event
Customer → has → NFCCard → assigned by → Merchant
Organizer → receives → Payout → for → Event
Usher (EVS App) → scans → NFCCard → verifies → Ticket → for → Event
Usher → logs → CheckinLog → tracks → Scan activity
```

---

## Plan 1: WebApp Portal Integration (Port 8080)

### Portal Purpose

User-facing application for customers to browse events, book tickets, manage NFC cards, and view their bookings.

### Backend Endpoints Used

- Base URL: `/api/v1/`
- Authentication: JWT tokens (customer_id in token)
- Total Endpoints: 34 endpoints

### Key Linkages

1. **Customer Model** (`customers.Customer`)

   - Authentication: `mobile_number` + `password`
   - Profile management
   - Links to: Tickets, NFC Cards, Dependents, Favorites

2. **Event Model** (`events.Event`)

   - Public event browsing (read-only)
   - Filtering and search
   - Links to: Organizer, Venue, Ticket Categories

3. **Ticket Model** (`tickets.Ticket`)

   - Booking flow
   - Transfer/gift functionality
   - QR code generation
   - Links to: Customer, Event

4. **NFCCard Model** (`nfc_cards.NFCCard`)

   - Card request and management
   - Balance reload
   - Transaction history
   - Links to: Customer, Merchant

5. **PaymentTransaction Model** (`payments.PaymentTransaction`)

   - Payment processing
   - Invoice generation
   - Links to: Customer, Event, Ticket

### Integration Steps

#### Phase 1: Authentication Setup

1. Configure API base URL: `https://trapi.flokisystems.com/api/v1` (or localhost for dev)
2. Create API service layer (`src/lib/api/`)

   - Axios instance with base URL
   - Request/response interceptors
   - Token storage (localStorage)
   - Token refresh logic

3. Update authentication flow:

   - Replace mock login with `POST /api/v1/users/login/`
   - Replace mock OTP with `POST /api/v1/users/verify-login-otp/`
   - Store JWT tokens (access + refresh)
   - Extract `customer_id` from token

#### Phase 2: Public Events

1. Replace mock events with:

   - `GET /api/v1/public/events/` - Event listing
   - `GET /api/v1/public/events/featured/` - Featured events
   - `GET /api/v1/public/events/categories/` - Categories
   - `GET /api/v1/public/events/:id/` - Event details

2. Update filtering/search to use query parameters
3. Handle pagination if implemented

#### Phase 3: User Profile & Authentication

1. User registration:

   - `POST /api/v1/users/register/` → `POST /api/v1/users/verify-otp/`

2. Profile management:

   - `GET /api/v1/users/me/` - Get profile
   - `PUT /api/v1/users/profile/` - Update profile

3. Password management:

   - `POST /api/v1/users/forgot-password/request-otp/`
   - `POST /api/v1/users/reset-password/`

#### Phase 4: Ticket Booking Flow

1. Ticket booking:

   - `POST /api/v1/tickets/book/` - Create booking
   - `POST /api/v1/payments/process/` - Process payment
   - `POST /api/v1/payments/confirm/` - Confirm payment

2. User tickets:

   - `GET /api/v1/users/tickets/` - List tickets
   - `GET /api/v1/users/tickets/:id/` - Ticket details
   - `GET /api/v1/users/tickets/:id/qr-code/` - QR code

3. Ticket operations:

   - `POST /api/v1/users/tickets/:id/transfer/` - Transfer
   - `POST /api/v1/users/tickets/:id/gift/` - Gift
   - `POST /api/v1/users/tickets/:id/refund-request/` - Refund

#### Phase 5: NFC Card Management

1. Card operations:

   - `POST /api/v1/users/nfc-cards/request/` - Request card
   - `GET /api/v1/users/nfc-cards/` - List cards
   - `POST /api/v1/users/nfc-cards/:id/reload/` - Reload balance
   - `GET /api/v1/users/nfc-cards/:id/transactions/` - History
   - `POST /api/v1/users/nfc-cards/:id/auto-reload-settings/` - Auto-reload

#### Phase 6: Additional Features

1. Dependents:

   - `GET /api/v1/users/dependents/` - List
   - `POST /api/v1/users/dependents/` - Add
   - `PUT /api/v1/users/dependents/:id/` - Update
   - `DELETE /api/v1/users/dependents/:id/` - Delete

2. Favorites:

   - `GET /api/v1/users/favorites/` - List
   - `POST /api/v1/users/favorites/` - Add
   - `DELETE /api/v1/users/favorites/:event_id/` - Remove

3. Analytics:

   - `GET /api/v1/users/analytics/` - User stats
   - `GET /api/v1/users/payment-history/` - Payment history

#### Phase 7: Error Handling & Testing

1. Implement error boundaries
2. Handle API errors (401, 403, 404, 500)
3. Token refresh on 401
4. Loading states for all API calls
5. Test all flows end-to-end

### Files to Modify

- `src/lib/api/` - Create API service layer
- `src/context/AuthContext.tsx` - Update with real API calls
- `src/pages/` - Update all pages to use real APIs
- `src/components/` - Update components to use real data
- `src/services/api.ts` - Replace mock data with API calls

---

## Plan 2: Admin Dashboard Integration (Port 8081)

### Portal Purpose

Full platform administration - manage all entities (events, tickets, customers, organizers, merchants, finances, system logs).

### Backend Endpoints Used

- Base URL: `/api/` (various endpoints)
- Authentication: JWT tokens (AdminUser)
- Total Endpoints: ~50+ endpoints across all modules

### Key Linkages

1. **AdminUser Model** (`authentication.AdminUser`)

   - Admin authentication
   - Role-based access control

2. **All Models** (Full CRUD access)

   - Events, Tickets, Customers, NFC Cards
   - Organizers, Merchants, Ushers, Admin Users
   - Venues, Finances, System Logs

### Integration Steps

#### Phase 1: Authentication Setup

1. Configure API base URL: `http://localhost:8000/api` (or production URL)
2. Create API service layer:

   - `src/lib/api/adminApi.ts` - Admin-specific API calls
   - Axios instance with admin endpoints
   - Token management

3. Update login:

   - `POST /api/auth/login/` - Admin login
   - Store JWT tokens
   - Extract admin user info from token

#### Phase 2: Dashboard Statistics

1. Replace mock stats with:

   - `GET /api/dashboard/stats/` - Main dashboard stats
   - `GET /api/analytics/revenue/` - Revenue analytics
   - `GET /api/analytics/users/` - User growth analytics

#### Phase 3: Event Management

1. CRUD operations:

   - `GET /api/events/` - List events
   - `GET /api/events/:id/` - Event details
   - `POST /api/events/` - Create event
   - `PUT /api/events/:id/` - Update event
   - `DELETE /api/events/:id/` - Delete event

2. Update EventsManagement component

#### Phase 4: Ticket Management

1. Ticket operations:

   - `GET /api/tickets/` - List tickets
   - `GET /api/tickets/:id/` - Ticket details
   - `PUT /api/tickets/:id/` - Update ticket status

2. Update TicketsManagement component

#### Phase 5: Customer Management

1. Customer operations:

   - `GET /api/customers/` - List customers
   - `GET /api/customers/:id/` - Customer details
   - `PUT /api/customers/:id/` - Update customer

2. Update CustomerManagement component

#### Phase 6: NFC Card Management

1. Card operations:

   - `GET /api/nfc-cards/` - List cards
   - `GET /api/nfc-cards/:id/` - Card details
   - `POST /api/nfc-cards/` - Create card
   - `PUT /api/nfc-cards/:id/` - Update card
   - `POST /api/nfc-cards/bulk/` - Bulk operations

2. Update NFCCardManagement component

#### Phase 7: User Management (Organizers, Merchants, Ushers, Admins)

1. Organizer operations:

   - `GET /api/organizers/` - List organizers
   - `POST /api/users/` - Create organizer
   - `PUT /api/users/:id/` - Update organizer
   - `DELETE /api/users/:id/` - Delete organizer

2. Similar for Merchants, Ushers, Admins
3. Update respective management components

#### Phase 8: Financial Management

1. Expenses: `GET /api/expenses/`
2. Payouts: `GET /api/payouts/`
3. Company Finances: `GET /api/finances/company/`
4. Other financial endpoints
5. Update financial components

#### Phase 9: System Administration

1. System Logs: `GET /api/logs/system/`
2. Check-in Logs: `GET /api/logs/checkin/`
3. Update SystemLogs and CheckinLogs components

#### Phase 10: Venue Management

1. Venue operations:

   - `GET /api/venues/` - List venues
   - `POST /api/venues/` - Create venue
   - `PUT /api/venues/:id/` - Update venue
   - `DELETE /api/venues/:id/` - Delete venue

2. Update VenueManagement component

### Files to Modify

- `src/lib/api/adminApi.ts` - Create admin API service
- `src/pages/AdminLogin.tsx` - Real authentication
- `src/pages/AdminDashboard.tsx` - Real dashboard stats
- All `src/components/admin/*.tsx` - Replace mock data with API calls

---

## Plan 3: Organizer Portal Integration (Port 8082)

### Portal Purpose

Event organizers manage their events, view analytics, track payouts, and submit edit requests.

### Backend Endpoints Used

- Base URL: `/api/organizer/`
- Authentication: JWT tokens (organizer_id in token)
- Total Endpoints: 14 endpoints

### Key Linkages

1. **Organizer Model** (`users.Organizer`)

   - Authentication: `contact_mobile` + `password`
   - Profile management
   - Links to: Events, Payouts

2. **Event Model** (`events.Event`)

   - Filtered by organizer (only their events)
   - Read-only view with analytics
   - Links to: Tickets, Payouts

3. **Payout Model** (`finances.Payout`)

   - Organizer's payout history
   - Invoice generation
   - Links to: Event

### Integration Steps

#### Phase 1: Authentication Setup

1. Configure API base URL: `http://localhost:8000/api/organizer/`
2. Create API service:

   - `src/services/api.ts` - Update with organizer endpoints
   - Custom JWT authentication (organizer_id in token)

3. Update authentication:

   - `POST /api/organizer/login/` - Login with mobile + password
   - `POST /api/organizer/verify-otp/` - Verify OTP
   - `POST /api/organizer/forgot-password/` - Forgot password
   - `POST /api/organizer/reset-password/` - Reset password

#### Phase 2: Dashboard Statistics

1. Replace mock stats with:

   - `GET /api/organizer/dashboard/stats/` - Dashboard metrics

2. Update OrganizerDashboard component

#### Phase 3: Events Management

1. Event listing:

   - `GET /api/organizer/events/` - List organizer's events
   - `GET /api/organizer/events/:id/` - Event details with analytics

2. Event edit requests:

   - `POST /api/organizer/events/:id/edit-request/` - Submit edit request

3. Update Events tab and EventDetail page

#### Phase 4: Analytics

1. Event analytics:

   - Use data from `GET /api/organizer/events/:id/` (includes analytics)

2. Update Analytics tab

#### Phase 5: Payouts Management

1. Payout operations:

   - `GET /api/organizer/payouts/` - List payouts
   - `GET /api/organizer/payouts/:id/` - Payout details
   - `GET /api/organizer/payouts/:id/invoice/` - Download invoice

2. Update Payouts tab

#### Phase 6: Profile Management

1. Profile operations:

   - `GET /api/organizer/me/` - Get profile
   - `GET /api/organizer/profile/` - Get profile (alternative)
   - `PUT /api/organizer/profile/` - Update profile
   - `POST /api/organizer/profile/change-password/` - Change password

2. Update Profile tab

### Files to Modify

- `src/services/api.ts` - Replace mock data with real API calls
- `src/context/AuthContext.tsx` - Update authentication flow
- `src/pages/OrganizerLogin.tsx` - Real authentication
- `src/pages/OrganizerDashboard.tsx` - Real data
- `src/pages/OrganizerEventDetail.tsx` - Real event data

---

## Plan 4: Merchant Portal Integration (Port 8083)

### Portal Purpose

Merchants assign NFC cards to customers, manage card inventory, and view dashboard statistics.

### Backend Endpoints Used

- Base URL: `/api/merchant/`
- Authentication: JWT tokens (merchant_id in token)
- Total Endpoints: 14 endpoints

### Key Linkages

1. **Merchant Model** (`users.Merchant`)

   - Authentication: `mobile_number` + `password`
   - Profile/settings management
   - Links to: NFCCards

2. **NFCCard Model** (`nfc_cards.NFCCard`)

   - Card assignment workflow
   - Card inventory management
   - Links to: Customer, Merchant

3. **Customer Model** (`customers.Customer`)

   - Customer verification (check registration & fees)
   - OTP verification for card assignment
   - Links to: NFCCards

### Integration Steps

#### Phase 1: Authentication Setup

1. Configure API base URL: `http://localhost:8000/api/merchant/`
2. Create API service:

   - `src/services/api.ts` - Update with merchant endpoints
   - Custom JWT authentication (merchant_id in token)

3. Update authentication:

   - `POST /api/merchant/login/` - Login with mobile + password
   - `POST /api/merchant/verify-otp/` - Verify OTP
   - `POST /api/merchant/logout/` - Logout

#### Phase 2: Dashboard Statistics

1. Replace mock stats with:

   - `GET /api/merchant/dashboard-stats/` - Dashboard metrics

2. Update Dashboard component

#### Phase 3: Card Assignment Workflow

1. Customer verification:

   - `GET /api/merchant/verify-customer/:mobile/` - Verify customer
   - `POST /api/merchant/send-customer-otp/` - Send OTP to customer

2. Card assignment:

   - `POST /api/merchant/assign-card/` - Assign card (step 1)
   - `POST /api/merchant/verify-customer-otp/` - Verify customer OTP (step 2)

3. Update AssignCard component

#### Phase 4: Card Inventory

1. Card listing:

   - `GET /api/merchant/cards/` - List merchant's assigned cards

2. Update CardInventory component

#### Phase 5: Settings Management

1. Settings operations:

   - `GET /api/merchant/settings/` - Get settings
   - `PUT /api/merchant/settings/` - Update settings
   - `POST /api/merchant/change-password/` - Change password
   - `POST /api/merchant/change-mobile/` - Request mobile change
   - `POST /api/merchant/verify-mobile-change/` - Verify mobile change

2. Update Settings component

### Files to Modify

- `src/services/api.ts` - Replace mock data with real API calls
- `src/context/AuthContext.tsx` - Update authentication flow
- `src/pages/Login.tsx` - Real authentication
- `src/pages/Dashboard.tsx` - Real dashboard stats
- `src/pages/AssignCard.tsx` - Real card assignment flow
- `src/pages/CardInventory.tsx` - Real card data
- `src/pages/Settings.tsx` - Real settings API

---

## Plan 5: EVS App Integration (React-based Web Application)

### Portal Purpose

Web application for ushers to scan NFC cards, verify attendees at events, and log scan activity. Enables real-time event entry verification with offline caching support using Web NFC API.

### Backend Endpoints Used

- Base URL: `/api/usher/`
- Authentication: JWT tokens (usher_id in token)
- Total Endpoints: ~18 endpoints

### Key Linkages

1. **Usher Model** (`users.Usher`)

   - Authentication: `username` + `password` + `event_id`
   - Permission checks (ushering role)
   - Event assignment validation
   - Links to: Events, ScanLogs

2. **Event Model** (`events.Event`)

   - Event assignment validation
   - Event details for scanning context
   - Links to: Tickets, Attendees, Ushers

3. **NFCCard Model** (`nfc_cards.NFCCard`)

   - Card ID lookup and validation
   - Card status verification
   - Links to: Customer, Ticket

4. **Ticket Model** (`tickets.Ticket`)

   - Attendee verification
   - Ticket status (Valid/Invalid)
   - Ticket tier (VIP/Standard)
   - Scan status tracking
   - Links to: Customer, Event

5. **Customer Model** (`customers.Customer`)

   - Attendee information lookup
   - Profile data (name, photo, emergency contact, blood type)
   - Dependents/children information
   - Links to: Tickets, NFCCards

6. **CheckinLog Model** (`logs.CheckinLog`)

   - Scan activity logging
   - Scan history with pagination
   - Search and filtering
   - Links to: Usher, Event, Ticket, Customer

### Integration Steps

#### Phase 1: Authentication & Event Setup

1. Configure API base URL: `http://localhost:8000/api/usher/` (or production URL)
2. Create API service layer:

   - `src/lib/api/usherApi.ts` - Create usher-specific API service
   - Axios instance with usher endpoints
   - Request/response interceptors
   - Token storage (localStorage)
   - Token refresh logic

3. Update authentication flow:

   - `POST /api/usher/login/` - Login with event_id, username, password
   - Validate usher permissions (ushering role)
   - Validate event assignment
   - Store JWT tokens (access + refresh)
   - Extract `usher_id` and `event_id` from token

4. Event validation:

   - `GET /api/usher/events/` - List assigned events
   - `GET /api/usher/events/:id/` - Get event details
   - `POST /api/usher/events/:id/validate-assignment/` - Validate event assignment

5. Update Login page/component to use real event validation

#### Phase 2: NFC Scanning & Verification

1. Card lookup and validation:

   - `POST /api/usher/scan/verify-card/` - Verify NFC card ID
   - `GET /api/usher/scan/card/:card_id/` - Get card details
   - `POST /api/usher/scan/card/:card_id/validate/` - Validate card for event

2. Attendee lookup:

   - `GET /api/usher/scan/attendee/:card_id/` - Get attendee by card ID
   - `GET /api/usher/scan/attendee/:card_id/event/:event_id/` - Get attendee with event context
   - Returns attendee information:
     - Name, photo, card ID
     - Ticket status (Valid/Invalid)
     - Ticket tier (VIP/Standard)
     - Scan status (Previously Scanned/Not Scanned)
     - Emergency contact
     - Blood type
     - Ticket/profile labels
     - Children/dependents (if enabled)

3. Scan result processing:

   - `POST /api/usher/scan/result/` - Process scan result
   - Handle scan statuses:
     - Valid (first scan)
     - Invalid (ticket not valid for event)
     - Already Scanned (previously scanned)
     - Not Found (card/ticket not found)
   - Update ticket scan status
   - Log scan activity

4. Additional scan features:

   - `POST /api/usher/scan/part-time-leave/` - Log part-time leave
   - `GET /api/usher/scan/part-time-leave/` - Get part-time leave history
   - `POST /api/usher/scan/report/` - Report scan issue or incident

5. Update Scan page/component to use real API calls

#### Phase 3: Scan Logging & History

1. Scan log operations:

   - `POST /api/usher/scan/log/` - Log scan activity
   - `GET /api/usher/scan/logs/` - List scan logs (paginated, 10 per page)
   - `GET /api/usher/scan/logs/:id/` - Get scan log details
   - `GET /api/usher/scan/logs/search/` - Search scan logs

2. Search parameters:

   - Card ID
   - Username (usher)
   - Result (Valid, Invalid, Already Scanned, Not Found)
   - Attendee name
   - Event ID

3. Update Logs page/component to use real API calls

#### Phase 4: Offline Sync & Real-time Updates

1. Offline data sync:

   - `GET /api/usher/sync/attendees/` - Get attendees for event (for offline cache)
   - `GET /api/usher/sync/cards/` - Get card data for event
   - `POST /api/usher/sync/logs/` - Sync offline scan logs to server
   - `GET /api/usher/sync/status/` - Get sync status

2. Cache management:

   - Implement 24-hour cache expiration using localStorage/IndexedDB
   - Cache attendee data for assigned events
   - Cache scan logs locally
   - Sync logs when online using Service Worker or background sync

3. Real-time updates:

   - `GET /api/usher/nfc/status/` - Get NFC availability status
   - `GET /api/usher/nfc/test/` - Test NFC connection
   - `GET /api/usher/events/:id/status/` - Get real-time event status
   - Check Web NFC API browser support
   - Handle browser compatibility (Chrome/Edge on Android)

4. Update offline cache service and NFC service/hook to sync with backend

#### Phase 5: Error Handling, Optimization & Production

1. Error handling:

   - Handle network errors (offline mode)
   - Handle API errors (401, 403, 404, 500)
   - Token refresh on 401
   - Retry logic with exponential backoff
   - Input validation (Card ID, Event ID, Username)

2. Performance optimization:

   - Implement request debouncing (1 second)
   - Batch scan log uploads
   - Cache frequently accessed data
   - Reduce unnecessary API calls
   - Show loading indicators during API calls
   - Handle timeout scenarios (30 seconds)
   - Retry failed requests (3 retries)

3. Production readiness:

   - Remove debug/test features ("Clear Cache" button, console logs, mock data)
   - Add error reporting service integration
   - Add analytics integration
   - Security enhancements (secure token storage, encrypt cached data, HTTPS, CSRF protection)
   - Testing (unit tests, integration tests, E2E tests, Web NFC API testing)

### Files to Modify

- `src/lib/api/usherApi.ts` - Create API service layer
- `src/services/nfcService.ts` or `src/hooks/useNFC.ts` - Update with backend validation
- `src/services/offlineCache.ts` - Add sync functionality
- `src/pages/Login.tsx` or `src/pages/UsherLogin.tsx` - Real authentication with event validation
- `src/pages/Scan.tsx` or `src/pages/ScanScreen.tsx` - Real NFC scanning and attendee lookup
- `src/pages/Logs.tsx` or `src/pages/LogsScreen.tsx` - Real scan log API integration
- `src/hooks/useNFC.ts` - Update with backend integration
- `src/context/ScanLogContext.tsx` - Sync with backend

---

## Plan 6: EVS App Mobile Integration (React Native/Expo Mobile App)

### Portal Purpose

Mobile application (React Native/Expo) for ushers to scan NFC cards, verify attendees at events, and log scan activity. Enables real-time event entry verification with offline caching support using react-native-nfc-manager.

### Backend Endpoints Used

- Base URL: `/api/usher/`
- Authentication: JWT tokens (usher_id in token)
- Total Endpoints: ~18 endpoints

### Key Linkages

1. **Usher Model** (`users.Usher`)

   - Authentication: `username` + `password` + `event_id`
   - Permission checks (ushering role)
   - Event assignment validation
   - Links to: Events, ScanLogs

2. **Event Model** (`events.Event`)

   - Event assignment validation
   - Event details for scanning context
   - Links to: Tickets, Attendees, Ushers

3. **NFCCard Model** (`nfc_cards.NFCCard`)

   - Card ID lookup and validation
   - Card status verification
   - Links to: Customer, Ticket

4. **Ticket Model** (`tickets.Ticket`)

   - Attendee verification
   - Ticket status (Valid/Invalid)
   - Ticket tier (VIP/Standard)
   - Scan status tracking
   - Links to: Customer, Event

5. **Customer Model** (`customers.Customer`)

   - Attendee information lookup
   - Profile data (name, photo, emergency contact, blood type)
   - Dependents/children information
   - Links to: Tickets, NFCCards

6. **CheckinLog Model** (`logs.CheckinLog`)

   - Scan activity logging
   - Scan history with pagination
   - Search and filtering
   - Links to: Usher, Event, Ticket, Customer

### Integration Steps

#### Phase 1: Authentication Setup

1. Configure API base URL: `http://localhost:8000/api/usher/` (or production URL)
2. Create API service layer:

   - `src/services/api.ts` - Update with usher endpoints
   - Axios instance with usher endpoints
   - Request/response interceptors
   - Token storage (AsyncStorage for React Native)
   - Token refresh logic

3. Update authentication flow:

   - `POST /api/usher/login/` - Login with event_id, username, password
   - Validate usher permissions (ushering role)
   - Validate event assignment
   - Store JWT tokens (access + refresh) in AsyncStorage
   - Extract `usher_id` and `event_id` from token

4. Update LoginScreen.js to replace mock authentication

#### Phase 2: Event Assignment & Context

1. Event validation:

   - `GET /api/usher/events/` - List assigned events
   - `GET /api/usher/events/:id/` - Get event details
   - `POST /api/usher/events/:id/validate-assignment/` - Validate event assignment

2. Update LoginScreen.js to use real event validation

#### Phase 3: NFC Card Scanning & Verification

1. Card lookup and validation:

   - `POST /api/usher/scan/verify-card/` - Verify NFC card ID
   - `GET /api/usher/scan/card/:card_id/` - Get card details
   - `POST /api/usher/scan/card/:card_id/validate/` - Validate card for event

2. Attendee lookup:

   - `GET /api/usher/scan/attendee/:card_id/` - Get attendee by card ID
   - `GET /api/usher/scan/attendee/:card_id/event/:event_id/` - Get attendee with event context
   - Returns attendee information:
     - Name, photo, card ID
     - Ticket status (Valid/Invalid)
     - Ticket tier (VIP/Standard)
     - Scan status (Previously Scanned/Not Scanned)
     - Emergency contact
     - Blood type
     - Ticket/profile labels
     - Children/dependents (if enabled)

3. Update ScanScreen.js to use real API calls
4. Integrate react-native-nfc-manager with backend validation
5. Update NFCService.js to call backend APIs

#### Phase 4: Scan Logging & History

1. Scan log operations:

   - `POST /api/usher/scan/log/` - Log scan activity
   - `GET /api/usher/scan/logs/` - List scan logs (paginated, 10 per page)
   - `GET /api/usher/scan/logs/:id/` - Get scan log details
   - `GET /api/usher/scan/logs/search/` - Search scan logs

2. Search parameters:

   - Card ID
   - Username (usher)
   - Result (Valid, Invalid, Already Scanned, Not Found)
   - Attendee name
   - Event ID

3. Update LogsScreen.js to use real API calls
4. Implement pagination (10 per page)
5. Implement search functionality

#### Phase 5: Scan Result Processing

1. Scan result handling:

   - `POST /api/usher/scan/result/` - Process scan result
   - Handle scan statuses:
     - Valid (first scan)
     - Invalid (ticket not valid for event)
     - Already Scanned (previously scanned)
     - Not Found (card/ticket not found)
   - Update ticket scan status
   - Log scan activity

2. Part-time leave tracking:

   - `POST /api/usher/scan/part-time-leave/` - Log part-time leave
   - `GET /api/usher/scan/part-time-leave/` - Get part-time leave history

3. User reporting:

   - `POST /api/usher/scan/report/` - Report scan issue or incident

4. Update ScanScreen.js result popup and actions

#### Phase 6: Offline Sync & Caching

1. Offline data sync:

   - `GET /api/usher/sync/attendees/` - Get attendees for event (for offline cache)
   - `GET /api/usher/sync/cards/` - Get card data for event
   - `POST /api/usher/sync/logs/` - Sync offline scan logs to server
   - `GET /api/usher/sync/status/` - Get sync status

2. Cache management:

   - Implement 24-hour cache expiration using AsyncStorage
   - Cache attendee data for assigned events
   - Cache scan logs locally
   - Sync logs when online
   - Implement background sync when app comes online

3. Update OfflineCache.js to sync with backend
4. Remove "Clear Cache" button from production UI

#### Phase 7: Real-time Updates & Status

1. NFC status and availability:

   - `GET /api/usher/nfc/status/` - Get NFC availability status
   - `GET /api/usher/nfc/test/` - Test NFC connection
   - Check device NFC availability using react-native-nfc-manager

2. Event status:

   - `GET /api/usher/events/:id/status/` - Get real-time event status
   - Check if event is active
   - Check if scanning is enabled
   - Poll for status updates (optional)

3. Update NFCService.js to check backend status
4. Update useNFC.js hook with backend integration

#### Phase 8: Error Handling & Validation

1. Implement error handling:

   - Handle network errors (offline mode)
   - Handle API errors (401, 403, 404, 500)
   - Token refresh on 401
   - Retry logic with exponential backoff (3 retries)
   - 30-second timeout handling

2. Input validation:

   - Card ID validation and sanitization
   - Event ID validation
   - Username validation
   - 1-second debounce for NFC scans

3. Update error handling throughout the app
4. Add error reporting service (e.g., Sentry)

#### Phase 9: Performance & Optimization

1. Optimize API calls:

   - Implement request debouncing (1 second)
   - Batch scan log uploads
   - Cache frequently accessed data
   - Reduce unnecessary API calls

2. Loading states:

   - Show loading indicators during API calls
   - Handle timeout scenarios (30 seconds)
   - Retry failed requests (3 retries with exponential backoff)

3. Image optimization:

   - Optimize attendee photo loading
   - Implement image caching

4. Update components with optimized API calls

#### Phase 10: Testing & Production Readiness

1. Remove debug/test features:

   - Remove "Clear Cache" button from production
   - Remove debug console logs
   - Clean up mock data references (mockData.js)

2. Add production features:

   - Error reporting service integration (Sentry)
   - Analytics integration
   - Push notifications (optional)
   - Data export functionality

3. Security enhancements:

   - Secure token storage (encrypted AsyncStorage)
   - Encrypt cached data
   - Implement certificate pinning for API calls
   - Remove hardcoded credentials

4. Testing:

   - Unit tests for API service layer
   - Integration tests for scan flow
   - E2E tests for critical paths
   - NFC device testing (Android/iOS)
   - Test on physical devices

5. Platform-specific:

   - Android: Test NFC permissions and APK builds
   - iOS: Test NFC usage and tablet support
   - Verify EAS build profiles (development, preview, production)

### Files to Modify

- `src/services/api.ts` - Replace mock data with real API calls
- `src/services/NFCService.js` - Update with backend validation
- `src/services/OfflineCache.js` - Add sync functionality
- `src/screens/LoginScreen.js` - Real authentication with event validation
- `src/screens/ScanScreen.js` - Real NFC scanning and attendee lookup
- `src/screens/LogsScreen.js` - Real scan log API integration
- `src/hooks/useNFC.js` - Update with backend integration
- `src/context/ScanLogContext.js` - Sync with backend
- `App.js` - Update navigation and authentication flow
- `data/mockData.js` - Remove or keep only for development/testing

---

## Integration Order Recommendation

### Recommended Sequence

1. **WebApp Portal** (First - Core user functionality)

   - Most complex but establishes patterns
   - Customer-facing, highest priority

2. **Merchant Portal** (Second - Simple workflow)

   - Straightforward card assignment flow
   - Good for testing authentication patterns

3. **Organizer Portal** (Third - Medium complexity)

   - Event management and analytics
   - Builds on patterns from WebApp

4. **EVS App Web** (Fourth - Web-based)

   - NFC scanning and verification (Web NFC API)
   - Offline-first architecture
   - Real-time event entry verification

5. **EVS App Mobile** (Fifth - React Native/Expo)

   - NFC scanning and verification (react-native-nfc-manager)
   - Offline-first architecture with AsyncStorage
   - Real-time event entry verification
   - Android/iOS native support

6. **Admin Dashboard** (Last - Most comprehensive)

   - Full CRUD operations
   - Most endpoints to integrate
   - Can reuse patterns from other portals

### Alternative Sequence (If Admin is Priority)

1. Admin Dashboard
2. WebApp Portal
3. Organizer Portal
4. Merchant Portal
5. EVS App Web
6. EVS App Mobile

---

## Common Integration Patterns

### 1. API Service Layer Structure

```typescript
// src/lib/api/[portal]Api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/[portal]/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
    }
    return Promise.reject(error);
  }
);
```

### 2. Authentication Flow Pattern

1. Login → Get OTP
2. Verify OTP → Get JWT tokens
3. Store tokens in localStorage
4. Include token in all requests
5. Handle token refresh on 401

### 3. Error Handling Pattern

- 401: Unauthorized → Refresh token or redirect to login
- 403: Forbidden → Show permission error
- 404: Not Found → Show not found message
- 500: Server Error → Show generic error message
- Network Error → Show connection error

### 4. Loading States Pattern

- Use React Query's `isLoading` state
- Show skeleton loaders
- Disable buttons during API calls
- Show toast notifications for success/error

---

## Testing Checklist Per Portal

### Authentication

- [ ] Login flow works
- [ ] OTP verification works
- [ ] Token storage works
- [ ] Token refresh works
- [ ] Logout clears tokens
- [ ] Protected routes redirect when not authenticated

### Data Fetching

- [ ] All GET requests return correct data
- [ ] Pagination works (if implemented)
- [ ] Filtering works
- [ ] Search works
- [ ] Loading states show correctly
- [ ] Error states handle correctly

### Data Mutations

- [ ] POST requests create resources
- [ ] PUT requests update resources
- [ ] DELETE requests remove resources
- [ ] Success messages show
- [ ] Error messages show
- [ ] Forms reset after success

### Edge Cases

- [ ] Empty states handled
- [ ] Network errors handled
- [ ] Invalid data handled
- [ ] Token expiration handled
- [ ] Concurrent requests handled

---

## Notes

1. **CORS Configuration**: Ensure backend CORS allows all frontend ports (8080, 8081, 8082, 8083, 8084 for EVS Web App) and mobile app origins

2. **Environment Variables**: Each frontend should have:

   - `VITE_API_BASE_URL` or `REACT_APP_API_BASE_URL` (depending on build tool)
   - EVS Mobile App: `EXPO_PUBLIC_API_BASE_URL` or similar

3. **Token Management**: 

   - WebApp/Organizer/Merchant/EVS Web App: Store in localStorage
   - EVS Mobile App: Store in AsyncStorage (encrypted)
   - Admin: Can use httpOnly cookies for better security

4. **API Response Format**: All endpoints return JSON with consistent error format:
   ```json
   {
     "error": {
       "code": "ERROR_CODE",
       "message": "Error message"
     }
   }
   ```

5. **Pagination**: Check if backend implements pagination, update frontend accordingly

6. **File Uploads**: For profile images (Organizer), use FormData for multipart/form-data

7. **Real-time Updates**: Consider WebSocket integration for real-time notifications (future enhancement)

### To-dos

- [ ] Set up Django project structure with apps, core utilities, and configuration files
- [ ] Create all database models (AdminUser, Event, Ticket, Customer, NFCCard, Venue, Organizer, Usher, Merchant, Expense, Payout, SystemLog, CheckinLog, etc.)
- [ ] Implement JWT authentication with login, logout, refresh, and change password endpoints
- [ ] Create custom permission classes for role-based access control (SuperAdmin, Admin, Usher, Support)
- [ ] Implement Events API endpoints (list, create, update, delete, statistics) with filtering and pagination
- [ ] Implement Tickets API endpoints (list, detail, status update, check-in, transfer) with filtering
- [ ] Implement Customers API endpoints (list, detail, update, status, bookings) with filtering
- [ ] Implement NFC Cards API endpoints (list, create, update, bulk operations, transfer) with filtering
- [ ] Implement Venues API endpoints (list, create, update, delete) with filtering
- [ ] Implement Users APIs for Organizers, Ushers, Admins, and Merchants (list, create, update, delete, verify)
- [ ] Implement Financial APIs (Expenses, Payouts, Company Finances, Profit Share, Settlements, Deposits, Profit Withdrawals)
- [ ] Implement System Logs and Check-in Logs APIs with filtering and export capabilities
- [ ] Implement Analytics APIs (Dashboard stats, Revenue, User growth, Card status, Event categories) with caching
- [ ] Implement security features (rate limiting, CORS, input validation, audit logging, password security)
- [ ] Optimize queries (select_related, prefetch_related), implement caching, add database indexes
- [ ] Write unit tests and integration tests for all endpoints, achieve 80%+ test coverage
- [ ] Generate API documentation using drf-spectacular (OpenAPI/Swagger) and write deployment guide