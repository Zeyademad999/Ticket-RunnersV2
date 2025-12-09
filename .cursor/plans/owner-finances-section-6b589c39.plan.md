<!-- 6b589c39-bb7c-4889-9432-ca1a73d5ef8d e92d6e45-8a28-4e19-aa9c-0875ffb2c192 -->
# Owner Finances Section Implementation

## Overview

Add a new "Owner Finances" tab in the owners-finances dropdown menu that enables:

- Adding owners with company percentage allocation
- Wallet card UI for each owner showing live balance
- Stat cards displaying TR revenue (event commissions + card revenue)

## Implementation Plan

### 1. Frontend - New Tab Addition

- **File**: `frontend/admin-dashboard/src/pages/AdminDashboard.tsx`
- Add new tab "owner-finances" to the owners-finances tab group
- Add TabsContent for the new tab rendering OwnerFinances component

### 2. Frontend - Owner Finances Component

- **New File**: `frontend/admin-dashboard/src/components/admin/OwnerFinances.tsx`
- Create main component with:
- Add Owner dialog/form (name, email, phone, percentage)
- Grid of wallet cards (one per owner)
- Stat cards showing TR revenue breakdown
- Real-time balance updates

### 3. Frontend - Wallet Card Component

- **New File**: `frontend/admin-dashboard/src/components/admin/OwnerWalletCard.tsx`
- Credit card-style UI component
- Display owner name, balance, percentage
- Live balance updates
- Card number/design elements

### 4. Frontend - API Integration

- **File**: `frontend/admin-dashboard/src/lib/api/adminApi.ts`
- Add API methods:
- `getOwners()` - fetch all owners
- `createOwner(data)` - create new owner
- `updateOwner(id, data)` - update owner percentage
- `getOwnerWallet(id)` - get owner wallet balance
- `getOwnerRevenue(id)` - get owner's share of TR revenue

### 5. Backend - Owner Model Enhancement

- **File**: `backend/finances/models.py`
- Enhance or create Owner model with:
- name, email, phone
- company_percentage (DecimalField)
- wallet_balance (DecimalField)
- created_at, updated_at

### 6. Backend - Wallet Model

- **File**: `backend/finances/models.py`
- Create OwnerWallet model:
- ForeignKey to Owner
- balance (DecimalField)
- transaction history relationship

### 7. Backend - API Endpoints

- **File**: `backend/finances/views.py`
- Create OwnerViewSet (CRUD operations)
- Create endpoint to calculate owner's share of TR revenue
- Create endpoint to get owner wallet balance
- Integrate with existing ticket_runner_profit calculation

### 8. Backend - Revenue Calculation

- **File**: `backend/finances/views.py`
- Enhance ticket_runner_profit or create new endpoint
- Calculate each owner's share: (owner_percentage / 100) × TR_net_profit
- Include event commissions + card revenue in calculation

### 9. Backend - URL Configuration

- **File**: `backend/finances/urls.py`
- Add routes for owner endpoints
- Register OwnerViewSet in router

### 10. Translations

- **Files**: `frontend/admin-dashboard/src/locales/EN.json` and `AR.json`
- Add translations for:
- Owner Finances section
- Wallet card labels
- Add owner form
- Stat card labels
- TR revenue breakdown

## Technical Details

### Wallet Balance Calculation

- Each owner's wallet balance = their percentage share of TR net profit
- TR net profit = (Event commissions + Card revenue) - Deductions
- Balance updates automatically when TR revenue changes

### Wallet Card Design

- Credit card-style UI with gradient background
- Display: Owner name, balance, percentage, card number (generated)
- Real-time balance updates via polling or WebSocket

### Stat Cards

- Total TR Revenue (event commissions + card revenue)
- Individual owner's share (percentage × total)
- Breakdown by source (commissions vs card revenue)

### To-dos

- [ ] Create/enhance Owner model in backend/finances/models.py with company_percentage and wallet fields
- [ ] Create OwnerWallet model for tracking wallet balances and transactions
- [ ] Create OwnerViewSet in backend/finances/views.py with CRUD operations
- [ ] Create API endpoint to calculate owner's share of TR revenue (event commissions + card revenue)
- [ ] Add owner API routes to backend/finances/urls.py
- [ ] Add owner and wallet API methods to frontend/admin-dashboard/src/lib/api/adminApi.ts
- [ ] Create OwnerWalletCard component with credit card-style UI in frontend/admin-dashboard/src/components/admin/OwnerWalletCard.tsx
- [ ] Create OwnerFinances main component with add owner form, wallet cards grid, and stat cards
- [ ] Add 'owner-finances' tab to AdminDashboard.tsx in owners-finances tab group
- [ ] Add translations for Owner Finances section in EN.json and AR.json