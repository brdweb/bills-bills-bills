"""
Database Migration System for BillManager.

This module provides a versioned migration system that:
1. Tracks applied migrations in a schema_migrations table
2. Automatically runs pending migrations on app startup
3. Supports both forward migrations and data transformations

Usage:
    from db_migrations import run_pending_migrations

    with app.app_context():
        run_pending_migrations(db)

Adding new migrations:
    1. Create a new migration function: def migrate_XXXX_description(db):
    2. Add it to MIGRATIONS list with version number
    3. Migrations run in order and are tracked by version
"""

import logging
from datetime import datetime
from sqlalchemy import text, inspect

logger = logging.getLogger(__name__)


def ensure_migrations_table(db):
    """Create the schema_migrations table if it doesn't exist."""
    inspector = inspect(db.engine)
    if 'schema_migrations' not in inspector.get_table_names():
        db.session.execute(text('''
            CREATE TABLE schema_migrations (
                version VARCHAR(20) PRIMARY KEY,
                description VARCHAR(255) NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        '''))
        db.session.commit()
        logger.info("Created schema_migrations table")


def get_applied_migrations(db):
    """Get set of already applied migration versions."""
    result = db.session.execute(text('SELECT version FROM schema_migrations'))
    return {row[0] for row in result.fetchall()}


def record_migration(db, version, description):
    """Record a migration as applied."""
    db.session.execute(
        text('INSERT INTO schema_migrations (version, description, applied_at) VALUES (:version, :description, :applied_at)'),
        {'version': version, 'description': description, 'applied_at': datetime.utcnow()}
    )
    db.session.commit()


# =============================================================================
# MIGRATION DEFINITIONS
# Each migration is a tuple: (version, description, migration_function)
# Versions should be in format: YYYYMMDD_NN (date + sequence number)
# =============================================================================

def migrate_20241221_01_password_hash_length(db):
    """Increase password_hash column to 256 chars for bcrypt/pbkdf2 hashes."""
    db.session.execute(text('''
        ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(256)
    '''))
    db.session.commit()
    logger.info("Altered users.password_hash to VARCHAR(256)")


def migrate_20241221_02_add_migrations_index(db):
    """Add index on schema_migrations for faster lookups."""
    # This is a no-op since version is already PRIMARY KEY
    # Included as an example of a simple migration
    pass


def migrate_20241222_01_add_subscription_tier(db):
    """Add tier and billing_interval columns to subscriptions table."""
    inspector = inspect(db.engine)
    columns = [col['name'] for col in inspector.get_columns('subscriptions')]

    # Add tier column if not exists
    if 'tier' not in columns:
        db.session.execute(text('''
            ALTER TABLE subscriptions ADD COLUMN tier VARCHAR(20) DEFAULT 'free'
        '''))
        logger.info("Added subscriptions.tier column")

    # Add billing_interval column if not exists
    if 'billing_interval' not in columns:
        db.session.execute(text('''
            ALTER TABLE subscriptions ADD COLUMN billing_interval VARCHAR(20) DEFAULT 'monthly'
        '''))
        logger.info("Added subscriptions.billing_interval column")

    # Migrate existing early_adopter plans to basic tier
    db.session.execute(text('''
        UPDATE subscriptions SET tier = 'basic'
        WHERE plan = 'early_adopter' AND status IN ('active', 'trialing')
    '''))
    logger.info("Migrated early_adopter plans to basic tier")

    db.session.commit()


def migrate_20241223_01_add_saas_tenancy_columns(db):
    """Add owner_id to databases and created_by_id to users for SaaS multi-tenancy."""
    inspector = inspect(db.engine)

    # Add created_by_id to users table
    user_columns = [col['name'] for col in inspector.get_columns('users')]
    if 'created_by_id' not in user_columns:
        db.session.execute(text('''
            ALTER TABLE users ADD COLUMN created_by_id INTEGER REFERENCES users(id)
        '''))
        logger.info("Added users.created_by_id column")

    # Add owner_id to databases table
    db_columns = [col['name'] for col in inspector.get_columns('databases')]
    if 'owner_id' not in db_columns:
        db.session.execute(text('''
            ALTER TABLE databases ADD COLUMN owner_id INTEGER REFERENCES users(id)
        '''))
        logger.info("Added databases.owner_id column")

    db.session.commit()


def migrate_20241223_02_backfill_tenancy_ownership(db):
    """Backfill owner_id and created_by_id for existing data.

    For existing installations upgrading to SaaS multi-tenancy:
    - Set databases.owner_id to the first admin user for databases with NULL owner
    - Set users.created_by_id to the first admin user for users with NULL creator
    """
    # Find the first admin user (usually the original admin)
    result = db.session.execute(text('''
        SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
    '''))
    row = result.fetchone()

    if not row:
        logger.warning("No admin user found, skipping tenancy backfill")
        return

    first_admin_id = row[0]
    logger.info(f"Using admin user ID {first_admin_id} for backfill")

    # Backfill databases.owner_id
    result = db.session.execute(text('''
        UPDATE databases SET owner_id = :admin_id WHERE owner_id IS NULL
    '''), {'admin_id': first_admin_id})
    db_count = result.rowcount
    logger.info(f"Set owner_id for {db_count} database(s)")

    # Backfill users.created_by_id (except for the admin themselves)
    result = db.session.execute(text('''
        UPDATE users SET created_by_id = :admin_id
        WHERE created_by_id IS NULL AND id != :admin_id
    '''), {'admin_id': first_admin_id})
    user_count = result.rowcount
    logger.info(f"Set created_by_id for {user_count} user(s)")

    db.session.commit()


def migrate_20241223_03_create_user_invites_table(db):
    """Create the user_invites table for invite-based user registration."""
    inspector = inspect(db.engine)
    if 'user_invites' in inspector.get_table_names():
        logger.info("user_invites table already exists")
        return

    db.session.execute(text('''
        CREATE TABLE user_invites (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            invited_by_id INTEGER NOT NULL REFERENCES users(id),
            database_ids VARCHAR(255) DEFAULT '',
            expires_at TIMESTAMP NOT NULL,
            accepted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))
    db.session.commit()
    logger.info("Created user_invites table")


# List of all migrations in order
# Format: (version, description, function)
MIGRATIONS = [
    ('20241221_01', 'Increase password_hash column to 256 chars', migrate_20241221_01_password_hash_length),
    ('20241221_02', 'Add migrations tracking index', migrate_20241221_02_add_migrations_index),
    ('20241222_01', 'Add subscription tier and billing_interval columns', migrate_20241222_01_add_subscription_tier),
    ('20241223_01', 'Add SaaS multi-tenancy columns (owner_id, created_by_id)', migrate_20241223_01_add_saas_tenancy_columns),
    ('20241223_02', 'Backfill owner_id and created_by_id for existing data', migrate_20241223_02_backfill_tenancy_ownership),
    ('20241223_03', 'Create user_invites table for invite-based registration', migrate_20241223_03_create_user_invites_table),
]


def run_pending_migrations(db):
    """
    Run all pending database migrations.

    This function:
    1. Ensures the schema_migrations table exists
    2. Checks which migrations have been applied
    3. Runs any pending migrations in order
    4. Records each successful migration

    Returns:
        int: Number of migrations applied
    """
    ensure_migrations_table(db)
    applied = get_applied_migrations(db)

    migrations_run = 0

    for version, description, migrate_func in MIGRATIONS:
        if version in applied:
            continue

        logger.info(f"Running migration {version}: {description}")
        try:
            migrate_func(db)
            record_migration(db, version, description)
            migrations_run += 1
            logger.info(f"Migration {version} completed successfully")
        except Exception as e:
            logger.error(f"Migration {version} failed: {e}")
            # Don't continue with other migrations if one fails
            raise RuntimeError(f"Migration {version} failed: {e}") from e

    if migrations_run == 0:
        logger.info("No pending migrations")
    else:
        logger.info(f"Applied {migrations_run} migration(s)")

    return migrations_run


def get_migration_status(db):
    """
    Get status of all migrations.

    Returns:
        list: List of dicts with migration info and status
    """
    ensure_migrations_table(db)
    applied = get_applied_migrations(db)

    # Get applied timestamps
    result = db.session.execute(text('SELECT version, applied_at FROM schema_migrations'))
    applied_times = {row[0]: row[1] for row in result.fetchall()}

    status = []
    for version, description, _ in MIGRATIONS:
        status.append({
            'version': version,
            'description': description,
            'applied': version in applied,
            'applied_at': applied_times.get(version)
        })

    return status
