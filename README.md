# 📊 Bills, Bills, Bills! Expense Tracker v0.1

A **multi-user** web application for tracking recurring monthly expenses and payments with **complete data separation**. Inspired by Chronicle on MacOS.

## 🎯 What You Can Do

- **Multi-Database Support**: Complete data isolation between user groups
- **Track Bills**: Add monthly, quarterly, or yearly recurring expenses
- **Record Payments**: Log payments with automatic bill creation
- **View History**: See payment history for any bill
- **User Management**: Admin controls for users and database access
- **Database Administration**: Create separate databases for different purposes
- **Customize Icons**: Choose from 44+ Material Design icons
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Method 1: Docker Compose (Easiest - Includes Persistent Storage)

1. **Install Docker** (if you haven't already)
2. **Clone or download** this repository
3. **Run the application:**
   ```bash
   docker-compose up -d
   ```

4. **Open your browser** to: http://localhost:5000

5. **Login with:**
   - Username: `admin`
   - Password: `password`

### Method 2: Docker Run

1. **Build the application:**
   ```bash
   docker build -t bills-app:v0.1 .
   ```

2. **Run the container:**
   ```bash
   docker run -d -p 5000:5000 -v ${PWD}/data:/app/data -v ${PWD}/dbs:/app/dbs bills-app:v0.1
   ```

3. **Open your browser** to: http://localhost:5000

## 💡 Using the Multi-User System

### After Login

Upon successful login, you'll see your available databases. The system includes:

- **personal**: Personal Finances (created by default)
- Additional databases as created by admin

### Database Selection

1. Click the **"Switch Database"** dropdown
2. Select the database you want to work with
3. All data entry and viewing will use that database

### Creating Databases (Admin Only)

Admins can create separate databases for different purposes:

1. Go to **Admin Panel** → **Database Management**
2. Click **"Create Database"**
3. Fill in:
   - Name: `family-finances`
   - Display Name: `Family Finances`
   - Description: `Shared family expenses`
4. Grant access to specific users

## 👥 User & Database Management

### Creating Users

1. Go to **Admin Panel** → **User Management**
2. Click **"Add User"**
3. Select which databases they can access
4. Assign admin privileges if needed

### Database Permissions

- Each user can be granted access to multiple databases
- Complete data isolation - users only see data from accessible databases
- Admin can create new databases and assign users

## 💡 How to Use (Within a Database)

After selecting a database:

### 📝 Adding a Bill
1. Click the **📝 Add Bill** button
2. Fill in bill details:
   - Name (e.g., "Electricity", "Internet")
   - Amount (or check "Varies" for variable amounts)
   - Frequency (Monthly, Quarterly, Yearly)
   - Next due date
   - Icons (search from dropdown)
   - Auto-payment checkbox

### 💰 Recording Payments
1. Click the **💸 Pay** button on any bill
2. Enter payment amount
3. Set next due date (optional)
4. Click "Record Payment"

### 📚 Viewing History
1. Click on any payment amount
2. See full payment history for that bill
3. Edit or delete payments if needed

## 🛠️ Application Management

### Docker Compose (Recommended)

```bash
# Start application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Update to new version
docker-compose pull && docker-compose up -d
```

### Persistent Data

The `docker-compose.yml` includes volume mounts for:
- `./dbs` - Individual user databases (SQLite files)
- `./data` - Master database (users and permissions)

**Keep these directories for data persistence!**

## 🔧 Architecture

### Database Structure

**Master Database** (`data/master.db`):
- `users` - User accounts and authentication
- `databases` - Available databases
- `user_database_access` - Permissions matrix

**User Databases** (`dbs/*.db`):
- `bills` - Bill entries and metadata
- `payments` - Payment transaction history

### Security Features

- **Data Isolation**: Complete separation between user databases
- **Access Control**: Granular database-level permissions
- **Session Management**: Secure authentication and authorization
- **Input Sanitization**: Database names and user inputs validated
- **Admin Controls**: Comprehensive user and database administration

## ❓ Troubleshooting

### Can't Create Database?
- Database names must be alphanumeric + underscores/hyphens only
- Each database name must be unique
- Admin privileges required

### No Databases Available?
- Contact admin to grant database access
- Default "personal" database should be available for admin

### Data Persistence Issues?
- Ensure volume mounts are working: `docker-compose.yml`
- Don't delete the `data/` and `dbs/` directories

## 🏗️ Technical Details

**Frontend:** Vanilla JavaScript, Bulma CSS, Material Icons, HTML5
**Backend:** Flask Python web framework with session management
**Database:** Multi-SQLite architecture with access control
**Deployment:** Docker container ready with persistent volumes

### API Endpoints

**Authentication:**
- `POST /login` - User login with database listing
- `POST /logout` - Session termination
- `GET /me` - Current session info

**Database Selection:**
- `POST /select-db/<name>` - Switch active database
- `GET /databases` - List all databases (admin)
- `POST /databases` - Create new database (admin)

**Data Operations:**
- `GET/POST /bills` - Bill management
- `PUT/DELETE /bills/<id>` - Update/delete bills
- `POST /bills/<id>/pay` - Record payments
- `GET /bills/<name>/payments` - Payment history

**Administration:**
- `GET/POST /users` - User management
- `GET /databases/<id>/access` - View database permissions
- `POST/DELETE /databases/<id>/access/<user_id>` - Grant/revoke access

---

**Ready to organize your finances with complete privacy and separation? Get started with Bills Bills Bills! 🎉**
