from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import hashlib

db = SQLAlchemy()

# Association table for User-Database access (Tenancy)
user_database_access = db.Table('user_database_access',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('database_id', db.Integer, db.ForeignKey('databases.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='user')
    password_change_required = db.Column(db.Boolean, default=False)
    change_token = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    accessible_databases = db.relationship('Database', secondary=user_database_access, backref='users')

    def set_password(self, password):
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def check_password(self, password):
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()

class Database(db.Model):
    __tablename__ = 'databases'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    bills = db.relationship('Bill', backref='database', lazy=True, cascade="all, delete-orphan")

class Bill(db.Model):
    __tablename__ = 'bills'
    id = db.Column(db.Integer, primary_key=True)
    database_id = db.Column(db.Integer, db.ForeignKey('databases.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=True)
    is_variable = db.Column(db.Boolean, default=False)
    frequency = db.Column(db.String(50), nullable=False) # monthly, weekly, etc.
    due_date = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    type = db.Column(db.String(20), default='expense') # expense or deposit
    account = db.Column(db.String(100))
    icon = db.Column(db.String(50))
    auto_pay = db.Column(db.Boolean, default=False)
    
    # Legacy/Advanced Frequency Support
    frequency_type = db.Column(db.String(20), default='simple')
    frequency_config = db.Column(db.Text, default='{}') # JSON string
    archived = db.Column(db.Boolean, default=False)
    
    category = db.Column(db.String(50))
    notes = db.Column(db.Text)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    payments = db.relationship('Payment', backref='bill', lazy=True, cascade="all, delete-orphan")

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey('bills.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.String(10), nullable=False) # YYYY-MM-DD
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class RefreshToken(db.Model):
    """Stores refresh tokens for JWT authentication (mobile apps)"""
    __tablename__ = 'refresh_tokens'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token_hash = db.Column(db.String(64), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Track device/client info for token management
    device_info = db.Column(db.String(255), nullable=True)

    # Relationship
    user = db.relationship('User', backref=db.backref('refresh_tokens', lazy=True))
