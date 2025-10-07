import sqlite3
import os
import hashlib

# Initialize master database
db_dir = '/app/data'
db_path = os.path.join(db_dir, 'master.db')
os.makedirs(db_dir, exist_ok=True)
os.makedirs('/app/dbs', exist_ok=True)

master_db = sqlite3.connect(db_path)
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
admin_hash = hashlib.sha256(b'password').hexdigest()
try:
    master_db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                     ('admin', admin_hash, 'admin'))
    print('Default admin user created')
except sqlite3.IntegrityError:
    print('Admin user already exists')

# Create default 'personal' database if not exists
try:
    master_db.execute("INSERT INTO databases (name, display_name, description) VALUES (?, ?, ?)",
                     ('personal', 'Personal Finances', 'Personal bills and expenses'))

    # Initialize personal database
    personal_db_path = '/app/dbs/personal.db'
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
                     (admin_id, 'personal'))
    print('Default personal database created')
except sqlite3.IntegrityError:
    print('Personal database already exists')

master_db.commit()
master_db.close()
print('Database initialization complete!')
