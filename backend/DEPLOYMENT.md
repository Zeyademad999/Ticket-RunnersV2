# TicketRunners Admin Backend - Deployment Guide

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)
- SQLite (included with Python)
- Git (optional, for version control)

## Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env file with your settings
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

## Development Server

Run the development server:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running:
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

## Production Deployment

### Using Gunicorn

1. **Install Gunicorn:**
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn:**
   ```bash
   gunicorn ticketrunners.wsgi:application --bind 0.0.0.0:8000
   ```

### Using Docker (Optional)

1. **Create Dockerfile:**
   ```dockerfile
   FROM python:3.10
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["gunicorn", "ticketrunners.wsgi:application", "--bind", "0.0.0.0:8000"]
   ```

2. **Build and run:**
   ```bash
   docker build -t ticketrunners-backend .
   docker run -p 8000:8000 ticketrunners-backend
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://admin.ticketrunners.com
```

## Database Migration to MySQL

When ready to migrate to MySQL:

1. **Update settings.py:**
   ```python
   DATABASES = {
       'default': {
           'ENGINE': 'django.db.backends.mysql',
           'NAME': 'ticketrunners',
           'USER': 'your_user',
           'PASSWORD': 'your_password',
           'HOST': 'localhost',
           'PORT': '3306',
       }
   }
   ```

2. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

## Security Checklist

- [ ] Change SECRET_KEY in production
- [ ] Set DEBUG=False in production
- [ ] Configure ALLOWED_HOSTS
- [ ] Set up HTTPS
- [ ] Configure CORS_ALLOWED_ORIGINS
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring

## API Endpoints Summary

### Authentication
- POST `/api/auth/login/` - Login
- POST `/api/auth/logout/` - Logout
- POST `/api/auth/refresh/` - Refresh token
- GET `/api/auth/me/` - Get current user
- PUT `/api/auth/change-password/` - Change password

### Events
- GET `/api/events/` - List events
- POST `/api/events/` - Create event
- GET `/api/events/:id/` - Get event details
- PUT `/api/events/:id/` - Update event
- DELETE `/api/events/:id/` - Delete event
- GET `/api/events/:id/statistics/` - Get event statistics

### Tickets
- GET `/api/tickets/` - List tickets
- GET `/api/tickets/:id/` - Get ticket details
- PUT `/api/tickets/:id/status/` - Update ticket status
- POST `/api/tickets/:id/checkin/` - Check in ticket
- POST `/api/tickets/:id/transfer/` - Transfer ticket

### Customers
- GET `/api/customers/` - List customers
- GET `/api/customers/:id/` - Get customer details
- PUT `/api/customers/:id/` - Update customer
- PUT `/api/customers/:id/status/` - Update customer status
- GET `/api/customers/:id/bookings/` - Get customer bookings

### NFC Cards
- GET `/api/nfc-cards/` - List NFC cards
- POST `/api/nfc-cards/` - Create NFC card
- PUT `/api/nfc-cards/:id/` - Update NFC card
- POST `/api/nfc-cards/bulk/` - Bulk operations
- POST `/api/nfc-cards/:id/transfer/` - Transfer card

### Venues
- GET `/api/venues/` - List venues
- POST `/api/venues/` - Create venue
- PUT `/api/venues/:id/` - Update venue
- DELETE `/api/venues/:id/` - Delete venue

### Users
- GET `/api/users/organizers/` - List organizers
- GET `/api/users/ushers/` - List ushers
- GET `/api/users/admins/` - List admins
- GET `/api/users/merchants/` - List merchants

### Finances
- GET `/api/finances/expenses/` - List expenses
- GET `/api/finances/payouts/` - List payouts
- GET `/api/finances/company/` - Company finances
- GET `/api/finances/profit-share/` - Profit share
- GET `/api/finances/settlements/` - Settlements
- GET `/api/finances/deposits/` - Deposits
- GET `/api/finances/withdrawals/` - Profit withdrawals

### System Logs
- GET `/api/logs/system/` - System logs
- GET `/api/logs/checkin/` - Check-in logs

### Analytics
- GET `/api/analytics/dashboard/stats/` - Dashboard statistics
- GET `/api/analytics/revenue/` - Revenue analytics
- GET `/api/analytics/users/` - User growth analytics
- GET `/api/analytics/cards/` - Card status analytics
- GET `/api/analytics/events/` - Event categories analytics

## Testing

Run tests:
```bash
python manage.py test
```

Run with coverage:
```bash
pip install coverage
coverage run --source='.' manage.py test
coverage report
```

## Troubleshooting

### Common Issues

1. **Migration errors:** Run `python manage.py makemigrations` then `python manage.py migrate`
2. **Import errors:** Ensure all apps are in INSTALLED_APPS in settings.py
3. **CORS errors:** Check CORS_ALLOWED_ORIGINS in settings.py
4. **Authentication errors:** Verify JWT token is valid and not expired

## Support

For issues or questions, please refer to the project documentation or contact the development team.

