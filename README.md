# 💵 Bills, Bills, Bills! Expense Tracker v0.2

A **secure multi-user** web application for tracking recurring monthly expenses and payments with **complete data separation**. Inspired by Chronicle on MacOS.

## 🔥 What's New in v0.2
- **Enhanced Security**: Default admin password must be changed on first login
- **Improved Database Migrations**: Automatic handling of database schema updates
- **Production-Ready**: Optimized for deployment with persistent data

## 🎯 Features

- **🔐 Secure Access**: Forced password change for default admin accounts
- **👥 Multi-Database**: Complete data isolation between user groups
- **📊 Track Expenses**: Monthly, quarterly, or yearly recurring bills
- **💰 Payment Logging**: Record payments with automatic bill cycling
- **📚 Payment History**: Full history with edit/delete capabilities
- **👨‍💼 Admin Controls**: User and database management
- **🎨 Custom Icons**: 44+ Material Design icons
- **📱 Responsive**: Works on desktop, tablet, and mobile

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Web browser

### Run the Application

**Pull the latest release:**
```bash
docker pull ghcr.io/[your-username]/bills-bills-bills:v0.2
```

**Run with persistent data:**
```bash
mkdir data dbs  # Create directories for data persistence
docker run -d \
  --name bills-app \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/dbs:/app/dbs \
  ghcr.io/[your-username]/bills-bills-bills:v0.2
```

**Open your browser** and visit: http://localhost:5000

## 🔐 First Login

Login with default credentials:
- **Username:** `admin`
- **Password:** `password`

⚠️ **Security Notice:** You will be **required to change the password** on first login.

## 💡 How to Use

### 1. Database Selection
After login, select your database from the dropdown:
- **personal** - Your personal finances (default)

### 2. Add Your First Bill
1. Click the **"Add Bill"** button (➕)
2. Enter bill details:
   - Name: "Internet", "Rent", etc.
   - Amount: Fixed amount or check "Varies" for variable costs
   - Frequency: Monthly, Quarterly, or Yearly
   - Due date and optional auto-payment setting

### 3. Record Payments
1. Click **"Pay"** on any bill
2. Enter payment amount
3. Choose to advance due date automatically
4. Payment recorded! 🎉

### 4. View Payment History
1. Click on any bill's payment amount
2. View, edit, or delete payment records

## 👥 User & Database Management (Admin Only)

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

## 🛠️ Application Management

### Start Application
```bash
docker start bills-app
```

### View Logs
```bash
docker logs -f bills-app
```

### Stop Application
```bash
docker stop bills-app
```

### Update to New Version
```bash
docker pull ghcr.io/[your-username]/bills-bills-bills:v0.2
docker stop bills-app
docker rm bills-app
# Rerun the docker run command above
```

### Data Persistence
- **data/** directory: User accounts, permissions, and system settings
- **dbs/** directory: Individual user databases (one per database you create)
- **Never delete these directories if you want to keep your data!**

## 🚨 Security Features

- **🔒 Forced Password Change**: Default admin credentials require immediate password update
- **🛡️ Data Isolation**: Complete separation between different user databases
- **🔐 Secure Authentication**: Session-based authentication with automatic timeouts
- **📝 Input Validation**: All user inputs are properly sanitized
- **👮 Admin Controls**: Granular permissions and access control

## ❓ Troubleshooting

### Can't Access Admin Panel?
- Ensure you're logged in as an admin user
- Check that the Admin button appears after login

### Login Problems?
- Verify default credentials: `admin` / `password`
- If admin login succeeds, you may need to change the password first

### Data Loss?
- Check that volume mounts are working properly
- Ensure `data/` and `dbs/` directories exist and are writable

### Database Errors?
- Restart the application (`docker restart bills-app`)
- Check logs for detailed error messages
- Contact support if persistent issues occur

## 📞 Support

For technical issues, please check:
1. Application logs (`docker logs bills-app`)
2. Volume mount configurations
3. Docker Desktop status

## 🏗️ Technical Details

**Docker Image:** `ghcr.io/[your-username]/bills-bills-bills:v0.2`
**Architecture:** Multi-SQLite database system with access control
**Frontend:** Pure HTML/CSS/JavaScript (No frameworks)
**Backend:** Python Flask with session management
**Database:** SQLite with database-level isolation

---

**Ready to organize your finances securely? Get started with Bills, Bills, Bills! 🚀**
