# Network Access Guide

This guide will help you make the Ticket Runners portal accessible from other devices on your local network.

## Prerequisites
- Your computer's IP address: `192.168.0.103`
- Both frontend and backend servers need to be running

## Step 1: Start the Backend Server

Open a terminal in the `backend` directory and run:

```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

**Important:** Use `0.0.0.0:8000` instead of just `8000` to allow connections from other devices on the network.

The backend will be accessible at:
- `http://192.168.0.103:8000` (from other devices)
- `http://localhost:8000` (from your computer)

## Step 2: Start the Frontend Servers

### Web App (Port 8083):
Open a **new terminal** in the `frontend/webapp` directory and run:

```bash
cd frontend/webapp
npm run dev
```

The web app will be accessible at:
- `http://192.168.0.103:8083` (from other devices on your network)
- `http://localhost:8083` (from your computer)

### Admin Dashboard (Port 8081):
Open **another terminal** in the `frontend/admin-dashboard` directory and run:

```bash
cd frontend/admin-dashboard
npm run dev
```

The admin dashboard will be accessible at:
- `http://192.168.0.103:8081` (from other devices on your network)
- `http://localhost:8081` (from your computer)

## Step 3: Access from Other Devices

On your friend's computer (or any device on the same network), open a web browser and navigate to:

**Web App (User Portal):**
```
http://192.168.0.103:8083
```

**Admin Dashboard:**
```
http://192.168.0.103:8081
```

## Troubleshooting

### If the frontend can't connect to the backend:

1. **Check Firewall**: Make sure Windows Firewall allows connections on ports 8000, 8081, and 8083
   - Go to Windows Defender Firewall → Advanced Settings
   - Create inbound rules for ports 8000, 8081, and 8083

2. **Check Backend is Running**: Verify the backend is accessible by visiting:
   ```
   http://192.168.0.103:8000/api/v1/public/events/
   ```
   You should see JSON data, not an error.

3. **Check IP Address**: Make sure your computer's IP is still `192.168.0.103`
   - Run `ipconfig` in PowerShell/CMD
   - Look for "IPv4 Address" under your active network adapter

### If CORS errors occur:

The backend is already configured to allow requests from both:
- `http://192.168.0.103:8083` (Web App)
- `http://192.168.0.103:8081` (Admin Dashboard)

If you still see CORS errors, check:
- The backend `ALLOWED_HOSTS` includes `192.168.0.103`
- The backend `CORS_ALLOWED_ORIGINS` includes both `http://192.168.0.103:8083` and `http://192.168.0.103:8081`

## Quick Start Scripts

### Windows PowerShell (Backend):
```powershell
cd backend
python manage.py runserver 0.0.0.0:8000
```

### Windows PowerShell (Web App Frontend):
```powershell
cd frontend/webapp
npm run dev
```

### Windows PowerShell (Admin Dashboard Frontend):
```powershell
cd frontend/admin-dashboard
npm run dev
```

## Notes

- All three servers (Backend, Web App, Admin Dashboard) must be running simultaneously
- Keep all terminal windows open while testing
- The IP address `192.168.0.103` is already configured in the code
- If your IP changes, update `vite.config.ts` files in both `frontend/webapp` and `frontend/admin-dashboard` with the new IP

## Summary

You need to run **3 terminals**:

1. **Backend** (Port 8000): `python manage.py runserver 0.0.0.0:8000`
2. **Web App** (Port 8083): `cd frontend/webapp && npm run dev`
3. **Admin Dashboard** (Port 8081): `cd frontend/admin-dashboard && npm run dev`

Your friend can then access:
- **Web App**: `http://192.168.0.103:8083`
- **Admin Dashboard**: `http://192.168.0.103:8081`

