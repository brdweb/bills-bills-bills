# Bills, Bills, Bills! Financial Tracker

A **secure multi-user** web application for tracking recurring expenses and income with **complete data separation**. Built with React + Mantine frontend and Flask backend.

![Bills Bills Bills Screenshot](docs/screenshot.png)

## Features

- **Income & Expense Tracking**: Track both recurring bills and deposits to forecast cash flow
- **Account Management**: Organize transactions by account with intelligent filtering
- **Payment Analytics**: Visual charts and comprehensive payment history across all transactions
- **Multi-Database**: Complete data isolation between user groups with granular permissions
- **Enhanced Frequencies**: Weekly, bi-weekly, monthly (including 1st & 15th), quarterly, yearly, and custom schedules
- **Auto-Payments**: Automatic payment processing for recurring transactions
- **Modern UI**: Responsive design with dark/light mode, 70+ custom icons, and visual calendar

## What's New in v2.2

- **Income Tracking**: Record recurring deposits alongside expenses to forecast cash flow
- **Account Field**: Track which account each transaction is paid from or deposited into
- **Transaction Type Filter**: Quickly filter to show only expenses or only deposits
- **Account Filter**: View transactions for specific accounts
- **Payment Analytics Charts**: Visual trends showing payment history over time
- **All Payments View**: Comprehensive table of all payments across all bills
- **Enhanced UI**: Condensed sidebar, improved filters placement, and refined layout

## License & Commercialization

- **Versions ≤ 2.2**: Released under the [MIT License](LICENSE).
- **Versions 3.0+ (Upcoming)**: Will be released under the **O'sassy License**. 

This transition supports the future development of "Bills, Bills, Bills!" as a scalable SaaS platform.

## Quick Start

### Prerequisites
- Docker installed and running
- Web browser

### Run the Application

1. **Create a `docker-compose.yml` file** with the following content:

   ```yaml
   version: '3.8'

   services:
     bills-app:
       image: ghcr.io/brdweb/bills-bills-bills:latest
       container_name: bills-bills-bills
       ports:
         - "5000:5000"
       restart: unless-stopped
       volumes:
         # Persistent data storage for all databases
         - ./data:/app/data
         # Mount the shared database directory
         - ./dbs:/app/dbs
   ```

2. **Run the application** (database auto-initializes on first startup):
   ```bash
   docker-compose up -d
   ```

3. **Open your browser** and visit: http://localhost:5000

## First Login

Login with default credentials:
- **Username:** `admin`
- **Password:** `password`

**Security Notice:** You will be **required to change the password** on first login.

## How to Use

### 1. Database Selection
After login, select your database from the dropdown:
- **personal** - Your personal finances (default)

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
# Using docker-compose (recommended)
docker-compose up -d

# Or manually
docker start bills-bills-bills
```

### View Logs
```bash
# Using docker-compose
docker-compose logs -f

# Or manually
docker logs -f bills-bills-bills
```

### Stop Application
```bash
# Using docker-compose
docker-compose down

# Or manually
docker stop bills-bills-bills
```

### Update to New Version
```bash
docker pull ghcr.io/brdweb/bills-bills-bills:latest
docker-compose down
docker-compose up -d
```

### Testing Fresh Installation
To test a completely fresh installation (deletes all existing data and reinitializes):
1. Add to your docker-compose.yml under the service:
   ```yaml
   environment:
     - FORCE_FRESH_INIT=true
   ```
2. Run `docker-compose up -d`
3. Remove the environment variable after testing to prevent accidental data loss.

**Warning:** This will delete all existing databases and data! Use only for testing.

### Data Persistence
Docker Compose automatically creates persistent data directories:
- **`data/`** - User accounts, permissions, and system settings (auto-created)
- **`dbs/`** - Individual user databases (one per database you create, auto-created)
- **Your data is automatically preserved between deployments!**

## Security Features

- **Forced Password Change**: Default admin credentials require immediate password update
- **Data Isolation**: Complete separation between different user databases
- **Secure Authentication**: Session-based authentication with automatic timeouts
- **Input Validation**: All user inputs are properly sanitized
- **Admin Controls**: Granular permissions and access control

## Technical Details

- **Frontend:** React 19 + Mantine 7 + TypeScript + Vite
- **Backend:** Python Flask with session management
- **Database:** SQLite with database-level isolation
- **Architecture:** Multi-SQLite database system with access control
- **Deployment:** Docker Compose with persistent volumes
- **Icons:** Tabler Icons (70+ categories)

---

**Ready to organize your finances securely? Get started with Bills, Bills, Bills!**
