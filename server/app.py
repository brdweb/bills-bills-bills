import os
import secrets
import hashlib
import datetime
import logging
import json
import calendar
from datetime import date, timedelta
from functools import wraps

import jwt
from flask import Flask, request, jsonify, send_from_directory, session, g, Blueprint
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy import func, extract, desc

from models import db, User, Database, Bill, Payment, RefreshToken
from migration import migrate_sqlite_to_pg

# --- JWT Configuration ---
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32)))
JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

# --- Global Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Blueprints ---
api_bp = Blueprint('api', __name__)
api_v2_bp = Blueprint('api_v2', __name__, url_prefix='/api/v2')
spa_bp = Blueprint('spa', __name__)

# --- Decorators ---

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session: return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session or session['role'] != 'admin': return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

# --- JWT Helper Functions ---

def create_access_token(user_id, role):
    """Create a short-lived access token."""
    payload = {
        'user_id': user_id,
        'role': role,
        'type': 'access',
        'exp': datetime.datetime.utcnow() + JWT_ACCESS_TOKEN_EXPIRES,
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

def create_refresh_token(user_id, device_info=None):
    """Create a long-lived refresh token and store hash in database."""
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.datetime.utcnow() + JWT_REFRESH_TOKEN_EXPIRES

    refresh = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        device_info=device_info
    )
    db.session.add(refresh)
    db.session.commit()

    return token

def verify_access_token(token):
    """Verify and decode an access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') != 'access':
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_refresh_token(token):
    """Verify a refresh token against stored hash."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    refresh = RefreshToken.query.filter_by(token_hash=token_hash, revoked=False).first()
    if not refresh:
        return None
    if refresh.expires_at < datetime.datetime.utcnow():
        refresh.revoked = True
        db.session.commit()
        return None
    return refresh

def jwt_required(f):
    """Decorator for JWT-protected endpoints. Sets g.jwt_user_id and g.jwt_role."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid Authorization header'}), 401

        token = auth_header.split(' ')[1]
        payload = verify_access_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401

        g.jwt_user_id = payload['user_id']
        g.jwt_role = payload['role']

        # Get database from X-Database header for mobile clients
        db_name = request.headers.get('X-Database')
        if db_name:
            user = User.query.get(g.jwt_user_id)
            target_db = Database.query.filter_by(name=db_name).first()
            if target_db and target_db in user.accessible_databases:
                g.jwt_db_name = db_name
            else:
                return jsonify({'success': False, 'error': 'Access denied to database'}), 403
        else:
            g.jwt_db_name = None

        return f(*args, **kwargs)
    return decorated_function

def jwt_admin_required(f):
    """Decorator for JWT-protected admin-only endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Missing or invalid Authorization header'}), 401

        token = auth_header.split(' ')[1]
        payload = verify_access_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Invalid or expired token'}), 401

        if payload['role'] != 'admin':
            return jsonify({'success': False, 'error': 'Admin access required'}), 403

        g.jwt_user_id = payload['user_id']
        g.jwt_role = payload['role']
        return f(*args, **kwargs)
    return decorated_function

# --- Logic Helpers ---

def calculate_next_due_date(current_due, frequency, frequency_type='simple', frequency_config=None):
    if frequency_config is None: frequency_config = {}
    if isinstance(current_due, str): current_date = datetime.date.fromisoformat(current_due)
    else: current_date = current_due
    
    if frequency == 'weekly': return current_date + timedelta(days=7)
    elif frequency == 'bi-weekly': return current_date + timedelta(days=14)
    elif frequency == 'monthly':
        if frequency_type == 'specific_dates' and 'dates' in frequency_config:
            dates = frequency_config['dates']; current_day = current_date.day
            next_dates = [d for d in dates if d > current_day]
            if next_dates:
                next_day = min(next_dates)
                try: return current_date.replace(day=next_day)
                except ValueError: pass
            next_month = current_date.month + 1; next_year = current_date.year
            if next_month > 12: next_month = 1; next_year += 1
            next_day = min(dates); max_day = calendar.monthrange(next_year, next_month)[1]
            return datetime.date(next_year, next_month, min(next_day, max_day))
        else:
            month = current_date.month + 1; year = current_date.year
            if month > 12: month = 1; year += 1
            day = min(current_date.day, calendar.monthrange(year, month)[1])
            return datetime.date(year, month, day)
    elif frequency == 'quarterly':
        month = current_date.month + 3; year = current_date.year
        if month > 12: month -= 12; year += 1
        day = min(current_date.day, calendar.monthrange(year, month)[1])
        return datetime.date(year, month, day)
    elif frequency == 'yearly':
        try: return current_date.replace(year=current_date.year + 1)
        except ValueError: return current_date.replace(year=current_date.year + 1, day=28)
    elif frequency == 'custom' and frequency_type == 'multiple_weekly':
        days_of_week = frequency_config.get('days', [])
        if not days_of_week: return current_date + timedelta(days=7)
        current_weekday = current_date.weekday()
        next_days = [d for d in days_of_week if d > current_weekday]
        if next_days: return current_date + timedelta(days=min(next_days) - current_weekday)
        else: return current_date + timedelta(days=7 - current_weekday + min(days_of_week))
    return current_date + timedelta(days=30)

# --- API Routes ---

@api_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(); user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        if user.password_change_required:
            token = secrets.token_hex(32); user.change_token = token; db.session.commit()
            return jsonify({'require_password_change': True, 'user_id': user.id, 'change_token': token, 'role': user.role})
        session['user_id'] = user.id; session['role'] = user.role
        dbs = [{'id': d.id, 'name': d.name, 'display_name': d.display_name} for d in user.accessible_databases]
        if dbs: session['db_name'] = dbs[0]['name']
        return jsonify({'message': 'Login successful', 'role': user.role, 'databases': dbs})
    return jsonify({'error': 'Invalid username or password'}), 401

@api_bp.route('/logout', methods=['POST'])
def logout():
    session.clear(); return jsonify({'message': 'Logged out successfully'})

@api_bp.route('/me', methods=['GET'])
@login_required
def me():
    user = User.query.get(session['user_id'])
    dbs = [{'id': d.id, 'name': d.name, 'display_name': d.display_name} for d in user.accessible_databases]
    return jsonify({'username': user.username, 'role': user.role, 'databases': dbs, 'current_db': session.get('db_name')})

@api_bp.route('/select-db/<string:db_name>', methods=['POST'])
@login_required
def select_database(db_name):
    user = User.query.get(session['user_id']); target_db = Database.query.filter_by(name=db_name).first()
    if target_db and target_db in user.accessible_databases:
        session['db_name'] = db_name; return jsonify({'message': f'Selected database: {db_name}'})
    return jsonify({'error': 'Access denied'}), 403

@api_bp.route('/databases', methods=['GET', 'POST'])
@admin_required
def databases_handler():
    if request.method == 'GET':
        dbs = Database.query.order_by(Database.created_at.desc()).all()
        return jsonify([{'id': d.id, 'name': d.name, 'display_name': d.display_name, 'description': d.description} for d in dbs])
    else:
        data = request.get_json(); name, display_name = data.get('name'), data.get('display_name')
        if not name or not display_name: return jsonify({'error': 'Missing fields'}), 400
        if Database.query.filter_by(name=name).first(): return jsonify({'error': 'Exists'}), 400
        new_db = Database(name=name, display_name=display_name, description=data.get('description', ''))
        db.session.add(new_db)
        for admin in User.query.filter_by(role='admin').all(): admin.accessible_databases.append(new_db)
        db.session.commit(); return jsonify({'message': 'Created', 'id': new_db.id}), 201

@api_bp.route('/databases/<int:db_id>', methods=['DELETE'])
@admin_required
def delete_database(db_id):
    target_db = Database.query.get_or_404(db_id)
    db.session.delete(target_db); db.session.commit(); return jsonify({'message': 'Deleted'})

@api_bp.route('/databases/<int:db_id>/access', methods=['GET', 'POST'])
@admin_required
def database_access_handler(db_id):
    target_db = Database.query.get_or_404(db_id)
    if request.method == 'GET':
        return jsonify([{'id': u.id, 'username': u.username, 'role': u.role} for u in target_db.users])
    else:
        user = User.query.get_or_404(request.get_json().get('user_id'))
        if target_db not in user.accessible_databases:
            user.accessible_databases.append(target_db); db.session.commit()
        return jsonify({'message': 'Granted'})

@api_bp.route('/databases/<int:db_id>/access/<int:user_id>', methods=['DELETE'])
@admin_required
def revoke_database_access(db_id, user_id):
    target_db = Database.query.get_or_404(db_id); user = User.query.get_or_404(user_id)
    if target_db in user.accessible_databases:
        user.accessible_databases.remove(target_db); db.session.commit()
    return jsonify({'message': 'Revoked'})

@api_bp.route('/users', methods=['GET', 'POST'])
@admin_required
def users_handler():
    if request.method == 'GET':
        users = User.query.all(); return jsonify([{'id': u.id, 'username': u.username, 'role': u.role} for u in users])
    else:
        data = request.get_json(); username, password = data.get('username'), data.get('password')
        if User.query.filter_by(username=username).first(): return jsonify({'error': 'Taken'}), 400
        new_user = User(username=username, role=data.get('role', 'user'), password_change_required=True)
        new_user.set_password(data.get('password')); db.session.add(new_user)
        for db_id in data.get('database_ids', []):
            d = Database.query.get(db_id); 
            if d: new_user.accessible_databases.append(d)
        db.session.commit(); return jsonify({'message': 'Created', 'id': new_user.id}), 201

@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    if user_id == session.get('user_id'): return jsonify({'error': 'Self'}), 400
    user = User.query.get_or_404(user_id); db.session.delete(user); db.session.commit(); return jsonify({'message': 'Deleted'})

@api_bp.route('/users/<int:user_id>/databases', methods=['GET'])
@admin_required
def get_user_databases(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify([{'id': d.id, 'name': d.name, 'display_name': d.display_name} for d in user.accessible_databases])

@api_bp.route('/api/accounts', methods=['GET'])
@login_required
def get_accounts():
    db_name = session.get('db_name'); target_db = Database.query.filter_by(name=db_name).first()
    if not target_db: return jsonify([])
    accounts = db.session.query(Bill.account).filter_by(database_id=target_db.id).distinct().all()
    return jsonify([a[0] for a in accounts if a[0]])

@api_bp.route('/bills', methods=['GET', 'POST'])
@login_required
def bills_handler():
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    if not target_db: return jsonify({'error': 'DB invalid'}), 400
    if request.method == 'GET':
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        query = Bill.query.filter_by(database_id=target_db.id)
        if not include_archived: query = query.filter_by(archived=False)
        bills = query.order_by(Bill.due_date).all(); result = []
        for bill in bills:
            b_dict = {
                'id': bill.id, 'name': bill.name, 'amount': bill.amount, 'varies': bill.is_variable,
                'frequency': bill.frequency, 'frequency_type': bill.frequency_type,
                'frequency_config': bill.frequency_config, 'next_due': bill.due_date,
                'auto_payment': bill.auto_pay, 'icon': bill.icon, 'type': bill.type,
                'account': bill.account, 'notes': bill.notes, 'archived': bill.archived
            }
            if bill.is_variable:
                avg = db.session.query(func.avg(Payment.amount)).filter_by(bill_id=bill.id).scalar()
                b_dict['avg_amount'] = float(avg) if avg else 0
            result.append(b_dict)
        return jsonify(result)
    else:
        data = request.get_json(); new_bill = Bill(
            database_id=target_db.id, name=data['name'], amount=data.get('amount'),
            is_variable=data.get('varies', False), frequency=data.get('frequency', 'monthly'),
            frequency_type=data.get('frequency_type', 'simple'), frequency_config=data.get('frequency_config', '{}'),
            due_date=data['next_due'], auto_pay=data.get('auto_payment', False), icon=data.get('icon', 'payment'),
            type=data.get('type', 'expense'), account=data.get('account'), notes=data.get('notes'), archived=False
        )
        db.session.add(new_bill); db.session.commit(); return jsonify({'message': 'Added', 'id': new_bill.id}), 201

@api_bp.route('/bills/<int:bill_id>', methods=['PUT', 'DELETE'])
@login_required
def bill_detail_handler(bill_id):
    bill = Bill.query.get_or_404(bill_id)
    if request.method == 'PUT':
        data = request.get_json(); bill.name = data.get('name', bill.name); bill.amount = data.get('amount', bill.amount)
        bill.is_variable = data.get('varies', bill.is_variable); bill.frequency = data.get('frequency', bill.frequency)
        bill.frequency_type = data.get('frequency_type', bill.frequency_type); bill.frequency_config = data.get('frequency_config', bill.frequency_config)
        bill.due_date = data.get('next_due', bill.due_date); bill.auto_pay = data.get('auto_payment', bill.auto_pay)
        bill.icon = data.get('icon', bill.icon); bill.type = data.get('type', bill.type); bill.account = data.get('account', bill.account); bill.notes = data.get('notes', bill.notes)
        db.session.commit(); return jsonify({'message': 'Updated'})
    else: bill.archived = True; db.session.commit(); return jsonify({'message': 'Archived'})

@api_bp.route('/bills/<int:bill_id>/unarchive', methods=['POST'])
@login_required
def unarchive_bill(bill_id):
    bill = Bill.query.get_or_404(bill_id); bill.archived = False; db.session.commit(); return jsonify({'message': 'Unarchived'})

@api_bp.route('/bills/<int:bill_id>/permanent', methods=['DELETE'])
@login_required
def delete_bill_permanent(bill_id):
    bill = Bill.query.get_or_404(bill_id); db.session.delete(bill); db.session.commit(); return jsonify({'message': 'Deleted'})

@api_bp.route('/bills/<int:bill_id>/pay', methods=['POST'])
@login_required
def pay_bill(bill_id):
    data = request.get_json(); bill = Bill.query.get_or_404(bill_id)
    payment = Payment(bill_id=bill.id, amount=data.get('amount'), payment_date=datetime.date.today().isoformat(), notes=data.get('notes'))
    db.session.add(payment)
    if data.get('advance_due', True):
        # Update existing bill instead of creating new
        next_due = calculate_next_due_date(bill.due_date, bill.frequency, bill.frequency_type, json.loads(bill.frequency_config))
        bill.due_date = next_due.isoformat()
        bill.archived = False # Ensure active
    db.session.commit(); return jsonify({'message': 'Paid'})

@api_bp.route('/bills/<string:name>/payments', methods=['GET'])
@login_required
def get_payments_by_name(name):
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    payments = db.session.query(Payment).join(Bill).filter(Bill.database_id == target_db.id, Bill.name == name).order_by(desc(Payment.payment_date)).all()
    return jsonify([{'id': p.id, 'amount': p.amount, 'payment_date': p.payment_date, 'notes': p.notes} for p in payments])

@api_bp.route('/bills/<int:bill_id>/payments', methods=['GET'])
@login_required
def get_payments_by_id(bill_id):
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    bill = Bill.query.get_or_404(bill_id)
    if bill.database_id != target_db.id: return jsonify({'error': 'Access denied'}), 403
    payments = Payment.query.filter_by(bill_id=bill_id).order_by(desc(Payment.payment_date)).all()
    return jsonify([{'id': p.id, 'amount': p.amount, 'payment_date': p.payment_date, 'notes': p.notes} for p in payments])

@api_bp.route('/payments/<int:id>', methods=['PUT'])
@login_required
def update_payment(id):
    data = request.get_json()
    payment = Payment.query.get_or_404(id)
    if 'amount' in data: payment.amount = data['amount']
    if 'payment_date' in data: payment.payment_date = data['payment_date']
    if 'notes' in data: payment.notes = data['notes']
    db.session.commit()
    return jsonify({'message': 'Payment updated'})

@api_bp.route('/payments/<int:id>', methods=['DELETE'])
@login_required
def delete_payment(id):
    payment = Payment.query.get_or_404(id)
    db.session.delete(payment)
    db.session.commit()
    return jsonify({'message': 'Payment deleted'})

@api_bp.route('/api/payments/all', methods=['GET'])
@login_required
def get_all_payments():
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    payments = db.session.query(Payment).join(Bill).filter(Bill.database_id == target_db.id).order_by(desc(Payment.payment_date)).all()
    return jsonify([{'id': p.id, 'amount': p.amount, 'payment_date': p.payment_date, 'bill_name': p.bill.name, 'bill_icon': p.bill.icon} for p in payments])

@api_bp.route('/api/payments/monthly', methods=['GET'])
@login_required
def get_monthly_payments():
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    results = db.session.query(
        func.to_char(func.to_date(Payment.payment_date, 'YYYY-MM-DD'), 'YYYY-MM').label('month'),
        func.sum(Payment.amount)
    ).join(Bill).filter(
        Bill.database_id == target_db.id,
        Bill.type == 'expense'
    ).group_by('month').all()
    return jsonify({r[0]: float(r[1]) for r in results})

@api_bp.route('/api/payments/bill/<string:name>/monthly', methods=['GET'])
@login_required
def get_bill_monthly_payments(name):
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    results = db.session.query(func.to_char(func.to_date(Payment.payment_date, 'YYYY-MM-DD'), 'YYYY-MM').label('month'), func.sum(Payment.amount), func.count(Payment.id)).join(Bill).filter(Bill.database_id == target_db.id, Bill.name == name).group_by('month').order_by(desc('month')).limit(12).all()
    return jsonify([{'month': r[0], 'total': float(r[1]), 'count': r[2]} for r in results])

@api_bp.route('/api/process-auto-payments', methods=['POST'])
@login_required
def process_auto_payments():
    target_db = Database.query.filter_by(name=session.get('db_name')).first()
    today = datetime.date.today().isoformat()
    auto_bills = Bill.query.filter_by(database_id=target_db.id, auto_pay=True, archived=False).filter(Bill.due_date <= today).all()
    for bill in auto_bills:
        payment = Payment(bill_id=bill.id, amount=bill.amount or 0, payment_date=today); db.session.add(payment)
        next_due = calculate_next_due_date(bill.due_date, bill.frequency, bill.frequency_type, json.loads(bill.frequency_config))
        bill.due_date = next_due.isoformat()
    db.session.commit(); return jsonify({'message': 'Processed', 'processed_count': len(auto_bills)})

@api_bp.route('/api/version', methods=['GET'])
def get_version():
    return jsonify({'version': '3.0.1', 'license': "O'Saasy", 'license_url': 'https://osaasy.dev/', 'features': ['enhanced_frequencies', 'auto_payments', 'postgresql_saas', 'row_tenancy']})

@api_bp.route('/ping')
def ping(): return jsonify({'status': 'ok'})

# --- API v2 Routes (JWT Auth for Mobile) ---

@api_v2_bp.route('/auth/login', methods=['POST'])
def jwt_login():
    """JWT login endpoint for mobile apps."""
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON body'}), 400

    username = data.get('username')
    password = data.get('password')
    device_info = data.get('device_info')

    if not username or not password:
        return jsonify({'success': False, 'error': 'Username and password required'}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

    # Handle password change requirement
    if user.password_change_required:
        token = secrets.token_hex(32)
        user.change_token = token
        db.session.commit()
        return jsonify({
            'success': False,
            'error': 'Password change required',
            'require_password_change': True,
            'change_token': token
        }), 403

    # Create tokens
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, device_info)

    # Get accessible databases
    databases = [{'id': d.id, 'name': d.name, 'display_name': d.display_name} for d in user.accessible_databases]

    return jsonify({
        'success': True,
        'data': {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': int(JWT_ACCESS_TOKEN_EXPIRES.total_seconds()),
            'token_type': 'Bearer',
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role
            },
            'databases': databases
        }
    })

@api_v2_bp.route('/auth/refresh', methods=['POST'])
def jwt_refresh():
    """Refresh access token using a valid refresh token."""
    data = request.get_json()
    refresh_token = data.get('refresh_token')

    if not refresh_token:
        return jsonify({'success': False, 'error': 'Refresh token required'}), 400

    stored_token = verify_refresh_token(refresh_token)
    if not stored_token:
        return jsonify({'success': False, 'error': 'Invalid or expired refresh token'}), 401

    user = User.query.get(stored_token.user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401

    # Create new access token
    access_token = create_access_token(user.id, user.role)

    return jsonify({
        'success': True,
        'data': {
            'access_token': access_token,
            'expires_in': int(JWT_ACCESS_TOKEN_EXPIRES.total_seconds()),
            'token_type': 'Bearer'
        }
    })

@api_v2_bp.route('/auth/logout', methods=['POST'])
def jwt_logout():
    """Revoke refresh token (logout from device)."""
    data = request.get_json()
    refresh_token = data.get('refresh_token')

    if refresh_token:
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        stored_token = RefreshToken.query.filter_by(token_hash=token_hash).first()
        if stored_token:
            stored_token.revoked = True
            db.session.commit()

    return jsonify({'success': True, 'message': 'Logged out successfully'})

@api_v2_bp.route('/auth/logout-all', methods=['POST'])
@jwt_required
def jwt_logout_all():
    """Revoke all refresh tokens for the current user (logout from all devices)."""
    RefreshToken.query.filter_by(user_id=g.jwt_user_id, revoked=False).update({'revoked': True})
    db.session.commit()
    return jsonify({'success': True, 'message': 'Logged out from all devices'})

@api_v2_bp.route('/me', methods=['GET'])
@jwt_required
def jwt_me():
    """Get current user info (JWT version)."""
    user = User.query.get(g.jwt_user_id)
    databases = [{'id': d.id, 'name': d.name, 'display_name': d.display_name} for d in user.accessible_databases]
    return jsonify({
        'success': True,
        'data': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'databases': databases,
            'current_db': g.jwt_db_name
        }
    })

@api_v2_bp.route('/bills', methods=['GET'])
@jwt_required
def jwt_get_bills():
    """Get bills for the selected database (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    if not target_db:
        return jsonify({'success': False, 'error': 'Database not found'}), 404

    include_archived = request.args.get('include_archived', 'false').lower() == 'true'
    query = Bill.query.filter_by(database_id=target_db.id)
    if not include_archived:
        query = query.filter_by(archived=False)
    bills = query.order_by(Bill.due_date).all()

    result = []
    for bill in bills:
        b_dict = {
            'id': bill.id, 'name': bill.name, 'amount': bill.amount, 'varies': bill.is_variable,
            'frequency': bill.frequency, 'frequency_type': bill.frequency_type,
            'frequency_config': bill.frequency_config, 'next_due': bill.due_date,
            'auto_payment': bill.auto_pay, 'icon': bill.icon, 'type': bill.type,
            'account': bill.account, 'notes': bill.notes, 'archived': bill.archived
        }
        if bill.is_variable:
            avg = db.session.query(func.avg(Payment.amount)).filter_by(bill_id=bill.id).scalar()
            b_dict['avg_amount'] = float(avg) if avg else 0
        result.append(b_dict)

    return jsonify({'success': True, 'data': result})

@api_v2_bp.route('/bills', methods=['POST'])
@jwt_required
def jwt_create_bill():
    """Create a new bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    if not target_db:
        return jsonify({'success': False, 'error': 'Database not found'}), 404

    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON body'}), 400

    if not data.get('name') or not data.get('next_due'):
        return jsonify({'success': False, 'error': 'Name and next_due are required'}), 400

    new_bill = Bill(
        database_id=target_db.id, name=data['name'], amount=data.get('amount'),
        is_variable=data.get('varies', False), frequency=data.get('frequency', 'monthly'),
        frequency_type=data.get('frequency_type', 'simple'), frequency_config=data.get('frequency_config', '{}'),
        due_date=data['next_due'], auto_pay=data.get('auto_payment', False), icon=data.get('icon', 'payment'),
        type=data.get('type', 'expense'), account=data.get('account'), notes=data.get('notes'), archived=False
    )
    db.session.add(new_bill)
    db.session.commit()

    return jsonify({'success': True, 'data': {'id': new_bill.id, 'message': 'Bill created'}}), 201

@api_v2_bp.route('/bills/<int:bill_id>', methods=['GET'])
@jwt_required
def jwt_get_bill(bill_id):
    """Get a single bill by ID (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    b_dict = {
        'id': bill.id, 'name': bill.name, 'amount': bill.amount, 'varies': bill.is_variable,
        'frequency': bill.frequency, 'frequency_type': bill.frequency_type,
        'frequency_config': bill.frequency_config, 'next_due': bill.due_date,
        'auto_payment': bill.auto_pay, 'icon': bill.icon, 'type': bill.type,
        'account': bill.account, 'notes': bill.notes, 'archived': bill.archived
    }
    if bill.is_variable:
        avg = db.session.query(func.avg(Payment.amount)).filter_by(bill_id=bill.id).scalar()
        b_dict['avg_amount'] = float(avg) if avg else 0

    return jsonify({'success': True, 'data': b_dict})

@api_v2_bp.route('/bills/<int:bill_id>', methods=['PUT'])
@jwt_required
def jwt_update_bill(bill_id):
    """Update a bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON body'}), 400

    if 'name' in data: bill.name = data['name']
    if 'amount' in data: bill.amount = data['amount']
    if 'varies' in data: bill.is_variable = data['varies']
    if 'frequency' in data: bill.frequency = data['frequency']
    if 'frequency_type' in data: bill.frequency_type = data['frequency_type']
    if 'frequency_config' in data: bill.frequency_config = data['frequency_config']
    if 'next_due' in data: bill.due_date = data['next_due']
    if 'auto_payment' in data: bill.auto_pay = data['auto_payment']
    if 'icon' in data: bill.icon = data['icon']
    if 'type' in data: bill.type = data['type']
    if 'account' in data: bill.account = data['account']
    if 'notes' in data: bill.notes = data['notes']

    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Bill updated'}})

@api_v2_bp.route('/bills/<int:bill_id>', methods=['DELETE'])
@jwt_required
def jwt_archive_bill(bill_id):
    """Archive a bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    bill.archived = True
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Bill archived'}})

@api_v2_bp.route('/bills/<int:bill_id>/unarchive', methods=['POST'])
@jwt_required
def jwt_unarchive_bill(bill_id):
    """Unarchive a bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    bill.archived = False
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Bill unarchived'}})

@api_v2_bp.route('/bills/<int:bill_id>/permanent', methods=['DELETE'])
@jwt_required
def jwt_delete_bill_permanent(bill_id):
    """Permanently delete a bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    db.session.delete(bill)
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Bill permanently deleted'}})

@api_v2_bp.route('/bills/<int:bill_id>/pay', methods=['POST'])
@jwt_required
def jwt_pay_bill(bill_id):
    """Record a payment for a bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON body'}), 400

    payment = Payment(
        bill_id=bill.id,
        amount=data.get('amount', bill.amount),
        payment_date=data.get('payment_date', datetime.date.today().isoformat()),
        notes=data.get('notes')
    )
    db.session.add(payment)

    if data.get('advance_due', True):
        next_due = calculate_next_due_date(bill.due_date, bill.frequency, bill.frequency_type, json.loads(bill.frequency_config))
        bill.due_date = next_due.isoformat()
        bill.archived = False

    db.session.commit()
    return jsonify({'success': True, 'data': {'id': payment.id, 'message': 'Payment recorded'}})

@api_v2_bp.route('/bills/<int:bill_id>/payments', methods=['GET'])
@jwt_required
def jwt_get_bill_payments(bill_id):
    """Get payment history for a bill (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    bill = Bill.query.get_or_404(bill_id)

    if bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    payments = Payment.query.filter_by(bill_id=bill_id).order_by(desc(Payment.payment_date)).all()
    result = [{'id': p.id, 'amount': p.amount, 'payment_date': p.payment_date, 'notes': p.notes} for p in payments]

    return jsonify({'success': True, 'data': result})

@api_v2_bp.route('/payments', methods=['GET'])
@jwt_required
def jwt_get_all_payments():
    """Get all payments across all bills (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    payments = db.session.query(Payment).join(Bill).filter(Bill.database_id == target_db.id).order_by(desc(Payment.payment_date)).all()

    result = [{
        'id': p.id,
        'amount': p.amount,
        'payment_date': p.payment_date,
        'notes': p.notes,
        'bill_id': p.bill_id,
        'bill_name': p.bill.name,
        'bill_icon': p.bill.icon,
        'bill_type': p.bill.type
    } for p in payments]

    return jsonify({'success': True, 'data': result})

@api_v2_bp.route('/payments/<int:payment_id>', methods=['PUT'])
@jwt_required
def jwt_update_payment(payment_id):
    """Update a payment (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    payment = Payment.query.get_or_404(payment_id)

    if payment.bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON body'}), 400

    if 'amount' in data: payment.amount = data['amount']
    if 'payment_date' in data: payment.payment_date = data['payment_date']
    if 'notes' in data: payment.notes = data['notes']

    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Payment updated'}})

@api_v2_bp.route('/payments/<int:payment_id>', methods=['DELETE'])
@jwt_required
def jwt_delete_payment(payment_id):
    """Delete a payment (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    payment = Payment.query.get_or_404(payment_id)

    if payment.bill.database_id != target_db.id:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    db.session.delete(payment)
    db.session.commit()
    return jsonify({'success': True, 'data': {'message': 'Payment deleted'}})

@api_v2_bp.route('/accounts', methods=['GET'])
@jwt_required
def jwt_get_accounts():
    """Get list of distinct account names (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    if not target_db:
        return jsonify({'success': True, 'data': []})

    accounts = db.session.query(Bill.account).filter_by(database_id=target_db.id).distinct().all()
    result = [a[0] for a in accounts if a[0]]

    return jsonify({'success': True, 'data': result})

@api_v2_bp.route('/stats/monthly', methods=['GET'])
@jwt_required
def jwt_get_monthly_stats():
    """Get monthly payment totals (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    results = db.session.query(
        func.to_char(func.to_date(Payment.payment_date, 'YYYY-MM-DD'), 'YYYY-MM').label('month'),
        func.sum(Payment.amount),
        Bill.type
    ).join(Bill).filter(
        Bill.database_id == target_db.id
    ).group_by('month', Bill.type).all()

    # Organize by month with expense/deposit breakdown
    monthly = {}
    for r in results:
        month = r[0]
        if month not in monthly:
            monthly[month] = {'expenses': 0, 'deposits': 0}
        if r[2] == 'expense':
            monthly[month]['expenses'] = float(r[1])
        else:
            monthly[month]['deposits'] = float(r[1])

    return jsonify({'success': True, 'data': monthly})

@api_v2_bp.route('/process-auto-payments', methods=['POST'])
@jwt_required
def jwt_process_auto_payments():
    """Process auto-payments for bills due today or earlier (JWT version)."""
    if not g.jwt_db_name:
        return jsonify({'success': False, 'error': 'X-Database header required'}), 400

    target_db = Database.query.filter_by(name=g.jwt_db_name).first()
    today = datetime.date.today().isoformat()
    auto_bills = Bill.query.filter_by(database_id=target_db.id, auto_pay=True, archived=False).filter(Bill.due_date <= today).all()

    processed = []
    for bill in auto_bills:
        payment = Payment(bill_id=bill.id, amount=bill.amount or 0, payment_date=today)
        db.session.add(payment)
        next_due = calculate_next_due_date(bill.due_date, bill.frequency, bill.frequency_type, json.loads(bill.frequency_config))
        bill.due_date = next_due.isoformat()
        processed.append({'bill_id': bill.id, 'name': bill.name, 'amount': bill.amount or 0})

    db.session.commit()
    return jsonify({'success': True, 'data': {'processed_count': len(processed), 'bills': processed}})

@api_v2_bp.route('/auth/change-password', methods=['POST'])
def jwt_change_password():
    """Change password (for users with password_change_required or via change_token)."""
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON body'}), 400

    change_token = data.get('change_token')
    new_password = data.get('new_password')

    if not change_token or not new_password:
        return jsonify({'success': False, 'error': 'change_token and new_password are required'}), 400

    if len(new_password) < 8:
        return jsonify({'success': False, 'error': 'Password must be at least 8 characters'}), 400

    user = User.query.filter_by(change_token=change_token).first()
    if not user:
        return jsonify({'success': False, 'error': 'Invalid change token'}), 401

    user.set_password(new_password)
    user.password_change_required = False
    user.change_token = None
    db.session.commit()

    # Optionally auto-login after password change
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, data.get('device_info'))
    databases = [{'id': d.id, 'name': d.name, 'display_name': d.display_name} for d in user.accessible_databases]

    return jsonify({
        'success': True,
        'data': {
            'message': 'Password changed successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': int(JWT_ACCESS_TOKEN_EXPIRES.total_seconds()),
            'token_type': 'Bearer',
            'user': {'id': user.id, 'username': user.username, 'role': user.role},
            'databases': databases
        }
    })

@api_v2_bp.route('/version', methods=['GET'])
def jwt_get_version():
    """Get API version info."""
    return jsonify({
        'success': True,
        'data': {
            'version': '3.1.0',
            'api_version': 'v2',
            'license': "O'Saasy",
            'license_url': 'https://osaasy.dev/',
            'features': ['jwt_auth', 'mobile_api', 'enhanced_frequencies', 'auto_payments', 'postgresql_saas', 'row_tenancy']
        }
    })

@api_v2_bp.route('/openapi.yaml', methods=['GET'])
def get_openapi_spec():
    """Serve the OpenAPI specification."""
    spec_path = os.path.join(os.path.dirname(__file__), 'openapi.yaml')
    if os.path.exists(spec_path):
        with open(spec_path, 'r') as f:
            return f.read(), 200, {'Content-Type': 'text/yaml'}
    return jsonify({'success': False, 'error': 'OpenAPI spec not found'}), 404

@api_v2_bp.route('/docs', methods=['GET'])
def api_docs():
    """Serve Swagger UI for API documentation."""
    return '''<!DOCTYPE html>
<html>
<head>
    <title>BillManager API - Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: "/api/v2/openapi.yaml",
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
            layout: "BaseLayout"
        });
    </script>
</body>
</html>''', 200, {'Content-Type': 'text/html'}

# --- SPA Catch-all Routes ---

def get_client_dir():
    """Return the path to the client directory (dist for production, client for dev)."""
    dist_dir = os.path.join(os.path.dirname(__file__), '..', 'client', 'dist')
    if os.path.exists(dist_dir):
        return dist_dir
    return os.path.join(os.path.dirname(__file__), '..', 'client')

@spa_bp.route('/', methods=['GET'])
def index():
    return send_from_directory(get_client_dir(), 'index.html')

@spa_bp.route('/<path:path>', methods=['GET'])
def serve_static(path):
    client_dir = get_client_dir()
    full_path = os.path.join(client_dir, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(client_dir, path)
    return send_from_directory(client_dir, 'index.html')

# --- Application Factory ---

def create_app():
    app = Flask(__name__, static_folder=None); app.url_map.strict_slashes = False
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(32))

    # Get DATABASE_URL and convert to psycopg3 dialect if needed
    db_url = os.environ.get('DATABASE_URL', 'postgresql://billsuser:billspass@db:5432/billsdb')
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    CORS(app, supports_credentials=True); db.init_app(app); Migrate(app, db)
    
    @app.before_request
    def log_request_info():
        g.start_time = datetime.datetime.now(); logger.info(f"➡️  {request.method} {request.path}")
    
    @app.after_request
    def log_response_info(response):
        if hasattr(g, 'start_time'):
            duration = datetime.datetime.now() - g.start_time
            logger.info(f"⬅️  {response.status} ({duration.total_seconds():.3f}s)")
        return response

    # Register API Blueprints first, then SPA
    app.register_blueprint(api_bp)
    app.register_blueprint(api_v2_bp)  # JWT auth for mobile
    app.register_blueprint(spa_bp)

    with app.app_context():
        try:
            logger.info("🗺️  Registered Routes:")
            for rule in app.url_map.iter_rules(): logger.info(f"    {rule.methods} {rule.rule} -> {rule.endpoint}")
            db.create_all(); migrate_sqlite_to_pg(app)
            admin = User.query.filter_by(username='admin').first()
            if not admin:
                admin = User(username='admin', role='admin', password_change_required=True)
                admin.set_password('password'); db.session.add(admin)
            p_db = Database.query.filter_by(name='personal').first()
            if not p_db:
                p_db = Database(name='personal', display_name='Personal Finances', description='Personal bills and expenses')
                db.session.add(p_db)
            db.session.commit()
            if p_db not in admin.accessible_databases:
                admin.accessible_databases.append(p_db); db.session.commit()
        except Exception as e: logger.error(f"❌ Startup Error: {e}")
    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
