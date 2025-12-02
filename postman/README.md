# Postman Collection for Ticket Runners Admin Dashboard API

This Postman collection provides comprehensive API testing for the Ticket Runners Admin Dashboard backend.

## Setup Instructions

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Import both files:
   - `TicketRunners_Admin_Dashboard.postman_collection.json`
   - `TicketRunners_Admin_Dashboard.postman_environment.json`
4. Select the environment: **Ticket Runners - Admin Dashboard Environment**

### 2. Configure Environment Variables

The environment is pre-configured with:
- `base_url`: `http://localhost:8000/api`
- `access_token`: (auto-populated after login)
- `refresh_token`: (auto-populated after login)
- `user_id`: (auto-populated after login)

### 3. Authentication

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

**⚠️ Important: Admin User Setup**
Before logging in, make sure the admin user exists in the database. If you haven't created it yet:

1. **Option 1: Use the create_admin_user.py script**
   ```bash
   cd backend
   python create_admin_user.py
   ```
   Or to reset the password:
   ```bash
   python create_admin_user.py --reset
   ```

2. **Option 2: Use Django shell**
   ```bash
   cd backend
   python manage.py shell
   ```
   Then run:
   ```python
   from authentication.models import AdminUser
   AdminUser.objects.create_user(
       username='admin',
       email='admin@ticketrunners.com',
       password='admin123',
       role='SUPER_ADMIN'
   )
   ```

**Steps:**
1. **IMPORTANT**: Make sure the environment "Ticket Runners - Admin Dashboard Environment" is selected in the top-right dropdown
2. Run the **Login** request in the **Authentication** folder
3. Check the **Test Results** tab after login - you should see console logs confirming tokens were saved
4. The access token and refresh token will be automatically saved to:
   - Environment variables (if environment is selected)
   - Collection variables (as fallback)
5. All subsequent requests will use Bearer token authentication automatically

**Troubleshooting 401 Errors:**
- If you get "Authentication credentials were not provided" after login:
  1. Verify the environment is selected (top-right dropdown)
  2. Check the **Test Results** tab in the Login response - look for console logs
  3. Manually check environment variables: Click the eye icon next to environment name → verify `access_token` has a value
  4. If tokens aren't saved, manually copy the `access_token` from login response and paste it into the environment variable
  5. Make sure the request's **Authorization** tab shows "Inherit auth from parent" (collection-level auth)

## Collection Structure

### Authentication
- Login (auto-saves tokens)
- Get Current User
- Change Password
- Refresh Token
- Logout

### Customers
- Get All Customers
- Get Customer by ID
- Create Customer
- Update Customer

### Events
- Get All Events
- Get Event by ID
- Create Event
- Update Event
- Delete Event
- Get Event Ushers

**Note for Create/Update Event:**
- `category` must be an ID (integer) if provided, or `null` to omit. Check existing events to see available category IDs, or omit the field entirely.
- `date` must be in the future (not in the past). Use format: `YYYY-MM-DD` (e.g., `2025-12-31`).
- `total_tickets` is required (minimum 1).
- `ticket_limit` is optional (defaults to 10).
- `ticket_transfer_enabled` is optional (defaults to true).
- `status` is not included in create/update - it defaults to "upcoming".

### Tickets
- Get All Tickets
- Get Ticket by ID
- Create Ticket
- Update Ticket
- Delete Ticket
- Check-in Ticket
- Transfer Ticket

### Venues
- Get All Venues
- Get Venue by ID
- Create Venue
- Update Venue
- Delete Venue

### Users
#### Organizers
- Get All Organizers
- Create Organizer
- Update Organizer
- Verify Organizer
- Delete Organizer

#### Ushers
- Get All Ushers
- Get Usher by ID
- Create Usher
- Update Usher
- Delete Usher

#### Merchants
- Get All Merchants
- Get Merchant by ID
- Create Merchant
- Update Merchant
- Delete Merchant
- Verify Merchant

### Finances
#### Expenses
- Get All Expenses
- Get Expense Summary
- Create Expense
- Update Expense
- Delete Expense

#### Payments
- Get All Payments
- Get Payment Stats

#### Payouts
- Get All Payouts
- Create Payout
- Process Payout

#### Company Finances
- Get Company Finances

#### Profit Share
- Get Profit Share

#### Settlements
- Get Settlements

#### Deposits
- Get Deposits

#### Profit Withdrawals
- Get Profit Withdrawals
- Approve Withdrawal

### System Logs
- Get System Logs
- Get System Log by ID

### Check-in Logs
- Get Check-in Logs
- Get Check-in Log by ID
- Get Event Check-in Logs

### Dashboard & Analytics
- Get Dashboard Stats
- Get Revenue Analytics
- Get User Analytics

## Usage Tips

1. **Always login first** - The Login request automatically saves tokens to environment variables
2. **Use environment variables** - Replace hardcoded IDs with `{{variable_name}}` syntax
3. **Check responses** - Most requests include example responses
4. **Update IDs** - Replace placeholder IDs (like `:id` = `1`) with actual IDs from your database

## Testing Workflow

1. **Start Backend Server**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Login**
   - Run the "Login" request
   - Verify tokens are saved in environment

3. **Test CRUD Operations**
   - Start with GET requests to see existing data
   - Use POST to create new records
   - Use PUT to update records
   - Use DELETE to remove records

4. **Test Filters**
   - Enable query parameters in GET requests
   - Test pagination with `page` and `page_size`
   - Test filtering with `search`, `status`, `category`, etc.

## Notes

- All requests use Bearer token authentication (configured at collection level)
- The Login request automatically extracts and saves tokens
- Base URL is configurable via environment variable
- Most endpoints support pagination with `page` and `page_size` parameters
- Filtering parameters are available but disabled by default in query strings

