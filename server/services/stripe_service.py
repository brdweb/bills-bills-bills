"""
Stripe billing service for subscription management.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Try to import stripe, but allow app to run without it during development
try:
    import stripe
    STRIPE_AVAILABLE = True
except ImportError:
    STRIPE_AVAILABLE = False
    logger.warning("Stripe not installed. Billing functionality disabled.")

# Configuration from environment
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
STRIPE_PRICE_ID = os.environ.get('STRIPE_PRICE_ID')  # Price ID for Early Adopter plan
APP_URL = os.environ.get('APP_URL', 'http://localhost:5000')


def init_stripe():
    """Initialize Stripe with API key"""
    if STRIPE_AVAILABLE and STRIPE_SECRET_KEY:
        stripe.api_key = STRIPE_SECRET_KEY
        return True
    return False


def create_checkout_session(user_id: int, user_email: str, customer_id: str = None) -> dict:
    """
    Create a Stripe Checkout session for subscription.

    Returns dict with 'url' for redirect or 'error' on failure.
    """
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        return {'error': 'Stripe not configured'}

    if not STRIPE_PRICE_ID:
        return {'error': 'Stripe price ID not configured'}

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        # Create or use existing customer
        if not customer_id:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={'user_id': str(user_id)}
            )
            customer_id = customer.id

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': STRIPE_PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{APP_URL}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{APP_URL}/billing/cancel",
            metadata={
                'user_id': str(user_id)
            },
            subscription_data={
                'metadata': {
                    'user_id': str(user_id)
                }
            }
        )

        return {
            'url': session.url,
            'session_id': session.id,
            'customer_id': customer_id
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error: {e}")
        return {'error': str(e)}


def create_portal_session(customer_id: str) -> dict:
    """
    Create a Stripe Customer Portal session for subscription management.

    Returns dict with 'url' for redirect or 'error' on failure.
    """
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        return {'error': 'Stripe not configured'}

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{APP_URL}/billing"
        )
        return {'url': session.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe portal error: {e}")
        return {'error': str(e)}


def construct_webhook_event(payload: bytes, sig_header: str) -> dict:
    """
    Verify and construct webhook event from Stripe.

    Returns the event object or dict with 'error'.
    """
    if not STRIPE_AVAILABLE or not STRIPE_WEBHOOK_SECRET:
        return {'error': 'Webhook secret not configured'}

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        return {'error': 'Invalid payload'}
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        return {'error': 'Invalid signature'}


def get_subscription(subscription_id: str) -> dict:
    """Get subscription details from Stripe."""
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        return {'error': 'Stripe not configured'}

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        return {
            'id': subscription.id,
            'status': subscription.status,
            'current_period_start': subscription.current_period_start,
            'current_period_end': subscription.current_period_end,
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'canceled_at': subscription.canceled_at
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe subscription error: {e}")
        return {'error': str(e)}


def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> dict:
    """Cancel a subscription (optionally at period end)."""
    if not STRIPE_AVAILABLE or not STRIPE_SECRET_KEY:
        return {'error': 'Stripe not configured'}

    stripe.api_key = STRIPE_SECRET_KEY

    try:
        if at_period_end:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
        else:
            subscription = stripe.Subscription.delete(subscription_id)

        return {
            'id': subscription.id,
            'status': subscription.status,
            'cancel_at_period_end': getattr(subscription, 'cancel_at_period_end', None)
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe cancel error: {e}")
        return {'error': str(e)}
