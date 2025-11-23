# Missing Backend Implementations

## Summary
Based on the plan verification, here are all missing endpoints and features:

---

## 🔴 ORGANIZER PORTAL - Missing Endpoints (3 endpoints)

### Authentication
- ⚠️ `POST /api/organizer/forgot-password/` - Request password reset OTP
- ⚠️ `POST /api/organizer/reset-password/` - Reset password with OTP

### Payouts
- ⚠️ `GET /api/organizer/payouts/:id/invoice/` - Download invoice PDF

**Status:** ~85% Complete (11/14 endpoints implemented)

---

## 🔴 MERCHANT PORTAL - Missing Endpoints (2 endpoints)

### Card Management
- ⚠️ `GET /api/merchant/verify-customer/:mobile/` - Verify customer separately (check registration & fees)
- ⚠️ `POST /api/merchant/send-customer-otp/` - Send OTP to customer separately

**Note:** Currently these are combined in `assign-card` endpoint, but scope requires separate endpoints.

**Status:** ~90% Complete (12/14 endpoints implemented)

---

## 🔴 WEBAPP PORTAL - Missing Endpoints (22 endpoints)

### Authentication & Profile
- ⚠️ `POST /api/v1/users/forgot-password/` - Request password reset OTP
- ⚠️ `POST /api/v1/users/reset-password/` - Reset password with OTP
- ⚠️ `PUT /api/v1/users/profile/` - Update user profile

### Public Events
- ⚠️ `GET /api/v1/public/events/featured/` - Get featured events
- ⚠️ `GET /api/v1/public/events/categories/` - Get event categories list
- ⚠️ `GET /api/v1/public/organizers/:id/` - Get public organizer profile
- ⚠️ `GET /api/v1/public/venues/` - Get public venues list

### Tickets
- ⚠️ `GET /api/v1/users/tickets/:id/` - Get ticket details
- ⚠️ `POST /api/v1/tickets/:id/transfer/` - Transfer ticket to another user
- ⚠️ `POST /api/v1/tickets/:id/gift/` - Gift ticket to another user
- ⚠️ `GET /api/v1/tickets/:id/qr-code/` - Generate QR code for ticket

### Payments
- ⚠️ `POST /api/v1/payments/process/` - Process payment for booking
- ⚠️ `POST /api/v1/payments/confirm/` - Confirm payment transaction
- ⚠️ `GET /api/v1/payments/:id/status/` - Get payment status
- ⚠️ `GET /api/v1/invoices/:id/` - Generate/download invoice PDF

### NFC Cards
- ⚠️ `POST /api/v1/users/nfc-cards/request/` - Request new NFC card
- ⚠️ `POST /api/v1/users/nfc-cards/:id/reload/` - Top-up card balance
- ⚠️ `GET /api/v1/users/nfc-cards/:id/transactions/` - Get card transaction history
- ⚠️ `POST /api/v1/users/nfc-cards/:id/auto-reload/` - Setup auto-reload
- ⚠️ `PUT /api/v1/users/nfc-cards/:id/auto-reload/` - Update auto-reload settings

### Dependents
- ⚠️ `PUT /api/v1/users/dependents/:id/` - Update dependent
- ⚠️ `DELETE /api/v1/users/dependents/:id/` - Delete dependent

### Analytics & Check-in
- ⚠️ `GET /api/v1/users/analytics/` - Get user analytics (booking history, attendance)
- ⚠️ `POST /api/v1/checkin/verify/` - Verify ticket/QR code for check-in
- ⚠️ `POST /api/v1/checkin/nfc/` - NFC card check-in

**Status:** ~50% Complete (12/34 endpoints implemented)

---

## 🔴 CRITICAL MISSING FEATURES

### 1. Custom JWT Authentication Middleware
**Issue:** Organizer and Merchant portals need custom authentication that extracts organizer/merchant from JWT tokens and sets `request.organizer` or `request.merchant`.

**Current Status:** 
- ✅ `OrganizerJWTAuthentication` class created but not integrated
- ❌ Not configured in REST_FRAMEWORK settings
- ❌ Not extracting organizer/merchant from tokens properly

**Required:**
- Configure custom authentication in settings for organizer/merchant routes
- Middleware to extract organizer_id/merchant_id from JWT and set on request
- Update views to use `request.organizer` and `request.merchant` properly

### 2. Invoice PDF Generation
**Missing:** PDF invoice generation for:
- Organizer payouts (`/api/organizer/payouts/:id/invoice/`)
- User payments (`/api/v1/invoices/:id/`)

**Required:**
- Install PDF library (reportlab or weasyprint)
- Create invoice templates
- Generate PDF from payout/payment data

### 3. QR Code Generation
**Missing:** QR code generation for tickets (`/api/v1/tickets/:id/qr-code/`)

**Required:**
- Install QR code library (qrcode or similar)
- Generate QR code with ticket data
- Return QR code image or data URL

### 4. File Upload Handling
**Missing:** Profile image upload for organizers

**Required:**
- Configure MEDIA_ROOT and MEDIA_URL in settings
- Handle file uploads in serializer/view
- Validate file types and sizes

### 5. Rate Limiting on OTP Endpoints
**Missing:** Rate limiting on OTP sending endpoints

**Required:**
- Apply `@rate_limit` decorator to OTP endpoints
- Prevent OTP spam/abuse

---

## 📊 IMPLEMENTATION STATISTICS

| Portal | Implemented | Missing | Completion |
|--------|------------|---------|------------|
| **Organizer** | 11 | 3 | 79% |
| **Merchant** | 12 | 2 | 86% |
| **WebApp** | 12 | 22 | 35% |
| **Core Features** | 5 | 5 | 50% |
| **TOTAL** | 40 | 32 | 56% |

---

## 🎯 PRIORITY ORDER FOR IMPLEMENTATION

### High Priority (Critical for MVP)
1. ✅ Custom JWT Authentication Middleware - **CRITICAL** (blocks organizer/merchant auth)
2. ✅ WebApp missing endpoints (22 endpoints) - **HIGH** (core user functionality)
3. ✅ Forgot/Reset password for all portals (5 endpoints) - **HIGH** (security requirement)

### Medium Priority (Important Features)
4. ✅ Invoice PDF generation (2 endpoints) - **MEDIUM** (organizer/merchant need invoices)
5. ✅ QR Code generation (1 endpoint) - **MEDIUM** (ticket validation)
6. ✅ Merchant separate verify-customer endpoints (2 endpoints) - **MEDIUM** (scope requirement)

### Low Priority (Nice to Have)
7. ✅ File upload handling - **LOW** (profile images)
8. ✅ Rate limiting on OTP - **LOW** (security enhancement)
9. ✅ Comprehensive logging - **LOW** (monitoring)

---

## 📝 NOTES

- All models are implemented ✅
- All migrations are created ✅
- Core infrastructure is complete ✅
- Most missing items are endpoints, not core functionality
- Custom authentication is the biggest blocker for organizer/merchant portals

---

## ✅ QUICK WINS (Easy to Implement)

These can be added quickly:
1. Forgot/Reset password endpoints (similar pattern to existing auth)
2. Public endpoints (featured events, categories, organizers, venues) - mostly queries
3. Ticket detail, transfer, gift endpoints - straightforward CRUD
4. NFC card reload and transactions - simple operations
5. User analytics - aggregation queries

---

## 🔧 COMPLEX ITEMS (Require More Work)

1. **Custom JWT Authentication** - Needs middleware integration
2. **PDF Invoice Generation** - Requires PDF library and templates
3. **QR Code Generation** - Requires QR code library
4. **File Upload** - Requires media configuration and validation

