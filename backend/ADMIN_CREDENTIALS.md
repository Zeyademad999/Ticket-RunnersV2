# Admin Dashboard Login Credentials

## 🔐 Admin User Credentials

The admin user has been created in the database with the following credentials:

### Login Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@ticketrunners.com`
- **Role**: `SUPER_ADMIN` (Super Admin)

### User Details
- **Full Name**: System Administrator
- **Status**: Active
- **Permissions**: Full access (Super Admin role)

## 🚀 How to Login

1. Navigate to the admin dashboard login page (usually at `http://localhost:8081/login`)
2. Enter the credentials:
   - Username: `admin`
   - Password: `admin123`
3. Click "Sign In"

## 📝 API Login Endpoint

You can also login via the API:

**Endpoint**: `POST /api/auth/login/`

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response**:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@ticketrunners.com",
    "role": "SUPER_ADMIN",
    ...
  }
}
```

## 🔧 Creating Additional Admin Users

To create additional admin users, you can:

1. **Use the script**:
   ```bash
   cd backend
   source venv/bin/activate
   python create_admin_user.py
   ```

2. **Use Django shell**:
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py shell
   ```
   Then in the shell:
   ```python
   from authentication.models import AdminUser
   AdminUser.objects.create_user(
       username='your_username',
       email='your_email@example.com',
       password='your_password',
       role='SUPER_ADMIN',  # or 'ADMIN', 'SUPPORT', 'USHER'
       is_staff=True,
       is_superuser=True,
       is_active=True
   )
   ```

## ⚠️ Security Note

**IMPORTANT**: Change the default password (`admin123`) in production environments!

For production:
1. Use a strong, unique password
2. Enable two-factor authentication if available
3. Regularly rotate passwords
4. Use environment variables for sensitive credentials

## 🔄 Resetting Password

If you need to reset the admin password, you can:

1. **Use Django shell**:
   ```bash
   python manage.py shell
   ```
   ```python
   from authentication.models import AdminUser
   user = AdminUser.objects.get(username='admin')
   user.set_password('new_password')
   user.save()
   ```

2. **Use the script** (it will prompt to reset if user exists):
   ```bash
   python create_admin_user.py
   ```

## 📋 Available Roles

- **SUPER_ADMIN**: Full access to all features
- **ADMIN**: Administrative access (cannot delete admins or create super admins)
- **SUPPORT**: View customers, tickets, and events
- **USHER**: Check-in tickets and view events

