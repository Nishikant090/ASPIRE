"""
auth_utils.py - Shared authentication helpers
Email normalization, password validation, account lockout, pending-account cleanup
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

import auth_models as am
from config import (
    LOGIN_LOCKOUT_MINUTES,
    LOGIN_MAX_FAILED_ATTEMPTS,
    PENDING_VERIFICATION_EXPIRE_HOURS,
)
from email_service import send_otp_email
from password_reset_utils import generate_otp, validate_password

OTP_PURPOSE_EMAIL = am.OTPPurpose.email_verification


def normalize_email(email: str) -> str:
    """Normalize email for uniqueness checks and lookups."""
    return email.strip().lower()


def validate_registration_password(password: str) -> None:
    """Raise ValueError if password does not meet strength requirements."""
    valid, message = validate_password(password)
    if not valid:
        raise ValueError(message)


def verification_deadline() -> datetime:
    return datetime.utcnow() + timedelta(hours=PENDING_VERIFICATION_EXPIRE_HOURS)


def is_verification_expired(expires_at: Optional[datetime]) -> bool:
    return bool(expires_at and datetime.utcnow() > expires_at)


def check_account_lockout(locked_until: Optional[datetime]) -> None:
    if locked_until and datetime.utcnow() < locked_until:
        remaining = max(1, int((locked_until - datetime.utcnow()).total_seconds() // 60) + 1)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account temporarily locked due to too many failed login attempts. Try again in {remaining} minute(s).",
        )


def record_failed_login(db: Session, entity, *, actor_type: str, email: str) -> None:
    entity.failed_login_attempts = (entity.failed_login_attempts or 0) + 1
    if entity.failed_login_attempts >= LOGIN_MAX_FAILED_ATTEMPTS:
        entity.failed_login_attempts = 0
        entity.locked_until = datetime.utcnow() + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
    db.commit()


def reset_login_attempts(db: Session, entity) -> None:
    entity.failed_login_attempts = 0
    entity.locked_until = None
    db.commit()


def delete_pending_student(db: Session, student) -> None:
    db.query(am.OTPVerification).filter(
        am.OTPVerification.email == student.college_email,
        am.OTPVerification.user_type == am.UserType.student,
    ).delete(synchronize_session=False)
    db.delete(student)
    db.commit()


def delete_pending_company(db: Session, company) -> None:
    db.query(am.OTPVerification).filter(
        am.OTPVerification.email == company.email,
        am.OTPVerification.user_type == am.UserType.company,
    ).delete(synchronize_session=False)
    db.delete(company)
    db.commit()


def cleanup_expired_pending_student(db: Session, student):
    if not student or student.is_fully_verified:
        return student
    if is_verification_expired(student.verification_expires_at):
        delete_pending_student(db, student)
        return None
    return student


def cleanup_expired_pending_company(db: Session, company):
    if not company or company.is_email_verified:
        return company
    if is_verification_expired(company.verification_expires_at):
        delete_pending_company(db, company)
        return None
    return company


def get_resend_cooldown_seconds(last_sent_at: Optional[datetime], cooldown_seconds: int) -> int:
    if not last_sent_at:
        return 0
    elapsed = (datetime.utcnow() - last_sent_at).total_seconds()
    if elapsed >= cooldown_seconds:
        return 0
    return max(1, int(cooldown_seconds - elapsed))


def get_latest_otp_record(db: Session, email: str, purpose: am.OTPPurpose) -> Optional[am.OTPVerification]:
    return (
        db.query(am.OTPVerification)
        .filter(
            am.OTPVerification.email == email,
            am.OTPVerification.purpose == purpose,
            am.OTPVerification.used == False,
        )
        .order_by(am.OTPVerification.created_at.desc())
        .first()
    )


def send_verification_otp(db: Session, email: str, user_type: am.UserType, display_name: str) -> dict:
    """Create and email a verification OTP."""
    from auth import create_otp_verification

    purpose_value = OTP_PURPOSE_EMAIL.value if hasattr(OTP_PURPOSE_EMAIL, "value") else OTP_PURPOSE_EMAIL
    user_type_value = user_type.value if hasattr(user_type, "value") else user_type

    # 1. Pre-check cooldown/rate limit on existing active OTP record
    existing = db.query(am.OTPVerification).filter(
        am.OTPVerification.email == email,
        am.OTPVerification.user_type == user_type_value,
        am.OTPVerification.purpose == purpose_value,
        am.OTPVerification.used == False,
    ).order_by(am.OTPVerification.created_at.desc()).first()

    now = datetime.utcnow()
    if existing:
        if now > existing.expires_at:
            existing.used = True
            db.commit()
            existing = None
        else:
            from config import OTP_RESEND_COOLDOWN_SECONDS, OTP_MAX_RESENDS
            elapsed = (now - existing.created_at).total_seconds()
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                remaining = max(1, int(OTP_RESEND_COOLDOWN_SECONDS - elapsed))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {remaining} seconds before requesting another code.",
                )
            if existing.resend_count >= OTP_MAX_RESENDS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many verification requests. Try again later.",
                )

    # 2. Generate OTP and send email first
    otp = generate_otp()
    sent = send_otp_email(email, otp, display_name)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Try again later.")

    # 3. Save the OTP record in the DB (which commits the session transaction)
    create_otp_verification(db, email, user_type, OTP_PURPOSE_EMAIL, otp)
    return {"message": f"Verification code sent to {email}"}
