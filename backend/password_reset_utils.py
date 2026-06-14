"""
password_reset_utils.py - Utilities for password reset
OTP generation, password validation, rate limiting
"""

import secrets
import re
from datetime import datetime, timedelta
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import password_reset_models as prm

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory rate limit store: {key: [timestamp, ...]}
# Key = "email:email@x.com" or "ip:1.2.3.4"
_rate_limit_store: dict = {}

OTP_EXPIRE_MINUTES  = 10
MAX_REQUESTS_EMAIL  = 5    # per hour per email
MAX_REQUESTS_IP     = 10   # per hour per IP


# ─── OTP ──────────────────────────────────────────────────────────────────────

def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit OTP."""
    return str(secrets.randbelow(900000) + 100000)


def hash_otp(otp: str) -> str:
    """Hash the OTP with bcrypt before storing."""
    return pwd_ctx.hash(otp)


def verify_otp_hash(otp: str, hashed: str) -> bool:
    """Verify an OTP against its stored hash."""
    return pwd_ctx.verify(otp, hashed)


def get_otp_expiry() -> datetime:
    """Return expiry datetime 10 minutes from now."""
    return datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)


# ─── Password Validation ──────────────────────────────────────────────────────

def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    Returns (is_valid: bool, error_message: str)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if len(password) > 64:
        return False, "Password must not exceed 64 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password):
        return False, "Password must contain at least one special character"
    return True, ""


def get_password_strength(password: str) -> str:
    """Return 'weak', 'medium', or 'strong' for frontend indicator."""
    score = 0
    if len(password) >= 8:   score += 1
    if len(password) >= 12:  score += 1
    if re.search(r"[A-Z]", password): score += 1
    if re.search(r"[a-z]", password): score += 1
    if re.search(r"\d",    password): score += 1
    if re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=\[\]\\;'/`~]", password): score += 1
    if score <= 2: return "weak"
    if score <= 4: return "medium"
    return "strong"


# ─── Rate Limiting ─────────────────────────────────────────────────────────────

def _clean_old_requests(key: str):
    """Remove timestamps older than 1 hour."""
    cutoff = datetime.utcnow() - timedelta(hours=1)
    _rate_limit_store[key] = [
        t for t in _rate_limit_store.get(key, []) if t > cutoff
    ]


def check_rate_limit(email: str, ip: str) -> tuple[bool, str]:
    """
    Check both email and IP rate limits.
    Returns (is_allowed: bool, error_message: str)
    """
    email_key = f"email:{email}"
    ip_key    = f"ip:{ip}"

    _clean_old_requests(email_key)
    _clean_old_requests(ip_key)

    if len(_rate_limit_store.get(email_key, [])) >= MAX_REQUESTS_EMAIL:
        return False, "Too many reset requests for this email. Try again in an hour."
    if len(_rate_limit_store.get(ip_key, [])) >= MAX_REQUESTS_IP:
        return False, "Too many reset requests from this IP. Try again in an hour."
    return True, ""


def record_rate_limit(email: str, ip: str):
    """Record a reset request for rate limiting."""
    email_key = f"email:{email}"
    ip_key    = f"ip:{ip}"
    now       = datetime.utcnow()
    _rate_limit_store.setdefault(email_key, []).append(now)
    _rate_limit_store.setdefault(ip_key,    []).append(now)


# ─── Token Management ─────────────────────────────────────────────────────────

def invalidate_existing_tokens(email: str, user_type: str, db: Session):
    """Mark all existing unused tokens for this email as used."""
    db.query(prm.PasswordResetToken).filter(
        prm.PasswordResetToken.email     == email,
        prm.PasswordResetToken.user_type == user_type,
        prm.PasswordResetToken.used      == False
    ).update({"used": True})
    db.commit()


def create_reset_token(email: str, user_type: str, otp: str, db: Session) -> prm.PasswordResetToken:
    """Invalidate old tokens, then create and save a new hashed OTP token."""
    invalidate_existing_tokens(email, user_type, db)
    token = prm.PasswordResetToken(
        email      = email,
        user_type  = user_type,
        otp_hash   = hash_otp(otp),
        expires_at = get_otp_expiry(),
        used       = False,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


def get_valid_token(email: str, user_type: str, otp: str, db: Session):
    """
    Find and validate a reset token.
    Returns token if valid, None otherwise.
    """
    # Get latest unused token for this email
    token = db.query(prm.PasswordResetToken).filter(
        prm.PasswordResetToken.email     == email,
        prm.PasswordResetToken.user_type == user_type,
        prm.PasswordResetToken.used      == False,
    ).order_by(prm.PasswordResetToken.created_at.desc()).first()

    if not token:
        return None
    if datetime.utcnow() > token.expires_at:
        return None
    if not verify_otp_hash(otp, token.otp_hash):
        return None
    return token


# ─── Audit Logging ────────────────────────────────────────────────────────────

def log_action(
    email     : str,
    user_type : str,
    action    : str,
    ip        : str,
    db        : Session,
    details   : str = ""
):
    """Write an audit log entry."""
    entry = prm.PasswordResetLog(
        email      = email,
        user_type  = user_type,
        action     = action,
        ip_address = ip,
        details    = details,
    )
    db.add(entry)
    db.commit()