# Mock Credentials & Test Data

This document contains all the mock credentials and test data used in the Ticket Runners Merchant Dashboard application for development and testing purposes.

## 🔐 Authentication Credentials

### Merchant Login

- **Mobile Number**: `01104484492`
- **Password**: `password`
- **OTP Code**: `123456`

### Test Scenarios

- **Valid Login**: Use the credentials above
- **Invalid Login**: Any other mobile/password combination will fail
- **Invalid OTP**: Any OTP other than `123456` will fail

## 👤 Merchant Information

### Primary Merchant (Tech Solutions Store)

- **ID**: `1`
- **Name**: `Tech Solutions Store`
- **Address**: `123 Main Street, Downtown, City`
- **Google Maps Location**: `https://maps.google.com/?q=123+Main+Street`
- **Mobile Number**: `01104484492`
- **Contact Name**: `Ahmed Al Mansouri`
- **Status**: `active`
- **Created**: `2024-01-15T10:30:00Z`

## 📱 Customer Data

### Active Customers (Fees Paid)

| ID  | Name             | Mobile Number | Email                     | Status |
| --- | ---------------- | ------------- | ------------------------- | ------ |
| 101 | Fatima Al Zahra  | +971507654321 | fatima.alzahra@email.com  | active |
| 102 | Omar Al Rashid   | +971509876543 | omar.alrashid@email.com   | active |
| 103 | Aisha Al Qasimi  | +971501112223 | aisha.alqasimi@email.com  | active |
| 104 | Khalid Al Falasi | +971504445556 | khalid.alfalasi@email.com | active |

### Customer with Unpaid Fees

| ID  | Name              | Mobile Number | Email                      | Status | Fees Paid |
| --- | ----------------- | ------------- | -------------------------- | ------ | --------- |
| 105 | Mariam Al Suwaidi | +971507778889 | mariam.alsuwaidi@email.com | active | ❌ false  |

## 🎫 NFC Cards Inventory

### Available Cards

| ID  | Serial Number  | Status    | Customer | Assigned | Delivered |
| --- | -------------- | --------- | -------- | -------- | --------- |
| 1   | TR001234567890 | available | -        | -        | -         |
| 4   | TR001234567893 | available | -        | -        | -         |

### Assigned Cards (Not Delivered)

| ID  | Serial Number  | Status   | Customer         | Mobile        | Assigned Date        |
| --- | -------------- | -------- | ---------------- | ------------- | -------------------- |
| 2   | TR001234567891 | assigned | Fatima Al Zahra  | +971507654321 | 2024-01-12T14:30:00Z |
| 6   | TR001234567895 | assigned | Khalid Al Falasi | +971504445556 | 2024-01-14T10:20:00Z |

### Delivered Cards

| ID  | Serial Number  | Status    | Customer        | Mobile        | Assigned Date        | Delivered Date       |
| --- | -------------- | --------- | --------------- | ------------- | -------------------- | -------------------- |
| 3   | TR001234567892 | delivered | Omar Al Rashid  | +971509876543 | 2024-01-08T11:15:00Z | 2024-01-08T11:20:00Z |
| 5   | TR001234567894 | delivered | Aisha Al Qasimi | +971501112223 | 2024-01-06T16:45:00Z | 2024-01-06T16:50:00Z |

## 📊 Dashboard Statistics

### Card Summary

- **Total Available Cards**: 2
- **Total Assigned Cards**: 2
- **Total Delivered Cards**: 2
- **Total Cards**: 6

### Recent Activity

1. **Card assigned** - TR001234567891 to Fatima Al Zahra (2024-01-12T14:30:00Z)
2. **Card delivered** - TR001234567892 to Omar Al Rashid (2024-01-08T11:20:00Z)
3. **Card assigned** - TR001234567895 to Khalid Al Falasi (2024-01-14T10:20:00Z)

## 🔧 Settings & Configuration

### Password Change

- **Current Password**: `password`
- **New Password Requirements**: Minimum 8 characters
- **Validation**: New password must match confirm password

### Mobile Number Change

- **Current Mobile**: `+971501234567`
- **OTP for Mobile Change**: `123456`
- **Mobile Format**: Must match UAE format `+971XXXXXXXXX`

## 🧪 Testing Scenarios

### Card Assignment Testing

1. **Valid Assignment**: Use any available card serial + valid customer mobile
2. **Invalid Card**: Use non-existent serial number
3. **Already Delivered Card**: Try to assign TR001234567892 or TR001234567894
4. **Customer Not Found**: Use mobile number not in customer list
5. **Unpaid Fees**: Try to assign card to Mariam Al Suwaidi (+971507778889)

### Customer Verification Testing

1. **Valid Customer**: Use any of the first 4 customers (fees paid)
2. **Customer Not Found**: Use any mobile number not in the list
3. **Unpaid Fees**: Use +971507778889 (Mariam Al Suwaidi)

### OTP Testing

1. **Valid OTP**: `123456`
2. **Invalid OTP**: Any other 6-digit code
3. **Customer OTP**: Same as merchant OTP (`123456`)

## 🚀 API Endpoints (Mock)

### Authentication

- `POST /merchant/login` - Login with mobile/password
- `POST /merchant/verify-otp` - Verify OTP after login
- `POST /merchant/logout` - Logout

### Card Management

- `POST /merchant/assign-card` - Assign card to customer
- `POST /merchant/verify-customer-mobile` - Verify customer mobile
- `POST /merchant/send-customer-otp` - Send OTP to customer
- `GET /merchant/cards` - Get all cards
- `GET /merchant/dashboard-stats` - Get dashboard statistics

### Settings

- `POST /merchant/change-password` - Change merchant password
- `POST /merchant/change-mobile` - Change merchant mobile
- `POST /merchant/send-mobile-change-otp` - Send OTP for mobile change

## 📝 Notes

- All timestamps are in ISO 8601 format
- Mobile numbers follow UAE format (+971XXXXXXXXX)
- Card serial numbers follow pattern: TR + 12 digits
- Mock API responses include simulated network delays
- Authentication state is maintained in memory during session
- All data is reset when the application is restarted

## 🔒 Security Note

⚠️ **Important**: These are mock credentials for development and testing only. Do not use these credentials in production environments. The mock data is stored in memory and will be reset when the application restarts.






TEST-CARD-1F556673