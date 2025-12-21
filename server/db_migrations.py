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


# List of all migrations in order
# Format: (version, description, function)
MIGRATIONS = [
    ('20241221_01', 'Increase password_hash column to 256 chars', migrate_20241221_01_password_hash_length),
    ('20241221_02', 'Add migrations tracking index', migrate_20241221_02_add_migrations_index),
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
