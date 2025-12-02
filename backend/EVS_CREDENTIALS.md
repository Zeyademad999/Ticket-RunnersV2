# EVS Usher Credentials

## ✅ Credentials Created Successfully

### Login Credentials:
- **Username:** `usher`
- **Password:** `evs123`
- **Event ID:** `6`
- **Event Name:** Test Event for EVS
- **Event Date:** 2025-11-20
- **Event Status:** scheduled

## How to Use

1. **Start the Django backend server:**
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Start the EVS frontend:**
   ```bash
   cd frontend/EVS
   npm start
   ```

3. **Login to EVS Portal:**
   - Open http://localhost:3000
   - Enter Event ID: `6`
   - Enter Username: `usher`
   - Enter Password: `evs123`
   - Click "Sign In"

## Event Validation

The login system now validates:
- ✅ Event exists in the admin system
- ✅ Event status is valid for scanning (scheduled, ongoing, or upcoming)
- ✅ Usher is assigned to the event
- ✅ Usher account is active
- ✅ AdminUser has USHER role

## Creating More Credentials

To create additional EVS usher credentials, run:

```bash
cd backend
python create_evs_usher.py
```

The script will:
- Create AdminUser with USHER role
- Create Usher profile
- Assign usher to an event (or create test event if none exists)
- Display credentials

## Assigning Usher to Different Events

To assign the usher to a different event:

1. Go to Django admin: http://localhost:8000/admin
2. Navigate to Users > Ushers
3. Find the usher (username: `usher`)
4. Edit the usher
5. Select events in the "Events" field
6. Save

## Notes

- Event IDs are integers (not UUIDs)
- Usher must be assigned to an event before login
- Event must be in 'scheduled', 'ongoing', or 'upcoming' status
- Usher account must be 'active'

