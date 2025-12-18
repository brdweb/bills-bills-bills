from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import hashlib
import secrets

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

    # Email and verification (for SaaS registration)
    email = db.Column(db.String(255), unique=True, nullable=True)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    email_verification_token = db.Column(db.String(64), nullable=True)
    email_verification_expires = db.Column(db.DateTime, nullable=True)

    # Password reset
    password_reset_token = db.Column(db.String(64), nullable=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)

    # Trial tracking
    trial_ends_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    accessible_databases = db.relationship('Database', secondary=user_database_access, backref='users')

    def set_password(self, password):
        self.password_hash = hashlib.sha256(password.encode()).hexdigest()

    def check_password(self, password):
        return self.password_hash == hashlib.sha256(password.encode()).hexdigest()

    def generate_email_verification_token(self):
        """Generate a secure token for email verification (24 hour expiry)"""
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_expires = datetime.utcnow() + timedelta(hours=24)
        return self.email_verification_token

    def generate_password_reset_token(self):
        """Generate a secure token for password reset (1 hour expiry)"""
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        return self.password_reset_token

    def verify_email_token(self, token):
        """Verify the email verification token"""
        if not self.email_verification_token or not self.email_verification_expires:
            return False
        if self.email_verification_token != token:
            return False
        if datetime.utcnow() > self.email_verification_expires:
            return False
        return True

    def verify_password_reset_token(self, token):
        """Verify the password reset token"""
        if not self.password_reset_token or not self.password_reset_expires:
            return False
        if self.password_reset_token != token:
            return False
        if datetime.utcnow() > self.password_reset_expires:
            return False
        return True

    @property
    def is_email_verified(self):
        return self.email_verified_at is not None

    @property
    def is_trial_active(self):
        if not self.trial_ends_at:
            return False
        return datetime.utcnow() < self.trial_ends_at

    @property
    def has_active_subscription(self):
        """Check if user has an active subscription"""
        if not hasattr(self, 'subscription') or not self.subscription:
            return False
        return self.subscription.status in ('active', 'trialing')

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


class Subscription(db.Model):
    """Stores Stripe subscription information for billing"""
    __tablename__ = 'subscriptions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)

    # Stripe identifiers
    stripe_customer_id = db.Column(db.String(255), nullable=True)
    stripe_subscription_id = db.Column(db.String(255), nullable=True)

    # Plan info
    plan = db.Column(db.String(50), default='early_adopter')
    status = db.Column(db.String(50), default='trialing')  # trialing, active, canceled, past_due, unpaid

    # Billing dates
    trial_ends_at = db.Column(db.DateTime, nullable=True)
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    canceled_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = db.relationship('User', backref=db.backref('subscription', uselist=False))

    @property
    def is_active(self):
        """Check if subscription allows full access"""
        return self.status in ('active', 'trialing')

    @property
    def is_trialing(self):
        return self.status == 'trialing'

    @property
    def days_until_renewal(self):
        if not self.current_period_end:
            return None
        delta = self.current_period_end - datetime.utcnow()
        return max(0, delta.days)
