# Converted Edens Glamp - React + Django Scaffold

This repository is an **automatically-generated scaffold** converting your original PHP site into:

- Frontend: Create React App (minimal skeleton) at `frontend/`
- Backend: Django + Django REST Framework at `backend/`
- Authentication: JWT (djangorestframework-simplejwt)
- Database: PostgreSQL (configure via env vars)

**Note:** This is a scaffold. You'll need to install dependencies, finish templates, and adjust styles/data.

## Quick setup (Backend)

1. Create and activate a Python virtualenv
```bash
python -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
```

2. Set environment variables (example)
```bash
export POSTGRES_DB=glamp_db
export POSTGRES_USER=glamp_user
export POSTGRES_PASSWORD=secretpassword
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export DJANGO_SECRET='change-me'
export DEBUG=1
```

3. Run migrations and create superuser
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Quick setup (Frontend)

This scaffold uses Create React App structure.

1. Install node modules and start
```bash
cd frontend
npm install
npm start
```

2. The frontend expects the API at `/api/` (proxy) — configure proxy in `package.json` if needed.

## What I implemented for you

- Users app with custom `User` model supporting roles (admin, staff, guest)
- JWT auth endpoints (token/refresh)
- Rooms, Reservations, Gallery apps with basic models, serializers, and viewsets
- Basic React pages (Home, Rooms, Gallery, Reservation, Login, Admin Dashboard) with Axios calls to the API endpoints
- Assets (images, media) copied to `frontend/public/assets` from your original site

## Next steps I recommend
- Review and migrate CSS into React components or Tailwind
- Implement protected routes (admin/staff) in frontend and role-based permissions in backend
- Hook up media uploads (configure MEDIA_ROOT, MEDIA_URL in Django) and serve static files in production
- Add CORS (django-cors-headers) if serving frontend from a different origin
- Replace debug settings and set secure production settings before deploying

