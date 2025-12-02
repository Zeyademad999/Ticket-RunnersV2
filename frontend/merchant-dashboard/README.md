# Ticket Runners Merchant Dashboard

A comprehensive merchant management system for Ticket Runners NFC card distribution platform.

## 🎯 Implemented Requirements

### ✅ 2. Merchant Account Management

- **Admin Dashboard Integration**: Merchant accounts are created, managed, and edited only through the admin dashboard
- **Merchant Profile Fields**:
  - Merchant name
  - Address
  - Google Maps location
  - Mobile number
  - Password
  - Contact name
  - Status (active/inactive)

### ✅ 3. Merchant Authentication

- **Dual-Factor Authentication**: Merchants login using mobile number and password with OTP verification
- **OTP Popup Interface**: Modern popup modal with individual OTP input boxes for enhanced user experience
- **Secure Login Flow**:
  1. Enter mobile number and password
  2. Receive OTP on registered mobile
  3. Enter OTP in popup modal with 6-digit input boxes
  4. Complete authentication with automatic focus management

### ✅ 4. Merchant Permissions

- **Restricted Access**: Merchants cannot view users
- **Single Action**: Merchants only have one action - "Assign New Card"
- **Focused Interface**: Clean, purpose-built interface for card assignment

### ✅ 5. Card Assignment Process

- **Input Validation**: Merchants input card serial and customer mobile number
- **Customer Verification**: System confirms mobile number is registered
- **Fees Validation**: Checks that required fees are paid
- **OTP Verification**: Prompts merchant to input OTP sent to customer's mobile
- **Card Writing**: Merchant scans card to write data from backend
- **Card Rewriting**: If card was already assigned, it gets rewritten with new data

### ✅ 6. NFC Card Location Tracking

- **Merchant Assignment**: Cards show which merchant they are currently with
- **Location Management**: Admin can assign cards to specific merchants
- **Status Tracking**: Real-time status updates for card locations

### ✅ 7. Card Inventory Management

- **Comprehensive View**: Merchants can view all NFC cards they have available
- **Status Tracking**: Track available, assigned, and delivered cards
- **Stat Cards**: Two key metrics displayed:
  - **Total Available Cards**: Cards ready for assignment
  - **Total Delivered Cards**: Cards successfully delivered to customers

### ✅ 8. Merchant Dashboard Structure

- **Three Pages Only**:
  1. **Card Assignment Page**: Primary function for assigning cards
  2. **Card Inventory Page**: View and manage card inventory
  3. **User Settings Page**: Manage account settings

### ✅ 9. Merchant Settings

- **Password Management**: Merchants can update their password
- **Mobile Number Change**: Merchants can update mobile number with OTP verification
- **Security**: All changes require proper authentication

### ✅ 10. Card Writing Integration

- **Hashed Code Display**: System displays the hashed code for card writing
- **Two Action Buttons**:
  - **WRITE NOW**: Integrates with local card writing software
  - **COPY TO CLIPBOARD**: Copies hashed code for external software use
- **Flexible Integration**: Supports both integrated and external card writing solutions

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd TicketRunners-Merchant

# Install dependencies
npm install

# Start development server
npm start
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# Backend API Base URL
# Default: http://localhost:8000/api/merchant
REACT_APP_API_URL=http://localhost:8000/api/merchant

# For production, use:
# REACT_APP_API_URL=https://your-domain.com/api/merchant
```

**Note**: The application uses real API endpoints by default. All API calls are made to the backend Django server.

## 🧪 Testing

### Mock Data Testing

The system includes comprehensive mock data for testing all functionality:

```bash
# Run the test function in browser console
npm start
# Open browser console and run:
testMockData()
```

### Test Credentials

- **Merchant Mobile**: `+971501234567`
- **Merchant Password**: `password123`
- **OTP Code**: `123456`

### Test Customers

- **Active with Fees Paid**: `+971507654321` (Fatima Al Zahra)
- **Active with Fees Paid**: `+971509876543` (Omar Al Rashid)
- **Active with Unpaid Fees**: `+971507778889` (Mariam Al Suwaidi) - Will be rejected
- **Inactive Customer**: `+971509999999` (Layla Al Nahyan) - Will be rejected

## 📱 Features

### Authentication Flow

1. **Login**: Enter mobile number and password
2. **OTP Popup**: Modern modal appears with 6 individual OTP input boxes
3. **OTP Entry**: Auto-focus management with paste support and keyboard navigation
4. **Verification**: Enter 6-digit OTP sent to mobile with real-time validation
5. **Dashboard Access**: Access merchant dashboard upon successful verification

### Card Assignment Workflow

1. **Input Details**: Enter card serial and customer mobile number
2. **Customer Verification**: System validates customer registration and fees
3. **OTP Request**: OTP sent to customer's mobile number
4. **OTP Verification**: Merchant enters customer's OTP
5. **Card Assignment**: System generates hashed code for card writing
6. **Card Writing**: Merchant writes hashed code to NFC card

### Inventory Management

- **Real-time Stats**: View available and delivered card counts
- **Search & Filter**: Find cards by serial number or customer mobile
- **Status Tracking**: Monitor card status changes
- **Activity Log**: Track recent card assignments and deliveries

### Settings Management

- **Password Change**: Update password with current password verification
- **Mobile Change**: Update mobile number with OTP verification
- **Account Info**: View merchant account details

## 🔧 Technical Implementation

### Architecture

- **Frontend**: React with TypeScript
- **State Management**: React Context API
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Notifications**: React Hot Toast
- **Icons**: Lucide React

### API Integration

- **Real API Integration**: All endpoints connected to Django backend
- **Base URL**: Configurable via `REACT_APP_API_URL` environment variable
- **Authentication**: JWT token-based authentication with automatic token injection
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Request Interceptors**: Automatic token attachment for authenticated requests
- **Response Interceptors**: Automatic logout on 401 errors

### Security Features

- **JWT Authentication**: Token-based authentication
- **OTP Verification**: Two-factor authentication for sensitive operations
- **Input Validation**: Client and server-side validation
- **Secure Storage**: Local storage for session management

## 📊 Data Models

### Merchant

```typescript
interface Merchant {
  id: string;
  name: string;
  address: string;
  gmaps_location: string;
  mobile_number: string;
  contact_name: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}
```

### NFCCard

```typescript
interface NFCCard {
  id: string;
  serial_number: string;
  status: "available" | "assigned" | "delivered";
  merchant_id?: string;
  merchant_name?: string;
  customer_id?: string;
  customer_name?: string;
  customer_mobile?: string;
  assigned_at?: string;
  delivered_at?: string;
  hashed_code?: string;
  created_at: string;
  updated_at: string;
}
```

### Customer

```typescript
interface Customer {
  id: string;
  mobile_number: string;
  name: string;
  email?: string;
  status: "active" | "inactive";
  fees_paid: boolean;
  created_at: string;
  updated_at?: string;
}
```

## 🎨 UI/UX Features

### Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Desktop Support**: Full desktop experience
- **Tablet Friendly**: Responsive layout for all screen sizes

### User Experience

- **Intuitive Navigation**: Clear, simple navigation structure
- **OTP Popup Experience**: Modern modal with individual input boxes for better UX
- **Progress Indicators**: Visual feedback for multi-step processes
- **Error Handling**: Clear error messages and recovery options
- **Loading States**: Smooth loading animations and feedback
- **Auto-focus Management**: Seamless keyboard navigation in OTP input

### Accessibility

- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Proper focus handling for form interactions

## 🔄 Development Workflow

### Code Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── pages/              # Main application pages
├── services/           # API and data services
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### State Management

- **AuthContext**: Manages authentication state
- **Local Storage**: Persists session data
- **API State**: Handles loading and error states

### Error Handling

- **Toast Notifications**: User-friendly error messages
- **Form Validation**: Real-time input validation
- **API Error Handling**: Graceful handling of network errors

## 🚀 Deployment

### Build Process

```bash
# Create production build
npm run build

# Serve production build
npm run serve
```

### Environment Configuration

- **Development**: Uses mock data for testing
- **Production**: Connects to real API endpoints
- **Environment Variables**: Configurable API URLs and settings

## 📝 API Documentation

All API endpoints are relative to the base URL configured in `REACT_APP_API_URL` (default: `http://localhost:8000/api/merchant`).

### Authentication Endpoints

- `POST /login/` - Merchant login (sends OTP)
  - Request: `{ mobile: string, password: string }`
  - Response: `{ message: string, mobile: string }`

- `POST /verify-otp/` - OTP verification
  - Request: `{ mobile: string, otp_code: string }`
  - Response: `{ access: string, refresh: string, merchant: Merchant }`

- `POST /logout/` - Logout
  - Request: `{ refresh_token: string }`
  - Response: `{ message: string }`

### Card Management Endpoints

- `POST /assign-card/` - Assign card to customer (sends OTP to customer)
  - Request: `{ card_serial: string, customer_mobile: string }`
  - Response: `{ message: string, card_serial: string, customer_mobile: string }`

- `GET /verify-customer/:mobile/` - Verify customer registration and fees
  - Response: `{ id, name, mobile_number, email, status, fees_paid, is_registered, can_assign_card }`

- `POST /send-customer-otp/` - Send OTP to customer (separate endpoint)
  - Request: `{ customer_mobile: string }`
  - Response: `{ message: string, customer_mobile: string }`

- `POST /verify-customer-otp/` - Verify customer OTP and complete assignment
  - Request: `{ card_serial: string, customer_mobile: string, otp_code: string }`
  - Response: `{ message: string, hashed_code: string, card: NFCCard }`

- `GET /cards/?status=...&search=...` - Get merchant's cards
  - Query params: `status` (optional), `search` (optional)
  - Response: `NFCCard[]`

- `GET /dashboard-stats/` - Get dashboard statistics
  - Response: `{ available_cards, delivered_cards, assigned_cards, total_cards, recent_activity[] }`

### Settings Endpoints

- `GET /settings/` - Get merchant settings
  - Response: `Merchant`

- `PUT /settings/` - Update merchant settings
  - Request: `{ business_name?, address?, gmaps_location?, contact_name? }`
  - Response: `Merchant`

- `POST /change-password/` - Change password
  - Request: `{ current_password: string, new_password: string, confirm_password: string }`
  - Response: `{ message: string }`

- `POST /change-mobile/` - Request mobile number change (sends OTP)
  - Request: `{ new_mobile: string }`
  - Response: `{ message: string, new_mobile: string }`

- `POST /verify-mobile-change/` - Verify mobile change OTP
  - Request: `{ new_mobile: string, otp_code: string }`
  - Response: `{ message: string, mobile: string }`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.
#   T i c k e t R u n n e r s - M e r c h a n t 
 
 