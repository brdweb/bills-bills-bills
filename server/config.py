"""
Deployment mode configuration for BillManager.

Supports two modes:
- self-hosted: For users running their own instance (default)
- saas: For the hosted app.billmanager.app service
"""

import os

# Deployment mode: 'self-hosted' or 'saas'
DEPLOYMENT_MODE = os.environ.get('DEPLOYMENT_MODE', 'self-hosted')


def is_saas():
    """Check if running in SaaS mode."""
    return DEPLOYMENT_MODE == 'saas'


def is_self_hosted():
    """Check if running in self-hosted mode."""
    return DEPLOYMENT_MODE == 'self-hosted'


# Feature flags based on deployment mode
# Email verification: required for SaaS, optional for self-hosted
REQUIRE_EMAIL_VERIFICATION = (
    is_saas() or
    os.environ.get('REQUIRE_EMAIL_VERIFICATION', 'false').lower() == 'true'
)

# Billing: only enabled for SaaS when Stripe is configured
ENABLE_BILLING = (
    is_saas() and
    bool(os.environ.get('STRIPE_SECRET_KEY'))
)

# Registration: enabled for SaaS, disabled by default for self-hosted
ENABLE_REGISTRATION = os.environ.get(
    'ENABLE_REGISTRATION',
    'true' if is_saas() else 'false'
).lower() == 'true'


def get_public_config():
    """Return configuration safe to expose to the frontend."""
    return {
        'deployment_mode': DEPLOYMENT_MODE,
        'billing_enabled': ENABLE_BILLING,
        'registration_enabled': ENABLE_REGISTRATION,
        'email_verification_required': REQUIRE_EMAIL_VERIFICATION,
    }
