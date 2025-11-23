<!-- dd58180e-6649-432e-bd39-b89acb56b58c 5b86a240-2880-4ebd-8e6e-17408ba41033 -->
# Ticket Purchase Notification and Registration Flow Implementation

## Overview

When a ticket is purchased for another person (via phone number), the system will:

- **Option 1 (Existing User)**: Send SMS and email notifications immediately with link to My Tickets
- **Option 2 (New User)**: Send SMS with registration link (token-based), email after payment confirmation

## Backend Implementation

### 1. Create Registration Token Model

**File**: `backend/tickets/models.py`

- Add `TicketRegistrationToken` model:
- `token` (CharField, unique, indexed)
- `ticket` (ForeignKey to Ticket)
- `phone_number` (CharField)
- `created_at` (DateTimeField)
- `expires_at` (DateTimeField, default 7 days)
- `used` (BooleanField, default=False)
- Add method to generate unique token

### 2. Create Notification Service

**File**: `backend/core/notification_service.py` (new file)

- `send_ticket_assignment_sms(ticket, purchaser_name)`: Use existing `send_sms_otp` infrastructure
- Message: "Someone purchased a ticket for you! Event: {event_name}. Claim it: {link}"
- For existing users: Link to `/my-tickets`
- For new users: Link to `/signup?token={token}`
- `send_ticket_assignment_email(ticket, purchaser_name)`: Use Django email backend
- Subject: "Ticket Purchased for You - {event_name}"
- Body: Include event name, ticket details, purchaser name, claim link
- Use EMAIL_HOST_USER, EMAIL_HOST_PASSWORD from settings

### 3. Modify Ticket Creation Logic

**File**: `backend/payments/views.py`

- In `_create_tickets_from_payment()`:
- After creating ticket with `assigned_mobile`:
- Check if Customer exists with that mobile_number
- **If exists**: 
- Send SMS notification immediately
- Send email notification immediately
- **If not exists**:
- Generate registration token via `TicketRegistrationToken`
- Send SMS with registration link: `{FRONTEND_URL}/signup?token={token}`
- Store ticket for email notification after payment confirmation

**File**: `backend/apps/webapp/views.py`

- In `ticket_book()` (synchronous booking):
- Apply same notification logic as payment flow
- Send SMS immediately
- Send email after booking confirmation

### 4. Create Registration Token Validation Endpoint

**File**: `backend/apps/webapp/views.py`

- `@api_view(['GET'])` endpoint: `/api/v1/users/validate-registration-token/`
- Query param: `token`
- Returns: `{valid: bool, phone_number: str, ticket_id: str, event_name: str, purchaser_name: str}`
- Validates token exists, not expired, not used

### 5. Update Ticket Linking on Registration

**File**: `backend/apps/webapp/views.py`

- In `user_complete_registration()`:
- After creating customer, check for `TicketRegistrationToken` with matching phone_number
- Link tickets to new customer (same logic as login)
- Mark token as used
- Send welcome email with ticket info

## Frontend Implementation

### 6. Update SignupForm for Token Support

**File**: `frontend/webapp/src/components/SignupForm.tsx`

- On component mount, check URL params for `token`
- If token exists:
- Call validation endpoint to get phone_number and ticket info
- Pre-fill `mobile_number` field
- Set field to read-only (disabled/locked)
- Show message: "Registering to claim your ticket for {event_name}"
- After successful registration:
- Ticket automatically appears in My Tickets (handled by backend)
- Redirect to `/my-tickets` or stored redirect URL

### 7. Add Token Validation API Method

**File**: `frontend/webapp/src/lib/api/services/auth.ts`

- Add `validateRegistrationToken(token: string)` method
- Calls `/api/v1/users/validate-registration-token/?token={token}`

### 8. Update My Tickets Display (if needed)

**File**: `frontend/webapp/src/components/ProfileBookingsTab.tsx`

- Ensure assigned tickets appear automatically (backend already handles this)
- No explicit "Claim" button needed - tickets appear automatically on login/registration

## Key Files to Modify

**Backend:**

- `backend/tickets/models.py` - Add TicketRegistrationToken model
- `backend/core/notification_service.py` - New notification service
- `backend/payments/views.py` - Add notification logic to ticket creation
- `backend/apps/webapp/views.py` - Add token validation endpoint, update registration
- `backend/ticketrunners/settings.py` - Verify email settings (already configured)

**Frontend:**

- `frontend/webapp/src/components/SignupForm.tsx` - Token handling and phone locking
- `frontend/webapp/src/lib/api/services/auth.ts` - Token validation API call
- `frontend/webapp/src/lib/api/types.ts` - Add token validation response type

## Implementation Notes

1. **SMS**: Use existing `send_sms_otp()` from `otp_service.py` or create wrapper
2. **Email**: Use Django's `send_mail()` with configured SMTP settings
3. **Token Expiry**: 7 days default, configurable
4. **Phone Locking**: Use `disabled` attribute on input field, show visual indicator
5. **Notification Timing**: SMS immediately, email after payment confirmation (webhook)
6. **Auto-Claim**: Tickets automatically link on login/registration via existing logic in `user_verify_login_otp()`

### To-dos

- [ ] Create TicketRegistrationToken model in backend/tickets/models.py with token, ticket FK, phone_number, expires_at, used fields
- [ ] Create notification_service.py with send_ticket_assignment_sms() and send_ticket_assignment_email() functions using existing SMS infrastructure and Django email backend
- [ ] Modify _create_tickets_from_payment() in payments/views.py to check if assigned customer exists, send notifications immediately if exists, or generate token and send SMS if not
- [ ] Add registration token validation endpoint /api/v1/users/validate-registration-token/ in apps/webapp/views.py
- [ ] Update user_complete_registration() to check for and link tickets via TicketRegistrationToken on new user registration
- [ ] Update SignupForm.tsx to check for token URL param, validate token, pre-fill and lock phone number field
- [ ] Add validateRegistrationToken() method to frontend auth service API
- [ ] Apply notification logic to ticket_book() endpoint for synchronous bookings