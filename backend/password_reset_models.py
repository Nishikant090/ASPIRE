"""
password_reset_models.py - Database models for Password Reset System
PasswordResetToken and PasswordResetLog tables
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from database import Base
from datetime import datetime


class PasswordResetToken(Base):
    """
    Stores hashed OTPs for password reset.
    One active token per email at a time.
    OTP expires in 10 minutes and can only be used once.
    """
    __tablename__ = "password_reset_tokens"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(200), nullable=False, index=True)
    user_type  = Column(String(20),  nullable=False)   # "student" or "company"
    otp_hash   = Column(String(500), nullable=False)   # bcrypt hash of OTP
    expires_at = Column(DateTime,    nullable=False)
    used       = Column(Boolean,     default=False)
    created_at = Column(DateTime,    default=datetime.utcnow)


class PasswordResetLog(Base):
    """
    Audit log for all password reset activity.
    Admin can view this — passwords are never stored here.
    """
    __tablename__ = "password_reset_logs"

    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(200), nullable=False)
    user_type     = Column(String(20),  nullable=False)
    action        = Column(String(50),  nullable=False)  # "requested", "otp_verified", "password_changed", "failed"
    ip_address    = Column(String(50),  nullable=True)
    created_at    = Column(DateTime,    default=datetime.utcnow)
    details       = Column(String(300), nullable=True)   # extra info e.g. "OTP expired"