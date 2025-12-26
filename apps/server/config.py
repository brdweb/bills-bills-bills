"""
Deployment mode configuration for BillManager.

Supports two modes:
- self-hosted: For users running their own instance (default)
- saas: For the hosted app.billmanager.app service
"""

import os

# Deployment mode: 'self-hosted' or 'saas'
DEPLOYMENT_MODE = os.environ.get('DEPLOYMENT_MODE', 'self-hosted')

# Stripe pricing configuration for tiered plans
# Each tier has monthly and annual price IDs from Stripe
STRIPE_PRICES = {
    'basic': {
        'monthly': os.environ.get('STRIPE_PRICE_BASIC_MONTHLY'),
        'annual': os.environ.get('STRIPE_PRICE_BASIC_ANNUAL'),
        'name': 'Basic',
        'monthly_amount': 500,  # $5.00 in cents
        'annual_amount': 5000,  # $50.00 in cents
    },
    'plus': {
        'monthly': os.environ.get('STRIPE_PRICE_PLUS_MONTHLY'),
        'annual': os.environ.get('STRIPE_PRICE_PLUS_ANNUAL'),
        'name': 'Plus',
        'monthly_amount': 750,  # $7.50 in cents
        'annual_amount': 7500,  # $75.00 in cents
    },
}

# Tier limits for feature gating (SaaS mode only)
TIER_LIMITS = {
    'free': {
        'bills': 10,
        'users': 1,
        'bill_groups': 1,
        'export': False,
        'full_analytics': False,
        'priority_support': False,
    },
    'basic': {
        'bills': -1,  # -1 = unlimited
        'users': 2,
        'bill_groups': 1,
        'export': True,
        'full_analytics': True,
        'priority_support': False,
    },
    'plus': {
        'bills': -1,
        'users': 5,
        'bill_groups': 3,
        'export': True,
        'full_analytics': True,
        'priority_support': True,
    },
}


def get_tier_limits(tier: str) -> dict:
    """Get feature limits for a subscription tier."""
    return TIER_LIMITS.get(tier, TIER_LIMITS['free'])


def get_stripe_price_id(tier: str, interval: str) -> str | None:
    """Get Stripe price ID for a tier and billing interval."""
    if tier not in STRIPE_PRICES:
        return None
    return STRIPE_PRICES[tier].get(interval)


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

# Email: enabled when RESEND_API_KEY is configured
EMAIL_ENABLED = bool(os.environ.get('RESEND_API_KEY'))


def get_public_config():
    """Return configuration safe to expose to the frontend."""
    return {
        'deployment_mode': DEPLOYMENT_MODE,
        'billing_enabled': ENABLE_BILLING,
        'registration_enabled': ENABLE_REGISTRATION,
        'email_enabled': EMAIL_ENABLED,
        'email_verification_required': REQUIRE_EMAIL_VERIFICATION,
        'tier_limits': TIER_LIMITS if is_saas() else None,
        'pricing': {
            'basic': {
                'name': STRIPE_PRICES['basic']['name'],
                'monthly': STRIPE_PRICES['basic']['monthly_amount'],
                'annual': STRIPE_PRICES['basic']['annual_amount'],
            },
            'plus': {
                'name': STRIPE_PRICES['plus']['name'],
                'monthly': STRIPE_PRICES['plus']['monthly_amount'],
                'annual': STRIPE_PRICES['plus']['annual_amount'],
            },
        } if is_saas() else None,
    }
