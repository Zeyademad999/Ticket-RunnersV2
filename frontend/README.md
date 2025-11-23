# TicketRunners Frontend Structure

This directory contains all frontend applications for the TicketRunners platform.

## Structure

```
frontend/
├── admin-dashboard/      # Admin Dashboard (Port: 8081) ✅ Ready
├── organizer-dashboard/  # Organizer Dashboard (Port: 8082) - Place your files here
├── merchant-dashboard/  # Merchant Dashboard (Port: 8083) - Place your files here
└── webapp/              # Main Website (Port: 8080) - Place your files here
```

## Admin Dashboard

The admin dashboard is already set up in `admin-dashboard/` with all source files.

To run:
```bash
cd frontend/admin-dashboard
npm install
npm run dev
```

## Other Frontends

When you get the source files for the other frontends:

1. **Organizer Dashboard**: Copy your `src/` folder and config files to `frontend/organizer-dashboard/`
2. **Merchant Dashboard**: Copy your `src/` folder and config files to `frontend/merchant-dashboard/`
3. **WebApp**: Copy your `src/` folder and config files to `frontend/webapp/`

Each frontend should have its own `package.json`, `vite.config.ts`, etc.

