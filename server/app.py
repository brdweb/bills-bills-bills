from flask import Flask, request, jsonify, send_from_directory, session
import sqlite3
import datetime
import os
import hashlib
import secrets
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

DATABASE = 'bills.db'

def get_db():
    db = sqlite3.connect(DATABASE)
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

        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()

        print(f"User found: {user is not None}")  # Debug log
        if user:
            print(f"Stored hash: {user['password_hash']}")  # Debug log
            print(f"Input hash: {hashlib.sha256(password.encode()).hexdigest()}")  # Debug log

        if user and user['password_hash'] == hashlib.sha256(password.encode()).hexdigest():
            session['user_id'] = user['id']
            session['role'] = user['role']
            print(f"Login successful for user: {username}")  # Debug log
            return jsonify({'message': 'Login successful', 'role': user['role']}), 200
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
    return jsonify({'role': session['role']})

# User management routes
@app.route('/users', methods=['GET'])
@admin_required
def get_users():
    db = get_db()
    cur = db.execute("SELECT id, username, role FROM users")
    users = cur.fetchall()
    return jsonify([dict(user) for user in users])

@app.route('/users', methods=['POST'])
@admin_required
def add_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'user')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    db = get_db()
    try:
        db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                   (username, password_hash, role))
        db.commit()
        return jsonify({'message': 'User added'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/users/<int:id>', methods=['DELETE'])
@admin_required
def delete_user(id):
    if id == session['user_id']:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    db = get_db()
    db.execute("DELETE FROM users WHERE id = ?", (id,))
    db.commit()
    return jsonify({'message': 'User deleted'})

if __name__ == '__main__':
    # Create table on start
    db = sqlite3.connect(DATABASE)
    db.execute('''CREATE TABLE IF NOT EXISTS bills (
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
    db.execute('''CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER REFERENCES bills(id),
        amount DECIMAL(10,2),
        payment_date DATE DEFAULT CURRENT_TIMESTAMP
    )''')
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user'
    )''')

    # Add role column if not exists
    cursor = db.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'role' not in columns:
        db.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")

    # Add icon column if not exists
    cursor = db.execute("PRAGMA table_info(bills)")
    columns = [row[1] for row in cursor.fetchall()]
    if 'icon' not in columns:
        db.execute("ALTER TABLE bills ADD COLUMN icon TEXT DEFAULT 'payment'")

    # Create default admin user if not exists
    try:
        db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                   ("admin", hashlib.sha256("password".encode()).hexdigest(), "admin"))
    except sqlite3.IntegrityError:
        # Update role if exists
        db.execute("UPDATE users SET role = 'admin' WHERE username = 'admin'")
    db.commit()
    db.close()

    # Production settings
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)
