"""
Email service using Resend for transactional emails.
"""
import os
import logging

logger = logging.getLogger(__name__)

# Try to import resend, but allow app to run without it during development
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    logger.warning("Resend not installed. Email functionality disabled.")

# Configuration from environment
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'noreply@billmanager.app')
APP_URL = os.environ.get('APP_URL', 'http://localhost:5000')

def init_resend():
    """Initialize Resend with API key"""
    if RESEND_AVAILABLE and RESEND_API_KEY:
        resend.api_key = RESEND_API_KEY
        return True
    return False

def send_email(to: str, subject: str, html: str) -> bool:
    """
    Send an email using Resend.

    Returns True if sent successfully, False otherwise.
    """
    if not RESEND_AVAILABLE:
        logger.warning(f"Email not sent (resend not available): {subject} to {to}")
        return False

    if not RESEND_API_KEY:
        logger.warning(f"Email not sent (no API key): {subject} to {to}")
        return False

    try:
        resend.api_key = RESEND_API_KEY
        params = {
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        response = resend.Emails.send(params)
        logger.info(f"Email sent successfully: {subject} to {to}, id={response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {subject} to {to}, error={e}")
        return False


def send_verification_email(email: str, token: str, username: str) -> bool:
    """Send email verification link to new user"""
    verification_url = f"{APP_URL}/verify-email?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
            .button {{ display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to BillManager!</h1>
            </div>
            <div class="content">
                <p>Hi {username},</p>
                <p>Thanks for signing up! Please verify your email address to get started.</p>
                <p style="text-align: center;">
                    <a href="{verification_url}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #7c3aed;">{verification_url}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 BillManager. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Verify your BillManager account", html)


def send_password_reset_email(email: str, token: str, username: str) -> bool:
    """Send password reset link"""
    reset_url = f"{APP_URL}/reset-password?token={token}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
            .button {{ display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hi {username},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_url}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #7c3aed;">{reset_url}</p>
                <div class="warning">
                    <strong>This link will expire in 1 hour.</strong>
                </div>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 BillManager. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Reset your BillManager password", html)


def send_welcome_email(email: str, username: str) -> bool:
    """Send welcome email after email verification"""
    login_url = f"{APP_URL}/login"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
            .button {{ display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            .feature {{ background: white; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #7c3aed; }}
            .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>You're all set!</h1>
            </div>
            <div class="content">
                <p>Hi {username},</p>
                <p>Your email has been verified and your BillManager account is ready to use!</p>

                <p><strong>Here's what you can do:</strong></p>

                <div class="feature">
                    <strong>Track Bills & Income</strong><br>
                    Add all your recurring expenses and deposits in one place.
                </div>

                <div class="feature">
                    <strong>Never Miss a Due Date</strong><br>
                    See upcoming bills on your calendar and get reminders.
                </div>

                <div class="feature">
                    <strong>Forecast Your Finances</strong><br>
                    Know exactly where your money is going each month.
                </div>

                <p style="text-align: center;">
                    <a href="{login_url}" class="button">Start Using BillManager</a>
                </p>

                <p>Your 14-day free trial has started. Enjoy full access to all features!</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 BillManager. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    return send_email(email, "Welcome to BillManager!", html)
