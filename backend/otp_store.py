# otp_store.py - In-memory OTP storage (no extra database table needed)
# Stores {email: {"otp": "123456", "expires_at": datetime, "name": "..."}}

from datetime import datetime, timedelta
from config import OTP_EXPIRE_MINUTES

# Simple dictionary stored in memory while the server is running
_store: dict = {}


def save_otp(email: str, otp: str, name: str = ""):
    """Save an OTP for an email. Overwrites any existing OTP for that email."""
    _store[email] = {
        "otp": otp,
        "name": name,
        "expires_at": datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    }


def verify_otp(email: str, otp: str) -> bool:
    """
    Returns True if the OTP matches and hasn't expired.
    Automatically deletes the OTP after successful verification.
    """
    entry = _store.get(email)
    if not entry:
        return False
    if datetime.utcnow() > entry["expires_at"]:
        del _store[email]  # Clean up expired OTP
        return False
    if entry["otp"] != otp:
        return False
    del _store[email]  # Delete after successful use (one-time use)
    return True


def get_otp_name(email: str) -> str:
    """Get the name stored alongside the OTP (used for welcome email)."""
    entry = _store.get(email)
    return entry["name"] if entry else ""