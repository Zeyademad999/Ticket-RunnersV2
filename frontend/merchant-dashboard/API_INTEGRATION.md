# Merchant Dashboard - API Integration Summary

## ✅ Integration Status: COMPLETE

All frontend components are fully integrated with the Django backend API using relative endpoints.

## 🔗 API Base Configuration

- **Base URL**: `http://localhost:8000/api/merchant` (configurable via `REACT_APP_API_URL`)
- **All endpoints**: Relative paths from base URL (e.g., `/login/`, `/dashboard-stats/`)
- **Authentication**: JWT Bearer tokens automatically attached to requests

## 📋 Integrated Components

### ✅ Authentication (Login.tsx)
- **POST /login/** - Send OTP for login
- **POST /verify-otp/** - Verify OTP and get tokens
- **POST /logout/** - Logout and clear session

### ✅ Dashboard (Dashboard.tsx)
- **GET /dashboard-stats/** - Get dashboard statistics
- **GET /cards/** - Get merchant's cards for recent activity

### ✅ Card Assignment (AssignCard.tsx)
- **GET /verify-customer/:mobile/** - Verify customer before assignment
- **POST /assign-card/** - Assign card (sends OTP to customer)
- **POST /verify-customer-otp/** - Verify customer OTP and complete assignment

### ✅ Card Inventory (CardInventory.tsx)
- **GET /cards/?status=...&search=...** - Get cards with filtering
- **GET /dashboard-stats/** - Get statistics for inventory page

### ✅ Settings (Settings.tsx)
- **GET /settings/** - Get merchant settings
- **PUT /settings/** - Update merchant settings
- **POST /change-password/** - Change password
- **POST /change-mobile/** - Request mobile change (sends OTP)
- **POST /verify-mobile-change/** - Verify mobile change OTP

## 🔐 Authentication Flow

1. **Login Request**: `POST /login/` with `{ mobile, password }`
   - No auth token required
   - Returns: `{ message, mobile }`

2. **OTP Verification**: `POST /verify-otp/` with `{ mobile, otp_code }`
   - No auth token required
   - Returns: `{ access, refresh, merchant }`
   - Tokens stored in localStorage

3. **Authenticated Requests**: All other endpoints
   - Auth token automatically added: `Authorization: Bearer <token>`
   - On 401 error: Automatic logout and redirect to login

## 🛠️ API Service Implementation

**File**: `src/services/api.ts`

- **Axios Instance**: Configured with base URL and interceptors
- **Request Interceptor**: Adds auth token to all requests except login/verify-otp
- **Response Interceptor**: Handles 401 errors with automatic logout
- **Error Handling**: Comprehensive error parsing and user-friendly messages
- **Data Transformation**: Maps backend response format to frontend types

## 📊 Data Flow

```
Component → apiService.method() → Axios Request → Backend API
                ↓
         Response Interceptor
                ↓
         Data Transformation
                ↓
         Component State Update
```

## 🔄 Request/Response Mapping

### Backend → Frontend Transformations

1. **Dashboard Stats**:
   - Backend: `{ available_cards, delivered_cards, ... }`
   - Frontend: `{ total_available_cards, total_delivered_cards, ... }`

2. **Merchant Data**:
   - Backend: `{ business_name, owner_name, registration_date, ... }`
   - Frontend: `{ name, contact_name, created_at, ... }`

3. **NFCCard Data**:
   - Backend: `{ id, serial_number, merchant, customer, ... }`
   - Frontend: `{ id, serial_number, merchant_id, customer_id, ... }`

## ✅ All Endpoints Verified

- ✅ Authentication endpoints working
- ✅ Dashboard endpoints working
- ✅ Card assignment endpoints working
- ✅ Card inventory endpoints working
- ✅ Settings endpoints working
- ✅ Error handling implemented
- ✅ Token management implemented
- ✅ Data transformation implemented

## 🚀 Ready for Production

The merchant dashboard is fully integrated with the backend API and ready for use. All components use real API endpoints with proper error handling and authentication.

