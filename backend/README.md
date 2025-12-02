# TicketRunners Admin Backend

Django REST API backend for TicketRunners Admin Dashboard.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Run migrations:
```bash
python manage.py migrate
```

4. Create superuser:
```bash
python manage.py createsuperuser
```

5. Run development server:
```bash
python manage.py runserver
```

## API Documentation

Once the server is running, access API documentation at:
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/

## Project Structure

- `apps/`: Django applications (authentication, events, tickets, etc.)
- `core/`: Core utilities (permissions, pagination, exceptions)
- `ticketrunners/`: Project settings and configuration

