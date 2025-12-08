print("Starting application.py")
from flask import Flask, request, jsonify, send_from_directory, session, g
import sqlite3
import datetime
import os
import hashlib
import secrets
import json
import calendar
from flask_cors import CORS
from datetime import date, timedelta
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session or session['role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function


app = Flask(__name__, static_folder=None)
app.secret_key = secrets.token_hex(32)  # For session management
CORS(app)  # Enable CORS for the frontend

# Database configuration - use environment variables or Docker defaults
DATABASE_DIR = os.environ.get('DATABASE_DIR', '/app/dbs')
MASTER_DB = os.environ.get('MASTER_DB', '/app/data/master.db')

# Force fresh init if environment variable is set
if os.environ.get('FORCE_FRESH_INIT', 'false').lower() == 'true':
    print("Force fresh init enabled - deleting existing databases")
    import glob
    for db_file in glob.glob(os.path.join(DATABASE_DIR, '*.db')):
        os.remove(db_file)
        print(f"Deleted {db_file}")
    if os.path.exists(MASTER_DB):
        os.remove(MASTER_DB)
        print(f"Deleted {MASTER_DB}")

print("Starting Flask application initialization...")

# Create directories if they don't exist (important for new deployments)
print(f"Ensuring database directories exist...")
os.makedirs(DATABASE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MASTER_DB), exist_ok=True)

# Check write permissions
print(f"Checking write permissions for master DB dir: {os.path.dirname(MASTER_DB)}")
if os.access(os.path.dirname(MASTER_DB), os.W_OK):
    print("✅ Master DB directory is writable")
else:
    print("❌ Master DB directory is NOT writable")

print(f"Checking write permissions for DBS dir: {DATABASE_DIR}")
if os.access(DATABASE_DIR, os.W_OK):
    print("✅ DBS directory is writable")
else:
    print("❌ DBS directory is NOT writable")

# Test file creation
master_test_file = os.path.join(os.path.dirname(MASTER_DB), 'test.txt')
try:
    with open(master_test_file, 'w') as f:
        f.write('test')
    print("✅ Successfully wrote test file to master DB dir")
    os.remove(master_test_file)
except Exception as e:
    print(f"❌ Failed to write test file to master DB dir: {str(e)}")

dbs_test_file = os.path.join(DATABASE_DIR, 'test.txt')
try:
    with open(dbs_test_file, 'w') as f:
        f.write('test')
    print("✅ Successfully wrote test file to DBS dir")
    os.remove(dbs_test_file)
except Exception as e:
    print(f"❌ Failed to write test file to DBS dir: {str(e)}")

# AUTO-INITIALIZE IF FRESH DEPLOYMENT
import time
time.sleep(1)  # Give mounts time to settle

# Check if databases need initialization (check for tables instead of file existence)
print("Checking if databases need initialization...")

def needs_init(db_path, table_name):
    if not os.path.exists(db_path):
        return True
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        result = cursor.fetchone()
        conn.close()
        return result is None
    except Exception as e:
        print(f"Error checking database {db_path}: {str(e)}")
        return True

master_needs_init = needs_init(MASTER_DB, 'users')
personal_needs_init = needs_init(os.path.join(DATABASE_DIR, "personal.db"), 'bills')

if master_needs_init or personal_needs_init:
    print("Initialization needed! Auto-initializing databases...")

    # Populate the databases
    try:
        # Initialize master DB
        master_db = sqlite3.connect(MASTER_DB)
        print(f"✅ Connected to master DB at {MASTER_DB}")
        master_db.row_factory = sqlite3.Row

        if master_needs_init:
            master_db.execute('''CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                password_change_required BOOLEAN DEFAULT FALSE
            )''')
            print("✅ Created users table in master DB")

            master_db.execute('''CREATE TABLE databases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                description TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            print("✅ Created databases table in master DB")

            master_db.execute('''CREATE TABLE user_database_access (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id),
                database_id INTEGER REFERENCES databases(id),
                UNIQUE(user_id, database_id)
            )''')
            print("✅ Created user_database_access table in master DB")

            # Create default admin user
            admin_hash = hashlib.sha256("password".encode()).hexdigest()
            master_db.execute("INSERT INTO users (username, password_hash, role, password_change_required) VALUES (?, ?, ?, ?)",
                             ("admin", admin_hash, "admin", True))
            print("✅ Created default admin user")

            # Create single empty 'personal' database entry
            master_db.execute("INSERT INTO databases (name, display_name, description) VALUES (?, ?, ?)",
                             ("personal", "Personal Finances", "Personal bills and expenses"))
            print("✅ Created personal database entry in master DB")

        # Initialize personal database if needed
        personal_db_path = os.path.join(DATABASE_DIR, "personal.db")
        personal_db = sqlite3.connect(personal_db_path)

        if personal_needs_init:
            personal_db.execute('''CREATE TABLE bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                amount DECIMAL(10,2),
                varies BOOLEAN DEFAULT FALSE,
                frequency TEXT CHECK(frequency IN ('monthly', 'quarterly', 'yearly', 'bi-weekly', 'weekly', 'custom')) DEFAULT 'monthly',
                frequency_type TEXT DEFAULT 'simple',
                frequency_config TEXT DEFAULT '{}',
                next_due DATE NOT NULL,
                auto_payment BOOLEAN DEFAULT FALSE,
                paid BOOLEAN DEFAULT FALSE,
                archived BOOLEAN DEFAULT FALSE,
                icon TEXT DEFAULT 'payment',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            print("✅ Created bills table in personal DB")

            personal_db.execute('''CREATE TABLE payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bill_id INTEGER REFERENCES bills(id),
                amount DECIMAL(10,2),
                payment_date DATE DEFAULT CURRENT_TIMESTAMP
            )''')
            print("✅ Created payments table in personal DB")

        personal_db.commit()
        personal_db.close()

        # Ensure admin user exists (may have been deleted or database partially initialized)
        admin_row = master_db.execute('SELECT id FROM users WHERE username = ?', ('admin',)).fetchone()
        if admin_row is None:
            admin_hash = hashlib.sha256("password".encode()).hexdigest()
            master_db.execute("INSERT INTO users (username, password_hash, role, password_change_required) VALUES (?, ?, ?, ?)",
                             ("admin", admin_hash, "admin", True))
            master_db.commit()
            admin_row = master_db.execute('SELECT id FROM users WHERE username = ?', ('admin',)).fetchone()
            print("✅ Created missing admin user")

        # Grant admin access to personal database (always ensure this)
        admin_id = admin_row[0]
        try:
            master_db.execute('INSERT INTO user_database_access (user_id, database_id) VALUES (?, (SELECT id FROM databases WHERE name = ?))',
                             (admin_id, "personal"))
            print("✅ Granted admin access to personal database")
        except sqlite3.IntegrityError:
            print("Admin already has access to personal database")

        master_db.commit()
        master_db.close()

        print("✅ Database initialization complete!")
        print("📝 Admin login: admin/password")
        print("🔒 Password change required on first login")

    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
else:
    print("Databases already initialized, skipping auto-init")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_client_dir():
    """Get the client directory - dist for production, client for development"""
    # Check for production build first
    dist_dir = os.path.join(os.path.dirname(__file__), '..', 'client', 'dist')
    if os.path.exists(dist_dir) and os.path.isfile(os.path.join(dist_dir, 'index.html')):
        return dist_dir
    # Fall back to client directory for development
    return os.path.join(os.path.dirname(__file__), '..', 'client')

@app.route('/')
def index():
    return send_from_directory(get_client_dir(), 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    client_dir = get_client_dir()
    # Try to serve the exact path first
    full_path = os.path.join(client_dir, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(client_dir, path)
    # For SPA routing, serve index.html for non-file paths
    return send_from_directory(client_dir, 'index.html')

# Ensure directories exist
os.makedirs(DATABASE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MASTER_DB), exist_ok=True)

def get_master_db():
    """Get connection to master database containing users and database access"""
    db = sqlite3.connect(MASTER_DB)
    db.row_factory = sqlite3.Row

    # Apply migrations to master database
    apply_master_migrations(db)

    return db

def apply_master_migrations(db):
    """Apply migrations to master database"""
    try:
        # Add password_change_required column if it doesn't exist
        db.execute("ALTER TABLE users ADD COLUMN password_change_required BOOLEAN DEFAULT FALSE")
        db.commit()
        print("Added password_change_required column to users table")
    except sqlite3.OperationalError:
        # Column likely already exists, ignore
        pass

    try:
        # Add change_token column if it doesn't exist
        db.execute("ALTER TABLE users ADD COLUMN change_token TEXT")
        db.commit()
        print("Added change_token column to users table")
    except sqlite3.OperationalError:
        # Column likely already exists, ignore
        pass

def get_db(db_name=None):
    """Get connection to specific user database"""
    if db_name is None:
        if 'db_name' not in session:
            raise ValueError("No database selected. Please ensure your account has access to at least one database, then log out and log back in.")
        db_name = session['db_name']

    # Sanitize db_name to prevent directory traversal
    if not db_name.replace('_', '').replace('-', '').isalnum():
        raise ValueError("Invalid database name")

    db_path = os.path.join(DATABASE_DIR, f"{db_name}.db")
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row

    # Apply database migrations
    apply_database_migrations(db)

    return db

def calculate_next_due_date(current_due, frequency, frequency_type='simple', frequency_config=None):
    """Calculate the next due date based on frequency settings"""
    if frequency_config is None:
        frequency_config = {}
    
    current_date = datetime.date.fromisoformat(current_due) if isinstance(current_due, str) else current_due
    
    if frequency == 'weekly':
        return current_date + timedelta(days=7)
    
    elif frequency == 'bi-weekly':
        return current_date + timedelta(days=14)
    
    elif frequency == 'monthly':
        if frequency_type == 'specific_dates' and 'dates' in frequency_config:
            # Handle 1st & 15th or other specific monthly dates
            dates = frequency_config['dates']  # e.g., [1, 15]
            current_day = current_date.day
            
            # Find next date in the same month
            next_dates = [d for d in dates if d > current_day]
            if next_dates:
                # Next date is in the same month
                next_day = min(next_dates)
                try:
                    return current_date.replace(day=next_day)
                except ValueError:
                    # Day doesn't exist in current month, go to next month
                    pass
            
            # Go to next month, use first date
            next_month = current_date.month + 1
            next_year = current_date.year
            if next_month > 12:
                next_month = 1
                next_year += 1
            
            next_day = min(dates)
            # Handle months with fewer days
            max_day = calendar.monthrange(next_year, next_month)[1]
            next_day = min(next_day, max_day)
            
            return datetime.date(next_year, next_month, next_day)
        else:
            # Standard monthly - same day next month
            month = current_date.month + 1
            year = current_date.year
            if month > 12:
                month = 1
                year += 1
            day = min(current_date.day, calendar.monthrange(year, month)[1])
            return datetime.date(year, month, day)
    
    elif frequency == 'quarterly':
        month = current_date.month + 3
        year = current_date.year
        if month > 12:
            month -= 12
            year += 1
        day = min(current_date.day, calendar.monthrange(year, month)[1])
        return datetime.date(year, month, day)
    
    elif frequency == 'yearly':
        try:
            return current_date.replace(year=current_date.year + 1)
        except ValueError:
            # Handle leap year edge case (Feb 29)
            return current_date.replace(year=current_date.year + 1, day=28)
    
    elif frequency == 'custom' and frequency_type == 'multiple_weekly':
        # Multiple times per week
        days_of_week = frequency_config.get('days', [])  # e.g., [1, 3, 5] for Mon, Wed, Fri
        if not days_of_week:
            return current_date + timedelta(days=7)  # Fallback to weekly
        
        current_weekday = current_date.weekday()  # 0=Monday, 6=Sunday
        
        # Find next occurrence
        next_days = [d for d in days_of_week if d > current_weekday]
        if next_days:
            # Next occurrence is this week
            days_ahead = min(next_days) - current_weekday
            return current_date + timedelta(days=days_ahead)
        else:
            # Next occurrence is next week
            days_ahead = 7 - current_weekday + min(days_of_week)
            return current_date + timedelta(days=days_ahead)
    
    # Fallback to monthly
    return current_date + timedelta(days=30)

def apply_database_migrations(db):
    """Apply database schema migrations"""
    # Migration 1: Add icon column
    try:
        db.execute("ALTER TABLE bills ADD COLUMN icon TEXT DEFAULT 'payment'")
        print("Added icon column to bills table")
        db.commit()
    except sqlite3.OperationalError:
        # Column likely already exists, ignore
        pass
    
    # Migration 2: Add enhanced frequency support
    try:
        db.execute("ALTER TABLE bills ADD COLUMN frequency_type TEXT DEFAULT 'simple'")
        db.execute("ALTER TABLE bills ADD COLUMN frequency_config TEXT DEFAULT '{}'")
        print("Added enhanced frequency columns to bills table")
        db.commit()
    except sqlite3.OperationalError:
        # Columns likely already exist, ignore
        pass
    
    # Migration 3: Create schema_version table for tracking migrations
    try:
        db.execute('''CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT
        )''')
        
        # Check current version
        current_version = db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]
        if current_version is None:
            # First time setup - mark as version 3 (current)
            db.execute('INSERT INTO schema_version (version, description) VALUES (?, ?)', 
                      (3, 'Enhanced frequency support and migration tracking'))
            print("Initialized schema version tracking at version 3")
        
        db.commit()
    except sqlite3.OperationalError as e:
        print(f"Migration error: {e}")
        pass

@app.before_request
def create_table():
    pass  # We'll create on app start

@app.route('/bills', methods=['GET'])
@login_required
def get_bills():
    db = get_db()
    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    if include_archived:
        # Get only the most recent entry per bill name (highest id = most recent)
        cur = db.execute("""
            SELECT b.* FROM bills b
            INNER JOIN (
                SELECT name, MAX(id) as max_id FROM bills GROUP BY name
            ) latest ON b.id = latest.max_id
            ORDER BY b.archived, b.next_due
        """)
    else:
        cur = db.execute("SELECT * FROM bills WHERE archived = 0 ORDER BY next_due")
    bills = [dict(bill) for bill in cur.fetchall()]
    for bill in bills:
        if bill['varies']:
            cur = db.execute("SELECT AVG(amount) FROM payments WHERE bill_id IN (SELECT id FROM bills WHERE name = ? AND archived = 1)", (bill['name'],))
            avg = cur.fetchone()[0] or 0
            bill['avg_amount'] = avg
    return jsonify(bills)

@app.route('/bills', methods=['POST'])
@login_required
def add_bill():
    try:
        data = request.get_json()
        name = data.get('name')
        amount = data.get('amount') if not data.get('varies', False) else None
        varies = data.get('varies', False)
        frequency = data.get('frequency', 'monthly')
        frequency_type = data.get('frequency_type', 'simple')
        frequency_config = json.dumps(data.get('frequency_config', {}))
        next_due = data.get('next_due')
        auto_payment = data.get('auto_payment', False)
        icon = data.get('icon', 'payment')
        
        db = get_db()
        db.execute('INSERT INTO bills (name, amount, varies, frequency, frequency_type, frequency_config, next_due, auto_payment, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                   (name, amount, varies, frequency, frequency_type, frequency_config, next_due, auto_payment, icon))
        db.commit()
        return jsonify({'message': 'Bill added'}), 201
    except Exception as e:
        print(f"Error in add_bill: {e}")
        return jsonify({'error': str(e)}), 400

@app.route('/bills/<int:id>', methods=['PUT'])
@login_required
def update_bill(id):
    try:
        data = request.get_json()
        name = data.get('name')
        amount = data.get('amount')
        frequency = data.get('frequency')
        frequency_type = data.get('frequency_type')
        frequency_config = data.get('frequency_config')
        next_due = data.get('next_due')
        auto_payment = data.get('auto_payment')
        varies = data.get('varies')
        icon = data.get('icon')
        
        db = get_db()
        fields = []
        values = []
        if name is not None: fields.append('name = ?'); values.append(name)
        if amount is not None: fields.append('amount = ?'); values.append(amount)
        if frequency is not None: fields.append('frequency = ?'); values.append(frequency)
        if frequency_type is not None: fields.append('frequency_type = ?'); values.append(frequency_type)
        if frequency_config is not None: fields.append('frequency_config = ?'); values.append(json.dumps(frequency_config))
        if next_due is not None: fields.append('next_due = ?'); values.append(next_due)
        if auto_payment is not None: fields.append('auto_payment = ?'); values.append(auto_payment)
        if varies is not None: fields.append('varies = ?'); values.append(varies)
        if icon is not None: fields.append('icon = ?'); values.append(icon)
        values.append(id)
        if fields:
            db.execute(f'UPDATE bills SET {", ".join(fields)} WHERE id = ?', values)
            db.commit()
        return jsonify({'message': 'Bill updated'})
    except Exception as e:
        print(f"Error in update_bill: {e}")
        return jsonify({'error': str(e)}), 400

@app.route('/bills/<int:id>', methods=['DELETE'])
@login_required
def archive_bill(id):
    db = get_db()
    db.execute('UPDATE bills SET archived = 1 WHERE id = ?', (id,))
    db.commit()
    return jsonify({'message': 'Bill archived'})

@app.route('/bills/<int:id>/unarchive', methods=['POST'])
@login_required
def unarchive_bill(id):
    db = get_db()
    db.execute('UPDATE bills SET archived = 0 WHERE id = ?', (id,))
    db.commit()
    return jsonify({'message': 'Bill unarchived'})

@app.route('/bills/<int:id>/permanent', methods=['DELETE'])
@login_required
def delete_bill_permanent(id):
    """Permanently delete a bill and all its payment history"""
    db = get_db()
    # Get the bill name first for deleting all related bills
    bill = db.execute('SELECT name FROM bills WHERE id = ?', (id,)).fetchone()
    if not bill:
        return jsonify({'error': 'Bill not found'}), 404

    bill_name = bill['name']

    # Get all bill IDs with this name (for deleting payments)
    bill_ids = db.execute('SELECT id FROM bills WHERE name = ?', (bill_name,)).fetchall()

    # Delete all payments for these bill IDs
    for b in bill_ids:
        db.execute('DELETE FROM payments WHERE bill_id = ?', (b['id'],))

    # Delete all bill instances with this name (including archived ones)
    db.execute('DELETE FROM bills WHERE name = ?', (bill_name,))

    db.commit()
    return jsonify({'message': 'Bill and payment history permanently deleted'})

@app.route('/bills/<int:id>/pay', methods=['POST'])
@login_required
def pay_bill(id):
    try:
        data = request.get_json()
        amount = data['amount']
        advance_due = data.get('advance_due', True)
        db = get_db()
        
        # Get bill first
        bill = db.execute('SELECT * FROM bills WHERE id = ?', (id,)).fetchone()
        if not bill or bill['archived']:
            db.close()
            return jsonify({'error': 'Bill not found'}), 404

        # Add payment
        payment_date = datetime.date.today().isoformat()
        db.execute('INSERT INTO payments (bill_id, amount, payment_date) VALUES (?, ?, ?)', (id, amount, payment_date))

        if advance_due:
            # Archive current
            db.execute('UPDATE bills SET archived = 1 WHERE id = ?', (id,))

            # Calculate next due date using enhanced logic
            frequency_config_str = bill['frequency_config'] if 'frequency_config' in bill.keys() and bill['frequency_config'] else '{}'
            frequency_config = json.loads(frequency_config_str)
            frequency_type = bill['frequency_type'] if 'frequency_type' in bill.keys() and bill['frequency_type'] else 'simple'
            
            next_due_date = calculate_next_due_date(
                bill['next_due'], 
                bill['frequency'], 
                frequency_type,
                frequency_config
            )

            # Add new bill with same configuration
            db.execute('INSERT INTO bills (name, amount, varies, frequency, frequency_type, frequency_config, next_due, auto_payment, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                       (bill['name'], bill['amount'], bill['varies'], bill['frequency'], 
                        frequency_type, frequency_config_str,
                        next_due_date.isoformat(), bill['auto_payment'], bill['icon']))
        
        db.commit()
        db.close()
        return jsonify({'message': 'Payment recorded' + ( ' and recurring added' if advance_due else '')}), 200
        
    except Exception as e:
        print(f"Error in pay_bill: {e}")
        if 'db' in locals():
            try:
                db.close()
            except:
                pass
        return jsonify({'error': str(e)}), 500

@app.route('/bills/<string:name>/payments', methods=['GET'])
@login_required
def get_payments(name):
    try:
        db = get_db()
        cur = db.execute("""
            SELECT p.id, p.amount, p.payment_date
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE b.name = ?
            ORDER BY p.payment_date DESC
        """, (name,))
        payments = [dict(row) for row in cur.fetchall()]
        db.close()
        return jsonify(payments)
    except Exception as e:
        print(f"Error in get_payments: {e}")
        if 'db' in locals():
            db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/payments/<int:id>', methods=['PUT'])
@login_required
def update_payment(id):
    data = request.get_json()
    amount = data.get('amount')
    payment_date = data.get('payment_date')
    db = get_db()
    db.execute('UPDATE payments SET amount = ?, payment_date = ? WHERE id = ?', (amount, payment_date, id))
    db.commit()
    return jsonify({'message': 'Payment updated'})

@app.route('/payments/<int:id>', methods=['DELETE'])
@login_required
def delete_payment(id):
    db = get_db()
    db.execute('DELETE FROM payments WHERE id = ?', (id,))
    db.commit()
    return jsonify({'message': 'Payment deleted'})

@app.route('/api/payments/all', methods=['GET'])
@login_required
def get_all_payments():
    """Get all payments with bill names for the payments view"""
    try:
        db = get_db()
        cur = db.execute("""
            SELECT
                p.id,
                p.amount,
                p.payment_date,
                b.name as bill_name,
                b.icon as bill_icon
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            ORDER BY p.payment_date DESC
        """)
        payments = [dict(row) for row in cur.fetchall()]
        db.close()
        return jsonify(payments)
    except Exception as e:
        print(f"Error in get_all_payments: {e}")
        if 'db' in locals():
            db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/bill/<string:name>/monthly', methods=['GET'])
@login_required
def get_bill_monthly_payments(name):
    """Get monthly payment totals for a specific bill"""
    try:
        db = get_db()
        cur = db.execute("""
            SELECT
                strftime('%Y', p.payment_date) as year,
                strftime('%m', p.payment_date) as month,
                SUM(p.amount) as total,
                COUNT(p.id) as count
            FROM payments p
            JOIN bills b ON p.bill_id = b.id
            WHERE b.name = ?
            GROUP BY strftime('%Y-%m', p.payment_date)
            ORDER BY year DESC, month DESC
            LIMIT 12
        """, (name,))
        results = cur.fetchall()

        monthly_data = []
        for row in results:
            monthly_data.append({
                'month': f"{row['year']}-{row['month']}",
                'total': row['total'],
                'count': row['count']
            })

        db.close()
        return jsonify(monthly_data)
    except Exception as e:
        print(f"Error in get_bill_monthly_payments: {e}")
        if 'db' in locals():
            db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/monthly', methods=['GET'])
@login_required
def get_monthly_payments():
    """Get payment totals grouped by month"""
    try:
        db = get_db()
        # Get all payments with their dates, grouped by year-month
        cur = db.execute("""
            SELECT
                strftime('%Y', payment_date) as year,
                strftime('%m', payment_date) as month,
                SUM(amount) as total
            FROM payments
            GROUP BY strftime('%Y-%m', payment_date)
            ORDER BY year DESC, month DESC
        """)
        results = cur.fetchall()

        # Convert to dict keyed by "YYYY-MM"
        monthly_totals = {}
        for row in results:
            key = f"{row['year']}-{row['month']}"
            monthly_totals[key] = row['total']

        db.close()
        return jsonify(monthly_totals)
    except Exception as e:
        print(f"Error in get_monthly_payments: {e}")
        if 'db' in locals():
            db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/debug-db')
def debug_db():
    """Debug route to check database contents"""
    try:
        master_db = get_master_db()
        users = master_db.execute('SELECT id, username, password_hash, role FROM users').fetchall()
        dbs = master_db.execute('SELECT * FROM databases').fetchall()
        access = master_db.execute('SELECT * FROM user_database_access').fetchall()

        result = {
            'users': [dict(u) for u in users],
            'databases': [dict(d) for d in dbs],
            'access': [dict(a) for a in access]
        }

        # Remove password hashes from output for security
        for user in result['users']:
            user['password_hash'] = user['password_hash'][:10] + '...'

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        print(f"Login attempt: {username}")  # Debug log

        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400

        # Use master database for authentication
        master_db = get_master_db()
        user = master_db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()

        print(f"User found: {user is not None}")  # Debug log
        if user:
            stored_hash = user['password_hash']
            input_hash = hashlib.sha256(password.encode()).hexdigest()
            print(f"Stored hash: {stored_hash}")
            print(f"Input hash: {input_hash}")
            print(f"Match: {stored_hash == input_hash}")

        if user and user['password_hash'] == hashlib.sha256(password.encode()).hexdigest():
            # Check if password change is required (for default admin account)
            requires_change = user['password_change_required'] if 'password_change_required' in user.keys() else False

            # Set password change required for default admin user
            if username == 'admin' and user['password_hash'] == hashlib.sha256("password".encode()).hexdigest():
                master_db.execute('UPDATE users SET password_change_required = ? WHERE id = ?', (True, user['id']))
                master_db.commit()
                requires_change = True

            print(f"Login successful for user: {username}")  # Debug log

            response = {
                'message': 'Login successful',
                'role': user['role'],
                'password_change_required': requires_change
            }

            if requires_change:
                # Generate change token
                change_token = secrets.token_hex(32)
                master_db.execute('UPDATE users SET change_token = ? WHERE id = ?', (change_token, user['id']))
                master_db.commit()
                response['user_id'] = user['id']
                response['change_token'] = change_token
            else:
                # Set session only if no change required
                session['user_id'] = user['id']
                session['role'] = user['role']

                # Provide databases
                accessible_dbs = master_db.execute('''
                    SELECT d.name, d.display_name, d.description
                    FROM databases d
                    JOIN user_database_access uda ON d.id = uda.database_id
                    WHERE uda.user_id = ?
                ''', (user['id'],)).fetchall()
                
                # Set default database (first available database)
                if accessible_dbs:
                    session['db_name'] = accessible_dbs[0]['name']
                else:
                    # Warn if user has no database access
                    response['warning'] = 'Your account has no database access. Please contact an administrator to grant you access to a database.'

                response['databases'] = [dict(db) for db in accessible_dbs]

            return jsonify(response), 200
        else:
            print(f"Login failed for user: {username}")  # Debug log
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Login error: {e}")  # Debug log
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Login failed'}), 500


@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logout successful'}), 200

@app.route('/me', methods=['GET'])
@login_required
def get_me():
    master_db = get_master_db()
    # Get user's accessible databases
    accessible_dbs = master_db.execute('''
        SELECT d.name, d.display_name, d.description
        FROM databases d
        JOIN user_database_access uda ON d.id = uda.database_id
        WHERE uda.user_id = ?
    ''', (session['user_id'],)).fetchall()

    accessible_dbs = [dict(db) for db in accessible_dbs]

    return jsonify({
        'role': session['role'],
        'current_db': session.get('db_name'),
        'databases': accessible_dbs
    })

# Database selection
@app.route('/select-db/<string:db_name>', methods=['POST'])
@login_required
def select_database(db_name):
    """Select which database to work with for the session"""
    master_db = get_master_db()

    # Verify user has access to this database
    access = master_db.execute('''
        SELECT 1 FROM databases d
        JOIN user_database_access uda ON d.id = uda.database_id
        JOIN users u ON uda.user_id = u.id
        WHERE u.id = ? AND d.name = ?
    ''', (session['user_id'], db_name)).fetchone()

    if not access:
        return jsonify({'error': 'Access denied to database'}), 403

    session['db_name'] = db_name
    return jsonify({'message': f'Database {db_name} selected'})

# Database management routes (Admin only)
@app.route('/databases', methods=['GET'])
@admin_required
def get_databases():
    """List all databases"""
    master_db = get_master_db()
    cur = master_db.execute("SELECT * FROM databases ORDER BY created_at DESC")
    databases = [dict(db) for db in cur.fetchall()]
    return jsonify(databases)

@app.route('/databases', methods=['POST'])
@admin_required
def create_database():
    """Create a new database"""
    data = request.get_json()
    name = data.get('name')
    display_name = data.get('display_name')
    description = data.get('description', '')

    if not name or not display_name:
        return jsonify({'error': 'Name and display name required'}), 400

    # Sanitize database name for filesystem
    if not name.replace('_', '').replace('-', '').isalnum():
        return jsonify({'error': 'Database name can only contain letters, numbers, underscores, and hyphens'}), 400

    master_db = get_master_db()
    try:
        # Add to master database
        master_db.execute('INSERT INTO databases (name, display_name, description) VALUES (?, ?, ?)',
                         (name, display_name, description))

        # Initialize the new database with schema
        db_path = os.path.join(DATABASE_DIR, f"{name}.db")
        db = sqlite3.connect(db_path)
        db.execute('''CREATE TABLE bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount DECIMAL(10,2),
            varies BOOLEAN DEFAULT FALSE,
            frequency TEXT CHECK(frequency IN ('monthly', 'quarterly', 'yearly', 'bi-weekly', 'weekly', 'custom')) DEFAULT 'monthly',
            frequency_type TEXT DEFAULT 'simple',
            frequency_config TEXT DEFAULT '{}',
            next_due DATE NOT NULL,
            auto_payment BOOLEAN DEFAULT FALSE,
            paid BOOLEAN DEFAULT FALSE,
            archived BOOLEAN DEFAULT FALSE,
            icon TEXT DEFAULT 'payment',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        db.execute('''CREATE TABLE payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER REFERENCES bills(id),
            amount DECIMAL(10,2),
            payment_date DATE DEFAULT CURRENT_TIMESTAMP
        )''')
        db.commit()
        db.close()

        # Grant admin access to the new database
        admin_user_id = master_db.execute('SELECT id FROM users WHERE role = ?', ('admin',)).fetchone()[0]
        master_db.execute('INSERT INTO user_database_access (user_id, database_id) VALUES (?, (SELECT id FROM databases WHERE name = ?))',
                         (admin_user_id, name))
        master_db.commit()

        return jsonify({'message': f'Database {display_name} created successfully'}), 201

    except sqlite3.IntegrityError:
        return jsonify({'error': 'Database name already exists'}), 400

@app.route('/databases/<int:db_id>/access', methods=['GET'])
@admin_required
def get_database_access(db_id):
    """Get users with access to a database"""
    master_db = get_master_db()
    cur = master_db.execute('''
        SELECT u.id, u.username, u.role
        FROM users u
        JOIN user_database_access uda ON u.id = uda.user_id
        WHERE uda.database_id = ?
    ''', (db_id,))
    users = [dict(user) for user in cur.fetchall()]
    return jsonify(users)

@app.route('/databases/<int:db_id>/access', methods=['POST'])
@admin_required
def grant_database_access(db_id):
    """Grant user access to a database"""
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'User ID required'}), 400

    master_db = get_master_db()
    try:
        master_db.execute('INSERT INTO user_database_access (user_id, database_id) VALUES (?, ?)',
                         (user_id, db_id))
        master_db.commit()
        return jsonify({'message': 'Access granted'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'User already has access'}), 400

@app.route('/databases/<int:db_id>/access/<int:user_id>', methods=['DELETE'])
@admin_required
def revoke_database_access(db_id, user_id):
    """Revoke user access to a database"""
    if user_id == session['user_id']:
        return jsonify({'error': 'Cannot revoke your own access'}), 400

    master_db = get_master_db()
    master_db.execute('DELETE FROM user_database_access WHERE user_id = ? AND database_id = ?',
                     (user_id, db_id))
    master_db.commit()
    return jsonify({'message': 'Access revoked'})

@app.route('/databases/<int:db_id>', methods=['DELETE'])
@admin_required
def delete_database(db_id):
    """Delete a database completely"""
    master_db = get_master_db()

    # Get database name before deletion
    db_record = master_db.execute('SELECT name FROM databases WHERE id = ?', (db_id,)).fetchone()
    if not db_record:
        return jsonify({'error': 'Database not found'}), 404

    db_name = db_record['name']

    # Check if any users (including admin) have access to this database
    access_count = master_db.execute('SELECT COUNT(*) FROM user_database_access WHERE database_id = ?', (db_id,)).fetchone()[0]
    has_access = access_count > 0

    try:
        # Always delete from user access (removes access for all users if they had it)
        master_db.execute('DELETE FROM user_database_access WHERE database_id = ?', (db_id,))

        # Delete database record
        master_db.execute('DELETE FROM databases WHERE id = ?', (db_id,))
        master_db.commit()

        # Delete the actual database file
        db_path = os.path.join(DATABASE_DIR, f"{db_name}.db")
        if os.path.exists(db_path):
            os.remove(db_path)

        return jsonify({
            'message': f'Database {db_name} deleted successfully',
            'access_removed': has_access  # Return whether access was removed
        }), 200

    except Exception as e:
        print(f"Error deleting database: {e}")
        master_db.rollback()
        return jsonify({'error': 'Failed to delete database'}), 500

@app.route('/users/<int:user_id>/databases', methods=['GET'])
@admin_required
def get_user_databases(user_id):
    """Get databases accessible to a specific user"""
    master_db = get_master_db()
    cur = master_db.execute('''
        SELECT d.id, d.name, d.display_name, d.description
        FROM databases d
        JOIN user_database_access uda ON d.id = uda.database_id
        WHERE uda.user_id = ?
    ''', (user_id,))
    databases = [dict(db) for db in cur.fetchall()]
    return jsonify(databases)

# Master database user management
@app.route('/users', methods=['GET'])
@admin_required
def get_users():
    master_db = get_master_db()
    cur = master_db.execute("SELECT id, username, role FROM users")
    users = [dict(user) for user in cur.fetchall()]
    return jsonify(users)

@app.route('/users', methods=['POST'])
@admin_required
def add_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')
    database_ids = data.get('database_ids', [])  # List of databases to grant access

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    master_db = get_master_db()
    try:
        # Create user
        cursor = master_db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                         (username, password_hash, role))
        user_id = cursor.lastrowid

        # Grant database access
        for db_id in database_ids:
            master_db.execute('INSERT INTO user_database_access (user_id, database_id) VALUES (?, ?)',
                             (user_id, db_id))

        master_db.commit()
        return jsonify({'message': 'User added'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/users/<int:id>', methods=['DELETE'])
@admin_required
def delete_user(id):
    if id == session['user_id']:
        return jsonify({'error': 'Cannot delete yourself'}), 400

    master_db = get_master_db()
    # Remove all database access first
    master_db.execute('DELETE FROM user_database_access WHERE user_id = ?', (id,))
    # Delete user
    master_db.execute("DELETE FROM users WHERE id = ?", (id,))
    master_db.commit()
    return jsonify({'message': 'User deleted'})

@app.route('/api/version', methods=['GET'])
def get_version():
    return jsonify({'version': '2.1', 'features': ['enhanced_frequencies', 'automated_migrations', 'auto_payments', 'zero_dollar_payments', 'payment_charts', 'all_payments_view']})

@app.route('/api/process-auto-payments', methods=['POST'])
@login_required
def process_auto_payments():
    """Process bills marked for auto-payment that are due"""
    try:
        db = get_db()
        today = datetime.date.today()
        
        # Find bills marked for auto-payment that are due or overdue
        auto_bills = db.execute('''
            SELECT * FROM bills 
            WHERE auto_payment = 1 
            AND archived = 0 
            AND date(next_due) <= date(?)
        ''', (today.isoformat(),)).fetchall()
        
        processed_count = 0
        
        for bill in auto_bills:
            try:
                # Use the bill amount, or 0 if it varies
                payment_amount = bill['amount'] if bill['amount'] is not None else 0
                
                # Add payment record
                db.execute('INSERT INTO payments (bill_id, amount, payment_date) VALUES (?, ?, ?)', 
                          (bill['id'], payment_amount, today.isoformat()))
                
                # Archive current bill
                db.execute('UPDATE bills SET archived = 1 WHERE id = ?', (bill['id'],))
                
                # Calculate next due date
                frequency_config_str = bill['frequency_config'] if 'frequency_config' in bill.keys() and bill['frequency_config'] else '{}'
                frequency_config = json.loads(frequency_config_str)
                frequency_type = bill['frequency_type'] if 'frequency_type' in bill.keys() and bill['frequency_type'] else 'simple'
                
                next_due_date = calculate_next_due_date(
                    bill['next_due'], 
                    bill['frequency'], 
                    frequency_type,
                    frequency_config
                )
                
                # Create new bill for next period
                db.execute('''INSERT INTO bills 
                    (name, amount, varies, frequency, frequency_type, frequency_config, next_due, auto_payment, icon) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (bill['name'], bill['amount'], bill['varies'], bill['frequency'], 
                     frequency_type, frequency_config_str,
                     next_due_date.isoformat(), bill['auto_payment'], bill['icon']))
                
                processed_count += 1
                print(f"Auto-processed payment for {bill['name']}: ${payment_amount}")
                
            except Exception as e:
                print(f"Error processing auto-payment for bill {bill['id']}: {e}")
                continue
        
        db.commit()
        db.close()
        
        return jsonify({
            'message': f'Processed {processed_count} auto-payments',
            'processed_count': processed_count
        }), 200
        
    except Exception as e:
        print(f"Error in process_auto_payments: {e}")
        if 'db' in locals():
            db.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/migration-status', methods=['GET'])
@admin_required
def get_migration_status():
    """Get migration status for all databases"""
    try:
        master_db = get_master_db()
        databases = master_db.execute('SELECT name FROM databases').fetchall()
        
        status = {}
        for db_row in databases:
            db_name = db_row['name']
            try:
                db = get_db(db_name)
                # Check if schema_version table exists
                tables = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'").fetchall()
                if tables:
                    version = db.execute('SELECT MAX(version) FROM schema_version').fetchone()[0]
                    migrations = db.execute('SELECT version, description, applied_at FROM schema_version ORDER BY version').fetchall()
                    status[db_name] = {
                        'current_version': version,
                        'migrations': [dict(m) for m in migrations]
                    }
                else:
                    status[db_name] = {'current_version': 'pre-migration', 'migrations': []}
                db.close()
            except Exception as e:
                status[db_name] = {'error': str(e)}
        
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/change-password', methods=['POST'])
def change_password():
    """Change user password with token for initial change"""
    data = request.get_json()
    user_id = data.get('user_id')
    change_token = data.get('change_token')
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    print(f"Change password attempt for user_id: {user_id}, change_token: {change_token[:10]}..., current_pw: {current_password[:2]}***, new_pw: {len(new_password)} chars")  # Debug log

    if not all([user_id, change_token, current_password, new_password]):
        return jsonify({'error': 'All fields are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters long'}), 400

    master_db = get_master_db()
    user = master_db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()

    print(f"User found: {user is not None}, change_token in user: {user['change_token'][:10] if user and 'change_token' in user.keys() and user['change_token'] else 'None'}")  # Debug log

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user['change_token'] != change_token:
        print(f"Token mismatch: expected {user['change_token']}, got {change_token}")  # Debug log
        return jsonify({'error': 'Invalid change token'}), 401

    if user['password_hash'] != hashlib.sha256(current_password.encode()).hexdigest():
        print(f"Password hash mismatch for user {user_id}")  # Debug log
        return jsonify({'error': 'Current password is incorrect'}), 401

    try:
        new_hash = hashlib.sha256(new_password.encode()).hexdigest()
        master_db.execute('UPDATE users SET password_hash = ?, password_change_required = ?, change_token = ? WHERE id = ?',
                         (new_hash, False, None, user_id))
        master_db.commit()

        # Now set the session
        session['user_id'] = user_id
        session['role'] = user['role']

        # Get accessible databases (same as login)
        accessible_dbs = master_db.execute('''
            SELECT d.name, d.display_name, d.description
            FROM databases d
            JOIN user_database_access uda ON d.id = uda.database_id
            WHERE uda.user_id = ?
        ''', (user_id,)).fetchall()
        
        # Set default database (first available database)
        if accessible_dbs:
            session['db_name'] = accessible_dbs[0]['name']

        print(f"Password changed successfully for user {user_id}")  # Debug log

        return jsonify({
            'message': 'Password changed successfully',
            'role': user['role'],
            'databases': [dict(db) for db in accessible_dbs]
        }), 200
    except Exception as e:
        print(f"Error changing password: {e}")  # Debug log
        import traceback
        traceback.print_exc()
        master_db.rollback()
        return jsonify({'error': f'Failed to change password: {str(e)}'}), 500

# Remove the /init-db endpoint as auto-init handles everything
if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG', 'false').lower() in ('true', '1', 'yes'))
