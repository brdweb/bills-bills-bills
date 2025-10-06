# 📊 Bills, Bills, Bills! Expense Tracker v0.1

A user-friendly web application for tracking recurring monthly expenses and payments. Inspired by Chronicle on MacOS.

## 🎯 What You Can Do

- **Track Bills**: Add monthly, quarterly, or yearly recurring expenses
- **Record Payments**: Log payments with automatic bill creation
- **View History**: See payment history for any bill
- **Customize Icons**: Choose from 44+ Material Design icons
- **User Accounts**: Admin login with user management
- **Responsive Design**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Method 1: Docker Compose (Easiest)

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
   docker run -d -p 5000:5000 bills-app:v0.1
   ```

3. **Open your browser** to: http://localhost:5000

### Method 3: Development Mode

For developers who want to modify the code:

1. **Install Python** (3.10 or higher)
2. **Install dependencies:**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

3. **Run locally:**
   ```bash
   python app.py
   ```

4. **Open your browser** to: http://localhost:5000

## 💡 How to Use

After logging in with admin/password:

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

### 👥 User Management (Admin Only)
1. Go to admin panel
2. Add/remove user accounts
3. Set admin privileges

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

### Docker Run

```bash
# Start application
docker run -d -p 5000:5000 --name bills-app bills-app:v0.1

# View logs
docker logs bills-app

# Stop and remove
docker stop bills-app
docker rm bills-app
```

### Data Persistence

Your data is stored in an SQLite database inside the container. To persist data between container restarts:

1. Create a data directory
2. Modify docker-compose.yml to uncomment the volume mount
3. Or run with: `docker run -v /host/path:/app bills-app:v0.1`

## 🔧 Advanced Configuration

### Environment Variables

- `FLASK_DEBUG=false`: Disable debug mode (production)
- `FLASK_DEBUG=true`: Enable debug mode (development only)

### Custom Port

Change the port in docker-compose.yml or use:
```bash
docker run -p 8080:5000 bills-app:v0.1
```

## ❓ Troubleshooting

### Can't access the app?
- Make sure Docker is running
- Check port 5000 isn't used by another application
- Try http://127.0.0.1:5000 instead of localhost

### Forgot admin password?
- Reset by rebuilding: `docker-compose down && docker-compose up --build`

### Need to restart?
```bash
docker-compose restart
```

## 🛡️ Security Notes

- Default admin credentials: admin/password (change in production!)
- Runs in production mode by default (debug disabled)
- All data stored locally (no cloud dependency)

## 📱 Features Overview

- ✅ Three-column responsive layout
- ✅ Material Design icons with search
- ✅ Recurring bill automation
- ✅ Payment history tracking
- ✅ User authentication system
- ✅ Admin panel for user management
- ✅ Mobile-friendly interface
- ✅ SQLite database (no setup required)
- ✅ Docker containerization
- ✅ Data persistence and backup

## 🏗️ Technical Details

**Frontend:** Vanilla JavaScript, Bulma CSS, Material Icons, HTML5  
**Backend:** Flask Python web framework with session management  
**Database:** SQLite with automatic schema migrations  
**Deployment:** Docker container ready for any environment  

**Database Tables:**
- `bills`: Active expenses with recurring logic
- `payments`: Payment transaction history
- `users`: User accounts and permissions

**API Endpoints:**
- `/` - Main application
- `/login` - User authentication
- `/bills` - Bill management (CRUD)
- `/bills/<id>/pay` - Record payments
- `/payments` - Payment history
- `/users` - Admin user management

---

**Ready to take control of your expenses? Get started with Bills Bills Bills today! 🎉**
