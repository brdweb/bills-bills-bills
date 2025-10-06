from flask import Flask, request, jsonify, send_from_directory, session, g
import sqlite3
import datetime
import os
import hashlib
import secrets
import json
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

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    client_dir = os.path.join(os.path.dirname(__file__), '..', 'client')
    return send_from_directory(client_dir, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    client_dir = os.path.join(os.path.dirname(__file__), '..', 'client')
    return send_from_directory(client_dir, path)

# Database configuration
DATABASE_DIR = os.path.join(os.path.dirname(__file__), 'dbs')
MASTER_DB = os.path.join(os.path.dirname(__file__), 'data', 'master.db')

# Ensure directories exist
os.makedirs(DATABASE_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MASTER_DB), exist_ok=True)

def get_master_db():
    """Get connection to master database containing users and database access"""
    db = sqlite3.connect(MASTER_DB)
    db.row_factory = sqlite3.Row
    return db

def get_db(db_name=None):
    """Get connection to specific user database"""
    if db_name is None:
        if 'db_name' not in session:
            raise ValueError("No database selected")
        db_name = session['db_name']

    # Sanitize db_name to prevent directory traversal
    if not db_name.replace('_', '').replace('-', '').isalnum():
        raise ValueError("Invalid database name")

    db_path = os.path.join(DATABASE_DIR, f"{db_name}.db")
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    return db

@app.before_request
def create_table():
    pass  # We'll create on app start

@app.route('/bills', methods=['GET'])
@login_required
def get_bills():
    db = get_db()
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
        next_due = data.get('next_due')
        auto_payment = data.get('auto_payment', False)
        db = get_db()
        icon = data.get('icon', 'payment')
        db.execute('INSERT INTO bills (name, amount, varies, frequency, next_due, auto_payment, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (name, amount, varies, frequency, next_due, auto_payment, icon))
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
def delete_bill(id):
    db = get_db()
    db.execute('UPDATE bills SET archived = 1 WHERE id = ?', (id,))
    db.commit()  # Archive instead of delete
    return jsonify({'message': 'Bill archived'})

@app.route('/bills/<int:id>/pay', methods=['POST'])
@login_required
def pay_bill(id):
    data = request.get_json()
    amount = data['amount']
    advance_due = data.get('advance_due', True)
    db = get_db()
    # Add payment
    payment_date = datetime.date.today().isoformat()
    db.execute('INSERT INTO payments (bill_id, amount, payment_date) VALUES (?, ?, ?)', (id, amount, payment_date))

    # Get bill
    bill = db.execute('SELECT * FROM bills WHERE id = ?', (id,)).fetchone()
    if not bill or bill['archived']:
        return jsonify({'message': 'Bill not found'})

    if advance_due:
        # Archive current
        db.execute('UPDATE bills SET archived = 1 WHERE id = ?', (id,))

        # Calculate next due
        next_due_date = datetime.date.fromisoformat(bill['next_due'])
        freq = bill['frequency']
        if freq == 'monthly':
            month = next_due_date.month + 1
            year = next_due_date.year
            if month > 12:
                month = 1
                year += 1
            day = min(next_due_date.day, 28)
            next_due_date = datetime.date(year, month, day)
        elif freq == 'quarterly':
            month = next_due_date.month + 3
            year = next_due_date.year
            if month > 12:
                month -= 12
                year += 1
            next_due_date = datetime.date(year, month, next_due_date.day)
        elif freq == 'yearly':
            next_due_date = datetime.date(next_due_date.year + 1, next_due_date.month, next_due_date.day)

        # Add new bill
        db.execute('INSERT INTO bills (name, amount, varies, frequency, next_due, auto_payment, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   (bill['name'], bill['amount'], bill['varies'], bill['frequency'], next_due_date.isoformat(), bill['auto_payment'], bill['icon']))
    db.commit()
    return jsonify({'message': 'Payment recorded' + ( ' and recurring added' if advance_due else '')}), 200

@app.route('/bills/<string:name>/payments', methods=['GET'])
@login_required
def get_payments(name):
    db = get_db()
    cur = db.execute("""
        SELECT p.id, p.amount, p.payment_date
        FROM payments p
        JOIN bills b ON p.bill_id = b.id
        WHERE b.name = ?
        ORDER BY p.payment_date DESC
    """, (name,))
    payments = [dict(row) for row in cur.fetchall()]
    return jsonify(payments)

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
            print(f"Stored hash: {user['password_hash']}")  # Debug log
            print(f"Input hash: {hashlib.sha256(password.encode()).hexdigest()}")  # Debug log

        if user and user['password_hash'] == hashlib.sha256(password.encode()).hexdigest():
            # Get user's accessible databases
            accessible_dbs = master_db.execute('''
                SELECT d.name, d.display_name, d.description
                FROM databases d
                JOIN user_database_access uda ON d.id = uda.database_id
                WHERE uda.user_id = ?
            ''', (user['id'],)).fetchall()

            accessible_dbs = [dict(db) for db in accessible_dbs]

            session['user_id'] = user['id']
            session['role'] = user['role']
            print(f"Login successful for user: {username}")  # Debug log
            return jsonify({
                'message': 'Login successful',
                'role': user['role'],
                'databases': accessible_dbs
            }), 200
        else:
            print(f"Login failed for user: {username}")  # Debug log
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"Login error: {e}")  # Debug log
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
            frequency TEXT CHECK(frequency IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
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
        master_db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                         (username, password_hash, role))

        user_id = master_db.lastrowid

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

if __name__ == '__main__':
    # Initialize master database
    master_db = get_master_db()
    master_db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user'
    )''')
    master_db.execute('''CREATE TABLE IF NOT EXISTS databases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    master_db.execute('''CREATE TABLE IF NOT EXISTS user_database_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        database_id INTEGER REFERENCES databases(id),
        UNIQUE(user_id, database_id)
    )''')

    # Create default admin user if not exists
    admin_hash = hashlib.sha256("password".encode()).hexdigest()
    try:
        master_db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                         ("admin", admin_hash, "admin"))
        print("Default admin user created")
    except sqlite3.IntegrityError:
        # Admin exists, that's fine
        pass

    # Create default 'personal' database if not exists
    try:
        master_db.execute("INSERT INTO databases (name, display_name, description) VALUES (?, ?, ?)",
                         ("personal", "Personal Finances", "Personal bills and expenses"))

        # Initialize personal database
        personal_db_path = os.path.join(DATABASE_DIR, "personal.db")
        personal_db = sqlite3.connect(personal_db_path)
        personal_db.execute('''CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount DECIMAL(10,2),
            varies BOOLEAN DEFAULT FALSE,
            frequency TEXT CHECK(frequency IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
            next_due DATE NOT NULL,
            auto_payment BOOLEAN DEFAULT FALSE,
            paid BOOLEAN DEFAULT FALSE,
            archived BOOLEAN DEFAULT FALSE,
            icon TEXT DEFAULT 'payment',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        personal_db.execute('''CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER REFERENCES bills(id),
            amount DECIMAL(10,2),
            payment_date DATE DEFAULT CURRENT_TIMESTAMP
        )''')
        personal_db.commit()
        personal_db.close()

        # Grant admin access to personal database
        admin_id = master_db.execute('SELECT id FROM users WHERE username = ?', ('admin',)).fetchone()[0]
        master_db.execute('INSERT INTO user_database_access (user_id, database_id) VALUES (?, (SELECT id FROM databases WHERE name = ?))',
                         (admin_id, "personal"))
        print("Default personal database created")
    except sqlite3.IntegrityError:
        # Personal database exists, that's fine
        pass

    master_db.commit()
    master_db.close()

    app.run(debug=True)
