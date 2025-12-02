# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bills, Bills, Bills is a multi-user expense tracking web application built with Flask (Python) backend and React + Mantine frontend. It uses a multi-SQLite database architecture for complete data isolation between user groups.

## Development Commands

### Frontend Development
```bash
cd client
npm install
npm run dev        # Starts Vite dev server on port 5173 with proxy to Flask
npm run build      # Production build to client/dist/
npm run preview    # Preview production build
```

### Backend Development
```bash
# Install dependencies
pip install -r server/requirements.txt

# Run Flask development server (required for frontend proxy)
cd server && python app.py
# Or with Flask debug mode:
FLASK_DEBUG=true python server/app.py
```

### Full Stack Development
Run both in separate terminals:
1. `cd server && python app.py` (port 5000)
2. `cd client && npm run dev` (port 5173 - use this URL)

### Docker Development
```bash
# Build and run (builds React, then runs Flask)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Fresh install (WARNING: deletes all data)
# Add FORCE_FRESH_INIT=true to environment in docker-compose.yml
```

## Architecture

### Database Structure
- **Master DB** (`/app/data/master.db`): Stores users, database registry, and access permissions
  - `users`: User accounts with hashed passwords and roles
  - `databases`: Registry of available expense databases
  - `user_database_access`: Many-to-many mapping for database permissions
- **User DBs** (`/app/dbs/*.db`): Individual expense databases, one per logical group
  - `bills`: Recurring bills with frequency configuration
  - `payments`: Payment history linked to bills
  - `schema_version`: Migration tracking

### Backend (`server/app.py`)
Single-file Flask application with:
- Session-based authentication with SHA-256 password hashing
- Two decorator patterns: `@login_required` and `@admin_required`
- Auto-migration system that runs on database connection
- Frequency calculation logic supporting weekly, bi-weekly, monthly (with specific dates like 1st & 15th), quarterly, yearly, and custom schedules
- Serves React build from `client/dist/` in production

### Frontend (`client/`)
React + TypeScript application using:
- **Vite** - Build tool and dev server
- **Mantine** - Component library with theming
- **Tabler Icons** - Icon library
- **Axios** - HTTP client
- **React Context** - State management for auth

Key directories:
- `src/components/` - UI components (BillList, BillModal, IconPicker, etc.)
- `src/components/AdminPanel/` - Admin panel components
- `src/context/` - React context providers (AuthContext)
- `src/api/` - API client functions

### Key Patterns
- Bills are "archived" rather than deleted to preserve payment history
- Paying a bill archives the current instance and creates a new one with the next due date
- Auto-payment processing runs on login and database selection
- Database name sanitization: only alphanumeric, underscores, and hyphens allowed
- Dark/light mode toggle persisted via Mantine

## API Routes

### Authentication
- `POST /login` - Returns databases list, handles password change requirements
- `POST /logout`
- `POST /change-password` - Token-based for forced password changes
- `GET /me` - Current user info and accessible databases

### Bills (require login)
- `GET /bills` - List non-archived bills
- `POST /bills` - Create bill
- `PUT /bills/<id>` - Update bill
- `DELETE /bills/<id>` - Archive bill
- `POST /bills/<id>/pay` - Record payment, optionally advance due date

### Payments (require login)
- `GET /bills/<name>/payments` - Payment history by bill name
- `PUT /payments/<id>` - Update payment
- `DELETE /payments/<id>` - Delete payment

### Admin (require admin role)
- `GET/POST /databases` - List/create databases
- `DELETE /databases/<id>` - Delete database and file
- `GET/POST/DELETE /databases/<id>/access` - Manage user access
- `GET/POST/DELETE /users` - User management
- `POST /api/process-auto-payments` - Process due auto-payments

## Volume Mounts (Docker)
- `./data:/app/data` - Master database
- `./dbs:/app/dbs` - User expense databases
