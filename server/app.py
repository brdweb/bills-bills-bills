import os
import secrets
import hashlib
import datetime
import logging
import json
import calendar
from datetime import date, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, session, g, Blueprint
from flask_cors import CORS
from flask_migrate import Migrate
from sqlalchemy import func, extract, desc

from models import db, User, Database, Bill, Payment
from migration import migrate_sqlite_to_pg

# --- Global Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Blueprints ---
api_bp = Blueprint('api', __name__)
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
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://billsuser:billspass@db:5432/billsdb')
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

    # Register API Blueprint first, then SPA
    app.register_blueprint(api_bp)
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
