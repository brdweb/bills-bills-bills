# BillManager - Financial Tracker

A **secure multi-user** web application for tracking recurring expenses and income with **complete data separation**. Built with React + Mantine frontend and Flask + PostgreSQL backend.

![BillManager Screenshot](docs/screenshot.png)

## Features

- **Income & Expense Tracking**: Track both recurring bills and deposits to forecast cash flow
- **Account Management**: Organize transactions by account with intelligent filtering
- **Payment Analytics**: Visual charts and comprehensive payment history across all transactions
- **Multi-Tenant Architecture**: Row-level data isolation with granular user permissions
- **Enhanced Frequencies**: Weekly, bi-weekly, monthly (including 1st & 15th), quarterly, yearly, and custom schedules
- **Auto-Payments**: Automatic payment processing for recurring transactions
- **Modern UI**: Responsive design with dark/light mode, 70+ custom icons, and visual calendar

## What's New in v3.0

- **PostgreSQL Backend**: Migrated from SQLite to PostgreSQL for improved scalability and SaaS readiness
- **Row-Level Tenancy**: Single database with complete data isolation between user groups
- **SQLAlchemy ORM**: Modern database models with migration support
- **O'Saasy License**: New license permits broad use while reserving SaaS commercialization rights
- **Bug Fixes**: Fixed SPA routing, calendar badge positioning, and API caching issues

## License

This project is licensed under the [O'Saasy License](LICENSE) - a modified MIT license that permits broad use while restricting SaaS commercialization by third parties.

Learn more at [osaasy.dev](https://osaasy.dev/)

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Web browser

### Run the Application

1. **Create a `docker-compose.yml` file** with the following content:

   ```yaml
   services:
     bills-app:
       image: ghcr.io/brdweb/billmanager:latest
       container_name: billmanager
       ports:
         - "5000:5000"
       restart: unless-stopped
       environment:
         - DATABASE_URL=postgresql://billsuser:billspass@db:5432/billsdb
         - FLASK_SECRET_KEY=change-this-to-a-secure-random-string
       depends_on:
         - db

     db:
       image: postgres:16-alpine
       container_name: bills-db
       restart: unless-stopped
       environment:
         - POSTGRES_USER=billsuser
         - POSTGRES_PASSWORD=billspass
         - POSTGRES_DB=billsdb
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

2. **Run the application**:
   ```bash
   docker compose up -d
   ```

3. **Open your browser** and visit: http://localhost:5000

### Using Your Own PostgreSQL Database

If you already have a PostgreSQL server or prefer to use a managed database service (AWS RDS, DigitalOcean, Supabase, etc.), you can run just the application container:

1. **Create your database** on your PostgreSQL server:
   ```sql
   CREATE DATABASE billsdb;
   CREATE USER billsuser WITH ENCRYPTED PASSWORD 'your-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE billsdb TO billsuser;
   ```

2. **Create a simplified `docker-compose.yml`**:
   ```yaml
   services:
     bills-app:
       image: ghcr.io/brdweb/billmanager:latest
       container_name: billmanager
       ports:
         - "5000:5000"
       restart: unless-stopped
       environment:
         - DATABASE_URL=postgresql://billsuser:your-secure-password@your-db-host:5432/billsdb
         - FLASK_SECRET_KEY=change-this-to-a-secure-random-string
   ```

3. **Or run with Docker directly**:
   ```bash
   docker run -d \
     --name billmanager \
     -p 5000:5000 \
     -e DATABASE_URL=postgresql://billsuser:your-secure-password@your-db-host:5432/billsdb \
     -e FLASK_SECRET_KEY=change-this-to-a-secure-random-string \
     ghcr.io/brdweb/billmanager:latest
   ```

**Database URL Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

| Component | Example | Description |
|-----------|---------|-------------|
| USERNAME | `billsuser` | PostgreSQL username |
| PASSWORD | `secretpass` | PostgreSQL password (URL-encode special characters) |
| HOST | `db.example.com` | Database server hostname or IP |
| PORT | `5432` | PostgreSQL port (default: 5432) |
| DATABASE | `billsdb` | Database name |

**Examples:**
- Local: `postgresql://billsuser:pass@localhost:5432/billsdb`
- Remote: `postgresql://billsuser:pass@db.example.com:5432/billsdb`
- AWS RDS: `postgresql://billsuser:pass@mydb.abc123.us-east-1.rds.amazonaws.com:5432/billsdb`
- Supabase: `postgresql://postgres:pass@db.xxxx.supabase.co:5432/postgres`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://billsuser:billspass@db:5432/billsdb` |
| `FLASK_SECRET_KEY` | Secret key for session encryption | Auto-generated (set in production!) |

**Security Note:** Always set a strong, unique `FLASK_SECRET_KEY` in production environments.

## First Login

Login with default credentials:
- **Username:** `admin`
- **Password:** `password`

**Security Notice:** You will be **required to change the password** on first login.

## How to Use

### 1. Database Selection
After login, select your database from the dropdown:
- **Personal Finances** - Your personal finances (default)

### 2. Add Your First Transaction
1. Click the **"Add Entry"** button
2. Enter transaction details:
   - Name: "Internet", "Paycheck", etc.
   - Type: Choose **Expense (Bill)** or **Deposit (Income)**
   - Account: Type the account name (checking, savings, etc.) - autocomplete suggests existing accounts
   - Amount: Fixed amount or check "Varies" for variable costs
   - Frequency: Weekly, Bi-weekly, Monthly, Quarterly, Yearly, or Custom
   - Due date and optional auto-payment setting
3. Choose an icon from 70+ options across categories

### 3. Record Payments/Deposits
1. Click the green **pay button** on any transaction
2. Enter payment/deposit amount
3. Choose to advance due date automatically
4. Transaction recorded!

### 4. Filter Your View
- **Transaction Type**: Show all, expenses only, or deposits only
- **Account**: Filter by specific account
- **Search**: Find transactions by name
- **Date Ranges**: Click upcoming bill badges to filter by time period

### 5. View Payment History
1. Click on any transaction row to see its payment history
2. View, edit, or delete individual payment records
3. Click **"Trends"** to see payment analytics charts
4. Click **"Payments"** to see all payments across all transactions

### 6. Monthly Overview
- Use the **left/right arrows** in the Dashboard to navigate between months
- Current month shows **Paid** vs **Remaining** breakdown
- **Remaining** = Sum of unpaid expense bills due in the selected month
- Past months show **Total Paid** from actual payment records

## User & Database Management (Admin Only)

### Admin Panel
- **Note:** Only admins can access the Admin Panel
- Click the **"Admin"** button after login

### Database Management
1. Create separate databases for different purposes (family, business, etc.)
2. Grant specific user access to databases
3. Complete data isolation between databases

### User Management
1. Add new users through the Admin Panel
2. Assign admin privileges when needed
3. Control database access permissions

## Application Management

### Start Application
```bash
docker compose up -d
```

### View Logs
```bash
docker compose logs -f bills-app
```

### Stop Application
```bash
docker compose down
```

### Update to New Version
```bash
docker compose pull
docker compose down
docker compose up -d
```

### Backup PostgreSQL Data
```bash
# Create backup
docker exec bills-db pg_dump -U billsuser billsdb > backup.sql

# Restore backup
docker exec -i bills-db psql -U billsuser billsdb < backup.sql
```

### Data Persistence
Docker Compose uses a named volume for PostgreSQL data:
- **`postgres_data`** - All application data (users, databases, bills, payments)
- **Your data is automatically preserved between deployments!**

## Upgrading from v2.x

Version 3.0 uses PostgreSQL instead of SQLite. If upgrading from v2.x:

1. **Backup your v2.x data** (the `data/` and `dbs/` directories)
2. **Deploy v3.0** with the new docker-compose.yml (includes PostgreSQL)
3. **Data Migration**: The application includes a migration script that can import data from SQLite databases. Contact the maintainer for migration assistance.

**Note:** Fresh installations of v3.0 do not require any migration steps.

## Security Features

- **Forced Password Change**: Default admin credentials require immediate password update
- **Row-Level Isolation**: Complete separation between different user databases
- **Secure Authentication**: Session-based authentication with secure cookies
- **Input Validation**: All user inputs are properly sanitized
- **Admin Controls**: Granular permissions and access control
- **HTTPS Ready**: Deploy behind a reverse proxy (Traefik, nginx) for SSL

## Technical Details

- **Frontend:** React 19 + Mantine 7 + TypeScript + Vite
- **Backend:** Python Flask with SQLAlchemy ORM
- **Database:** PostgreSQL 16 with row-level tenancy
- **WSGI Server:** Gunicorn for production
- **Deployment:** Docker Compose with persistent volumes
- **Icons:** Tabler Icons (70+ categories)

## API Endpoints

The application exposes a REST API for all operations:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/login` | POST | Authenticate user |
| `/logout` | POST | End session |
| `/me` | GET | Current user info |
| `/bills` | GET/POST | List/create bills |
| `/bills/<id>` | PUT/DELETE | Update/archive bill |
| `/bills/<id>/pay` | POST | Record payment |
| `/api/payments/monthly` | GET | Monthly payment totals |
| `/api/accounts` | GET | List accounts |
| `/api/version` | GET | API version info |

---

**Ready to organize your finances securely? Get started with BillManager!**

Licensed under [O'Saasy](https://osaasy.dev/) | [View on GitHub](https://github.com/brdweb/billmanager)
