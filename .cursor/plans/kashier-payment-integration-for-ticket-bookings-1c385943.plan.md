<!-- 1c385943-60a7-468f-8fae-62cce7a41d49 c2a32c42-0adc-4b2a-bb98-cfb6f758f293 -->
# Kashier Payment Integration for Ticket Booking

## Overview

Integrate Kashier payment gateway into the existing ticket booking flow. The payment will be processed through Kashier before tickets are created, ensuring payment confirmation before booking completion.

## Backend Implementation

### 1. Create Kashier Utility Module (`backend/payments/kashier_utils.py`)

- Implement `generate_kashier_order_hash()` function matching the working example
- Implement `validate_kashier_signature()` function matching the working example
- Use environment variables for configuration (KASHIER_MERCHANT_ID, KASHIER_SECRET_KEY, etc.)

### 2. Add Environment Variables (`backend/.env.example`)

- Add Kashier configuration variables:
- KASHIER_MERCHANT_ID=MID-32713-532
- KASHIER_SECRET_KEY=c84da968-1f03-43f7-832a-a14f89ac9bd6
- KASHIER_MODE=test
- KASHIER_BASE_URL=https://test-fep.kashier.io
- KASHIER_MERCHANT_REDIRECT=http://localhost:8083/api/payment/redirect
- KASHIER_WEBHOOK_URL=http://localhost:8083/api/payment/webhook

### 3. Create Payment Initialization Endpoint (`backend/payments/views.py`)

- Add `initialize_payment()` view function
- Generate unique order ID
- Calculate total amount (tickets + VAT + card fees)
- Generate Kashier hash using utility function
- Create pending PaymentTransaction record
- Return payment configuration (orderId, hash, amount, merchantId, hppUrl, etc.)

### 4. Create Payment Callback Endpoint (`backend/payments/views.py`)

- Add `handle_payment_redirect()` view function (GET)
- Validate Kashier signature
- Update PaymentTransaction status based on payment result
- If successful: create tickets and complete booking
- Redirect to frontend success/failure page

### 5. Create Payment Webhook Endpoint (`backend/payments/views.py`)

- Add `handle_payment_webhook()` view function (POST)
- Validate Kashier signature
- Update PaymentTransaction status
- If successful: create tickets and complete booking
- Return success response

### 6. Modify Ticket Booking Flow (`backend/apps/webapp/views.py`)

- Update `ticket_book()` function to:
- Only create tickets after payment is confirmed
- Link tickets to the confirmed PaymentTransaction
- Handle payment status properly

### 7. Update Payment URLs (`backend/payments/urls.py`)

- Add routes:
- POST `/api/payment/initialize/` - Initialize payment
- GET `/api/payment/redirect/` - Handle payment redirect callback
- POST `/api/payment/webhook/` - Handle payment webhook

## Frontend Implementation

### 8. Create Kashier Payment Modal Component (`frontend/webapp/src/components/KashierPaymentModal.tsx`)

- Create modal component similar to provided example
- Load Kashier checkout script dynamically
- Handle payment success/failure messages
- Show loading states and error handling
- Integrate with existing UI components

### 9. Create Payment API Service (`frontend/webapp/src/lib/api/services/payments.ts`)

- Add `initializePayment()` method to call backend initialization endpoint
- Update existing payment methods if needed

### 10. Update Booking Page (`frontend/webapp/src/pages/Booking.tsx`)

- Modify `proceedWithPayment()` function:
- Call payment initialization endpoint first
- Show Kashier payment modal instead of direct booking
- Wait for payment success callback
- Only proceed with ticket creation after payment success
- Show success/error messages based on payment result

### 11. Update Payment Service (`frontend/webapp/src/lib/api/services/payments.ts`)

- Ensure it has methods for:
- Initializing payment
- Handling payment callbacks
- Confirming payment status

## Key Implementation Details

- Payment flow: User selects tickets → Click "Complete Payment" → Initialize Kashier payment → Show payment modal → User pays → Kashier callback → Create tickets → Show success message
- Hash generation: Use exact format from working example: `/?payment={mid}.{orderId}.{amount}.{currency}`
- Signature validation: Use exact query string format from working example
- Amount formatting: Ensure amount is formatted as string with exactly 2 decimal places (e.g., "299.00")
- Error handling: Show appropriate error messages for payment failures
- Security: Always validate signatures from Kashier before processing payments

### To-dos

- [ ] Create backend/payments/kashier_utils.py with hash generation and signature validation functions matching the working example
- [ ] Add Kashier environment variables to backend/.env.example
- [ ] Create payment initialization endpoint in backend/payments/views.py that generates hash and returns payment config
- [ ] Create payment redirect callback endpoint (GET) in backend/payments/views.py that validates signature and creates tickets
- [ ] Create payment webhook endpoint (POST) in backend/payments/views.py that validates signature and creates tickets
- [ ] Add payment routes to backend/payments/urls.py for initialize, redirect, and webhook endpoints
- [ ] Modify backend/apps/webapp/views.py ticket_book() to only create tickets after payment confirmation
- [ ] Create frontend/webapp/src/components/KashierPaymentModal.tsx component with Kashier iframe integration
- [ ] Add initializePayment() method to frontend/webapp/src/lib/api/services/payments.ts
- [ ] Update frontend/webapp/src/pages/Booking.tsx to integrate Kashier payment modal before ticket creation